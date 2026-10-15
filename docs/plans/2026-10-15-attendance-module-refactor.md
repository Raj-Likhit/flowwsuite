# Attendance Module Refactor: Profile Data Repository Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Consolidate all profile data persistence logic (database queries, password hashing, avatar upload, cloud sync) from five scattered UI modules into a single deep `ProfileRepository` module with a seam that enables clean in-memory testing.

**Architecture:** Create `src/features/attendance/repository/profileRepository.ts` as the single point of contact for all Supabase `profiles` table interactions. The repository exposes a typed, intent-based interface; all SQL, storage calls, and password operations live inside it. Five callers (`useAttendanceStore`, `ProfileSelection`, `AttendanceView`, `ProfileNotes`, `SettingsMenu`) are refactored to call the repository instead of touching Supabase directly.

**Tech Stack:** TypeScript, Zustand, Supabase JS v2 (`@supabase/supabase-js`), bcryptjs, Vitest, React Testing Library

---

## Context: What is being fixed

These five files currently bypass any module boundary and issue Supabase queries directly:

| File | Queries / side-effects leaked |
|------|-------------------------------|
| `src/features/attendance/store/useAttendanceStore.ts` | `storage.upload`, `storage.getPublicUrl`, `from('profiles').select` (syncFromCloud) |
| `src/features/attendance/components/ProfileSelection.tsx` | `from('profiles').select('*')`, `.insert(...)`, `.update(avatar_url)`, bcrypt hash in component |
| `src/features/attendance/components/AttendanceView.tsx` | `from('profiles').update(attended/total/target_goal/logs/notes)`, `from('announcements')`, `rpc('mark_announcement_seen')` |
| `src/features/attendance/components/ProfileNotes.tsx` | `from('profiles').update({ notes })` via dynamic import |
| `src/shared/components/SettingsMenu.tsx` | `from('profiles').update({ name })`, `.update({ password })`, `.update({ avatar_url, is_flagged })` |

The `announcements` queries in `AttendanceView` are read-only and not covered by this refactor — they are left in place as a separate concern.

---

## Task 1: Create the ProfileRepository module

**Files:**
- Create: `src/features/attendance/repository/profileRepository.ts`

### Step 1: Create the repository file with the full typed interface and implementation

```typescript
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

  /** Hash a plain-text password. Accepts bcryptjs as an injected dependency
   *  so callers don't need to know the hashing algorithm. */
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
```

### Step 2: Verify the file compiles (no runtime needed)

```bash
npx tsc --noEmit
```
Expected: zero errors (new file adds no breaking types).

### Step 3: Commit

```bash
git add src/features/attendance/repository/profileRepository.ts
git commit -m "feat(attendance): add ProfileRepository module — seam for all profiles table ops"
```

---

## Task 2: Write tests for ProfileRepository

**Files:**
- Create: `src/features/attendance/repository/profileRepository.test.ts`

### Step 1: Write the failing tests

```typescript
// src/features/attendance/repository/profileRepository.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProfileRepository } from './profileRepository';
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

  // ── syncUp ──────────────────────────────────────────────────────────────
  describe('syncUp', () => {
    it('pushes full attendance payload to the cloud', async () => {
      (db as any)._chain.eq.mockResolvedValueOnce({ data: null, error: null });

      await repo.syncUp('p1', { attended: 10, total: 12, targetGoal: 75, logs: [], notes: '' });

      expect((db as any)._chain.update).toHaveBeenCalledWith(
        expect.objectContaining({ attended: 10, total: 12, target_goal: 75 })
      );
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
  });
});
```

### Step 2: Run tests to verify they fail (repository exists but tests may catch issues)

```bash
npm test -- --run --reporter=verbose src/features/attendance/repository/profileRepository.test.ts
```
Expected: Tests should run. If any fail, read the error and fix the test assertions (not the implementation yet).

### Step 3: Run all tests to confirm zero regressions

```bash
npm test -- --run
```
Expected: 130+ passed (same as before, plus new tests).

### Step 4: Commit

```bash
git add src/features/attendance/repository/profileRepository.test.ts
git commit -m "test(attendance): add ProfileRepository unit tests — covers all repository methods"
```

---

## Task 3: Migrate `useAttendanceStore` to use the repository

**Files:**
- Modify: `src/features/attendance/store/useAttendanceStore.ts` (lines 192–273)

The store currently calls Supabase directly in `uploadAvatar` and `syncFromCloud`. Replace both with repository calls.

### Step 1: Write failing test that verifies repository is called

Add to `src/features/attendance/store/useAttendanceStore.test.ts`:

