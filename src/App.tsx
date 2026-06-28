import { Suspense, lazy, useState } from 'react';
import { motion, MotionConfig } from 'framer-motion';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { useAuthStore } from './core/lib/useAuthStore';
import { BottomTabs, type TabId } from './shared/components/BottomTabs';
import { SettingsMenu } from './shared/components/SettingsMenu';
import { AdminLayout } from './features/admin/AdminLayout';
import { AdminDashboard } from './features/admin/pages/AdminDashboard';
import { Toaster } from 'sonner';
import { Analytics } from '@vercel/analytics/react';

const AttendanceView = lazy(() => import('./features/attendance/components/AttendanceView').then(module => ({ default: module.AttendanceView })));
const PdfEngineView = lazy(() => import('./features/pdf-engine/components/PdfEngineView').then(module => ({ default: module.PdfEngineView })));

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
};

const pageTransition = {
  duration: 0.35,
  ease: [0.16, 1, 0.3, 1] as const,
};

function MainApp() {
  const [activeTab, setActiveTab] = useState<TabId>('pdf');
  const { user, role } = useAuthStore();
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith('/admin-portal');
  const activeView = activeTab === 'attendance' ? <AttendanceView /> : <PdfEngineView />;

  return (
    <div className="min-h-screen text-white selection:bg-primary-500/30 overflow-x-hidden pb-[env(safe-area-inset-bottom,24px)]" style={{ background: 'var(--bg-base)' }}>
      {/* Ambient background with GPU acceleration */}
      {/* Ambient background — shared across all pages including admin */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-radial from-primary-500/[0.04] to-transparent rounded-full blur-3xl will-change-transform opacity-60" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[300px] bg-gradient-radial from-secondary-500/[0.03] to-transparent rounded-full blur-3xl will-change-transform opacity-40" />
      </div>

      {/* Global Settings Menu & Auth Trigger */}
      <div className="fixed top-[max(1.5rem,env(safe-area-inset-top))] right-6 z-[100] flex flex-col gap-4 items-end">
        <SettingsMenu />
        {user && role === 'admin' && !isAdminPage && (
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => window.location.href = '/admin-portal-floww-security'}
            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-500 font-bold text-[10px] uppercase tracking-widest rounded-full backdrop-blur-md transition-all shadow-lg"
          >
            Security Portal
          </motion.button>
        )}
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
          {isAdminPage ? (
            <AdminLayout>
              <AdminDashboard />
            </AdminLayout>
          ) : (
            <motion.div
              key={activeTab}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              transition={pageTransition}
            >
              {activeView}
            </motion.div>
          )}
        </Suspense>
        <Toaster theme="dark" position="top-center" />
      </div>

      {/* Bottom Navigation */}
      {!isAdminPage && <BottomTabs activeTab={activeTab} setActiveTab={setActiveTab} />}
      <Analytics />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <MotionConfig reducedMotion="user">
        <MainApp />
      </MotionConfig>
    </BrowserRouter>
  );
}

export default App;
