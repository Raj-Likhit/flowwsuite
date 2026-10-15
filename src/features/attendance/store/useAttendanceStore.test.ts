import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAttendanceStore } from './useAttendanceStore';
import { supabase, isSupabaseAvailable } from '../../../core/lib/supabase';
import { ProfileRepository } from '../repository/profileRepository';

// Mock supabase and crypto
vi.mock('../../../core/lib/supabase', () => ({
    supabase: {
        storage: {
            from: vi.fn().mockReturnThis(),
            upload: /* @ts-ignore */ vi.fn(),
            getPublicUrl: /* @ts-ignore */ vi.fn(),
        },
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(),
    },
    isSupabaseAvailable: vi.fn().mockReturnValue(true),
}));

describe('useAttendanceStore', () => {
    beforeEach(() => {
        localStorage.clear();
        useAttendanceStore.setState({
            profiles: [],
            activeProfile: null,
            accessMode: 'editable',
            loading: false,
            error: null,
            hideProfileName: false,
            lastSyncedAt: null,
            isCloudSyncEnabled: true,
        });
        vi.clearAllMocks();
        vi.stubGlobal('crypto', { randomUUID: () => 'mock-uuid' });
    });

    it('should initialize with default state', () => {
        const state = useAttendanceStore.getState();
        expect(state.profiles).toEqual([]);
        expect(state.activeProfile).toBeNull();
        expect(state.accessMode).toBe('editable');
    });

    it('setProfiles and setActiveProfile should work', () => {
        const store = useAttendanceStore.getState();
        const profile = { id: 'p1', name: 'John', attended: 0, total: 0 };
        
        store.setProfiles([profile]);
        expect(useAttendanceStore.getState().profiles).toEqual([profile]);

        store.setActiveProfile(profile, 'readOnly');
        expect(useAttendanceStore.getState().activeProfile).toEqual(profile);
        expect(useAttendanceStore.getState().accessMode).toBe('readOnly');

        // Setting active to null resets accessMode to editable
        useAttendanceStore.getState().setActiveProfile(null);
        expect(useAttendanceStore.getState().activeProfile).toBeNull();
        expect(useAttendanceStore.getState().accessMode).toBe('editable');
    });

    it('should toggle hideProfileName', () => {
        const store = useAttendanceStore.getState();
        store.toggleHideProfileName();
        expect(useAttendanceStore.getState().hideProfileName).toBe(true);
        useAttendanceStore.getState().toggleHideProfileName();
        expect(useAttendanceStore.getState().hideProfileName).toBe(false);
    });

    it('setLoading and setError should work', () => {
        useAttendanceStore.getState().setLoading(true);
        expect(useAttendanceStore.getState().loading).toBe(true);

        useAttendanceStore.getState().setError('Error occurred');
        expect(useAttendanceStore.getState().error).toBe('Error occurred');
    });

    describe('updateAttendance', () => {
        it('should do nothing if no active profile or readOnly mode', () => {
            const store = useAttendanceStore.getState();
            expect(store.updateAttendance(1, 1)).toBeUndefined();
            
            store.setActiveProfile({ id: 'p1', name: 'John', attended: 0, total: 0 }, 'readOnly');
            expect(useAttendanceStore.getState().updateAttendance(1, 1)).toBeUndefined();
        });

        it('should update attendance, sanitize total/attended, and create log', () => {
            const profile = { id: 'p1', name: 'John', attended: 0, total: 0, logs: [] };
            useAttendanceStore.setState({ activeProfile: profile, profiles: [profile] });
            
            const store = useAttendanceStore.getState();
            const logId = store.updateAttendance(1, 1, '<script>Alert</script>');

            const updatedProfile = useAttendanceStore.getState().activeProfile;
            expect(updatedProfile?.attended).toBe(1);
            expect(updatedProfile?.total).toBe(1);
            expect(updatedProfile?.logs?.[0]).toEqual(expect.objectContaining({
                id: 'mock-uuid',
                title: 'scriptAlert/script',
                diffAttended: 1,
                diffTotal: 1,
            }));
            expect(logId).toBe('mock-uuid');
        });

        it('should handle auto-detect title for +1 class', () => {
            const profile = { id: 'p1', name: 'John', attended: 5, total: 5, logs: [] };
            useAttendanceStore.setState({ activeProfile: profile, profiles: [profile] });
            
            useAttendanceStore.getState().updateAttendance(6, 6);
            const logs = useAttendanceStore.getState().activeProfile?.logs;
            expect(logs?.[0].title).toBe('Logged +1 class');
        });

        it('should clamp values and return if no diff', () => {
            const profile = { id: 'p1', name: 'John', attended: 5, total: 5, logs: [] };
            useAttendanceStore.setState({ activeProfile: profile, profiles: [profile] });
            
            useAttendanceStore.getState().updateAttendance(NaN, NaN); // clamps to 0 total, 0 attended
            
            const updatedProfile = useAttendanceStore.getState().activeProfile;
            expect(updatedProfile?.attended).toBe(0);
            expect(updatedProfile?.total).toBe(0);
            expect(updatedProfile?.logs?.length).toBe(1);

            // update to same values does nothing
            const nextLogId = useAttendanceStore.getState().updateAttendance(0, 0);
            expect(nextLogId).toBeUndefined();
        });
    });

    describe('deleteProfile and updateProfile', () => {
        it('should delete a profile and clear active profile if matched', () => {
            const profile1 = { id: 'p1', name: 'John', attended: 0, total: 0 };
            const profile2 = { id: 'p2', name: 'Jane', attended: 0, total: 0 };
            useAttendanceStore.setState({ profiles: [profile1, profile2], activeProfile: profile1, accessMode: 'readOnly' });
            
            useAttendanceStore.getState().deleteProfile('p1');
            const state = useAttendanceStore.getState();
            
            expect(state.profiles).toEqual([profile2]);
            expect(state.activeProfile).toBeNull();
            expect(state.accessMode).toBe('editable'); // resets to editable
        });

        it('should update profile name and notes', () => {
            const profile1 = { id: 'p1', name: 'John', attended: 0, total: 0, notes: '' };
            useAttendanceStore.setState({ profiles: [profile1], activeProfile: profile1 });
            
            useAttendanceStore.getState().updateProfile('p1', { name: '<script>Jane</script>', notes: 'My notes' });
            
            const state = useAttendanceStore.getState();
            expect(state.activeProfile?.name).toBe('scriptJane/script');
            expect(state.activeProfile?.notes).toBe('My notes');
        });
    });

    describe('deleteLog', () => {
        it('should do nothing if no active profile, readOnly, or log not found', () => {
            useAttendanceStore.setState({ activeProfile: null });
            useAttendanceStore.getState().deleteLog('l1');
            
            const profile = { id: 'p1', name: 'John', attended: 5, total: 5, logs: [{ id: 'l1', timestamp: 0, title: '', diffAttended: 1, diffTotal: 1 }] };
            useAttendanceStore.setState({ activeProfile: profile, accessMode: 'readOnly' });
            useAttendanceStore.getState().deleteLog('l1');
            expect(useAttendanceStore.getState().activeProfile?.logs?.length).toBe(1);

            useAttendanceStore.setState({ accessMode: 'editable' });
            useAttendanceStore.getState().deleteLog('non-existent');
            expect(useAttendanceStore.getState().activeProfile?.logs?.length).toBe(1);
        });

        it('should delete log and revert attendance values', () => {
            const profile = { id: 'p1', name: 'John', attended: 5, total: 5, logs: [{ id: 'l1', timestamp: 0, title: '', diffAttended: 2, diffTotal: 2 }] };
            useAttendanceStore.setState({ profiles: [profile], activeProfile: profile });
            
            useAttendanceStore.getState().deleteLog('l1');
            
            const state = useAttendanceStore.getState();
            expect(state.activeProfile?.logs?.length).toBe(0);
            expect(state.activeProfile?.attended).toBe(3);
            expect(state.activeProfile?.total).toBe(3);
            expect(state.profiles[0].attended).toBe(3);
        });
    });

    describe('uploadAvatar', () => {
        it('should upload avatar and update profile', async () => {
            const profile = { id: 'p1', name: 'John', attended: 0, total: 0 };
            useAttendanceStore.setState({ profiles: [profile], activeProfile: profile });
            
            vi.mocked(supabase!.storage.upload).mockResolvedValue({ data: { path: 'path' }, error: null } as any);
            vi.mocked(supabase!.storage.getPublicUrl).mockReturnValue({ data: { publicUrl: 'http://avatar.url' } } as any);
            
            const url = await useAttendanceStore.getState().uploadAvatar('p1', new Blob());
            expect(url).toBe('http://avatar.url');
            expect(useAttendanceStore.getState().activeProfile?.avatar_url).toBe('http://avatar.url');
        });

        it('should upload animated GIF avatar with image/gif content type', async () => {
            const profile = { id: 'p1', name: 'John', attended: 0, total: 0 };
            useAttendanceStore.setState({ profiles: [profile], activeProfile: profile });
            
            vi.mocked(supabase!.storage.upload).mockResolvedValue({ data: { path: 'path/avatar.gif' }, error: null } as any);
            vi.mocked(supabase!.storage.getPublicUrl).mockReturnValue({ data: { publicUrl: 'http://avatar.url/avatar.gif' } } as any);
            
            const gifBlob = new Blob([], { type: 'image/gif' });
            const url = await useAttendanceStore.getState().uploadAvatar('p1', gifBlob);
            
            expect(supabase!.storage.upload).toHaveBeenCalledWith(
                expect.stringMatching(/\.gif$/),
                gifBlob,
                expect.objectContaining({ contentType: 'image/gif' })
            );
            expect(url).toBe('http://avatar.url/avatar.gif');
        });

        it('should return null on upload error', async () => {
            vi.mocked(supabase!.storage.upload).mockResolvedValue({ data: null, error: new Error('Upload error') } as any);
            const url = await useAttendanceStore.getState().uploadAvatar('p1', new Blob());
            expect(url).toBeNull();
        });

        it('should delegate to ProfileRepository.prototype.uploadAvatar', async () => {
            const profile = { id: 'p1', name: 'Alice', attended: 0, total: 0 };
            useAttendanceStore.setState({ profiles: [profile], activeProfile: profile });

            const uploadSpy = vi.spyOn(ProfileRepository.prototype, 'uploadAvatar')
                .mockResolvedValueOnce({ publicUrl: 'https://example.com/avatar.jpg' });

            const file = new Blob(['data'], { type: 'image/jpeg' });
            const url = await useAttendanceStore.getState().uploadAvatar('p1', file);

            expect(uploadSpy).toHaveBeenCalledWith('p1', file);
            expect(url).toBe('https://example.com/avatar.jpg');
            expect(useAttendanceStore.getState().activeProfile?.avatar_url).toBe('https://example.com/avatar.jpg');
        });
    });

    describe('syncFromCloud', () => {
        it('should return offline if supabase is not available', async () => {
            vi.mocked(isSupabaseAvailable).mockReturnValueOnce(false);
            const result = await useAttendanceStore.getState().syncFromCloud('p1');
            expect(result).toBe('offline');
        });

        it('should return failed on supabase error', async () => {
            vi.mocked(supabase!.single).mockResolvedValue({ data: null, error: new Error('db error') } as any);
            const result = await useAttendanceStore.getState().syncFromCloud('p1');
            expect(result).toBe('failed');
        });

        it('should return in-sync if no changes', async () => {
            const profile = { id: 'p1', name: 'John', attended: 5, total: 5, notes: 'ABC' };
            useAttendanceStore.setState({ profiles: [profile], activeProfile: profile });
            vi.mocked(supabase!.single).mockResolvedValue({ data: { attended: 5, total: 5, name: 'John', notes: 'ABC' }, error: null } as any);
            
            const result = await useAttendanceStore.getState().syncFromCloud('p1');
            expect(result).toBe('in-sync');
        });

        it('should update local store and return updated if changes detected', async () => {
            const profile = { id: 'p1', name: 'John', attended: 5, total: 5, notes: 'Old' };
            useAttendanceStore.setState({ profiles: [profile], activeProfile: profile });
            vi.mocked(supabase!.single).mockResolvedValue({ data: { attended: 10, total: 12, name: 'John', notes: 'New notes' }, error: null } as any);
            
            const result = await useAttendanceStore.getState().syncFromCloud('p1');
            
            expect(result).toBe('updated');
            expect(useAttendanceStore.getState().activeProfile?.attended).toBe(10);
            expect(useAttendanceStore.getState().activeProfile?.total).toBe(12);
            expect(useAttendanceStore.getState().activeProfile?.notes).toBe('New notes');
        });

        it('should detect conflict when local changes are newer than lastSyncedAt and not force overwrite', async () => {
            const now = Date.now();
            const profile = { id: 'p1', name: 'John', attended: 8, total: 8, notes: 'Offline bus edits', updated_at: now + 5000 };
            useAttendanceStore.setState({
                profiles: [profile],
                activeProfile: profile,
                lastSyncedAt: now,
            });

            vi.mocked(supabase!.single).mockResolvedValue({
                data: { attended: 5, total: 5, name: 'John', notes: 'Old cloud note' },
                error: null,
            } as any);

            const result = await useAttendanceStore.getState().syncFromCloud('p1');

            expect(result).toBe('conflict');
            // Local data should remain untouched
            expect(useAttendanceStore.getState().activeProfile?.attended).toBe(8);
            expect(useAttendanceStore.getState().activeProfile?.notes).toBe('Offline bus edits');
        });

        it('should force overwrite local changes if force parameter is true during conflict', async () => {
            const now = Date.now();
            const profile = { id: 'p1', name: 'John', attended: 8, total: 8, notes: 'Offline bus edits', updated_at: now + 5000 };
            useAttendanceStore.setState({
                profiles: [profile],
                activeProfile: profile,
                lastSyncedAt: now,
            });

            vi.mocked(supabase!.single).mockResolvedValue({
                data: { attended: 5, total: 5, name: 'John', notes: 'Cloud source of truth' },
                error: null,
            } as any);

            const result = await useAttendanceStore.getState().syncFromCloud('p1', true);

            expect(result).toBe('updated');
            expect(useAttendanceStore.getState().activeProfile?.attended).toBe(5);
            expect(useAttendanceStore.getState().activeProfile?.notes).toBe('Cloud source of truth');
        });

        it('should return failed if promise rejects', async () => {
            vi.mocked(supabase!.single).mockRejectedValue(new Error('Network error'));
            const result = await useAttendanceStore.getState().syncFromCloud('p1');
            expect(result).toBe('failed');
        });
    });
});
