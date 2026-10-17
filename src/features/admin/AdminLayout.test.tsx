import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminLayout } from './AdminLayout';
import { useAuthStore } from '../../core/lib/useAuthStore';
import { supabase } from '../../core/lib/supabase';

vi.mock('../../core/lib/useAuthStore', () => ({
    useAuthStore: vi.fn(),
}));

let mockSupabaseClient: any = {
    auth: {
        signInWithPassword: vi.fn(),
        signOut: vi.fn(),
    }
};

vi.mock('../../core/lib/supabase', () => ({
    get supabase() {
        return mockSupabaseClient;
    }
}));

describe('AdminLayout', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockSupabaseClient = {
            auth: {
                signInWithPassword: vi.fn(),
                signOut: vi.fn(),
            }
        };
    });

    it('renders Access Denied screen with email and password inputs for unauthenticated users', () => {
        vi.mocked(useAuthStore).mockReturnValue({
            user: null,
            role: 'guest',
            loading: false,
            signOut: vi.fn(),
        } as any);

        render(
            <MemoryRouter>
                <AdminLayout>
                    <div data-testid="admin-content">Admin Protected Area</div>
                </AdminLayout>
            </MemoryRouter>
        );

        expect(screen.getByText(/Access/i)).toBeInTheDocument();
        expect(screen.getByText(/Denied/i)).toBeInTheDocument();
        expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument();

        // Ensure email and password inputs exist for genuine admin authentication
        expect(screen.getByPlaceholderText('admin@example.com')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    });

    it('renders Access Denied screen for authenticated non-admin users', () => {
        vi.mocked(useAuthStore).mockReturnValue({
            user: { id: 'u1', email: 'test@example.com' },
            role: 'editor',
            loading: false,
        } as any);

        render(
            <MemoryRouter>
                <AdminLayout>
                    <div data-testid="admin-content">Admin Protected Area</div>
                </AdminLayout>
            </MemoryRouter>
        );

        expect(screen.getByText(/Access/i)).toBeInTheDocument();
        expect(screen.getByText(/Denied/i)).toBeInTheDocument();
        expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument();
    });

    it('renders children and admin dashboard when user has admin role', () => {
        vi.mocked(useAuthStore).mockReturnValue({
            user: { id: 'admin1', email: 'admin@example.com' },
            role: 'admin',
            loading: false,
        } as any);

        render(
            <MemoryRouter>
                <AdminLayout>
                    <div data-testid="admin-content">Admin Protected Area</div>
                </AdminLayout>
            </MemoryRouter>
        );

        expect(screen.getByTestId('admin-content')).toBeInTheDocument();
        expect(screen.getByText(/Exit Portal/i)).toBeInTheDocument();
        expect(screen.getByText(/Flowwsuite v2.0/i)).toBeInTheDocument();
    });

    it('submits admin credentials to supabase auth when form is submitted', async () => {
        vi.mocked(useAuthStore).mockReturnValue({
            user: null,
            role: 'guest',
            loading: false,
            signOut: vi.fn(),
        } as any);

        vi.mocked(supabase!.auth.signInWithPassword).mockResolvedValue({
            data: { user: { app_metadata: { role: 'admin' } } },
            error: null,
        } as any);

        render(
            <MemoryRouter>
                <AdminLayout>
                    <div data-testid="admin-content">Admin Protected Area</div>
                </AdminLayout>
            </MemoryRouter>
        );

        fireEvent.change(screen.getByPlaceholderText('admin@example.com'), {
            target: { value: 'admin@domain.com' },
        });
        fireEvent.change(screen.getByPlaceholderText('••••••••'), {
            target: { value: 'SuperSecret123!' },
        });

        await act(async () => {
            fireEvent.click(screen.getByLabelText('Submit'));
        });

        expect(supabase!.auth.signInWithPassword).toHaveBeenCalledWith({
            email: 'admin@domain.com',
            password: 'SuperSecret123!',
        });
    });

    it('displays error message when signInWithPassword fails', async () => {
        vi.mocked(useAuthStore).mockReturnValue({
            user: null,
            role: 'guest',
            loading: false,
            signOut: vi.fn(),
        } as any);

        vi.mocked(supabase!.auth.signInWithPassword).mockResolvedValue({
            data: { user: null },
            error: new Error('Invalid login credentials'),
        } as any);

        render(
            <MemoryRouter>
                <AdminLayout>
                    <div data-testid="admin-content">Admin Protected Area</div>
                </AdminLayout>
            </MemoryRouter>
        );

        fireEvent.change(screen.getByPlaceholderText('admin@example.com'), {
            target: { value: 'admin@domain.com' },
        });
        fireEvent.change(screen.getByPlaceholderText('••••••••'), {
            target: { value: 'WrongPassword' },
        });

        await act(async () => {
            fireEvent.click(screen.getByLabelText('Submit'));
        });

        expect(screen.getByText('Invalid login credentials')).toBeInTheDocument();
    });

    it('displays error message when user authenticates but lacks admin role in metadata', async () => {
        vi.mocked(useAuthStore).mockReturnValue({
            user: null,
            role: 'guest',
            loading: false,
            signOut: vi.fn(),
        } as any);

        vi.mocked(supabase!.auth.signInWithPassword).mockResolvedValue({
            data: { user: { app_metadata: { role: 'user' } } },
            error: null,
        } as any);

        render(
            <MemoryRouter>
                <AdminLayout>
                    <div data-testid="admin-content">Admin Protected Area</div>
                </AdminLayout>
            </MemoryRouter>
        );

        fireEvent.change(screen.getByPlaceholderText('admin@example.com'), {
            target: { value: 'user@domain.com' },
        });
        fireEvent.change(screen.getByPlaceholderText('••••••••'), {
            target: { value: 'UserPass123' },
        });

        await act(async () => {
            fireEvent.click(screen.getByLabelText('Submit'));
        });

        expect(screen.getByText('Account authenticated, but lacks administrator privileges.')).toBeInTheDocument();
    });

    it('calls signOut when Exit Portal button is clicked by admin', async () => {
        const mockSignOut = vi.fn();
        vi.mocked(useAuthStore).mockReturnValue({
            user: { id: 'admin1', email: 'admin@example.com' },
            role: 'admin',
            loading: false,
            signOut: mockSignOut,
        } as any);

        render(
            <MemoryRouter>
                <AdminLayout>
                    <div data-testid="admin-content">Admin Protected Area</div>
                </AdminLayout>
            </MemoryRouter>
        );

        const exitButton = screen.getByText(/Exit Portal/i);
        await act(async () => {
            fireEvent.click(exitButton);
        });

        expect(mockSignOut).toHaveBeenCalled();
    });

    it('renders loader when loading is true', () => {
        vi.mocked(useAuthStore).mockReturnValue({
            user: null,
            role: 'guest',
            loading: true,
            signOut: vi.fn(),
        } as any);

        const { container } = render(
            <MemoryRouter>
                <AdminLayout>
                    <div>Content</div>
                </AdminLayout>
            </MemoryRouter>
        );

        expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('shows error when supabase client is unavailable during login', async () => {
        vi.mocked(useAuthStore).mockReturnValue({
            user: null,
            role: 'guest',
            loading: false,
            signOut: vi.fn(),
        } as any);

        mockSupabaseClient = null;

        render(
            <MemoryRouter>
                <AdminLayout><div>Child</div></AdminLayout>
            </MemoryRouter>
        );

        fireEvent.change(screen.getByPlaceholderText('admin@example.com'), {
            target: { value: 'admin@domain.com' },
        });
        fireEvent.change(screen.getByPlaceholderText('••••••••'), {
            target: { value: 'SuperSecret123!' },
        });

        await act(async () => {
            fireEvent.click(screen.getByLabelText('Submit'));
        });

        expect(screen.getByText('Supabase client unavailable.')).toBeInTheDocument();
    });
});