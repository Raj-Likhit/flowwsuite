import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RefreshCw, FileDown, RotateCcw, User, Plus, CheckCircle2, X, AlertTriangle, Eye } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useAttendanceStore } from '../store/useAttendanceStore';
import { ProgressRing } from '../../../shared/components/ProgressRing';
import { PremiumButton } from '../../../shared/components/PremiumButton';
import { AttendanceControls } from './AttendanceControls';
import { useAttendanceReport } from './useAttendanceReport';
import { ProfileSelection } from './ProfileSelection';
import { SafeDangerCards } from './SafeDangerCards';
import { CustomGoalSection } from './CustomGoalSection';
import { AuditTrail } from './AuditTrail';
import { ProfileNotes } from './ProfileNotes';
import { supabase } from '../../../core/lib/supabase';
import { clsx } from 'clsx';
import { toast } from 'sonner';
import { AnnouncementModal } from '../../../shared/components/AnnouncementModal';

interface Announcement {
    id: string;
    content: string;
    target_profile_ids: string[] | null;
    created_at: string;
    seen_by_profile_ids?: string[] | null;
}

const formatRelativeTime = (ts: number): string => {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
};

export const AttendanceView: React.FC = () => {
    const activeProfile = useAttendanceStore(state => state.activeProfile);
    const setActiveProfile = useAttendanceStore(state => state.setActiveProfile);
    const accessMode = useAttendanceStore(state => state.accessMode);
    const loading = useAttendanceStore(state => state.loading);
    const setLoading = useAttendanceStore(state => state.setLoading);
    const updateAttendance = useAttendanceStore(state => state.updateAttendance);
    const deleteLog = useAttendanceStore(state => state.deleteLog);
    const hideProfileName = useAttendanceStore(state => state.hideProfileName);
    const syncFromCloud = useAttendanceStore(state => state.syncFromCloud);
    const lastSyncedAt = useAttendanceStore(state => state.lastSyncedAt);

    const [syncSuccess, setSyncSuccess] = useState(false);
    const [syncError, setSyncError] = useState<string | null>(null);
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [activeAnnouncement, setActiveAnnouncement] = useState<Announcement | null>(null);
    const { generateReport } = useAttendanceReport();
    const isSyncing = useRef(false);
    const isReadOnly = accessMode === 'readOnly';
    const activeProfileId = activeProfile?.id;

    // Fetch cloud data on mount
    useEffect(() => {
        if (!activeProfileId || isReadOnly) return;
        syncFromCloud(activeProfileId).then((result) => {
            if (result === 'updated') {
                toast.info('Data refreshed from cloud');
            }
        });
    }, [activeProfileId, isReadOnly, syncFromCloud]);

    // Fetch announcements on mount
    useEffect(() => {
        const fetchAnnouncement = async () => {
            if (isReadOnly || !supabase || !activeProfile) {
                if (isReadOnly) setActiveAnnouncement(null);
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('announcements')
                    .select('id, content, target_profile_ids, created_at, seen_by_profile_ids')
                    .eq('is_active', true)
                    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
                    .or(`target_profile_ids.is.null,target_profile_ids.cs.{${activeProfile.id}}`)
                    .order('created_at', { ascending: false })
                    .limit(10); // Fetch top 10 to find first unseen

                if (data && !error && activeProfile) {
                    const unread = data.find(a => !a.seen_by_profile_ids?.includes(activeProfile.id));
                    if (unread) {
                        setActiveAnnouncement(unread);
                    }
                }
            } catch (err) {
                console.error("Graceful Fallback: Failed to fetch announcements:", err);
            }
        };

        if (activeProfile && !isReadOnly) {
            fetchAnnouncement();
        }
    }, [activeProfile, isReadOnly]);

    useEffect(() => {
        if (isReadOnly) {
            setShowResetConfirm(false);
            setSyncSuccess(false);
            setSyncError(null);
            setActiveAnnouncement(null);
        }
    }, [isReadOnly]);

    const handleDismissAnnouncement = async () => {
        if (activeAnnouncement && activeProfile) {
            const annId = activeAnnouncement.id;
            setActiveAnnouncement(null);
            
            if (supabase) {
                try {
                    await supabase.rpc('mark_announcement_seen', {
                        announcement_id: annId,
                        p_id: activeProfile.id
                    });
                } catch (err) {
                    console.error("Failed to mark announcement as seen", err);
                }
            }
        }
    };

    const handleSync = async () => {
        if (!activeProfile || isSyncing.current || isReadOnly || !supabase) return;
        
        isSyncing.current = true;
        setLoading(true);

        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    attended: activeProfile.attended,
                    total: activeProfile.total,
                    target_goal: activeProfile.targetGoal ?? 75,
                    logs: activeProfile.logs ?? [],
                    notes: activeProfile.notes ?? '',
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
        } catch (err: unknown) {
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
        <div className="min-h-screen bg-black text-white p-4 sm:p-6 relative overflow-x-hidden select-none">
            <Helmet>
                <title>Attendance Tracker | Flowwsuite</title>
                <meta name="description" content="Calculate the exact minimum days needed to maintain your 75% college attendance. Secure, fast, and entirely client-side." />
                <meta property="og:title" content="Attendance Tracker | Flowwsuite" />
                <meta property="og:description" content="Calculate the exact minimum days needed to maintain your 75% college attendance. Secure, fast, and entirely client-side." />
            </Helmet>
            {/* Header Area */}
            <div className="flex items-center mb-8 max-w-md mx-auto">
                <motion.button
                    whileHover={{ scale: 1.2, x: -4 }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    onClick={() => setActiveProfile(null)}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors flex items-center justify-center relative -left-2 group"
                    aria-label="Back to profiles"
                >
                    <ArrowLeft className="w-5 h-5 text-white/40 group-hover:text-white transition-colors" />
                </motion.button>
            </div>

            <h1 className="sr-only">
                Attendance Tracker: Calculate the minimum classes required to maintain a 75% attendance rule.
            </h1>
            <div className="text-center mb-8" aria-hidden="true">
                <div className="text-2xl font-black tracking-tight">
                    Floww<span className="text-primary-500">suite</span>
                </div>
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

            <div className="max-w-md mx-auto space-y-6 sm:space-y-12 pb-24 sm:pb-32 px-4 sm:px-0">
                {/* Profile Chip */}
                <div className="flex justify-center">
                    <div className="flex flex-wrap items-center justify-center gap-2">
                        <div className="px-4 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/20">
                            <span className={clsx(
                                "text-[10px] font-black uppercase text-primary-400 transition-all duration-300 select-none",
                                hideProfileName ? "blur-[6px] pointer-events-none opacity-50" : ""
                            )}>
                                Student: {activeProfile.name}
                            </span>
                        </div>
                        {isReadOnly && (
                            <div className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                                <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white/60">
                                    <Eye className="w-3 h-3" />
                                    Read Only
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                <AttendanceControls
                    totalCount={totalCount}
                    attendedCount={attendedCount}
                    onUpdate={(newAttended, newTotal) => {
                        updateAttendance(newAttended, newTotal);
                    }}
                    readOnly={isReadOnly}
                />

                <div className="relative flex flex-col items-center justify-center py-2 sm:py-4">
                    <div className="sm:hidden scale-90 origin-center">
                        <ProgressRing percentage={percentage} size={220} strokeWidth={14} />
                    </div>
                    <div className="hidden sm:block">
                        <ProgressRing percentage={percentage} size={260} strokeWidth={16} />
                    </div>
                </div>

                <div className="px-2 sm:px-0">
                    <SafeDangerCards
                        percentage={percentage}
                        attendedCount={attendedCount}
                        totalCount={totalCount}
                    />
                </div>

                <div className="px-2 sm:px-0">
                    <CustomGoalSection
                        percentage={percentage}
                        attendedCount={attendedCount}
                        totalCount={totalCount}
                        readOnly={isReadOnly}
                    />
                </div>

                <div className="px-2 sm:px-0">
                    <ProfileNotes readOnly={isReadOnly} />
                </div>

                <AuditTrail readOnly={isReadOnly} />

                <div className="space-y-4">
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
                        disabled={loading || syncSuccess || isReadOnly}
                        className={clsx(
                            "w-full py-6 rounded-2xl flex items-center justify-center gap-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
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

                    {lastSyncedAt && (
                        <p className="text-center text-[10px] text-white/25 font-medium tracking-wider">
                            Last synced {formatRelativeTime(lastSyncedAt)}
                        </p>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <PremiumButton
                            variant="secondary"
                            onClick={() => {
                                if (isReadOnly) return;
                                generateReport();
                                toast.success('Report successfully generated!');
                            }}
                            disabled={isReadOnly}
                            className="flex items-center justify-center gap-3 py-4 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <FileDown className="w-4 h-4 text-white/40" />
                            <span className="text-[10px] sm:text-xs">Export PDF</span>
                        </PremiumButton>

                        {showResetConfirm ? (
                            <div className="flex gap-2">
                                <PremiumButton
                                    onClick={() => {
                                        if (isReadOnly) return;
                                        updateAttendance(0, 0);
                                        setShowResetConfirm(false);
                                        toast.success('Attendance reset to zero');
                                    }}
                                    disabled={isReadOnly}
                                    className="flex-1 flex items-center justify-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/20 py-4 !shadow-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <span className="text-[10px] sm:text-xs leading-tight">Confirm</span>
                                </PremiumButton>
                                <button
                                    onClick={() => setShowResetConfirm(false)}
                                    className="flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 px-4 rounded-2xl transition-all"
                                >
                                    <X className="w-4 h-4 text-white/40 hover:text-white transition-colors" />
                                </button>
                            </div>
                        ) : (
                            <PremiumButton
                                variant="secondary"
                                onClick={() => {
                                    if (isReadOnly) return;
                                    setShowResetConfirm(true);
                                }}
                                disabled={isReadOnly}
                                className="flex items-center justify-center gap-3 py-4 group disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <RotateCcw className="w-4 h-4 text-white/40 group-hover:text-white transition-colors" />
                                <span className="text-[10px] sm:text-xs">Reset</span>
                            </PremiumButton>
                        )}
                    </div>
                </div>
            </div>

            <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                    if (isReadOnly) return;
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
                disabled={isReadOnly}
                className={clsx(
                    "fixed bottom-[max(7rem,calc(env(safe-area-inset-bottom)+6.5rem))] right-6 w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shadow-2xl transition-all text-white z-[60]",
                    isReadOnly
                        ? "bg-white/10 text-white/30 cursor-not-allowed shadow-none"
                        : "bg-primary-600"
                )}
            >
                <Plus className="w-5 h-5 sm:w-6 sm:h-6" />
            </motion.button>

            {!isReadOnly && (
                <AnnouncementModal 
                    announcement={activeAnnouncement} 
                    onClose={handleDismissAnnouncement} 
                />
            )}
        </div>
    );
};
