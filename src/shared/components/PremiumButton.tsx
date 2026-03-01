import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { clsx } from 'clsx';

interface PremiumButtonProps extends HTMLMotionProps<'button'> {
    variant?: 'primary' | 'secondary' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    children: React.ReactNode;
    className?: string;
    disabled?: boolean;
}

export const PremiumButton: React.FC<PremiumButtonProps> = ({
    variant = 'primary',
    size = 'md',
    children,
    className,
    disabled,
    ...motionProps
}) => {
    const variants = {
        primary: 'accent-gradient text-white shadow-xl shadow-primary-500/20 hover:shadow-primary-500/40 border border-white/5',
        secondary: 'glass-tubular bg-white/5 text-white hover:bg-white/10 border border-white/10 shadow-lg shadow-black/20',
        ghost: 'bg-transparent text-white/40 hover:text-white hover:bg-white/5',
    };

    const sizes = {
        sm: 'px-4 py-2 text-xs',
        md: 'px-6 py-3 text-sm',
        lg: 'px-8 py-4 text-base',
    };

    return (
        <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className={clsx(
                'font-black rounded-2xl transition-all uppercase tracking-widest',
                'disabled:opacity-40 disabled:pointer-events-none',
                variants[variant],
                sizes[size],
                className
            )}
            disabled={disabled}
            {...motionProps}
        >
            {children}
        </motion.button>
    );
};
