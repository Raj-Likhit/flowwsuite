import React from 'react';
import { GlassCard } from '../../../shared/components/GlassCard';

interface StatCardProps {
    label: string;
    value: string | number;
    icon: React.ReactNode;
    trend: string;
    warning?: boolean;
}

export const StatCard = React.memo(({ label, value, icon, trend, warning }: StatCardProps) => (
    <GlassCard 
        whileHover={{ y: -4, scale: 1.01 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        className="p-6 relative overflow-hidden group cursor-default"
    >
        {/* Top accent line on hover */}
        <div className={`absolute top-0 left-0 w-full h-[1px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${
            warning 
                ? 'bg-gradient-to-r from-transparent via-orange-500 to-transparent' 
                : 'bg-gradient-to-r from-transparent via-primary-500 to-transparent'
        }`} />

        <div className="flex flex-col gap-5">
            <div className="flex justify-between items-start">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    warning ? 'bg-orange-500/10 text-orange-400' : 'bg-primary-500/10 text-primary-500'
                } border border-white/5`}>
                    {icon}
                </div>
                <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${
                    warning 
                        ? 'text-orange-400 border-orange-500/20 bg-orange-500/10' 
                        : 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10'
                }`}>
                    {trend}
                </span>
            </div>
            <div>
                <div className="text-4xl font-black tracking-tighter text-white group-hover:text-primary-400 transition-colors duration-300">
                    {value}
                </div>
                <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.25em] mt-1.5 block">{label}</span>
            </div>
        </div>
    </GlassCard>
));

StatCard.displayName = 'StatCard';
