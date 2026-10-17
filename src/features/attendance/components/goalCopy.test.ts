import { describe, it, expect } from 'vitest';
import { evaluateGoal } from '../domain/attendance';
import { recoveryDisplay } from './goalCopy';

const caption = 'classes to reach 75%';

describe('recoveryDisplay', () => {
    it('shows the number when recovery is realistic', () => {
        expect(recoveryDisplay(evaluateGoal({ attended: 5, total: 10 }, 75), caption)).toEqual({ value: 10, caption });
    });

    it('shows a dash and a prompt when there is no data or the goal is already met', () => {
        expect(recoveryDisplay(evaluateGoal({ attended: 0, total: 0 }, 75), caption).value).toBe('\u2014');
        expect(recoveryDisplay(evaluateGoal({ attended: 9, total: 10 }, 75), caption).value).toBe('\u2014');
    });

    it('explains an unrealistic recovery with the number of classes it would take', () => {
        const result = recoveryDisplay(evaluateGoal({ attended: 0, total: 400 }, 75), caption);
        expect(result).toEqual({ value: '\u2014', caption: 'Not realistic \u2014 would need 1200 more classes' });
    });

    it('explains an impossible recovery (100% goal after a miss)', () => {
        const result = recoveryDisplay(evaluateGoal({ attended: 9, total: 10 }, 100), caption);
        expect(result).toEqual({ value: '\u2014', caption: 'Not possible \u2014 a 100% goal allows no missed classes' });
    });
});
