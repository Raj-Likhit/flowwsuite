import React from 'react';
import { motion } from 'framer-motion';

export const HeroSection: React.FC = () => {
    return (
        <section className="relative pt-32 pb-16 sm:pt-40 sm:pb-24 text-center px-6">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8 }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/20 rounded-full blur-[120px] -z-10 animate-blob"
            />



            <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-5xl sm:text-7xl font-bold text-white tracking-tight mb-6 max-w-4xl mx-auto leading-[1.1]"
            >
                Secure Image to PDF <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 animate-gradient-x">
                    Conversion Engine
                </span>
            </motion.h1>

            <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed"
            >
                Transform your images into professional PDFs without uploading them to any server.
            </motion.p>
        </section>
    );
};
