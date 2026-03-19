import React, { useEffect, useState, useCallback, useRef } from 'react';
import bcrypt from 'bcryptjs';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, User, Loader2, AlertTriangle, Trash2, Pencil, RefreshCw, Check } from 'lucide-react';
import { useAttendanceStore } from '../store/useAttendanceStore';
import { supabase } from '../../../core/lib/supabase';
import { GlassCard } from '../../../shared/components/GlassCard';
import { clsx } from 'clsx';
import { toast } from 'sonner';
import { ProfilePicturePicker } from '../../../shared/components/ProfilePicturePicker';

type ModalMode = 'add' | 'edit';

const AVATARS = [
    'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Tiger&backgroundColor=ff8c00',
    'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Lion&backgroundColor=ffd700',
    'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Cat&backgroundColor=b0c4de',
    'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Dog&backgroundColor=ffa07a',
    'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Rabbit&backgroundColor=ffc0cb',
    'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Fox&backgroundColor=ff4500',
    'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Bear&backgroundColor=8b4513',
    'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Panda&backgroundColor=ffffff',
    'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Wolf&backgroundColor=708090',
    'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Owl&backgroundColor=9370db',
    'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Elephant&backgroundColor=dda0dd',
    'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Eagle&backgroundColor=f0e68c',
    'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Koala&backgroundColor=a9a9a9',
    'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Penguin&backgroundColor=00bfff',
    'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Monkey&backgroundColor=cd853f',
    'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Frog&backgroundColor=32cd32',
];

