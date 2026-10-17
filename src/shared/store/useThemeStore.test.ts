import { describe, it, expect, beforeEach } from 'vitest';
import { useThemeStore, getInitialTheme, getInitialHighContrast, applyTheme, applyHighContrast } from './useThemeStore';

describe('useThemeStore', () => {
    beforeEach(() => {
        localStorage.clear();
        document.documentElement.className = '';
        document.documentElement.removeAttribute('data-theme');
        // Reset the store state manually since Zustand keeps state between tests unless handled
        useThemeStore.setState({
            theme: 'indigo',
            isHighContrast: false,
        });
    });

    it('should initialize with default theme and no high contrast', () => {
        const state = useThemeStore.getState();
        expect(state.theme).toBe('indigo');
        expect(state.isHighContrast).toBe(false);
    });

    it('should set theme and update localStorage and document attribute', () => {
        const store = useThemeStore.getState();
        store.setTheme('obsidian');

        expect(useThemeStore.getState().theme).toBe('obsidian');
        expect(localStorage.getItem('theme-preference')).toBe('obsidian');
        expect(document.documentElement.getAttribute('data-theme')).toBe('obsidian');
    });

    it('should toggle high contrast, update localStorage and document class', () => {
        let store = useThemeStore.getState();
        
        // Turn on
        store.toggleHighContrast();
        expect(useThemeStore.getState().isHighContrast).toBe(true);
        expect(localStorage.getItem('high-contrast-preference')).toBe('true');
        expect(document.documentElement.classList.contains('high-contrast')).toBe(true);

        // Turn off
        store = useThemeStore.getState();
        store.toggleHighContrast();
        expect(useThemeStore.getState().isHighContrast).toBe(false);
        expect(localStorage.getItem('high-contrast-preference')).toBe('false');
        expect(document.documentElement.classList.contains('high-contrast')).toBe(false);
    });

    it('should correctly read valid saved theme and fall back for invalid values', () => {
        localStorage.setItem('theme-preference', 'forest');
        expect(getInitialTheme()).toBe('forest');

        localStorage.setItem('theme-preference', 'invalid-theme-value');
        expect(getInitialTheme()).toBe('indigo');

        localStorage.removeItem('theme-preference');
        expect(getInitialTheme()).toBe('indigo');
    });

    it('should correctly read saved high contrast preference', () => {
        localStorage.setItem('high-contrast-preference', 'true');
        expect(getInitialHighContrast()).toBe(true);

        localStorage.setItem('high-contrast-preference', 'false');
        expect(getInitialHighContrast()).toBe(false);
    });

    it('should sync documentElement attribute on applyTheme and applyHighContrast', () => {
        applyTheme('crimson');
        expect(document.documentElement.getAttribute('data-theme')).toBe('crimson');

        applyHighContrast(true);
        expect(document.documentElement.classList.contains('high-contrast')).toBe(true);

        applyHighContrast(false);
        expect(document.documentElement.classList.contains('high-contrast')).toBe(false);
    });

    it('should update DOM via store subscription when state is modified', () => {
        useThemeStore.setState({ theme: 'forest', isHighContrast: true });
        expect(document.documentElement.getAttribute('data-theme')).toBe('forest');
        expect(document.documentElement.classList.contains('high-contrast')).toBe(true);
    });
});
