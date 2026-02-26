import React, { useEffect, useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';

interface ProgressRingProps {
    percentage: number;
    size?: number;
    strokeWidth?: number;
}

const getColor = (pct: number): string => {
    if (pct > 80) return 'var(--color-emerald)';
    if (pct >= 75) return 'var(--color-amber)';
    return 'var(--color-crimson)';
};

const getGlowColor = (pct: number): string => {
    if (pct > 80) return 'rgba(16, 185, 129, 0.3)';
    if (pct >= 75) return 'rgba(245, 158, 11, 0.3)';
    return 'rgba(239, 68, 68, 0.3)';
};

export const ProgressRing: React.FC<ProgressRingProps> = ({
    percentage,
    size = 220,
    strokeWidth = 12,
}) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const center = size / 2;

    const clampedPct = Math.min(100, Math.max(0, percentage));
    const color = getColor(clampedPct);
    const glowColor = getGlowColor(clampedPct);

    // Animated count-up
    const motionPct = useMotionValue(0);
    const displayPct = useTransform(motionPct, (v) => Math.round(v * 10) / 10);
    const [displayValue, setDisplayValue] = useState<number | string>(0);

    useEffect(() => {
        const controls = animate(motionPct, clampedPct, {
            duration: 1.2,
            ease: [0.16, 1, 0.3, 1],
        });
        return controls.stop;
    }, [clampedPct, motionPct]);

    useEffect(() => {
        const unsubscribe = displayPct.on('change', (v) => setDisplayValue(v));
        return unsubscribe;
    }, [displayPct]);

    const offset = circumference - (clampedPct / 100) * circumference;

    return (
        <div
            className="relative flex items-center justify-center"
            style={{ width: size, height: size }}
            role="progressbar"
            aria-valuenow={Math.round(clampedPct)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Attendance Progress: ${displayValue}%`}
        >
            {/* Visually hidden assertive region for screen readers */}
            <span className="sr-only" aria-live="polite">
                Current attendance is {displayValue} percent. Minimum required is 75 percent.
            </span>

            {/* Glow effect */}
            <div
                className="absolute inset-0 rounded-full opacity-50 blur-2xl animate-ring-pulse"
                style={{ background: glowColor }}
            />

            <svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                className="transform -rotate-90 relative z-10"
                aria-hidden="true"
            >
                {/* Track */}
                <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.06)"
                    strokeWidth={strokeWidth}
                />
                {/* Progress */}
                <motion.circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                    style={{
                        filter: `drop-shadow(0 0 8px ${glowColor})`,
                    }}
                />
            </svg>

            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                <span
                    className="text-5xl font-black tabular-nums tracking-tight"
                    style={{ color }}
                >
                    {typeof displayValue === 'number' ? displayValue.toFixed(1) : displayValue}
                    <span className="text-2xl font-bold opacity-60">%</span>
                </span>
                <span className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-semibold mt-1" aria-hidden="true">
                    Attendance
                </span>
            </div>
        </div>
    );
};
