// =============================================================================
// HOOK — usePdfExport
// Orchestrates the full PDF compilation pipeline:
//   1. Serializes canvas overlays via fabricSerializer
//   2. Transfers data to the compile worker
//   3. Receives the compiled PDF bytes
//   4. Triggers a browser download
//
// USAGE:
//   const { exportPdf, isExporting } = usePdfExport();
//   await exportPdf({ password: 'secret123' });
// =============================================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { usePdfStore } from '../store/usePdfStore';
import type { CompileWorkerSource, ExportOptions, PdfPage, PdfSource } from '../types/pdf.types';
import type { CompileWorkerRequest, CompileWorkerResponse } from '../types/pdf.types';
import { getExportFilename } from '../config/exportConfig';
import { destroyPdfDocument, loadPdfDocument, renderPageToImageBitmap } from '../utils/pdfLoader';

async function createBlankPageDataUrl(widthPt: number, heightPt: number): Promise<string> {
  const width = Math.max(1, Math.round(widthPt));
  const height = Math.max(1, Math.round(heightPt));
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not render blank page');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.9 });

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

async function ensurePageRasterBase(
  page: PdfPage,
  source: PdfSource | undefined,
  maxDimension = 1600
): Promise<string | null> {
  if (page.sourceType === 'image') {
    return page.thumbnailDataUrl;
  }
  if (page.sourceType === 'blank') {
    return createBlankPageDataUrl(page.widthPt, page.heightPt);
  }
  if (page.sourceType === 'pdf' && source?.arrayBuffer) {
    try {
      const doc = await loadPdfDocument(source.arrayBuffer.slice(0));
      try {
        const maxPt = Math.max(page.widthPt || 595, page.heightPt || 842);
        const targetScale = Math.min(3.0, Math.max(2.0, maxDimension / (maxPt || 1)));
        const bitmap = await renderPageToImageBitmap(doc, page.originalIndex, targetScale);
        const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(bitmap, 0, 0);
          bitmap.close();
          const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.88 });
          return await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        }
        bitmap.close();
      } finally {
        await destroyPdfDocument(doc);
      }
    } catch (e) {
      console.warn(`Could not render on-demand raster base for page ${page.id}:`, e);
    }
  }
  return null;
}

