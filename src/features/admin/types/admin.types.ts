export interface AdminStats {
    totalUsers: number;
    pendingPFPs: number;
}

export interface AdminProfile {
    id: string;
    name: string;
    avatar_url: string | null;
    created_at?: string;
}

export interface Announcement {
    id: string;
    content: string;
    is_active: boolean;
    target_profile_ids: string[] | null;
    created_at?: string;
}

export type TargetType = 'all' | 'single';
