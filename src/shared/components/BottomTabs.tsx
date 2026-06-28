import React from 'react';
import { CalendarCheck, FileText } from 'lucide-react';
import { motion } from 'framer-motion';

export type TabId = 'attendance' | 'pdf';

interface BottomTabsProps {
    activeTab: TabId;
    setActiveTab: (tab: TabId) => void;
}

export const BottomTabs: React.FC<BottomTabsProps> = ({ activeTab, setActiveTab }) => {

    const items = [
        {
            id: 'attendance' as const,
            icon: CalendarCheck,
            label: 'Attendance',
            onClick: () => setActiveTab('attendance')
        },
        {
            id: 'pdf' as const,
            icon: FileText,
            label: 'PDF Studio',
            onClick: () => setActiveTab('pdf')
        },
    ];

    return (
        <div className="fixed bottom-0 inset-x-0 z-[60] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pointer-events-none flex justify-center">
            <div className="pointer-events-auto relative flex items-center gap-2 rounded-2xl glass-strong border border-white/10 p-2 shadow-2xl">
                {items.map(({ id, icon: Icon, label, onClick }) => {
                    const isActive = activeTab === id;

                    return (
                        <button
                            key={id}
                            type="button"
                            onClick={onClick}
                            aria-label={label}
                            aria-pressed={isActive}
                            className={[
                                'relative flex min-w-28 items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-black uppercase tracking-widest transition-all',
                                isActive
                                    ? 'text-primary-300 bg-primary-500/15 ring-1 ring-primary-500/40'
                                    : 'text-white/50 hover:text-white hover:bg-white/5'
                            ].join(' ')}
                        >
                            {isActive && (
                                <motion.span
                                    layoutId="activeTabPill"
                                    className="absolute inset-0 rounded-xl bg-primary-500/10"
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                />
                            )}
                            <Icon size={18} className="relative" />
                            <span className="relative hidden sm:inline">{label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
