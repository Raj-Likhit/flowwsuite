import { describe, it, expect } from 'vitest';
import { planSync, sameLogs, type SyncInput } from './sync';
import type { AttendanceLog } from './types';

const log = (id: string): AttendanceLog => ({ id, timestamp: 0, title: 't', diffAttended: 1, diffTotal: 1 });

const base = { attended: 5, total: 8 };

function input(overrides: Partial<SyncInput> & { local?: SyncInput['local'] } = {}): SyncInput {
    return {
        local: { ...base, updated_at: 1_000 },
        cloud: { ...base },
        lastSyncedAt: 2_000,
        force: false,
        ...overrides,
    };
}

describe('sameLogs', () => {
    it('treats a missing list and an empty list as equal', () => {
        expect(sameLogs(undefined, [])).toBe(true);
        expect(sameLogs([], undefined)).toBe(true);
    });

    it('compares by id sequence', () => {
        expect(sameLogs([log('a'), log('b')], [log('a'), log('b')])).toBe(true);
        expect(sameLogs([log('a'), log('b')], [log('b'), log('a')])).toBe(false);
        expect(sameLogs([log('a')], [log('a'), log('b')])).toBe(false);
    });
});

describe('planSync', () => {
    it('is in-sync when nothing differs', () => {
        expect(planSync(input())).toEqual({ kind: 'in-sync' });
    });

    it('is in-sync when there is no local profile to reconcile', () => {
        expect(planSync(input({ local: null }))).toEqual({ kind: 'in-sync' });
    });

    it('pulls cloud values when they differ and local has no unsynced edits', () => {
        const decision = planSync(input({ cloud: { attended: 6, total: 9 } }));
        expect(decision).toEqual({ kind: 'pull', patch: { attended: 6, total: 9 } });
    });

    it('only overwrites optional fields the cloud actually provided', () => {
        const decision = planSync(
            input({
                local: { ...base, targetGoal: 80, notes: 'mine', updated_at: 1_000 },
                cloud: { attended: 6, total: 9 },
            }),
        );
        expect(decision).toEqual({ kind: 'pull', patch: { attended: 6, total: 9 } });
    });

    it.each([
        ['targetGoal', { ...base, targetGoal: 80 }],
        ['notes', { ...base, notes: 'cloud note' }],
        ['logs', { ...base, logs: [log('a')] }],
    ])('detects a difference in %s', (_field, cloud) => {
        expect(planSync(input({ cloud })).kind).toBe('pull');
    });

    it('reports a conflict when local edits are newer than the last sync and cloud differs', () => {
        const decision = planSync(
            input({ local: { ...base, updated_at: 3_000 }, cloud: { attended: 6, total: 9 } }),
        );
        expect(decision).toEqual({ kind: 'conflict' });
    });

    it('lets the caller force the cloud copy over unsynced local edits', () => {
        const decision = planSync(
            input({ local: { ...base, updated_at: 3_000 }, cloud: { attended: 6, total: 9 }, force: true }),
        );
        expect(decision.kind).toBe('pull');
    });

    it('does not flag a conflict when local edits exist but the cloud already matches', () => {
        expect(planSync(input({ local: { ...base, updated_at: 3_000 } }))).toEqual({ kind: 'in-sync' });
    });

    it('never conflicts before the first sync (no baseline to compare against)', () => {
        const decision = planSync(
            input({ local: { ...base, updated_at: 3_000 }, cloud: { attended: 6, total: 9 }, lastSyncedAt: null }),
        );
        expect(decision.kind).toBe('pull');
    });
});
