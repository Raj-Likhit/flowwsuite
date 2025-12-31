import React from 'react';
import { Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export const GlassNavbar: React.FC = () => {
    return (
        <motion.nav
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="fixed top-0 inset-x-0 z-50 h-16 sm:h-20"
        >
            <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xl border-b border-white/5"></div>

            <div className="relative max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                        <Zap className="w-5 h-5 text-slate-950 fill-current" />
                    </div>
                    <span className="text-lg font-bold text-white tracking-tight">
                        Convert<span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Flow</span>
                    </span>
                </div>

                <div className="flex items-center gap-6">
                    <a href="https://github.com" target="_blank" rel="noreferrer" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
                        GitHub
                    </a>
                    <button className="hidden sm:flex text-xs font-bold bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg backdrop-blur-md border border-white/5 transition-all">
                        v1.0.0
                    </button>
                </div>
            </div>
        </motion.nav>
    );
};
