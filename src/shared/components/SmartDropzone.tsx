import React, { useRef, useState, type ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, FileImage, ArrowRight } from 'lucide-react';
import { useImageProcessor } from '../../features/converter/hooks/useImageProcessor';

export const SmartDropzone: React.FC = () => {
    const { processFiles } = useImageProcessor();
    const [isHovered, setIsHovered] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        processFiles(files);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsHovered(false);
        const files = Array.from(e.dataTransfer.files);
        if (files.length) processFiles(files);
    };

    return (
        <div className="relative max-w-2xl mx-auto px-6 mb-20">
            <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="relative group cursor-pointer"
                onDragOver={(e) => { e.preventDefault(); setIsHovered(true); }}
                onDragLeave={() => setIsHovered(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
            >
                {/* Animated Border Gradient */}
                <div className={`absolute -inset-0.5 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-2xl blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 ${isHovered ? 'opacity-100' : ''}`}></div>

                <div className="relative glass-tubular bg-white/5 ring-1 ring-white/10 rounded-2xl p-8 sm:p-12 flex flex-col items-center justify-center overflow-hidden shadow-2xl shadow-black/40">
                    <input
                        ref={inputRef}
                        type="file"
                        multiple
                        accept="image/*,.heic"
                        className="hidden"
                        onChange={handleFileChange}
                    />

                    {/* Background Pattern */}
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>

                    <div className="relative z-10 flex flex-col items-center">
                        <motion.div
                            animate={{ y: isHovered ? -10 : 0, scale: isHovered ? 1.05 : 1 }}
                            transition={{ type: "spring", stiffness: 400, damping: 20 }}
                            className={`w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mb-6 border border-white/5 shadow-2xl ${isHovered ? 'bg-primary-500/10 border-primary-500/20 text-primary-400 shadow-primary-500/20' : 'text-white/40'}`}
                        >
                            <UploadCloud className="w-10 h-10 transition-colors" />
                        </motion.div>

                        <h3 className="text-2xl font-bold text-white mb-2">
                            Drop images here
                        </h3>
                        <p className="text-white/40 text-sm mb-8 text-center max-w-xs">
                            Support for <span className="text-white/70">JPG, PNG, HEIC</span>. <br />
                            We handle the compression.
                        </p>

                        <motion.button
                            whileHover={{ x: 5 }}
                            transition={{ type: "spring", stiffness: 400, damping: 20 }}
                            className="flex items-center gap-2 text-sm font-bold text-primary-400 hover:text-primary-300"
                        >
                            Browse files <ArrowRight className="w-4 h-4" />
                        </motion.button>
                    </div>

                    {/* Decorative Elements */}
                    <AnimatePresence>
                        {isHovered && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-md z-20"
                            >
                                <div className="text-center">
                                    <FileImage className="w-12 h-12 text-primary-400 mx-auto mb-4 animate-bounce" />
                                    <p className="text-xl font-bold text-white">Release to Import</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
};
