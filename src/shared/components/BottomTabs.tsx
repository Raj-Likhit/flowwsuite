import React from 'react';
import { motion } from 'framer-motion';
import { CalendarCheck, FileText } from 'lucide-react';
import { clsx } from 'clsx';

import { useNavigationStore } from '../store/useNavigationStore';

export type TabId = 'attendance' | 'converter';

const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
    { id: 'converter', label: 'Converter', icon: FileText },
];

export const BottomTabs: React.FC = () => {
    const { activeTab, setActiveTab } = useNavigationStore();
    return (
        <nav
            className="fixed bottom-0 inset-x-0 z-[60] glass-strong safe-bottom"
            role="tablist"
            aria-label="Main navigation"
        >
            <div className="max-w-md mx-auto flex items-center justify-around px-4 pt-2 pb-1">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    const Icon = tab.icon;

                    return (
                        <motion.button
                            whileHover={{ y: -2 }}
                            whileTap={{ y: 2, scale: 0.95 }}
                            key={tab.id}
                            role="tab"
                            aria-selected={isActive}
                            aria-controls={`${tab.id}-panel`}
                            onClick={() => setActiveTab(tab.id)}
                            className={clsx(
                                'relative flex flex-col items-center gap-1 py-2 px-6 rounded-xl transition-colors',
                                isActive ? 'text-white' : 'text-white/35 hover:text-white/60'
                            )}
                        >
                            {/* Active indicator */}
                            {isActive && (
                                <motion.div
                                    layoutId="activeTab"
                                    className="absolute inset-0 rounded-xl accent-gradient opacity-[0.12]"
                                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                />
                            )}

                            <Icon className={clsx('w-5 h-5 relative z-10 transition-transform duration-300', isActive && 'scale-110 text-primary-400')} />
                            <span className={clsx(
                                'text-[10px] font-bold uppercase tracking-wider relative z-10 transition-colors duration-300',
                                isActive ? 'text-primary-400' : ''
                            )}>
                                {tab.label}
                            </span>
                        </motion.button>
                    );
                })}
            </div>
        </nav>
    );
};
