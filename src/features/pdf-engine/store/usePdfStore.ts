// =============================================================================
// PDF ENGINE — ZUSTAND STORE
// Global state for the PDF Engine feature.
// All state transitions should be pure and predictable.
// =============================================================================

import { create } from 'zustand';
import type {
  PdfPage,
  PdfSource,
  CanvasOverlay,
  EditorTool,
  PdfMetadata,
} from '../types/pdf.types';

// -----------------------------------------------------------------------------
// State Shape
// -----------------------------------------------------------------------------

interface PdfEngineState {
  // --- Documents ---
  /** All loaded source documents */
  sources: PdfSource[];
  /** Flat ordered list of all pages across all sources */
  pages: PdfPage[];
  /** IDs of pages currently selected (for batch ops) */
  selectedPageIds: Set<string>;

  // --- Editor ---
  /** ID of the page currently open in the canvas editor. null = grid view */
  activeEditorPageId: string | null;
  /** Active drawing/editing tool */
  activeTool: EditorTool;
  /** Canvas overlays per page — serialized Fabric.js JSON */
  overlays: CanvasOverlay[];

  // --- UI ---
  isLoading: boolean;
  loadingMessage: string;
  error: string | null;

  // --- Metadata ---
  metadata: PdfMetadata;
}

// -----------------------------------------------------------------------------
// Actions Shape
// -----------------------------------------------------------------------------

interface PdfEngineActions {
  // Document management
  addSource: (source: PdfSource) => void;
  removeSource: (sourceId: string) => void;
  clearAll: () => void;

  // Page management
  setPages: (pages: PdfPage[]) => void;
  reorderPages: (fromIndex: number, toIndex: number) => void;
  deletePage: (pageId: string) => void;
  deleteSelectedPages: () => void;
  rotatePage: (pageId: string, direction: 'cw' | 'ccw') => void;
  insertBlankPage: (atIndex: number, widthPt: number, heightPt: number) => void;
  setPageThumbnail: (pageId: string, dataUrl: string) => void;

  // Selection
  togglePageSelection: (pageId: string) => void;
  selectAllPages: () => void;
  clearSelection: () => void;

  // Editor
  openEditor: (pageId: string) => void;
  closeEditor: () => void;
  setActiveTool: (tool: EditorTool) => void;
  setOverlay: (pageId: string, fabricJson: object, previewDataUrl?: string) => void;
  clearOverlay: (pageId: string) => void;

  // UI
  setLoading: (isLoading: boolean, message?: string) => void;
  setError: (error: string | null) => void;

  // Metadata
  updateMetadata: (partial: Partial<PdfMetadata>) => void;
}

// -----------------------------------------------------------------------------
// Initial State
// -----------------------------------------------------------------------------

const initialMetadata: PdfMetadata = {
  title: '',
  author: '',
  subject: '',
  keywords: '',
  creator: 'FlowwSuite PDF Engine',
};

// -----------------------------------------------------------------------------
// Store Definition
// -----------------------------------------------------------------------------

