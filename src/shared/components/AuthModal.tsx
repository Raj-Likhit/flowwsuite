import { useState } from 'react';
import GlassSurface from './ui/reactbits/GlassSurface';
import { Button } from './ui/Button';
import { Input } from './Input';
import { supabase } from '../../core/lib/supabase';
import { useAuthStore } from '../../core/lib/useAuthStore';
import { X, Mail, Lock, User, ShieldCheck, Eye } from 'lucide-react';

interface AuthModalProps {
    onClose: () => void;
}

export const AuthModal = ({ onClose }: AuthModalProps) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const { setLoading, setError, error, signInAsGuest } = useAuthStore();

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase) return;

        setLoading(true);
        setError(null);

        try {
            if (isLogin) {
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (signInError) throw signInError;
            } else {
                const { error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { full_name: name, role: 'editor' }
                    }
                });
                if (signUpError) throw signUpError;
            }
            onClose();
        } catch (err: unknown) {
            const error = err as Error;
            setError(error.message || 'An authentication error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleGuestAccess = () => {
        signInAsGuest();
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <GlassSurface className="w-full max-w-md overflow-hidden flex flex-col" borderRadius={32}>
                <div className="p-8 pb-4 relative">
                    <button 
                        onClick={onClose}
                        className="absolute right-6 top-6 p-2 text-white/30 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                    
                    <div className="flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-primary-500/20 rounded-2xl flex items-center justify-center mb-6 border border-primary-500/30">
                            <ShieldCheck className="text-primary-500" size={32} />
                        </div>
                        <h2 className="text-2xl font-black text-white tracking-tight">
                            {isLogin ? 'Welcome Back' : 'Create Account'}
                        </h2>
                        <p className="text-white/60 mt-2 text-sm">
                            {isLogin 
                                ? 'Sign in to access your dashboard and sync data.' 
                                : 'Join Flowwsuite to start tracking your attendance.'}
                        </p>
                    </div>

                    <div className="flex mt-8 bg-white/5 p-1 rounded-xl">
                        <button 
                            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${isLogin ? 'bg-white/10 text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
                            onClick={() => setIsLogin(true)}
                        >
                            Log In
                        </button>
                        <button 
                            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${!isLogin ? 'bg-white/10 text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
                            onClick={() => setIsLogin(false)}
                        >
                            Sign Up
                        </button>
                    </div>

                    <form onSubmit={handleAuth} className="mt-8 space-y-4">
                        {!isLogin && (
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-white/40 uppercase tracking-widest ml-1">Full Name</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                                    <Input 
                                        type="text" 
                                        placeholder="John Doe" 
                                        label="Full Name"
                                        className="pl-12 bg-white/5 border-white/10 text-white focus:border-primary-500/50"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                        )}
                        
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-white/40 uppercase tracking-widest ml-1">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                                <Input 
                                    type="email" 
                                    placeholder="name@example.com" 
                                    label="Email"
                                    className="pl-12 bg-white/5 border-white/10 text-white focus:border-primary-500/50"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-white/40 uppercase tracking-widest ml-1">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                                <Input 
                                    type="password" 
                                    placeholder="••••••••" 
                                    label="Password"
                                    className="pl-12 bg-white/5 border-white/10 text-white focus:border-primary-500/50"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-medium">
                                {error}
                            </div>
                        )}

                        <Button 
                            type="submit" 
                            variant="primary" 
                            className="w-full py-6 mt-4 shadow-[0_8px_32px_rgba(var(--primary-rgb),0.3)]"
                        >
                            {isLogin ? 'Sign In Now' : 'Create My Account'}
                        </Button>
                    </form>

                    <div className="mt-8 flex items-center">
                        <div className="flex-1 h-px bg-white/10"></div>
                        <span className="px-4 text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">or continue with</span>
                        <div className="flex-1 h-px bg-white/10"></div>
                    </div>

                    <div className="mt-6">
                        <Button 
                            variant="ghost" 
                            className="w-full bg-white/5 border border-white/10 hover:bg-white/10 py-5"
                            onClick={handleGuestAccess}
                        >
                            <Eye size={18} className="mr-3 text-white/40" />
                            View-Only Mode
                        </Button>
                    </div>
                </div>
                
                <div className="p-6 bg-white/5 border-t border-white/10 flex justify-center">
                    <p className="text-xs text-white/30">
                        Secure access powered by Flowwsuite RBAC system.
                    </p>
                </div>
            </GlassSurface>
        </div>
    );
};
