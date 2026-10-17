import { describe, it, expect, vi } from 'vitest';
import {
    DEFAULT_GOAL_PERCENT,
    MAX_LOG_ENTRIES,
    applyAttendanceChange,
    attendancePercentage,
    clampCount,
    classesCanSkip,
    classesNeeded,
    evaluateGoal,
    isValidGoal,
    normalizeGoal,
    revertLog,
    roundForDisplay,
} from './attendance';
import type { AttendanceLog } from './types';

/**
 * The goal maths is a small, bounded domain, so instead of sampling inputs we check
 * EVERY (goal, total, attended) combination in range against the definition:
 *   "meets goal"  <=>  100 * attended >= goal * total
 */
const MAX_TOTAL = 120;

function forEveryCase(check: (goal: number, attended: number, total: number) => string | null): string[] {
    const violations: string[] = [];
    for (let goal = 1; goal <= 100; goal++) {
        for (let total = 0; total <= MAX_TOTAL; total++) {
            for (let attended = 0; attended <= total; attended++) {
                const problem = check(goal, attended, total);
                if (problem) violations.push(`goal=${goal} attended=${attended} total=${total}: ${problem}`);
            }
        }
    }
    return violations;
}

const meets = (goal: number, attended: number, total: number) => 100 * attended >= goal * total;

describe('goal validation', () => {
    it('accepts whole percentages 1..100 only', () => {
        for (const ok of [1, 50, 75, 100]) expect(isValidGoal(ok)).toBe(true);
        for (const bad of [0, 101, -5, 82.5, NaN, Infinity, '75', null, undefined]) expect(isValidGoal(bad)).toBe(false);
    });

    it('defaults invalid goals to 75', () => {
        expect(normalizeGoal(undefined)).toBe(DEFAULT_GOAL_PERCENT);
        expect(normalizeGoal(85)).toBe(85);
        expect(normalizeGoal(150)).toBe(DEFAULT_GOAL_PERCENT);
    });
});

describe('classesCanSkip (exhaustive)', () => {
    it('is the exact maximum number of classes that can be missed without dropping below goal', () => {
        const violations = forEveryCase((goal, attended, total) => {
            const k = classesCanSkip({ attended, total }, goal);
            if (!meets(goal, attended, total)) return k === 0 ? null : `expected 0 when already below goal, got ${k}`;
            if (!meets(goal, attended, total + k)) return `k=${k} would drop below goal`;
            if (meets(goal, attended, total + k + 1)) return `k=${k} is not maximal`;
            return null;
        });
        expect(violations).toEqual([]);
    });
});

describe('classesNeeded (exhaustive)', () => {
    it('is the exact minimum number of consecutive classes needed to reach the goal', () => {
        const violations = forEveryCase((goal, attended, total) => {
            const x = classesNeeded({ attended, total }, goal);
            if (x === null) return goal === 100 && attended < total ? null : 'null is only valid for a missed 100% goal';
            if (!meets(goal, attended + x, total + x)) return `x=${x} does not reach the goal`;
            if (x > 0 && meets(goal, attended + x - 1, total + x - 1)) return `x=${x} is not minimal`;
            if ((x === 0) !== meets(goal, attended, total)) return 'x is 0 iff the goal is already met';
            return null;
        });
        expect(violations).toEqual([]);
    });
});

describe('evaluateGoal', () => {
    it('reports no-data when no classes were held (instead of a fake "danger")', () => {
        expect(evaluateGoal({ attended: 0, total: 0 }, 75)).toEqual({ state: 'no-data', goal: 75 });
    });

    it('classifies every case consistently with the definition (exhaustive)', () => {
        const violations = forEveryCase((goal, attended, total) => {
            const status = evaluateGoal({ attended, total }, goal);
            if (total === 0) return status.state === 'no-data' ? null : `expected no-data, got ${status.state}`;
            const expected = meets(goal, attended, total) ? 'safe' : 'below';
            return status.state === expected ? null : `expected ${expected}, got ${status.state}`;
        });
        expect(violations).toEqual([]);
    });

    it('uses exact arithmetic at the boundary: 2999/4000 (74.975%) is BELOW 75%', () => {
        const count = { attended: 2999, total: 4000 };
        // The display value rounds up to 75.0 ...
        expect(roundForDisplay(attendancePercentage(count))).toBe(75);
        // ... but the decision must not use it.
        expect(evaluateGoal(count, 75)).toMatchObject({ state: 'below', classesNeeded: 4 });
        expect(evaluateGoal({ attended: 3003, total: 4004 }, 75).state).toBe('safe');
    });

    it('handles a 100% goal without dividing by zero', () => {
        expect(evaluateGoal({ attended: 10, total: 10 }, 100)).toEqual({ state: 'safe', goal: 100, classesCanSkip: 0 });
        expect(evaluateGoal({ attended: 9, total: 10 }, 100)).toEqual({
            state: 'below',
            goal: 100,
            classesNeeded: null,
            recoverable: false,
        });
    });

    it('marks recovery as unrealistic beyond the class cap', () => {
        expect(evaluateGoal({ attended: 0, total: 10 }, 75)).toMatchObject({ classesNeeded: 30, recoverable: true });
        expect(evaluateGoal({ attended: 0, total: 400 }, 75)).toMatchObject({ classesNeeded: 1200, recoverable: false });
        expect(evaluateGoal({ attended: 299, total: 400 }, 75)).toMatchObject({ classesNeeded: 4, recoverable: true });
        expect(evaluateGoal({ attended: 370, total: 500 }, 75)).toMatchObject({ classesNeeded: 20, recoverable: true });
    });

    it('defaults to 75% and repairs invalid goals', () => {
        expect(evaluateGoal({ attended: 3, total: 4 }).goal).toBe(75);
        expect(evaluateGoal({ attended: 3, total: 4 }, 'nonsense').goal).toBe(75);
    });
});

