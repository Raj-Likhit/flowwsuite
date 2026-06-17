import React from 'react';
import { motion } from 'framer-motion';
import { Minus, Plus } from 'lucide-react';

interface AttendanceControlsProps {
    totalCount: number;
    attendedCount: number;
    onUpdate: (attended: number, total: number) => void;
    readOnly?: boolean;
}

export const AttendanceControls: React.FC<AttendanceControlsProps> = ({
    totalCount,
    attendedCount,
    onUpdate,
    readOnly = false,
}) => {
    const isInvalid = attendedCount > totalCount;

    return (
        <div className="flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-4 sm:gap-8">
            <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-2" id="total-classes-label">Total Classes</label>
                <div className={`glass-tubular bg-white/5 rounded-2xl border ${isInvalid ? 'border-red-500/40' : 'border-white/10'} p-4 flex items-center justify-between focus-within:border-primary-500/50 transition-all shadow-xl shadow-black/20`}>
                    <motion.button
                        whileHover={{ scale: 1.1, backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => onUpdate(attendedCount, Math.max(0, totalCount - 1))}
                        disabled={readOnly}
                        className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        aria-label="Decrease total classes"
                    >
                        <Minus className="w-4 h-4" />
                    </motion.button>
                    <input
                        type="number"
                        value={totalCount || ''}
                        onChange={(e) => {
                            if (readOnly) return;
                            onUpdate(attendedCount, parseInt(e.target.value) || 0);
                        }}
                        readOnly={readOnly}
                        className="w-16 bg-transparent text-2xl sm:text-3xl font-black text-center outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none read-only:text-white/70 read-only:cursor-default"
                        aria-labelledby="total-classes-label"
                    />
                    <motion.button
                        whileHover={{ scale: 1.1, backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => onUpdate(attendedCount, totalCount + 1)}
                        disabled={readOnly}
                        className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        aria-label="Increase total classes"
                    >
                        <Plus className="w-4 h-4" />
                    </motion.button>
                </div>
            </div>
            <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-2" id="attended-classes-label">Attended</label>
                <div className={`glass-tubular bg-white/5 rounded-2xl border ${isInvalid ? 'border-red-500/40' : 'border-white/10'} p-4 flex items-center justify-between focus-within:border-primary-500/50 transition-all shadow-xl shadow-black/20`}>
                    <motion.button
                        whileHover={{ scale: 1.1, backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => onUpdate(Math.max(0, attendedCount - 1), totalCount)}
                        disabled={readOnly}
                        className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        aria-label="Decrease attended classes"
                    >
                        <Minus className="w-4 h-4" />
                    </motion.button>
                    <input
                        type="number"
                        value={attendedCount || ''}
                        onChange={(e) => {
                            if (readOnly) return;
                            onUpdate(parseInt(e.target.value) || 0, totalCount);
                        }}
                        readOnly={readOnly}
                        className="w-16 bg-transparent text-2xl sm:text-3xl font-black text-center outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none read-only:text-white/70 read-only:cursor-default"
                        aria-labelledby="attended-classes-label"
                    />
                    <motion.button
                        whileHover={{ scale: 1.1, backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => onUpdate(attendedCount + 1, Math.max(totalCount, attendedCount + 1))}
                        disabled={readOnly}
                        className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        aria-label="Increase attended classes"
                    >
                        <Plus className="w-4 h-4" />
                    </motion.button>
                </div>
            </div>
        </div>
        {isInvalid && (
            <p className="text-red-400 text-[10px] text-center font-bold uppercase tracking-wider mt-2">
                Attended cannot exceed total classes
            </p>
        )}
        </div>
    );
};
