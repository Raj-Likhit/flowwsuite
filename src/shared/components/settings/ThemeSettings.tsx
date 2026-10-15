import React from 'react';
import { Palette } from 'lucide-react';
import type { Theme } from '../../store/useThemeStore';

interface ThemeOption {
    id: Theme;
    name: string;
    color: string;
}

const THEMES: readonly ThemeOption[] = [
    { id: 'indigo', name: 'Indigo Dream', color: '#6366f1' },
    { id: 'obsidian', name: 'Cyberverse', color: '#06b6d4' },
    { id: 'crimson', name: 'Solar Flare', color: '#f59e0b' },
    { id: 'forest', name: 'Ethereal Nature', color: '#10b981' }
];

interface ThemeSettingsProps {
    currentTheme: Theme;
    setTheme: (theme: Theme) => void;
}

export const ThemeSettings: React.FC<ThemeSettingsProps> = ({ currentTheme, setTheme }) => {
    return (
        <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-primary-400 flex items-center gap-2">
                <Palette className="w-3 h-3" /> Interface Theme
            </h3>
            <div className="grid grid-cols-2 gap-3">
                {THEMES.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setTheme(t.id)}
                        className={`p-3 rounded-xl border flex flex-col items-center gap-3 transition-all ${
                            currentTheme === t.id
                                ? 'bg-white/10 border-white/30 shadow-lg'
                                : 'bg-black/20 border-white/5 hover:bg-white/5'
                        }`}
                    >
                        <div
                            className="w-6 h-6 rounded-full shadow-inner"
                            style={{ backgroundColor: t.color }}
                        />
                        <span className="text-xs font-bold text-white/80">{t.name}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};
