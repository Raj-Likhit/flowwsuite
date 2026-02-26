import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, User, Loader2, AlertTriangle } from 'lucide-react';
import { useAttendanceStore } from '../store/useAttendanceStore';
import { supabase } from '../../../core/lib/supabase';
import { GlassCard } from '../../../shared/components/GlassCard';
import { clsx } from 'clsx';

export const ProfileSelection: React.FC = () => {
    const { setProfiles, profiles, setActiveProfile, setLoading, loading } = useAttendanceStore();
    const [isAdding, setIsAdding] = useState(false);
    const [newName, setNewName] = useState('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [selectedAvatar, setSelectedAvatar] = useState('https://api.dicebear.com/7.x/avataaars/svg?seed=Lucky');

    const avatars = [
        'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Tiger&backgroundColor=ff8c00',
        'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Lion&backgroundColor=ffd700',
        'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Cat&backgroundColor=b0c4de',
        'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Dog&backgroundColor=ffa07a',
        'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Elephant&backgroundColor=dda0dd',
        'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Eagle&backgroundColor=f0e68c',
        'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Pigeon&backgroundColor=d3d3d3',
    ];

    useEffect(() => {
        fetchProfiles();
    }, []);

    const fetchProfiles = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: true });

            if (error) throw error;
            if (data) setProfiles(data);
        } catch (err: any) {
            console.error('Error fetching profiles:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim()) return;

        setLoading(true);
        setErrorMsg(null);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .insert([{
                    name: newName.trim(),
                    avatar_url: selectedAvatar,
                    attended: 0,
                    total: 0
                }])
                .select()
                .single();

            if (error) {
                if (error.code === '42703') {
                    setErrorMsg('Database Schema Mismatch: Please run the SQL command provided to add "attended", "total", and "avatar_url" columns to your profiles table.');
                } else {
                    setErrorMsg('Error creating profile: ' + error.message);
                }
                throw error;
            }

            if (data) {
                setProfiles([...profiles, data]);
                setNewName('');
                setIsAdding(false);
            }
        } catch (err: any) {
            console.error('Error creating profile:', err);
            if (!err.code && !errorMsg) { // if not a supabase error that we already set
                setErrorMsg('Failed to create profile. Check your connection or Supabase settings.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 pb-32 bg-gradient-to-b from-indigo-950/20 to-transparent">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center mb-10 sm:mb-16"
            >
                <h2 className="text-4xl sm:text-5xl font-black text-white mb-4 tracking-tighter px-4">
                    Who's <span className="text-gradient animate-pulse">Studying?</span>
                </h2>
                <p className="text-white/40 text-[10px] sm:text-sm font-medium tracking-widest uppercase">Select your profile to continue</p>
            </motion.div>

            {loading && profiles.length === 0 ? (
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                    <span className="text-white/20 animate-pulse uppercase tracking-[0.2em] text-[10px] font-bold">Loading...</span>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-8 max-w-5xl">
                    <AnimatePresence>
                        {profiles.map((profile) => (
                            <motion.button
                                key={profile.id}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                whileHover={{ scale: 1.08, y: -8 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setActiveProfile(profile)}
                                className="group flex flex-col items-center gap-5"
                            >
                                <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl p-1 bg-gradient-to-br from-indigo-500/20 via-transparent to-purple-500/20 group-hover:from-indigo-500 group-hover:to-purple-500 transition-all duration-500 shadow-2xl relative">
                                    <div className="w-full h-full rounded-[1.4rem] glass-strong flex items-center justify-center overflow-hidden relative">
                                        {profile.avatar_url ? (
                                            <img src={profile.avatar_url} alt={profile.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                        ) : (
                                            <User className="w-14 h-14 text-white/10 group-hover:text-white/40 transition-colors" />
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
                                            <span className="text-[10px] font-black uppercase text-white tracking-widest">Go</span>
                                        </div>
                                    </div>
                                </div>
                                <span className="text-white/50 text-base font-bold group-hover:text-white group-hover:drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] transition-all">
                                    {profile.name}
                                </span>
                            </motion.button>
                        ))}

                        <motion.button
                            layout
                            whileHover={{ scale: 1.05, rotate: 1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setIsAdding(true)}
                            className="group flex flex-col items-center gap-5"
                        >
                            <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl border-2 border-dashed border-white/10 group-hover:border-indigo-500 group-hover:bg-indigo-500/5 transition-all flex items-center justify-center">
                                <Plus className="w-12 h-12 text-white/10 group-hover:text-indigo-400 group-hover:rotate-90 transition-all duration-500" />
                            </div>
                            <span className="text-white/20 font-bold group-hover:text-white/40 transition-colors">
                                Add Profile
                            </span>
                        </motion.button>
                    </AnimatePresence>
                </div>
            )}

            {/* Add Profile Modal */}
            <AnimatePresence>
                {isAdding && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsAdding(false)}
                            className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl"
                        />
                        <GlassCard
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative z-10 w-full max-w-md p-6 sm:p-10 border border-white/5"
                        >
                            <h3 className="text-2xl sm:text-3xl font-black text-white mb-6 tracking-tighter">New Profile</h3>

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

                            <form onSubmit={handleAddProfile} className="space-y-6 sm:space-y-8">
                                <div className="space-y-4">
                                    <label className="block text-[10px] uppercase tracking-[0.3em] text-white/30 font-black">
                                        Choose Avatar
                                    </label>
                                    <div className="grid grid-cols-3 gap-4 pb-2">
                                        {avatars.map((url) => (
                                            <button
                                                key={url}
                                                type="button"
                                                onClick={() => setSelectedAvatar(url)}
                                                className={clsx(
                                                    "w-full aspect-square rounded-2xl overflow-hidden border-2 transition-all p-1",
                                                    selectedAvatar === url
                                                        ? "border-indigo-500 bg-indigo-500/20 scale-105 shadow-[0_0_20px_rgba(99,102,241,0.3)]"
                                                        : "border-transparent bg-white/5 hover:bg-white/10"
                                                )}
                                            >
                                                <img src={url} alt="Avatar option" className="w-full h-full object-cover" />
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-[10px] uppercase tracking-[0.3em] text-white/30 font-black">
                                        Enter Name
                                    </label>
                                    <input
                                        autoFocus
                                        type="text"
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value.slice(0, 15))}
                                        placeholder="Enter name..."
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white text-lg outline-none focus:border-indigo-500 focus:bg-white/10 transition-all font-bold"
                                    />
                                </div>
                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsAdding(false)}
                                        className="flex-1 py-4 rounded-2xl bg-white/5 text-white/40 font-black hover:bg-white/10 transition-colors uppercase tracking-widest text-[10px]"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-[2] py-4 rounded-2xl accent-gradient text-white font-black shadow-2xl shadow-indigo-500/30 uppercase tracking-widest text-[10px] hover:scale-[1.02] active:scale-[0.98] transition-transform"
                                    >
                                        Initialize Profile
                                    </button>
                                </div>
                            </form>
                        </GlassCard>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