```typescript
// Add at top with other imports:
import { ProfileRepository } from '../repository/profileRepository';

// Add inside describe('useAttendanceStore'):
describe('uploadAvatar (via repository)', () => {
  it('should call repo.uploadAvatar and update profile on success', async () => {
    const profile = { id: 'p1', name: 'Alice', attended: 0, total: 0 };
    useAttendanceStore.setState({ profiles: [profile], activeProfile: profile });

    // Mock the repository method
    const uploadSpy = vi.spyOn(ProfileRepository.prototype, 'uploadAvatar')
      .mockResolvedValueOnce({ publicUrl: 'https://example.com/avatar.jpg' });

    const file = new Blob(['data'], { type: 'image/jpeg' });
    const url = await useAttendanceStore.getState().uploadAvatar('p1', file);

    expect(uploadSpy).toHaveBeenCalledWith('p1', file);
    expect(url).toBe('https://example.com/avatar.jpg');
    expect(useAttendanceStore.getState().activeProfile?.avatar_url)
      .toBe('https://example.com/avatar.jpg');
  });
});
```

### Step 2: Run to confirm the test fails (currently uses raw Supabase, not repository)

```bash
npm test -- --run --reporter=verbose src/features/attendance/store/useAttendanceStore.test.ts
```
Expected: New test FAIL.

### Step 3: Update `useAttendanceStore.ts` — `uploadAvatar` method

Replace the `uploadAvatar` action (lines 192–216) with:

```typescript
uploadAvatar: async (profileId, file) => {
    const { supabase } = await import('../../../core/lib/supabase');
    const { createProfileRepository } = await import('../repository/profileRepository');
    const repo = createProfileRepository(supabase);
    if (!repo) return null;

    try {
        const { publicUrl } = await repo.uploadAvatar(profileId, file);
        useAttendanceStore.getState().updateProfile(profileId, { avatar_url: publicUrl });
        return publicUrl;
    } catch (error) {
        console.error('Upload failed:', error);
        return null;
    }
},
```

### Step 4: Update `useAttendanceStore.ts` — `syncFromCloud` method

Replace the `syncFromCloud` action (lines 218–274) with:

```typescript
syncFromCloud: async (profileId, force = false) => {
    if (!isSupabaseAvailable()) return 'offline';

    const { supabase } = await import('../../../core/lib/supabase');
    const { createProfileRepository } = await import('../repository/profileRepository');
    const repo = createProfileRepository(supabase);
    if (!repo) return 'offline';

    try {
        const cloudData = await repo.fetchOne(profileId);
        if (!cloudData) return 'failed';

        const state = useAttendanceStore.getState();
        const local = state.activeProfile;

        const cloudTargetGoal = cloudData.target_goal;
        const cloudLogs = cloudData.logs;
        const cloudNotes = cloudData.notes;

        const hasChanges =
            local?.attended !== cloudData.attended ||
            local?.total !== cloudData.total ||
            (cloudTargetGoal !== undefined && local?.targetGoal !== cloudTargetGoal) ||
            (cloudLogs !== undefined && JSON.stringify(local?.logs) !== JSON.stringify(cloudLogs)) ||
            (cloudNotes !== undefined && local?.notes !== cloudNotes);

        const hasLocalChanges = local?.updated_at && state.lastSyncedAt && local.updated_at > state.lastSyncedAt;

        if (hasChanges && hasLocalChanges && !force) {
            return 'conflict';
        }

        if (hasChanges && local) {
            const mergedProfile = {
                ...local,
                attended: cloudData.attended,
                total: cloudData.total,
                ...(cloudTargetGoal !== undefined ? { targetGoal: cloudTargetGoal } : {}),
                ...(cloudLogs !== undefined ? { logs: cloudLogs } : {}),
                ...(cloudNotes !== undefined ? { notes: cloudNotes } : {}),
            };
            set((s) => ({
                activeProfile: mergedProfile,
                profiles: s.profiles.map((p) =>
                    p.id === profileId ? mergedProfile : p
                ),
                lastSyncedAt: Date.now(),
            }));
            return 'updated';
        }

        set({ lastSyncedAt: Date.now() });
        return 'in-sync';
    } catch {
        return 'failed';
    }
},
```

### Step 5: Run tests

```bash
npm test -- --run
```
Expected: All 130+ tests pass including the new one.

### Step 6: Commit

```bash
git add src/features/attendance/store/useAttendanceStore.ts \
        src/features/attendance/store/useAttendanceStore.test.ts
git commit -m "refactor(attendance): route uploadAvatar and syncFromCloud through ProfileRepository"
```

