import React from 'react';
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
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center overflow-hidden border border-white/10">
                        <img src="/logo.png" alt="Flowwsuite Logo" className="w-full h-full object-cover" />
                    </div>
                    <span className="text-base sm:text-lg font-bold text-white tracking-tight">
                        Flowwsuite
                    </span>
                </div>

                <div className="flex items-center gap-4">
                    {/* Navigation links removed as requested */}
                </div>
            </div>
        </motion.nav>
    );
};
