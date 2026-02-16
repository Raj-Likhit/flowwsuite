import React from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '../../components/shared/GlassCard';
import { Shield, TrendingUp, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';

interface SmartLogicCardsProps {
    total: number;
    attended: number;
    percentage: number;
}

export const SmartLogicCards: React.FC<SmartLogicCardsProps> = ({
    total,
    attended,
    percentage,
}) => {
    if (total === 0) return null;

    // Safe to skip: how many more can be skipped and still stay >= 75%
    // attended / (total + X) >= 0.75  →  X = floor(attended / 0.75) - total
    const safeToSkip = Math.max(0, Math.floor(attended / 0.75) - total);

    // Recovery: how many consecutive classes needed to reach 75%
    // (attended + Y) / (total + Y) >= 0.75  →  Y = ceil((0.75 * total - attended) / 0.25)
    const classesNeeded = Math.max(0, Math.ceil((0.75 * total - attended) / 0.25));

    const isAbove75 = percentage >= 75;

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.12 },
        },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 16, scale: 0.96 },
        show: { opacity: 1, y: 0, scale: 1 },
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full"
        >
            {/* Status Card */}
            <GlassCard
                variants={itemVariants}
                className={clsx(
                    'relative overflow-hidden',
                    isAbove75
                        ? 'border-emerald-500/20'
                        : 'border-red-500/20'
                )}
            >
                <div className="relative z-10">
                    <div className={clsx(
                        'flex items-center gap-2 mb-3',
                        isAbove75 ? 'text-emerald-400' : 'text-red-400'
                    )}>
                        {isAbove75 ? (
                            <Shield className="w-4 h-4" />
                        ) : (
                            <AlertTriangle className="w-4 h-4" />
                        )}
                        <span className="text-[10px] font-bold uppercase tracking-[0.15em]">
                            {isAbove75 ? 'Safe Zone' : 'Danger Zone'}
                        </span>
                    </div>

                    <p className="text-white/60 text-xs leading-relaxed">
                        {isAbove75
                            ? `You're above the 75% threshold. Keep it up!`
                            : `You're below 75%. Focus on attending consecutive classes.`}
                    </p>
                </div>

                {/* Background glow */}
                <div className={clsx(
                    'absolute -bottom-8 -right-8 w-32 h-32 rounded-full blur-3xl opacity-10',
                    isAbove75 ? 'bg-emerald-500' : 'bg-red-500'
                )} />
            </GlassCard>

            {/* Action Card */}
            <GlassCard
                variants={itemVariants}
                className="relative overflow-hidden"
            >
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3 text-indigo-400">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-[0.15em]">
                            {isAbove75 ? 'Safe to Skip' : 'Recovery Mode'}
                        </span>
                    </div>

                    {isAbove75 ? (
                        <div>
                            <span className="text-3xl font-black text-white tabular-nums">{safeToSkip}</span>
                            <p className="text-white/50 text-xs mt-1">
                                {safeToSkip === 1 ? 'class' : 'classes'} you can safely miss
                            </p>
                        </div>
                    ) : (
                        <div>
                            <span className="text-3xl font-black text-white tabular-nums">{classesNeeded}</span>
                            <p className="text-white/50 text-xs mt-1">
                                consecutive {classesNeeded === 1 ? 'class' : 'classes'} needed to reach 75%
                            </p>
                        </div>
                    )}
                </div>

                {/* Background glow */}
                <div className="absolute -bottom-8 -right-8 w-32 h-32 rounded-full blur-3xl opacity-10 bg-indigo-500" />
            </GlassCard>
        </motion.div>
    );
};
