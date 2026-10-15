import React from 'react';
import { Eye, EyeOff, Bell, BellOff } from 'lucide-react';
import type { Profile } from '../../../features/attendance/store/useAttendanceStore';

interface AccessibilitySettingsProps {
    isHighContrast: boolean;
    toggleHighContrast: () => void;
    activeProfile: Profile | null;
    isSupported: boolean;
    isSubscribed: boolean;
    subscribeToPush: () => void;
    unsubscribeFromPush: () => void;
    isReadOnly: boolean;
    updateTargetGoal: (id: string, goal: number) => void;
}

export const AccessibilitySettings: React.FC<AccessibilitySettingsProps> = ({
    isHighContrast,
    toggleHighContrast,
    activeProfile,
    isSupported,
    isSubscribed,
    subscribeToPush,
    unsubscribeFromPush,
    isReadOnly,
    updateTargetGoal,
}) => {
    return (
        <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-primary-400 flex items-center gap-2">
                <Eye className="w-3 h-3" /> Accessibility & View
            </h3>
            <div className="bg-black/20 rounded-xl p-4 border border-white/5 flex items-center justify-between">
                <div>
                    <div className="text-sm font-bold text-white/90">High Contrast Mode</div>
                    <div className="text-xs text-white/40 mt-1">Enhance visibility with distinct colors</div>
                </div>
                <button
                    onClick={toggleHighContrast}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors relative group"
                    aria-pressed={isHighContrast}
                    aria-label="Toggle High Contrast"
                >
                    {isHighContrast ? (
                        <Eye className="w-5 h-5 text-emerald-400" />
                    ) : (
                        <EyeOff className="w-5 h-5 text-white/40 group-hover:text-white" />
                    )}
                </button>
            </div>

            {activeProfile && isSupported && (
                <div className="bg-black/20 rounded-xl p-4 border border-white/5 flex items-center justify-between mt-3">
                    <div>
                        <div className="text-sm font-bold text-white/90">Push Notifications</div>
                        <div className="text-xs text-white/40 mt-1">Receive lock-screen alerts for announcements</div>
                    </div>
                    <button
                        onClick={isSubscribed ? unsubscribeFromPush : subscribeToPush}
                        disabled={isReadOnly}
                        className={`p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors relative group ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
                        aria-pressed={isSubscribed}
                        aria-label="Toggle Push Notifications"
                    >
                        {isSubscribed ? (
                            <Bell className="w-5 h-5 text-emerald-400" />
                        ) : (
                            <BellOff className="w-5 h-5 text-white/40 group-hover:text-white" />
                        )}
                    </button>
                </div>
            )}

            {activeProfile && (
                <div className="bg-black/20 rounded-xl p-4 border border-white/5 mt-3 space-y-3">
                    <div>
                        <div className="text-sm font-bold text-white/90 flex justify-between">
                            <span>Target Goal</span>
                            <span className="text-primary-400">{activeProfile.targetGoal ?? 75}%</span>
                        </div>
                        <div className="text-xs text-white/40 mt-1">Set your custom attendance target requirement</div>
                    </div>
                    <input 
                        type="range" 
                        min="1" max="100" 
                        value={activeProfile.targetGoal ?? 75}
                        onChange={(e) => updateTargetGoal(activeProfile.id, parseInt(e.target.value, 10))}
                        className="w-full accent-primary-500 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
                    />
                </div>
            )}
        </div>
    );
};
