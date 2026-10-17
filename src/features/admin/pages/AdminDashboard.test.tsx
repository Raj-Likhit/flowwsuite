import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { AdminDashboard } from './AdminDashboard';
import { useAdminDashboard } from '../hooks/useAdminDashboard';

vi.mock('../hooks/useAdminDashboard', () => ({
    useAdminDashboard: vi.fn(),
}));

vi.mock('framer-motion', async (importOriginal) => {
    const actual = await importOriginal<typeof import('framer-motion')>();
    return {
        ...actual,
        AnimatePresence: ({ children }: any) => <>{children}</>,
    };
});

describe('AdminDashboard', () => {
    const mockRefresh = vi.fn();
    const mockPublish = vi.fn().mockResolvedValue(true);
    const mockDeactivate = vi.fn();
    const mockApprovePFP = vi.fn();
    const mockRejectPFP = vi.fn();
    const mockSuspendUser = vi.fn();
    const mockTerminateUser = vi.fn();
    const mockModerateAll = vi.fn();
    const mockUpdateUser = vi.fn().mockResolvedValue(true);
    const mockSetShowAllUsers = vi.fn();

    const sampleUsers = [
        { id: 'u-1', name: 'Alice Smith', attended: 8, total: 10, is_flagged: false, is_suspended: false, last_active_at: null },
        { id: 'u-2', name: 'Bob Jones', attended: 4, total: 6, is_flagged: true, is_suspended: false, last_active_at: '2026-10-16T12:00:00Z' },
    ];

    const samplePFPs = [
        { id: 'pfp-1', name: 'Charlie', avatar_url: 'https://example.com/charlie.png', is_flagged: true },
    ];

    const sampleAnnouncements = [
        { id: 'ann-1', content: 'Scheduled maintenance tonight', target_profile_ids: null, created_at: '2026-10-16T10:00:00Z', expires_at: '2026-10-18T10:00:00Z' },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useAdminDashboard).mockReturnValue({
            stats: { totalUsers: 25, pendingPFPs: 1 },
            recentUsers: sampleUsers as any,
            allProfiles: sampleUsers as any,
            moderationProfiles: samplePFPs as any,
            activeAnnouncements: sampleAnnouncements as any,
            isLoading: false,
            isPublishing: false,
            showAllUsers: false,
            setShowAllUsers: mockSetShowAllUsers,
            refresh: mockRefresh,
            publishAnnouncement: mockPublish,
            deactivateAnnouncement: mockDeactivate,
            approvePFP: mockApprovePFP,
            rejectPFP: mockRejectPFP,
            suspendUser: mockSuspendUser,
            terminateUser: mockTerminateUser,
            moderateAll: mockModerateAll,
            updateUser: mockUpdateUser,
        });
    });

    it('renders overview stats, users, and announcements', () => {
        render(<AdminDashboard />);

        expect(screen.getByText('Admin')).toBeInTheDocument();
        expect(screen.getByText('Overview')).toBeInTheDocument();
        expect(screen.getByText('25')).toBeInTheDocument();
        expect(screen.getByText('Action Reqd')).toBeInTheDocument();

        // Users
        expect(screen.getByText(/Alice Smith/i)).toBeInTheDocument();
        expect(screen.getByText(/Bob Jones/i)).toBeInTheDocument();

        // Active announcement
        expect(screen.getByText('Scheduled maintenance tonight')).toBeInTheDocument();
    });

    it('triggers refresh when refresh button is clicked', () => {
        render(<AdminDashboard />);

        const refreshBtn = screen.getByTitle('Refresh');
        fireEvent.click(refreshBtn);
        expect(mockRefresh).toHaveBeenCalledTimes(1);
    });

    it('filters users using search query input', () => {
        render(<AdminDashboard />);

        const searchInput = screen.getByPlaceholderText(/Search recent profiles/i);
        fireEvent.change(searchInput, { target: { value: 'Bob' } });

        expect(screen.getByText(/Bob Jones/i)).toBeInTheDocument();
        expect(screen.queryByText(/Alice Smith/i)).not.toBeInTheDocument();

        // No matches
        fireEvent.change(searchInput, { target: { value: 'Nonexistent' } });
        expect(screen.getByText(/No profiles matching "Nonexistent"/i)).toBeInTheDocument();
    });

    it('toggles View All / Collapse', () => {
        render(<AdminDashboard />);

        const viewAllBtn = screen.getByText('View All');
        fireEvent.click(viewAllBtn);
        expect(mockSetShowAllUsers).toHaveBeenCalledWith(true);
    });

    it('deactivates active announcement', () => {
        render(<AdminDashboard />);

        const deactivateBtn = screen.getByText('Deactivate');
        fireEvent.click(deactivateBtn);
        expect(mockDeactivate).toHaveBeenCalledWith('ann-1');
    });

    it('triggers moderateAll when Moderate All button is clicked', () => {
        render(<AdminDashboard />);

        const modAllBtn = screen.getByText(/Moderate All \(1\)/i);
        fireEvent.click(modAllBtn);
        expect(mockModerateAll).toHaveBeenCalledTimes(1);
    });

    it('opens and submits edit user modal', async () => {
        render(<AdminDashboard />);

        const editBtns = screen.getAllByTitle('Edit');
        fireEvent.click(editBtns[0]); // Edit Alice

        expect(screen.getByText('Edit Profile')).toBeInTheDocument();

        const nameInput = screen.getByDisplayValue('Alice Smith');
        fireEvent.change(nameInput, { target: { value: 'Alice Cooper' } });

        const saveBtn = screen.getByText('Save Changes');
        await act(async () => {
            fireEvent.click(saveBtn);
        });

        expect(mockUpdateUser).toHaveBeenCalledWith('u-1', {
            name: 'Alice Cooper',
            attended: 8,
            total: 10,
        });

        expect(screen.queryByText('Edit Profile')).not.toBeInTheDocument();
    });

    it('cancels editing without saving', () => {
        render(<AdminDashboard />);

        const editBtns = screen.getAllByTitle('Edit');
        fireEvent.click(editBtns[0]);

        expect(screen.getByText('Edit Profile')).toBeInTheDocument();

        const cancelBtn = screen.getByText('Cancel');
        fireEvent.click(cancelBtn);

        expect(screen.queryByText('Edit Profile')).not.toBeInTheDocument();
        expect(mockUpdateUser).not.toHaveBeenCalled();
    });

    it('renders loading indicators and empty states', () => {
        vi.mocked(useAdminDashboard).mockReturnValue({
            stats: { totalUsers: 0, pendingPFPs: 0 },
            recentUsers: [],
            allProfiles: [],
            moderationProfiles: [],
            activeAnnouncements: [],
            isLoading: false,
            isPublishing: false,
            showAllUsers: true,
            setShowAllUsers: mockSetShowAllUsers,
            refresh: mockRefresh,
            publishAnnouncement: mockPublish,
            deactivateAnnouncement: mockDeactivate,
            approvePFP: mockApprovePFP,
            rejectPFP: mockRejectPFP,
            suspendUser: mockSuspendUser,
            terminateUser: mockTerminateUser,
            moderateAll: mockModerateAll,
            updateUser: mockUpdateUser,
        });

        render(<AdminDashboard />);

        expect(screen.getByText('No profiles found.')).toBeInTheDocument();
        expect(screen.getByText('All clear')).toBeInTheDocument();
        expect(screen.getByText('Clear')).toBeInTheDocument();
    });
});
