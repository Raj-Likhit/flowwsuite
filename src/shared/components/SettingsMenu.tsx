import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, X } from 'lucide-react';
import { useThemeStore } from '../store/useThemeStore';
import { useAttendanceStore } from '../../features/attendance/store/useAttendanceStore';
import { GlassCard } from './GlassCard';
import { ProfilePicturePicker } from './ProfilePicturePicker';
import { usePushNotifications } from '../../features/attendance/hooks/usePushNotifications';
import { useSettingsActions } from '../hooks/useSettingsActions';
import { AccessibilitySettings } from './settings/AccessibilitySettings';
import { ThemeSettings } from './settings/ThemeSettings';
import { ProfileSettings } from './settings/ProfileSettings';
import { DangerZone } from './settings/DangerZone';

export const SettingsMenu: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [newName, setNewName] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [showPicker, setShowPicker] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');

    const { isHighContrast, toggleHighContrast, theme, setTheme } = useThemeStore();
    const { updateTargetGoal, activeProfile, accessMode } = useAttendanceStore();
    const isReadOnly = accessMode === 'readOnly';
    const { isSupported, isSubscribed, subscribeToPush, unsubscribeFromPush } = usePushNotifications(activeProfile?.id);

    const {
        handleUpdateName,
        handleUpdatePassword,
        handleUpdateAvatar,
        handleDeleteProfile,
    } = useSettingsActions();

    // Reset fields on menu open
    useEffect(() => {
        if (isOpen && activeProfile) {
            setNewName(activeProfile.name);
            setNewPassword('');
            setDeletePassword('');
            setShowDeleteConfirm(false);
        }
    }, [isOpen, activeProfile]);

    const onUpdateName = async () => {
        if (!activeProfile) return;
        await handleUpdateName(activeProfile.id, newName);
    };

    const onUpdatePassword = async () => {
        if (!activeProfile) return;
        const success = await handleUpdatePassword(activeProfile.id, newPassword);
        if (success) setNewPassword('');
    };

    const onDeleteProfile = async () => {
        if (!activeProfile) return;
        const success = await handleDeleteProfile(
            activeProfile.id,
            undefined,
            deletePassword
        );
        if (success) {
            setIsOpen(false);
        }
    };

    const onCropComplete = async (blob: Blob) => {
        if (!activeProfile) return;
        const success = await handleUpdateAvatar(activeProfile.id, blob);
        if (success) {
            setShowPicker(false);
        }
    };

    return (
        <>
            <motion.button
                whileHover={{ scale: 1.1, rotate: 15 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsOpen(true)}
                className="p-3 bg-white/5 hover:bg-white/10 backdrop-blur-md rounded-full border border-white/10 transition-colors shadow-xl"
                aria-label="Open Settings"
            >
                <Settings className="w-5 h-5 text-white/70" />
            </motion.button>

            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <GlassCard
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative w-full max-w-md p-6 border border-white/10 shadow-2xl flex flex-col max-h-[90vh]"
                        >
                            <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                                <h2 className="text-xl font-black tracking-tight text-white">App Settings</h2>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                                    aria-label="Close Settings"
                                >
                                    <X className="w-5 h-5 text-white/60" />
                                </button>
                            </div>

                            <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar">
                                <AccessibilitySettings
                                    isHighContrast={isHighContrast}
                                    toggleHighContrast={toggleHighContrast}
                                    activeProfile={activeProfile}
                                    isSupported={isSupported}
                                    isSubscribed={isSubscribed}
                                    subscribeToPush={subscribeToPush}
                                    unsubscribeFromPush={unsubscribeFromPush}
                                    isReadOnly={isReadOnly}
                                    updateTargetGoal={updateTargetGoal}
                                />

                                <ThemeSettings
                                    currentTheme={theme}
                                    setTheme={setTheme}
                                />

                                {activeProfile && !isReadOnly && (
                                    <>
                                        <ProfileSettings
                                            activeProfile={activeProfile}
                                            newName={newName}
                                            setNewName={setNewName}
                                            newPassword={newPassword}
                                            setNewPassword={setNewPassword}
                                            onOpenAvatarPicker={() => setShowPicker(true)}
                                            onUpdateName={onUpdateName}
                                            onUpdatePassword={onUpdatePassword}
                                        />

                                        <DangerZone
                                            showDeleteConfirm={showDeleteConfirm}
                                            setShowDeleteConfirm={setShowDeleteConfirm}
                                            deletePassword={deletePassword}
                                            setDeletePassword={setDeletePassword}
                                            onDeleteProfile={onDeleteProfile}
                                        />
                                    </>
                                )}
                            </div>
                        </GlassCard>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showPicker && (
                    <ProfilePicturePicker 
                        onCropComplete={onCropComplete}
                        onClose={() => setShowPicker(false)}
                    />
                )}
            </AnimatePresence>
        </>
    );
};
