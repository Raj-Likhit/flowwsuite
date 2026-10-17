import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuthStore, deriveUserRole } from './useAuthStore';
import { supabase } from './supabase';

vi.mock('./supabase', () => ({
    supabase: {
        auth: {
            getSession: vi.fn(),
            signOut: vi.fn(),
            onAuthStateChange: vi.fn(),
        },
    },
}));

describe('useAuthStore (Issue #21)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useAuthStore.setState({
            session: null,
            user: null,
            role: 'guest',
            loading: false,
            error: null,
        });
    });

    describe('deriveUserRole', () => {
        it('returns guest for null or missing session', () => {
            expect(deriveUserRole(null)).toBe('guest');
            expect(deriveUserRole({} as any)).toBe('guest');
        });

        it('returns admin when app_metadata.role is admin', () => {
            const session = {
                user: { id: 'u1', app_metadata: { role: 'admin' } },
            } as any;
            expect(deriveUserRole(session)).toBe('admin');
        });

        it('returns editor when app_metadata.role is editor or undefined', () => {
            const editorSession = {
                user: { id: 'u2', app_metadata: { role: 'editor' } },
            } as any;
            expect(deriveUserRole(editorSession)).toBe('editor');

            const defaultSession = {
                user: { id: 'u3', app_metadata: {} },
            } as any;
            expect(deriveUserRole(defaultSession)).toBe('editor');
        });
    });

    describe('store actions and initialization', () => {
        it('initializeAuth updates session and role from supabase.auth.getSession', async () => {
            const mockSession = {
                user: { id: 'admin-1', app_metadata: { role: 'admin' } },
            } as any;

            vi.mocked(supabase!.auth.getSession).mockResolvedValueOnce({
                data: { session: mockSession },
                error: null,
            } as any);

            await useAuthStore.getState().initializeAuth();

            const state = useAuthStore.getState();
            expect(state.loading).toBe(false);
            expect(state.session).toBe(mockSession);
            expect(state.role).toBe('admin');
            expect(state.user?.id).toBe('admin-1');
        });

        it('handles error in initializeAuth cleanly without throwing', async () => {
            vi.mocked(supabase!.auth.getSession).mockResolvedValueOnce({
                data: { session: null },
                error: { message: 'Failed to retrieve session' } as any,
            });

            await useAuthStore.getState().initializeAuth();

            const state = useAuthStore.getState();
            expect(state.loading).toBe(false);
            expect(state.role).toBe('guest');
            expect(state.error).toBe('Failed to retrieve session');
        });

        it('signOut calls supabase.auth.signOut and resets to guest role', async () => {
            useAuthStore.setState({
                session: { user: { id: 'u1' } } as any,
                role: 'admin',
            });

            await useAuthStore.getState().signOut();

            expect(supabase!.auth.signOut).toHaveBeenCalled();
            expect(useAuthStore.getState().role).toBe('guest');
            expect(useAuthStore.getState().session).toBeNull();
            expect(useAuthStore.getState().loading).toBe(false);
        });
    });
});
