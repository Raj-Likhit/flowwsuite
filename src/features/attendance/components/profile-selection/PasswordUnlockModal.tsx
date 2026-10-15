import React from 'react';
import { motion } from 'framer-motion';
import { Check, Eye } from 'lucide-react';
import { GlassCard } from '../../../../shared/components/GlassCard';
import { clsx } from 'clsx';
import type { Profile } from '../../store/useAttendanceStore';

interface PasswordUnlockModalProps {
    profile: Profile | null;
    enteredPassword: string;
    setEnteredPassword: (pwd: string) => void;
    passwordError: boolean;
    setPasswordError: (err: boolean) => void;
    onClose: () => void;
    onUnlock: () => void;
    onViewAttendance: () => void;
}

export const PasswordUnlockModal: React.FC<PasswordUnlockModalProps> = ({
    profile,
    enteredPassword,
    setEnteredPassword,
    passwordError,
    setPasswordError,
    onClose,
    onUnlock,
    onViewAttendance,
}) => {
    if (!profile) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
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
                className="relative z-10 w-full max-w-sm p-8 sm:p-10 border border-white/5 text-center"
            >
                <div className="w-20 h-20 rounded-full mx-auto mb-6 overflow-hidden border-2 border-primary-500/30">
                    <img 
                        src={profile.avatar_url} 
                        alt={profile.name} 
                        className="w-full h-full object-cover"
                    />
                </div>
                <h3 className="text-xl font-black text-white mb-2 uppercase tracking-tighter">
                    Hello, {profile.name}
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
                                onUnlock();
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

                    <div className="space-y-4">
                        <div className="flex gap-4">
                            <motion.button
                                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                onClick={onClose}
                                className="flex-1 py-4 rounded-2xl bg-white/5 text-white/40 font-black uppercase tracking-widest text-[10px]"
                            >
                                Cancel
                            </motion.button>
                            <motion.button
                                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                onClick={onUnlock}
                                className="flex-[2] py-4 rounded-2xl accent-gradient text-white font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2"
                            >
                                <Check className="w-3.5 h-3.5" />
                                Unlock
                            </motion.button>
                        </div>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={onViewAttendance}
                            className="w-full py-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/70 font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-colors"
                        >
                            <Eye className="w-3.5 h-3.5" />
                            View Attendance
                        </motion.button>
                    </div>
                </div>
            </GlassCard>
        </div>
    );
};
