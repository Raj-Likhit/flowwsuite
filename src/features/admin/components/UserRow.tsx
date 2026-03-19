import React from 'react';
import { motion } from 'framer-motion';
import { Ban, Trash2 } from 'lucide-react';

interface UserRowProps {
    name: string;
    email: string;
    status: string;
    flagged?: boolean;
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

export const UserRow = React.memo(({ name, email, status, flagged }: UserRowProps) => (
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
                    <span className="text-sm font-bold text-white block group-hover:text-primary-400 transition-colors">{name}</span>
                    <span className="text-[10px] text-white/40 font-medium tracking-tight italic">{email}</span>
                </div>
            </div>
        </td>
        <td className="px-6 py-5">
            <div className={`flex items-center gap-2 ${flagged ? 'text-orange-400' : 'text-green-400'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${flagged ? 'bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.5)]' : 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]'}`} />
                <span className="text-[10px] font-black uppercase tracking-widest">{status}</span>
            </div>
        </td>
        <td className="px-6 py-5 text-right">
            <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                <button className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all" title="Suspend"><Ban size={16} /></button>
                <button className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 text-white/40 hover:text-red-500 hover:bg-red-500/10 transition-all" title="Terminate"><Trash2 size={16} /></button>
            </div>
        </td>
    </motion.tr>
));

UserRow.displayName = 'UserRow';
