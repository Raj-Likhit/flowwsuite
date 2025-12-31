import React from 'react';
import { useStore } from '../../store/useStore';
import { clsx } from 'clsx';
import { ColorPopover } from '../ui/ColorPopover';
import { Palette, Layers, Hash } from 'lucide-react';
import { motion } from 'framer-motion';

export const SettingsPanel: React.FC = () => {
    const { settings, updateSettings } = useStore();
    const { borderWidth, baseColor, showPageNumbers, activeFilter } = settings;

    const filters = [
        { id: 'none', label: 'RAW' },
        { id: 'grayscale', label: 'BW' },
        { id: 'sepia', label: 'RETRO' },
        { id: 'vibrant', label: 'VIBE' },
    ] as const;

    const colors = ['#000000', '#10b981', '#3b82f6', '#ef4444'];

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 10 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-12 gap-4 relative z-40"
        >
            {/* Border Engine */}
            <motion.div variants={itemVariants} className="md:col-span-5 bg-slate-900/60 border border-white/10 p-5 rounded-2xl backdrop-blur-xl hover:border-white/20 transition-colors shadow-xl">
                <div className="flex items-center gap-2 mb-4 text-emerald-400">
                    <Layers className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Border Engine</span>
                </div>

                <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                        <input
                            type="range"
                            min="0"
                            max="15"
                            value={borderWidth}
                            onChange={(e) => updateSettings({ borderWidth: Number(e.target.value) })}
                            className="w-full accent-emerald-500 h-1.5 bg-slate-700/50 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between mt-1 px-1">
                            <span className="text-[8px] text-slate-500 font-bold">THIN</span>
                            <span className="text-[8px] text-slate-500 font-bold">THICK</span>
                        </div>
                    </div>

                    <div className="flex gap-1.5 items-center pl-4 border-l border-white/5">
                        {colors.map(c => (
                            <button
                                key={c}
                                onClick={() => updateSettings({ baseColor: c })}
                                className={clsx(
                                    "w-6 h-6 rounded-full transition-transform ring-2 ring-offset-2 ring-offset-slate-900",
                                    baseColor === c ? "ring-emerald-500 scale-100" : "ring-transparent hover:scale-110"
                                )}
                                style={{ backgroundColor: c }}
                            />
                        ))}
                        <ColorPopover color={baseColor} onChange={(c) => updateSettings({ baseColor: c })} />
                    </div>
                </div>
            </motion.div>

            {/* Filter Studio */}
            <motion.div variants={itemVariants} className="md:col-span-4 bg-slate-900/60 border border-white/10 p-5 rounded-2xl backdrop-blur-xl hover:border-white/20 transition-colors shadow-xl">
                <div className="flex items-center gap-2 mb-4 text-cyan-400">
                    <Palette className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Filter Studio</span>
                </div>
                <div className="flex gap-1 justify-between bg-slate-950/50 p-1 rounded-xl border border-white/5">
                    {filters.map(f => (
                        <button
                            key={f.id}
                            onClick={() => updateSettings({ activeFilter: f.id })}
                            className={clsx(
                                "flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all uppercase tracking-wide",
                                activeFilter === f.id
                                    ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20"
                                    : "text-slate-500 hover:text-white"
                            )}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </motion.div>

            {/* Metadata */}
            <motion.div variants={itemVariants} className="md:col-span-3 bg-slate-900/60 border border-white/10 p-5 rounded-2xl backdrop-blur-xl hover:border-white/20 transition-colors shadow-xl flex flex-col justify-between">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-purple-400">
                        <Hash className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Pagination</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={showPageNumbers}
                            onChange={(e) => updateSettings({ showPageNumbers: e.target.checked })}
                            className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 transition-colors"></div>
                    </label>
                </div>
                <div className="mt-2 text-[10px] text-slate-500 font-medium">
                    Auto-numbering logic enabled.
                </div>
            </motion.div>
        </motion.div>
    );
};
