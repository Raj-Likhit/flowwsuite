import React from 'react';
import { Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export const GlassNavbar: React.FC = () => {
    return (
        <motion.nav
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-6 inset-x-6 z-[100] max-w-4xl h-14 sm:h-16 mx-auto"
        >
            <div className="absolute inset-0 glass-tubular rounded-full border border-white/20"></div>

            <div className="relative h-full px-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-primary-400/20 to-primary-600/20 rounded-lg flex items-center justify-center border border-primary-500/20 shadow-lg shadow-primary-500/10">
                        <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-primary-400 fill-current" />
                    </div>
                    <span className="text-base sm:text-lg font-bold text-white tracking-tight">
                        Convert<span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-primary-300">Flow</span>
                    </span>
                </div>

                <div className="flex items-center gap-4">
                    {/* Navigation links removed as requested */}
                </div>
            </div>
        </motion.nav>
    );
};
