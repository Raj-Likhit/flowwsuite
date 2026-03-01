import { Suspense, lazy } from 'react';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import { useNavigationStore } from './shared/store/useNavigationStore';
import { BottomTabs } from './shared/components/BottomTabs';
import { SettingsMenu } from './shared/components/SettingsMenu';
import { Toaster } from 'sonner';
import { Analytics } from '@vercel/analytics/react';

const AttendanceView = lazy(() => import('./features/attendance/components/AttendanceView').then(module => ({ default: module.AttendanceView })));
const ConverterView = lazy(() => import('./features/converter/components/ConverterView').then(module => ({ default: module.ConverterView })));

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
};

const pageTransition = {
  duration: 0.35,
  ease: [0.16, 1, 0.3, 1] as const,
};

function App() {
  const { activeTab } = useNavigationStore();

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen text-white selection:bg-primary-500/30 overflow-x-hidden pb-[env(safe-area-inset-bottom,24px)]" style={{ background: 'var(--bg-base)' }}>
        {/* Ambient background with GPU acceleration */}
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-radial from-primary-500/[0.04] to-transparent rounded-full blur-3xl will-change-transform opacity-60" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[300px] bg-gradient-radial from-secondary-500/[0.03] to-transparent rounded-full blur-3xl will-change-transform opacity-40" />
        </div>

        {/* Global Settings Menu */}
        <div className="fixed top-[max(1.5rem,env(safe-area-inset-top))] right-6 z-[100] flex flex-col gap-4">
          <SettingsMenu />
        </div>

        {/* Page Content */}
        <div className="relative">
          <Suspense fallback={
            <div className="flex h-screen w-full items-center justify-center bg-[#050505]">
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                  opacity: [0.3, 0.6, 0.3]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="relative"
              >
                <div className="text-4xl font-black tracking-tighter text-primary-500 blur-sm absolute inset-0">CF</div>
                <div className="text-4xl font-black tracking-tighter text-white relative">CF</div>
              </motion.div>
            </div>
          }>
            <AnimatePresence mode="wait">
              {activeTab === 'attendance' ? (
                <motion.div
                  key="attendance"
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={pageTransition}
                >
                  <AttendanceView />
                </motion.div>
              ) : (
                <motion.div
                  key="converter"
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={pageTransition}
                >
                  <ConverterView />
                </motion.div>
              )}
            </AnimatePresence>
          </Suspense>
          <Toaster theme="dark" position="top-center" />
        </div>

        {/* Bottom Navigation */}
        <BottomTabs />
        <Analytics />
      </div>
    </MotionConfig>
  );
}

export default App;
