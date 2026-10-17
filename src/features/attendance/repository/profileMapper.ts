/**
 * Translates between database rows (snake_case, nullable columns) and domain
 * objects (camelCase, optional-instead-of-null). Every read from Supabase goes
 * through here, so the rest of the app never sees a raw row and a column rename
 * is a one-file change.
 */

import type { AttendanceLog, Profile, SyncableState } from '../domain/types';
import { isValidGoal } from '../domain/attendance';

/** A row of the `profiles` table as returned by PostgREST. */
export interface ProfileRow {
    id: string;
    name: string;
    attended: number;
    total: number;
    avatar_url?: string | null;
    password?: string | null;
    created_at?: string | null;
    is_suspended?: boolean | null;
    is_flagged?: boolean | null;
    target_goal?: number | null;
    logs?: AttendanceLog[] | null;
    notes?: string | null;
    last_active_at?: string | null;
}

/** The columns cloud sync reads. */
export type SyncRow = Pick<ProfileRow, 'attended' | 'total' | 'target_goal' | 'logs' | 'notes'> & {
    last_active_at?: string | null;
};

/** Builds an object containing `key` only when `value` is present (not null/undefined). */
function optional<K extends string, V>(key: K, value: V | null | undefined): { [P in K]?: V } {
    return (value === null || value === undefined ? {} : { [key]: value }) as { [P in K]?: V };
}

export function toProfile(row: ProfileRow): Profile {
    return {
        id: row.id,
        name: row.name,
        attended: row.attended,
        total: row.total,
        ...optional('avatar_url', row.avatar_url),
        ...optional('password', row.password),
        ...optional('created_at', row.created_at),
        ...optional('is_suspended', row.is_suspended),
        ...optional('logs', row.logs),
        ...optional('notes', row.notes),
        ...optional('last_active_at', row.last_active_at),
        ...(isValidGoal(row.target_goal) ? { targetGoal: row.target_goal } : {}),
    };
}

export function toSyncableState(row: SyncRow): SyncableState & { last_active_at?: string } {
    return {
        attended: row.attended,
        total: row.total,
        ...(isValidGoal(row.target_goal) ? { targetGoal: row.target_goal } : {}),
        ...optional('logs', row.logs),
        ...optional('notes', row.notes),
        ...optional('last_active_at', row.last_active_at),
    };
}
