import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';
import { useAuthStore } from './core/lib/useAuthStore';

vi.mock('./core/lib/useAuthStore');
vi.mock('@vercel/analytics/react', () => ({
    Analytics: () => null,
}));

vi.mock('./features/attendance/components/AttendanceView', () => ({
    AttendanceView: () => <div data-testid="attendance-view">Attendance View</div>,
}));

vi.mock('./features/pdf-engine/components/PdfEngineView', () => ({
    PdfEngineView: () => <div data-testid="pdf-engine-view">PDF Engine View</div>,
}));

vi.mock('./features/admin/AdminLayout', () => ({
    AdminLayout: ({ children }: any) => <div data-testid="admin-layout">{children}</div>,
}));

vi.mock('./features/admin/pages/AdminDashboard', () => ({
    AdminDashboard: () => <div data-testid="admin-dashboard">Admin Dashboard</div>,
}));

vi.mock('./shared/components/SettingsMenu', () => ({
    SettingsMenu: () => <div data-testid="settings-menu">Settings Menu</div>,
}));

describe('App Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.history.pushState({}, 'Test', '/');
        vi.mocked(useAuthStore).mockReturnValue({
            user: null,
            role: 'guest',
        } as any);
    });

    it('renders root redirecting to /attendance and shows bottom tabs', async () => {
        render(<App />);

        expect(await screen.findByTestId('settings-menu', {}, { timeout: 10000 })).toBeInTheDocument();
        expect(await screen.findByTestId('attendance-view', {}, { timeout: 10000 })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Attendance' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'PDF Studio' })).toBeInTheDocument();
    });

    it('navigates to /pdf-engine and renders PdfEngineView', async () => {
        window.history.pushState({}, 'Test', '/pdf-engine');
        render(<App />);

        await waitFor(() => {
            expect(screen.getByTestId('pdf-engine-view')).toBeInTheDocument();
        }, { timeout: 10000 });
    });

    it('renders Security Portal button for admin user on non-admin page and clicks it', async () => {
        vi.mocked(useAuthStore).mockReturnValue({
            user: { id: 'admin-1' } as any,
            role: 'admin',
        } as any);

        render(<App />);

        const securityPortalBtn = await screen.findByRole('button', { name: /security portal/i }, { timeout: 10000 });
        expect(securityPortalBtn).toBeInTheDocument();

        fireEvent.click(securityPortalBtn);

        await waitFor(() => {
            expect(screen.getByTestId('admin-layout')).toBeInTheDocument();
            expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument();
        }, { timeout: 10000 });
    });

    it('renders admin layout directly on /admin-portal route without bottom tabs', async () => {
        window.history.pushState({}, 'Test', '/admin-portal-floww-security');
        vi.mocked(useAuthStore).mockReturnValue({
            user: { id: 'admin-1' } as any,
            role: 'admin',
        } as any);

        render(<App />);

        await waitFor(() => {
            expect(screen.getByTestId('admin-layout')).toBeInTheDocument();
            expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument();
        });

        expect(screen.queryByRole('link', { name: 'Attendance' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /security portal/i })).not.toBeInTheDocument();
    });
});
