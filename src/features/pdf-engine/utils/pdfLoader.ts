// =============================================================================
// UTILITY — PDF LOADER
// Bootstraps pdfjs-dist and provides helper wrappers.
// Call initPdfJs() once before any rendering operation.
// =============================================================================

import type { PDFDocumentProxy } from 'pdfjs-dist';

import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

let pdfjsLibInstance: typeof import('pdfjs-dist') | null = null;

/**
 * Initializes the pdfjs-dist GlobalWorkerOptions.
 * Must be called once at the module level or in app bootstrap.
 */
export async function initPdfJs(): Promise<typeof import('pdfjs-dist')> {
  if (!pdfjsLibInstance) {
    pdfjsLibInstance = await import('pdfjs-dist');
    if (!pdfjsLibInstance.GlobalWorkerOptions.workerSrc) {
      pdfjsLibInstance.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
    }
  }
  return pdfjsLibInstance;
}

/**
 * Loads a PDF from an ArrayBuffer and returns the pdfjs document proxy.
 */
export async function loadPdfDocument(buffer: ArrayBuffer): Promise<PDFDocumentProxy> {
  const lib = await initPdfJs();
  const baseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

  try {
    const loadingTask = lib.getDocument({
      data: buffer,
      cMapUrl: `${normalizedBase}cmaps/`,
      cMapPacked: true,
      standardFontDataUrl: `${normalizedBase}standard_fonts/`,
      enableHWA: true,
    });
    return await loadingTask.promise;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'PasswordException') {
      throw new Error('PASSWORD_REQUIRED');
    }
    if (error instanceof Error && error.name === 'InvalidPDFException') {
      throw new Error('INVALID_PDF');
    }
    throw error;
  }
}

/**
 * Renders a single PDF page to an OffscreenCanvas and returns an ImageBitmap.
 * This runs on the MAIN thread — prefer using the render worker for thumbnails.
 * Use this only for the high-res editor canvas background render.
 */
export async function renderPageToImageBitmap(
  pdfDoc: PDFDocumentProxy,
  pageIndex: number,
  scale: number
): Promise<ImageBitmap> {
  const page = await pdfDoc.getPage(pageIndex + 1); // pdfjs is 1-indexed
  try {
    const viewport = page.getViewport({ scale });
    
    const canvas = new OffscreenCanvas(viewport.width, viewport.height);
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Could not get 2d context from OffscreenCanvas');
    }

    await page.render({
      canvas: canvas as unknown as HTMLCanvasElement,
      canvasContext: ctx as unknown as CanvasRenderingContext2D,
      viewport,
    }).promise;
    return canvas.transferToImageBitmap();
  } finally {
    if (typeof (page as { cleanup?: () => void })?.cleanup === 'function') {
      page.cleanup();
    }
  }
}

/**
 * Safely destroys a PDFDocumentProxy instance if destroy() is supported.
 */
export async function destroyPdfDocument(doc: PDFDocumentProxy | null | undefined): Promise<void> {
  if (!doc) return;
  const destructible = doc as { destroy?: () => Promise<void> };
  if (typeof destructible.destroy === 'function') {
    await destructible.destroy();
  }
}
