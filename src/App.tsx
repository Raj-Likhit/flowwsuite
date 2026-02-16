import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore } from './store/useAppStore';
import { BottomTabs } from './components/shared/BottomTabs';
import { AttendanceView } from './modules/attendance/AttendanceView';
import { ConverterView } from './modules/converter/ConverterView';

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
  const { activeTab, setActiveTab } = useAppStore();

  return (
    <div className="min-h-screen text-white selection:bg-indigo-500/30 overflow-x-hidden" style={{ background: 'var(--bg-base)' }}>
      {/* Ambient background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-radial from-indigo-500/[0.04] to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[300px] bg-gradient-radial from-purple-500/[0.03] to-transparent rounded-full blur-3xl" />
      </div>

      {/* Page Content */}
      <div className="relative z-10">
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
      </div>

      {/* Bottom Navigation */}
      <BottomTabs activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}

export default App;
