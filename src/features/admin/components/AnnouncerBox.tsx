import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, UserCheck, Send } from 'lucide-react';
import { GlassCard } from '../../../shared/components/GlassCard';
import { PremiumButton } from '../../../shared/components/PremiumButton';
import type { AdminProfile, TargetType } from '../types/admin.types';

interface AnnouncerBoxProps {
    allProfiles: AdminProfile[];
    isPublishing: boolean;
    onPublish: (content: string, type: TargetType, profileId: string, expiresAt: string | null) => Promise<boolean>;
}

export const AnnouncerBox = React.memo(({ allProfiles, isPublishing, onPublish }: AnnouncerBoxProps) => {
    const [announcement, setAnnouncement] = useState('');
    const [targetType, setTargetType] = useState<TargetType>('all');
    const [selectedProfileId, setSelectedProfileId] = useState<string>('');

    const [expiryHours, setExpiryHours] = useState<number | null>(48);

    const handleExecute = async () => {
        const expiresAt = expiryHours
            ? new Date(Date.now() + expiryHours * 3600 * 1000).toISOString()
            : null;
        const success = await onPublish(announcement, targetType, selectedProfileId, expiresAt);
        if (success) {
            setAnnouncement('');
            setSelectedProfileId('');
        }
    };

    return (
        <div className="space-y-4">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-white/30">System Announcement</h2>
            <GlassCard className="p-6 relative overflow-hidden group/announcer">
                {/* Top accent hover line */}
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary-500 to-transparent opacity-0 group-hover/announcer:opacity-100 transition-opacity duration-500" />

                <div className="flex flex-col gap-5 w-full">
                    {/* Target Selector */}
                    <div className="flex items-center gap-2 bg-black/30 p-1 rounded-xl w-fit border border-white/5">
                        <button 
                            onClick={() => setTargetType('all')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all relative z-10 ${targetType === 'all' ? 'text-white' : 'text-white/30 hover:text-white/60'}`}
                        >
                            {targetType === 'all' && (
                                <motion.div 
                                    layoutId="activeTargetAdmin"
                                    className="absolute inset-0 bg-primary-600 rounded-lg -z-10 shadow-md shadow-primary-500/20"
                                />
                            )}
                            <Globe size={12} />
                            Broadcast
                        </button>
                        <button 
                            onClick={() => setTargetType('single')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all relative z-10 ${targetType === 'single' ? 'text-white' : 'text-white/30 hover:text-white/60'}`}
                        >
                            {targetType === 'single' && (
                                <motion.div 
                                    layoutId="activeTargetAdmin"
                                    className="absolute inset-0 bg-orange-600 rounded-lg -z-10 shadow-md shadow-orange-500/20"
                                />
                            )}
                            <UserCheck size={12} />
                            Targeted
                        </button>
                    </div>

                    {/* Profile Selector */}
                    <AnimatePresence>
                        {targetType === 'single' && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                            >
                                <select 
                                    value={selectedProfileId}
                                    onChange={(e) => setSelectedProfileId(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500/40 text-sm cursor-pointer transition-colors"
                                >
                                    <option value="" disabled className="bg-zinc-900">Select profile...</option>
                                    {allProfiles.map(p => (
                                        <option key={p.id} value={p.id} className="bg-zinc-900">{p.name}</option>
                                    ))}
                                </select>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Expiry Selector */}
                    <select
                        value={expiryHours ?? ''}
                        onChange={(e) => setExpiryHours(e.target.value ? Number(e.target.value) : null)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500/40 text-sm cursor-pointer transition-colors"
                    >
                        <option value="24" className="bg-zinc-900">Expires in 24 hours</option>
                        <option value="48" className="bg-zinc-900">Expires in 48 hours</option>
                        <option value="168" className="bg-zinc-900">Expires in 7 days</option>
                        <option value="" className="bg-zinc-900">No expiry</option>
                    </select>

                    {/* Textarea */}
                    <textarea
                        value={announcement}
                        onChange={(e) => setAnnouncement(e.target.value)}
                        placeholder={targetType === 'all' ? "Message to all users..." : "Message for selected user..."}
                        className="w-full h-28 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-primary-500/40 transition-colors resize-none text-sm leading-relaxed"
                    />

                    {/* Footer */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] leading-relaxed">
                            {targetType === 'all' ? '// GLOBAL BROADCAST' : '// TARGETED MESSAGE'}
                        </p>
                        <PremiumButton 
                            variant="primary"
                            size="sm"
                            onClick={handleExecute}
                            disabled={isPublishing || !announcement.trim() || (targetType === 'single' && !selectedProfileId)}
                            className="flex items-center gap-2 px-5 py-2.5 w-full sm:w-auto justify-center"
                        >
                            {isPublishing ? "Sending..." : (
                                <>
                                    <Send size={13} />
                                    <span>Transmit</span>
                                </>
                            )}
                        </PremiumButton>
                    </div>
                </div>
            </GlassCard>
        </div>
    );
});

AnnouncerBox.displayName = 'AnnouncerBox';
