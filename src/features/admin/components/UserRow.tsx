import React from 'react';
import { motion } from 'framer-motion';
import { Ban, Trash2, Pencil, Check, X, Clock } from 'lucide-react';
import type { AdminProfile } from '../types/admin.types';

interface UserRowProps {
    id: string;
    name: string;
    email: string;
    status: string;
    flagged?: boolean;
    isSuspended?: boolean;
    attended?: number;
    total?: number;
    lastActiveAt?: string | null;
    onEdit: (profile: AdminProfile) => void;
    onSuspend: (id: string, current: boolean) => void;
    onTerminate: (id: string) => void;
}

const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    show: { 
        opacity: 1, 
        x: 0,
        transition: {
            duration: 0.3,
            ease: "easeOut" as const
        }
    }
};

function formatLastActive(isoString: string | null | undefined): {
    label: string;
    color: string;
    dotColor: string;
    tag?: string;
} {
    if (!isoString) {
        return { label: 'Never synced', color: 'text-white/25', dotColor: 'bg-white/20', tag: 'Dead' };
    }
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 1) {
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        return diffHours < 1
            ? { label: 'Just now', color: 'text-green-400', dotColor: 'bg-green-400' }
            : { label: `${diffHours}h ago`, color: 'text-green-400', dotColor: 'bg-green-400' };
    }
    if (diffDays < 7)  return { label: `${diffDays}d ago`, color: 'text-green-400', dotColor: 'bg-green-400' };
    if (diffDays < 30) return { label: `${diffDays}d ago`, color: 'text-amber-400', dotColor: 'bg-amber-400' };
    if (diffDays < 60) return { label: `${diffDays}d ago`, color: 'text-red-400', dotColor: 'bg-red-400' };
    return { label: `${diffDays}d ago`, color: 'text-red-400/60', dotColor: 'bg-red-400/40', tag: 'Dead' };
}

export const UserRow = React.memo(({ id, name, email, status, flagged, isSuspended, attended, total, lastActiveAt, onEdit, onSuspend, onTerminate }: UserRowProps) => {
    const [isConfirming, setIsConfirming] = React.useState(false);
    const activity = formatLastActive(lastActiveAt);

    return (
    <motion.tr 
        variants={itemVariants}
        initial="hidden"
        animate="show"
        exit={{ opacity: 0, x: -20 }}
        className="group hover:bg-white/5 transition-all duration-300"
    >
        {/* Name + email */}
        <td className="px-6 py-5">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center font-black text-sm text-primary-500 border border-primary-500/10 group-hover:scale-110 transition-transform">
                    {name.charAt(0)}
                </div>
                <div>
                    <span className="text-sm font-bold text-white block group-hover:text-primary-400 transition-colors uppercase tracking-tight">{name}</span>
                    <span className="text-[10px] text-white/40 font-medium tracking-tight italic">{email}</span>
                </div>
            </div>
        </td>

        {/* Status */}
        <td className="px-6 py-5">
            <div className={`flex items-center gap-2 ${isSuspended ? 'text-red-400' : flagged ? 'text-orange-400' : 'text-green-400'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${isSuspended ? 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.5)]' : flagged ? 'bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.5)]' : 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]'}`} />
                <span className="text-[10px] font-black uppercase tracking-widest">
                    {isSuspended ? 'Suspended' : flagged ? 'Flagged' : status}
                </span>
            </div>
        </td>

        {/* Last active */}
        <td className="px-6 py-5">
            <div className="flex items-center gap-2">
                <Clock size={11} className={activity.color} />
                <span className={`text-[10px] font-bold ${activity.color}`}>{activity.label}</span>
                {activity.tag && (
                    <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400/80">
                        {activity.tag}
                    </span>
                )}
            </div>
        </td>

        {/* Actions */}
        <td className="px-6 py-5 text-right">
            <div className="flex items-center justify-end gap-3 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all translate-x-0 sm:translate-x-4 sm:group-hover:translate-x-0">
                <button 
                    onClick={() => onEdit({ id, name, avatar_url: null, is_suspended: isSuspended, is_flagged: flagged, attended, total, last_active_at: lastActiveAt })}
                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 text-white/40 hover:text-primary-400 hover:bg-primary-500/10 transition-all"
                    title="Edit"
                >
                    <Pencil size={16} />
                </button>
                <button 
                    onClick={() => onSuspend(id, !!isSuspended)}
                    className={`w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 transition-all ${isSuspended ? 'text-green-400 hover:bg-green-500/10' : 'text-white/40 hover:text-white hover:bg-white/10'}`} 
                    title={isSuspended ? "Unsuspend" : "Suspend"}
                >
                    <Ban size={16} />
                </button>
                {isConfirming ? (
                    <div className="flex items-center gap-1">
                        <button 
                            onClick={() => { onTerminate(id); setIsConfirming(false); }}
                            className="w-9 h-9 flex items-center justify-center rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/40 hover:text-white transition-all" 
                            title="Confirm"
                        >
                            <Check size={16} />
                        </button>
                        <button 
                            onClick={() => setIsConfirming(false)}
                            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all" 
                            title="Cancel"
                        >
                            <X size={16} />
                        </button>
                    </div>
                ) : (
                    <button 
                        onClick={() => setIsConfirming(true)}
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 text-white/40 hover:text-red-500 hover:bg-red-500/10 transition-all" 
                        title="Terminate"
                    >
                        <Trash2 size={16} />
                    </button>
                )}
            </div>
        </td>
    </motion.tr>
    );
});

UserRow.displayName = 'UserRow';


