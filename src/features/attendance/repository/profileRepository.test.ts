// src/features/attendance/repository/profileRepository.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProfileRepository, createProfileRepository, validateAvatarFile, extractStoragePath } from './profileRepository';
import type { SupabaseClient } from '@supabase/supabase-js';

// ─── Minimal in-memory stub for Supabase ────────────────────────────────────
function makeDb(overrides: Partial<Record<string, unknown>> = {}) {
  const chainMethods: any = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  chainMethods.then = vi.fn((resolve) => resolve({ data: [{ id: 'p1' }], error: null }));

  const storageBucketMethods = {
    upload: vi.fn().mockResolvedValue({ data: { path: 'path/file.jpg' }, error: null }),
    remove: vi.fn().mockResolvedValue({ data: [], error: null }),
    getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/file.jpg' } }),
  };

  return {
    from: vi.fn().mockReturnValue(chainMethods),
    storage: {
      from: vi.fn().mockReturnValue(storageBucketMethods),
    },
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({ data: null, error: new Error('not found') }),
      signUp: vi.fn().mockResolvedValue({ data: { user: { id: 'new-id' } }, error: null }),
    },
    ...overrides,
    _chain: chainMethods,
  } as unknown as SupabaseClient & { _chain: typeof chainMethods };
}

