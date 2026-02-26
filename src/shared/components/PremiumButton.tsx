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
        primary: 'accent-gradient text-white shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30',
        secondary: 'glass-new text-white hover:bg-white/[0.08]',
        ghost: 'bg-transparent text-white/60 hover:text-white hover:bg-white/[0.04]',
    };

    const sizes = {
        sm: 'px-4 py-2 text-xs',
        md: 'px-5 py-2.5 text-sm',
        lg: 'px-6 py-3 text-base',
    };

    return (
        <motion.button
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            className={clsx(
                'font-bold rounded-xl transition-all uppercase tracking-wide',
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
