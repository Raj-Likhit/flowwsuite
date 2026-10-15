import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Loader2, RefreshCw } from 'lucide-react';
import { useAttendanceStore, type Profile } from '../store/useAttendanceStore';
import { supabase } from '../../../core/lib/supabase';
import { createProfileRepository, ProfileRepository } from '../repository/profileRepository';
import { clsx } from 'clsx';
import { toast } from 'sonner';
import { ProfilePicturePicker } from '../../../shared/components/ProfilePicturePicker';
import { ProfileCard } from './profile-selection/ProfileCard';
import { AddProfileModal } from './profile-selection/AddProfileModal';
import { PasswordUnlockModal } from './profile-selection/PasswordUnlockModal';
import { useProfileAuth } from '../hooks/useProfileAuth';

export const ProfileSelection: React.FC = () => {
    const profiles = useAttendanceStore(state => state.profiles);
    const loading = useAttendanceStore(state => state.loading);
    const setProfiles = useAttendanceStore(state => state.setProfiles);
    const setLoading = useAttendanceStore(state => state.setLoading);
    const updateProfile = useAttendanceStore(state => state.updateProfile);

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [newName, setNewName] = useState('');
    const [selectedAvatar, setSelectedAvatar] = useState('');
    const [customAvatarBlob, setCustomAvatarBlob] = useState<Blob | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [showPicker, setShowPicker] = useState(false);

    // Refresh state
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Auth state hook
    const {
        passwordPromptProfile,
        setPasswordPromptProfile,
        enteredPassword,
        setEnteredPassword,
        passwordError,
        setPasswordError,
        closePasswordPrompt,
        unlockProfile,
        viewAttendance,
    } = useProfileAuth();

    const fetchProfiles = useCallback(async (isRefresh = false) => {
        if (isRefresh) setIsRefreshing(true);
        else setLoading(true);

        const repo = createProfileRepository(supabase);
        if (!repo) {
            if (isRefresh) setIsRefreshing(false);
            else setLoading(false);
            return;
        }

        try {
            const data = await repo.fetchAll();
            setProfiles(data);
            if (isRefresh) toast.success('Profiles refreshed');
        } catch (err: unknown) {
            console.error('Error fetching profiles:', err);
            if (isRefresh) toast.error('Failed to refresh profiles');
        } finally {
            if (isRefresh) setIsRefreshing(false);
            else setLoading(false);
        }
    }, [setLoading, setProfiles]);

    useEffect(() => {
        fetchProfiles();
    }, [fetchProfiles]);

    const openAddModal = () => {
        setNewName('');
        setSelectedAvatar('');
        setCustomAvatarBlob(null);
        setNewPassword('');
        setErrorMsg(null);
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setErrorMsg(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim()) { setErrorMsg('Please enter a profile name.'); return; }
        if (!selectedAvatar && !customAvatarBlob) { setErrorMsg('Please select an avatar.'); return; }

        setSubmitting(true);
        setErrorMsg(null);

        try {
            const { uploadAvatar } = useAttendanceStore.getState();
            
            const isCustom = selectedAvatar.startsWith('blob:');
            const initialAvatarUrl = isCustom ? '' : selectedAvatar;

            const repo = createProfileRepository(supabase);
            if (!repo) throw new Error('Supabase not initialized');
            
            const hashedPassword = await ProfileRepository.hashPassword(newPassword || '123');

            const newProfile = await repo.create({ 
                name: newName.trim(), 
                avatar_url: initialAvatarUrl, 
                password: hashedPassword,
                attended: 0, 
                total: 0 
            });
            
            const finalId = newProfile?.id || '';
            if (newProfile) {
                setProfiles([...profiles, newProfile]);
            }
            toast.success('Profile created!');

            if (customAvatarBlob && finalId) {
                const publicUrl = await uploadAvatar(finalId, customAvatarBlob);
                if (publicUrl) {
                    await repo.update(finalId, { avatar_url: publicUrl, is_flagged: true });
                    updateProfile(finalId, { avatar_url: publicUrl });
                }
            }

            closeModal();
        } catch (err: unknown) {
            const error = err as Error;
            console.error(error);
            setErrorMsg(error.message ?? 'Something went wrong. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSelectProfile = (profile: Profile) => {
        if (profile.is_suspended) {
            toast.error('This profile has been suspended. Contact your administrator.');
            return;
        }
        setPasswordPromptProfile(profile);
        setEnteredPassword('');
        setPasswordError(false);
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-start p-4 sm:p-6 pb-44 pt-12 sm:pt-24 bg-gradient-to-b from-primary-600/10 to-transparent">
            {/* Header */}
            <div className="w-full max-w-5xl flex items-start justify-between mb-10 sm:mb-16">
                <div className="flex-1" />
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center select-none"
                >
                    <h2 className="text-3xl sm:text-5xl font-black text-white mb-4 tracking-tighter px-4 leading-tight sm:leading-none">
                        Who's <span className="text-gradient animate-pulse">Studying?</span>
                    </h2>
                    <p className="text-white/40 text-[10px] sm:text-sm font-medium tracking-widest uppercase">
                        Select your profile to continue
                    </p>
                </motion.div>

                {/* Refresh Button */}
                <div className="flex-1 flex justify-end pt-2">
                    <motion.button
                        onClick={(e) => { e.stopPropagation(); fetchProfiles(true); }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        disabled={isRefreshing}
                        className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 flex items-center justify-center text-white/40 hover:text-white transition-all"
                        aria-label="Refresh profiles"
                    >
                        <RefreshCw className={clsx('w-4 h-4', isRefreshing && 'animate-spin text-primary-400')} />
                    </motion.button>
                </div>
            </div>

            {loading && profiles.length === 0 ? (
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
                    <span className="text-white/20 animate-pulse uppercase tracking-[0.2em] text-[10px] font-bold">Loading...</span>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-8 max-w-5xl px-2 sm:px-0">
                    <AnimatePresence>
                        {profiles.map((profile) => (
                            <ProfileCard
                                key={profile.id}
                                profile={profile}
                                onSelect={handleSelectProfile}
                            />
                        ))}

                        {/* Add new profile */}
                        <motion.button
                            layout
                            whileHover={{ scale: 1.05, rotate: 1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => { e.stopPropagation(); openAddModal(); }}
                            className="group flex flex-col items-center gap-5"
                        >
                            <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl border-2 border-dashed border-white/10 group-hover:border-primary-500 group-hover:bg-primary-500/5 transition-all flex items-center justify-center glass-tubular">
                                <Plus className="w-12 h-12 text-white/10 group-hover:text-primary-400 group-hover:rotate-90 transition-all duration-500" />
                            </div>
                            <span className="text-white/20 font-bold group-hover:text-white group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.2)] transition-colors select-none">Add Profile</span>
                        </motion.button>
                    </AnimatePresence>
                </div>
            )}

            {/* Add Profile Modal */}
            <AnimatePresence>
                <AddProfileModal
                    isOpen={modalOpen}
                    onClose={closeModal}
                    newName={newName}
                    setNewName={setNewName}
                    newPassword={newPassword}
                    setNewPassword={setNewPassword}
                    selectedAvatar={selectedAvatar}
                    setSelectedAvatar={setSelectedAvatar}
                    customAvatarBlob={customAvatarBlob}
                    setCustomAvatarBlob={setCustomAvatarBlob}
                    errorMsg={errorMsg}
                    submitting={submitting}
                    onSubmit={handleSubmit}
                    onOpenPicker={() => setShowPicker(true)}
                />
            </AnimatePresence>

            {/* Password Prompt Overlay */}
            <AnimatePresence>
                {passwordPromptProfile && (
                    <PasswordUnlockModal
                        profile={passwordPromptProfile}
                        enteredPassword={enteredPassword}
                        setEnteredPassword={setEnteredPassword}
                        passwordError={passwordError}
                        setPasswordError={setPasswordError}
                        onClose={closePasswordPrompt}
                        onUnlock={unlockProfile}
                        onViewAttendance={viewAttendance}
                    />
                )}
            </AnimatePresence>

            {/* Custom Picker Overlay */}
            {showPicker && (
                <ProfilePicturePicker 
                    onCropComplete={(blob) => {
                        const url = URL.createObjectURL(blob);
                        setSelectedAvatar(url);
                        setCustomAvatarBlob(blob);
                        setShowPicker(false);
                    }}
                    onClose={() => setShowPicker(false)}
                />
            )}
        </div>
    );
};
