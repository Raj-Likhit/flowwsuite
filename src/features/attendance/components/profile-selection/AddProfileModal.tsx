import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, AlertTriangle } from 'lucide-react';
import { GlassCard } from '../../../../shared/components/GlassCard';
import { AVATARS } from '../../constants';
import { clsx } from 'clsx';

interface AddProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    newName: string;
    setNewName: (name: string) => void;
    newPassword: string;
    setNewPassword: (pwd: string) => void;
    selectedAvatar: string;
    setSelectedAvatar: (avatar: string) => void;
    customAvatarBlob: Blob | null;
    setCustomAvatarBlob: (blob: Blob | null) => void;
    errorMsg: string | null;
    submitting: boolean;
    onSubmit: (e: React.FormEvent) => void;
    onOpenPicker: () => void;
}

export const AddProfileModal: React.FC<AddProfileModalProps> = ({
    isOpen,
    onClose,
    newName,
    setNewName,
    newPassword,
    setNewPassword,
    selectedAvatar,
    setSelectedAvatar,
    customAvatarBlob,
    setCustomAvatarBlob,
    errorMsg,
    submitting,
    onSubmit,
    onOpenPicker,
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl"
            />
            <GlassCard
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative z-10 w-full max-w-md p-6 sm:p-10 border border-white/5"
            >
                <h3 className="text-2xl sm:text-3xl font-black text-white mb-6 tracking-tighter select-none">
                    New Profile
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
                    onSubmit={onSubmit} 
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
                                onClick={onOpenPicker}
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="block text-[10px] uppercase tracking-[0.3em] text-white/30 font-black select-none">
                                Name
                            </label>
                            <input
                                autoFocus
                                type="text"
                                value={newName}
                                maxLength={30}
                                onChange={(e) => setNewName(e.target.value.slice(0, 30))}
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
                            onClick={onClose}
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
                                : 'Initialize Profile'}
                        </motion.button>
                    </div>
                </form>
            </GlassCard>
        </div>
    );
};
