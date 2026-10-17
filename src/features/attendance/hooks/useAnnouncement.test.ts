import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAnnouncement } from './useAnnouncement';
import * as repoModule from '../repository/announcementRepository';

let mockSupabase: any = {};
vi.mock('../../../core/lib/supabase', () => ({
    get supabase() {
        return mockSupabase;
    },
}));

describe('useAnnouncement', () => {
    const mockAnnouncements = [
        {
            id: 'ann-1',
            content: 'Welcome to the semester!',
            seen_by_profile_ids: ['prof-2'],
            created_at: new Date().toISOString(),
        },
        {
            id: 'ann-2',
            content: 'Already seen announcement',
            seen_by_profile_ids: ['prof-1'],
            created_at: new Date().toISOString(),
        },
    ];

    const mockRepo = {
        fetchActiveAnnouncements: vi.fn(),
        markSeen: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(repoModule, 'createAnnouncementRepository').mockReturnValue(mockRepo as any);
        mockRepo.fetchActiveAnnouncements.mockResolvedValue(mockAnnouncements);
        mockRepo.markSeen.mockResolvedValue(undefined);
    });

    it('fetches and sets the first unread announcement for the profile', async () => {
        const { result } = renderHook(() => useAnnouncement('prof-1', false));

        await vi.waitFor(() => {
            expect(result.current.activeAnnouncement?.id).toBe('ann-1');
        });

        expect(mockRepo.fetchActiveAnnouncements).toHaveBeenCalledWith('prof-1');
    });

    it('does not fetch announcements when in readOnly mode', async () => {
        const { result } = renderHook(() => useAnnouncement('prof-1', true));

        expect(result.current.activeAnnouncement).toBeNull();
        expect(mockRepo.fetchActiveAnnouncements).not.toHaveBeenCalled();
    });

    it('dismisses announcement and calls markSeen on repository', async () => {
        const { result } = renderHook(() => useAnnouncement('prof-1', false));

        await vi.waitFor(() => {
            expect(result.current.activeAnnouncement?.id).toBe('ann-1');
        });

        await act(async () => {
            await result.current.dismiss();
        });

        expect(result.current.activeAnnouncement).toBeNull();
        expect(mockRepo.markSeen).toHaveBeenCalledWith('ann-1', 'prof-1');
    });

    it('catches and logs error if fetchActiveAnnouncements throws', async () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        mockRepo.fetchActiveAnnouncements.mockRejectedValue(new Error('Network error'));

        const { result } = renderHook(() => useAnnouncement('prof-1', false));

        await vi.waitFor(() => {
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Graceful Fallback: Failed to fetch announcements:',
                expect.any(Error)
            );
        });

        expect(result.current.activeAnnouncement).toBeNull();
        consoleErrorSpy.mockRestore();
    });

    it('catches and logs error if markSeen throws during dismiss', async () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        mockRepo.markSeen.mockRejectedValue(new Error('Update error'));

        const { result } = renderHook(() => useAnnouncement('prof-1', false));

        await vi.waitFor(() => {
            expect(result.current.activeAnnouncement?.id).toBe('ann-1');
        });

        await act(async () => {
            await result.current.dismiss();
        });

        expect(consoleErrorSpy).toHaveBeenCalledWith(
            'Failed to mark announcement as seen',
            expect.any(Error)
        );
        consoleErrorSpy.mockRestore();
    });

    it('does nothing in dismiss if repo is unavailable or announcement is null', async () => {
        const { result } = renderHook(() => useAnnouncement(undefined, false));

        await act(async () => {
            await result.current.dismiss();
        });

        expect(mockRepo.markSeen).not.toHaveBeenCalled();

        // When repo is null
        vi.spyOn(repoModule, 'createAnnouncementRepository').mockReturnValue(null);
        const { result: res2 } = renderHook(() => useAnnouncement('prof-1', false));

        await act(async () => {
            await res2.current.dismiss();
        });
        expect(mockRepo.markSeen).not.toHaveBeenCalled();
    });

    it('does not fetch announcements when supabase is null', async () => {
        const orig = mockSupabase;
        mockSupabase = null;
        const { result } = renderHook(() => useAnnouncement('prof-1', false));
        expect(result.current.activeAnnouncement).toBeNull();
        expect(mockRepo.fetchActiveAnnouncements).not.toHaveBeenCalled();
        mockSupabase = orig;
    });
});
