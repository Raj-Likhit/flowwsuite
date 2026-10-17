import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '../../../core/lib/supabase';
import { ProfileRepository, createProfileRepository } from '../repository/profileRepository';
import { useAttendanceStore, type Profile } from '../store/useAttendanceStore';

export function useProfileAuth() {
    const setActiveProfile = useAttendanceStore(state => state.setActiveProfile);

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

        let currentAttempts = loginAttempts;
        if (lockoutUntil && Date.now() >= lockoutUntil) {
            setLockoutUntil(null);
            setLoginAttempts(0);
            currentAttempts = 0;
        }

        const repo = createProfileRepository(supabase);
        if (!repo) {
            toast.error('Database connection unavailable');
            return;
        }

        const result = await repo.verifyAndUnlock(passwordPromptProfile.id, enteredPassword);

        if (!result.success || !result.profile) {
            setPasswordError(true);
            if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
            
            const newAttempts = currentAttempts + 1;
            setLoginAttempts(newAttempts);
            if (newAttempts >= 5) {
                setLockoutUntil(Date.now() + 5 * 60 * 1000);
                toast.error('Too many attempts. Locked out for 5 minutes.');
            }
            return;
        }

        setLoginAttempts(0);
        setLockoutUntil(null);

        setActiveProfile(result.profile, 'editable');
        closePasswordPrompt();

        if (result.needsMigration) {
            try {
                const hashed = await ProfileRepository.hashPassword(enteredPassword);
                await repo.update(result.profile.id, { password: hashed });
            } catch (err) {
                console.error('Password migration failed:', err);
            }
        }
    }, [passwordPromptProfile, enteredPassword, loginAttempts, lockoutUntil, setActiveProfile, closePasswordPrompt]);

    const viewAttendance = useCallback(async () => {
        if (!passwordPromptProfile) return;
        const repo = createProfileRepository(supabase);
        if (repo) {
            const fullProfile = await repo.fetchProfileAttendance(passwordPromptProfile.id);
            if (fullProfile) {
                setActiveProfile(fullProfile, 'readOnly');
                closePasswordPrompt();
                return;
            }
        }
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
