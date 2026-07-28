import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Minus, Plus } from 'lucide-react';

interface AttendanceControlsProps {
    totalCount: number;
    attendedCount: number;
    onUpdate: (attended: number, total: number) => void;
    readOnly?: boolean;
}

export const AttendanceControls = React.memo(({
    totalCount,
    attendedCount,
    onUpdate,
    readOnly = false,
}: AttendanceControlsProps) => {
    // Local state for the inputs so users can type freely without mid-input clamping
    const [localTotal, setLocalTotal] = useState(String(totalCount || ''));
    const [localAttended, setLocalAttended] = useState(String(attendedCount || ''));

    // Keep local state in sync when parent store changes (e.g. cloud sync, undo)
    useEffect(() => {
        setLocalTotal(totalCount > 0 ? String(totalCount) : '');
    }, [totalCount]);

    useEffect(() => {
        setLocalAttended(attendedCount > 0 ? String(attendedCount) : '');
    }, [attendedCount]);

    const parsedTotal = parseInt(localTotal, 10);
    const parsedAttended = parseInt(localAttended, 10);
    const isInvalid = !isNaN(parsedAttended) && !isNaN(parsedTotal) && parsedAttended > parsedTotal;

    const commitValues = (attended: number, total: number) => {
        const safeTotal = isNaN(total) ? 0 : Math.max(0, total);
        const safeAttended = isNaN(attended) ? 0 : Math.max(0, attended);
        onUpdate(safeAttended, safeTotal);
    };

    const handleTotalBlur = () => {
        const t = isNaN(parsedTotal) ? 0 : Math.max(0, parsedTotal);
        const a = isNaN(parsedAttended) ? 0 : Math.max(0, parsedAttended);
        setLocalTotal(t > 0 ? String(t) : '');
        commitValues(a, t);
    };

    const handleAttendedBlur = () => {
        const t = isNaN(parsedTotal) ? 0 : Math.max(0, parsedTotal);
        const a = isNaN(parsedAttended) ? 0 : Math.max(0, parsedAttended);
        setLocalAttended(a > 0 ? String(a) : '');
        commitValues(a, t);
    };

    return (
        <div className="flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-4 sm:gap-8">
            {/* Total Classes */}
            <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-2" id="total-classes-label">Total Classes</label>
                <div className={`glass-tubular bg-white/5 rounded-2xl border ${isInvalid ? 'border-red-500/40' : 'border-white/10'} p-4 flex items-center justify-between focus-within:border-primary-500/50 transition-all shadow-xl shadow-black/20`}>
                    <motion.button
                        whileHover={{ scale: 1.1, backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => {
                            const newTotal = Math.max(0, (isNaN(parsedTotal) ? 0 : parsedTotal) - 1);
                            setLocalTotal(newTotal > 0 ? String(newTotal) : '');
                            commitValues(isNaN(parsedAttended) ? 0 : parsedAttended, newTotal);
                        }}
                        disabled={readOnly}
                        className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        aria-label="Decrease total classes"
                    >
                        <Minus className="w-4 h-4" />
                    </motion.button>
                    <input
                        type="number"
                        inputMode="numeric"
                        value={localTotal}
                        onChange={(e) => {
                            if (readOnly) return;
                            setLocalTotal(e.target.value);
                        }}
                        onBlur={handleTotalBlur}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                (e.target as HTMLInputElement).blur();
                            }
                        }}
                        readOnly={readOnly}
                        placeholder="0"
                        className="w-16 bg-transparent text-2xl sm:text-3xl font-black text-center outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none read-only:text-white/70 read-only:cursor-default placeholder:text-white/15"
                        aria-labelledby="total-classes-label"
                    />
                    <motion.button
                        whileHover={{ scale: 1.1, backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => {
                            const newTotal = (isNaN(parsedTotal) ? 0 : parsedTotal) + 1;
                            setLocalTotal(String(newTotal));
                            commitValues(isNaN(parsedAttended) ? 0 : parsedAttended, newTotal);
                        }}
                        disabled={readOnly}
                        className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        aria-label="Increase total classes"
                    >
                        <Plus className="w-4 h-4" />
                    </motion.button>
                </div>
            </div>

            {/* Attended Classes */}
            <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-2" id="attended-classes-label">Attended</label>
                <div className={`glass-tubular bg-white/5 rounded-2xl border ${isInvalid ? 'border-red-500/40' : 'border-white/10'} p-4 flex items-center justify-between focus-within:border-primary-500/50 transition-all shadow-xl shadow-black/20`}>
                    <motion.button
                        whileHover={{ scale: 1.1, backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => {
                            const newAttended = Math.max(0, (isNaN(parsedAttended) ? 0 : parsedAttended) - 1);
                            setLocalAttended(newAttended > 0 ? String(newAttended) : '');
                            commitValues(newAttended, isNaN(parsedTotal) ? 0 : parsedTotal);
                        }}
                        disabled={readOnly}
                        className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        aria-label="Decrease attended classes"
                    >
                        <Minus className="w-4 h-4" />
                    </motion.button>
                    <input
                        type="number"
                        inputMode="numeric"
                        value={localAttended}
                        onChange={(e) => {
                            if (readOnly) return;
                            setLocalAttended(e.target.value);
                        }}
                        onBlur={handleAttendedBlur}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                (e.target as HTMLInputElement).blur();
                            }
                        }}
                        readOnly={readOnly}
                        placeholder="0"
                        className="w-16 bg-transparent text-2xl sm:text-3xl font-black text-center outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none read-only:text-white/70 read-only:cursor-default placeholder:text-white/15"
                        aria-labelledby="attended-classes-label"
                    />
                    <motion.button
                        whileHover={{ scale: 1.1, backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => {
                            const newAttended = (isNaN(parsedAttended) ? 0 : parsedAttended) + 1;
                            const curTotal = isNaN(parsedTotal) ? 0 : parsedTotal;
                            const newTotal = Math.max(curTotal, newAttended);
                            setLocalAttended(String(newAttended));
                            setLocalTotal(newTotal > 0 ? String(newTotal) : '');
                            commitValues(newAttended, newTotal);
                        }}
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
});
