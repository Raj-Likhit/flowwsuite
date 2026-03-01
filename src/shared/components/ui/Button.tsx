import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
        const variants = {
            primary: 'bg-primary-500 text-black hover:bg-primary-400 shadow-lg shadow-primary-500/20',
            secondary: 'glass-strong bg-white/5 text-white hover:bg-white/10 border border-white/10',
            ghost: 'bg-transparent text-white/40 hover:text-white',
        };
        const sizes = {
            sm: 'px-3 py-1.5 text-xs',
            md: 'px-6 py-2.5 text-sm',
            lg: 'px-8 py-3.5 text-base',
        };

        return (
            <motion.button
                ref={ref as any}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                    'font-black rounded-2xl transition-all disabled:opacity-50 disabled:pointer-events-none uppercase tracking-widest',
                    variants[variant],
                    sizes[size],
                    className
                )}
                {...(props as any)}
            />
        );
    }
);
