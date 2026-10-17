import { create } from 'zustand';
import { supabase } from './supabase';
import type { Session, User } from '@supabase/supabase-js';
import { clearStoredSignatures } from '../../features/pdf-engine/hooks/useSignatureStore';

export type UserRole = 'admin' | 'editor' | 'guest';

export const deriveUserRole = (session: Session | null): UserRole => {
    if (!session || !session.user) return 'guest';
    const role = session.user.app_metadata?.role;
    if (role === 'admin') return 'admin';
    if (role === 'editor') return 'editor';
    return 'guest';
};

interface AuthState {
    session: Session | null;
    user: User | null;
    role: UserRole;
    loading: boolean;
    error: string | null;

    setSession: (session: Session | null) => void;
    signInAsGuest: () => void;
    signOut: () => Promise<void>;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    initializeAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    session: null,
    user: null,
    role: 'guest',
    loading: true,
    error: null,

    setSession: (session) => {
        const role = deriveUserRole(session);
        set({ 
            session, 
            user: session?.user ?? null,
            role,
            error: null,
        });
    },

    signInAsGuest: () => set({ 
        session: null, 
        user: null, 
        role: 'guest',
        loading: false,
        error: null,
    }),

    signOut: async () => {
        set({ loading: true });
        try {
            await supabase?.auth.signOut();
        } finally {
            clearStoredSignatures();
            set({ session: null, user: null, role: 'guest', loading: false });
        }
    },

    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),

    initializeAuth: async () => {
        if (!supabase) {
            set({ loading: false });
            return;
        }
        set({ loading: true });
        try {
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error) throw error;
            get().setSession(session);
        } catch (err: unknown) {
            const error = err as Error;
            set({ error: error.message, session: null, user: null, role: 'guest' });
        } finally {
            set({ loading: false });
        }
    },
}));

// Setup listener for auth events
if (supabase) {
    supabase.auth.onAuthStateChange((_event, session) => {
        useAuthStore.getState().setSession(session);
        useAuthStore.getState().setLoading(false);
    });
}
