import { Suspense } from 'react';
import { motion, MotionConfig } from 'framer-motion';
import { BrowserRouter, useLocation, useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { useAuthStore } from './core/lib/useAuthStore';
import { BottomTabs } from './shared/components/BottomTabs';
import { Toaster } from 'sonner';
import { Analytics } from '@vercel/analytics/react';
import { ErrorBoundary } from './shared/components/ui/ErrorBoundary';
import { lazyWithRetry } from './shared/utils/lazyWithRetry';

const AttendanceView = lazyWithRetry(() => import('./features/attendance/components/AttendanceView').then(module => ({ default: module.AttendanceView })));
const PdfEngineView = lazyWithRetry(() => import('./features/pdf-engine/components/PdfEngineView').then(module => ({ default: module.PdfEngineView })));
const AdminLayout = lazyWithRetry(() => import('./features/admin/AdminLayout').then(module => ({ default: module.AdminLayout })));
const AdminDashboard = lazyWithRetry(() => import('./features/admin/pages/AdminDashboard').then(module => ({ default: module.AdminDashboard })));
const SettingsMenu = lazyWithRetry(() => import('./shared/components/SettingsMenu').then(module => ({ default: module.SettingsMenu })));

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
  const { user, role } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const isAdminPage = location.pathname.startsWith('/admin-portal');

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
            onClick={() => navigate('/admin-portal-floww-security')}
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
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<Navigate to="/attendance" replace />} />
              <Route path="/attendance" element={
                <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}>
                  <ErrorBoundary><AttendanceView /></ErrorBoundary>
                </motion.div>
              } />
              <Route path="/pdf-engine" element={
                <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}>
                  <ErrorBoundary><PdfEngineView /></ErrorBoundary>
                </motion.div>
              } />
            </Routes>
          )}
        </Suspense>
        <Toaster theme="dark" position="top-center" />
      </div>

      {/* Bottom Navigation */}
      {!isAdminPage && <BottomTabs />}
      <Analytics />
    </div>
  );
}

function App() {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <MotionConfig reducedMotion="user">
          <MainApp />
        </MotionConfig>
      </BrowserRouter>
    </HelmetProvider>
  );
}

export default App;
