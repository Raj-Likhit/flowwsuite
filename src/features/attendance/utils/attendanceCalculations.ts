import {
    evaluateGoal,
    attendancePercentage,
    roundForDisplay,
    RECOVERY_CAP_CLASSES,
} from '../domain/attendance';

export interface AttendanceMetrics {
    targetGoal: number;
    targetFraction: number;
    percentage: number;
    isSafe: boolean;
    safeToSkip: number;
    classesNeeded: number;
    recoveryImpossible: boolean;
    recoveryMessage?: string;
    progressToGoal: number;
}

export const RECOVERY_CAP = RECOVERY_CAP_CLASSES;

/**
 * Calculates attendance status, margin for skipped classes, and classes needed
 * for recovery using exact integer domain arithmetic.
 */
export function calculateAttendanceMetrics(
    attendedCount: number,
    totalCount: number,
    targetGoal = 75
): AttendanceMetrics {
    const safeAttended = Math.max(0, Number.isFinite(attendedCount) ? attendedCount : 0);
    const safeTotal = Math.max(0, Number.isFinite(totalCount) ? totalCount : 0);
    const clampedGoal = Math.min(100, Math.max(1, Math.round(Number.isFinite(targetGoal) ? targetGoal : 75)));
    const targetFraction = clampedGoal / 100;

    const count = { attended: safeAttended, total: safeTotal };
    const status = evaluateGoal(count, clampedGoal);

    const isSafe = safeTotal === 0 || status.state === 'safe';
    let safeToSkip = 0;
    let classesNeeded = 0;
    let recoveryImpossible = false;
    let recoveryMessage: string | undefined;

    if (status.state === 'safe') {
        safeToSkip = status.classesCanSkip;
    } else if (status.state === 'below') {
        classesNeeded = status.classesNeeded ?? 0;
        recoveryImpossible = !status.recoverable;
        if (!status.recoverable) {
            recoveryMessage = status.classesNeeded === null
                ? 'Cannot reach 100% after missing a class'
                : `Not realistic — would need ${status.classesNeeded} more classes`;
        }
    }

    const percentage = roundForDisplay(attendancePercentage(count));
    const currentPercentage = safeTotal === 0 ? 100 : (safeAttended / safeTotal) * 100;
    const progressToGoal = clampedGoal > 0 ? Math.min(1, currentPercentage / clampedGoal) : 0;

    return {
        targetGoal: clampedGoal,
        targetFraction,
        percentage,
        isSafe,
        safeToSkip,
        classesNeeded,
        recoveryImpossible,
        recoveryMessage,
        progressToGoal,
    };
}
