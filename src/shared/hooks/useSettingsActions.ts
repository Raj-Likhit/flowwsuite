import { useMemo, useCallback } from 'react';
import { supabase } from '../../core/lib/supabase';
import { createProfileRepository, ProfileRepository } from '../../features/attendance/repository/profileRepository';
import { useAttendanceStore } from '../../features/attendance/store/useAttendanceStore';
import { clearStoredSignatures } from '../../features/pdf-engine/hooks/useSignatureStore';
import { toast } from 'sonner';

export function useSettingsActions() {
    const { profiles, updateProfile, uploadAvatar, deleteProfile } = useAttendanceStore();
    const repo = useMemo(() => createProfileRepository(supabase), []);

    const handleUpdateName = useCallback(async (profileId: string, newName: string): Promise<boolean> => {
        const trimmed = newName.trim().slice(0, 30);
        if (!trimmed) {
            toast.error('Name cannot be empty');
            return false;
        }

        try {
            if (repo) {
                await repo.update(profileId, { name: trimmed });
            }
            updateProfile(profileId, { name: trimmed });
            toast.success('Name updated!');
            return true;
        } catch (err: unknown) {
            const error = err as Error;
            toast.error('Update failed: ' + error.message);
            return false;
        }
    }, [repo, updateProfile]);

    const handleUpdatePassword = useCallback(async (profileId: string, newPassword: string): Promise<boolean> => {
        if (!newPassword) {
            toast.error('Password cannot be empty');
            return false;
        }

        try {
            const hashedPassword = await ProfileRepository.hashPassword(newPassword);
            if (repo) {
                await repo.update(profileId, { password: hashedPassword });
            }
            updateProfile(profileId, { password: hashedPassword });
            toast.success('Password updated!');
            return true;
        } catch (err: unknown) {
            const error = err as Error;
            toast.error('Password update failed: ' + error.message);
            return false;
        }
    }, [repo, updateProfile]);

    const handleUpdateAvatar = useCallback(async (profileId: string, blob: Blob): Promise<boolean> => {
        const loadingToast = toast.loading('Uploading avatar...');
        try {
            const publicUrl = await uploadAvatar(profileId, blob);
            if (publicUrl) {
                if (repo) {
                    await repo.update(profileId, { avatar_url: publicUrl, is_flagged: true });
                }
                updateProfile(profileId, { avatar_url: publicUrl });
                toast.success('Avatar updated!', { id: loadingToast });
                return true;
            }
            toast.error('Upload failed', { id: loadingToast });
            return false;
        } catch (err: unknown) {
            const error = err as Error;
            toast.error('Upload failed: ' + error.message, { id: loadingToast });
            return false;
        }
    }, [repo, uploadAvatar, updateProfile]);

    const handleDeleteProfile = useCallback(async (
        profileId: string,
        storedPassword: string | undefined,
        enteredPassword: string
    ): Promise<boolean> => {
        if (!enteredPassword) {
            toast.error('Please enter your password to confirm');
            return false;
        }

        const loadingToast = toast.loading('Deleting profile...');
        try {
            const { correct } = await ProfileRepository.verifyPassword(
                enteredPassword,
                storedPassword || ''
            );
            if (!correct) {
                toast.error('Incorrect password', { id: loadingToast });
                return false;
            }

            if (repo) {
                const profileToDelete = profiles.find((p) => p.id === profileId);
                await repo.delete(profileId, profileToDelete?.avatar_url);
            }
            deleteProfile(profileId);
            clearStoredSignatures();
            toast.success('Profile deleted successfully', { id: loadingToast });
            return true;
        } catch (err: unknown) {
            const error = err as Error;
            toast.error('Deletion failed: ' + error.message, { id: loadingToast });
            return false;
        }
    }, [repo, profiles, deleteProfile]);

    return {
        handleUpdateName,
        handleUpdatePassword,
        handleUpdateAvatar,
        handleDeleteProfile,
    };
}
