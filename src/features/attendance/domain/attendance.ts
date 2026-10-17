/**
 * Core business rules for the attendance feature.
 *
 * No React, no I/O, no clocks, no randomness. Anything that needs "now" or a
 * fresh id receives it through `ChangeContext`, so every function here is
 * deterministic and cheap to test exhaustively.
 *
 * All goal maths uses exact integer arithmetic (`100 * attended >= goal * total`)
 * instead of floating-point percentages, so there is no rounding drift at the
 * boundary (e.g. 2999/4000 = 74.975% is *below* 75%, not "75.0%").
 */

import type { AttendanceCount, AttendanceLog } from './types';
import { sanitizeText } from './text';

// ─── Constants ───────────────────────────────────────────────────────────────

export const DEFAULT_GOAL_PERCENT = 75;
export const MIN_GOAL_PERCENT = 1;
export const MAX_GOAL_PERCENT = 100;

/** Past this many total classes, recovery is shown as "not realistic". */
export const RECOVERY_CAP_CLASSES = 400;

/** Newest-first audit trail length kept per profile. */
export const MAX_LOG_ENTRIES = 50;

export const DEFAULT_LOG_TITLE = 'Manual Edit';
export const SINGLE_CLASS_LOG_TITLE = 'Logged +1 class';

// ─── Goals ───────────────────────────────────────────────────────────────────

export function isValidGoal(goal: unknown): goal is number {
    return (
        typeof goal === 'number' &&
        Number.isInteger(goal) &&
        goal >= MIN_GOAL_PERCENT &&
        goal <= MAX_GOAL_PERCENT
    );
}

/** Returns a usable goal: the given one if valid, otherwise the default. */
export function normalizeGoal(goal: unknown): number {
    return isValidGoal(goal) ? goal : DEFAULT_GOAL_PERCENT;
}

// ─── Percentages ─────────────────────────────────────────────────────────────

/** Exact attendance percentage. 0 classes held reads as 0. Never rounded. */
export function attendancePercentage({ attended, total }: AttendanceCount): number {
    return total > 0 ? (attended / total) * 100 : 0;
}

/** Presentation helper: one decimal place, e.g. 74.975 -> 75. Never use for decisions. */
export function roundForDisplay(percentage: number): number {
    return Math.round(percentage * 10) / 10;
}

// ─── Goal evaluation ─────────────────────────────────────────────────────────

export type GoalStatus =
    | { state: 'no-data'; goal: number }
    | { state: 'safe'; goal: number; classesCanSkip: number }
    | { state: 'below'; goal: number; recoverable: true; classesNeeded: number }
    | {
          state: 'below';
          goal: number;
          /** Impossible or beyond `RECOVERY_CAP_CLASSES`: do not present it as a target. */
          recoverable: false;
          /** `null` when the goal can never be recovered (a 100% goal after a miss). */
          classesNeeded: number | null;
      };

/** floor(a / b) for integers a >= 0, b > 0, without float rounding. */
function floorDiv(a: number, b: number): number {
    return (a - (a % b)) / b;
}

/** Most classes that can still be missed while staying at or above `goal`. */
export function classesCanSkip({ attended, total }: AttendanceCount, goal: number): number {
    const slack = 100 * attended - goal * total;
    return slack < 0 ? 0 : floorDiv(slack, goal);
}

/**
 * Fewest consecutive classes that must be attended to reach `goal`.
 * Returns `null` if it can never be reached (goal 100 with any absence).
 */
export function classesNeeded({ attended, total }: AttendanceCount, goal: number): number | null {
    const deficit = goal * total - 100 * attended;
    if (deficit <= 0) return 0;
    if (goal >= MAX_GOAL_PERCENT) return null;
    const perClassGain = 100 - goal;
    return floorDiv(deficit + perClassGain - 1, perClassGain);
}

export function evaluateGoal(count: AttendanceCount, rawGoal: unknown = DEFAULT_GOAL_PERCENT): GoalStatus {
    const goal = normalizeGoal(rawGoal);

    if (count.total <= 0) return { state: 'no-data', goal };

    if (100 * count.attended >= goal * count.total) {
        return { state: 'safe', goal, classesCanSkip: classesCanSkip(count, goal) };
    }

    const needed = classesNeeded(count, goal);
    if (needed !== null && count.total + needed <= RECOVERY_CAP_CLASSES) {
        return { state: 'below', goal, recoverable: true, classesNeeded: needed };
    }
    return { state: 'below', goal, recoverable: false, classesNeeded: needed };
}

// ─── Recording changes ───────────────────────────────────────────────────────

export interface AttendanceInput {
    attended: number;
    total: number;
    title?: string;
}

/** Side-effect inputs injected by the caller so this module stays pure. */
export interface ChangeContext {
    now: number;
    newId: () => string;
}

export interface AttendanceState extends AttendanceCount {
    logs?: AttendanceLog[];
}

export type AttendanceChange =
    | { kind: 'unchanged' }
    | { kind: 'changed'; attended: number; total: number; logs: AttendanceLog[]; log: AttendanceLog };

function finiteOrZero(value: number): number {
    return Number.isFinite(value) ? value : 0;
}

/** Coerces arbitrary input into a valid count: 0 <= attended <= total. */
export function clampCount(attended: number, total: number): AttendanceCount {
    const safeTotal = Math.max(0, finiteOrZero(total));
    const safeAttended = Math.max(0, Math.min(finiteOrZero(attended), safeTotal));
    return { attended: safeAttended, total: safeTotal };
}

function deriveLogTitle(title: string | undefined, diff: AttendanceCount): string {
    if (title) return sanitizeText(title) || DEFAULT_LOG_TITLE;
    return diff.attended === 1 && diff.total === 1 ? SINGLE_CLASS_LOG_TITLE : DEFAULT_LOG_TITLE;
}

/** Computes the next attendance state and its audit-log entry, or `unchanged`. */
export function applyAttendanceChange(
    current: AttendanceState,
    input: AttendanceInput,
    ctx: ChangeContext,
): AttendanceChange {
    const next = clampCount(input.attended, input.total);
    const diff = {
        attended: next.attended - current.attended,
        total: next.total - current.total,
    };
    if (diff.attended === 0 && diff.total === 0) return { kind: 'unchanged' };

    const log: AttendanceLog = {
        id: ctx.newId(),
        timestamp: ctx.now,
        title: deriveLogTitle(input.title, diff),
        diffAttended: diff.attended,
        diffTotal: diff.total,
    };

    return {
        kind: 'changed',
        ...next,
        log,
        logs: [log, ...(current.logs ?? [])].slice(0, MAX_LOG_ENTRIES),
    };
}

/**
 * Undoes one audit-log entry. Returns `null` if the entry no longer exists.
 * The result always satisfies 0 <= attended <= total.
 */
export function revertLog(
    current: AttendanceState,
    logId: string,
): { attended: number; total: number; logs: AttendanceLog[] } | null {
    const logs = current.logs ?? [];
    const entry = logs.find((l) => l.id === logId);
    if (!entry) return null;

    const { attended, total } = clampCount(
        current.attended - entry.diffAttended,
        current.total - entry.diffTotal,
    );
    return { attended, total, logs: logs.filter((l) => l.id !== logId) };
}
