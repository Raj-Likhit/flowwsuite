import React from 'react';
import { motion } from 'framer-motion';
import { Minus, Plus } from 'lucide-react';

interface AttendanceControlsProps {
    totalCount: number;
    attendedCount: number;
    onUpdate: (attended: number, total: number) => void;
}

export const AttendanceControls: React.FC<AttendanceControlsProps> = ({
    totalCount,
    attendedCount,
    onUpdate
}) => {
    return (
        <div className="grid grid-cols-2 gap-4 sm:gap-8">
            <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-2" id="total-classes-label">Total Classes</label>
                <div className="glass-tubular bg-white/5 rounded-2xl border border-white/10 p-4 flex items-center justify-between focus-within:border-primary-500/50 transition-all shadow-xl shadow-black/20">
                    <motion.button
                        whileHover={{ scale: 1.1, backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => onUpdate(attendedCount, Math.max(0, totalCount - 1))}
                        className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-colors"
                        aria-label="Decrease total classes"
                    >
                        <Minus className="w-4 h-4" />
                    </motion.button>
                    <input
                        type="number"
                        value={totalCount || ''}
                        onChange={(e) => onUpdate(attendedCount, parseInt(e.target.value) || 0)}
                        className="w-16 bg-transparent text-2xl sm:text-3xl font-black text-center outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        aria-labelledby="total-classes-label"
                    />
                    <motion.button
                        whileHover={{ scale: 1.1, backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => onUpdate(attendedCount, totalCount + 1)}
                        className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-colors"
                        aria-label="Increase total classes"
                    >
                        <Plus className="w-4 h-4" />
                    </motion.button>
                </div>
            </div>
            <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-2" id="attended-classes-label">Attended</label>
                <div className="glass-tubular bg-white/5 rounded-2xl border border-white/10 p-4 flex items-center justify-between focus-within:border-primary-500/50 transition-all shadow-xl shadow-black/20">
                    <motion.button
                        whileHover={{ scale: 1.1, backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => onUpdate(Math.max(0, attendedCount - 1), totalCount)}
                        className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-colors"
                        aria-label="Decrease attended classes"
                    >
                        <Minus className="w-4 h-4" />
                    </motion.button>
                    <input
                        type="number"
                        value={attendedCount || ''}
                        onChange={(e) => onUpdate(parseInt(e.target.value) || 0, totalCount)}
                        className="w-16 bg-transparent text-2xl sm:text-3xl font-black text-center outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        aria-labelledby="attended-classes-label"
                    />
                    <motion.button
                        whileHover={{ scale: 1.1, backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => onUpdate(attendedCount + 1, Math.max(totalCount, attendedCount + 1))}
                        className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-colors"
                        aria-label="Increase attended classes"
                    >
                        <Plus className="w-4 h-4" />
                    </motion.button>
                </div>
            </div>
        </div>
    );
};