export function usePdfExport() {
  const [isExporting, setIsExporting] = useState(false);
  const compileWorkerRef = useRef<Worker | null>(null);

  const pages = usePdfStore((state) => state.pages);
  const overlays = usePdfStore((state) => state.overlays);
  const sources = usePdfStore((state) => state.sources);
  const metadata = usePdfStore((state) => state.metadata);
  const setPageThumbnail = usePdfStore((state) => state.setPageThumbnail);

  useEffect(() => {
    return () => {
      if (compileWorkerRef.current) {
        compileWorkerRef.current.terminate();
        compileWorkerRef.current = null;
      }
    };
  }, []);

  const getOrCreateCompileWorker = useCallback((): Worker => {
    if (!compileWorkerRef.current) {
      compileWorkerRef.current = new Worker(
        new URL('../workers/pdf.compile.worker.ts', import.meta.url),
        { type: 'module' }
      );
    }
    return compileWorkerRef.current;
  }, []);

  const triggerDownload = useCallback(async (pdfBytes: Uint8Array, filename: string, intent?: 'download' | 'share'): Promise<void> => {
    const pdfBuffer = new ArrayBuffer(pdfBytes.byteLength);
    new Uint8Array(pdfBuffer).set(pdfBytes);
    const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
    
    // Attempt Web Share API if explicitly requested
    if (intent === 'share' && navigator.share && navigator.canShare) {
      const file = new File([blob], filename, { type: 'application/pdf' });
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: filename,
            files: [file],
          });
          return; // Successfully shared, skip standard download
        } catch (error: unknown) {
          if (error instanceof Error && error.name !== 'AbortError') {
            console.error('Share failed:', error);
          }
          // If aborted or failed, fall through to standard download fallback
        }
      }
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    // Must be in the DOM for Firefox + Safari; Chrome works without but this is safe
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Delay revoke so browser has time to start the download
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }, []);

  const exportPdf = useCallback(async (options: ExportOptions = {}): Promise<void> => {
    if (pages.length === 0) {
      toast.error('No pages to export.');
      return;
    }

    const rasterBaseMap = new Map<string, string>();
    if (options.compression?.enabled) {
      const maxDim = options.compression.maxDimensionPx || 1600;
      for (const page of pages) {
        if (page.sourceType !== 'blank') {
          const source = sources.find((s) => s.id === page.sourceId);
          const dataUrl = await ensurePageRasterBase(page, source, maxDim);
          if (dataUrl) {
            rasterBaseMap.set(page.id, dataUrl);
            setPageThumbnail(page.id, dataUrl);
          } else if (page.thumbnailDataUrl) {
            rasterBaseMap.set(page.id, page.thumbnailDataUrl);
          }
        }
      }
      const missingThumbnails = pages.some(
        (page) => page.sourceType !== 'blank' && !rasterBaseMap.has(page.id) && !page.thumbnailDataUrl
      );
      if (missingThumbnails) {
        toast.error('Some pages are still rendering. Try compressed export again in a moment.');
        return;
      }
    }
    
    setIsExporting(true);
    const loadingToast = toast.loading(options.compression?.enabled ? 'Compressing PDF...' : 'Compiling PDF...');
    
    try {
      const worker = getOrCreateCompileWorker();
      const pagesToExport = options.pageIds
        ? pages.filter((page) => options.pageIds?.includes(page.id))
        : pages;

      const orderedPages = pagesToExport.map(p => ({
        id: p.id,
        sourceId: p.sourceId,
        sourceType: p.sourceType,
        originalIndex: p.originalIndex,
        rotation: p.rotation,
        widthPt: p.widthPt,
        heightPt: p.heightPt,
        rasterBaseDataUrl: options.compression?.enabled ? (rasterBaseMap.get(p.id) || p.thumbnailDataUrl) : null,
      }));

      const referencedSourceIds = new Set(
        orderedPages
          .filter((page) => page.sourceType !== 'blank' && (!options.compression?.enabled || !page.rasterBaseDataUrl))
          .map((page) => page.sourceId)
      );

      const workerSources: CompileWorkerSource[] = sources
        .filter((source) => referencedSourceIds.has(source.id))
        .map((source) => ({
          id: source.id,
          type: source.type,
          name: source.name,
          mimeType: source.mimeType,
          arrayBuffer: source.arrayBuffer.slice(0),
        }));

      const request: CompileWorkerRequest = {
        type: 'COMPILE_PDF',
        sources: workerSources,
        orderedPages,
        overlays,
        metadata: options.stripMetadata ? {} : metadata,
        exportOptions: options,
      };

      const compiledBytes = await new Promise<Uint8Array>((resolve, reject) => {
        worker.onmessage = (e: MessageEvent<CompileWorkerResponse>) => {
          if (e.data.type === 'COMPILE_DONE' && e.data.pdfBytes) {
            resolve(e.data.pdfBytes);
          } else {
            reject(new Error(e.data.error || 'Unknown compilation error'));
          }
        };
        worker.onerror = (err) => {
          reject(err);
        };
        worker.postMessage(request, workerSources.map((source) => source.arrayBuffer));
      });

      await triggerDownload(
        compiledBytes,
        options.filename || getExportFilename(metadata.title, options),
        options.intent
      );
      toast.success(options.compression?.enabled ? 'Compressed export successful!' : 'Export successful!', { id: loadingToast });
    } catch (err) {
      const error = err as Error;
      toast.error('Export failed: ' + error.message, { id: loadingToast });
    } finally {
      setIsExporting(false);
    }
  }, [sources, pages, overlays, metadata, getOrCreateCompileWorker, triggerDownload, setPageThumbnail]);

  const exportAsJpegZip = useCallback(async (): Promise<void> => {
    if (pages.length === 0) {
      toast.error('No pages to export.');
      return;
    }

    const rasterBaseMap = new Map<string, string>();
    for (const page of pages) {
      if (page.sourceType !== 'blank' && !page.thumbnailDataUrl) {
        const source = sources.find((s) => s.id === page.sourceId);
        const dataUrl = await ensurePageRasterBase(page, source, 1600);
        if (dataUrl) {
          rasterBaseMap.set(page.id, dataUrl);
          setPageThumbnail(page.id, dataUrl);
        }
      }
    }

    const missingThumbnails = pages.some(
      (page) => page.sourceType !== 'blank' && !rasterBaseMap.has(page.id) && !page.thumbnailDataUrl
    );
    if (missingThumbnails) {
      toast.error('Some pages are still rendering. Try again in a moment.');
      return;
    }

    setIsExporting(true);
    const loadingToast = toast.loading('Preparing JPEG ZIP...');

    try {
      const JSZipModule = await import('jszip');
      const JSZip = JSZipModule.default || JSZipModule;
      const zip = new (JSZip as new () => import('jszip'))();

      for (const [index, page] of pages.entries()) {
        const overlay = overlays.find((o) => o.pageId === page.id);
        const dataUrl =
          overlay?.previewDataUrl ||
          rasterBaseMap.get(page.id) ||
          page.thumbnailDataUrl ||
          (await createBlankPageDataUrl(page.widthPt, page.heightPt));
        const base64 = dataUrl.split(',')[1];
        zip.file(`page-${String(index + 1).padStart(3, '0')}.jpg`, base64, { base64: true });
      }

      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${metadata.title || 'flowwsuite-pages'}.zip`;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);

      toast.success('JPEG ZIP exported.', { id: loadingToast });
    } catch (err) {
      const error = err as Error;
      toast.error('JPEG ZIP export failed: ' + error.message, { id: loadingToast });
    } finally {
      setIsExporting(false);
    }
  }, [pages, overlays, sources, metadata.title, setPageThumbnail]);

  return {
    exportPdf,
    exportAsJpegZip,
    isExporting,
  };
}