---

## Task 4: Migrate `AttendanceView` sync to use the repository

**Files:**
- Modify: `src/features/attendance/components/AttendanceView.tsx` (line 15, lines 145–185)

### Step 1: Remove the direct `supabase` import at line 15

```typescript
// REMOVE this line:
import { supabase } from '../../../core/lib/supabase';
```

### Step 2: Replace `handleSync` (lines 145–186) with a repository call

```typescript
const handleSync = async () => {
    if (!activeProfile || isSyncing.current || isReadOnly) return;
    
    isSyncing.current = true;
    setLoading(true);

    try {
        const { supabase } = await import('../../../core/lib/supabase');
        const { createProfileRepository } = await import('../repository/profileRepository');
        const repo = createProfileRepository(supabase);
        if (!repo) {
            toast.error('Cloud sync unavailable. Check your connection.');
            return;
        }

        await repo.syncUp(activeProfile.id, {
            attended: activeProfile.attended,
            total: activeProfile.total,
            targetGoal: activeProfile.targetGoal ?? 75,
            logs: activeProfile.logs ?? [],
            notes: activeProfile.notes ?? '',
        });

        setSyncSuccess(true);
        setSyncError(null);
        toast.success('Successfully synced to cloud');
        setTimeout(() => setSyncSuccess(false), 2000);
    } catch (err: unknown) {
        console.error('Sync failed:', err);
        const msg = err instanceof Error ? err.message : 'Failed to sync to cloud';
        setSyncError(msg);
        toast.error(msg);
    } finally {
        setLoading(false);
        isSyncing.current = false;
    }
};
```

**Note:** The `announcements` queries (lines 84–116) and the `rpc('mark_announcement_seen')` call (lines 127–142) are left untouched — they are a separate read concern and out of scope.

### Step 3: Run type-check

```bash
npx tsc --noEmit
```
Expected: zero errors.

### Step 4: Run tests

```bash
npm test -- --run
```
Expected: All tests pass.

### Step 5: Commit

```bash
git add src/features/attendance/components/AttendanceView.tsx
git commit -m "refactor(attendance): route AttendanceView handleSync through ProfileRepository"
```

---

## Task 5: Migrate `ProfileNotes` autosave to use the repository

**Files:**
- Modify: `src/features/attendance/components/ProfileNotes.tsx` (lines 42–53)

### Step 1: Replace `persistNotesToDb` with a repository call

Replace lines 42–53:

```typescript
const persistNotesToDb = useCallback(async (profileId: string, notes: string) => {
    try {
        const { supabase } = await import('../../../core/lib/supabase');
        const { createProfileRepository } = await import('../repository/profileRepository');
        const repo = createProfileRepository(supabase);
        if (!repo) return;
        await repo.update(profileId, { notes });
    } catch {
        // Silent fail — data is already saved locally; user can still sync manually
    }
}, []);
```

### Step 2: Verify types compile

```bash
npx tsc --noEmit
```
Expected: zero errors.

### Step 3: Run tests

```bash
npm test -- --run
```
Expected: All tests pass.

### Step 4: Commit

```bash
git add src/features/attendance/components/ProfileNotes.tsx
git commit -m "refactor(attendance): route ProfileNotes DB autosave through ProfileRepository"
```

---

## Task 6: Migrate `ProfileSelection` profile creation and password flows to use the repository

**Files:**
- Modify: `src/features/attendance/components/ProfileSelection.tsx` (lines 88–107, 127–191, 201–254)

### Step 1: Replace `fetchProfiles` (lines 88–107)

```typescript
const fetchProfiles = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setLoading(true);

    try {
        const { supabase } = await import('../../../core/lib/supabase');
        const { createProfileRepository } = await import('../repository/profileRepository');
        const repo = createProfileRepository(supabase);
        if (!repo) return;

        const data = await repo.fetchAll();
        setProfiles(data);
        if (isRefresh) toast.success('Profiles refreshed');
    } catch (err: unknown) {
        console.error('Error fetching profiles:', err);
        if (isRefresh) toast.error('Failed to refresh profiles');
    } finally {
        if (isRefresh) setIsRefreshing(false);
        else setLoading(false);
    }
}, [setLoading, setProfiles]);
```

### Step 2: Replace `handleSubmit` profile creation (lines 127–191)

The new `handleSubmit` calls `ProfileRepository.hashPassword`, `repo.create`, and `repo.uploadAvatar` in sequence. Replace lines 127–191 with:

