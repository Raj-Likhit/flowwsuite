export interface Announcement {
    id: string;
    content: string;
    is_active?: boolean;
    target_profile_ids?: string[] | null;
    expires_at?: string | null;
    created_at?: string;
    seen_by_profile_ids?: string[] | null;
}
