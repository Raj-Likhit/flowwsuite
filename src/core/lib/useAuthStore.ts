import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabase } from './supabase';
import type { Session, User } from '@supabase/supabase-js';

export type UserRole = 'admin' | 'editor' | 'guest';

interface AuthState {
    session: Session | null;
    user: User | null;
    role: UserRole;
    loading: boolean;
    error: string | null;

    setSession: (session: Session | null) => void;
    setRole: (role: UserRole) => void;
    signInAsGuest: () => void;
    signOut: () => Promise<void>;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            session: null,
            user: null,
            role: 'guest',
            loading: false,
            error: null,

            setSession: (session) => set({ 
                session, 
                user: session?.user ?? null,
                role: (session?.user?.app_metadata?.role as UserRole) || (session ? 'editor' : 'guest')
            }),

            setRole: (role) => set({ role }),

            signInAsGuest: () => set({ 
                session: null, 
                user: null, 
                role: 'guest' 
            }),

            signOut: async () => {
                await supabase?.auth.signOut();
                set({ session: null, user: null, role: 'guest' });
            },

            setLoading: (loading) => set({ loading }),
            setError: (error) => set({ error }),
        }),
        {
            name: 'flowwsuite-auth-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
);

// Listen for auth changes
supabase?.auth.onAuthStateChange((_event, session) => {
    useAuthStore.getState().setSession(session);
});
