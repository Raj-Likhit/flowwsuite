// =============================================================================
// COMPONENT — MetadataEditor
// Form to view and edit the PDF document's metadata fields.
// Changes are stored in Zustand and applied to the PDF on export.
//
// PROPS:
//   onClose: () => void
//
// FIELDS:
//   - Title
//   - Author
//   - Subject
//   - Keywords (comma-separated)
//   - Creator (pre-filled with 'FlowwSuite PDF Engine')
//
// DESIGN SPEC:
//   - Same modal shell pattern
//   - Each field: label (10px uppercase tracking) + input (existing glass input style)
//   - "Save" button updates Zustand store metadata, shows toast.success
//   - Changes are applied to the PDF by the compile worker on export (not saved to DB)
// =============================================================================

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { usePdfStore } from '../../store/usePdfStore';
import type { PdfMetadata } from '../../types/pdf.types';

interface MetadataEditorProps {
  onClose: () => void;
}

const FIELD_CONFIG: Array<{
  key: keyof PdfMetadata;
  label: string;
  placeholder: string;
  hint?: string;
}> = [
  { key: 'title', label: 'Title', placeholder: 'Document title...' },
  { key: 'author', label: 'Author', placeholder: 'Your name...' },
  { key: 'subject', label: 'Subject', placeholder: 'Brief subject...' },
  { key: 'keywords', label: 'Keywords', placeholder: 'tag1, tag2, tag3...', hint: 'Comma-separated' },
  { key: 'creator', label: 'Creator', placeholder: 'Application name...' },
];

export const MetadataEditor: React.FC<MetadataEditorProps> = ({ onClose }) => {
  const { metadata, updateMetadata } = usePdfStore();
  const [local, setLocal] = useState<PdfMetadata>({ ...metadata });

  const handleSave = () => {
    updateMetadata(local);
    toast.success('Metadata saved — will be applied on export');
    onClose();
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
        className="glass-strong rounded-2xl p-6 w-full max-w-sm border border-white/10 shadow-2xl space-y-5 max-h-[85vh] overflow-y-auto custom-scrollbar"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary-400" />
            <h3 className="text-base font-black text-white">Document Metadata</h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-full transition-colors" aria-label="Close">
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>

        {/* Fields */}
        <div className="space-y-4">
          {FIELD_CONFIG.map(({ key, label, placeholder, hint }) => (
            <div key={key} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor={`metadata-${key}`}
                  className="text-[10px] uppercase tracking-widest text-white/40 font-black"
                >
                  {label}
                </label>
                {hint && <span className="text-[9px] text-white/20">{hint}</span>}
              </div>
              <input
                id={`metadata-${key}`}
                type="text"
                value={local[key]}
                onChange={(e) => setLocal(prev => ({ ...prev, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-primary-500 outline-none transition-all"
              />
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white/60 rounded-xl text-xs font-bold transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2 bg-primary-500 hover:bg-primary-400 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all"
          >
            Save
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
