import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RefreshCw, FileDown, RotateCcw, User, Plus, Shield, AlertTriangle, TrendingDown, TrendingUp, CheckCircle2, X } from 'lucide-react';
import { useAttendanceStore } from '../store/useAttendanceStore';
import { ProgressRing } from '../../../shared/components/ProgressRing';
import { PremiumButton } from '../../../shared/components/PremiumButton';
import { useAttendanceReport } from './useAttendanceReport';
import { ProfileSelection } from './ProfileSelection';
import { supabase } from '../../../core/lib/supabase';
import { clsx } from 'clsx';

export const AttendanceView: React.FC = () => {
    const {
        activeProfile,
        setActiveProfile,
        loading,
        setLoading,
        updateAttendance,
    } = useAttendanceStore();

    const [syncSuccess, setSyncSuccess] = useState(false);
    const [syncError, setSyncError] = useState<string | null>(null);
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const { generateReport } = useAttendanceReport();

    const handleSync = async () => {
        if (!activeProfile) return;
        setLoading(true);

        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    attended: activeProfile.attended,
                    total: activeProfile.total
                })
                .eq('id', activeProfile.id);

            if (error) {
                if (error.code === '42703') {
                    setSyncError('Database Column Missing. Please add attended/total columns.');
                } else {
                    setSyncError(error.message);
                }
                throw error;
            }

            setSyncSuccess(true);
            setTimeout(() => setSyncSuccess(false), 2000);
        } catch (err) {
            console.error('Sync failed:', err);
            setSyncError('Failed to sync. Please try again.');
        } finally {
            setLoading(false);
        }
    };


    if (!activeProfile) {
        return <ProfileSelection />;
    }

    const attendedCount = activeProfile.attended ?? 0;
    const totalCount = activeProfile.total ?? 0;
    const percentage = totalCount > 0 ? Math.round((attendedCount / totalCount) * 1000) / 10 : 0;

    const isSafe = percentage >= 75;
    const safeToSkip = Math.max(0, Math.floor(attendedCount / 0.75 - totalCount));
    const classesNeeded = Math.max(0, Math.ceil((0.75 * totalCount - attendedCount) / 0.25));

    return (
        <div className="min-h-screen bg-black text-white p-6 relative overflow-x-hidden">
            {/* Header Area */}
            <div className="flex items-center justify-between mb-8 max-w-md mx-auto">
                <button
                    onClick={() => setActiveProfile(null)}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-white/40" />
                </button>
                <div className="text-center">
                    <h1 className="text-2xl font-black tracking-tight">
                        Attendance <span className="text-indigo-500">Guardian</span>
                    </h1>
                    <p className="text-white/40 text-[10px] uppercase font-bold tracking-widest">
                        Track your 75% attendance requirement
                    </p>
                </div>
                <div className="w-9 h-9 rounded-lg overflow-hidden ring-1 ring-white/10">
                    {activeProfile.avatar_url ? (
                        <img src={activeProfile.avatar_url} alt={activeProfile.name} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-white/5 flex items-center justify-center">
                            <User className="w-4 h-4 text-white/20" />
                        </div>
                    )}
                </div>
            </div>

            <div className="max-w-md mx-auto space-y-12 pb-32">
                {/* Profile Chip */}
                <div className="flex justify-center">
                    <div className="px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                        <span className="text-[10px] font-black uppercase text-indigo-400">Student: {activeProfile.name}</span>
                    </div>
                </div>

                {/* Input Controls Row */}
                <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-2">Total Classes</label>
                        <div className="bg-[#111] rounded-2xl border border-white/5 p-6 focus-within:border-indigo-500/50 transition-all">
                            <input
                                type="number"
                                value={totalCount || ''}
                                onChange={(e) => updateAttendance(attendedCount, parseInt(e.target.value) || 0)}
                                className="w-full bg-transparent text-3xl font-black text-center outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                        </div>
                    </div>
                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-2">Attended</label>
                        <div className="bg-[#111] rounded-2xl border border-white/5 p-6 focus-within:border-indigo-500/50 transition-all">
                            <input
                                type="number"
                                value={attendedCount || ''}
                                onChange={(e) => updateAttendance(parseInt(e.target.value) || 0, totalCount)}
                                className="w-full bg-transparent text-3xl font-black text-center outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Central Circle */}
                <div className="relative flex flex-col items-center justify-center py-4">
                    <ProgressRing percentage={percentage} size={280} strokeWidth={16} />
                </div>

                {/* Safe / Danger Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {isSafe ? (
                        <>
                            <div className="bg-[#111] p-5 rounded-2xl border border-white/5 space-y-4">
                                <div className="flex items-center gap-2">
                                    <Shield className="w-5 h-5 text-emerald-400" />
                                    <span className="text-[10px] uppercase font-black tracking-widest text-emerald-400">Safe Zone</span>
                                </div>
                                <p className="text-sm font-medium text-white/60 leading-relaxed">
                                    You're above the 75% threshold.<br />Keep it up!
                                </p>
                            </div>
                            <div className="bg-[#111] p-5 rounded-2xl border border-white/5 flex flex-col justify-center">
                                <div className="flex items-center gap-2 mb-3">
                                    <TrendingDown className="w-4 h-4 text-indigo-400" />
                                    <span className="text-[10px] uppercase font-black tracking-widest text-indigo-400">Safe to Skip</span>
                                </div>
                                <div className="text-4xl font-black text-white">{safeToSkip}</div>
                                <p className="text-[11px] font-semibold text-white/40 mt-1 uppercase tracking-wider">classes you can safely miss</p>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="bg-[#111] p-5 rounded-2xl border border-white/5 space-y-4">
                                <div className="flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5 text-red-400" />
                                    <span className="text-[10px] uppercase font-black tracking-widest text-red-400">Danger Zone</span>
                                </div>
                                <p className="text-sm font-medium text-white/60 leading-relaxed">
                                    You're below 75%. Focus on attending consecutive classes.
                                </p>
                            </div>
                            <div className="bg-[#111] p-5 rounded-2xl border border-white/5 flex flex-col justify-center">
                                <div className="flex items-center gap-2 mb-3">
                                    <TrendingUp className="w-4 h-4 text-indigo-400" />
                                    <span className="text-[10px] uppercase font-black tracking-widest text-indigo-400">Recovery Mode</span>
                                </div>
                                <div className="text-4xl font-black text-white">{classesNeeded}</div>
                                <p className="text-[11px] font-semibold text-white/40 mt-1 uppercase tracking-wider">consecutive classes needed to reach 75%</p>
                            </div>
                        </>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="space-y-4">
                    {/* Inline Error Message */}
                    <AnimatePresence>
                        {syncError && (
                            <motion.div
                                initial={{ opacity: 0, height: 0, scale: 0.95 }}
                                animate={{ opacity: 1, height: 'auto', scale: 1 }}
                                exit={{ opacity: 0, height: 0, scale: 0.95 }}
                                className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-start gap-3 text-red-400"
                            >
                                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                <div className="text-sm font-medium leading-relaxed">{syncError}</div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <PremiumButton
                        variant={syncSuccess ? "secondary" : "primary"}
                        onClick={handleSync}
                        disabled={loading || syncSuccess}
                        className={clsx(
                            "w-full py-6 rounded-2xl flex items-center justify-center gap-3 transition-colors",
                            syncSuccess ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30" : "bg-indigo-600 hover:bg-indigo-500 shadow-[0_10px_40px_rgba(79,70,229,0.2)]"
                        )}
                    >
                        {syncSuccess ? (
                            <>
                                <CheckCircle2 className="w-5 h-5" />
                                <span className="font-black uppercase tracking-widest text-xs">Synced</span>
                            </>
                        ) : (
                            <>
                                <RefreshCw className={clsx("w-5 h-5", loading && "animate-spin")} />
                                <span className="font-black uppercase tracking-widest text-xs">Sync to Cloud</span>
                            </>
                        )}
                    </PremiumButton>

                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => generateReport()}
                            className="flex items-center justify-center gap-3 bg-[#111] hover:bg-white/5 border border-white/5 py-4 rounded-2xl transition-all"
                        >
                            <FileDown className="w-4 h-4 text-white/40" />
                            <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest">Export PDF</span>
                        </button>

                        {showResetConfirm ? (
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        updateAttendance(0, 0);
                                        setShowResetConfirm(false);
                                    }}
                                    className="flex-1 flex items-center justify-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/20 py-4 rounded-2xl transition-all"
                                >
                                    <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest leading-tight">Confirm</span>
                                </button>
                                <button
                                    onClick={() => setShowResetConfirm(false)}
                                    className="flex items-center justify-center bg-[#111] hover:bg-white/5 border border-white/5 px-4 rounded-2xl transition-all"
                                >
                                    <X className="w-4 h-4 text-white/40 hover:text-white transition-colors" />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowResetConfirm(true)}
                                className="flex items-center justify-center gap-3 bg-[#111] hover:bg-white/5 border border-white/5 py-4 rounded-2xl transition-all group"
                            >
                                <RotateCcw className="w-4 h-4 text-white/40 group-hover:text-white transition-colors" />
                                <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest">Reset</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Navigation */}
            <div className="fixed bottom-0 left-0 right-0 h-24 bg-black border-t border-white/5 flex items-center justify-around px-12 pb-4">
                <div className="flex flex-col items-center gap-1 text-indigo-500">
                    <div className="w-12 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center">
                        <RefreshCw className="w-5 h-5" />
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-widest">Attendance</span>
                </div>
                <div className="flex flex-col items-center gap-1 text-white/20">
                    <div className="w-12 h-10 flex items-center justify-center">
                        <FileDown className="w-5 h-5" />
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-widest">Converter</span>
                </div>
            </div>

            {/* Floating Plus Button */}
            <button
                onClick={() => updateAttendance(attendedCount + 1, totalCount + 1)}
                className="fixed bottom-32 right-6 w-14 h-14 bg-indigo-600 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all text-white z-[60]"
            >
                <Plus className="w-6 h-6" />
            </button>
        </div>
    );
};
