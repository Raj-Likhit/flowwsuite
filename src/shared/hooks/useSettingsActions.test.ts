import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSettingsActions } from './useSettingsActions';
import { useAttendanceStore } from '../../features/attendance/store/useAttendanceStore';
import { ProfileRepository } from '../../features/attendance/repository/profileRepository';
import { clearStoredSignatures } from '../../features/pdf-engine/hooks/useSignatureStore';
import { toast } from 'sonner';

vi.mock('sonner', () => ({
    toast: {
        error: vi.fn(),
        success: vi.fn(),
        loading: vi.fn().mockReturnValue('toast-123'),
    },
}));

vi.mock('../../features/attendance/store/useAttendanceStore');
vi.mock('../../features/pdf-engine/hooks/useSignatureStore');

const mockRepo = {
    update: vi.fn(),
    delete: vi.fn(),
    verifyAndUnlock: vi.fn(),
};

vi.mock('../../features/attendance/repository/profileRepository', () => ({
    createProfileRepository: () => mockRepo,
    ProfileRepository: {
        hashPassword: vi.fn(),
        verifyPassword: vi.fn(),
    },
}));

describe('useSettingsActions', () => {
    let mockUpdateProfile: any;
    let mockUploadAvatar: any;
    let mockDeleteProfile: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockUpdateProfile = vi.fn();
        mockUploadAvatar = vi.fn();
        mockDeleteProfile = vi.fn();

        const mockState = {
            profiles: [{ id: 'p1', name: 'Alice', avatar_url: 'https://example.com/avatar.jpg' }],
            updateProfile: mockUpdateProfile,
            uploadAvatar: mockUploadAvatar,
            deleteProfile: mockDeleteProfile,
        };

        vi.mocked(useAttendanceStore).mockImplementation(((selector?: (state: any) => any) => {
            return typeof selector === 'function' ? selector(mockState) : mockState;
        }) as any);
    });

    describe('handleUpdateName', () => {
        it('rejects empty name and shows error toast', async () => {
            const { result } = renderHook(() => useSettingsActions());

            let success = false;
            await act(async () => {
                success = await result.current.handleUpdateName('p1', '   ');
            });

            expect(success).toBe(false);
            expect(toast.error).toHaveBeenCalledWith('Name cannot be empty');
            expect(mockRepo.update).not.toHaveBeenCalled();
        });

        it('updates trimmed name (max 30 chars) and shows success toast', async () => {
            const { result } = renderHook(() => useSettingsActions());
            mockRepo.update.mockResolvedValueOnce(undefined);

            let success = false;
            await act(async () => {
                success = await result.current.handleUpdateName('p1', '  New Name That Is Very Long Exceeding Thirty Characters  ');
            });

            expect(success).toBe(true);
            const expectedName = 'New Name That Is Very Long Exc';
            expect(mockRepo.update).toHaveBeenCalledWith('p1', { name: expectedName });
            expect(mockUpdateProfile).toHaveBeenCalledWith('p1', { name: expectedName });
            expect(toast.success).toHaveBeenCalledWith('Name updated!');
        });

        it('handles update failure gracefully', async () => {
            const { result } = renderHook(() => useSettingsActions());
            mockRepo.update.mockRejectedValueOnce(new Error('DB error'));

            let success = false;
            await act(async () => {
                success = await result.current.handleUpdateName('p1', 'Valid Name');
            });

            expect(success).toBe(false);
            expect(toast.error).toHaveBeenCalledWith('Update failed: DB error');
        });
    });

    describe('handleUpdatePassword', () => {
        it('rejects empty password', async () => {
            const { result } = renderHook(() => useSettingsActions());

            let success = false;
            await act(async () => {
                success = await result.current.handleUpdatePassword('p1', '');
            });

            expect(success).toBe(false);
            expect(toast.error).toHaveBeenCalledWith('Password cannot be empty');
        });

        it('hashes password and updates repository and store', async () => {
            const { result } = renderHook(() => useSettingsActions());
            vi.mocked(ProfileRepository.hashPassword).mockResolvedValueOnce('hashed_pwd_123');
            mockRepo.update.mockResolvedValueOnce(undefined);

            let success = false;
            await act(async () => {
                success = await result.current.handleUpdatePassword('p1', 'newSecret123');
            });

            expect(success).toBe(true);
            expect(ProfileRepository.hashPassword).toHaveBeenCalledWith('newSecret123');
            expect(mockRepo.update).toHaveBeenCalledWith('p1', { password: 'hashed_pwd_123' });
            expect(toast.success).toHaveBeenCalledWith('Password updated!');
        });

        it('handles hash/update errors', async () => {
            const { result } = renderHook(() => useSettingsActions());
            vi.mocked(ProfileRepository.hashPassword).mockRejectedValueOnce(new Error('Bcrypt failed'));

            let success = false;
            await act(async () => {
                success = await result.current.handleUpdatePassword('p1', 'newSecret123');
            });

            expect(success).toBe(false);
            expect(toast.error).toHaveBeenCalledWith('Password update failed: Bcrypt failed');
        });
    });

    describe('handleUpdateAvatar', () => {
        it('uploads avatar blob, flags profile, updates store and shows success toast', async () => {
            const { result } = renderHook(() => useSettingsActions());
            const blob = new Blob(['avatar'], { type: 'image/png' });
            mockUploadAvatar.mockResolvedValueOnce('https://storage/p1.png');
            mockRepo.update.mockResolvedValueOnce(undefined);

            let success = false;
            await act(async () => {
                success = await result.current.handleUpdateAvatar('p1', blob);
            });

            expect(success).toBe(true);
            expect(mockUploadAvatar).toHaveBeenCalledWith('p1', blob);
            expect(mockRepo.update).toHaveBeenCalledWith('p1', { avatar_url: 'https://storage/p1.png', is_flagged: true });
            expect(mockUpdateProfile).toHaveBeenCalledWith('p1', { avatar_url: 'https://storage/p1.png' });
            expect(toast.success).toHaveBeenCalledWith('Avatar updated!', { id: 'toast-123' });
        });

        it('handles null return from uploadAvatar', async () => {
            const { result } = renderHook(() => useSettingsActions());
            const blob = new Blob(['avatar'], { type: 'image/png' });
            mockUploadAvatar.mockResolvedValueOnce(null);

            let success = false;
            await act(async () => {
                success = await result.current.handleUpdateAvatar('p1', blob);
            });

            expect(success).toBe(false);
            expect(toast.error).toHaveBeenCalledWith('Upload failed', { id: 'toast-123' });
        });

        it('handles thrown error during upload', async () => {
            const { result } = renderHook(() => useSettingsActions());
            const blob = new Blob(['avatar'], { type: 'image/png' });
            mockUploadAvatar.mockRejectedValueOnce(new Error('Network error'));

            let success = false;
            await act(async () => {
                success = await result.current.handleUpdateAvatar('p1', blob);
            });

            expect(success).toBe(false);
            expect(toast.error).toHaveBeenCalledWith('Upload failed: Network error', { id: 'toast-123' });
        });
    });

    describe('handleDeleteProfile', () => {
        it('rejects if enteredPassword is empty', async () => {
            const { result } = renderHook(() => useSettingsActions());

            let success = false;
            await act(async () => {
                success = await result.current.handleDeleteProfile('p1', 'hash', '');
            });

            expect(success).toBe(false);
            expect(toast.error).toHaveBeenCalledWith('Please enter your password to confirm');
        });

        it('rejects if password verification fails', async () => {
            const { result } = renderHook(() => useSettingsActions());
            mockRepo.verifyAndUnlock.mockResolvedValueOnce({ success: false });

            let success = false;
            await act(async () => {
                success = await result.current.handleDeleteProfile('p1', 'hash', 'wrong_pwd');
            });

            expect(success).toBe(false);
            expect(toast.error).toHaveBeenCalledWith('Incorrect password', { id: 'toast-123' });
        });

        it('deletes profile from repo, store, and clears stored signatures when password is correct', async () => {
            const { result } = renderHook(() => useSettingsActions());
            mockRepo.verifyAndUnlock.mockResolvedValueOnce({ success: true });
            mockRepo.delete.mockResolvedValueOnce(undefined);

            let success = false;
            await act(async () => {
                success = await result.current.handleDeleteProfile('p1', 'hash', 'correct_pwd');
            });

            expect(success).toBe(true);
            expect(mockRepo.delete).toHaveBeenCalledWith('p1', 'https://example.com/avatar.jpg');
            expect(mockDeleteProfile).toHaveBeenCalledWith('p1');
            expect(clearStoredSignatures).toHaveBeenCalled();
            expect(toast.success).toHaveBeenCalledWith('Profile deleted successfully', { id: 'toast-123' });
        });

        it('handles deletion error', async () => {
            const { result } = renderHook(() => useSettingsActions());
            mockRepo.verifyAndUnlock.mockResolvedValueOnce({ success: true });
            mockRepo.delete.mockRejectedValueOnce(new Error('DB delete constraint'));

            let success = false;
            await act(async () => {
                success = await result.current.handleDeleteProfile('p1', 'hash', 'correct_pwd');
            });

            expect(success).toBe(false);
            expect(toast.error).toHaveBeenCalledWith('Deletion failed: DB delete constraint', { id: 'toast-123' });
        });
    });
});
