import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StickyNote, Check, Copy, Save, Sparkles } from 'lucide-react';
import { useAttendanceStore } from '../store/useAttendanceStore';
import { GlassCard } from '../../../shared/components/GlassCard';
import { supabase } from '../../../core/lib/supabase';
import { createProfileRepository } from '../repository/profileRepository';
import { clsx } from 'clsx';
import { toast } from 'sonner';

interface ProfileNotesProps {
    readOnly?: boolean;
}

const MAX_NOTES_LENGTH = 500;
const AUTOSAVE_DELAY_MS = 1200;

export const ProfileNotes: React.FC<ProfileNotesProps> = ({ readOnly = false }) => {
    const activeProfile = useAttendanceStore((state) => state.activeProfile);
    const updateProfile = useAttendanceStore((state) => state.updateProfile);
    
    const [notesText, setNotesText] = useState(activeProfile?.notes || '');
    const [isSaving, setIsSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [copied, setCopied] = useState(false);

    const activeProfileId = activeProfile?.id;
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const savedIndicatorRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingNotesRef = useRef<{ profileId: string; notes: string } | null>(null);

    // Sync local state when active profile changes
    useEffect(() => {
        setNotesText(activeProfile?.notes || '');
    }, [activeProfileId, activeProfile?.notes]);

    const persistNotesToDb = useCallback(async (profileId: string, notes: string) => {
        try {
            const repo = createProfileRepository(supabase);
            if (!repo) return;
            await repo.update(profileId, { notes });
        } catch {
            // Silent fail — data is already saved locally; user can still sync manually
        }
    }, []);

    const flushPendingSave = useCallback(() => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = null;
        }
        if (pendingNotesRef.current) {
            const { profileId, notes } = pendingNotesRef.current;
            pendingNotesRef.current = null;
            void persistNotesToDb(profileId, notes);
        }
    }, [persistNotesToDb]);

    // Unmount cleanup: immediately flush pending debounced notes to prevent data loss
    useEffect(() => {
        return () => {
            flushPendingSave();
            if (savedIndicatorRef.current) clearTimeout(savedIndicatorRef.current);
        };
    }, [flushPendingSave]);

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        if (readOnly) return;
        const val = e.target.value.slice(0, MAX_NOTES_LENGTH);
        setNotesText(val);
        setIsSaved(false);

        // Immediate local store update so it persists to localStorage
        if (activeProfileId) {
            updateProfile(activeProfileId, { notes: val });
            pendingNotesRef.current = { profileId: activeProfileId, notes: val };
        }

        // Debounced write + save indicator
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        if (savedIndicatorRef.current) clearTimeout(savedIndicatorRef.current);
        setIsSaving(true);

        saveTimeoutRef.current = setTimeout(async () => {
            if (pendingNotesRef.current) {
                const { profileId, notes } = pendingNotesRef.current;
                pendingNotesRef.current = null;
                await persistNotesToDb(profileId, notes);
            }
            setIsSaving(false);
            setIsSaved(true);
            savedIndicatorRef.current = setTimeout(() => setIsSaved(false), 2000);
        }, AUTOSAVE_DELAY_MS);
    };

    const handleBlur = () => {
        if (pendingNotesRef.current) {
            flushPendingSave();
            setIsSaving(false);
            setIsSaved(true);
            if (savedIndicatorRef.current) clearTimeout(savedIndicatorRef.current);
            savedIndicatorRef.current = setTimeout(() => setIsSaved(false), 2000);
        }
    };

    const handleCopy = () => {
        if (!notesText.trim()) return;
        navigator.clipboard.writeText(notesText).then(() => {
            setCopied(true);
            toast.success('Notes copied to clipboard!');
            setTimeout(() => setCopied(false), 2000);
        });
    };

    if (!activeProfile || readOnly) return null;

    return (
        <section aria-labelledby="profile-notes-heading" className="w-full">
            <GlassCard className="p-5 sm:p-6 border border-white/10 relative overflow-hidden shadow-xl rounded-2xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-primary-500/10 border border-primary-500/20 text-primary-400">
                            <StickyNote className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 
                                id="profile-notes-heading" 
                                className="text-sm font-black uppercase tracking-wider text-white"
                            >
                                Private Notes
                            </h2>
                            <p className="text-[10px] font-medium text-white/40 tracking-wider">
                                Auto-saved to database
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {notesText.trim() && (
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleCopy}
                                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                                aria-label="Copy notes to clipboard"
                                title="Copy to clipboard"
                            >
                                {copied 
                                    ? <Check className="w-3.5 h-3.5 text-emerald-400" /> 
                                    : <Copy className="w-3.5 h-3.5" />
                                }
                            </motion.button>
                        )}
                        <AnimatePresence mode="wait">
                            {isSaving ? (
                                <motion.span
                                    key="saving"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    className="text-[10px] font-bold text-primary-400 uppercase tracking-widest flex items-center gap-1.5 bg-primary-500/10 px-2.5 py-1 rounded-full border border-primary-500/20"
                                    aria-live="polite"
                                    aria-label="Saving notes..."
                                >
                                    <Save className="w-3 h-3 animate-spin" />
                                    Saving...
                                </motion.span>
                            ) : isSaved ? (
                                <motion.span
                                    key="saved"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20"
                                    aria-live="polite"
                                    aria-label="Notes saved"
                                >
                                    <Sparkles className="w-3 h-3" />
                                    Saved
                                </motion.span>
                            ) : null}
                        </AnimatePresence>
                    </div>
                </div>

                <div className="space-y-3">
                    <label htmlFor="profile-private-notes-input" className="sr-only">
                        Private notes for profile {activeProfile.name}
                    </label>
                    <textarea
                        id="profile-private-notes-input"
                        value={notesText}
                        onChange={handleTextChange}
                        onBlur={handleBlur}
                        disabled={readOnly}
                        rows={3}
                        maxLength={MAX_NOTES_LENGTH}
                        placeholder={
                            readOnly
                                ? "No private notes available."
                                : "Jot down notes — last class registered, assignment deadlines, syllabus highlights..."
                        }
                        className={clsx(
                            "w-full bg-white/5 border border-white/10 rounded-xl p-3.5 text-xs text-white placeholder:text-white/20",
                            "focus:border-primary-500 focus:bg-white/10 outline-none transition-all resize-none font-medium leading-relaxed custom-scrollbar",
                            readOnly && "opacity-60 cursor-not-allowed"
                        )}
                    />

                    <div className="flex items-center justify-between text-[10px] font-semibold text-white/30 px-1">
                        <span>
                            {readOnly ? "Read-Only Mode" : "Private — only visible to you"}
                        </span>
                        <span className={clsx(notesText.length >= MAX_NOTES_LENGTH && "text-amber-400 font-bold")}>
                            {notesText.length}/{MAX_NOTES_LENGTH}
                        </span>
                    </div>
                </div>
            </GlassCard>
        </section>
    );
};
