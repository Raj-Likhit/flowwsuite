import React from 'react';
import { Shield, TrendingDown, AlertTriangle, TrendingUp } from 'lucide-react';
import SpotlightCard from '../../../shared/components/ui/reactbits/SpotlightCard';
import { calculateAttendanceMetrics } from '../utils/attendanceCalculations';

interface SafeDangerCardsProps {
    percentage: number;
    attendedCount: number;
    totalCount: number;
}

export const SafeDangerCards = React.memo(({ attendedCount, totalCount }: SafeDangerCardsProps) => {
    // Hardcoded to 75% — the mandatory institutional attendance rule.
    // Custom goals are handled separately by CustomGoalSection.
    const targetGoal = 75;
    const { isSafe, safeToSkip, classesNeeded, recoveryImpossible } = calculateAttendanceMetrics(
        attendedCount,
        totalCount,
        targetGoal
    );

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" aria-live="polite">
            {isSafe ? (
                <>
                    <SpotlightCard className="bg-[#111] p-5 rounded-2xl border border-white/5 space-y-4" spotlightColor="rgba(16, 185, 129, 0.15)">
                        <div className="flex items-center gap-2">
                            <Shield className="w-5 h-5 text-emerald-400" aria-hidden="true" />
                            <span className="text-[10px] uppercase font-black tracking-widest text-emerald-400">Safe Zone</span>
                        </div>
                        <p className="text-sm font-medium text-white/60 leading-relaxed">
                            {totalCount === 0
                                ? "No classes recorded yet. You're starting fresh!"
                                : `You're above the ${targetGoal}% threshold.\nKeep it up!`}
                        </p>
                    </SpotlightCard>
                    <SpotlightCard className="bg-[#111] p-5 rounded-2xl border border-white/5 flex flex-col justify-center" spotlightColor="rgba(255, 255, 255, 0.1)">
                        <div className="flex items-center gap-2 mb-3">
                            <TrendingDown className="w-4 h-4 text-primary-400" aria-hidden="true" />
                            <span className="text-[10px] uppercase font-black tracking-widest text-primary-400">Safe to Skip</span>
                        </div>
                        <div className="text-4xl font-black text-white">{safeToSkip}</div>
                        <p className="text-[11px] font-semibold text-white/40 mt-1 uppercase tracking-wider" aria-hidden="true">
                            {totalCount === 0 ? "attend classes to build buffer" : "classes you can safely miss"}
                        </p>
                    </SpotlightCard>
                </>
            ) : (
                <>
                    <SpotlightCard className="bg-[#111] p-5 rounded-2xl border border-white/5 space-y-4" spotlightColor="rgba(239, 68, 68, 0.15)">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-red-400" aria-hidden="true" />
                            <span className="text-[10px] uppercase font-black tracking-widest text-red-400">Danger Zone</span>
                        </div>
                        <p className="text-sm font-medium text-white/60 leading-relaxed">
                            You're below {targetGoal}%. Focus on attending consecutive classes.
                        </p>
                    </SpotlightCard>
                    <SpotlightCard className="bg-[#111] p-5 rounded-2xl border border-white/5 flex flex-col justify-center" spotlightColor="rgba(255, 255, 255, 0.1)">
                        <div className="flex items-center gap-2 mb-3">
                            <TrendingUp className="w-4 h-4 text-primary-400" aria-hidden="true" />
                            <span className="text-[10px] uppercase font-black tracking-widest text-primary-400">Recovery Mode</span>
                        </div>
                        <div className="text-4xl font-black text-white">{recoveryImpossible ? '—' : classesNeeded}</div>
                        <p className="text-[11px] font-semibold text-white/40 mt-1 uppercase tracking-wider" aria-hidden="true">
                            {recoveryImpossible ? `Not realistic — would need ${classesNeeded} more classes` : `consecutive classes needed to reach ${targetGoal}%`}
                        </p>
                    </SpotlightCard>
                </>
            )}
        </div>
    );
});
