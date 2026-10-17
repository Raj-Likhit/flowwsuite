import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuditTrail } from './AuditTrail';
import { useAttendanceStore } from '../store/useAttendanceStore';
import { toast } from 'sonner';

vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
    },
}));

vi.mock('../store/useAttendanceStore');

describe('AuditTrail', () => {
    let mockDeleteLog: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockDeleteLog = vi.fn();
    });

    it('returns null if activeProfile is null', () => {
        vi.mocked(useAttendanceStore).mockReturnValue(null as any);
        const { container } = render(<AuditTrail />);
        expect(container.firstChild).toBeNull();
    });

    it('renders empty state when activeProfile has no logs', () => {
        vi.mocked(useAttendanceStore).mockImplementation(((selector: any) => {
            const state = {
                activeProfile: { id: 'p1', name: 'Alice', logs: [] },
                deleteLog: mockDeleteLog,
            };
            return typeof selector === 'function' ? selector(state) : state;
        }) as any);

        render(<AuditTrail />);

        expect(screen.getByText('Audit Trail')).toBeInTheDocument();
        expect(screen.getByText('No activity yet')).toBeInTheDocument();
        expect(screen.getByText('Your class logs will appear here after updates.')).toBeInTheDocument();
    });

    it('renders log entries and handles revert log action', () => {
        const mockLogs = [
            { id: 'log-1', title: 'Attended Class', timestamp: Date.now(), diffAttended: 1, diffTotal: 1 },
        ];

        vi.mocked(useAttendanceStore).mockImplementation(((selector: any) => {
            const state = {
                activeProfile: { id: 'p1', name: 'Alice', logs: mockLogs },
                deleteLog: mockDeleteLog,
            };
            return typeof selector === 'function' ? selector(state) : state;
        }) as any);

        render(<AuditTrail />);

        expect(screen.getByText('Attended Class')).toBeInTheDocument();
        expect(screen.getByText('1 / 50')).toBeInTheDocument();

        const revertBtn = screen.getByRole('button', { name: /revert this change/i });
        fireEvent.click(revertBtn);

        expect(mockDeleteLog).toHaveBeenCalledWith('log-1');
        expect(toast.success).toHaveBeenCalledWith('Log entry reverted');
    });

    it('hides revert button when readOnly is true', () => {
        const mockLogs = [
            { id: 'log-1', title: 'Attended Class', timestamp: Date.now(), diffAttended: 1, diffTotal: 1 },
        ];

        vi.mocked(useAttendanceStore).mockImplementation(((selector: any) => {
            const state = {
                activeProfile: { id: 'p1', name: 'Alice', logs: mockLogs },
                deleteLog: mockDeleteLog,
            };
            return typeof selector === 'function' ? selector(state) : state;
        }) as any);

        render(<AuditTrail readOnly={true} />);

        expect(screen.getByText('Attended Class')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /revert this change/i })).not.toBeInTheDocument();
    });
});
