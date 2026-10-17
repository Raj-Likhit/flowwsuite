import { useCallback } from 'react';
import { toast } from 'sonner';
import { usePdfStore } from '../store/usePdfStore';
import type { PdfPage, PdfSource } from '../types/pdf.types';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { destroyPdfDocument, loadPdfDocument, renderPageToImageBitmap } from '../utils/pdfLoader';

const THUMBNAIL_SCALE = 1.5;
const EAGER_RENDER_COUNT = 10; // Render only this many pages immediately; rest are lazy
const MAX_IMAGE_PAGE_PT = 842;
const PX_TO_PT = 72 / 96;

export const DEFAULT_PAGE_SIZE = { widthPt: 595, heightPt: 842 }; // A4

type RenderJob = () => Promise<void>;
const renderQueue: RenderJob[] = [];
let isQueueRunning = false;

function enqueueRender(job: RenderJob) {
  renderQueue.push(job);
  if (!isQueueRunning) drainQueue();
}

async function drainQueue() {
  isQueueRunning = true;
  while (renderQueue.length > 0) {
    const job = renderQueue.shift()!;
    try {
      await job();
    } catch {
      // Individual render jobs handle their own user-facing errors.
    }
  }
  isQueueRunning = false;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

function pageSizeFromImage(widthPx: number, heightPx: number) {
  const widthPt = Math.max(1, widthPx * PX_TO_PT);
  const heightPt = Math.max(1, heightPx * PX_TO_PT);
  const scale = Math.min(1, MAX_IMAGE_PAGE_PT / Math.max(widthPt, heightPt));

  return {
    widthPt: Math.round(widthPt * scale),
    heightPt: Math.round(heightPt * scale),
  };
}

async function canvasToBlob(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D) => void,
  type = 'image/jpeg',
  quality = 0.90
): Promise<Blob> {
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2d context from OffscreenCanvas');
    draw(ctx);
    return await canvas.convertToBlob({ type, quality });
  }
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2d context from canvas');
    draw(ctx);
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob conversion failed'));
      }, type, quality);
    });
  }
  throw new Error('No canvas rendering environment available');
}

async function normalizeImageForPdf(file: File, buffer: ArrayBuffer) {
  const isPng = file.type === 'image/png';
  const bitmap = await createImageBitmap(new Blob([buffer], { type: file.type }));
  const pageSize = pageSizeFromImage(bitmap.width, bitmap.height);

  let finalBlob: Blob;
  if (isPng || file.type === 'image/jpeg') {
    // Preserve PNG (including alpha channel) and JPEG losslessly without re-encoding
    finalBlob = new Blob([buffer], { type: file.type });
    bitmap.close();
  } else {
    // For WebP or other formats, convert to PNG to preserve transparency
    finalBlob = await canvasToBlob(
      bitmap.width,
      bitmap.height,
      (ctx) => {
        ctx.drawImage(bitmap, 0, 0);
      },
      'image/png'
    );
    bitmap.close();
  }

  return {
    arrayBuffer: await finalBlob.arrayBuffer(),
    dataUrl: await blobToDataUrl(finalBlob),
    mimeType: finalBlob.type || (isPng ? 'image/png' : 'image/jpeg'),
    ...pageSize,
  };
}

