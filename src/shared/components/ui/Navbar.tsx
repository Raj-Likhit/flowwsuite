import React from 'react';

import { motion } from 'framer-motion';

export const Navbar: React.FC = () => {
    return (
        <motion.nav
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="fixed top-6 inset-x-6 z-[100] max-w-5xl h-14 mx-auto"
        >
            <div className="absolute inset-0 glass-tubular rounded-2xl border border-white/20"></div>

            <div className="relative h-full px-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center overflow-hidden border border-white/10">
                        <img src="/logo.png" alt="Flowwsuite Logo" className="w-full h-full object-cover" />
                    </div>
                    <span className="text-sm font-black text-white tracking-tighter uppercase">
                        Floww<span className="text-primary-500">suite</span>
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest hidden sm:block">Workspace Engine 2.0</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse"></div>
                </div>
            </div>
        </motion.nav>
    );
};
