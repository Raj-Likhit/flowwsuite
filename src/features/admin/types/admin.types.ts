export interface AdminStats {
    totalUsers: number;
    pendingPFPs: number;
}

export interface AdminProfile {
    id: string;
    name: string;
    avatar_url: string | null;
    is_flagged?: boolean;
    is_suspended?: boolean;
    attended?: number;
    total?: number;
    created_at?: string;
}

export interface Announcement {
    id: string;
    content: string;
    is_active: boolean;
    target_profile_ids: string[] | null;
    expires_at?: string | null;
    created_at?: string;
}

export type TargetType = 'all' | 'single';
