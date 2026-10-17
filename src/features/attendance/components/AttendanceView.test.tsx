import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { AttendanceView } from './AttendanceView';
import { useAttendanceStore } from '../store/useAttendanceStore';
import { toast } from 'sonner';

vi.mock('react-helmet-async', () => ({
    Helmet: ({ children }: any) => <>{children}</>,
}));

vi.mock('sonner', () => ({
    toast: {
        error: vi.fn(),
        success: vi.fn(),
        warning: vi.fn(),
        info: vi.fn(),
    },
}));

const mockGenerateReport = vi.fn();
vi.mock('./useAttendanceReport', () => ({
    useAttendanceReport: () => ({
        generateReport: mockGenerateReport,
    }),
}));

const mockRepo = {
    fetchOne: vi.fn(),
    syncUp: vi.fn(),
};

vi.mock('../repository/profileRepository', () => ({
    createProfileRepository: () => mockRepo,
}));

vi.mock('../hooks/useAnnouncement', () => ({
    useAnnouncement: () => ({
        activeAnnouncement: null,
        dismiss: vi.fn(),
    }),
}));

vi.mock('./ProfileSelection', () => ({
    ProfileSelection: () => <div data-testid="profile-selection">Profile Selection View</div>,
}));

vi.mock('../store/useAttendanceStore');