describe('clampCount', () => {
    it.each([
        [{ a: NaN, t: NaN }, { attended: 0, total: 0 }],
        [{ a: Infinity, t: 10 }, { attended: 0, total: 10 }],
        [{ a: -3, t: -1 }, { attended: 0, total: 0 }],
        [{ a: 12, t: 10 }, { attended: 10, total: 10 }],
        [{ a: 4, t: 10 }, { attended: 4, total: 10 }],
    ])('%j -> %j', ({ a, t }, expected) => {
        expect(clampCount(a, t)).toEqual(expected);
    });
});

describe('applyAttendanceChange', () => {
    const ctx = () => ({ now: 1_700_000_000_000, newId: vi.fn(() => 'log-1') });

    it('returns unchanged (and consumes no id) when nothing differs', () => {
        const c = ctx();
        expect(applyAttendanceChange({ attended: 3, total: 5 }, { attended: 3, total: 5 }, c)).toEqual({ kind: 'unchanged' });
        expect(c.newId).not.toHaveBeenCalled();
    });

    it('records the diff, timestamp and id supplied by the caller (deterministic)', () => {
        const result = applyAttendanceChange({ attended: 3, total: 5 }, { attended: 4, total: 7 }, ctx());
        expect(result).toEqual({
            kind: 'changed',
            attended: 4,
            total: 7,
            log: { id: 'log-1', timestamp: 1_700_000_000_000, title: 'Manual Edit', diffAttended: 1, diffTotal: 2 },
            logs: [{ id: 'log-1', timestamp: 1_700_000_000_000, title: 'Manual Edit', diffAttended: 1, diffTotal: 2 }],
        });
    });

    it('titles a single attended class "Logged +1 class"', () => {
        const result = applyAttendanceChange({ attended: 5, total: 5 }, { attended: 6, total: 6 }, ctx());
        expect(result.kind === 'changed' && result.log.title).toBe('Logged +1 class');
    });

    it('sanitises custom titles and never stores an empty one', () => {
        const base = { attended: 0, total: 0 };
        const t = (title: string) => {
            const r = applyAttendanceChange(base, { attended: 1, total: 1, title }, ctx());
            return r.kind === 'changed' ? r.log.title : null;
        };
        expect(t('<b>Maths</b>')).toBe('bMaths/b');
        expect(t('<>')).toBe('Manual Edit');
    });

    it(`keeps only the newest ${MAX_LOG_ENTRIES} log entries`, () => {
        const existing: AttendanceLog[] = Array.from({ length: MAX_LOG_ENTRIES }, (_, i) => ({
            id: `old-${i}`, timestamp: i, title: 't', diffAttended: 0, diffTotal: 1,
        }));
        const result = applyAttendanceChange({ attended: 0, total: 50, logs: existing }, { attended: 1, total: 51 }, ctx());
        expect(result.kind === 'changed' && result.logs).toHaveLength(MAX_LOG_ENTRIES);
        expect(result.kind === 'changed' && result.logs[0].id).toBe('log-1');
        expect(result.kind === 'changed' && result.logs.at(-1)?.id).toBe('old-48');
    });

    it('clamps out-of-range input before diffing', () => {
        const result = applyAttendanceChange({ attended: 2, total: 4 }, { attended: 99, total: 6 }, ctx());
        expect(result).toMatchObject({ kind: 'changed', attended: 6, total: 6 });
    });
});

describe('revertLog', () => {
    const log = (id: string, diffAttended: number, diffTotal: number): AttendanceLog => ({
        id, timestamp: 0, title: 't', diffAttended, diffTotal,
    });

    it('returns null for an unknown entry or missing history', () => {
        expect(revertLog({ attended: 1, total: 1 }, 'nope')).toBeNull();
        expect(revertLog({ attended: 1, total: 1, logs: [log('a', 1, 1)] }, 'nope')).toBeNull();
    });

    it('undoes the entry and removes it from the history', () => {
        const current = { attended: 4, total: 6, logs: [log('a', 1, 1), log('b', 0, 1)] };
        expect(revertLog(current, 'a')).toEqual({ attended: 3, total: 5, logs: [log('b', 0, 1)] });
    });

    it('never leaves attended greater than total (older entries may already be evicted)', () => {
        // Reverting a "+3 classes held, 0 attended" entry would give 5 attended of 2 total without the clamp.
        const current = { attended: 5, total: 5, logs: [log('x', 0, 3)] };
        expect(revertLog(current, 'x')).toMatchObject({ attended: 2, total: 2 });
    });

    it('never goes negative', () => {
        const current = { attended: 1, total: 1, logs: [log('x', 5, 5)] };
        expect(revertLog(current, 'x')).toMatchObject({ attended: 0, total: 0 });
    });
});
