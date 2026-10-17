import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePushNotifications } from './usePushNotifications';
import { toast } from 'sonner';
import { supabase } from '../../../core/lib/supabase';

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
    const originalNotification = globalThis.Notification;
        const originalWindowPushManager = (globalThis as any).PushManager;

    beforeEach(() => {
        vi.clearAllMocks();
        // default mocks for service worker & PushManager
        (globalThis as any).PushManager = {};
        Object.defineProperty(globalThis.navigator, 'serviceWorker', {
            value: {
                ready: Promise.resolve({
                    pushManager: {
                        getSubscription: vi.fn().mockResolvedValue(null),
                        subscribe: vi.fn(),
                    },
                }),
            },
            configurable: true,
            writable: true,
        });
        (globalThis as any).Notification = {
            requestPermission: vi.fn().mockResolvedValue('granted'),
        };
    });

    afterEach(() => {
        (globalThis as any).Notification = originalNotification;
        (globalThis as any).PushManager = originalWindowPushManager;
        vi.unstubAllEnvs();
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
    });

    it('warns if Notification API is missing from window', async () => {
        vi.stubEnv('VITE_VAPID_PUBLIC_KEY', 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFg');
        delete (globalThis as any).Notification;

        const { result } = renderHook(() => usePushNotifications('prof-1'));

        await act(async () => {
            await result.current.subscribeToPush();
        });

        expect(toast.error).toHaveBeenCalledWith('Push notifications are not supported on this browser.');
    });

    it('handles permission denial gracefully without crashing', async () => {
        vi.stubEnv('VITE_VAPID_PUBLIC_KEY', 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFg');
        (globalThis as any).Notification = {
            requestPermission: vi.fn().mockResolvedValue('denied'),
        };

        const { result } = renderHook(() => usePushNotifications('prof-1'));

        await act(async () => {
            await result.current.subscribeToPush();
        });

        expect(toast.error).toHaveBeenCalledWith('Notification permission denied.');
        expect(result.current.isSubscribed).toBe(false);
    });

    it('successfully subscribes and stores in supabase', async () => {
        vi.stubEnv('VITE_VAPID_PUBLIC_KEY', 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFg');
        const mockSub = { endpoint: 'https://push.example.com/123' };
        const mockSubscribe = vi.fn().mockResolvedValue(mockSub);

        Object.defineProperty(globalThis.navigator, 'serviceWorker', {
            value: {
                ready: Promise.resolve({
                    pushManager: {
                        getSubscription: vi.fn().mockResolvedValue(null),
                        subscribe: mockSubscribe,
                    },
                }),
            },
            configurable: true,
            writable: true,
        });

        const insertMock = vi.fn().mockResolvedValue({ error: null });
        vi.mocked(supabase!.from).mockReturnValue({
            insert: insertMock,
        } as any);

        const { result } = renderHook(() => usePushNotifications('prof-1'));

        await act(async () => {
            await result.current.subscribeToPush();
        });

        expect(mockSubscribe).toHaveBeenCalledWith(expect.objectContaining({
            userVisibleOnly: true,
        }));
        expect(insertMock).toHaveBeenCalledWith([{
            profile_id: 'prof-1',
            subscription: mockSub,
        }]);
        expect(result.current.isSubscribed).toBe(true);
        expect(toast.success).toHaveBeenCalledWith('Successfully subscribed to notifications!');
    });

    it('handles supabase insertion error', async () => {
        vi.stubEnv('VITE_VAPID_PUBLIC_KEY', 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFg');
        const mockSub = { endpoint: 'https://push.example.com/123' };
        const mockSubscribe = vi.fn().mockResolvedValue(mockSub);

        Object.defineProperty(globalThis.navigator, 'serviceWorker', {
            value: {
                ready: Promise.resolve({
                    pushManager: {
                        getSubscription: vi.fn().mockResolvedValue(null),
                        subscribe: mockSubscribe,
                    },
                }),
            },
            configurable: true,
            writable: true,
        });

        const insertMock = vi.fn().mockResolvedValue({ error: new Error('Insert failed') });
        vi.mocked(supabase!.from).mockReturnValue({
            insert: insertMock,
        } as any);

        const { result } = renderHook(() => usePushNotifications('prof-1'));

        await act(async () => {
            await result.current.subscribeToPush();
        });

        expect(toast.error).toHaveBeenCalledWith('Failed to save subscription to server.');
        expect(result.current.isSubscribed).toBe(false);
    });

    it('handles subscription failure exception gracefully', async () => {
        vi.stubEnv('VITE_VAPID_PUBLIC_KEY', 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFg');
        Object.defineProperty(globalThis.navigator, 'serviceWorker', {
            value: {
                ready: Promise.resolve({
                    pushManager: {
                        getSubscription: vi.fn().mockResolvedValue(null),
                        subscribe: vi.fn().mockRejectedValue(new Error('Push service error')),
                    },
                }),
            },
            configurable: true,
            writable: true,
        });

        const { result } = renderHook(() => usePushNotifications('prof-1'));

        await act(async () => {
            await result.current.subscribeToPush();
        });

        expect(toast.error).toHaveBeenCalledWith('Subscription failed: Push service error');
    });

    it('checks subscription on mount and sets subscribed status if existing', async () => {
        const mockSub = { endpoint: 'https://push.example.com/existing' };
        Object.defineProperty(globalThis.navigator, 'serviceWorker', {
            value: {
                ready: Promise.resolve({
                    pushManager: {
                        getSubscription: vi.fn().mockResolvedValue(mockSub),
                    },
                }),
            },
            configurable: true,
            writable: true,
        });

        const { result } = renderHook(() => usePushNotifications('prof-1'));

        // wait for mount check
        await act(async () => {
            await Promise.resolve();
        });

        expect(result.current.isSubscribed).toBe(true);
    });

    it('handles subscription check error on mount without throwing', async () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        Object.defineProperty(globalThis.navigator, 'serviceWorker', {
            value: {
                ready: Promise.reject(new Error('SW failed')),
            },
            configurable: true,
            writable: true,
        });

        const { result } = renderHook(() => usePushNotifications('prof-1'));

        await act(async () => {
            await Promise.resolve();
        });

        expect(consoleErrorSpy).toHaveBeenCalledWith('Error checking subscription', expect.any(Error));
        expect(result.current.isSubscribed).toBe(false);
        consoleErrorSpy.mockRestore();
    });

    it('successfully unsubscribes and deletes subscription from supabase', async () => {
        const mockUnsubscribe = vi.fn().mockResolvedValue(true);
        const mockSub = { endpoint: 'https://push.example.com/active', unsubscribe: mockUnsubscribe };

        Object.defineProperty(globalThis.navigator, 'serviceWorker', {
            value: {
                ready: Promise.resolve({
                    pushManager: {
                        getSubscription: vi.fn().mockResolvedValue(mockSub),
                    },
                }),
            },
            configurable: true,
            writable: true,
        });

        const containsMock = vi.fn().mockResolvedValue({ error: null });
        const eqMock = vi.fn().mockReturnValue({ contains: containsMock });
        const deleteMock = vi.fn().mockReturnValue({ eq: eqMock });
        vi.mocked(supabase!.from).mockReturnValue({
            delete: deleteMock,
        } as any);

        const { result } = renderHook(() => usePushNotifications('prof-1'));

        await act(async () => {
            await result.current.unsubscribeFromPush();
        });

        expect(mockUnsubscribe).toHaveBeenCalled();
        expect(deleteMock).toHaveBeenCalled();
        expect(eqMock).toHaveBeenCalledWith('profile_id', 'prof-1');
        expect(containsMock).toHaveBeenCalledWith('subscription', { endpoint: 'https://push.example.com/active' });
        expect(result.current.isSubscribed).toBe(false);
        expect(toast.success).toHaveBeenCalledWith('Unsubscribed from notifications.');
    });

    it('handles unsubscribe error gracefully', async () => {
        Object.defineProperty(globalThis.navigator, 'serviceWorker', {
            value: {
                ready: Promise.resolve({
                    pushManager: {
                        getSubscription: vi.fn().mockRejectedValue(new Error('Unsubscribe failed')),
                    },
                }),
            },
            configurable: true,
            writable: true,
        });

        const { result } = renderHook(() => usePushNotifications('prof-1'));

        await act(async () => {
            await result.current.unsubscribeFromPush();
        });

        expect(toast.error).toHaveBeenCalledWith('Failed to unsubscribe.');
    });
});
