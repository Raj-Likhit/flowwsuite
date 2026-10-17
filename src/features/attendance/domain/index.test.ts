import { describe, it, expect } from 'vitest';
import * as domain from './index';

describe('attendance domain index', () => {
    it('exports all domain functions and utilities', () => {
        expect(domain.evaluateGoal).toBeDefined();
        expect(domain.classesCanSkip).toBeDefined();
        expect(domain.classesNeeded).toBeDefined();
        expect(domain.attendancePercentage).toBeDefined();
        expect(domain.sanitizeText).toBeDefined();
        expect(domain.MAX_TEXT_LENGTH).toBe(100);
        expect(domain.planSync).toBeDefined();
        expect(domain.DEFAULT_GOAL_PERCENT).toBe(75);
    });
});
