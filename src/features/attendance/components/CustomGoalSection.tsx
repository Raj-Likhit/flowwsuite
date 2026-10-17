import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, TrendingDown, TrendingUp, ChevronDown, Pencil, Check } from 'lucide-react';
import SpotlightCard from '../../../shared/components/ui/reactbits/SpotlightCard';
import { useAttendanceStore } from '../store/useAttendanceStore';
import { calculateAttendanceMetrics } from '../utils/attendanceCalculations';
import { toast } from 'sonner';
import {
    DEFAULT_GOAL_PERCENT,
    MIN_GOAL_PERCENT,
    MAX_GOAL_PERCENT,
    isValidGoal,
    normalizeGoal,
} from '../domain/attendance';

interface CustomGoalSectionProps {
    percentage: number;
    attendedCount: number;
    totalCount: number;
    readOnly?: boolean;
}

export const CustomGoalSection: React.FC<CustomGoalSectionProps> = ({
    percentage,
    attendedCount,
    totalCount,
    readOnly = false,
}) => {
    const activeProfile = useAttendanceStore(state => state.activeProfile);
    const updateTargetGoal = useAttendanceStore(state => state.updateTargetGoal);

    const targetGoal = normalizeGoal(activeProfile?.targetGoal);

    // Don't render if goal is the default 75%
    if (targetGoal === DEFAULT_GOAL_PERCENT || !activeProfile) return null;

    const metrics = calculateAttendanceMetrics(attendedCount, totalCount, targetGoal);

    return (
        <CustomGoalSectionInner
            targetGoal={targetGoal}
            isSafe={metrics.isSafe}
            safeToSkip={metrics.safeToSkip}
            classesNeeded={metrics.classesNeeded}
            recoveryImpossible={metrics.recoveryImpossible}
            recoveryMessage={metrics.recoveryMessage}
            progressToGoal={metrics.progressToGoal}
            percentage={percentage}
            totalCount={totalCount}
            profileId={activeProfile.id}
            updateTargetGoal={updateTargetGoal}
            readOnly={readOnly}
        />
    );
};

