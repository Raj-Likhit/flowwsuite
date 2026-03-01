import React from 'react';
import { useConverterStore } from '../store/useConverterStore';
import { clsx } from 'clsx';
import { ColorPopover } from '../../../shared/components/ui/ColorPopover';
import { Palette, Layers, Hash } from 'lucide-react';
import { motion } from 'framer-motion';
import GlassSurface from '../../../shared/components/ui/reactbits/GlassSurface';

const FILTERS = [
    { id: 'none', label: 'RAW' },
    { id: 'grayscale', label: 'BW' },
    { id: 'sepia', label: 'RETRO' },
    { id: 'vibrant', label: 'VIBE' },
] as const;

const COLORS = ['#000000', '#10b981', '#3b82f6', '#ef4444'];

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

export const SettingsPanel: React.FC = () => {
    const { settings, updateSettings } = useConverterStore();
    const { borderWidth, baseColor, showPageNumbers, activeFilter } = settings;

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-12 gap-4 relative z-50"
        >
            {/* Border Engine */}
            <motion.div variants={itemVariants} className="md:col-span-5 h-full relative">
                <GlassSurface width="100%" height="100%" borderRadius={16} blur={16} opacity={0.6}>
                    <div className="p-5 w-full flex flex-col justify-between h-full">
                        <div className="flex items-center gap-2 mb-4 text-primary-400">
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
                                    className="w-full accent-primary-500 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
                                />
                                <div className="flex justify-between mt-1 px-1">
                                    <span className="text-[8px] text-white/40 font-bold">THIN</span>
                                    <span className="text-[8px] text-white/40 font-bold">THICK</span>
                                </div>
                            </div>

                            <div className="flex gap-1.5 items-center pl-4 border-l border-white/5">
                                {COLORS.map(c => (
                                    <button
                                        key={c}
                                        onClick={() => updateSettings({ baseColor: c })}
                                        className={clsx(
                                            "w-6 h-6 rounded-full transition-transform ring-2 ring-offset-2 ring-offset-black",
                                            baseColor === c ? "ring-primary-500 scale-100" : "ring-transparent hover:scale-110"
                                        )}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                                <ColorPopover color={baseColor} onChange={(c) => updateSettings({ baseColor: c })} />
                            </div>
                        </div>
                    </div>
                </GlassSurface>
            </motion.div>

            {/* Filter Studio */}
            <motion.div variants={itemVariants} className="md:col-span-4 h-full relative">
                <GlassSurface width="100%" height="100%" borderRadius={16} blur={16} opacity={0.6}>
                    <div className="p-5 w-full flex flex-col justify-between h-full">
                        <div className="flex items-center gap-2 mb-4 text-primary-400">
                            <Palette className="w-4 h-4" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Filter Studio</span>
                        </div>
                        <div className="flex gap-1 justify-between bg-black/50 p-1 rounded-xl border border-white/5 relative overflow-hidden">
                            {FILTERS.map(f => (
                                <button
                                    key={f.id}
                                    onClick={() => updateSettings({ activeFilter: f.id })}
                                    className={clsx(
                                        "relative flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-colors uppercase tracking-wide z-10",
                                        activeFilter === f.id
                                            ? "text-black"
                                            : "text-white/40 hover:text-white"
                                    )}
                                >
                                    {activeFilter === f.id && (
                                        <motion.div
                                            layoutId="activeFilter"
                                            className="absolute inset-0 bg-primary-500 rounded-lg -z-10 shadow-lg shadow-primary-500/20"
                                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                        />
                                    )}
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </GlassSurface>
            </motion.div>

            {/* Metadata */}
            <motion.div variants={itemVariants} className="md:col-span-3 h-full relative">
                <GlassSurface width="100%" height="100%" borderRadius={16} blur={16} opacity={0.6}>
                    <div className="p-5 w-full flex flex-col justify-between h-full">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-primary-400">
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
                                <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-500 transition-colors"></div>
                            </label>
                        </div>
                        <div className="mt-2 text-[10px] text-white/40 font-medium">
                            Auto-numbering logic enabled.
                        </div>
                    </div>
                </GlassSurface>
            </motion.div>
        </motion.div>
    );
};
