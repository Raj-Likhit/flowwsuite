import React from 'react';
import { User, Plus, Lock } from 'lucide-react';
import type { Profile } from '../../../features/attendance/store/useAttendanceStore';

interface ProfileSettingsProps {
    activeProfile: Profile;
    newName: string;
    setNewName: (name: string) => void;
    newPassword: string;
    setNewPassword: (pwd: string) => void;
    onOpenAvatarPicker: () => void;
    onUpdateName: () => void;
    onUpdatePassword: () => void;
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({
    activeProfile,
    newName,
    setNewName,
    newPassword,
    setNewPassword,
    onOpenAvatarPicker,
    onUpdateName,
    onUpdatePassword,
}) => {
    return (
        <div className="space-y-4 pt-2 border-t border-white/5">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-primary-400 flex items-center gap-2">
                <User className="w-3 h-3" /> Profile Settings
            </h3>
            
            <div className="bg-black/20 rounded-xl p-5 border border-white/5 space-y-6">
                {/* Avatar Update */}
                <div className="flex items-center gap-6">
                    <div className="relative group">
                        <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-white/10 group-hover:border-primary-500 transition-colors">
                            <img 
                                src={activeProfile.avatar_url} 
                                alt={activeProfile.name} 
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <button 
                            onClick={onOpenAvatarPicker}
                            className="absolute -bottom-2 -right-2 bg-primary-500 text-white p-2 rounded-lg shadow-lg hover:bg-primary-400 transition-colors"
                            aria-label="Change avatar"
                        >
                            <Plus className="w-3 h-3" />
                        </button>
                    </div>
                    <div className="flex-1">
                        <div className="text-sm font-bold text-white/90">Profile Picture</div>
                        <div className="text-[10px] text-white/40 mt-1 uppercase tracking-wider">Tap + to update avatar</div>
                    </div>
                </div>

                {/* Name Update */}
                <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-white/40 font-black">Display Name</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Profile name..."
                            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-primary-500 outline-none transition-all"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                        />
                        <button
                            onClick={onUpdateName}
                            className="px-4 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[10px] font-black transition-all"
                        >
                            Update
                        </button>
                    </div>
                </div>

                {/* Password Update */}
                <div className="space-y-2 pt-2 border-t border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                        <Lock className="w-3 h-3 text-primary-400" />
                        <label className="text-[10px] uppercase tracking-widest text-white/40 font-black">Change Password</label>
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="password"
                            placeholder="New password..."
                            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-primary-500 outline-none transition-all"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                        />
                        <button
                            onClick={onUpdatePassword}
                            className="px-4 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[10px] font-black transition-all"
                        >
                            Update
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
