// =============================================================================
// COMPONENT — PdfEngineView (Root View)
// The top-level entry point for the PDF Engine tab.
// Conditionally renders:
//   - DropZone (when no pages are loaded)
//   - PageGrid + PageGridToolbar (when pages are loaded but no editor is open)
//   - CanvasEditor (when a page is open for editing)
//
// This is the component lazy-imported in App.tsx.
// =============================================================================

import React, { useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Download } from 'lucide-react';
import { usePdfStore } from '../store/usePdfStore';
import { usePdfDocument } from '../hooks/usePdfDocument';
import { DropZone } from './workspace/DropZone';
import { PageGrid } from './workspace/PageGrid';
import { PageGridToolbar } from './workspace/PageGridToolbar';

const CanvasEditor = React.lazy(() => import('./editor/CanvasEditor').then(m => ({ default: m.CanvasEditor })));
const ExportModal = React.lazy(() => import('./export/ExportModal').then(m => ({ default: m.ExportModal })));
const MetadataEditor = React.lazy(() => import('./metadata/MetadataEditor').then(m => ({ default: m.MetadataEditor })));

export const PdfEngineView: React.FC = () => {
  const { pages, activeEditorPageId, isLoading, loadingMessage } = usePdfStore();
  const { loadFile } = usePdfDocument();

  const [showExportModal, setShowExportModal] = useState(false);
  const [showMetadataModal, setShowMetadataModal] = useState(false);

  const handleFilesAccepted = useCallback(async (files: File[]) => {
    for (const file of files) {
      await loadFile(file);
    }
  }, [loadFile]);

  return (
    <>
      <Helmet>
        <title>PDF Studio | Flowwsuite</title>
        <meta name="description" content="Merge, sign, and convert images to PDF right in your browser. Complete privacy with no server uploads." />
        <meta property="og:title" content="PDF Studio | Flowwsuite" />
        <meta property="og:description" content="Merge, sign, and convert images to PDF right in your browser. Complete privacy with no server uploads." />
      </Helmet>
      <div className="flex flex-col min-h-screen pb-24 relative">
        <h1 className="sr-only">
          Free Client-Side PDF Editor: Merge, convert, and sign PDF documents directly in your browser.
        </h1>
        <header className="sticky top-0 z-10 px-4 py-4 border-b border-white/5 bg-[var(--bg-base)]/80 backdrop-blur-md flex items-center justify-between">
        <div className="text-lg font-black tracking-tight text-white" aria-hidden="true">PDF Studio</div>
        {pages.length > 0 && (
          <button
            onClick={() => setShowExportModal(true)}
            className="px-4 py-2 bg-primary-500 hover:bg-primary-400 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
        )}
      </header>

      {/* Main Area */}
      <main className="flex-1 relative">
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-white/70 text-sm">{loadingMessage}</p>
          </div>
        )}

        <AnimatePresence mode="wait">
          {pages.length === 0 && !isLoading && (
            <motion.div
              key="dropzone"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="flex items-center justify-center min-h-[70vh] p-6"
            >
              <DropZone onFilesAccepted={handleFilesAccepted} />
            </motion.div>
          )}

          {pages.length > 0 && !activeEditorPageId && (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-4"
            >
              <PageGridToolbar />
              <PageGrid />
            </motion.div>
          )}

          {activeEditorPageId && (
            <motion.div
              key="editor"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="w-full h-full"
            >
              <React.Suspense fallback={<div className="flex items-center justify-center w-full h-full text-white/50">Loading Editor...</div>}>
                <CanvasEditor pageId={activeEditorPageId} />
              </React.Suspense>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {showExportModal && (
          <React.Suspense fallback={null}>
            <ExportModal
              key="export-modal"
              onClose={() => setShowExportModal(false)}
              onOpenMetadata={() => {
                setShowExportModal(false);
                setShowMetadataModal(true);
              }}
            />
          </React.Suspense>
        )}
        {showMetadataModal && (
          <React.Suspense fallback={null}>
            <MetadataEditor
              key="metadata-modal"
              onClose={() => setShowMetadataModal(false)}
            />
          </React.Suspense>
        )}
      </AnimatePresence>
    </div>
    </>
  );
};