export function usePdfDocument() {
  const addSource = usePdfStore((state) => state.addSource);
  const setPageThumbnail = usePdfStore((state) => state.setPageThumbnail);
  const setLoading = usePdfStore((state) => state.setLoading);
  const setError = usePdfStore((state) => state.setError);

  const bitmapToDataUrl = useCallback(async (bitmap: ImageBitmap): Promise<string> => {
    const blob = await canvasToBlob(
      bitmap.width,
      bitmap.height,
      (ctx) => {
        ctx.drawImage(bitmap, 0, 0);
        bitmap.close();
      },
      'image/jpeg',
      0.85
    );
    return blobToDataUrl(blob);
  }, []);

  const loadImageFile = useCallback(async (file: File): Promise<void> => {
    setLoading(true, 'Importing image...');
    try {
      const sourceId = crypto.randomUUID();
      const normalized = await normalizeImageForPdf(file, await file.arrayBuffer());
      const pageIndex = usePdfStore.getState().pages.length;

      const source: PdfSource = {
        id: sourceId,
        type: 'image',
        file,
        mimeType: normalized.mimeType || 'image/jpeg',
        name: file.name,
        pageCount: 1,
        arrayBuffer: normalized.arrayBuffer,
        pdfDocument: null,
      };

      const imagePage: PdfPage = {
        id: crypto.randomUUID(),
        sourceId,
        sourceType: 'image',
        originalIndex: 0,
        currentIndex: pageIndex,
        widthPt: normalized.widthPt,
        heightPt: normalized.heightPt,
        rotation: 0,
        isSelected: false,
        thumbnailDataUrl: normalized.dataUrl,
      };

      addSource(source);
      usePdfStore.getState().setPages([...usePdfStore.getState().pages, imagePage]);
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      toast.error('Failed to import image: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [addSource, setLoading, setError]);

  const loadPdfFile = useCallback(async (file: File): Promise<void> => {
    setLoading(true, 'Loading PDF...');
    try {
      const buffer = await file.arrayBuffer();

      const pdfDoc = await loadPdfDocument(buffer.slice(0));
      const newPages: PdfPage[] = [];
      const sourceId = crypto.randomUUID();
      const existingPageCount = usePdfStore.getState().pages.length;
      let numPages = 0;

      try {
        numPages = pdfDoc.numPages;

        for (let i = 0; i < numPages; i++) {
          const page = await pdfDoc.getPage(i + 1);
          const viewport = page.getViewport({ scale: 1 });
          newPages.push({
            id: crypto.randomUUID(),
            sourceId,
            sourceType: 'pdf',
            originalIndex: i,
            currentIndex: existingPageCount + i,
            widthPt: viewport.width,
            heightPt: viewport.height,
            rotation: 0,
            isSelected: false,
            thumbnailDataUrl: null,
          });
        }
      } finally {
        await destroyPdfDocument(pdfDoc);
      }

      const source: PdfSource = {
        id: sourceId,
        type: 'pdf',
        file,
        mimeType: file.type || 'application/pdf',
        name: file.name,
        pageCount: numPages,
        arrayBuffer: buffer,
        pdfDocument: null,
      };

      addSource(source);
      usePdfStore.getState().setPages([...usePdfStore.getState().pages, ...newPages]);

      // Re-load the document ONCE and share it for all eager renders.
      // Clean up the document proxy once all eager render tasks finish.
      const sharedDoc = await loadPdfDocument(buffer.slice(0));

      const eagerPages = newPages.slice(0, EAGER_RENDER_COUNT);
      let remainingEagerCount = eagerPages.length;

      if (remainingEagerCount === 0) {
        await destroyPdfDocument(sharedDoc);
      } else {
        for (const p of eagerPages) {
          enqueueRender(async () => {
            try {
              const bitmap = await renderPageToImageBitmap(sharedDoc, p.originalIndex, THUMBNAIL_SCALE);
              const dataUrl = await bitmapToDataUrl(bitmap);
              setPageThumbnail(p.id, dataUrl);
            } catch (e) {
              console.error(`Thumbnail render failed for page ${p.id}:`, e);
            } finally {
              remainingEagerCount--;
              if (remainingEagerCount <= 0) {
                await destroyPdfDocument(sharedDoc);
              }
            }
          });
        }
      }
    } catch (err) {
      const error = err as Error;
      if (error.message === 'PASSWORD_REQUIRED') {
        toast.error('Password protected PDFs are not yet supported.');
      } else {
        setError(error.message);
        toast.error('Failed to load PDF: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  }, [addSource, setPageThumbnail, setLoading, setError, bitmapToDataUrl]);

  const loadFile = useCallback(async (file: File): Promise<void> => {
    if (file.type.startsWith('image/')) {
      await loadImageFile(file);
      return;
    }

    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      await loadPdfFile(file);
      return;
    }

    toast.error('Unsupported file type. Use PDF, JPG, PNG, or WEBP.');
  }, [loadImageFile, loadPdfFile]);

  /**
   * Lazily renders a thumbnail for a single page on demand.
   * Called by the usePageThumbnail hook when a page card scrolls into view.
   * Cleans up the document instance after extraction.
   */
  const renderThumbnailOnDemand = useCallback(async (
    sourceId: string,
    pageId: string,
    originalIndex: number
  ): Promise<void> => {
    try {
      const { sources } = usePdfStore.getState();
      const source = sources.find(s => s.id === sourceId);
      if (!source || source.type !== 'pdf') return;

      const doc: PDFDocumentProxy = await loadPdfDocument(source.arrayBuffer.slice(0));
      try {
        const bitmap = await renderPageToImageBitmap(doc, originalIndex, THUMBNAIL_SCALE);
        const dataUrl = await bitmapToDataUrl(bitmap);
        setPageThumbnail(pageId, dataUrl);
      } finally {
        await destroyPdfDocument(doc);
      }
    } catch (e) {
      console.error(`Lazy thumbnail render failed for page ${pageId}:`, e);
    }
  }, [setPageThumbnail, bitmapToDataUrl]);

  const renderPageHiRes = useCallback(async (
    sourceId: string,
    pageIndex: number,
    scale = 2
  ): Promise<ImageBitmap | null> => {
    try {
      const { sources } = usePdfStore.getState();
      const source = sources.find(s => s.id === sourceId);
      if (!source) throw new Error('Source not found');
      if (source.type !== 'pdf') return null;

      const pdfDoc = await loadPdfDocument(source.arrayBuffer.slice(0));
      try {
        return await renderPageToImageBitmap(pdfDoc, pageIndex, scale);
      } finally {
        await destroyPdfDocument(pdfDoc);
      }
    } catch (e) {
      console.error(e);
      return null;
    }
  }, []);

  return { loadFile, renderPageHiRes, renderThumbnailOnDemand };
}
