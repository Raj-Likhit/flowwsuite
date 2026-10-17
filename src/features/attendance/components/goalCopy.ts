import type { GoalStatus } from '../domain/attendance';

export interface RecoveryDisplay {
    /** The big number: classes needed, or an em dash when it should not be presented as a target. */
    value: number | '\u2014';
    caption: string;
}

/**
 * What to show in a "Recovery" card. Keeps the three-way decision
 * (no data / recoverable / not realistic or impossible) out of the JSX.
 *
 * @param recoverableCaption wording for the normal case, e.g. "classes to reach 80%"
 */
export function recoveryDisplay(status: GoalStatus, recoverableCaption: string): RecoveryDisplay {
    if (status.state !== 'below') return { value: '\u2014', caption: 'log a class to begin' };
    if (status.recoverable) return { value: status.classesNeeded, caption: recoverableCaption };
    return {
        value: '\u2014',
        caption:
            status.classesNeeded === null
                ? `Not possible \u2014 a ${status.goal}% goal allows no missed classes`
                : `Not realistic \u2014 would need ${status.classesNeeded} more classes`,
    };
}
