import type { SupabaseClient } from '@supabase/supabase-js';
import type { Announcement } from '../../../shared/types/announcement.types';

export class AnnouncementRepository {
    private readonly db: SupabaseClient;

    constructor(db: SupabaseClient) {
        this.db = db;
    }

    /**
     * Fetches active announcements eligible for the given profile and not yet expired.
     */
    async fetchActiveAnnouncements(profileId: string): Promise<Announcement[]> {
        const { data, error } = await this.db
            .from('announcements')
            .select('id, content, target_profile_ids, created_at, seen_by_profile_ids')
            .eq('is_active', true)
            .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
            .or(`target_profile_ids.is.null,target_profile_ids.cs.{${profileId}}`)
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) throw error;
        return (data ?? []) as Announcement[];
    }

    /**
     * Marks an announcement as seen for a specific profile via RPC.
     */
    async markSeen(announcementId: string, profileId: string): Promise<void> {
        const { error } = await this.db.rpc('mark_announcement_seen', {
            announcement_id: announcementId,
            p_id: profileId,
        });
        if (error) throw error;
    }
}

export function createAnnouncementRepository(
    db: SupabaseClient | null
): AnnouncementRepository | null {
    if (!db) return null;
    return new AnnouncementRepository(db);
}
