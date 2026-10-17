import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePushNotifications } from './usePushNotifications';
import { toast } from 'sonner';

vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
        warning: vi.fn(),
    },
}));

vi.mock('../../../core/lib/supabase', () => ({
    supabase: {
        from: vi.fn(),
    },
}));

describe('usePushNotifications', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('warns when subscribe is called without profileId', async () => {
        const { result } = renderHook(() => usePushNotifications(undefined));

        await act(async () => {
            await result.current.subscribeToPush();
        });

        expect(toast.error).toHaveBeenCalledWith('You must select a profile first to receive notifications.');
        expect(result.current.isSubscribed).toBe(false);
    });

    it('warns when VAPID public key is not configured', async () => {
        vi.stubEnv('VITE_VAPID_PUBLIC_KEY', '');
        const { result } = renderHook(() => usePushNotifications('prof-1'));

        await act(async () => {
            await result.current.subscribeToPush();
        });

        expect(toast.error).toHaveBeenCalledWith(
            expect.stringContaining('missing VAPID key')
        );
        vi.unstubAllEnvs();
    });

    it('handles permission denial gracefully without crashing', async () => {
        // Set VAPID key
        vi.stubEnv('VITE_VAPID_PUBLIC_KEY', 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFg');
        
        // Mock Notification.requestPermission
        const originalNotification = globalThis.Notification;
        (globalThis as any).Notification = {
            requestPermission: vi.fn().mockResolvedValue('denied'),
        };

        const { result } = renderHook(() => usePushNotifications('prof-1'));

        await act(async () => {
            await result.current.subscribeToPush();
        });

        expect(toast.error).toHaveBeenCalledWith('Notification permission denied.');
        expect(result.current.isSubscribed).toBe(false);

        (globalThis as any).Notification = originalNotification;
        vi.unstubAllEnvs();
    });
});
