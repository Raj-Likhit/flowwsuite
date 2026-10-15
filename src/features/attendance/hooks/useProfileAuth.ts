import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '../../../core/lib/supabase';
import { ProfileRepository, createProfileRepository } from '../repository/profileRepository';
import { useAttendanceStore, type Profile } from '../store/useAttendanceStore';

export function useProfileAuth() {
    const setActiveProfile = useAttendanceStore(state => state.setActiveProfile);
    const updateProfile = useAttendanceStore(state => state.updateProfile);

    const [passwordPromptProfile, setPasswordPromptProfile] = useState<Profile | null>(null);
    const [enteredPassword, setEnteredPassword] = useState('');
    const [passwordError, setPasswordError] = useState(false);
    const [loginAttempts, setLoginAttempts] = useState(0);
    const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);

    const closePasswordPrompt = useCallback(() => {
        setPasswordPromptProfile(null);
        setEnteredPassword('');
        setPasswordError(false);
    }, []);

    const unlockProfile = useCallback(async () => {
        if (!passwordPromptProfile) return;

        if (lockoutUntil && Date.now() < lockoutUntil) {
            toast.error('Too many attempts. Try again later.');
            setPasswordError(true);
            return;
        }

        if (lockoutUntil && Date.now() >= lockoutUntil) {
            setLockoutUntil(null);
            setLoginAttempts(0);
        }

        const stored = passwordPromptProfile.password || '123';
        const { correct, needsMigration } = await ProfileRepository.verifyPassword(enteredPassword, stored);

        if (!correct) {
            setPasswordError(true);
            if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
            
            const newAttempts = loginAttempts + 1;
            setLoginAttempts(newAttempts);
            if (newAttempts >= 5) {
                setLockoutUntil(Date.now() + 5 * 60 * 1000);
                toast.error('Too many attempts. Locked out for 5 minutes.');
            }
            return;
        }

        setLoginAttempts(0);
        setLockoutUntil(null);

        setActiveProfile(passwordPromptProfile, 'editable');
        closePasswordPrompt();

        if (needsMigration) {
            const repo = createProfileRepository(supabase);
            if (repo) {
                try {
                    const hashed = await ProfileRepository.hashPassword(enteredPassword);
                    await repo.update(passwordPromptProfile.id, { password: hashed });
                    updateProfile(passwordPromptProfile.id, { password: hashed });
                } catch (err) {
                    console.error('Password migration failed:', err);
                }
            }
        }
    }, [passwordPromptProfile, enteredPassword, loginAttempts, lockoutUntil, setActiveProfile, closePasswordPrompt, updateProfile]);

    const viewAttendance = useCallback(() => {
        if (!passwordPromptProfile) return;
        setActiveProfile(passwordPromptProfile, 'readOnly');
        closePasswordPrompt();
    }, [passwordPromptProfile, setActiveProfile, closePasswordPrompt]);

    return {
        passwordPromptProfile,
        setPasswordPromptProfile,
        enteredPassword,
        setEnteredPassword,
        passwordError,
        setPasswordError,
        closePasswordPrompt,
        unlockProfile,
        viewAttendance,
    };
}
