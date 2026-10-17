import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '../../../core/lib/supabase';

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export const usePushNotifications = (profileId?: string) => {
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isSupported] = useState(() => 
        typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window
    );

    const checkSubscription = async () => {
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            setIsSubscribed(!!subscription);
        } catch (error) {
            console.error('Error checking subscription', error);
        }
    };

    useEffect(() => {
        if (isSupported) {
            checkSubscription();
        }
    }, [isSupported]);

    const subscribeToPush = useCallback(async () => {
        if (!profileId) {
            toast.error("You must select a profile first to receive notifications.");
            return;
        }

        const publicVapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
        if (!publicVapidKey) {
            toast.error("Push notifications are not configured on this environment (missing VAPID key).");
            return;
        }

        if (typeof window === 'undefined' || !('Notification' in window)) {
            toast.error("Push notifications are not supported on this browser.");
            return;
        }

        try {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                toast.error("Notification permission denied.");
                return;
            }

            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
            });

            // Save subscription to Supabase
            if (supabase) {
                const { error } = await supabase.from('push_subscriptions').insert([{
                    profile_id: profileId,
                    subscription: JSON.parse(JSON.stringify(subscription))
                }]);

                if (error) {
                    console.error("Supabase insert error", error);
                    // RLS might fail if profileId doesn't match auth.uid(), assuming auth is used.
                    toast.error("Failed to save subscription to server.");
                    return;
                }
            }

            setIsSubscribed(true);
            toast.success("Successfully subscribed to notifications!");
        } catch (error: unknown) {
            console.error('Failed to subscribe', error);
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            toast.error("Subscription failed: " + errorMessage);
        }
    }, [profileId]);

    const unsubscribeFromPush = useCallback(async () => {
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            if (subscription) {
                await subscription.unsubscribe();
                
                // Remove from Supabase
                if (supabase && profileId) {
                    await supabase
                        .from('push_subscriptions')
                        .delete()
                        .eq('profile_id', profileId)
                        .contains('subscription', { endpoint: subscription.endpoint });
                }
                
                setIsSubscribed(false);
                toast.success("Unsubscribed from notifications.");
            }
        } catch (error) {
            console.error('Error unsubscribing', error);
            toast.error("Failed to unsubscribe.");
        }
    }, [profileId]);

    return {
        isSupported,
        isSubscribed,
        subscribeToPush,
        unsubscribeFromPush
    };
};
