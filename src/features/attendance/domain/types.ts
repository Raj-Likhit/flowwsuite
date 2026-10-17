/**
 * Domain types for the attendance feature.
 *
 * This file is dependency-free on purpose: the domain layer must not import
 * React, Zustand, Supabase or anything from `shared/` or `core/`
 * (enforced by ESLint, see eslint.config.js).
 */

export interface AttendanceLog {
    id: string;
    timestamp: number;
    title: string;
    diffAttended: number;
    diffTotal: number;
}

export interface Profile {
    id: string;
    name: string;
    attended: number;
    total: number;
    avatar_url?: string;
    created_at?: string;
    updated_at?: number;
    is_suspended?: boolean;
    logs?: AttendanceLog[];
    targetGoal?: number;
    notes?: string;
    last_active_at?: string;
}

/** The two numbers every attendance rule is derived from. */
export interface AttendanceCount {
    attended: number;
    total: number;
}

/** The part of a profile that cloud sync reads and writes. */
export interface SyncableState extends AttendanceCount {
    targetGoal?: number;
    logs?: AttendanceLog[];
    notes?: string;
}
