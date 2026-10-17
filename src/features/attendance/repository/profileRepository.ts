// src/features/attendance/repository/profileRepository.ts
//
// Single point of contact for all 'profiles' table interactions.
// All callers pass domain intents. No SQL leaks past this seam.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Profile, AttendanceLog, SyncableState } from '../domain/types';
import { toProfile, toSyncableState, type ProfileRow, type SyncRow } from './profileMapper';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SyncPayload {
  attended: number;
  total: number;
  targetGoal: number;
  logs: AttendanceLog[];
  notes: string;
}

export interface ProfileUpdates {
  name?: string;
  password?: string;
  notes?: string;
  avatar_url?: string;
  is_flagged?: boolean;
}

export type CloudProfile = SyncableState & {
  name?: string;
  avatar_url?: string;
  last_active_at?: string;
  target_goal?: number;
};

export interface AvatarUploadResult {
  publicUrl: string;
}

export const ALLOWED_AVATAR_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

export const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

export function extractStoragePath(avatarUrl: string, bucket = 'avatars'): string | null {
  if (!avatarUrl || avatarUrl.startsWith('blob:') || avatarUrl.startsWith('data:') || avatarUrl.includes('dicebear')) {
    return null;
  }
  const regex = new RegExp(`(?:/storage/v1/object/public/${bucket}/|/${bucket}/)([^?#]+)`);
  const match = avatarUrl.match(regex);
  return match ? decodeURIComponent(match[1]) : null;
}

export function validateAvatarFile(file: Blob): void {
  if (file.size > MAX_AVATAR_SIZE_BYTES) {
    throw new Error('Avatar file size exceeds 2MB limit.');
  }
  if (file.type && !ALLOWED_AVATAR_MIME_TYPES.includes(file.type.toLowerCase() as typeof ALLOWED_AVATAR_MIME_TYPES[number])) {
    throw new Error('Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed.');
  }
}

// ─── Repository ──────────────────────────────────────────────────────────────

export class ProfileRepository {
  private readonly db: SupabaseClient;

  constructor(db: SupabaseClient) {
    this.db = db;
  }

  /** Fetch all public profile summaries ordered by creation date. Excludes sensitive fields like passwords and notes. */
  async fetchAll(): Promise<Profile[]> {
    const { data, error } = await this.db
      .from('profiles')
      .select('id, name, avatar_url, attended, total, target_goal, last_active_at, is_flagged, is_suspended, created_at')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return ((data ?? []) as ProfileRow[]).map(toProfile);
  }

  /** Verify password for a single profile and return full profile if authentic */
  async verifyAndUnlock(
    profileId: string,
    candidatePassword: string
  ): Promise<{ success: boolean; profile?: Profile; needsMigration?: boolean }> {
    const { data, error } = await this.db
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .single();

    if (error || !data) {
      return { success: false };
    }

    const stored = data.password || '123';
    const { correct, needsMigration } = await ProfileRepository.verifyPassword(candidatePassword, stored);
    if (!correct) {
      return { success: false };
    }

    return {
      success: true,
      profile: toProfile(data as ProfileRow),
      needsMigration,
    };
  }

  /** Fetch attendance and logs for read-only viewing of a single profile */
  async fetchProfileAttendance(profileId: string): Promise<Profile | null> {
    const { data, error } = await this.db
      .from('profiles')
      .select('id, name, avatar_url, attended, total, target_goal, last_active_at, logs, is_flagged, is_suspended, created_at')
      .eq('id', profileId)
      .single();

    if (error || !data) return null;
    return toProfile(data as ProfileRow);
  }

  /** Insert a new profile row and return it. */
  async create(payload: {
    name: string;
    avatar_url: string;
    password: string;
    attended: number;
    total: number;
  }): Promise<Profile> {
    const { data, error } = await this.db
      .from('profiles')
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    return toProfile(data as ProfileRow);
  }

  /** Update arbitrary profile columns by id. Verifies affected rows to detect RLS blocks. */
  async update(profileId: string, updates: ProfileUpdates): Promise<void> {
    const { data, error } = await this.db
      .from('profiles')
      .update(updates)
      .eq('id', profileId)
      .select('id');
    if (error) throw error;
    if (data && data.length === 0) {
      throw new Error(`Profile update failed: row ${profileId} not found or permission denied`);
    }
  }

