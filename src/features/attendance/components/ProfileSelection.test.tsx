import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { ProfileSelection } from './ProfileSelection';
import { useAttendanceStore } from '../store/useAttendanceStore';
import { toast } from 'sonner';

vi.mock('framer-motion', async () => {
    const actual = await vi.importActual('framer-motion');
    return {
        ...actual,
        AnimatePresence: ({ children }: any) => <>{children}</>,
    };
});

vi.mock('sonner', () => ({
    toast: {
        error: vi.fn(),
        success: vi.fn(),
    },
}));

vi.mock('../store/useAttendanceStore');

const mockRepo = {
    fetchAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
};

vi.mock('../repository/profileRepository', () => ({
    createProfileRepository: () => mockRepo,
    ProfileRepository: {
        hashPassword: vi.fn().mockResolvedValue('hashed_123'),
        verifyPassword: vi.fn(),
    },
}));

const mockAuthHook = {
    passwordPromptProfile: null as any,
    setPasswordPromptProfile: vi.fn(),
    enteredPassword: '',
    setEnteredPassword: vi.fn(),
    passwordError: false,
    setPasswordError: vi.fn(),
    closePasswordPrompt: vi.fn(),
    unlockProfile: vi.fn(),
    viewAttendance: vi.fn(),
};

vi.mock('../hooks/useProfileAuth', () => ({
    useProfileAuth: () => mockAuthHook,
}));

vi.mock('../../../shared/components/ProfilePicturePicker', () => ({
    ProfilePicturePicker: ({ onCropComplete, onClose }: any) => (
        <div data-testid="profile-picker">
            <button onClick={() => onCropComplete(new Blob(['blob']))}>Pick Avatar</button>
            <button onClick={onClose}>Close Picker</button>
        </div>
    ),
}));

describe('ProfileSelection', () => {
    let mockSetProfiles: any;
    let mockSetLoading: any;
    let mockUpdateProfile: any;
    let mockUploadAvatar: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockSetProfiles = vi.fn();
        mockSetLoading = vi.fn();
        mockUpdateProfile = vi.fn();
        mockUploadAvatar = vi.fn();

        global.URL.createObjectURL = vi.fn().mockReturnValue('blob:test-url');

        const mockState = {
            profiles: [
                { id: 'p1', name: 'Alice', attended: 10, total: 12 },
                { id: 'p2', name: 'Bob', attended: 8, total: 10, is_suspended: true },
            ],
            loading: false,
            setProfiles: mockSetProfiles,
            setLoading: mockSetLoading,
            updateProfile: mockUpdateProfile,
            uploadAvatar: mockUploadAvatar,
        };

        vi.mocked(useAttendanceStore).mockImplementation(((selector: any) => {
            return typeof selector === 'function' ? selector(mockState) : mockState;
        }) as any);

        Object.assign(useAttendanceStore, {
            getState: () => mockState,
        });

        mockRepo.fetchAll.mockResolvedValue([
            { id: 'p1', name: 'Alice', attended: 10, total: 12 },
        ]);
    });

    it('renders profile list and refresh button', async () => {
        render(<ProfileSelection />);

        expect(screen.getByText(/Who's/i)).toBeInTheDocument();
        expect(screen.getByText('Alice')).toBeInTheDocument();
        expect(screen.getByText('Bob')).toBeInTheDocument();

        // Refresh button
        const refreshBtn = screen.getByRole('button', { name: /refresh profiles/i });
        await act(async () => {
            fireEvent.click(refreshBtn);
        });

        expect(mockRepo.fetchAll).toHaveBeenCalled();
        expect(toast.success).toHaveBeenCalledWith('Profiles refreshed');
    });

    it('handles refresh failure gracefully', async () => {
        mockRepo.fetchAll
            .mockResolvedValueOnce([{ id: 'p1', name: 'Alice', attended: 10, total: 12 }])
            .mockRejectedValueOnce(new Error('Network error'));

        render(<ProfileSelection />);

        const refreshBtn = screen.getByRole('button', { name: /refresh profiles/i });
        await act(async () => {
            fireEvent.click(refreshBtn);
        });

        expect(toast.error).toHaveBeenCalledWith('Failed to refresh profiles');
    });

    it('shows error toast when selecting a suspended profile', () => {
        render(<ProfileSelection />);

        const bobCard = screen.getByText('Bob').closest('button');
        fireEvent.click(bobCard!);

        expect(toast.error).toHaveBeenCalledWith('This profile has been suspended. Contact your administrator.');
        expect(mockAuthHook.setPasswordPromptProfile).not.toHaveBeenCalled();
    });

    it('opens password prompt when selecting an active profile', () => {
        render(<ProfileSelection />);

        const aliceCard = screen.getByText('Alice').closest('button');
        fireEvent.click(aliceCard!);

        expect(mockAuthHook.setPasswordPromptProfile).toHaveBeenCalledWith(expect.objectContaining({ name: 'Alice' }));
    });

    it('opens and closes add profile modal', () => {
        render(<ProfileSelection />);

        const addProfileBtn = screen.getByText('Add Profile').closest('button');
        fireEvent.click(addProfileBtn!);

        expect(screen.getByText('New Profile')).toBeInTheDocument();

        const cancelBtn = screen.getByRole('button', { name: /cancel/i });
        fireEvent.click(cancelBtn);

        expect(screen.queryByText('New Profile')).not.toBeInTheDocument();
    });

    it('handles adding profile validation errors (missing name, missing avatar)', async () => {
        render(<ProfileSelection />);

        fireEvent.click(screen.getByText('Add Profile').closest('button')!);

        // Submit without name
        const submitBtn = screen.getByRole('button', { name: /initialize profile/i });
        await act(async () => {
            fireEvent.click(submitBtn);
        });
        expect(screen.getByText('Please enter a profile name.')).toBeInTheDocument();

        // Enter name, but no avatar
        const nameInput = screen.getByPlaceholderText(/enter name/i);
        fireEvent.change(nameInput, { target: { value: 'Charlie' } });

        await act(async () => {
            fireEvent.click(submitBtn);
        });
        expect(screen.getByText('Please select an avatar.')).toBeInTheDocument();
    });

    it('creates profile with custom avatar via picker', async () => {
        mockRepo.create.mockResolvedValueOnce({
            id: 'p-new',
            name: 'Charlie',
            avatar_url: '',
            attended: 0,
            total: 0,
        });
        mockUploadAvatar.mockResolvedValueOnce('https://storage/p-new.png');
        mockRepo.update.mockResolvedValueOnce(undefined);

        render(<ProfileSelection />);

        fireEvent.click(screen.getByText('Add Profile').closest('button')!);

        // Enter name
        const nameInput = screen.getByPlaceholderText(/enter name/i);
        fireEvent.change(nameInput, { target: { value: 'Charlie' } });

        // Open picker
        fireEvent.click(screen.getByText('Custom').closest('button')!);
        expect(screen.getByTestId('profile-picker')).toBeInTheDocument();

        // Pick avatar
        fireEvent.click(screen.getByText('Pick Avatar'));
        expect(screen.queryByTestId('profile-picker')).not.toBeInTheDocument();

        // Submit
        const submitBtn = screen.getByRole('button', { name: /initialize profile/i });
        await act(async () => {
            fireEvent.click(submitBtn);
        });

        await waitFor(() => {
            expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({
                name: 'Charlie',
                avatar_url: '',
                password: 'hashed_123',
            }));
            expect(toast.success).toHaveBeenCalledWith('Profile created!');
        });
    });
});
