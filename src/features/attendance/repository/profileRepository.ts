// src/features/attendance/repository/profileRepository.ts
//
// Single point of contact for all 'profiles' table interactions.
// All callers pass domain intents. No SQL leaks past this seam.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Profile, AttendanceLog } from '../store/useAttendanceStore';

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

export interface CloudProfile {
  attended: number;
  total: number;
  target_goal?: number;
  logs?: AttendanceLog[];
  notes?: string;
}

export interface AvatarUploadResult {
  publicUrl: string;
}

// ─── Repository ──────────────────────────────────────────────────────────────

export class ProfileRepository {
  constructor(private readonly db: SupabaseClient) {}

  /** Fetch all profiles ordered by creation date (ascending). */
  async fetchAll(): Promise<Profile[]> {
    const { data, error } = await this.db
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []) as Profile[];
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
    return data as Profile;
  }

  /** Update arbitrary profile columns by id. */
  async update(profileId: string, updates: ProfileUpdates): Promise<void> {
    const { error } = await this.db
      .from('profiles')
      .update(updates)
      .eq('id', profileId);
    if (error) throw error;
  }

  /** Delete a profile row by id. */
  async delete(profileId: string): Promise<void> {
    const { error } = await this.db
      .from('profiles')
      .delete()
      .eq('id', profileId);
    if (error) throw error;
  }

  /** Push the full attendance state to the cloud. */
  async syncUp(profileId: string, payload: SyncPayload): Promise<void> {
    const { error } = await this.db
      .from('profiles')
      .update({
        attended: payload.attended,
        total: payload.total,
        target_goal: payload.targetGoal,
        logs: payload.logs,
        notes: payload.notes,
      })
      .eq('id', profileId);
    if (error) throw error;
  }

  /** Fetch the cloud copy for conflict resolution. */
  async fetchOne(profileId: string): Promise<CloudProfile | null> {
    const { data, error } = await this.db
      .from('profiles')
      .select('attended, total, name, avatar_url, target_goal, logs, notes')
      .eq('id', profileId)
      .single();
    if (error || !data) return null;
    return data as CloudProfile;
  }

  /** Upload a file to the 'avatars' storage bucket and return the public URL. */
  async uploadAvatar(profileId: string, file: Blob): Promise<AvatarUploadResult> {
    const ext = file.type === 'image/gif' ? 'gif'
      : file.type === 'image/png' ? 'png'
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
    return { correct: plain === stored, needsMigration: true };
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
