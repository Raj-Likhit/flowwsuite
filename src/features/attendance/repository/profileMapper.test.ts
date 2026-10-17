import { describe, it, expect } from 'vitest';
import { toProfile, toSyncableState, type ProfileRow } from './profileMapper';

const row: ProfileRow = { id: 'p1', name: 'Alice', attended: 3, total: 4 };

describe('toProfile', () => {
    it('maps target_goal to targetGoal and drops the snake_case key', () => {
        const profile = toProfile({ ...row, target_goal: 80 });
        expect(profile.targetGoal).toBe(80);
        expect(profile).not.toHaveProperty('target_goal');
    });

    it('ignores an invalid stored goal instead of propagating it', () => {
        for (const bad of [0, 101, 82.5, null]) {
            expect(toProfile({ ...row, target_goal: bad })).not.toHaveProperty('targetGoal');
        }
    });

    it('turns NULL columns into absent properties', () => {
        const profile = toProfile({ ...row, avatar_url: null, notes: null, logs: null, is_suspended: null, password: null });
        expect(Object.keys(profile).sort()).toEqual(['attended', 'id', 'name', 'total']);
    });

    it('keeps real values and drops columns the domain does not know', () => {
        const profile = toProfile({
            ...row,
            avatar_url: 'https://x/y.png',
            notes: 'hi',
            is_suspended: false,
            is_flagged: true,
            created_at: '2026-01-01T00:00:00Z',
        });
        expect(profile).toMatchObject({ avatar_url: 'https://x/y.png', notes: 'hi', is_suspended: false });
        expect(profile).not.toHaveProperty('is_flagged');
    });
});

describe('toSyncableState', () => {
    it('maps a full row', () => {
        const logs = [{ id: 'l', timestamp: 1, title: 't', diffAttended: 1, diffTotal: 1 }];
        expect(toSyncableState({ attended: 1, total: 2, target_goal: 90, logs, notes: 'n' })).toEqual({
            attended: 1, total: 2, targetGoal: 90, logs, notes: 'n',
        });
    });

    it('does not report NULL columns as values (prevents a perpetual "changes detected" on every sync)', () => {
        expect(toSyncableState({ attended: 1, total: 2, target_goal: null, logs: null, notes: null })).toEqual({
            attended: 1, total: 2,
        });
    });
});
