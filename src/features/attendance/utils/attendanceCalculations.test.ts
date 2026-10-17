import { describe, it, expect } from 'vitest';
import { calculateAttendanceMetrics } from './attendanceCalculations';

describe('calculateAttendanceMetrics', () => {
    it('handles fresh profile with 0 total classes as safe', () => {
        const metrics = calculateAttendanceMetrics(0, 0, 75);
        expect(metrics.isSafe).toBe(true);
        expect(metrics.safeToSkip).toBe(0);
        expect(metrics.classesNeeded).toBe(0);
        expect(metrics.recoveryImpossible).toBe(false);
    });

    it('calculates 75% default goal accurately', () => {
        // 15 attended out of 20 total = 75% -> safe
        const metrics = calculateAttendanceMetrics(15, 20, 75);
        expect(metrics.isSafe).toBe(true);
        expect(metrics.safeToSkip).toBe(0);

        // 16 attended out of 20 total = 80% -> can skip 1 class (16 / 21 = 76.19%)
        const safeMetrics = calculateAttendanceMetrics(16, 20, 75);
        expect(safeMetrics.isSafe).toBe(true);
        expect(safeMetrics.safeToSkip).toBe(1);

        // 14 attended out of 20 total = 70% -> needs classes
        const dangerMetrics = calculateAttendanceMetrics(14, 20, 75);
        expect(dangerMetrics.isSafe).toBe(false);
        expect(dangerMetrics.classesNeeded).toBeGreaterThan(0);
        expect(dangerMetrics.recoveryImpossible).toBe(false);
    });

    it('handles 100% target goal without Infinity or NaN when attended < total', () => {
        // 9 attended out of 10 total -> missed 1 class -> 100% is impossible
        const metrics = calculateAttendanceMetrics(9, 10, 100);

        expect(metrics.isSafe).toBe(false);
        expect(metrics.safeToSkip).toBe(0);
        expect(metrics.classesNeeded).toBe(0);
        expect(Number.isFinite(metrics.classesNeeded)).toBe(true);
        expect(isNaN(metrics.classesNeeded)).toBe(false);
        expect(metrics.recoveryImpossible).toBe(true);
        expect(metrics.recoveryMessage).toBe('Cannot reach 100% after missing a class');
    });

    it('handles 100% target goal when all classes were attended', () => {
        const metrics = calculateAttendanceMetrics(10, 10, 100);

        expect(metrics.isSafe).toBe(true);
        expect(metrics.safeToSkip).toBe(0);
        expect(metrics.classesNeeded).toBe(0);
        expect(metrics.recoveryImpossible).toBe(false);
    });

    it('flags recovery as impossible when classes needed exceed RECOVERY_CAP', () => {
        // 1 attended out of 200 total with 90% goal
        const metrics = calculateAttendanceMetrics(1, 200, 90);

        expect(metrics.isSafe).toBe(false);
        expect(metrics.recoveryImpossible).toBe(true);
        expect(metrics.recoveryMessage).toMatch(/Not realistic/);
    });
});
