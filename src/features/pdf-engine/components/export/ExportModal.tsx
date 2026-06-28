// =============================================================================
// COMPONENT — ExportModal
// Modal for compiling and downloading the final PDF.
// Exposes: password encryption, image quality, metadata shortcut, format options.
//
// TRIGGERED FROM: PdfEngineView header "Export" button.
//
// DESIGN SPEC:
//   - Same modal shell as SignaturePad/ImageOverlay
//   - Sections:
//       1. Download as PDF (primary CTA — big gradient button)
//       2. Security: "Add Password" toggle + password input (collapsible)
//       3. Format: "Export as JPEG ZIP" secondary button
//       4. Metadata shortcut link: "Edit document metadata →"
//   - Loading state: spinner overlay while compiling, toast on completion
// =============================================================================

import React from 'react';
import { motion } from 'framer-motion';
import { X, Download, FileArchive, Minimize2 } from 'lucide-react';
import { usePdfExport } from '../../hooks/usePdfExport';
import { createCompressedExportOptions } from '../../config/exportConfig';

interface ExportModalProps {
  onClose: () => void;
  onOpenMetadata?: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ onClose, onOpenMetadata }) => {
  const { exportPdf, exportAsJpegZip, isExporting } = usePdfExport();

  const handleExport = async () => {
    await exportPdf();
    if (!isExporting) onClose();
  };

  const handleCompressedExport = async () => {
    await exportPdf(createCompressedExportOptions());
    if (!isExporting) onClose();
  };

  const handleJpegZip = async () => {
    await exportAsJpegZip();
    if (!isExporting) onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="glass-strong rounded-2xl p-6 w-full max-w-sm border border-white/10 shadow-2xl space-y-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-white">Export Document</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-full transition-colors" aria-label="Close">
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>

        {/* Primary Export */}
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="w-full py-3 accent-gradient text-white font-black text-sm uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Download as PDF"
        >
          <Download className="w-4 h-4" />
          {isExporting ? 'Compiling...' : 'Download PDF'}
        </button>

        {/* Compressed PDF Export */}
        <button
          onClick={handleCompressedExport}
          disabled={isExporting}
          className="w-full py-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/25 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Compress and export PDF"
        >
          <Minimize2 className="w-4 h-4" />
          <span className="font-black text-sm uppercase tracking-widest">
            {isExporting ? 'Compressing...' : 'Compress & Export'}
          </span>
        </button>
        <p className="-mt-3 text-[10px] leading-relaxed text-white/35">
          Creates a smaller image-based PDF. Best for sharing, not for preserving selectable text from the original.
        </p>

        {/* JPEG ZIP Export */}
        <button
          onClick={handleJpegZip}
          disabled={isExporting}
          className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          aria-label="Export as JPEG ZIP archive"
        >
          <FileArchive className="w-4 h-4" />
          Export as JPEG ZIP
        </button>

        {/* Metadata Link */}
        <button
          onClick={onOpenMetadata}
          className="w-full text-center text-xs text-primary-400 hover:text-primary-300 transition-colors"
        >
          Edit document metadata →
        </button>
      </motion.div>
    </motion.div>
  );
};