export const usePdfStore = create<PdfEngineState & PdfEngineActions>()((set) => ({
  // --- Initial State ---
  sources: [],
  pages: [],
  selectedPageIds: new Set(),
  activeEditorPageId: null,
  activeTool: 'select',
  overlays: [],
  isLoading: false,
  loadingMessage: '',
  error: null,
  metadata: initialMetadata,

  // --- Document Management ---

  addSource: (source) => set((state) => ({
    sources: [...state.sources, source],
  })),

  removeSource: (sourceId) => set((state) => {
    const newPages = state.pages.filter(p => p.sourceId !== sourceId);
    const newSelected = new Set(state.selectedPageIds);
    state.pages.filter(p => p.sourceId === sourceId).forEach(p => newSelected.delete(p.id));
    return {
      sources: state.sources.filter(s => s.id !== sourceId),
      pages: newPages,
      selectedPageIds: newSelected,
      overlays: state.overlays.filter(o => !state.pages.some(p => p.id === o.pageId && p.sourceId === sourceId)),
    };
  }),

  clearAll: () => set({
    sources: [],
    pages: [],
    selectedPageIds: new Set(),
    activeEditorPageId: null,
    activeTool: 'select',
    overlays: [],
    metadata: initialMetadata,
    error: null,
    isLoading: false,
    loadingMessage: '',
  }),

  // --- Page Management ---

  setPages: (pages) => set({ pages }),

  reorderPages: (fromIndex, toIndex) => set((state) => {
    const newPages = [...state.pages];
    const [moved] = newPages.splice(fromIndex, 1);
    newPages.splice(toIndex, 0, moved);
    return { pages: newPages };
  }),

  deletePage: (pageId) => set((state) => {
    const newSelected = new Set(state.selectedPageIds);
    newSelected.delete(pageId);
    return {
      pages: state.pages.filter(p => p.id !== pageId),
      selectedPageIds: newSelected,
      overlays: state.overlays.filter(o => o.pageId !== pageId),
    };
  }),

  deleteSelectedPages: () => set((state) => ({
    pages: state.pages.filter(p => !state.selectedPageIds.has(p.id)),
    selectedPageIds: new Set(),
    overlays: state.overlays.filter(o => !state.selectedPageIds.has(o.pageId)),
  })),

  rotatePage: (pageId, direction) => set((state) => ({
    pages: state.pages.map(p => {
      if (p.id !== pageId) return p;
      const change = direction === 'cw' ? 90 : -90;
      return { ...p, rotation: (p.rotation + change + 360) % 360 as PdfPage['rotation'] };
    })
  })),

  insertBlankPage: (atIndex, widthPt, heightPt) => set((state) => {
    const newPage: PdfPage = {
      id: crypto.randomUUID(),
      sourceId: 'blank', // Special source ID for blank pages
      sourceType: 'blank',
      originalIndex: -1,
      currentIndex: atIndex,
      widthPt,
      heightPt,
      rotation: 0,
      isSelected: false,
      thumbnailDataUrl: null,
    };
    const newPages = [...state.pages];
    newPages.splice(atIndex, 0, newPage);
    return { pages: newPages };
  }),

  setPageThumbnail: (pageId, dataUrl) => set((state) => ({
    pages: state.pages.map(p => p.id === pageId ? { ...p, thumbnailDataUrl: dataUrl } : p)
  })),

  // --- Selection ---

  togglePageSelection: (pageId) => set((state) => {
    const next = new Set(state.selectedPageIds);
    if (next.has(pageId)) next.delete(pageId);
    else next.add(pageId);
    return { selectedPageIds: next };
  }),

  selectAllPages: () => set((state) => ({
    selectedPageIds: new Set(state.pages.map(p => p.id))
  })),

  clearSelection: () => set({ selectedPageIds: new Set() }),

  // --- Editor ---

  openEditor: (pageId) => set({
    activeEditorPageId: pageId,
    activeTool: 'select',
  }),

  closeEditor: () => set({ activeEditorPageId: null }),

  setActiveTool: (tool) => set({ activeTool: tool }),

  setOverlay: (pageId, fabricJson, previewDataUrl) => set((state) => {
    const existing = state.overlays.findIndex(o => o.pageId === pageId);
    if (existing >= 0) {
      const next = [...state.overlays];
      next[existing] = {
        pageId,
        fabricJson,
        previewDataUrl: previewDataUrl ?? next[existing].previewDataUrl,
      };
      return { overlays: next };
    }
    return { overlays: [...state.overlays, { pageId, fabricJson, previewDataUrl }] };
  }),

  clearOverlay: (pageId) => set((state) => ({
    overlays: state.overlays.filter(o => o.pageId !== pageId)
  })),

  // --- UI ---

  setLoading: (isLoading, message = '') => set({ isLoading, loadingMessage: message }),

  setError: (error) => set({ error }),

  // --- Metadata ---

  updateMetadata: (partial) => set((state) => ({
    metadata: { ...state.metadata, ...partial }
  })),
}));
