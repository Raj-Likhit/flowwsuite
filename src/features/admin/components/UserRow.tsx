import React from 'react';
import { motion } from 'framer-motion';
import { Ban, Trash2, Pencil, Check, X } from 'lucide-react';
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

export const UserRow = React.memo(({ id, name, email, status, flagged, isSuspended, attended, total, onEdit, onSuspend, onTerminate }: UserRowProps) => {
    const [isConfirming, setIsConfirming] = React.useState(false);

    return (
    <motion.tr 
        variants={itemVariants}
        initial="hidden"
        animate="show"
        exit={{ opacity: 0, x: -20 }}
        className="group hover:bg-white/5 transition-all duration-300"
    >
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
        <td className="px-6 py-5">
            <div className={`flex items-center gap-2 ${isSuspended ? 'text-red-400' : flagged ? 'text-orange-400' : 'text-green-400'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${isSuspended ? 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.5)]' : flagged ? 'bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.5)]' : 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]'}`} />
                <span className="text-[10px] font-black uppercase tracking-widest">
                    {isSuspended ? 'Suspended' : flagged ? 'Flagged' : status}
                </span>
            </div>
        </td>
        <td className="px-6 py-5 text-right">
            <div className="flex items-center justify-end gap-3 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all translate-x-0 sm:translate-x-4 sm:group-hover:translate-x-0">
                <button 
                    onClick={() => onEdit({ id, name, avatar_url: null, is_suspended: isSuspended, is_flagged: flagged, attended, total })}
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
                            onClick={() => {
                                onTerminate(id);
                                setIsConfirming(false);
                            }}
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
