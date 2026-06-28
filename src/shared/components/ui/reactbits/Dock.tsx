'use client';

import { motion, useMotionValue, useSpring, useTransform, AnimatePresence, type MotionValue } from 'framer-motion';
import { useRef, useState, useMemo, Children, cloneElement, type ReactElement, type ReactNode } from 'react';

import './Dock.css';

interface DockItemProps {
    children?: ReactNode;
    className?: string;
    label: string;
    onClick?: () => void;
    mouseX: MotionValue<number>;
    spring: { mass: number; stiffness: number; damping: number };
    distance?: number;
    magnification?: number;
    baseItemSize?: number;
}

const DockItem = ({
    children,
    className = '',
    label,
    onClick,
    mouseX,
    spring,
    distance = 150,
    magnification = 80,
    baseItemSize = 48
}: DockItemProps) => {
    const ref = useRef<HTMLButtonElement>(null);

    const distanceCalc = useTransform(mouseX, (val: number | undefined) => {
        const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
        return (val ?? 0) - bounds.x - bounds.width / 2;
    });

    const targetSize = useTransform(distanceCalc, [-distance, 0, distance], [baseItemSize, magnification, baseItemSize]);
    const size = useSpring(targetSize, spring);

    const [isHovered, setIsHovered] = useState(false);

    return (
        <motion.button
            type="button"
            ref={ref}
            aria-label={label}
            className={`dock-item ${className}`}
            style={{ width: size, height: size }}
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {Children.map(children, (child) => {
                if (child && (child as ReactElement).type === DockLabel) {
                    return cloneElement(child as ReactElement<{ isHovered: boolean }>, { isHovered });
                }
                return child;
            })}
        </motion.button>
    );
};

function DockLabel({ children, className = '', isHovered }: { children: ReactNode; className?: string; isHovered?: boolean }) {
    return (
        <AnimatePresence>
            {isHovered && (
                <motion.div
                    initial={{ opacity: 0, y: 0 }}
                    animate={{ opacity: 1, y: -10 }}
                    exit={{ opacity: 0, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`dock-label ${className}`}
                    role="tooltip"
                    style={{ x: '-50%' }}
                >
                    {children}
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function DockIcon({ children, className = '' }: { children: ReactNode; className?: string }) {
    return <div className={`dock-icon ${className}`}>{children}</div>;
}

interface DockProps {
    items: Array<{ icon: ReactNode; label: string; onClick: () => void; className?: string }>;
    className?: string;
    spring?: { mass: number; stiffness: number; damping: number };
    magnification?: number;
    distance?: number;
    panelHeight?: number;
    dockHeight?: number;
    baseItemSize?: number;
}

export default function Dock({
    items,
    className = '',
    spring = { mass: 0.1, stiffness: 150, damping: 12 },
    magnification = 60,
    distance = 150,
    panelHeight = 64,
    dockHeight = 256,
    baseItemSize = 45
}: DockProps) {
    const mouseX = useMotionValue(Infinity);
    const isHovered = useMotionValue(0);

    const maxHeight = useMemo(
        () => Math.max(dockHeight, magnification + magnification / 2 + 4),
        [magnification, dockHeight]
    );
    const heightRow = useTransform(isHovered, [0, 1], [panelHeight, maxHeight]);
    const height = useSpring(heightRow, spring);

    return (
        <motion.div style={{ height, scrollbarWidth: 'none' }} className="dock-outer">
            <motion.div
                onMouseMove={({ pageX }) => {
                    isHovered.set(1);
                    mouseX.set(pageX);
                }}
                onMouseLeave={() => {
                    isHovered.set(0);
                    mouseX.set(Infinity);
                }}
                className={`dock-panel glass-strong ${className}`}
                style={{ height: panelHeight }}
                role="toolbar"
                aria-label="Application dock"
            >
                {items.map((item, index) => (
                    <DockItem
                        key={index}
                        label={item.label}
                        onClick={item.onClick}
                        className={item.className}
                        mouseX={mouseX}
                        spring={spring}
                        distance={distance}
                        magnification={magnification}
                        baseItemSize={baseItemSize}
                    >
                        <DockIcon>{item.icon}</DockIcon>
                        <DockLabel>{item.label}</DockLabel>
                    </DockItem>
                ))}
            </motion.div>
        </motion.div>
    );
}