  /** Delete a previously uploaded avatar from the avatars storage bucket. */
  async deleteAvatarFile(avatarUrl: string): Promise<boolean> {
    const path = extractStoragePath(avatarUrl, 'avatars');
    if (!path) return false;
    try {
      const { error } = await this.db.storage.from('avatars').remove([path]);
      return !error;
    } catch {
      return false;
    }
  }

  /** Delete a profile row by id. Cleans up avatar from storage if provided and verifies affected rows. */
  async delete(profileId: string, avatarUrl?: string): Promise<void> {
    if (avatarUrl) {
      await this.deleteAvatarFile(avatarUrl);
    }
    const { data, error } = await this.db
      .from('profiles')
      .delete()
      .eq('id', profileId)
      .select('id');
    if (error) throw error;
    if (data && data.length === 0) {
      throw new Error(`Profile deletion failed: row ${profileId} not found or permission denied`);
    }
  }

  /** Push the full attendance state to the cloud. Verifies affected rows and prevents silent overwrite if expectedLastActiveAt is specified. */
  async syncUp(
    profileId: string,
    payload: SyncPayload,
    options?: { expectedLastActiveAt?: string | null; force?: boolean }
  ): Promise<{ last_active_at?: string }> {
    let query = this.db
      .from('profiles')
      .update({
        attended: payload.attended,
        total: payload.total,
        target_goal: payload.targetGoal,
        logs: payload.logs,
        notes: payload.notes,
        last_active_at: new Date().toISOString(),
      })
      .eq('id', profileId);

    if (options?.expectedLastActiveAt !== undefined && !options?.force) {
      if (options.expectedLastActiveAt === null) {
        query = query.is('last_active_at', null);
      } else {
        query = query.eq('last_active_at', options.expectedLastActiveAt);
      }
    }

    const { data, error } = await query.select('id, last_active_at');
    if (error) throw error;
    if (data && data.length === 0) {
      if (options?.expectedLastActiveAt !== undefined && !options?.force) {
        throw new Error('Conflict detected: cloud data has been updated by another session. Please pull latest changes.');
      }
      throw new Error(`Cloud sync failed: profile ${profileId} not found or permission denied`);
    }

    return { last_active_at: data?.[0]?.last_active_at };
  }

  /** Fetch the cloud copy for conflict resolution. */
  async fetchOne(profileId: string): Promise<CloudProfile | null> {
    const { data, error } = await this.db
      .from('profiles')
      .select('attended, total, name, avatar_url, target_goal, logs, notes, last_active_at')
      .eq('id', profileId)
      .single();
    if (error || !data) return null;
    return toSyncableState(data as SyncRow);
  }

  /** Upload a file to the 'avatars' storage bucket and return the public URL.
   *  Validates file size/type and deletes old custom avatar if provided. */
  async uploadAvatar(profileId: string, file: Blob, oldAvatarUrl?: string): Promise<AvatarUploadResult> {
    validateAvatarFile(file);

    if (oldAvatarUrl) {
      await this.deleteAvatarFile(oldAvatarUrl);
    }

    const ext = file.type === 'image/gif' ? 'gif'
      : file.type === 'image/png' ? 'png'
      : file.type === 'image/webp' ? 'webp'
      : 'jpg';
    const contentType = file.type || 'image/jpeg';
    const fileName = `${profileId}-${Date.now()}.${ext}`;

    const { data, error } = await this.db.storage
      .from('avatars')
      .upload(fileName, file, { contentType, upsert: true });
    if (error) throw error;

    const { data: { publicUrl } } = this.db.storage
      .from('avatars')
      .getPublicUrl(data.path);

    return { publicUrl };
  }

  /** Hash a plain-text password using bcrypt. */
  static async hashPassword(plain: string): Promise<string> {
    const bcrypt = (await import('bcryptjs')).default;
    return bcrypt.hash(plain, 10);
  }

  /** Compare a plain-text password to a stored hash (or legacy plain value). */
  static async verifyPassword(plain: string, stored: string): Promise<{ correct: boolean; needsMigration: boolean }> {
    if (typeof stored === 'string' && stored.startsWith('$2')) {
      const bcrypt = (await import('bcryptjs')).default;
      return { correct: await bcrypt.compare(plain, stored), needsMigration: false };
    }
    const correct = plain === stored;
    return { correct, needsMigration: correct };
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

/** Create a repository backed by the live Supabase client.
 *  Returns null when the client is unavailable (missing env vars). */
export function createProfileRepository(
  db: import('@supabase/supabase-js').SupabaseClient | null
): ProfileRepository | null {
  if (!db) return null;
  return new ProfileRepository(db);
}
