import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { SettingsMenu } from './SettingsMenu';
import { useThemeStore } from '../store/useThemeStore';
import { useAttendanceStore } from '../../features/attendance/store/useAttendanceStore';

vi.mock('framer-motion', async () => {
    const actual = await vi.importActual('framer-motion');
    return {
        ...actual,
        AnimatePresence: ({ children }: any) => <>{children}</>,
    };
});

vi.mock('../store/useThemeStore');
vi.mock('../../features/attendance/store/useAttendanceStore');
vi.mock('../../features/attendance/hooks/usePushNotifications', () => ({
    usePushNotifications: () => ({
        isSupported: true,
        isSubscribed: false,
        subscribeToPush: vi.fn(),
        unsubscribeFromPush: vi.fn(),
    }),
}));

const mockSettingsActions = {
    handleUpdateName: vi.fn(),
    handleUpdatePassword: vi.fn(),
    handleUpdateAvatar: vi.fn(),
    handleDeleteProfile: vi.fn(),
};

vi.mock('../hooks/useSettingsActions', () => ({
    useSettingsActions: () => mockSettingsActions,
}));

vi.mock('./ProfilePicturePicker', () => ({
    ProfilePicturePicker: ({ onCropComplete, onClose }: any) => (
        <div data-testid="profile-picker">
            <button onClick={() => onCropComplete(new Blob(['img']))}>Confirm Crop</button>
            <button onClick={onClose}>Close Picker</button>
        </div>
    ),
}));

describe('SettingsMenu', () => {
    let mockToggleHighContrast: any;
    let mockSetTheme: any;
    let mockUpdateTargetGoal: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockToggleHighContrast = vi.fn();
        mockSetTheme = vi.fn();
        mockUpdateTargetGoal = vi.fn();

        vi.mocked(useThemeStore).mockReturnValue({
            isHighContrast: false,
            toggleHighContrast: mockToggleHighContrast,
            theme: 'indigo',
            setTheme: mockSetTheme,
        } as any);

        vi.mocked(useAttendanceStore).mockReturnValue({
            activeProfile: {
                id: 'p1',
                name: 'Alice',
                password: 'hash',
                targetGoal: 75,
            },
            accessMode: 'full',
            updateTargetGoal: mockUpdateTargetGoal,
        } as any);
    });

    it('renders closed menu button initially, opens and closes on click', () => {
        render(<SettingsMenu />);

        const openBtn = screen.getByRole('button', { name: /open settings/i });
        expect(openBtn).toBeInTheDocument();
        expect(screen.queryByText('App Settings')).not.toBeInTheDocument();

        fireEvent.click(openBtn);
        expect(screen.getByText('App Settings')).toBeInTheDocument();

        const closeBtn = screen.getByRole('button', { name: /close settings/i });
        fireEvent.click(closeBtn);
        expect(screen.queryByText('App Settings')).not.toBeInTheDocument();
    });

    it('triggers name update and password update actions', async () => {
        mockSettingsActions.handleUpdateName.mockResolvedValueOnce(true);
        mockSettingsActions.handleUpdatePassword.mockResolvedValueOnce(true);

        render(<SettingsMenu />);
        fireEvent.click(screen.getByRole('button', { name: /open settings/i }));

        const nameInput = screen.getByPlaceholderText(/profile name/i);
        fireEvent.change(nameInput, { target: { value: 'Alicia' } });

        const updateButtons = screen.getAllByRole('button', { name: /update/i });
        await act(async () => {
            fireEvent.click(updateButtons[0]);
        });
        expect(mockSettingsActions.handleUpdateName).toHaveBeenCalledWith('p1', 'Alicia');

        const pwdInput = screen.getByPlaceholderText(/new password/i);
        fireEvent.change(pwdInput, { target: { value: 'newSecret' } });

        await act(async () => {
            fireEvent.click(updateButtons[1]);
        });
        expect(mockSettingsActions.handleUpdatePassword).toHaveBeenCalledWith('p1', 'newSecret');
    });

    it('handles delete profile workflow and closes modal upon success', async () => {
        mockSettingsActions.handleDeleteProfile.mockResolvedValueOnce(true);

        render(<SettingsMenu />);
        fireEvent.click(screen.getByRole('button', { name: /open settings/i }));

        const deleteProfileBtn = screen.getByRole('button', { name: /delete profile/i });
        fireEvent.click(deleteProfileBtn);

        const confirmPwdInput = screen.getByPlaceholderText(/enter password to confirm/i);
        fireEvent.change(confirmPwdInput, { target: { value: 'password123' } });

        const confirmDeleteBtn = screen.getByRole('button', { name: /confirm/i });
        await act(async () => {
            fireEvent.click(confirmDeleteBtn);
        });

        expect(mockSettingsActions.handleDeleteProfile).toHaveBeenCalledWith('p1', undefined, 'password123');
        expect(screen.queryByText('App Settings')).not.toBeInTheDocument();
    });

    it('opens avatar picker and calls handleUpdateAvatar on crop complete', async () => {
        mockSettingsActions.handleUpdateAvatar.mockResolvedValueOnce(true);

        render(<SettingsMenu />);
        fireEvent.click(screen.getByRole('button', { name: /open settings/i }));

        const changeAvatarBtn = screen.getByRole('button', { name: /change avatar/i });
        fireEvent.click(changeAvatarBtn);

        expect(screen.getByTestId('profile-picker')).toBeInTheDocument();

        await act(async () => {
            fireEvent.click(screen.getByText('Confirm Crop'));
        });
        expect(mockSettingsActions.handleUpdateAvatar).toHaveBeenCalledWith('p1', expect.any(Blob));
        expect(screen.queryByTestId('profile-picker')).not.toBeInTheDocument();
    });

    it('hides profile and danger zone sections in readOnly mode', () => {
        vi.mocked(useAttendanceStore).mockReturnValue({
            activeProfile: { id: 'p1', name: 'Alice' },
            accessMode: 'readOnly',
            updateTargetGoal: mockUpdateTargetGoal,
        } as any);

        render(<SettingsMenu />);
        fireEvent.click(screen.getByRole('button', { name: /open settings/i }));

        expect(screen.queryByText('Profile Settings')).not.toBeInTheDocument();
        expect(screen.queryByText('Danger Zone')).not.toBeInTheDocument();
    });
});
