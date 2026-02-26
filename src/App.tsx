import { AnimatePresence, motion } from 'framer-motion';
import { useNavigationStore } from './shared/store/useNavigationStore';
import { BottomTabs } from './shared/components/BottomTabs';
import { AttendanceView } from './features/attendance/components/AttendanceView';
import { ConverterView } from './features/converter/components/ConverterView';
import { SettingsMenu } from './shared/components/SettingsMenu';
import { Toaster } from 'sonner';

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
    <div className="min-h-screen text-white selection:bg-primary-500/30 overflow-x-hidden" style={{ background: 'var(--bg-base)' }}>
      {/* Ambient background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-radial from-primary-500/[0.04] to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[300px] bg-gradient-radial from-secondary-500/[0.03] to-transparent rounded-full blur-3xl" />
      </div>

      {/* Global Settings Menu */}
      <div className="fixed top-6 right-6 z-[100] flex flex-col gap-4">
        <SettingsMenu />
      </div>

      {/* Page Content */}
      <div className="relative">
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
        <Toaster theme="dark" position="top-center" />
      </div>

      {/* Bottom Navigation */}
      <BottomTabs />
    </div>
  );
}

export default App;
