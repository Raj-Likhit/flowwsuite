import { create } from 'zustand';

export type Theme = 'indigo' | 'obsidian' | 'crimson' | 'forest';

export const VALID_THEMES: readonly Theme[] = ['indigo', 'obsidian', 'crimson', 'forest'];

export const applyTheme = (theme: Theme): void => {
    if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', theme);
    }
};

export const applyHighContrast = (enabled: boolean): void => {
    if (typeof document !== 'undefined') {
        if (enabled) {
            document.documentElement.classList.add('high-contrast');
        } else {
            document.documentElement.classList.remove('high-contrast');
        }
    }
};

export const getInitialTheme = (): Theme => {
    if (typeof window === 'undefined') return 'indigo';
    try {
        const saved = localStorage.getItem('theme-preference') as Theme;
        if (VALID_THEMES.includes(saved)) {
            return saved;
        }
    } catch {
        // Fall back to default if localStorage access fails
    }
    return 'indigo';
};

export const getInitialHighContrast = (): boolean => {
    if (typeof window === 'undefined') return false;
    try {
        return localStorage.getItem('high-contrast-preference') === 'true';
    } catch {
        return false;
    }
};

interface ThemeState {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    isHighContrast: boolean;
    toggleHighContrast: () => void;
}

export const useThemeStore = create<ThemeState>((set) => {
    const initTheme = getInitialTheme();
    const initHighContrast = getInitialHighContrast();

    // Immediately apply initial theme and high-contrast to DOM on store creation
    applyTheme(initTheme);
    applyHighContrast(initHighContrast);

    return {
        theme: initTheme,
        setTheme: (theme) => {
            try {
                localStorage.setItem('theme-preference', theme);
            } catch {
                // Ignore storage write failure
            }
            applyTheme(theme);
            set({ theme });
        },
        isHighContrast: initHighContrast,
        toggleHighContrast: () => set((state) => {
            const nextState = !state.isHighContrast;
            try {
                localStorage.setItem('high-contrast-preference', String(nextState));
            } catch {
                // Ignore storage write failure
            }
            applyHighContrast(nextState);
            return { isHighContrast: nextState };
        })
    };
});

// Subscribe to state changes to ensure DOM remains synchronized
if (typeof window !== 'undefined') {
    useThemeStore.subscribe((state) => {
        applyTheme(state.theme);
        applyHighContrast(state.isHighContrast);
    });
}
