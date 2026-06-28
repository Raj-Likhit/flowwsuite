import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = (supabaseUrl && supabaseAnonKey)
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export const isSupabaseAvailable = () => !!supabase;

/**
 * Ensures the Supabase client is available.
 * Throws an error if environment variables are missing, establishing a clear error boundary.
 * 
 * @returns The initialized Supabase client
 * @throws Error if Supabase is not initialized
 */
export const requireSupabase = () => {
    if (!supabase) {
        throw new Error('Supabase environment variables are missing. Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.');
    }
    return supabase;
};

