import * as pdfjsLib from 'pdfjs-dist';
import type { RenderWorkerRequest, RenderWorkerResponse } from '../types/pdf.types';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// workerSrc must be set so pdfjs can initialise its internal state.
// disableWorker:true (on each getDocument call) then prevents it from actually
// spawning a nested sub-worker, making it run single-threaded inside our worker.
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

type PdfDocumentInit = Parameters<typeof pdfjsLib.getDocument>[0];

async function renderPage(
  pdfBuffer: ArrayBuffer,
  pageIndex: number,
  scale: number,
  suppressErrors = false
): Promise<ImageBitmap> {
  const documentInit = {
    data: pdfBuffer,
    cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/standard_fonts/`,
    // disableWorker: prevents pdfjs spawning a nested sub-worker from inside our worker
    disableWorker: true,
    // Use the browser's native JPEG/PNG/WEBP decoders — essential for camera-photo PDFs
    enableImageDecoder: 'browser',
    enableHWA: true,
  } as unknown as PdfDocumentInit;

  const loadingTask = pdfjsLib.getDocument(documentInit);

  const pdfDoc = await loadingTask.promise;
  const page = await pdfDoc.getPage(pageIndex + 1); // pdfjs is 1-indexed
  const viewport = page.getViewport({ scale });

  const canvas = new OffscreenCanvas(viewport.width, viewport.height);
  const ctx = canvas.getContext('2d')!;

  if (suppressErrors) {
    // White background so partial renders look clean
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  await page.render({
    canvas: canvas as unknown as HTMLCanvasElement,
    canvasContext: ctx as unknown as CanvasRenderingContext2D,
    viewport,
  }).promise;
  return canvas.transferToImageBitmap();
}

self.onmessage = async (event: MessageEvent<RenderWorkerRequest>) => {
  const { type, pageId, pdfBuffer, pageIndex, scale } = event.data;
  if (type !== 'RENDER_PAGE') return;

  try {
    const bitmap = await renderPage(pdfBuffer, pageIndex, scale, false);
    self.postMessage({ type: 'RENDER_DONE', pageId, bitmap } satisfies RenderWorkerResponse, [bitmap]);
  } catch {
    // First pass failed (e.g. unsupported image codec). Retry with suppressErrors
    // so at least text/vector content renders on a white background.
    try {
      const bitmap = await renderPage(pdfBuffer, pageIndex, scale, true);
      self.postMessage({ type: 'RENDER_DONE', pageId, bitmap } satisfies RenderWorkerResponse, [bitmap]);
    } catch (err2) {
      const error = err2 as Error;
      self.postMessage({ type: 'RENDER_ERROR', pageId, error: error.message } satisfies RenderWorkerResponse);
    }
  }
};

export {};