describe('ProfileRepository', () => {
  let db: ReturnType<typeof makeDb>;
  let repo: ProfileRepository;

  beforeEach(() => {
    db = makeDb();
    repo = new ProfileRepository(db);
    vi.clearAllMocks();
  });

  // ── fetchAll ────────────────────────────────────────────────────────────
  describe('fetchAll', () => {
    it('returns profiles array on success from profile_directory view', async () => {
      const directoryRows = [{ id: 'p1', name: 'Alice', avatar_url: 'a.png', is_suspended: false, created_at: '2026-01-01' }];
      (db as any)._chain.order.mockResolvedValueOnce({ data: directoryRows, error: null });

      const result = await repo.fetchAll();

      expect(db.from).toHaveBeenCalledWith('profile_directory');
      expect((db as any)._chain.select).toHaveBeenCalledWith('id, name, avatar_url, is_suspended, created_at');
      expect(result).toEqual([
        { id: 'p1', name: 'Alice', avatar_url: 'a.png', is_suspended: false, created_at: '2026-01-01', attended: 0, total: 0 }
      ]);
    });

    it('falls back to profiles table if profile_directory view errors', async () => {
      const profiles = [{ id: 'p1', name: 'Alice', attended: 10, total: 12 }];
      (db as any)._chain.order
        .mockResolvedValueOnce({ data: null, error: { message: 'relation profile_directory does not exist' } })
        .mockResolvedValueOnce({ data: profiles, error: null });

      const result = await repo.fetchAll();

      expect(db.from).toHaveBeenCalledWith('profiles');
      expect(result).toEqual(profiles);
    });

    it('throws when fallback returns an error', async () => {
      (db as any)._chain.order
        .mockResolvedValueOnce({ data: null, error: { message: 'view error' } })
        .mockResolvedValueOnce({ data: null, error: { message: 'network error' } });

      await expect(repo.fetchAll()).rejects.toMatchObject({ message: 'network error' });
    });
  });

  // ── create ──────────────────────────────────────────────────────────────
  describe('create', () => {
    it('inserts a profile row and returns it without password in domain object', async () => {
      const profileRow = { id: 'new-id', name: 'Bob', attended: 0, total: 0, avatar_url: '', password: 'hash' };
      (db as any)._chain.single.mockResolvedValueOnce({ data: profileRow, error: null });

      const result = await repo.create({ name: 'Bob', avatar_url: '', password: 'hash', attended: 0, total: 0 });

      expect(db.from).toHaveBeenCalledWith('profiles');
      expect(result).toEqual({ id: 'new-id', name: 'Bob', attended: 0, total: 0, avatar_url: '' });
      expect(result).not.toHaveProperty('password');
    });

    it('throws on insert error', async () => {
      (db as any)._chain.single.mockResolvedValueOnce({ data: null, error: { message: 'unique constraint' } });

      await expect(repo.create({ name: 'Bob', avatar_url: '', password: 'x', attended: 0, total: 0 }))
        .rejects.toMatchObject({ message: 'unique constraint' });
    });
  });

  // ── update ──────────────────────────────────────────────────────────────
  describe('update', () => {
    it('calls update().eq().select() with correct arguments', async () => {
      await repo.update('p1', { name: 'Alice Updated' });

      expect((db as any)._chain.update).toHaveBeenCalledWith({ name: 'Alice Updated' });
      expect((db as any)._chain.eq).toHaveBeenCalledWith('id', 'p1');
      expect((db as any)._chain.select).toHaveBeenCalledWith('id');
    });

    it('throws on update error', async () => {
      (db as any)._chain.then = vi.fn((_resolve, reject) => reject({ message: 'RLS denied' }));

      await expect(repo.update('p1', { name: 'X' })).rejects.toMatchObject({ message: 'RLS denied' });
    });

    it('throws when update affects 0 rows (RLS blocked)', async () => {
      (db as any)._chain.then = vi.fn((resolve) => resolve({ data: [], error: null }));

      await expect(repo.update('p1', { name: 'X' })).rejects.toThrow(/Profile update failed/);
    });
  });

  // ── delete ──────────────────────────────────────────────────────────────
  describe('delete', () => {
    it('calls delete().eq() with correct arguments', async () => {
      await repo.delete('p1');

      expect(db.from).toHaveBeenCalledWith('profiles');
      expect((db as any)._chain.delete).toHaveBeenCalled();
      expect((db as any)._chain.eq).toHaveBeenCalledWith('id', 'p1');
    });

    it('throws on delete error', async () => {
      (db as any)._chain.then = vi.fn((_resolve, reject) => reject({ message: 'Delete error' }));

      await expect(repo.delete('p1')).rejects.toMatchObject({ message: 'Delete error' });
    });

    it('throws when delete affects 0 rows (RLS blocked)', async () => {
      (db as any)._chain.then = vi.fn((resolve) => resolve({ data: [], error: null }));

      await expect(repo.delete('p1')).rejects.toThrow(/Profile deletion failed/);
    });
  });

  // ── syncUp ──────────────────────────────────────────────────────────────
  describe('syncUp', () => {
    it('pushes full attendance payload to the cloud', async () => {
      await repo.syncUp('p1', { attended: 10, total: 12, targetGoal: 75, logs: [], notes: '' });

      expect((db as any)._chain.update).toHaveBeenCalledWith(
        expect.objectContaining({ attended: 10, total: 12, target_goal: 75 })
      );
    });

    it('throws on sync error', async () => {
      (db as any)._chain.then = vi.fn((_resolve, reject) => reject({ message: 'sync failed' }));

      await expect(repo.syncUp('p1', { attended: 10, total: 12, targetGoal: 75, logs: [], notes: '' }))
        .rejects.toMatchObject({ message: 'sync failed' });
    });

    it('throws when syncUp affects 0 rows (RLS blocked)', async () => {
      (db as any)._chain.then = vi.fn((resolve) => resolve({ data: [], error: null }));

      await expect(repo.syncUp('p1', { attended: 10, total: 12, targetGoal: 75, logs: [], notes: '' }))
        .rejects.toThrow(/Cloud sync failed/);
    });

    it('applies expectedLastActiveAt filter when checking concurrency', async () => {
      const timestamp = '2026-10-16T12:00:00.000Z';
      (db as any)._chain.then = vi.fn((resolve) => resolve({ data: [{ id: 'p1', last_active_at: timestamp }], error: null }));

      const result = await repo.syncUp(
        'p1',
        { attended: 10, total: 12, targetGoal: 75, logs: [], notes: '' },
        { expectedLastActiveAt: timestamp }
      );

      expect((db as any)._chain.eq).toHaveBeenCalledWith('last_active_at', timestamp);
      expect(result.last_active_at).toBe(timestamp);
    });

    it('applies is null filter when expectedLastActiveAt is null', async () => {
      (db as any)._chain.then = vi.fn((resolve) => resolve({ data: [{ id: 'p1', last_active_at: '2026-10-16T12:00:00.000Z' }], error: null }));

      await repo.syncUp(
        'p1',
        { attended: 10, total: 12, targetGoal: 75, logs: [], notes: '' },
        { expectedLastActiveAt: null }
      );

      expect((db as any)._chain.is).toHaveBeenCalledWith('last_active_at', null);
    });

    it('throws conflict error when expectedLastActiveAt does not match (0 rows affected)', async () => {
      (db as any)._chain.then = vi.fn((resolve) => resolve({ data: [], error: null }));

      await expect(
        repo.syncUp(
          'p1',
          { attended: 10, total: 12, targetGoal: 75, logs: [], notes: '' },
          { expectedLastActiveAt: '2026-10-16T10:00:00.000Z' }
        )
      ).rejects.toThrow(/Conflict detected/);
    });
  });

  // ── fetchOne ─────────────────────────────────────────────────────────────
  describe('fetchOne', () => {
    it('returns cloud profile data with mapped targetGoal', async () => {
      const cloudData = { attended: 8, total: 10, target_goal: 75, logs: [], notes: 'some note' };
      (db as any)._chain.single.mockResolvedValueOnce({ data: cloudData, error: null });

      const result = await repo.fetchOne('p1');
      expect(result).toEqual({ attended: 8, total: 10, targetGoal: 75, logs: [], notes: 'some note' });
    });

    it('returns null on error', async () => {
      (db as any)._chain.single.mockResolvedValueOnce({ data: null, error: { message: 'not found' } });
      const result = await repo.fetchOne('p1');
      expect(result).toBeNull();
    });
  });

  // ── uploadAvatar & storage moderation ───────────────────────────────────
  describe('uploadAvatar and storage moderation (Issue #17)', () => {
    it('uploads file and returns public URL', async () => {
      const file = new Blob(['gif-data'], { type: 'image/gif' });
      const result = await repo.uploadAvatar('p1', file);
      expect(result.publicUrl).toBe('https://example.com/file.jpg');
    });

    it('rejects files exceeding 2MB size limit', async () => {
      const largeBlob = new Blob([new Uint8Array(2 * 1024 * 1024 + 1)], { type: 'image/png' });
      await expect(repo.uploadAvatar('p1', largeBlob)).rejects.toThrow(/exceeds 2MB limit/);
    });

    it('rejects disallowed file MIME types (e.g. svg, pdf, html)', async () => {
      const svgBlob = new Blob(['<svg></svg>'], { type: 'image/svg+xml' });
      await expect(repo.uploadAvatar('p1', svgBlob)).rejects.toThrow(/Invalid file type/);

      const htmlBlob = new Blob(['<html></html>'], { type: 'text/html' });
      await expect(repo.uploadAvatar('p1', htmlBlob)).rejects.toThrow(/Invalid file type/);
    });

    it('deletes old avatar from storage when oldAvatarUrl is provided', async () => {
      const file = new Blob(['jpg-data'], { type: 'image/jpeg' });
      const oldUrl = 'https://mock.supabase.co/storage/v1/object/public/avatars/p1-old-123.jpg';

      await repo.uploadAvatar('p1', file, oldUrl);

      expect((db as any).storage.from).toHaveBeenCalledWith('avatars');
      const storageInstance = (db as any).storage.from('avatars');
      expect(storageInstance.remove).toHaveBeenCalledWith(['p1-old-123.jpg']);
    });

    it('does not attempt storage deletion for dicebear or blob URLs', async () => {
      const file = new Blob(['jpg-data'], { type: 'image/jpeg' });
      const dicebearUrl = 'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Test';

      await repo.uploadAvatar('p1', file, dicebearUrl);

      const storageInstance = (db as any).storage.from('avatars');
      expect(storageInstance.remove).not.toHaveBeenCalled();
    });

    it('throws when upload fails', async () => {
      (db as any).storage.from = vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: null, error: { message: 'bucket error' } }),
        remove: vi.fn().mockResolvedValue({ data: [], error: null }),
        getPublicUrl: vi.fn(),
      });

      await expect(repo.uploadAvatar('p1', new Blob(['x'], { type: 'image/jpeg' }))).rejects.toMatchObject({ message: 'bucket error' });
    });

    it('returns false from deleteAvatarFile when remove throws or errors', async () => {
      (db as any).storage.from = vi.fn().mockReturnValue({
        remove: vi.fn().mockRejectedValue(new Error('Storage failure')),
      });

      const res = await repo.deleteAvatarFile('https://xyz.supabase.co/storage/v1/object/public/avatars/avatar.png');
      expect(res).toBe(false);

      (db as any).storage.from = vi.fn().mockReturnValue({
        remove: vi.fn().mockResolvedValue({ error: { message: 'Failed' } }),
      });
      const resError = await repo.deleteAvatarFile('https://xyz.supabase.co/storage/v1/object/public/avatars/avatar.png');
      expect(resError).toBe(false);

      const resInvalid = await repo.deleteAvatarFile('not-a-supabase-url');
      expect(resInvalid).toBe(false);
    });
  });

  // ── extractStoragePath helper ─────────────────────────────────────────────
  describe('extractStoragePath', () => {
    it('extracts filename from standard public Supabase URLs', () => {
      const url = 'https://xyz.supabase.co/storage/v1/object/public/avatars/user-123-photo.png';
      expect(extractStoragePath(url)).toBe('user-123-photo.png');
    });

    it('returns null for external or local blob URLs', () => {
      expect(extractStoragePath('blob:http://localhost:5173/uuid')).toBeNull();
      expect(extractStoragePath('data:image/png;base64,123')).toBeNull();
      expect(extractStoragePath('https://api.dicebear.com/avatar.svg')).toBeNull();
    });
  });

  // ── validateAvatarFile helper ─────────────────────────────────────────────
  describe('validateAvatarFile', () => {
    it('accepts valid small JPEG/PNG/WebP/GIF blobs', () => {
      expect(() => validateAvatarFile(new Blob(['img'], { type: 'image/jpeg' }))).not.toThrow();
      expect(() => validateAvatarFile(new Blob(['img'], { type: 'image/png' }))).not.toThrow();
      expect(() => validateAvatarFile(new Blob(['img'], { type: 'image/webp' }))).not.toThrow();
      expect(() => validateAvatarFile(new Blob(['img'], { type: 'image/gif' }))).not.toThrow();
    });
  });

  // ── delete profile avatar cleanup ─────────────────────────────────────────
  describe('delete with avatar cleanup', () => {
    it('deletes avatar file from storage if avatarUrl is supplied', async () => {
      const oldUrl = 'https://mock.supabase.co/storage/v1/object/public/avatars/p1-old.png';
      await repo.delete('p1', oldUrl);

      const storageInstance = (db as any).storage.from('avatars');
      expect(storageInstance.remove).toHaveBeenCalledWith(['p1-old.png']);
      expect(db.from).toHaveBeenCalledWith('profiles');
    });
  });

  // ── static password helpers ───────────────────────────────────────────────
  describe('ProfileRepository.verifyPassword', () => {
    it('detects legacy plain-text password', async () => {
      const result = await ProfileRepository.verifyPassword('123', '123');
      expect(result).toEqual({ correct: true, needsMigration: true });
    });

    it('returns false for wrong plain-text password', async () => {
      const result = await ProfileRepository.verifyPassword('wrong', '123');
      expect(result).toEqual({ correct: false, needsMigration: false });
    });

    it('hashes and verifies bcrypt password', async () => {
      const hashed = await ProfileRepository.hashPassword('my-secret-pw');
      expect(hashed).toMatch(/^\$2/);

      const checkValid = await ProfileRepository.verifyPassword('my-secret-pw', hashed);
      expect(checkValid).toEqual({ correct: true, needsMigration: false });

      const checkInvalid = await ProfileRepository.verifyPassword('wrong-pw', hashed);
      expect(checkInvalid).toEqual({ correct: false, needsMigration: false });
    });
  });

  // ── verifyAndUnlock ────────────────────────────────────────────────────────
  describe('verifyAndUnlock', () => {
    it('authenticates via synthetic Supabase Auth when session succeeds', async () => {
      const mockProfile = { id: 'p1', name: 'Alice', attended: 2, total: 3 };
      (db as any).auth.signInWithPassword.mockResolvedValueOnce({
        data: { session: { access_token: 'xyz' } },
        error: null,
      });
      (db as any)._chain.single.mockResolvedValueOnce({ data: mockProfile, error: null });

      const result = await repo.verifyAndUnlock('p1', 'password123');

      expect((db as any).auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'p1@attendance.local',
        password: 'password123',
      });
      expect(result.success).toBe(true);
      expect(result.profile).toEqual(mockProfile);
      expect(result.profile).not.toHaveProperty('password');
    });

    it('falls back to legacy password verification when Supabase Auth fails', async () => {
      const mockProfile = { id: 'p1', name: 'Alice', attended: 0, total: 0, password: '123' };
      (db as any).auth.signInWithPassword.mockResolvedValueOnce({
        data: null,
        error: new Error('User not found'),
      });
      (db as any)._chain.single.mockResolvedValueOnce({ data: mockProfile, error: null });

      const result = await repo.verifyAndUnlock('p1', '123');

      expect(db.from).toHaveBeenCalledWith('profiles');
      expect((db as any)._chain.eq).toHaveBeenCalledWith('id', 'p1');
      expect(result.success).toBe(true);
      expect(result.profile).toEqual({ id: 'p1', name: 'Alice', attended: 0, total: 0 });
      expect(result.profile).not.toHaveProperty('password');
    });

    it('returns failure when password does not match', async () => {
      const mockProfile = { id: 'p1', name: 'Alice', password: 'secret-password' };
      (db as any)._chain.single.mockResolvedValueOnce({ data: mockProfile, error: null });

      const result = await repo.verifyAndUnlock('p1', 'wrong-guess');

      expect(result.success).toBe(false);
      expect(result.profile).toBeUndefined();
    });

    it('returns failure when profile is not found', async () => {
      (db as any)._chain.single.mockResolvedValueOnce({ data: null, error: { message: 'not found' } });

      const result = await repo.verifyAndUnlock('unknown-id', 'pass');

      expect(result.success).toBe(false);
    });
  });

  // ── fetchProfileAttendance ─────────────────────────────────────────────────
  describe('fetchProfileAttendance', () => {
    it('returns profile attendance data without password', async () => {
      const mockProfile = { id: 'p1', name: 'Alice', logs: [], attended: 5, total: 6 };
      (db as any)._chain.single.mockResolvedValueOnce({ data: mockProfile, error: null });

      const result = await repo.fetchProfileAttendance('p1');

      expect(db.from).toHaveBeenCalledWith('profiles');
      expect((db as any)._chain.select).toHaveBeenCalledWith(
        'id, name, avatar_url, attended, total, target_goal, last_active_at, logs, is_flagged, is_suspended, created_at'
      );
      expect(result).toEqual(mockProfile);
    });
  });

  // ── createProfileRepository factory ───────────────────────────────────────
  describe('createProfileRepository', () => {
    it('returns null when client is null', () => {
      expect(createProfileRepository(null)).toBeNull();
    });

    it('returns ProfileRepository instance when client is provided', () => {
      const instance = createProfileRepository(db as any);
      expect(instance).toBeInstanceOf(ProfileRepository);
    });
  });
});
