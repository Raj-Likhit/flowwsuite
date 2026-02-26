import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { clsx } from 'clsx';

interface GlassCardProps extends HTMLMotionProps<'div'> {
    children: React.ReactNode;
    className?: string;
    glow?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
    children,
    className,
    glow = false,
    ...motionProps
}) => {
    return (
        <motion.div
            className={clsx(
                'glass-new rounded-2xl p-5',
                glow && 'shadow-lg shadow-primary-500/5',
                className
            )}
            {...motionProps}
        >
            {children}
        </motion.div>
    );
};
