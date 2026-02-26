import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RefreshCw, FileDown, RotateCcw, User, Plus, CheckCircle2, X, AlertTriangle } from 'lucide-react';
import { useAttendanceStore } from '../store/useAttendanceStore';
import { ProgressRing } from '../../../shared/components/ProgressRing';
import { PremiumButton } from '../../../shared/components/PremiumButton';
import { AttendanceControls } from './AttendanceControls';
import { useAttendanceReport } from './useAttendanceReport';
import { ProfileSelection } from './ProfileSelection';
import { SafeDangerCards } from './SafeDangerCards';
import { AuditTrail } from './AuditTrail';
import { supabase } from '../../../core/lib/supabase';
import { clsx } from 'clsx';
import { toast } from 'sonner';

export const AttendanceView: React.FC = () => {
    const {
        activeProfile,
        setActiveProfile,
        loading,
        setLoading,
        updateAttendance,
        deleteLog,
        hideProfileName
    } = useAttendanceStore();

    const [syncSuccess, setSyncSuccess] = useState(false);
    const [syncError, setSyncError] = useState<string | null>(null);
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const { generateReport } = useAttendanceReport();
    const isSyncing = useRef(false);

    const handleSync = async () => {
        if (!activeProfile || isSyncing.current) return;
        isSyncing.current = true;
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
                    toast.error('Database configuration error.');
                } else {
                    setSyncError(error.message);
                    toast.error(error.message);
                }
                throw error;
            }

            setSyncSuccess(true);
            toast.success('Successfully synced to cloud');
            setTimeout(() => setSyncSuccess(false), 2000);
        } catch (err) {
            console.error('Sync failed:', err);
            setSyncError('Failed to sync. Please try again.');
            toast.error('Failed to sync to cloud');
        } finally {
            setLoading(false);
            isSyncing.current = false;
        }
    };


    if (!activeProfile) {
        return <ProfileSelection />;
    }

    const attendedCount = activeProfile.attended ?? 0;
    const totalCount = activeProfile.total ?? 0;
    const percentage = totalCount > 0 ? Math.round((attendedCount / totalCount) * 1000) / 10 : 0;

    return (
        <div className="min-h-screen bg-black text-white p-4 sm:p-6 relative overflow-x-hidden">
            {/* Header Area */}
            <div className="flex items-center mb-8 max-w-md mx-auto">
                <button
                    onClick={() => setActiveProfile(null)}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors flex items-center justify-center relative -left-2"
                    aria-label="Back to profiles"
                >
                    <ArrowLeft className="w-5 h-5 text-white/40" />
                </button>
            </div>

            <div className="text-center mb-8">
                <h1 className="text-2xl font-black tracking-tight" onClick={() => { }}>
                    Attendance <span className="text-primary-500">Guardian</span>
                </h1>
                <p className="text-white/40 text-[10px] uppercase font-bold tracking-widest">
                    Track your 75% attendance requirement
                </p>
            </div>
            <div className="flex justify-center mb-8 max-w-md mx-auto">
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

            <div className="max-w-md mx-auto space-y-8 sm:space-y-12 pb-32">
                {/* Profile Chip */}
                <div className="flex justify-center">
                    <div className="px-4 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/20">
                        <span className={clsx(
                            "text-[10px] font-black uppercase text-primary-400 transition-all duration-300",
                            hideProfileName ? "blur-[6px] select-none pointer-events-none opacity-50" : ""
                        )}>
                            Student: {activeProfile.name}
                        </span>
                    </div>
                </div>

                {/* Input Controls */}
                <AttendanceControls
                    totalCount={totalCount}
                    attendedCount={attendedCount}
                    onUpdate={updateAttendance}
                />

                {/* Central Circle */}
                <div className="relative flex flex-col items-center justify-center py-4">
                    <ProgressRing percentage={percentage} size={260} strokeWidth={16} />
                </div>

                {/* Safe / Danger Grid */}
                <SafeDangerCards
                    percentage={percentage}
                    attendedCount={attendedCount}
                    totalCount={totalCount}
                />

                {/* Audit Trail / History Logs */}
                <AuditTrail />

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
                            syncSuccess ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30" : "bg-primary-600 hover:bg-primary-500 shadow-lg shadow-primary-500/20"
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
                            onClick={() => {
                                generateReport();
                                toast.success('Report successfully generated!');
                            }}
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
                                        toast.success('Attendance reset to zero');
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
                <div className="flex flex-col items-center gap-1 text-primary-500">
                    <div className="w-12 h-10 bg-primary-500/10 rounded-xl flex items-center justify-center">
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
                onClick={() => {
                    if (navigator.vibrate) navigator.vibrate(50);
                    const logId = updateAttendance(attendedCount + 1, totalCount + 1, 'Logged today\'s class');
                    toast.success('Logged today\'s class!', {
                        duration: 5000,
                        action: logId ? {
                            label: 'Undo',
                            onClick: () => {
                                deleteLog(logId);
                                toast.success('Log entry reverted');
                            }
                        } : undefined
                    });
                }}
                className="fixed bottom-32 right-6 w-14 h-14 bg-primary-600 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all text-white z-[60]"
            >
                <Plus className="w-6 h-6" />
            </button>
        </div>
    );
};