export const ProfileSelection: React.FC = () => {
    const {
        setProfiles,
        profiles,
        setActiveProfile,
        setLoading,
        loading,
        deleteProfile,
        updateProfile,
    } = useAttendanceStore();

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<ModalMode>('add');
    const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
    const [newName, setNewName] = useState('');
    const [selectedAvatar, setSelectedAvatar] = useState('');
    const [customAvatarBlob, setCustomAvatarBlob] = useState<Blob | null>(null);
    const [newPassword, setNewPassword] = useState('123');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [showPicker, setShowPicker] = useState(false);

    // Edit mode (long-press / tap to toggle) state
    const [editModeId, setEditModeId] = useState<string | null>(null);

    // Delete confirmation
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
    const [deletePassword, setDeletePassword] = useState('');

    // Refresh
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Password Prompt state
    const [passwordPromptProfile, setPasswordPromptProfile] = useState<any | null>(null);
    const [enteredPassword, setEnteredPassword] = useState('');
    const [passwordError, setPasswordError] = useState(false);

    // Long-press logic
    const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const startLongPress = (profileId: string) => {
        pressTimer.current = setTimeout(() => {
            if (navigator.vibrate) navigator.vibrate(40);
            setEditModeId(profileId);
        }, 500);
    };

    const cancelLongPress = () => {
        if (pressTimer.current) clearTimeout(pressTimer.current);
    };

    const fetchProfiles = useCallback(async (isRefresh = false) => {
        if (isRefresh) setIsRefreshing(true);
        else setLoading(true);
        if (!supabase) return;
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: true });
            if (error) throw error;
            if (data) setProfiles(data);
            if (isRefresh) toast.success('Profiles refreshed');
        } catch (err: any) {
            console.error('Error fetching profiles:', err);
            if (isRefresh) toast.error('Failed to refresh profiles');
        } finally {
            if (isRefresh) setIsRefreshing(false);
            else setLoading(false);
        }
    }, [setLoading, setProfiles]);

    useEffect(() => {
        fetchProfiles();
    }, []);

    const openAddModal = () => {
        setModalMode('add');
        setEditingProfileId(null);
        setNewName('');
        setSelectedAvatar('');
        setCustomAvatarBlob(null);
        setNewPassword('123');
        setErrorMsg(null);
        setModalOpen(true);
    };

    const openEditModal = (profileId: string) => {
        const profile = profiles.find((p) => p.id === profileId);
        if (!profile) return;
        setModalMode('edit');
        setEditingProfileId(profileId);
        setNewName(profile.name);
        setSelectedAvatar(profile.avatar_url ?? '');
        setCustomAvatarBlob(null);
        setNewPassword(profile.password ?? '123');
        setErrorMsg(null);
        setEditModeId(null);
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
            let finalId = editingProfileId;
            
            // If it's a blob URL, we don't want to save it to the DB yet
            const isCustom = selectedAvatar.startsWith('blob:');
            const initialAvatarUrl = isCustom ? '' : selectedAvatar;

            if (modalMode === 'add') {
                if (!supabase) throw new Error('Supabase not initialized');
                
                // Hash the new password
                const hashedPassword = await bcrypt.hash(newPassword, 10);

                const { data, error } = await supabase
                    .from('profiles')
                    .insert([{ 
                        name: newName.trim(), 
                        avatar_url: initialAvatarUrl, 
                        password: hashedPassword,
                        attended: 0, 
                        total: 0 
                    }])
                    .select()
                    .single();
                if (error) throw error;
                if (data) {
                    finalId = data.id;
                    setProfiles([...profiles, data]);
                }
                toast.success('Profile created!');
            } else {
                if (!editingProfileId) return;
                if (!supabase) throw new Error('Supabase not initialized');

                const profile = profiles.find(p => p.id === editingProfileId);
                let passwordToSave = newPassword;

                // Only hash if the password has changed (and isn't already a hash)
                // A simple check for $2a$ (bcrypt prefix) to avoid double hashing
                if (newPassword !== profile?.password) {
                    passwordToSave = await bcrypt.hash(newPassword, 10);
                }

                const updates = { 
                    name: newName.trim(), 
                    avatar_url: initialAvatarUrl, 
                    password: passwordToSave 
                };
                const { error } = await supabase
                    .from('profiles')
                    .update(updates)
                    .eq('id', editingProfileId);
                
                // Update local store with the initial changes
                updateProfile(editingProfileId, updates);

                if (error) {
                    console.warn('DB Update partial failure:', error.message);
                } else {
                    toast.success('Profile updated!');
                }
            }

            // Handle custom avatar upload if selected
            if (customAvatarBlob && finalId) {
                const publicUrl = await uploadAvatar(finalId, customAvatarBlob);
                if (publicUrl && supabase) {
                    // Save the permanent URL to Supabase immediately
                    await supabase
                        .from('profiles')
                        .update({ avatar_url: publicUrl })
                        .eq('id', finalId);
                    
                    // Update state locally so UI reflects change immediately
                    updateProfile(finalId, { avatar_url: publicUrl });
                }
            }

            closeModal();
        } catch (err: any) {
            console.error(err);
            setErrorMsg(err.message ?? 'Something went wrong. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const confirmDelete = async (profileId: string) => {
        const profile = profiles.find(p => p.id === profileId);
        if (!profile) return;

        const storedPassword = profile.password || '123';
        const isHashed = typeof storedPassword === 'string' && storedPassword.startsWith('$2');
        let isCorrect = false;

        if (isHashed) {
            isCorrect = await bcrypt.compare(deletePassword, storedPassword);
        } else {
            isCorrect = deletePassword === storedPassword;
        }

        if (!isCorrect) {
            toast.error('Incorrect password');
            if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
            return;
        }

        setPendingDeleteId(null);
        setDeletePassword('');
        if (!supabase) return;
        try {
            const { error } = await supabase.from('profiles').delete().eq('id', profileId);
            if (error) throw error;
            deleteProfile(profileId);
            toast.success('Profile deleted');
        } catch (err: any) {
            console.error(err);
            toast.error('Failed to delete profile');
        }
    };

    return (
        <div
            className="min-h-screen flex flex-col items-center justify-start p-4 sm:p-6 pb-44 pt-12 sm:pt-24 bg-gradient-to-b from-primary-600/10 to-transparent"
            onClick={() => { setEditModeId(null); setPendingDeleteId(null); }}
        >
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
                        {profiles.map((profile) => {
                            const isInEditMode = editModeId === profile.id;
                            const isPendingDelete = pendingDeleteId === profile.id;
                            return (
                                <motion.div
                                    key={profile.id}
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.8, y: -10 }}
                                    className="relative flex flex-col items-center gap-5"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {/* Edit / Delete overlays */}
                                    <AnimatePresence>
                                        {isInEditMode && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.8 }}
                                                className="absolute -top-2 -right-2 z-20 flex gap-1.5"
                                            >
                                                <button
                                                    onClick={() => openEditModal(profile.id)}
                                                    className="w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center shadow-lg shadow-primary-500/30 hover:bg-primary-400 transition-colors"
                                                    aria-label="Edit profile"
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => { setPendingDeleteId(profile.id); setEditModeId(null); }}
                                                    className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-500/30 hover:bg-red-400 transition-colors"
                                                    aria-label="Delete profile"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Delete confirmation */}
                                    <AnimatePresence>
                                        {isPendingDelete && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -8 }}
                                                className="absolute -top-16 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2 bg-red-950/90 border border-red-500/30 rounded-2xl px-3 py-2 backdrop-blur-sm whitespace-nowrap"
                                            >
                                                <span className="text-[10px] font-black uppercase tracking-widest text-red-400">Confirm Deletion</span>
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="password"
                                                            value={deletePassword}
                                                            onChange={(e) => setDeletePassword(e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    confirmDelete(profile.id);
                                                                }
                                                            }}
                                                            placeholder="Enter Password"
                                                            className="w-28 bg-white/5 border border-red-500/30 rounded-lg px-2.5 py-1.5 text-[10px] text-white outline-none focus:border-red-500"
                                                            autoFocus
                                                        />
                                                        <button
                                                            onClick={() => confirmDelete(profile.id)}
                                                            className="w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center hover:bg-red-400 transition-colors shrink-0"
                                                            aria-label="Confirm delete"
                                                        >
                                                            <Check className="w-4 h-4 text-white" />
                                                        </button>
                                                    </div>
                                                    <button
                                                        onClick={() => { setPendingDeleteId(null); setDeletePassword(''); }}
                                                        className="w-full py-1 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors text-[8px] font-black uppercase text-white/30"
                                                        aria-label="Cancel delete"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Profile card button */}
                                    <motion.button
                                        whileHover={!isInEditMode ? { scale: 1.08, y: -8 } : {}}
                                        whileTap={{ scale: 0.95 }}
                                        animate={isInEditMode ? { rotate: [0.5, -0.5, 0.5, -0.5, 0] } : { rotate: 0 }}
                                        transition={isInEditMode
                                            ? { repeat: Infinity, duration: 0.4, ease: "linear" }
                                            : { duration: 0.2, repeat: 0 }
                                        }
                                        onClick={() => {
                                            if (isInEditMode) return;
                                            setPasswordPromptProfile(profile);
                                            setEnteredPassword('');
                                            setPasswordError(false);
                                        }}
                                        onContextMenu={(e) => e.preventDefault()}
                                        onMouseDown={() => startLongPress(profile.id)}
                                        onMouseUp={cancelLongPress}
                                        onMouseLeave={cancelLongPress}
                                        onTouchStart={() => startLongPress(profile.id)}
                                        onTouchEnd={cancelLongPress}
                                        className="group flex flex-col items-center gap-5 select-none no-touch-menu"
                                    >
                                        <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl p-1 bg-gradient-to-br from-primary-500/20 via-transparent to-secondary-500/20 group-hover:from-primary-500 group-hover:to-secondary-500 transition-all duration-500 shadow-2xl relative">
                                            <div className="w-full h-full rounded-[1.4rem] glass-strong flex items-center justify-center overflow-hidden relative">
                                                {profile.avatar_url ? (
                                                    <img
                                                        src={profile.avatar_url}
                                                        alt={profile.name}
                                                        draggable="false"
                                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 select-none pointer-events-none no-touch-menu"
                                                    />
                                                ) : (
                                                    <User className="w-14 h-14 text-white/10 group-hover:text-white/40 transition-colors" />
                                                )}
                                                {!isInEditMode && (
                                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
                                                        <span className="text-[10px] font-black uppercase text-white tracking-widest">Go</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <span className="text-white/50 text-base font-bold group-hover:text-white group-hover:drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] transition-all select-none">
                                            {profile.name}
                                        </span>
                                    </motion.button>
                                </motion.div>
                            );
                        })}

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

            {/* Hint text for long-press */}
            {profiles.length > 0 && (
                <p className="mt-8 mb-12 text-white/20 text-[10px] uppercase tracking-widest font-bold select-none text-center px-6">
                    Hold a profile to edit or delete
                </p>
            )}

            {/* Add / Edit Modal */}
            <AnimatePresence>
                {modalOpen && (
                    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={closeModal}
                            className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl"
                        />
                        <GlassCard
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative z-10 w-full max-w-md p-6 sm:p-10 border border-white/5"
                        >
                            <h3 className="text-2xl sm:text-3xl font-black text-white mb-6 tracking-tighter select-none">
                                {modalMode === 'add' ? 'New Profile' : 'Edit Profile'}
                            </h3>

                            <AnimatePresence>
                                {errorMsg && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, height: 'auto', scale: 1 }}
                                        exit={{ opacity: 0, height: 0, scale: 0.95 }}
                                        className="mb-6 bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-start gap-3 text-red-400"
                                    >
                                        <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                        <div className="text-xs sm:text-sm font-medium leading-relaxed">{errorMsg}</div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <form 
                                onSubmit={handleSubmit} 
                                className="space-y-6 sm:space-y-8 max-h-[60vh] overflow-y-auto pr-4 pb-12 custom-scrollbar"
                            >
                                <div className="space-y-4">
                                    <label className="block text-[10px] uppercase tracking-[0.3em] text-white/30 font-black select-none">
                                        Choose Avatar
                                    </label>
                                    <div className="grid grid-cols-4 gap-3 sm:gap-4 pb-2">
                                        {/* Custom Upload Option */}
                                        <motion.button
                                            whileHover={{ scale: 1.1, rotate: -2 }}
                                            whileTap={{ scale: 0.9 }}
                                            type="button"
                                            onClick={() => setShowPicker(true)}
                                            className={clsx(
                                                'w-full aspect-square rounded-2xl overflow-hidden border-2 border-dashed transition-all p-1 flex flex-col items-center justify-center gap-1',
                                                customAvatarBlob 
                                                    ? 'border-primary-500 bg-primary-500/10' 
                                                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                                            )}
                                        >
                                            {customAvatarBlob ? (
                                                <img src={selectedAvatar} alt="Custom" className="w-full h-full object-cover rounded-xl" />
                                            ) : (
                                                <>
                                                    <Plus className="w-5 h-5 text-primary-400" />
                                                    <span className="text-[8px] font-black uppercase tracking-tighter text-white/40">Custom</span>
                                                </>
                                            )}
                                        </motion.button>

                                        {AVATARS.map((url) => (
                                            <motion.button
                                                whileHover={{ scale: 1.1, rotate: 2 }}
                                                whileTap={{ scale: 0.9 }}
                                                key={url}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedAvatar(url);
                                                    setCustomAvatarBlob(null);
                                                }}
                                                className={clsx(
                                                    'w-full aspect-square rounded-2xl overflow-hidden border-2 transition-all p-1 glass-tubular',
                                                    (selectedAvatar === url && !customAvatarBlob)
                                                        ? '!border-[var(--primary)] !border-4 bg-[var(--accent-start-trans)] shadow-[0_0_30px_var(--accent-start-trans)] scale-110 z-10'
                                                        : 'border-white/5 bg-white/5 hover:bg-white/10'
                                                )}
                                            >
                                                <img src={url} alt="Avatar option" className="w-full h-full object-cover" />
                                            </motion.button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="block text-[10px] uppercase tracking-[0.3em] text-white/30 font-black select-none">
                                            Name
                                        </label>
                                        <input
                                            autoFocus
                                            type="text"
                                            value={newName}
                                            onChange={(e) => setNewName(e.target.value.slice(0, 15))}
                                            placeholder="Enter name..."
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white text-lg outline-none focus:border-primary-500 focus:bg-white/10 transition-all font-bold"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-[10px] uppercase tracking-[0.3em] text-white/30 font-black select-none">
                                            Password
                                        </label>
                                        <input
                                            type="text"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value.slice(0, 10))}
                                            placeholder="Default: 123"
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white text-lg outline-none focus:border-primary-500 focus:bg-white/10 transition-all font-bold"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <motion.button
                                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                        type="button"
                                        onClick={closeModal}
                                        className="flex-1 py-4 rounded-2xl bg-white/5 text-white/40 font-black hover:bg-white/10 transition-colors uppercase tracking-widest text-[10px]"
                                    >
                                        Cancel
                                    </motion.button>
                                    <motion.button
                                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                        type="submit"
                                        disabled={submitting}
                                        className="flex-[2] py-4 rounded-2xl accent-gradient text-white font-black shadow-2xl shadow-primary-500/30 uppercase tracking-widest text-[10px] transition-transform disabled:opacity-50"
                                    >
                                        {submitting
                                            ? 'Saving...'
                                            : modalMode === 'add' ? 'Initialize Profile' : 'Save Changes'}
                                    </motion.button>
                                </div>
                            </form>
                        </GlassCard>
                    </div>
                )}
            </AnimatePresence>

            {/* Password Prompt Overlay */}
            <AnimatePresence>
                {passwordPromptProfile && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setPasswordPromptProfile(null)}
                            className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl"
                        />
                        <GlassCard
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative z-10 w-full max-w-sm p-8 border border-white/5 text-center"
                        >
                            <div className="w-20 h-20 rounded-full mx-auto mb-6 overflow-hidden border-2 border-primary-500/30">
                                <img 
                                    src={passwordPromptProfile.avatar_url} 
                                    alt={passwordPromptProfile.name} 
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <h3 className="text-xl font-black text-white mb-2 uppercase tracking-tighter">
                                Hello, {passwordPromptProfile.name}
                            </h3>
                            <p className="text-white/40 text-[10px] uppercase tracking-[0.2em] font-bold mb-8">
                                Enter your profile password
                            </p>

                            <div className="space-y-6">
                                <input
                                    autoFocus
                                    type="password"
                                    value={enteredPassword}
                                    onChange={(e) => {
                                        setEnteredPassword(e.target.value);
                                        setPasswordError(false);
                                    }}
                                    onKeyDown={async (e) => {
                                        if (e.key === 'Enter') {
                                            let correct = false;
                                            let needsMigration = false;
                                            const stored = passwordPromptProfile.password || '123';
                                            const isHashed = typeof stored === 'string' && stored.startsWith('$2');
                                            
                                            if (isHashed) {
                                                correct = await bcrypt.compare(enteredPassword, stored);
                                            } else {
                                                correct = enteredPassword === stored;
                                                if (correct) needsMigration = true;
                                            }

                                            if (correct) {
                                                setActiveProfile(passwordPromptProfile);
                                                setPasswordPromptProfile(null);

                                                // Background migration
                                                if (needsMigration && supabase) {
                                                    const hashed = await bcrypt.hash(enteredPassword, 10);
                                                    await supabase
                                                        .from('profiles')
                                                        .update({ password: hashed })
                                                        .eq('id', passwordPromptProfile.id);
                                                    updateProfile(passwordPromptProfile.id, { password: hashed });
                                                }
                                            } else {
                                                setPasswordError(true);
                                                if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
                                            }
                                        }
                                    }}
                                    className={clsx(
                                        "w-full bg-white/5 border rounded-2xl px-6 py-5 text-white text-center text-2xl tracking-[0.5em] outline-none transition-all font-black placeholder:text-white/5",
                                        passwordError ? "border-red-500 animate-shake" : "border-white/10 focus:border-primary-500"
                                    )}
                                    placeholder="••••"
                                />

                                {passwordError && (
                                    <motion.p 
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="text-red-400 text-[10px] font-black uppercase tracking-widest"
                                    >
                                        Incorrect Password
                                    </motion.p>
                                )}

                                <div className="flex gap-4">
                                    <motion.button
                                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                        onClick={() => setPasswordPromptProfile(null)}
                                        className="flex-1 py-4 rounded-2xl bg-white/5 text-white/40 font-black uppercase tracking-widest text-[10px]"
                                    >
                                        Cancel
                                    </motion.button>
                                    <motion.button
                                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                        onClick={async () => {
                                            let correct = false;
                                            let needsMigration = false;
                                            const stored = passwordPromptProfile.password || '123';
                                            const isHashed = typeof stored === 'string' && stored.startsWith('$2');
                                            
                                            if (isHashed) {
                                                correct = await bcrypt.compare(enteredPassword, stored);
                                            } else {
                                                correct = enteredPassword === stored;
                                                if (correct) needsMigration = true;
                                            }

                                            if (correct) {
                                                setActiveProfile(passwordPromptProfile);
                                                setPasswordPromptProfile(null);

                                                // Background migration
                                                if (needsMigration && supabase) {
                                                    const hashed = await bcrypt.hash(enteredPassword, 10);
                                                    await supabase
                                                        .from('profiles')
                                                        .update({ password: hashed })
                                                        .eq('id', passwordPromptProfile.id);
                                                    updateProfile(passwordPromptProfile.id, { password: hashed });
                                                }
                                            } else {
                                                setPasswordError(true);
                                            }
                                        }}
                                        className="flex-[2] py-4 rounded-2xl accent-gradient text-white font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2"
                                    >
                                        <Check className="w-3.5 h-3.5" />
                                        Unlock
                                    </motion.button>
                                </div>
                            </div>
                        </GlassCard>
                    </div>
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
