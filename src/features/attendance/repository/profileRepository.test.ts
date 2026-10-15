// src/features/attendance/repository/profileRepository.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProfileRepository, createProfileRepository } from './profileRepository';
import type { SupabaseClient } from '@supabase/supabase-js';

// ─── Minimal in-memory stub for Supabase ────────────────────────────────────
function makeDb(overrides: Partial<Record<string, unknown>> = {}) {
  const chainMethods = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  };

  return {
    from: vi.fn().mockReturnValue(chainMethods),
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: { path: 'path/file.jpg' }, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/file.jpg' } }),
      }),
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
    it('returns profiles array on success', async () => {
      const profiles = [{ id: 'p1', name: 'Alice', attended: 10, total: 12 }];
      (db as any)._chain.order.mockResolvedValueOnce({ data: profiles, error: null });

      const result = await repo.fetchAll();

      expect(db.from).toHaveBeenCalledWith('profiles');
      expect(result).toEqual(profiles);
    });

    it('throws when Supabase returns an error', async () => {
      (db as any)._chain.order.mockResolvedValueOnce({ data: null, error: { message: 'network error' } });

      await expect(repo.fetchAll()).rejects.toMatchObject({ message: 'network error' });
    });
  });

  // ── create ──────────────────────────────────────────────────────────────
  describe('create', () => {
    it('inserts a profile row and returns it', async () => {
      const profile = { id: 'new-id', name: 'Bob', attended: 0, total: 0, avatar_url: '', password: 'hash' };
      (db as any)._chain.single.mockResolvedValueOnce({ data: profile, error: null });

      const result = await repo.create({ name: 'Bob', avatar_url: '', password: 'hash', attended: 0, total: 0 });

      expect(db.from).toHaveBeenCalledWith('profiles');
      expect(result).toEqual(profile);
    });

    it('throws on insert error', async () => {
      (db as any)._chain.single.mockResolvedValueOnce({ data: null, error: { message: 'unique constraint' } });

      await expect(repo.create({ name: 'Bob', avatar_url: '', password: 'x', attended: 0, total: 0 }))
        .rejects.toMatchObject({ message: 'unique constraint' });
    });
  });

  // ── update ──────────────────────────────────────────────────────────────
  describe('update', () => {
    it('calls update().eq() with correct arguments', async () => {
      (db as any)._chain.eq.mockResolvedValueOnce({ data: null, error: null });

      await repo.update('p1', { name: 'Alice Updated' });

      expect((db as any)._chain.update).toHaveBeenCalledWith({ name: 'Alice Updated' });
      expect((db as any)._chain.eq).toHaveBeenCalledWith('id', 'p1');
    });

    it('throws on update error', async () => {
      (db as any)._chain.eq.mockResolvedValueOnce({ data: null, error: { message: 'RLS denied' } });

      await expect(repo.update('p1', { name: 'X' })).rejects.toMatchObject({ message: 'RLS denied' });
    });
  });

  // ── delete ──────────────────────────────────────────────────────────────
  describe('delete', () => {
    it('calls delete().eq() with correct arguments', async () => {
      (db as any)._chain.eq.mockResolvedValueOnce({ data: null, error: null });

      await repo.delete('p1');

      expect(db.from).toHaveBeenCalledWith('profiles');
      expect((db as any)._chain.delete).toHaveBeenCalled();
      expect((db as any)._chain.eq).toHaveBeenCalledWith('id', 'p1');
    });

    it('throws on delete error', async () => {
      (db as any)._chain.eq.mockResolvedValueOnce({ data: null, error: { message: 'Delete error' } });

      await expect(repo.delete('p1')).rejects.toMatchObject({ message: 'Delete error' });
    });
  });

  // ── syncUp ──────────────────────────────────────────────────────────────
  describe('syncUp', () => {
    it('pushes full attendance payload to the cloud', async () => {
      (db as any)._chain.eq.mockResolvedValueOnce({ data: null, error: null });

      await repo.syncUp('p1', { attended: 10, total: 12, targetGoal: 75, logs: [], notes: '' });

      expect((db as any)._chain.update).toHaveBeenCalledWith(
        expect.objectContaining({ attended: 10, total: 12, target_goal: 75 })
      );
    });

    it('throws on sync error', async () => {
      (db as any)._chain.eq.mockResolvedValueOnce({ data: null, error: { message: 'sync failed' } });

      await expect(repo.syncUp('p1', { attended: 10, total: 12, targetGoal: 75, logs: [], notes: '' }))
        .rejects.toMatchObject({ message: 'sync failed' });
    });
  });

  // ── fetchOne ─────────────────────────────────────────────────────────────
  describe('fetchOne', () => {
    it('returns cloud profile data', async () => {
      const cloudData = { attended: 8, total: 10, target_goal: 75, logs: [], notes: 'some note' };
      (db as any)._chain.single.mockResolvedValueOnce({ data: cloudData, error: null });

      const result = await repo.fetchOne('p1');
      expect(result).toEqual(cloudData);
    });

    it('returns null on error', async () => {
      (db as any)._chain.single.mockResolvedValueOnce({ data: null, error: { message: 'not found' } });
      const result = await repo.fetchOne('p1');
      expect(result).toBeNull();
    });
  });

  // ── uploadAvatar ─────────────────────────────────────────────────────────
  describe('uploadAvatar', () => {
    it('uploads file and returns public URL', async () => {
      const file = new Blob(['gif-data'], { type: 'image/gif' });
      const result = await repo.uploadAvatar('p1', file);
      expect(result.publicUrl).toBe('https://example.com/file.jpg');
    });

    it('throws when upload fails', async () => {
      (db as any).storage.from = vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: null, error: { message: 'bucket error' } }),
        getPublicUrl: vi.fn(),
      });

      await expect(repo.uploadAvatar('p1', new Blob(['x']))).rejects.toMatchObject({ message: 'bucket error' });
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
