import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Zap, Image, CheckCircle2 } from 'lucide-react';
import { clsx } from 'clsx';

const features = [
    {
        title: "100% Client-Side",
        description: "Your files never leave your device. Zero server uploads, absolute privacy.",
        icon: Shield,
        className: "md:col-span-2 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20"
    },
    {
        title: "HEIC Support",
        description: "Native conversion for iPhone photos without extra tools.",
        icon: Image,
        className: "md:col-span-1 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20"
    },
    {
        title: "GPU Powered",
        description: "Blazing fast rendering using WebAssembly and WebGL.",
        icon: Zap,
        className: "md:col-span-1 bg-slate-900/50 border-white/10"
    },
    {
        title: "Unlimited",
        description: "No daily limits. No watermarks. No file size restrictions.",
        icon: CheckCircle2,
        className: "md:col-span-2 bg-slate-900/50 border-white/10"
    }
];

export const BentoGrid: React.FC = () => {
    return (
        <div className="max-w-7xl mx-auto px-6 pb-32">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {features.map((feature, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1 }}
                        className={clsx(
                            "group relative p-8 rounded-3xl border backdrop-blur-sm overflow-hidden hover:scale-[1.02] transition-transform duration-300",
                            feature.className
                        )}
                    >
                        <div className="absolute inset-0 bg-slate-950/20 z-0"></div>
                        <div className="relative z-10">
                            <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center mb-6 ring-1 ring-white/10 group-hover:scale-110 transition-transform">
                                <feature.icon className="w-6 h-6 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">{feature.description}</p>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};
