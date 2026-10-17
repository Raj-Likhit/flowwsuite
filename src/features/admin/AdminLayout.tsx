import { type ReactNode, useState } from 'react';
import { useAuthStore } from '../../core/lib/useAuthStore';
import { supabase } from '../../core/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Loader2, Lock, ArrowRight, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '../../shared/components/GlassCard';

interface AdminLayoutProps {
    children: ReactNode;
}

export const AdminLayout = ({ children }: AdminLayoutProps) => {
    const { role, loading, user, signOut } = useAuthStore();
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="animate-spin text-primary-500" size={40} />
            </div>
        );
    }

    const hasAccess = Boolean(user && role === 'admin');

    if (!hasAccess) {
        const handleLogin = async (e: React.FormEvent) => {
            e.preventDefault();
            if (!supabase) {
                setErrorMsg('Supabase client unavailable.');
                return;
            }

            setSubmitting(true);
            setErrorMsg(null);

            try {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (error) throw error;

                const userRole = data.user?.app_metadata?.role;
                if (userRole !== 'admin') {
                    setErrorMsg('Account authenticated, but lacks administrator privileges.');
                }
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : 'Invalid administrator credentials.';
                setErrorMsg(message);
                setPassword('');
            } finally {
                setSubmitting(false);
            }
        };

        return (
            <div className="min-h-screen flex items-start sm:items-center justify-center p-6 pt-16 sm:pt-6 selection:bg-red-500/30">
                {/* Background */}
                <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-500/[0.02] rounded-full blur-[80px]" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[length:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full max-w-md"
                >
                    <GlassCard className="p-8 sm:p-12" glow>
                        <div className="flex flex-col items-center w-full gap-8">
                            {/* Status chip */}
                            <div className="px-4 py-1.5 bg-red-500/10 border border-red-500/20 rounded-full flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                                <span className="text-[9px] font-black uppercase text-red-400 tracking-[0.2em]">Restricted Node</span>
                            </div>

                            {/* Lock icon */}
                            <div className="w-20 h-20 bg-red-500/10 rounded-[28px] flex items-center justify-center border border-red-500/20 shadow-xl shadow-red-500/5">
                                <Lock className="text-red-400" size={36} />
                            </div>

                            {/* Title */}
                            <div className="space-y-3 text-center">
                                <h2 className="text-4xl font-black text-white tracking-tighter italic uppercase">
                                    Access <span className="text-red-500">Denied</span>
                                </h2>
                                <p className="text-white/30 text-[10px] font-bold tracking-[0.3em] uppercase">
                                    Admin authentication required
                                </p>
                            </div>

                            {/* Authentication form */}
                            <form onSubmit={handleLogin} className="w-full space-y-4 max-w-sm">
                                <div className="space-y-3">
                                    <input
                                        type="email"
                                        placeholder="admin@example.com"
                                        value={email}
                                        onChange={e => { setEmail(e.target.value); setErrorMsg(null); }}
                                        required
                                        className="w-full bg-white/5 border border-white/10 focus:border-primary-500/60 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 outline-none transition-all"
                                    />
                                    <div className="relative">
                                        <input
                                            type="password"
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={e => { setPassword(e.target.value); setErrorMsg(null); }}
                                            required
                                            className={`w-full bg-white/5 border ${errorMsg ? 'border-red-500/60 focus:border-red-500' : 'border-white/10 focus:border-primary-500/60'} rounded-xl px-4 py-3 pr-12 text-sm text-white placeholder:text-white/20 outline-none transition-all`}
                                        />
                                        <button
                                            type="submit"
                                            disabled={submitting}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-white/40 hover:text-white transition-colors disabled:opacity-50"
                                            aria-label="Submit"
                                        >
                                            {submitting ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                                        </button>
                                    </div>
                                </div>

                                <AnimatePresence>
                                    {errorMsg && (
                                        <motion.p
                                            initial={{ opacity: 0, y: -4 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0 }}
                                            className="text-[11px] text-red-400 font-bold text-center"
                                        >
                                            {errorMsg}
                                        </motion.p>
                                    )}
                                </AnimatePresence>
                            </form>

                            <div className="pt-2 border-t border-white/5 text-center w-full">
                                <button
                                    onClick={() => navigate('/')}
                                    className="px-5 py-2 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all text-[10px] font-black uppercase tracking-[0.2em]"
                                >
                                    Return Home
                                </button>
                            </div>
                        </div>
                    </GlassCard>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen text-white selection:bg-primary-500/30">
            {/* Navbar */}
            <nav className="border-b border-white/5 glass-new sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-8 h-14 sm:h-16 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 sm:w-9 sm:h-9 flex-shrink-0 bg-primary-600 rounded-xl flex items-center justify-center shadow-md shadow-primary-500/20">
                            <ShieldCheck size={16} className="text-black" />
                        </div>
                        <div className="min-w-0">
                            <span className="font-black text-sm sm:text-base tracking-tighter block italic truncate">
                                ADMIN <span className="text-primary-500">PORTAL</span>
                            </span>
                            <span className="text-[7px] sm:text-[8px] font-bold text-white/25 uppercase tracking-widest hidden sm:block">Flowwsuite v2.0</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 sm:gap-6 flex-shrink-0">
                        <div className="hidden md:flex items-center gap-2 bg-white/[0.03] py-1.5 px-3.5 rounded-full border border-white/8">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full shadow-[0_0_6px_rgba(34,197,94,0.5)]" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Systems Stable</span>
                        </div>
                        <button
                            onClick={async () => {
                                await signOut();
                                navigate('/');
                            }}
                            className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 hover:text-white transition-colors flex items-center gap-1.5 group"
                        >
                            <span className="hidden sm:inline">Exit Portal</span>
                            <span className="sm:hidden">Exit</span>
                            <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
                        </button>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                >
                    {children}
                </motion.div>
            </main>
        </div>
    );
};
