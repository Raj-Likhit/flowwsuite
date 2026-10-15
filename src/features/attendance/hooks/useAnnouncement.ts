import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../core/lib/supabase';
import { createAnnouncementRepository } from '../repository/announcementRepository';
import type { Announcement } from '../../../shared/types/announcement.types';

export function useAnnouncement(profileId: string | null | undefined, isReadOnly = false) {
    const [activeAnnouncement, setActiveAnnouncement] = useState<Announcement | null>(null);

    useEffect(() => {
        if (isReadOnly || !profileId || !supabase) {
            setActiveAnnouncement(null);
            return;
        }

        let isMounted = true;
        const repo = createAnnouncementRepository(supabase);
        if (!repo) return;

        const loadAnnouncement = async () => {
            try {
                const announcements = await repo.fetchActiveAnnouncements(profileId);
                if (isMounted) {
                    const unread = announcements.find(
                        (a) => !a.seen_by_profile_ids?.includes(profileId)
                    );
                    setActiveAnnouncement(unread ?? null);
                }
            } catch (err) {
                console.error('Graceful Fallback: Failed to fetch announcements:', err);
            }
        };

        loadAnnouncement();

        return () => {
            isMounted = false;
        };
    }, [profileId, isReadOnly]);

    const dismiss = useCallback(async () => {
        if (!activeAnnouncement || !profileId) return;

        const annId = activeAnnouncement.id;
        setActiveAnnouncement(null);

        const repo = createAnnouncementRepository(supabase);
        if (!repo) return;

        try {
            await repo.markSeen(annId, profileId);
        } catch (err) {
            console.error('Failed to mark announcement as seen', err);
        }
    }, [activeAnnouncement, profileId]);

    return {
        activeAnnouncement,
        dismiss,
    };
}