```typescript
const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) { setErrorMsg('Please enter a profile name.'); return; }
    if (!selectedAvatar && !customAvatarBlob) { setErrorMsg('Please select an avatar.'); return; }

    setSubmitting(true);
    setErrorMsg(null);

    try {
        const { supabase } = await import('../../../core/lib/supabase');
        const { createProfileRepository, ProfileRepository } = await import('../repository/profileRepository');
        const repo = createProfileRepository(supabase);
        if (!repo) throw new Error('Supabase not initialized');

        const { uploadAvatar } = useAttendanceStore.getState();
        const isCustom = selectedAvatar.startsWith('blob:');
        const initialAvatarUrl = isCustom ? '' : selectedAvatar;

        const hashedPassword = await ProfileRepository.hashPassword(newPassword || '123');

        const newProfile = await repo.create({
            name: newName.trim(),
            avatar_url: initialAvatarUrl,
            password: hashedPassword,
            attended: 0,
            total: 0,
        });

        const finalId = newProfile.id;
        setProfiles([...profiles, newProfile]);
        toast.success('Profile created!');

        if (customAvatarBlob && finalId) {
            const publicUrl = await uploadAvatar(finalId, customAvatarBlob);
            if (publicUrl) {
                await repo.update(finalId, { avatar_url: publicUrl, is_flagged: true } as any);
                updateProfile(finalId, { avatar_url: publicUrl });
            }
        }

        closeModal();
    } catch (err: unknown) {
        const error = err as Error;
        console.error(error);
        setErrorMsg(error.message ?? 'Something went wrong. Please try again.');
    } finally {
        setSubmitting(false);
    }
};
```

### Step 3: Replace `unlockProfile` password verification (lines 201–254)

The `unlockProfile` function currently calls `bcrypt` directly. Replace it with `ProfileRepository.verifyPassword` and `repo.update` for the migration case:

```typescript
const unlockProfile = async () => {
    if (!passwordPromptProfile) return;

    if (lockoutUntil && Date.now() < lockoutUntil) {
        toast.error('Too many attempts. Try again later.');
        setPasswordError(true);
        return;
    }

    if (lockoutUntil && Date.now() >= lockoutUntil) {
        setLockoutUntil(null);
        setLoginAttempts(0);
    }

    const stored = passwordPromptProfile.password || '123';
    const { ProfileRepository, createProfileRepository } = await import('../repository/profileRepository');
    const { correct, needsMigration } = await ProfileRepository.verifyPassword(enteredPassword, stored);

    if (!correct) {
        setPasswordError(true);
        if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
        const newAttempts = loginAttempts + 1;
        setLoginAttempts(newAttempts);
        if (newAttempts >= 5) {
            setLockoutUntil(Date.now() + 5 * 60 * 1000);
            toast.error('Too many attempts. Locked out for 5 minutes.');
        }
        return;
    }

    setLoginAttempts(0);
    setLockoutUntil(null);
    setActiveProfile(passwordPromptProfile, 'editable');
    closePasswordPrompt();

    if (needsMigration) {
        try {
            const { supabase } = await import('../../../core/lib/supabase');
            const repo = createProfileRepository(supabase);
            if (repo) {
                const hashed = await ProfileRepository.hashPassword(enteredPassword);
                await repo.update(passwordPromptProfile.id, { password: hashed });
                updateProfile(passwordPromptProfile.id, { password: hashed });
            }
        } catch (err) {
            console.error('Password migration failed:', err);
        }
    }
};
```

### Step 4: Remove top-level supabase import from ProfileSelection

```typescript
// REMOVE this line at the top of ProfileSelection.tsx:
import { supabase } from '../../../core/lib/supabase';
```

### Step 5: Run type-check

```bash
npx tsc --noEmit
```
Expected: zero errors.

### Step 6: Run all tests

```bash
npm test -- --run
```
Expected: All tests pass.

### Step 7: Commit

```bash
git add src/features/attendance/components/ProfileSelection.tsx
git commit -m "refactor(attendance): route ProfileSelection DB calls through ProfileRepository"
```

---

## Task 7: Migrate `SettingsMenu` profile mutations to use the repository

**Files:**
- Modify: `src/shared/components/SettingsMenu.tsx` (lines 220–244, 263–292, around line 400)

### Step 1: Replace the inline name-update click handler (lines 220–244)

Find the `onClick` for the "Update" name button and replace its body:

