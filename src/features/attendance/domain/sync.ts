/**
 * Decides what to do when local and cloud copies of a profile meet.
 *
 * Pure: it only reads its arguments, so every branch can be covered by a
 * table-driven test. The caller (store / service) performs the resulting I/O.
 */

import type { AttendanceLog, SyncableState } from './types';

export interface SyncInput {
    /** Active local profile, or null when nothing is selected. */
    local: (SyncableState & { updated_at?: number }) | null;
    cloud: SyncableState;
    /** When local and cloud last agreed (epoch ms). */
    lastSyncedAt: number | null;
    /** Caller chose "overwrite my local changes". */
    force: boolean;
}

export type SyncDecision =
    | { kind: 'in-sync' }
    | { kind: 'conflict' }
    | { kind: 'pull'; patch: SyncableState };

/**
 * Log entries are immutable and carry unique ids, so two histories are equal
 * when their id sequences match. A missing list is the same as an empty one.
 */
export function sameLogs(a: AttendanceLog[] | undefined, b: AttendanceLog[] | undefined): boolean {
    const left = a ?? [];
    const right = b ?? [];
    return left.length === right.length && left.every((log, i) => log.id === right[i].id);
}

function differs(local: SyncableState, cloud: SyncableState): boolean {
    return (
        local.attended !== cloud.attended ||
        local.total !== cloud.total ||
        (cloud.targetGoal !== undefined && local.targetGoal !== cloud.targetGoal) ||
        (cloud.logs !== undefined && !sameLogs(local.logs, cloud.logs)) ||
        (cloud.notes !== undefined && local.notes !== cloud.notes)
    );
}

function hasUnsyncedLocalEdits(local: { updated_at?: number }, lastSyncedAt: number | null): boolean {
    return Boolean(local.updated_at && (!lastSyncedAt || local.updated_at > lastSyncedAt));
}

/** Only fields the cloud actually provided overwrite local values. */
function toPatch(cloud: SyncableState): SyncableState {
    return {
        attended: cloud.attended,
        total: cloud.total,
        ...(cloud.targetGoal !== undefined && { targetGoal: cloud.targetGoal }),
        ...(cloud.logs !== undefined && { logs: cloud.logs }),
        ...(cloud.notes !== undefined && { notes: cloud.notes }),
    };
}

export function planSync({ local, cloud, lastSyncedAt, force }: SyncInput): SyncDecision {
    if (!local || !differs(local, cloud)) return { kind: 'in-sync' };
    if (!force && hasUnsyncedLocalEdits(local, lastSyncedAt)) return { kind: 'conflict' };
    return { kind: 'pull', patch: toPatch(cloud) };
}
