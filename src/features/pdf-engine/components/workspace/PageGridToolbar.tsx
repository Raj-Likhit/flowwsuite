// =============================================================================
// COMPONENT — PageGridToolbar
// Action bar shown above the page grid. Provides batch operations
// and document-level utilities.
//
// DESIGN SPEC:
//   - Sticky bar below the header (sticky top-[header-height] z-10)
//   - Glass background (glass-new) with bottom border (border-b border-white/5)
//   - Left side: selection count + "Select All" / "Deselect" toggle
//   - Right side: action buttons (icons + labels on desktop, icons only on mobile)
//   - Danger actions (delete, clear all) are red-tinted
//   - Use Tooltip-like title attributes for accessibility on icon-only buttons
//
// BUTTONS (shown when pages are loaded):
//   - Select All / Deselect All
//   - Extract Selected → new PDF (disabled when 0 selected)
//   - Delete Selected (disabled when 0 selected)
//   - Insert Blank Page (always available)
//   - Merge another PDF (opens a file picker)
//   - Clear All (resets entire document state)
// =============================================================================

import React, { useRef } from 'react';
import {
  CheckSquare2, Scissors, Trash2, FilePlus, Merge, XCircle, Square,
} from 'lucide-react';
import { usePdfStore } from '../../store/usePdfStore';
import { usePdfDocument } from '../../hooks/usePdfDocument';
import { usePdfExport } from '../../hooks/usePdfExport';
import { DEFAULT_PAGE_SIZE } from '../../hooks/usePdfDocument';
import { toast } from 'sonner';

export const PageGridToolbar: React.FC = () => {
  const {
    pages,
    selectedPageIds,
    selectAllPages,
    clearSelection,
    deleteSelectedPages,
    insertBlankPage,
    clearAll,
  } = usePdfStore();

  const { loadFile } = usePdfDocument();
  const { exportPdf, isExporting } = usePdfExport();

  const mergeInputRef = useRef<HTMLInputElement>(null);
  const hasSelection = selectedPageIds.size > 0;
  const allSelected = selectedPageIds.size === pages.length && pages.length > 0;

  /**
   * Extracts selected pages as a standalone PDF.
   *
   * TODO: Implement.
   * This is a specialized export — build a CompileWorkerRequest that
   * only includes selected pages (by their originalIndex order).
   * Reuse the usePdfExport hook or build a direct export utility.
   */
  const handleExtract = async () => {
    if (selectedPageIds.size === 0) return;
    await exportPdf({
      pageIds: Array.from(selectedPageIds),
      filename: 'flowwsuite-extracted-pages.pdf',
    });
  };

  const handleAddFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    for (const file of files) {
      await loadFile(file);
    }
    e.target.value = '';
  };

  const handleInsertBlankPage = () => {
    insertBlankPage(pages.length, DEFAULT_PAGE_SIZE.widthPt, DEFAULT_PAGE_SIZE.heightPt);
    toast.success('Blank page added');
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all pages? This action cannot be undone.')) {
      clearAll();
    }
  };

  return (
    <div className="sticky top-[73px] z-10 mb-4 glass-new border-b border-white/5 px-4 py-3 flex items-center justify-between gap-4 rounded-xl">
      {/* Left: Selection info */}
      <div className="flex items-center gap-3">
        <button
          onClick={allSelected ? clearSelection : selectAllPages}
          className="flex items-center gap-2 text-xs font-bold text-white/60 hover:text-white transition-colors"
          aria-label={allSelected ? 'Deselect all pages' : 'Select all pages'}
        >
          {allSelected
            ? <CheckSquare2 className="w-4 h-4 text-primary-400" />
            : <Square className="w-4 h-4" />}
          <span className="hidden sm:inline">
            {hasSelection ? `${selectedPageIds.size} selected` : 'Select All'}
          </span>
        </button>
      </div>

      {/* Right: Action buttons */}
      <div className="flex items-center gap-2">
        {/* Extract */}
        <button
          onClick={handleExtract}
          disabled={!hasSelection || isExporting}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          title="Extract selected pages to new PDF"
          aria-label="Extract selected pages"
        >
          <Scissors className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Extract</span>
        </button>

        {/* Delete Selected */}
        <button
          onClick={deleteSelectedPages}
          disabled={!hasSelection}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-red-500/5 hover:bg-red-500/15 text-red-400 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          title="Delete selected pages"
          aria-label="Delete selected pages"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Delete</span>
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-white/10" />

        {/* Insert Blank */}
        <button
          onClick={handleInsertBlankPage}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg transition-all"
          title="Insert blank page at end"
          aria-label="Insert blank page"
        >
          <FilePlus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Blank</span>
        </button>

        {/* Merge PDF */}
        <button
          onClick={() => mergeInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg transition-all"
          title="Add PDFs or images"
          aria-label="Add PDFs or images"
        >
          <Merge className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Add Files</span>
        </button>
        <input
          ref={mergeInputRef}
          type="file"
          multiple
          accept=".pdf,image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleAddFiles}
          aria-hidden="true"
        />

        {/* Divider */}
        <div className="w-px h-6 bg-white/10" />

        {/* Clear All */}
        <button
          onClick={handleClearAll}
          className="p-1.5 text-white/30 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10"
          title="Clear all — start over"
          aria-label="Clear all pages"
        >
          <XCircle className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
