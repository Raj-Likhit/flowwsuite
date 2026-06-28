// =============================================================================
// PDF ENGINE — TYPE DEFINITIONS
// All shared interfaces and enums for the pdf-engine feature.
// =============================================================================

import type { PDFDocument } from 'pdf-lib';

export type PdfSourceType = 'pdf' | 'image';

// -----------------------------------------------------------------------------
// Document & Page State
// -----------------------------------------------------------------------------

/**
 * Represents a single rendered page inside the workspace.
 * `rotation` is applied client-side and burned in on export.
 */
export interface PdfPage {
  /** Stable UUID for DnD keys and React keys */
  id: string;
  /** ID of the source PDF this page came from, or "blank" for inserted pages */
  sourceId: string;
  /** Page backing type. Blank pages have no source bytes. */
  sourceType: PdfSourceType | 'blank';
  /** Original 0-based index in the source PDF */
  originalIndex: number;
  /** Current 0-based position after user reordering */
  currentIndex: number;
  /** Clockwise rotation in degrees: 0 | 90 | 180 | 270 */
  rotation: 0 | 90 | 180 | 270;
  /** Whether this page is selected (for batch extract/delete) */
  isSelected: boolean;
  /** Native PDF page width in points */
  widthPt: number;
  /** Native PDF page height in points */
  heightPt: number;
  /** Data URL of the rendered thumbnail (set after worker renders it) */
  thumbnailDataUrl: string | null;
}

/**
 * Represents one loaded source document (user may load multiple).
 */
export interface PdfSource {
  /** Stable UUID */
  id: string;
  /** Source content type */
  type: PdfSourceType;
  /** Original File object — kept for re-reading if needed */
  file: File;
  /** MIME type used by export workers */
  mimeType: string;
  /** Display name (file.name) */
  name: string;
  /** Total pages in this source document */
  pageCount: number;
  /** ArrayBuffer of the raw PDF bytes — used by pdf-lib */
  arrayBuffer: ArrayBuffer;
  /** The parsed pdf-lib document (lazy, set after load) */
  pdfDocument: PDFDocument | null;
}

// -----------------------------------------------------------------------------
// Editor State
// -----------------------------------------------------------------------------

/** The active tool in the canvas editor */
export type EditorTool = 'select' | 'text' | 'draw' | 'image' | 'eraser';

/**
 * A serialized overlay object that maps a Fabric.js canvas object
 * to a specific PDF page. Used by the compile worker.
 */
export interface CanvasOverlay {
  pageId: string;
  /** Fabric.js JSON export for this page's canvas */
  fabricJson: object;
  /** Composite page preview used by the multipage gallery after saving edits */
  previewDataUrl?: string;
}

// -----------------------------------------------------------------------------
// Signature
// -----------------------------------------------------------------------------

/**
 * A saved signature entry. Stored in localStorage as a list of SavedSignature.
 */
export interface SavedSignature {
  id: string;
  /** Base64 PNG data URL of the drawn signature */
  dataUrl: string;
  createdAt: number;
}

// -----------------------------------------------------------------------------
// Export & Security
// -----------------------------------------------------------------------------

export interface ExportOptions {
  /** If set, encrypt the output PDF with this password */
  password?: string;
  /** Quality for image-based pages: 0.0–1.0 */
  imageQuality?: number;
  /** If true, strip metadata on export */
  stripMetadata?: boolean;
  /** Optional subset of page ids to export, preserving current document order */
  pageIds?: string[];
  /** Optional output filename */
  filename?: string;
  /** Rasterize pages to compressed JPEG bases before exporting */
  compression?: {
    enabled: boolean;
    imageQuality: number;
    maxDimensionPx: number;
  };
}

export interface PdfMetadata {
  title: string;
  author: string;
  subject: string;
  keywords: string;
  creator: string;
}

// -----------------------------------------------------------------------------
// Worker Messages
// -----------------------------------------------------------------------------

/** Message sent TO the render worker */
export interface RenderWorkerRequest {
  type: 'RENDER_PAGE';
  pageId: string;
  /** ArrayBuffer of the full PDF file */
  pdfBuffer: ArrayBuffer;
  /** 0-based page index */
  pageIndex: number;
  /** Scale factor for rendering (e.g. 1.5 for higher-res thumbnails) */
  scale: number;
}

/** Message received FROM the render worker */
export interface RenderWorkerResponse {
  type: 'RENDER_DONE' | 'RENDER_ERROR';
  pageId: string;
  /** ImageBitmap of the rendered page — only set on RENDER_DONE */
  bitmap?: ImageBitmap;
  error?: string;
}

/** Source bytes sent TO the compile worker */
export interface CompileWorkerSource {
  id: string;
  type: PdfSourceType;
  name: string;
  mimeType: string;
  arrayBuffer: ArrayBuffer;
}

/** Ordered page instruction sent TO the compile worker */
export interface CompileWorkerPage {
  id: string;
  sourceId: string;
  sourceType: PdfSourceType | 'blank';
  originalIndex: number;
  rotation: number;
  widthPt: number;
  heightPt: number;
  /** Optional rasterized page base used for compressed export */
  rasterBaseDataUrl?: string | null;
}

/** Message sent TO the compile worker */
export interface CompileWorkerRequest {
  type: 'COMPILE_PDF';
  /** Source files referenced by orderedPages */
  sources: CompileWorkerSource[];
  /** Ordered list of pages to include in the output */
  orderedPages: CompileWorkerPage[];
  /** Canvas overlays per page */
  overlays: CanvasOverlay[];
  exportOptions: ExportOptions;
  metadata?: Partial<PdfMetadata>;
}

/** Message received FROM the compile worker */
export interface CompileWorkerResponse {
  type: 'COMPILE_DONE' | 'COMPILE_ERROR';
  /** Compiled PDF as Uint8Array — only set on COMPILE_DONE */
  pdfBytes?: Uint8Array;
  error?: string;
}
