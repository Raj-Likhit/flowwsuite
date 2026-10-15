import React from 'react';
import { ShieldAlert, Trash2, Lock } from 'lucide-react';

interface DangerZoneProps {
    showDeleteConfirm: boolean;
    setShowDeleteConfirm: (show: boolean) => void;
    deletePassword: string;
    setDeletePassword: (pwd: string) => void;
    onDeleteProfile: () => void;
}

export const DangerZone: React.FC<DangerZoneProps> = ({
    showDeleteConfirm,
    setShowDeleteConfirm,
    deletePassword,
    setDeletePassword,
    onDeleteProfile,
}) => {
    return (
        <div className="space-y-4 pt-2 border-t border-white/5">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-red-400 flex items-center gap-2">
                <ShieldAlert className="w-3 h-3" /> Danger Zone
            </h3>
            <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4 flex flex-col gap-3">
                <div className="text-sm font-bold text-white/90">Delete Profile</div>
                <div className="text-xs text-white/50 leading-relaxed mb-1">
                    This will permanently delete your profile and all associated data. This action cannot be undone.
                </div>
                
                {!showDeleteConfirm ? (
                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="flex items-center justify-center gap-2 w-full py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-bold transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                        Delete Profile
                    </button>
                ) : (
                    <div className="space-y-2 mt-2">
                        <div className="flex items-center gap-2">
                            <Lock className="w-3 h-3 text-red-400" />
                            <label className="text-[10px] uppercase tracking-widest text-red-400 font-black">Confirm Password</label>
                        </div>
                        <div className="flex gap-2 items-start">
                            <input
                                type="password"
                                placeholder="Enter password to confirm..."
                                className="flex-1 bg-black/40 border border-red-500/30 rounded-lg px-3 py-2 text-sm text-white focus:border-red-500 outline-none transition-all"
                                value={deletePassword}
                                onChange={(e) => setDeletePassword(e.target.value)}
                            />
                            <div className="flex flex-col items-center">
                                <button
                                    onClick={onDeleteProfile}
                                    className="px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                                >
                                    Confirm
                                </button>
                                <button
                                    onClick={() => {
                                        setShowDeleteConfirm(false);
                                        setDeletePassword('');
                                    }}
                                    className="mt-2 text-xs text-white/40 hover:text-white/70 transition-colors text-center"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
