import React from 'react';
import { Shield, TrendingDown, AlertTriangle, TrendingUp } from 'lucide-react';

interface SafeDangerCardsProps {
    percentage: number;
    attendedCount: number;
    totalCount: number;
}

export const SafeDangerCards: React.FC<SafeDangerCardsProps> = ({ percentage, attendedCount, totalCount }) => {
    const isSafe = percentage >= 75;
    const safeToSkip = Math.max(0, Math.floor(attendedCount / 0.75 - totalCount));
    const classesNeeded = Math.max(0, Math.ceil((0.75 * totalCount - attendedCount) / 0.25));

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" aria-live="polite">
            {isSafe ? (
                <>
                    <div className="bg-[#111] p-5 rounded-2xl border border-white/5 space-y-4" role="status" aria-label="Attendance is in the Safe Zone">
                        <div className="flex items-center gap-2">
                            <Shield className="w-5 h-5 text-emerald-400" aria-hidden="true" />
                            <span className="text-[10px] uppercase font-black tracking-widest text-emerald-400">Safe Zone</span>
                        </div>
                        <p className="text-sm font-medium text-white/60 leading-relaxed">
                            You're above the 75% threshold.<br />Keep it up!
                        </p>
                    </div>
                    <div className="bg-[#111] p-5 rounded-2xl border border-white/5 flex flex-col justify-center" aria-label={`You can safely skip ${safeToSkip} classes`}>
                        <div className="flex items-center gap-2 mb-3">
                            <TrendingDown className="w-4 h-4 text-primary-400" aria-hidden="true" />
                            <span className="text-[10px] uppercase font-black tracking-widest text-primary-400">Safe to Skip</span>
                        </div>
                        <div className="text-4xl font-black text-white">{safeToSkip}</div>
                        <p className="text-[11px] font-semibold text-white/40 mt-1 uppercase tracking-wider" aria-hidden="true">classes you can safely miss</p>
                    </div>
                </>
            ) : (
                <>
                    <div className="bg-[#111] p-5 rounded-2xl border border-white/5 space-y-4" role="alert" aria-label="Attendance is in the Danger Zone">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-red-400" aria-hidden="true" />
                            <span className="text-[10px] uppercase font-black tracking-widest text-red-400">Danger Zone</span>
                        </div>
                        <p className="text-sm font-medium text-white/60 leading-relaxed">
                            You're below 75%. Focus on attending consecutive classes.
                        </p>
                    </div>
                    <div className="bg-[#111] p-5 rounded-2xl border border-white/5 flex flex-col justify-center" aria-label={`You need ${classesNeeded} consecutive classes to reach 75%`}>
                        <div className="flex items-center gap-2 mb-3">
                            <TrendingUp className="w-4 h-4 text-primary-400" aria-hidden="true" />
                            <span className="text-[10px] uppercase font-black tracking-widest text-primary-400">Recovery Mode</span>
                        </div>
                        <div className="text-4xl font-black text-white">{classesNeeded}</div>
                        <p className="text-[11px] font-semibold text-white/40 mt-1 uppercase tracking-wider" aria-hidden="true">consecutive classes needed to reach 75%</p>
                    </div>
                </>
            )}
        </div>
    );
};