```typescript
onClick={async () => {
    if (!newName.trim()) {
        toast.error("Name cannot be empty");
        return;
    }
    try {
        const { supabase } = await import('../../core/lib/supabase');
        const { createProfileRepository } = await import('../../features/attendance/repository/profileRepository');
        const repo = createProfileRepository(supabase);
        if (repo) await repo.update(activeProfile.id, { name: newName.trim() });
        updateProfile(activeProfile.id, { name: newName.trim() });
        toast.success("Name updated!");
    } catch (err: unknown) {
        const error = err as Error;
        toast.error("Update failed: " + error.message);
    }
}}
```

### Step 2: Replace the inline password-update click handler (lines 263–292)

```typescript
onClick={async () => {
    if (!newPassword.trim()) {
        toast.error("Please enter a password");
        return;
    }
    const loadingToast = toast.loading("Hashing & saving...");
    try {
        const { ProfileRepository, createProfileRepository } = await import('../../features/attendance/repository/profileRepository');
        const { supabase } = await import('../../core/lib/supabase');
        const hashedPassword = await ProfileRepository.hashPassword(newPassword.trim());
        const repo = createProfileRepository(supabase);
        if (repo) await repo.update(activeProfile.id, { password: hashedPassword });
        updateProfile(activeProfile.id, { password: hashedPassword });
        toast.success("Security updated!", { id: loadingToast });
        setNewPassword('');
    } catch (err: unknown) {
        const error = err as Error;
        toast.error("Update failed: " + error.message, { id: loadingToast });
    }
}}
```

### Step 3: Replace the avatar `is_flagged` update (around line 402)

Find the line:
```typescript
await sp.from('profiles').update({ avatar_url: publicUrl, is_flagged: true }).eq('id', activeProfile.id);
```
Replace with:
```typescript
const { createProfileRepository } = await import('../../features/attendance/repository/profileRepository');
const repo = createProfileRepository(sp);
if (repo) await repo.update(activeProfile.id, { avatar_url: publicUrl, is_flagged: true } as any);
```

Also replace the `delete profile` Supabase call in SettingsMenu (look for `.from('profiles').delete()`):
```typescript
// Replace any remaining raw:
// await sp.from('profiles').delete().eq('id', ...)
// With:
if (repo) {
    // ProfileRepository doesn't have a delete yet — add it in profileRepository.ts first (see below)
}
```

**Add `delete` to the repository** (`src/features/attendance/repository/profileRepository.ts`):

```typescript
/** Delete a profile by id. */
async delete(profileId: string): Promise<void> {
    const { error } = await this.db
        .from('profiles')
        .delete()
        .eq('id', profileId);
    if (error) throw error;
}
```

Then in SettingsMenu replace the delete call:
```typescript
const { createProfileRepository } = await import('../../features/attendance/repository/profileRepository');
const repo = createProfileRepository(sp);
if (repo) await repo.delete(activeProfile.id);
```

### Step 4: Run type-check

```bash
npx tsc --noEmit
```
Expected: zero errors.

### Step 5: Run all tests

```bash
npm test -- --run
```
Expected: All tests pass.

### Step 6: Commit

```bash
git add src/shared/components/SettingsMenu.tsx \
        src/features/attendance/repository/profileRepository.ts
git commit -m "refactor(attendance): route SettingsMenu profile mutations through ProfileRepository"
```

---

## Task 8: Final verification — grep confirms no raw DB calls remain in UI

### Step 1: Confirm no UI module calls supabase.from('profiles') directly

```bash
git grep -n "from('profiles')" -- src/features/attendance/components/ src/shared/components/SettingsMenu.tsx
```
Expected output: **empty** (zero matches). If any remain, fix them before proceeding.

### Step 2: Run full test suite

```bash
npm test -- --run
```
Expected: All tests pass (130+).

### Step 3: Run production build to confirm no type or bundle errors

```bash
npm run build
```
Expected: Build succeeds with zero TypeScript errors.

### Step 4: Update the task tracker

Update `docs/plans/task.md` to mark this plan complete.

### Step 5: Final commit

```bash
git add docs/plans/task.md
git commit -m "chore: mark attendance module refactor plan complete"
```

---

## Files changed summary

| Action | File |
|--------|------|
| Create | `src/features/attendance/repository/profileRepository.ts` |
| Create | `src/features/attendance/repository/profileRepository.test.ts` |
| Modify | `src/features/attendance/store/useAttendanceStore.ts` |
| Modify | `src/features/attendance/store/useAttendanceStore.test.ts` |
| Modify | `src/features/attendance/components/AttendanceView.tsx` |
| Modify | `src/features/attendance/components/ProfileNotes.tsx` |
| Modify | `src/features/attendance/components/ProfileSelection.tsx` |
| Modify | `src/shared/components/SettingsMenu.tsx` |
