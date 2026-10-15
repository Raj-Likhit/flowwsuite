import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Megaphone, CheckCircle } from 'lucide-react';
import GlassSurface from './ui/reactbits/GlassSurface';
import { Button } from './ui/Button';
import type { Announcement } from '../types/announcement.types';

interface AnnouncementModalProps {
    announcement: Announcement | null;
    onClose: () => void;
}

export const AnnouncementModal: React.FC<AnnouncementModalProps> = ({ announcement, onClose }) => {
    if (!announcement) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 sm:p-8">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/60 backdrop-blur-md"
                    onClick={onClose}
                />
                
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 30 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 30 }}
                    className="relative w-full max-w-lg z-10"
                >
                    <GlassSurface 
                        width="100%" 
                        height="auto" 
                        className="p-6 sm:p-10 border-white/10 shadow-2xl overflow-hidden relative flex flex-col max-h-[85vh]" 
                        borderRadius={32}
                    >
                        {/* Decorative Background Elements */}
                        <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary-500/10 rounded-full blur-[80px]" />
                        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-secondary-500/10 rounded-full blur-[80px]" />
                        
                        <div className="relative z-10 text-center flex flex-col h-full">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 bg-primary-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 sm:mb-8 border border-primary-500/20 shadow-lg shadow-primary-500/5">
                                <Megaphone className="text-primary-500 w-8 h-8 sm:w-10 sm:h-10" />
                            </div>

                            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight italic uppercase shrink-0">System Update</h2>
                            
                            {announcement.created_at && (
                                <div className="mt-2 mb-4 sm:mb-6 flex justify-center shrink-0">
                                    <div className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-full">
                                        <p className="text-[9px] sm:text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">
                                            Transmission Received: <span className="text-primary-400">
                                                {new Date(announcement.created_at).toLocaleString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: 'numeric',
                                                    minute: '2-digit',
                                                    hour12: true
                                                })}
                                            </span>
                                        </p>
                                    </div>
                                </div>
                            )}
                            
                            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 sm:p-6 mb-6 text-left overflow-y-auto max-h-[30vh]">
                                <p className="text-white/80 text-sm sm:text-lg leading-relaxed font-medium whitespace-pre-wrap">
                                    {announcement.content}
                                </p>
                            </div>

                            <div className="shrink-0 mt-auto">
                                <Button 
                                    onClick={onClose}
                                    className="w-full gap-3 py-5 sm:py-6 text-sm sm:text-base font-black uppercase tracking-widest shadow-xl shadow-primary-500/10 items-center justify-center"
                                >
                                    <CheckCircle size={20} className="shrink-0" />
                                    <span>Acknowledged</span>
                                </Button>
                            </div>
                            
                            <p className="mt-6 text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">
                                Flowwsuite Global Transmission
                            </p>
                        </div>
                    </GlassSurface>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
