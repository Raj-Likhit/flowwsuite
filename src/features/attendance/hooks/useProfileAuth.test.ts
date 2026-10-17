import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProfileAuth } from './useProfileAuth';
import { toast } from 'sonner';
import { createProfileRepository, ProfileRepository } from '../repository/profileRepository';
import { useAttendanceStore } from '../store/useAttendanceStore';

vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
    },
}));

vi.mock('../../../core/lib/supabase', () => ({
    supabase: {},
}));

vi.mock('../repository/profileRepository', () => ({
    createProfileRepository: vi.fn(),
    ProfileRepository: {
        hashPassword: vi.fn(),
    },
}));

vi.mock('../store/useAttendanceStore', () => ({
    useAttendanceStore: vi.fn(),
}));

describe('useProfileAuth', () => {
    const mockSetActiveProfile = vi.fn();
    const mockUpdateProfile = vi.fn();

    const dummyProfile = {
        id: 'prof-123',
        name: 'Alex',
        attendance: 10,
        totalClasses: 12,
        notes: '',
        history: [],
        avatar: 'avatar.png',
        createdAt: 1000,
        isCustomGoal: false,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useAttendanceStore).mockImplementation(((selector: any) => {
            const state = {
                setActiveProfile: mockSetActiveProfile,
                updateProfile: mockUpdateProfile,
            };
            return typeof selector === 'function' ? selector(state) : state;
        }) as any);
    });

    it('initializes with default values and closes prompt on closePasswordPrompt', () => {
        const { result } = renderHook(() => useProfileAuth());

        expect(result.current.passwordPromptProfile).toBeNull();
        expect(result.current.enteredPassword).toBe('');
        expect(result.current.passwordError).toBe(false);

        act(() => {
            result.current.setPasswordPromptProfile(dummyProfile as any);
            result.current.setEnteredPassword('my-secret');
            result.current.setPasswordError(true);
        });

        expect(result.current.passwordPromptProfile).toEqual(dummyProfile);
        expect(result.current.enteredPassword).toBe('my-secret');
        expect(result.current.passwordError).toBe(true);

        act(() => {
            result.current.closePasswordPrompt();
        });

        expect(result.current.passwordPromptProfile).toBeNull();
        expect(result.current.enteredPassword).toBe('');
        expect(result.current.passwordError).toBe(false);
    });

    it('does nothing when unlockProfile is called without a prompt profile', async () => {
        const { result } = renderHook(() => useProfileAuth());

        await act(async () => {
            await result.current.unlockProfile();
        });

        expect(createProfileRepository).not.toHaveBeenCalled();
    });

    it('shows error if database repository is unavailable', async () => {
        vi.mocked(createProfileRepository).mockReturnValue(null);
        const { result } = renderHook(() => useProfileAuth());

        act(() => {
            result.current.setPasswordPromptProfile(dummyProfile as any);
            result.current.setEnteredPassword('pass123');
        });

        await act(async () => {
            await result.current.unlockProfile();
        });

        expect(toast.error).toHaveBeenCalledWith('Database connection unavailable');
        expect(mockSetActiveProfile).not.toHaveBeenCalled();
    });

    it('handles incorrect password and vibration, triggering lockout after 5 attempts', async () => {
        const vibrateSpy = vi.fn();
        Object.defineProperty(navigator, 'vibrate', {
            value: vibrateSpy,
            configurable: true,
            writable: true,
        });

        const mockRepo = {
            verifyAndUnlock: vi.fn().mockResolvedValue({ success: false, profile: null }),
        };
        vi.mocked(createProfileRepository).mockReturnValue(mockRepo as any);

        const { result } = renderHook(() => useProfileAuth());

        act(() => {
            result.current.setPasswordPromptProfile(dummyProfile as any);
            result.current.setEnteredPassword('wrong-pw');
        });

        // 4 failed attempts
        for (let i = 0; i < 4; i++) {
            await act(async () => {
                await result.current.unlockProfile();
            });
            expect(result.current.passwordError).toBe(true);
            expect(vibrateSpy).toHaveBeenCalledWith([50, 50, 50]);
        }

        expect(toast.error).not.toHaveBeenCalledWith('Too many attempts. Locked out for 5 minutes.');

        // 5th failed attempt -> locks out
        await act(async () => {
            await result.current.unlockProfile();
        });
        expect(toast.error).toHaveBeenCalledWith('Too many attempts. Locked out for 5 minutes.');

        // 6th attempt while locked out
        await act(async () => {
            await result.current.unlockProfile();
        });
        expect(toast.error).toHaveBeenCalledWith('Too many attempts. Try again later.');
    });

    it('resets lockout if duration has expired', async () => {
        const dateSpy = vi.spyOn(Date, 'now');
        dateSpy.mockReturnValue(1000000);

        const mockRepo = {
            verifyAndUnlock: vi.fn().mockResolvedValue({ success: false, profile: null }),
        };
        vi.mocked(createProfileRepository).mockReturnValue(mockRepo as any);

        const { result } = renderHook(() => useProfileAuth());

        act(() => {
            result.current.setPasswordPromptProfile(dummyProfile as any);
        });

        // Fail 5 times to lock out until 1000000 + 300000 = 1300000
        for (let i = 0; i < 5; i++) {
            await act(async () => {
                await result.current.unlockProfile();
            });
        }

        // Fast forward past lockout
        dateSpy.mockReturnValue(1400000);
        mockRepo.verifyAndUnlock.mockResolvedValueOnce({
            success: true,
            profile: dummyProfile,
            needsMigration: false,
        });

        await act(async () => {
            await result.current.unlockProfile();
        });

        expect(mockSetActiveProfile).toHaveBeenCalledWith(dummyProfile, 'editable');
        expect(result.current.passwordPromptProfile).toBeNull();
        dateSpy.mockRestore();
    });

    it('successfully unlocks profile and performs password migration if required', async () => {
        const mockRepo = {
            verifyAndUnlock: vi.fn().mockResolvedValue({
                success: true,
                profile: dummyProfile,
                needsMigration: true,
            }),
            update: vi.fn().mockResolvedValue({ success: true }),
        };
        vi.mocked(createProfileRepository).mockReturnValue(mockRepo as any);
        vi.mocked(ProfileRepository.hashPassword).mockResolvedValue('hashed-pass');

        const { result } = renderHook(() => useProfileAuth());

        act(() => {
            result.current.setPasswordPromptProfile(dummyProfile as any);
            result.current.setEnteredPassword('plaintext-pass');
        });

        await act(async () => {
            await result.current.unlockProfile();
        });

        expect(mockSetActiveProfile).toHaveBeenCalledWith(dummyProfile, 'editable');
        expect(ProfileRepository.hashPassword).toHaveBeenCalledWith('plaintext-pass');
        expect(mockRepo.update).toHaveBeenCalledWith('prof-123', { password: 'hashed-pass' });
    });

    it('catches and logs migration errors cleanly', async () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const mockRepo = {
            verifyAndUnlock: vi.fn().mockResolvedValue({
                success: true,
                profile: dummyProfile,
                needsMigration: true,
            }),
            update: vi.fn().mockRejectedValue(new Error('DB failure')),
        };
        vi.mocked(createProfileRepository).mockReturnValue(mockRepo as any);
        vi.mocked(ProfileRepository.hashPassword).mockResolvedValue('hashed-pass');

        const { result } = renderHook(() => useProfileAuth());

        act(() => {
            result.current.setPasswordPromptProfile(dummyProfile as any);
            result.current.setEnteredPassword('plaintext-pass');
        });

        await act(async () => {
            await result.current.unlockProfile();
        });

        expect(consoleErrorSpy).toHaveBeenCalledWith('Password migration failed:', expect.any(Error));
        consoleErrorSpy.mockRestore();
    });

    it('handles viewAttendance cleanly when repo returns full profile', async () => {
        const fullProfile = { ...dummyProfile, attendance: 20, totalClasses: 25 };
        const mockRepo = {
            fetchProfileAttendance: vi.fn().mockResolvedValue(fullProfile),
        };
        vi.mocked(createProfileRepository).mockReturnValue(mockRepo as any);

        const { result } = renderHook(() => useProfileAuth());

        act(() => {
            result.current.setPasswordPromptProfile(dummyProfile as any);
        });

        await act(async () => {
            await result.current.viewAttendance();
        });

        expect(mockSetActiveProfile).toHaveBeenCalledWith(fullProfile, 'readOnly');
        expect(result.current.passwordPromptProfile).toBeNull();
    });

    it('handles viewAttendance fallback when repo returns null or is absent', async () => {
        vi.mocked(createProfileRepository).mockReturnValue(null);

        const { result } = renderHook(() => useProfileAuth());

        // Without profile
        await act(async () => {
            await result.current.viewAttendance();
        });
        expect(mockSetActiveProfile).not.toHaveBeenCalled();

        // With profile
        act(() => {
            result.current.setPasswordPromptProfile(dummyProfile as any);
        });

        await act(async () => {
            await result.current.viewAttendance();
        });

        expect(mockSetActiveProfile).toHaveBeenCalledWith(dummyProfile, 'readOnly');
        expect(result.current.passwordPromptProfile).toBeNull();
    });
});
