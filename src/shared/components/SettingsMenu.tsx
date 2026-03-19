import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Eye, EyeOff, Trash2, ShieldAlert, Palette, X, Lock, User, Plus } from 'lucide-react';
import bcrypt from 'bcryptjs';
import { useThemeStore } from '../store/useThemeStore';
import { useAttendanceStore } from '../../features/attendance/store/useAttendanceStore';
import { GlassCard } from './GlassCard';
import { toast } from 'sonner';
import { ProfilePicturePicker } from './ProfilePicturePicker';

export const SettingsMenu: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [newName, setNewName] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [showPicker, setShowPicker] = useState(false);
    const { isHighContrast, toggleHighContrast, theme, setTheme } = useThemeStore();
    const { 
        hideProfileName, 
        toggleHideProfileName, 
        activeProfile, 
        accessMode, 
        updateProfile,
        uploadAvatar 
    } = useAttendanceStore();
    const isReadOnly = accessMode === 'readOnly';

    // Initialize state when menu opens
    React.useEffect(() => {
        if (isOpen && activeProfile) {
            setNewName(activeProfile.name);
            setNewPassword('');
        }
    }, [isOpen, activeProfile]);

    const themes = [
        { id: 'indigo', name: 'Indigo Dream', color: '#6366f1' },
        { id: 'obsidian', name: 'Cyberverse', color: '#06b6d4' },
        { id: 'crimson', name: 'Solar Flare', color: '#f59e0b' },
        { id: 'forest', name: 'Ethereal Nature', color: '#10b981' }
    ] as const;

    return (
        <>
            <motion.button
                whileHover={{ scale: 1.1, rotate: 15 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsOpen(true)}
                className="p-3 bg-white/5 hover:bg-white/10 backdrop-blur-md rounded-full border border-white/10 transition-colors shadow-xl"
                aria-label="Open Settings"
            >
                <Settings className="w-5 h-5 text-white/70" />
            </motion.button>

            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <GlassCard
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative w-full max-w-md p-6 border border-white/10 shadow-2xl flex flex-col max-h-[90vh]"
                        >
                            <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                                <h2 className="text-xl font-black tracking-tight text-white">App Settings</h2>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                                    aria-label="Close Settings"
                                >
                                    <X className="w-5 h-5 text-white/60" />
                                </button>
                            </div>

                            <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar">

                                {/* Accessibility / Visuals */}
                                <div className="space-y-4">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-primary-400 flex items-center gap-2">
                                        <Eye className="w-3 h-3" /> Accessibility & View
                                    </h3>
                                    <div className="bg-black/20 rounded-xl p-4 border border-white/5 flex items-center justify-between">
                                        <div>
                                            <div className="text-sm font-bold text-white/90">High Contrast Mode</div>
                                            <div className="text-xs text-white/40 mt-1">Enhance visibility with distinct colors</div>
                                        </div>
                                        <button
                                            onClick={toggleHighContrast}
                                            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors relative group"
                                            aria-pressed={isHighContrast}
                                            aria-label="Toggle High Contrast"
                                        >
                                            {isHighContrast ? (
                                                <Eye className="w-5 h-5 text-emerald-400" />
                                            ) : (
                                                <EyeOff className="w-5 h-5 text-white/40 group-hover:text-white" />
                                            )}
                                        </button>
                                    </div>
                                    <div className="bg-black/20 rounded-xl p-4 border border-white/5 flex items-center justify-between mt-3">
                                        <div>
                                            <div className="text-sm font-bold text-white/90">Stream Mode (Hide Name)</div>
                                            <div className="text-xs text-white/40 mt-1">Blur your profile name in the main view</div>
                                        </div>
                                        <button
                                            onClick={toggleHideProfileName}
                                            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors relative group"
                                            aria-pressed={hideProfileName}
                                            aria-label="Toggle Hide Profile Name"
                                        >
                                            {hideProfileName ? (
                                                <EyeOff className="w-5 h-5 text-emerald-400" />
                                            ) : (
                                                <Eye className="w-5 h-5 text-white/40 group-hover:text-white" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Themes */}
                                <div className="space-y-4">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-primary-400 flex items-center gap-2">
                                        <Palette className="w-3 h-3" /> Interface Theme
                                    </h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        {themes.map((t) => (
                                            <button
                                                key={t.id}
                                                onClick={() => setTheme(t.id)}
                                                className={`p-3 rounded-xl border flex flex-col items-center gap-3 transition-all ${theme === t.id
                                                    ? 'bg-white/10 border-white/30 shadow-lg'
                                                    : 'bg-black/20 border-white/5 hover:bg-white/5'
                                                    }`}
                                            >
                                                <div
                                                    className="w-6 h-6 rounded-full shadow-inner"
                                                    style={{ backgroundColor: t.color }}
                                                />
                                                <span className="text-xs font-bold text-white/80">{t.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Profile Settings (only when active profile) */}
                                {activeProfile && !isReadOnly && (
                                    <div className="space-y-4 pt-2 border-t border-white/5">
                                        <h3 className="text-[10px] font-black uppercase tracking-widest text-primary-400 flex items-center gap-2">
                                            <User className="w-3 h-3" /> Profile Settings
                                        </h3>
                                        
                                        <div className="bg-black/20 rounded-xl p-5 border border-white/5 space-y-6">
                                            {/* Avatar Update */}
                                            <div className="flex items-center gap-6">
                                                <div className="relative group">
                                                    <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-white/10 group-hover:border-primary-500 transition-colors">
                                                        <img 
                                                            src={activeProfile.avatar_url} 
                                                            alt={activeProfile.name} 
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                    <button 
                                                        onClick={() => setShowPicker(true)}
                                                        className="absolute -bottom-2 -right-2 bg-primary-500 text-white p-2 rounded-lg shadow-lg hover:bg-primary-400 transition-colors"
                                                    >
                                                        <Plus className="w-3 h-3" />
                                                    </button>
                                                </div>
                                                <div className="flex-1">
                                                    <div className="text-sm font-bold text-white/90">Profile Picture</div>
                                                    <div className="text-[10px] text-white/40 mt-1 uppercase tracking-wider">Tap + to update avatar</div>
                                                </div>
                                            </div>

                                            {/* Name Update */}
                                            <div className="space-y-2">
                                                <label className="text-[10px] uppercase tracking-widest text-white/40 font-black">Display Name</label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        placeholder="Profile name..."
                                                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-primary-500 outline-none transition-all"
                                                        value={newName}
                                                        onChange={(e) => setNewName(e.target.value)}
                                                    />
                                                    <button
                                                        onClick={async () => {
                                                            if (!newName.trim()) {
                                                                toast.error("Name cannot be empty");
                                                                return;
                                                            }
                                                            try {
                                                                const { supabase: sp } = await import('../../core/lib/supabase');
                                                                if (sp) {
                                                                    const { error } = await sp
                                                                        .from('profiles')
                                                                        .update({ name: newName.trim() })
                                                                        .eq('id', activeProfile.id);
                                                                    if (error) throw error;
                                                                }
                                                                updateProfile(activeProfile.id, { name: newName.trim() });
                                                                toast.success("Name updated!");
                                                            } catch (err: any) {
                                                                toast.error("Update failed: " + err.message);
                                                            }
                                                        }}
                                                        className="px-4 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[10px] font-black transition-all"
                                                    >
                                                        Update
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Password Update */}
                                            <div className="space-y-2 pt-2 border-t border-white/5">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Lock className="w-3 h-3 text-primary-400" />
                                                    <label className="text-[10px] uppercase tracking-widest text-white/40 font-black">Change Password</label>
                                                </div>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="password"
                                                        placeholder="New password..."
                                                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-primary-500 outline-none transition-all"
                                                        value={newPassword}
                                                        onChange={(e) => setNewPassword(e.target.value)}
                                                    />
                                                    <button
                                                        onClick={async () => {
                                                            if (!newPassword.trim()) {
                                                                toast.error("Please enter a password");
                                                                return;
                                                            }
                                                            const loadingToast = toast.loading("Hashing & saving...");
                                                            try {
                                                                const hashedPassword = await bcrypt.hash(newPassword.trim(), 10);
                                                                const { supabase: sp } = await import('../../core/lib/supabase');
                                                                if (sp) {
                                                                    const { error } = await sp
                                                                        .from('profiles')
                                                                        .update({ password: hashedPassword })
                                                                        .eq('id', activeProfile.id);
                                                                    if (error) throw error;
                                                                }
                                                                updateProfile(activeProfile.id, { password: hashedPassword });
                                                                toast.success("Security updated!", { id: loadingToast });
                                                                setNewPassword('');
                                                            } catch (err: any) {
                                                                toast.error("Update failed: " + err.message, { id: loadingToast });
                                                            }
                                                        }}
                                                        className="px-4 py-2 bg-primary-500 hover:bg-primary-400 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                                                    >
                                                        Update
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Danger Zone */}
                                <div className="space-y-4 pt-2 border-t border-white/5">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-red-400 flex items-center gap-2">
                                        <ShieldAlert className="w-3 h-3" /> Danger Zone
                                    </h3>
                                    <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4 flex flex-col gap-3">
                                        <div className="text-sm font-bold text-white/90">Reset App Data</div>
                                        <div className="text-xs text-white/50 leading-relaxed mb-1">
                                            This will clear local cache and disconnect your profile stream.
                                        </div>
                                        <button
                                            onClick={() => {
                                                if (window.confirm("Are you sure? This clears your local browser cache.")) {
                                                    localStorage.clear();
                                                    window.location.reload();
                                                }
                                            }}
                                            className="flex items-center justify-center gap-2 w-full py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-bold transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Clear Local Data
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </GlassCard>
                    </div>
                )}
            </AnimatePresence>

            {/* Custom Picker Overlay */}
            <AnimatePresence>
                {showPicker && (
                    <ProfilePicturePicker 
                        onCropComplete={async (blob) => {
                            if (!activeProfile) return;
                            const loadingToast = toast.loading("Uploading avatar...");
                            try {
                                const publicUrl = await uploadAvatar(activeProfile.id, blob);
                                if (publicUrl) {
                                    const { supabase: sp } = await import('../../core/lib/supabase');
                                    if (sp) {
                                        await sp.from('profiles').update({ avatar_url: publicUrl }).eq('id', activeProfile.id);
                                    }
                                    updateProfile(activeProfile.id, { avatar_url: publicUrl });
                                    toast.success("Avatar updated!", { id: loadingToast });
                                }
                                setShowPicker(false);
                            } catch (err: any) {
                                toast.error("Upload failed: " + err.message, { id: loadingToast });
                            }
                        }}
                        onClose={() => setShowPicker(false)}
                    />
                )}
            </AnimatePresence>
        </>

    );
};
