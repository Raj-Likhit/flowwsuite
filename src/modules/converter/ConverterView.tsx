import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../../store/useStore';
import { usePDFGenerator } from '../../lib/usePDFGenerator';
import { useImageProcessor } from '../../lib/useImageProcessor';

import { GlassNavbar } from '../../components/landing/GlassNavbar';
import { HeroSection } from '../../components/landing/HeroSection';
import { SmartDropzone } from '../../components/landing/SmartDropzone';
import { BentoGrid } from '../../components/landing/BentoGrid';
import { Navbar } from '../../components/ui/Navbar';
import { SettingsPanel } from '../../components/features/SettingsPanel';
import { ImageGrid } from '../../components/features/ImageGrid';
import { Button } from '../../components/ui/Button';

export const ConverterView = () => {
    const { pages } = useStore();
    const { generatePDF } = usePDFGenerator();
    const { createBlankPage } = useImageProcessor();

    const isWorkspace = pages.length > 0;

    return (
        <div
            id="converter-panel"
            role="tabpanel"
            aria-labelledby="converter-tab"
            className="min-h-screen bg-slate-950 text-slate-50"
        >
            {/* Original emerald gradient — needed for converter glass effects */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-emerald-500/5 to-transparent" />
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
                            <BentoGrid />
                        </main>
                        <footer className="py-8 text-center text-slate-600 text-sm border-t border-white/5 mx-6">
                            <p>© 2025 FlowSuite. Built for Speed.</p>
                        </footer>
                    </motion.div>
                ) : (
                    <motion.div
                        key="workspace"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4 }}
                        className="relative z-10"
                    >
                        <Navbar />
                        <main className="max-w-7xl mx-auto p-4 pt-24 space-y-8 pb-32">
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <SettingsPanel />
                                <ImageGrid />

                                {/* Floating Actions — sits above BottomTabs */}
                                <div className="fixed bottom-20 inset-x-0 p-4 pb-6 bg-slate-900/90 backdrop-blur-xl border-t border-white/10 z-50 md:bottom-24 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:p-2 md:rounded-2xl md:border md:shadow-2xl md:bg-slate-900/80">
                                    <div className="flex items-center gap-3 justify-center max-w-md mx-auto">
                                        <Button variant="secondary" onClick={createBlankPage} className="flex-1 md:flex-none active:scale-95 transition-transform">
                                            + Blank
                                        </Button>
                                        <input
                                            type="text"
                                            defaultValue="FlowSuite_Doc"
                                            className="bg-transparent border border-slate-700 rounded-lg px-3 py-2 text-xs w-32 focus:border-emerald-500 outline-none text-center font-bold text-white hidden md:block"
                                        />
                                        <Button onClick={generatePDF} className="flex-1 md:flex-none active:scale-95 transition-transform shadow-lg shadow-emerald-500/20">
                                            EXPORT PDF
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </main>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
