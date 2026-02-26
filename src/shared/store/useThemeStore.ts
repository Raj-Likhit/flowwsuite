import { create } from 'zustand';

export type Theme = 'indigo' | 'obsidian' | 'crimson' | 'forest';

interface ThemeState {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    isHighContrast: boolean;
    toggleHighContrast: () => void;
}

const getInitialTheme = (): Theme => {
    const saved = localStorage.getItem('theme-preference') as Theme;
    return saved || 'indigo';
};

export const useThemeStore = create<ThemeState>((set) => {
    // Initialize high contrast state from storage and apply initially
    const initHighContrast = localStorage.getItem('high-contrast-preference') === 'true';
    if (initHighContrast) {
        document.documentElement.classList.add('high-contrast');
    }

    return {
        theme: getInitialTheme(),
        setTheme: (theme) => {
            localStorage.setItem('theme-preference', theme);
            set({ theme });
            document.documentElement.setAttribute('data-theme', theme);
        },
        isHighContrast: initHighContrast,
        toggleHighContrast: () => set((state) => {
            const nextState = !state.isHighContrast;
            localStorage.setItem('high-contrast-preference', String(nextState));
            if (nextState) {
                document.documentElement.classList.add('high-contrast');
            } else {
                document.documentElement.classList.remove('high-contrast');
            }
            return { isHighContrast: nextState };
        })
    };
});
