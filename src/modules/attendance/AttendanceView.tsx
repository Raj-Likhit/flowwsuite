import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, FileDown, RotateCcw } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { ProgressRing } from '../../components/shared/ProgressRing';
import { Input } from '../../components/shared/Input';
import { PremiumButton } from '../../components/shared/PremiumButton';
import { SmartLogicCards } from './SmartLogicCards';
import { useAttendanceReport } from './useAttendanceReport';

export const AttendanceView: React.FC = () => {
    const {
        attendance,
        setTotalClasses,
        setAttendedClasses,
        logToday,
        resetAttendance,
    } = useAppStore();

    const { generateReport } = useAttendanceReport();

    const { totalClasses, attendedClasses } = attendance;
    const percentage = totalClasses > 0
        ? Math.round((attendedClasses / totalClasses) * 100)
        : 0;

    const handleTotalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseInt(e.target.value, 10);
        if (!isNaN(val)) setTotalClasses(val);
        else if (e.target.value === '') setTotalClasses(0);
    };

    const handleAttendedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseInt(e.target.value, 10);
        if (!isNaN(val)) setAttendedClasses(val);
        else if (e.target.value === '') setAttendedClasses(0);
    };

    return (
        <div
            id="attendance-panel"
            role="tabpanel"
            aria-labelledby="attendance-tab"
            className="min-h-screen pb-28 px-4 pt-6"
        >
            <div className="max-w-lg mx-auto space-y-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    className="text-center"
                >
                    <h1 className="text-2xl font-black tracking-tight text-white">
                        Attendance <span className="text-gradient">Guardian</span>
                    </h1>
                    <p className="text-xs text-white/40 mt-1 tracking-wide">
                        Track your 75% attendance requirement
                    </p>
                </motion.div>

                {/* Inputs */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                    className="grid grid-cols-2 gap-4"
                >
                    <Input
                        label="Total Classes"
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={totalClasses || ''}
                        onChange={handleTotalChange}
                        placeholder="0"
                    />
                    <Input
                        label="Attended"
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={totalClasses}
                        value={attendedClasses || ''}
                        onChange={handleAttendedChange}
                        placeholder="0"
                    />
                </motion.div>

                {/* Ring */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="flex justify-center py-4"
                >
                    <ProgressRing percentage={percentage} size={220} strokeWidth={12} />
                </motion.div>

                {/* Smart Logic Cards */}
                <AnimatePresence>
                    {totalClasses > 0 && (
                        <SmartLogicCards
                            total={totalClasses}
                            attended={attendedClasses}
                            percentage={percentage}
                        />
                    )}
                </AnimatePresence>

                {/* Action Buttons */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className="flex gap-3"
                >
                    <PremiumButton
                        variant="secondary"
                        size="md"
                        onClick={() => generateReport()}
                        className="flex items-center gap-2 flex-1"
                        disabled={totalClasses === 0}
                    >
                        <FileDown className="w-4 h-4" />
                        Export PDF
                    </PremiumButton>

                    <PremiumButton
                        variant="ghost"
                        size="md"
                        onClick={() => resetAttendance()}
                        className="flex items-center gap-2"
                    >
                        <RotateCcw className="w-4 h-4" />
                        Reset
                    </PremiumButton>
                </motion.div>
            </div>

            {/* Log Today FAB */}
            <motion.button
                whileTap={{ scale: 0.9 }}
                whileHover={{ scale: 1.05 }}
                onClick={() => logToday()}
                className="fixed bottom-24 right-5 z-50 w-14 h-14 rounded-full accent-gradient shadow-xl shadow-indigo-500/30 flex items-center justify-center text-white"
                aria-label="Log today's attendance"
            >
                <motion.div
                    key={totalClasses}
                    initial={{ scale: 1.3, rotate: 90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                >
                    <Plus className="w-6 h-6" strokeWidth={2.5} />
                </motion.div>
            </motion.button>
        </div>
    );
};
