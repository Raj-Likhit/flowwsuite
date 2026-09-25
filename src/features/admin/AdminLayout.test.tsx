import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminLayout } from './AdminLayout';
import { useAuthStore } from '../../core/lib/useAuthStore';

vi.mock('../../core/lib/useAuthStore', () => ({
    useAuthStore: vi.fn(),
}));

describe('AdminLayout', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders Access Denied screen for unauthenticated users with password bypass input', () => {
        vi.mocked(useAuthStore).mockReturnValue({
            user: null,
            role: 'guest',
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

        // Ensure password input exists for bypass
        const passwordInput = screen.getByPlaceholderText('••••••••');
        expect(passwordInput).toBeInTheDocument();
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
});