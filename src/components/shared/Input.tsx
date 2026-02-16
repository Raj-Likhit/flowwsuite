import React from 'react';
import { clsx } from 'clsx';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
    label,
    icon,
    className,
    id,
    ...props
}) => {
    const inputId = id || `input-${label.toLowerCase().replace(/\s+/g, '-')}`;

    return (
        <div className={clsx('relative group', className)}>
            <label
                htmlFor={inputId}
                className="block text-[10px] uppercase tracking-[0.15em] font-bold text-white/40 mb-2"
            >
                {label}
            </label>
            <div className="relative">
                {icon && (
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-indigo-400 transition-colors">
                        {icon}
                    </div>
                )}
                <input
                    id={inputId}
                    className={clsx(
                        'w-full bg-white/[0.04] border border-white/[0.08] rounded-xl py-3 text-white font-bold text-lg',
                        'outline-none transition-all duration-200',
                        'focus:border-indigo-500/50 focus:bg-white/[0.06] focus:shadow-lg focus:shadow-indigo-500/5',
                        'placeholder:text-white/20',
                        icon ? 'pl-12 pr-4' : 'px-4',
                        'tabular-nums'
                    )}
                    {...props}
                />
            </div>
        </div>
    );
};
