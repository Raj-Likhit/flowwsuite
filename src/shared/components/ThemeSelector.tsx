import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useThemeStore } from '../store/useThemeStore';
import type { Theme } from '../store/useThemeStore';
import { Palette } from 'lucide-react';
import { clsx } from 'clsx';

export const ThemeSelector: React.FC = () => {
    const { theme, setTheme } = useThemeStore();
    const [isOpen, setIsOpen] = React.useState(false);

    const themes: { id: Theme; label: string; bgClass: string; borderClass: string }[] = [
        { id: 'indigo', label: 'Indigo', bgClass: 'bg-[#6366f1]', borderClass: 'border-[#4f46e5]' },
        { id: 'obsidian', label: 'Obsidian', bgClass: 'bg-[#737373]', borderClass: 'border-[#525252]' },
        { id: 'crimson', label: 'Crimson', bgClass: 'bg-[#f43f5e]', borderClass: 'border-[#e11d48]' },
        { id: 'forest', label: 'Forest', bgClass: 'bg-[#10b981]', borderClass: 'border-[#059669]' },
    ];

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-10 h-10 rounded-xl glass flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all border border-white/5"
            >
                <Palette className="w-4 h-4" />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() => setIsOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute right-0 top-12 mt-2 w-48 rounded-2xl p-2 glass z-50 shadow-2xl origin-top-right border border-white/20"
                        >
                            <div className="text-[10px] uppercase font-black tracking-widest text-white/40 mb-2 px-2 pt-1">
                                Theme
                            </div>
                            <div className="space-y-1">
                                {themes.map((t) => (
                                    <button
                                        key={t.id}
                                        onClick={() => {
                                            setTheme(t.id);
                                            setIsOpen(false);
                                        }}
                                        className={clsx(
                                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all",
                                            theme === t.id
                                                ? "bg-white/10 text-white shadow-sm"
                                                : "text-white/60 hover:bg-white/5 hover:text-white"
                                        )}
                                    >
                                        <div className={clsx("w-4 h-4 rounded-full border border-white/20", t.bgClass)} />
                                        <span className="text-xs font-bold">{t.label}</span>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};
