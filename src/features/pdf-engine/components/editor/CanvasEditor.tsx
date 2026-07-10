// =============================================================================
// COMPONENT — CanvasEditor
// The main visual editing workspace. Renders the selected PDF page as a
// background on a Fabric.js canvas. Hosts the EditorToolbar and all
// editing tools (text, draw, image overlay).
//
// PROPS:
//   pageId: string — the page being edited
//
// LAYOUT SPEC:
//   - Full-height layout split: left sidebar (EditorToolbar) + center canvas area
//   - Top bar: Back button (← close editor), page navigation (prev/next), undo/redo
//   - Canvas area: centered, scrollable if page is larger than viewport
//   - Canvas must match the PDF page's native aspect ratio
//   - On mobile: EditorToolbar becomes a bottom-anchored horizontal scrolling toolbar
//
// CANVAS SIZING LOGIC:
//   - Compute available area: window.innerWidth - sidebarWidth, window.innerHeight - topBarHeight
//   - Scale page to fit within that area while preserving aspect ratio:
//       scale = Math.min(availW / pageWidthPt, availH / pageHeightPt)
//       canvasW = pageWidthPt * scale
//       canvasH = pageHeightPt * scale
//   - Pass this scale to usePdfDocument().renderPageHiRes() so bitmap matches canvas size exactly
// =============================================================================

import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Undo2, Redo2, ChevronLeft, ChevronRight, Save, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { usePdfStore } from '../../store/usePdfStore';
import { useFabricCanvas } from '../../hooks/useFabricCanvas';
import { usePdfDocument } from '../../hooks/usePdfDocument';
import { EditorToolbar } from './EditorToolbar';

interface CanvasEditorProps {
  pageId: string;
}

