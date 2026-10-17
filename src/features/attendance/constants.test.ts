import { describe, it, expect } from 'vitest';
import { AVATARS, getDicebearAvatar } from './constants';

describe('AVATARS presets and Dicebear Bottts avatars', () => {
    it('contains 16 preset Bottts avatars', () => {
        expect(AVATARS).toHaveLength(16);
    });

    it('each preset avatar points to api.dicebear.com/7.x/bottts-neutral/svg with seed and backgroundColor', () => {
        AVATARS.forEach((avatar) => {
            expect(avatar).toMatch(/^https:\/\/api\.dicebear\.com\/7\.x\/bottts-neutral\/svg\?seed=[A-Za-z]+&backgroundColor=[a-f0-9]{6}$/);
        });
    });

    it('getDicebearAvatar generates valid Bottts URL for any profile name', () => {
        expect(getDicebearAvatar('Alice')).toBe('https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Alice');
        expect(getDicebearAvatar('Bob Smith')).toBe('https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Bob%20Smith');
        expect(getDicebearAvatar('')).toBe('https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Student');
    });
});