describe('AttendanceView', () => {
    let mockSetActiveProfile: any;
    let mockUpdateAttendance: any;
    let mockDeleteLog: any;
    let mockSyncFromCloud: any;
    let mockUpdateProfile: any;
    let mockSetLoading: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockSetActiveProfile = vi.fn();
        mockUpdateAttendance = vi.fn().mockReturnValue('log-123');
        mockDeleteLog = vi.fn();
        mockSyncFromCloud = vi.fn().mockResolvedValue('synced');
        mockUpdateProfile = vi.fn();
        mockSetLoading = vi.fn();
    });

    it('renders ProfileSelection when activeProfile is null', () => {
        vi.mocked(useAttendanceStore).mockImplementation(((selector: any) => {
            const state = {
                activeProfile: null,
                setActiveProfile: mockSetActiveProfile,
            };
            return typeof selector === 'function' ? selector(state) : state;
        }) as any);

        render(<AttendanceView />);
        expect(screen.getByTestId('profile-selection')).toBeInTheDocument();
    });

    it('renders profile details, controls, and handles back button', () => {
        vi.mocked(useAttendanceStore).mockImplementation(((selector: any) => {
            const state = {
                activeProfile: { id: 'p1', name: 'Alice', attended: 15, total: 20 },
                setActiveProfile: mockSetActiveProfile,
                accessMode: 'full',
                loading: false,
                updateAttendance: mockUpdateAttendance,
                deleteLog: mockDeleteLog,
                hideProfileName: false,
                syncFromCloud: mockSyncFromCloud,
                lastSyncedAt: { p1: Date.now() - 60000 },
                updateProfile: mockUpdateProfile,
                setLoading: mockSetLoading,
            };
            return typeof selector === 'function' ? selector(state) : state;
        }) as any);

        render(<AttendanceView />);

        expect(screen.getByText('Student: Alice')).toBeInTheDocument();
        expect(screen.getByText(/Last synced 1m ago/i)).toBeInTheDocument();

        // Click Back button
        const backBtn = screen.getByRole('button', { name: /back to profiles/i });
        fireEvent.click(backBtn);
        expect(mockSetActiveProfile).toHaveBeenCalledWith(null);
    });

    it('logs class via quick floating action button and provides undo action', () => {
        vi.mocked(useAttendanceStore).mockImplementation(((selector: any) => {
            const state = {
                activeProfile: { id: 'p1', name: 'Alice', attended: 15, total: 20 },
                setActiveProfile: mockSetActiveProfile,
                accessMode: 'full',
                loading: false,
                updateAttendance: mockUpdateAttendance,
                deleteLog: mockDeleteLog,
                hideProfileName: false,
                syncFromCloud: mockSyncFromCloud,
                updateProfile: mockUpdateProfile,
                setLoading: mockSetLoading,
            };
            return typeof selector === 'function' ? selector(state) : state;
        }) as any);

        render(<AttendanceView />);

        const fabButtons = screen.getAllByRole('button');
        // Find FAB plus button (last button)
        const fabBtn = fabButtons[fabButtons.length - 1];
        fireEvent.click(fabBtn);

        expect(mockUpdateAttendance).toHaveBeenCalledWith(16, 21, "Logged today's class");
        expect(toast.success).toHaveBeenCalledWith("Logged today's class!", expect.objectContaining({
            action: expect.any(Object),
        }));
    });

    it('handles sync to cloud', async () => {
        vi.mocked(useAttendanceStore).mockImplementation(((selector: any) => {
            const state = {
                activeProfile: { id: 'p1', name: 'Alice', attended: 15, total: 20, last_active_at: '2026-10-17' },
                setActiveProfile: mockSetActiveProfile,
                accessMode: 'full',
                loading: false,
                updateAttendance: mockUpdateAttendance,
                deleteLog: mockDeleteLog,
                hideProfileName: false,
                syncFromCloud: mockSyncFromCloud,
                updateProfile: mockUpdateProfile,
                setLoading: mockSetLoading,
            };
            return typeof selector === 'function' ? selector(state) : state;
        }) as any);

        mockRepo.fetchOne.mockResolvedValueOnce({
            attended: 15,
            total: 20,
            last_active_at: '2026-10-17',
        });
        mockRepo.syncUp.mockResolvedValueOnce({ last_active_at: '2026-10-17T12:00:00Z' });

        render(<AttendanceView />);

        const syncBtn = screen.getByRole('button', { name: /sync to cloud/i });
        await act(async () => {
            fireEvent.click(syncBtn);
        });

        await waitFor(() => {
            expect(mockRepo.syncUp).toHaveBeenCalled();
            expect(toast.success).toHaveBeenCalledWith('Successfully synced to cloud');
        });
    });

    it('handles Export PDF report button', () => {
        vi.mocked(useAttendanceStore).mockImplementation(((selector: any) => {
            const state = {
                activeProfile: { id: 'p1', name: 'Alice', attended: 15, total: 20 },
                setActiveProfile: mockSetActiveProfile,
                accessMode: 'full',
                loading: false,
                updateAttendance: mockUpdateAttendance,
                deleteLog: mockDeleteLog,
                hideProfileName: false,
                syncFromCloud: mockSyncFromCloud,
                updateProfile: mockUpdateProfile,
                setLoading: mockSetLoading,
            };
            return typeof selector === 'function' ? selector(state) : state;
        }) as any);

        render(<AttendanceView />);

        const exportPdfBtn = screen.getByRole('button', { name: /export pdf/i });
        fireEvent.click(exportPdfBtn);

        expect(mockGenerateReport).toHaveBeenCalledTimes(1);
        expect(toast.success).toHaveBeenCalledWith('Report successfully generated!');
    });

    it('handles Reset attendance workflow', () => {
        vi.mocked(useAttendanceStore).mockImplementation(((selector: any) => {
            const state = {
                activeProfile: { id: 'p1', name: 'Alice', attended: 15, total: 20 },
                setActiveProfile: mockSetActiveProfile,
                accessMode: 'full',
                loading: false,
                updateAttendance: mockUpdateAttendance,
                deleteLog: mockDeleteLog,
                hideProfileName: false,
                syncFromCloud: mockSyncFromCloud,
                updateProfile: mockUpdateProfile,
                setLoading: mockSetLoading,
            };
            return typeof selector === 'function' ? selector(state) : state;
        }) as any);

        render(<AttendanceView />);

        const resetBtn = screen.getByRole('button', { name: /reset/i });
        fireEvent.click(resetBtn);

        expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();

        // Click Confirm
        fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
        expect(mockUpdateAttendance).toHaveBeenCalledWith(0, 0);
        expect(toast.success).toHaveBeenCalledWith('Attendance reset to zero');
    });

    it('disables actions and renders Read Only badge in readOnly mode', () => {
        vi.mocked(useAttendanceStore).mockImplementation(((selector: any) => {
            const state = {
                activeProfile: { id: 'p1', name: 'Alice', attended: 15, total: 20 },
                setActiveProfile: mockSetActiveProfile,
                accessMode: 'readOnly',
                loading: false,
                updateAttendance: mockUpdateAttendance,
                deleteLog: mockDeleteLog,
                hideProfileName: false,
                syncFromCloud: mockSyncFromCloud,
                updateProfile: mockUpdateProfile,
                setLoading: mockSetLoading,
            };
            return typeof selector === 'function' ? selector(state) : state;
        }) as any);

        render(<AttendanceView />);

        expect(screen.getByText('Read Only')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /sync to cloud/i })).toBeDisabled();
        expect(screen.getByRole('button', { name: /export pdf/i })).toBeDisabled();
        expect(screen.getByRole('button', { name: /reset/i })).toBeDisabled();
    });
});