export const CanvasEditor: React.FC<CanvasEditorProps> = ({ pageId }) => {
  const { pages, closeEditor, openEditor } = usePdfStore();
  const { renderPageHiRes } = usePdfDocument();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasAreaRef = useRef<HTMLDivElement>(null);

  const {
    initCanvas,
    setBackground,
    addImage,
    saveChanges,
    isDirty,
    lastSavedAt,
    undo,
    redo,
    deleteSelected,
    fabricRef,
  } = useFabricCanvas(canvasRef, pageId);

  // Canvas dimensions state — computed from page size + available viewport
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 1131 });

  // Current page index and adjacent pages for navigation
  const currentIndex = pages.findIndex(p => p.id === pageId);
  const prevPage = currentIndex > 0 ? pages[currentIndex - 1] : null;
  const nextPage = currentIndex < pages.length - 1 ? pages[currentIndex + 1] : null;
  const currentPage = pages[currentIndex];

  const handleSaveChanges = () => {
    saveChanges();
    toast.success('Page changes saved.');
  };

  const handleCloseEditor = () => {
    saveChanges();
    closeEditor();
  };

  const handleOpenPage = (targetPageId: string) => {
    saveChanges();
    openEditor(targetPageId);
  };

  useEffect(() => {
    const compute = () => {
      const area = canvasAreaRef.current;
      if (!currentPage || !area) return;

      const rect = area.getBoundingClientRect();
      const padding = 32;
      const availW = Math.max(240, rect.width - padding);
      const availH = Math.max(240, rect.height - padding);
      const scale = Math.min(availW / currentPage.widthPt, availH / currentPage.heightPt, 1.25);

      setCanvasSize({
        width: Math.max(1, Math.floor(currentPage.widthPt * scale)),
        height: Math.max(1, Math.floor(currentPage.heightPt * scale)),
      });
    };

    compute();

    const observer = new ResizeObserver(compute);
    if (canvasAreaRef.current) observer.observe(canvasAreaRef.current);
    return () => observer.disconnect();
  }, [currentPage]);

  useEffect(() => {
    if (!canvasRef.current || !currentPage) return;

    let isCancelled = false;

    const loadCanvas = async () => {
      initCanvas(canvasSize.width, canvasSize.height);

      // Blank pages (sourceId === 'blank') have no PDF data to render.
      // Just show a white canvas background.
      if (currentPage.sourceId === 'blank' || currentPage.originalIndex < 0) {
        setBackground(null); // useFabricCanvas should handle null by setting white fill
        return;
      }

      if (currentPage.sourceType === 'image') {
        setBackground(currentPage.thumbnailDataUrl);
        return;
      }

      const hiResScale = Math.max(2, (canvasSize.width / currentPage.widthPt) * window.devicePixelRatio);

      const bitmap = await renderPageHiRes(currentPage.sourceId, currentPage.originalIndex, hiResScale);

      if (isCancelled || !bitmap) return;

      const offscreen = new OffscreenCanvas(bitmap.width, bitmap.height);
      const ctx = offscreen.getContext('2d');
      if (ctx) {
        ctx.drawImage(bitmap, 0, 0);
        const blob = await offscreen.convertToBlob({ type: 'image/jpeg', quality: 0.92 });
        const reader = new FileReader();
        reader.onloadend = () => {
          if (!isCancelled) setBackground(reader.result as string);
        };
        reader.readAsDataURL(blob);
      }
    };

    loadCanvas();
    return () => { isCancelled = true; };
  }, [canvasSize, currentPage, initCanvas, renderPageHiRes, setBackground]);

  return (
    <div className="flex h-[calc(100vh-9.5rem)] min-h-[520px] flex-col overflow-hidden md:h-[calc(100vh-8.5rem)]">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 glass-strong">
        {/* Back + Page Info */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleCloseEditor}
            className="flex items-center gap-2 text-xs font-bold text-white/60 hover:text-white transition-colors"
            aria-label="Close editor"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Pages</span>
          </button>
          <div className="w-px h-5 bg-white/10" />
          <span className="text-xs text-white/40 font-black uppercase tracking-widest">
            Page {currentIndex + 1} of {pages.length}
          </span>
        </div>

        {/* Page Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => prevPage && handleOpenPage(prevPage.id)}
            disabled={!prevPage}
            className="p-1.5 text-white/40 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => nextPage && handleOpenPage(nextPage.id)}
            disabled={!nextPage}
            className="p-1.5 text-white/40 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
            aria-label="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Undo / Redo */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveChanges}
            className={[
              'flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-black uppercase tracking-widest transition-all',
              isDirty
                ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30 hover:bg-emerald-500/25'
                : 'bg-white/5 text-white/45 ring-1 ring-white/10 hover:text-white hover:bg-white/10',
            ].join(' ')}
            aria-label="Save page changes"
          >
            {isDirty ? <Save className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            <span className="hidden sm:inline">{isDirty ? 'Save Changes' : lastSavedAt ? 'Saved' : 'Save'}</span>
          </button>
          <button
            onClick={undo}
            className="p-1.5 text-white/40 hover:text-white transition-colors"
            aria-label="Undo"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={redo}
            className="p-1.5 text-white/40 hover:text-white transition-colors"
            aria-label="Redo"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Tool Sidebar (desktop) */}
        <EditorToolbar
          orientation="vertical"
          onAddImage={addImage}
          onStamp={addImage}
          onDeleteSelected={deleteSelected}
        />

        {/* Canvas Area */}
        <div 
          ref={canvasAreaRef} 
          className="flex-1 overflow-auto bg-[#141414]"
          onScroll={() => {
            if (fabricRef.current) {
              fabricRef.current.calcOffset();
            }
          }}
        >
          <div className="flex min-h-full min-w-full items-start justify-center p-4">
            {/* Shadow wrapper for canvas depth illusion */}
            <div
              className="shrink-0 shadow-2xl shadow-black/70 rounded-sm overflow-hidden"
              style={{ width: canvasSize.width, height: canvasSize.height }}
            >
              <canvas
                ref={canvasRef}
                width={canvasSize.width}
                height={canvasSize.height}
                aria-label={`PDF page ${currentIndex + 1} editor canvas`}
                className="block"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Tool Bar (mobile) */}
      <div className="md:hidden">
        <EditorToolbar
          orientation="horizontal"
          onAddImage={addImage}
          onStamp={addImage}
          onDeleteSelected={deleteSelected}
        />
      </div>
    </div>
  );
};
