import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PasswordUnlockModal } from './PasswordUnlockModal';
import type { Profile } from '../../store/useAttendanceStore';

describe('PasswordUnlockModal', () => {
    const mockProfile: Profile = {
        id: 'p1',
        name: 'Eva',
        avatar_url: 'https://example.com/eva.png',
        attended: 5,
        total: 5,
    };

    const defaultProps = {
        profile: mockProfile,
        enteredPassword: '',
        setEnteredPassword: vi.fn(),
        passwordError: false,
        setPasswordError: vi.fn(),
        onClose: vi.fn(),
        onUnlock: vi.fn(),
        onViewAttendance: vi.fn(),
    };

    it('returns null if profile is null', () => {
        const { container } = render(<PasswordUnlockModal {...defaultProps} profile={null} />);
        expect(container.firstChild).toBeNull();
    });

    it('renders password input, avatar, and handles unlock & cancel', () => {
        const setEnteredPassword = vi.fn();
        const setPasswordError = vi.fn();
        const onUnlock = vi.fn();
        const onClose = vi.fn();

        render(
            <PasswordUnlockModal
                {...defaultProps}
                setEnteredPassword={setEnteredPassword}
                setPasswordError={setPasswordError}
                onUnlock={onUnlock}
                onClose={onClose}
            />
        );

        expect(screen.getByText('Hello, Eva')).toBeInTheDocument();
        const input = screen.getByPlaceholderText('••••');
        fireEvent.change(input, { target: { value: '1234' } });

        expect(setEnteredPassword).toHaveBeenCalledWith('1234');
        expect(setPasswordError).toHaveBeenCalledWith(false);

        // Enter key triggers unlock
        fireEvent.keyDown(input, { key: 'Enter' });
        expect(onUnlock).toHaveBeenCalledTimes(1);

        // Unlock button triggers unlock
        const unlockBtn = screen.getByRole('button', { name: /unlock/i });
        fireEvent.click(unlockBtn);
        expect(onUnlock).toHaveBeenCalledTimes(2);

        // Cancel button triggers onClose
        const cancelBtn = screen.getByRole('button', { name: /cancel/i });
        fireEvent.click(cancelBtn);
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('renders error message when passwordError is true', () => {
        render(<PasswordUnlockModal {...defaultProps} passwordError={true} />);
        expect(screen.getByText('Incorrect Password')).toBeInTheDocument();
    });

    it('calls onViewAttendance when View Attendance button is clicked', () => {
        const onViewAttendance = vi.fn();
        render(<PasswordUnlockModal {...defaultProps} onViewAttendance={onViewAttendance} />);

        const viewBtn = screen.getByRole('button', { name: /view attendance/i });
        fireEvent.click(viewBtn);
        expect(onViewAttendance).toHaveBeenCalledTimes(1);
    });
});
