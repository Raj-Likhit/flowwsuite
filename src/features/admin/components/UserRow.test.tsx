import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UserRow } from './UserRow';

describe('UserRow', () => {
    const defaultProps = {
        id: 'u-123',
        name: 'Sarah Connor',
        email: 'uid:u-123',
        status: 'Active',
        flagged: false,
        isSuspended: false,
        attended: 14,
        total: 16,
        lastActiveAt: '2026-10-17T08:00:00.000Z',
        onEdit: vi.fn(),
        onSuspend: vi.fn(),
        onTerminate: vi.fn(),
    };

    const renderInTable = (props = defaultProps) => {
        return render(
            <table>
                <tbody>
                    <UserRow {...props} />
                </tbody>
            </table>
        );
    };

    it('renders user information correctly', () => {
        renderInTable();

        expect(screen.getByText(/Sarah Connor/i)).toBeInTheDocument();
        expect(screen.getByText('uid:u-123')).toBeInTheDocument();
        expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('shows Flagged status when flagged is true and not suspended', () => {
        renderInTable({ ...defaultProps, flagged: true });
        expect(screen.getByText('Flagged')).toBeInTheDocument();
    });

    it('shows Suspended status when isSuspended is true', () => {
        renderInTable({ ...defaultProps, isSuspended: true, flagged: true });
        expect(screen.getByText('Suspended')).toBeInTheDocument();
        expect(screen.getByTitle('Unsuspend')).toBeInTheDocument();
    });

    it('formats lastActiveAt across all time brackets', () => {
        const now = 1760000000000;
        const dateSpy = vi.spyOn(Date, 'now').mockReturnValue(now);

        // 1. null
        const { rerender } = renderInTable({ ...defaultProps, lastActiveAt: null as unknown as string });
        expect(screen.getByText('Never synced')).toBeInTheDocument();
        expect(screen.getByText('Dead')).toBeInTheDocument();

        // 2. Just now (< 1h)
        rerender(
            <table>
                <tbody>
                    <UserRow {...defaultProps} lastActiveAt={new Date(now - 10 * 60 * 1000).toISOString()} />
                </tbody>
            </table>
        );
        expect(screen.getByText('Just now')).toBeInTheDocument();

        // 3. Diff hours (< 24h)
        rerender(
            <table>
                <tbody>
                    <UserRow {...defaultProps} lastActiveAt={new Date(now - 5 * 3600 * 1000).toISOString()} />
                </tbody>
            </table>
        );
        expect(screen.getByText('5h ago')).toBeInTheDocument();

        // 4. Diff days (< 7d)
        rerender(
            <table>
                <tbody>
                    <UserRow {...defaultProps} lastActiveAt={new Date(now - 3 * 86400 * 1000).toISOString()} />
                </tbody>
            </table>
        );
        expect(screen.getByText('3d ago')).toBeInTheDocument();

        // 5. Diff days (< 30d)
        rerender(
            <table>
                <tbody>
                    <UserRow {...defaultProps} lastActiveAt={new Date(now - 15 * 86400 * 1000).toISOString()} />
                </tbody>
            </table>
        );
        expect(screen.getByText('15d ago')).toBeInTheDocument();

        // 6. Diff days (< 60d)
        rerender(
            <table>
                <tbody>
                    <UserRow {...defaultProps} lastActiveAt={new Date(now - 45 * 86400 * 1000).toISOString()} />
                </tbody>
            </table>
        );
        expect(screen.getByText('45d ago')).toBeInTheDocument();

        // 7. Diff days (>= 60d)
        rerender(
            <table>
                <tbody>
                    <UserRow {...defaultProps} lastActiveAt={new Date(now - 90 * 86400 * 1000).toISOString()} />
                </tbody>
            </table>
        );
        expect(screen.getByText('90d ago')).toBeInTheDocument();
        expect(screen.getByText('Dead')).toBeInTheDocument();

        dateSpy.mockRestore();
    });

    it('triggers onEdit with user profile data', () => {
        const onEdit = vi.fn();
        renderInTable({ ...defaultProps, onEdit });

        fireEvent.click(screen.getByTitle('Edit'));
        expect(onEdit).toHaveBeenCalledWith({
            id: 'u-123',
            name: 'Sarah Connor',
            avatar_url: null,
            is_suspended: false,
            is_flagged: false,
            attended: 14,
            total: 16,
            last_active_at: '2026-10-17T08:00:00.000Z',
        });
    });

    it('triggers onSuspend when suspend button is clicked', () => {
        const onSuspend = vi.fn();
        renderInTable({ ...defaultProps, onSuspend });

        fireEvent.click(screen.getByTitle('Suspend'));
        expect(onSuspend).toHaveBeenCalledWith('u-123', false);
    });

    it('handles termination flow: shows confirm/cancel buttons and confirms', () => {
        const onTerminate = vi.fn();
        renderInTable({ ...defaultProps, onTerminate });

        fireEvent.click(screen.getByTitle('Terminate'));

        // Confirmation buttons appear
        const confirmBtn = screen.getByTitle('Confirm');
        const cancelBtn = screen.getByTitle('Cancel');
        expect(confirmBtn).toBeInTheDocument();
        expect(cancelBtn).toBeInTheDocument();

        // Cancel resets confirmation state
        fireEvent.click(cancelBtn);
        expect(screen.getByTitle('Terminate')).toBeInTheDocument();

        // Click terminate again and confirm
        fireEvent.click(screen.getByTitle('Terminate'));
        fireEvent.click(screen.getByTitle('Confirm'));
        expect(onTerminate).toHaveBeenCalledWith('u-123');
    });
});
