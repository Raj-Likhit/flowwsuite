import React from 'react';
import { CalendarCheck, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigationStore } from '../store/useNavigationStore';
import Dock from './ui/reactbits/Dock';

export type TabId = 'attendance' | 'converter';

export const BottomTabs: React.FC = () => {
    const { activeTab, setActiveTab } = useNavigationStore();

    const items = [
        {
            icon: <CalendarCheck size={22} className={activeTab === 'attendance' ? 'text-primary-400' : 'text-white/60'} />,
            label: 'Attendance',
            onClick: () => setActiveTab('attendance')
        },
        {
            icon: <FileText size={22} className={activeTab === 'converter' ? 'text-primary-400' : 'text-white/60'} />,
            label: 'Converter',
            onClick: () => setActiveTab('converter')
        }
    ];

    return (
        <div className="fixed bottom-0 inset-x-0 z-[60] pb-2 pointer-events-none flex justify-center">
            <div className="pointer-events-auto w-full max-w-md h-24 relative">
                <Dock
                    items={items.map(item => ({
                        ...item,
                        className: activeTab === item.label.toLowerCase() ? 'ring-1 ring-primary-500/40 relative overflow-visible' : ''
                    }))}
                    panelHeight={64}
                    baseItemSize={48}
                    magnification={68}
                />
                {/* Active Indicator Glow */}
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-16 pointer-events-none">
                    {['attendance', 'converter'].map(tab => (
                        <div key={tab} className="w-8 relative">
                            {activeTab === tab && (
                                <motion.div
                                    layoutId="activeTabGlow"
                                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-primary-500 blur-[4px] rounded-full opacity-60"
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                />
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
