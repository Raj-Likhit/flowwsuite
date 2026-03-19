import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Trash2 } from 'lucide-react';

interface ModerationCardProps {
    src: string;
    name: string;
}

export const ModerationCard = React.memo(({ src, name }: ModerationCardProps) => (
    <motion.div 
        whileHover={{ scale: 1.04, y: -3 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        className="relative group rounded-2xl overflow-hidden aspect-square border border-white/8 bg-white/5 will-change-transform"
    >
        <img 
            src={src} 
            alt={name} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
            loading="lazy" 
        />

        {/* Scanning line — only on hover */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <motion.div 
                animate={{ top: ['-5%', '105%'] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                className="absolute left-0 w-full h-[1px] bg-primary-500/60 shadow-[0_0_8px_rgba(99,102,241,0.8)]"
            />
        </div>

        {/* Hover actions */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-end p-3 gap-2">
            <span className="text-[9px] font-black text-white uppercase tracking-widest">{name}</span>
            <div className="flex items-center gap-2">
                <button className="w-8 h-8 flex items-center justify-center bg-green-500/20 hover:bg-green-500 rounded-lg text-green-400 hover:text-black transition-all">
                    <CheckCircle size={15} />
                </button>
                <button className="w-8 h-8 flex items-center justify-center bg-red-500/20 hover:bg-red-500 rounded-lg text-red-400 hover:text-white transition-all">
                    <Trash2 size={15} />
                </button>
            </div>
        </div>

        <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.8)] group-hover:opacity-0 transition-opacity" />
    </motion.div>
));

ModerationCard.displayName = 'ModerationCard';
