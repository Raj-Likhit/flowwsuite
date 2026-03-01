import React from 'react';
import { Clock, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAttendanceStore } from '../store/useAttendanceStore';
import { toast } from 'sonner';
import SpotlightCard from '../../../shared/components/ui/reactbits/SpotlightCard';

export const AuditTrail: React.FC = () => {
    const { activeProfile, deleteLog } = useAttendanceStore();

    if (!activeProfile || !activeProfile.logs || activeProfile.logs.length === 0) {
        return null;
    }

    return (
        <SpotlightCard className="bg-[#111] p-5 rounded-2xl border border-white/5 space-y-4" spotlightColor="rgba(255, 255, 255, 0.1)">
            <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-secondary-400" />
                <span className="text-[10px] uppercase font-black tracking-widest text-secondary-400">Audit Trail</span>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2 no-scrollbar relative">
                <AnimatePresence mode="popLayout">
                    {activeProfile.logs.map((log) => (
                        <motion.div
                            key={log.id}
                            layout
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                            className="flex justify-between items-center bg-black/40 p-3 rounded-xl border border-white/5 group transition-colors hover:bg-white/5"
                        >
                            <div>
                                <div className="text-xs font-bold text-white/90">{log.title}</div>
                                <div className="text-[10px] text-white/40 font-medium tracking-wider mt-0.5">
                                    {new Date(log.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    deleteLog(log.id);
                                    toast.success('Log entry reverted');
                                }}
                                className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all focus:opacity-100"
                                aria-label="Revert this change"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </SpotlightCard>
    );
};
