// =============================================================================
// UTILITY — PDF LOADER
// Bootstraps pdfjs-dist and provides helper wrappers.
// Call initPdfJs() once before any rendering operation.
// =============================================================================

import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';

import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

/**
 * Initializes the pdfjs-dist GlobalWorkerOptions.
 * Must be called once at the module level or in app bootstrap.
 */
export function initPdfJs(): void {
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  }
}

/**
 * Loads a PDF from an ArrayBuffer and returns the pdfjs document proxy.
 */
export async function loadPdfDocument(buffer: ArrayBuffer): Promise<PDFDocumentProxy> {
  initPdfJs();
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: buffer,
      cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
      cMapPacked: true,
      standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/standard_fonts/`,
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
}
