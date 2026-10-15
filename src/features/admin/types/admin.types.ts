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
    last_active_at?: string | null;
}

export type { Announcement } from '../../../shared/types/announcement.types';

export type TargetType = 'all' | 'single';