// Inner component to keep hooks unconditional
const CustomGoalSectionInner: React.FC<{
    targetGoal: number;
    isSafe: boolean;
    safeToSkip: number;
    classesNeeded: number;
    recoveryImpossible: boolean;
    recoveryMessage?: string;
    progressToGoal: number;
    percentage: number;
    totalCount: number;
    profileId: string;
    updateTargetGoal: (profileId: string, goal: number) => void;
    readOnly: boolean;
}> = ({
    targetGoal,
    isSafe,
    safeToSkip,
    classesNeeded,
    recoveryImpossible,
    recoveryMessage,
    progressToGoal,
    percentage,
    profileId,
    updateTargetGoal,
    readOnly,
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(String(targetGoal));
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    // Sync editValue when targetGoal changes externally
    useEffect(() => {
        setEditValue(String(targetGoal));
    }, [targetGoal]);

    const handleSaveGoal = () => {
        const parsed = parseInt(editValue, 10);
        if (!isValidGoal(parsed)) {
            toast.error(`Goal must be between ${MIN_GOAL_PERCENT}% and ${MAX_GOAL_PERCENT}%`);
            setEditValue(String(targetGoal));
            setIsEditing(false);
            return;
        }
        if (parsed === DEFAULT_GOAL_PERCENT) {
            toast.info(`Set to ${DEFAULT_GOAL_PERCENT}% — using the main section`);
        } else {
            toast.success(`Goal updated to ${parsed}%`);
        }
        updateTargetGoal(profileId, parsed);
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSaveGoal();
        if (e.key === 'Escape') {
            setEditValue(String(targetGoal));
            setIsEditing(false);
        }
    };

    const progressBarColor = isSafe
        ? 'var(--color-amber, #f59e0b)'
        : 'var(--color-crimson, #ef4444)';

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-2xl border border-amber-500/10 bg-[#111] overflow-hidden"
        >
            {/* Header — always visible */}
            <div
                onClick={() => setIsExpanded(prev => !prev)}
                onKeyDown={(e) => {
                    if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        setIsExpanded(prev => !prev);
                    }
                }}
                role="button"
                tabIndex={0}
                className="w-full flex items-center justify-between px-5 py-4 group transition-colors hover:bg-white/[0.02] cursor-pointer"
                aria-expanded={isExpanded}
                aria-controls="custom-goal-panel"
            >
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                        <Target className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                            Your Goal
                        </span>

                        {/* Editable goal chip */}
                        {isEditing && !readOnly ? (
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                <input
                                    ref={inputRef}
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onBlur={handleSaveGoal}
                                    onKeyDown={handleKeyDown}
                                    className="w-12 bg-amber-500/10 border border-amber-500/30 rounded-md px-1.5 py-0.5 text-sm font-black text-amber-300 text-center outline-none focus:border-amber-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    aria-label="Edit target goal percentage"
                                />
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleSaveGoal(); }}
                                    className="p-0.5 rounded hover:bg-amber-500/20 transition-colors"
                                    aria-label="Confirm goal"
                                >
                                    <Check className="w-3.5 h-3.5 text-amber-400" />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={(e) => {
                                    if (readOnly) return;
                                    e.stopPropagation();
                                    setIsEditing(true);
                                }}
                                className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 hover:border-amber-500/40 transition-all group/chip"
                                disabled={readOnly}
                                aria-label={`Edit target goal, currently ${targetGoal}%`}
                            >
                                <span className="text-sm font-black text-amber-300 tabular-nums">
                                    {targetGoal}%
                                </span>
                                {!readOnly && (
                                    <Pencil className="w-2.5 h-2.5 text-amber-400/50 group-hover/chip:text-amber-400 transition-colors" />
                                )}
                            </button>
                        )}
                    </div>
                </div>

                <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                >
                    <ChevronDown className="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors" />
                </motion.div>
            </div>

            {/* Expandable content */}
            <AnimatePresence initial={false}>
                {isExpanded && (
                    <motion.div
                        id="custom-goal-panel"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                    >
                        <div className="px-5 pb-5 space-y-4">
                            {/* Thin progress bar */}
                            <div className="space-y-2">
                                <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
                                    <motion.div
                                        className="h-full rounded-full"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min(100, progressToGoal * 100)}%` }}
                                        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                                        style={{
                                            background: `linear-gradient(90deg, ${progressBarColor}, ${isSafe ? '#fbbf24' : '#f87171'})`,
                                            boxShadow: `0 0 12px ${progressBarColor}40`,
                                        }}
                                    />
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-white/30 tabular-nums">
                                        {percentage.toFixed(1)}%
                                    </span>
                                    <span className="text-[10px] font-bold text-amber-400/60 tabular-nums">
                                        {targetGoal}%
                                    </span>
                                </div>
                            </div>

                            {/* Stat cards */}
                            <div className="grid grid-cols-2 gap-3" aria-live="polite">
                                {isSafe ? (
                                    <>
                                        <SpotlightCard
                                            className="bg-[#0a0a0a] p-4 rounded-xl border border-white/5 flex flex-col justify-center space-y-2"
                                            spotlightColor="rgba(245, 158, 11, 0.08)"
                                        >
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-2 h-2 rounded-full bg-amber-400" aria-hidden="true" />
                                                <span className="text-[9px] uppercase font-black tracking-widest text-amber-400/70">
                                                    Status
                                                </span>
                                            </div>
                                            <p className="text-sm font-bold text-white/60 leading-relaxed">
                                                Above your {targetGoal}% target
                                            </p>
                                        </SpotlightCard>
                                        <SpotlightCard
                                            className="bg-[#0a0a0a] p-4 rounded-xl border border-white/5 space-y-3"
                                            spotlightColor="rgba(245, 158, 11, 0.12)"
                                        >
                                            <div className="flex items-center gap-1.5">
                                                <TrendingDown className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                                                <span className="text-[9px] uppercase font-black tracking-widest text-amber-400">
                                                    Safe to Skip
                                                </span>
                                            </div>
                                            <div className="text-3xl font-black text-white">{safeToSkip}</div>
                                            <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider">
                                                classes you can miss
                                            </p>
                                        </SpotlightCard>
                                    </>
                                ) : (
                                    <>
                                        <SpotlightCard
                                            className="bg-[#0a0a0a] p-4 rounded-xl border border-white/5 flex flex-col justify-center space-y-2"
                                            spotlightColor="rgba(239, 68, 68, 0.08)"
                                        >
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-2 h-2 rounded-full bg-red-400" aria-hidden="true" />
                                                <span className="text-[9px] uppercase font-black tracking-widest text-red-400/70">
                                                    Status
                                                </span>
                                            </div>
                                            <p className="text-sm font-bold text-white/60 leading-relaxed">
                                                Below your {targetGoal}% target
                                            </p>
                                        </SpotlightCard>
                                        <SpotlightCard
                                            className="bg-[#0a0a0a] p-4 rounded-xl border border-white/5 space-y-3"
                                            spotlightColor="rgba(239, 68, 68, 0.12)"
                                        >
                                            <div className="flex items-center gap-1.5">
                                                <TrendingUp className="w-3.5 h-3.5 text-red-400" aria-hidden="true" />
                                                <span className="text-[9px] uppercase font-black tracking-widest text-red-400">
                                                    Recovery
                                                </span>
                                            </div>
                                            <div className="text-3xl font-black text-white">{recoveryImpossible ? '—' : classesNeeded}</div>
                                            <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider">
                                                {recoveryImpossible ? (recoveryMessage || 'Recovery impossible') : `classes to reach ${targetGoal}%`}
                                            </p>
                                        </SpotlightCard>
                                    </>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};
