import { AnimatePresence, motion } from 'framer-motion';
import { useConverterStore } from '../store/useConverterStore';
import { usePDFGenerator } from '../hooks/usePDFGenerator';
import { useImageProcessor } from '../hooks/useImageProcessor';

import { GlassNavbar } from '../../../shared/components/GlassNavbar';
import { HeroSection } from '../../../shared/components/HeroSection';
import { SmartDropzone } from '../../../shared/components/SmartDropzone';
import MagicBento from '../../../shared/components/ui/reactbits/MagicBento';
import Carousel from '../../../shared/components/ui/reactbits/Carousel';
import { Navbar } from '../../../shared/components/ui/Navbar';
import { SettingsPanel } from './SettingsPanel';
import { ImageGrid } from './ImageGrid';
import { Button } from '../../../shared/components/ui/Button';
import { AlertTriangle, X, Shield, Zap, Image, CheckCircle2 } from 'lucide-react';

const FEATURES = [
    {
        title: "100% Client-Side",
        description: "Your files never leave your device. Zero server uploads, absolute privacy.",
        icon: Shield,
        className: "md:col-span-2"
    },
    {
        title: "HEIC Support",
        description: "Native conversion for iPhone photos without extra tools.",
        icon: Image,
        className: "md:col-span-1"
    },
    {
        title: "GPU Powered",
        description: "Blazing fast rendering using WebAssembly and WebGL.",
        icon: Zap,
        className: "md:col-span-1"
    },
    {
        title: "Unlimited",
        description: "No daily limits. No watermarks. No file size restrictions.",
        icon: CheckCircle2,
        className: "md:col-span-2"
    }
];

export const ConverterView = () => {
    const { pages, error, setError } = useConverterStore();
    const { generatePDF } = usePDFGenerator();
    const { createBlankPage } = useImageProcessor();

    const isWorkspace = pages.length > 0;

    return (
        <div
            id="converter-panel"
            role="tabpanel"
            aria-labelledby="converter-tab"
            className="min-h-screen bg-black text-white"
        >
            {/* Original emerald gradient — needed for converter glass effects */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-primary-500/5 to-transparent" />
            </div>

            <AnimatePresence mode="wait">
                {!isWorkspace ? (
                    <motion.div
                        key="landing"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.5 }}
                    >
                        <GlassNavbar />
                        <main className="relative z-10">
                            <HeroSection />
                            <SmartDropzone />
                            <div className="max-w-7xl mx-auto px-6 space-y-24 pb-24">
                                <MagicBento
                                    cards={FEATURES}
                                    enableSpotlight={true}
                                    enableBorderGlow={true}
                                    enableTilt={true}
                                    clickEffect={true}
                                    enableMagnetism={true}
                                    particleCount={12}
                                    textAutoHide={false}
                                    glowColor="var(--primary-500)"
                                />

                                <div className="space-y-12">
                                    <div className="text-center">
                                        <h2 className="text-3xl font-bold tracking-tight text-white mb-3">Infinite Possibilities</h2>
                                        <p className="text-white/40 text-sm max-w-lg mx-auto">Discover the versatility of FlowSuite's generation engine. Create professional documents in seconds.</p>
                                    </div>
                                    <div className="flex justify-center">
                                        <Carousel baseWidth={window.innerWidth > 768 ? 600 : 350} autoplay={true} loop={true} />
                                    </div>
                                </div>
                            </div>
                        </main>
                        <footer className="py-8 text-center text-white/40 text-sm border-t border-white/5 mx-6">
                            <p>© 2025 Flowwsuite. Built for Speed.</p>
                        </footer>
                    </motion.div>
                ) : (
                    <motion.div
                        key="workspace"
                        initial={{ clipPath: 'inset(10% 0 10% 0)', opacity: 0, scale: 0.95 }}
                        animate={{ clipPath: 'inset(0% 0 0% 0)', opacity: 1, scale: 1 }}
                        exit={{ clipPath: 'inset(10% 0 10% 0)', opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                        className="relative z-10"
                    >
                        <Navbar />
                        <main className="max-w-7xl mx-auto p-4 pt-24 space-y-8 pb-32">
                            <AnimatePresence>
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0, y: -20 }}
                                        animate={{ opacity: 1, height: 'auto', y: 0 }}
                                        exit={{ opacity: 0, height: 0, scale: 0.95 }}
                                        className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-start justify-between gap-3 text-red-400"
                                    >
                                        <div className="flex items-start gap-3">
                                            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                            <div className="text-sm font-medium leading-relaxed">{error}</div>
                                        </div>
                                        <button onClick={() => setError(null)} className="p-1 hover:bg-red-500/10 rounded-lg transition-colors">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <SettingsPanel />
                                <ImageGrid />

                                {/* Floating Actions — sits above BottomTabs (Dock) */}
                                <div className="fixed bottom-[max(5.5rem,calc(env(safe-area-inset-bottom)+5.5rem))] inset-x-0 p-4 pb-6 glass-strong bg-white/5 backdrop-blur-2xl border-t border-white/10 z-[70] md:bottom-36 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:p-2 md:rounded-2xl md:border md:shadow-2xl md:ring-1 md:ring-white/10">
                                    <div className="flex items-center gap-2 sm:gap-3 justify-center max-w-md mx-auto">
                                        <Button variant="secondary" onClick={createBlankPage} className="flex-1 md:flex-none active:scale-95 transition-transform py-3 sm:py-2.5">
                                            + Blank
                                        </Button>
                                        <div className="h-8 w-[1px] bg-white/10 hidden sm:block" />
                                        <motion.div
                                            className="flex-1 md:flex-none"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <Button onClick={generatePDF} className="w-full shadow-primary-500/20 py-3 sm:py-2.5">
                                                Export PDF
                                            </Button>
                                        </motion.div>
                                    </div>
                                </div>
                            </div>
                        </main>
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
};
