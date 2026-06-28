import { PDFDocument, degrees, StandardFonts, rgb, type PDFPage } from 'pdf-lib';
import { canvasToPdfCoords, hexToRgb, pxToPt } from '../utils/coordTranslate';
import { fabricPathToSvgString } from '../utils/fabricSerializer';
import type {
  CompileWorkerPage,
  CompileWorkerRequest,
  CompileWorkerResponse,
  CompileWorkerSource,
} from '../types/pdf.types';

interface FabricOverlayObject {
  type?: string;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  scaleX?: number;
  scaleY?: number;
  angle?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  text?: string;
  fontSize?: number;
  path?: Array<Array<string | number>>;
  src?: string;
}

interface FabricOverlayJson {
  objects?: FabricOverlayObject[];
  canvasWidth?: number;
  canvasHeight?: number;
}

async function addImagePage(outDoc: PDFDocument, source: CompileWorkerSource, pageSpec: CompileWorkerPage) {
  const page = outDoc.addPage([pageSpec.widthPt, pageSpec.heightPt]);
  const image = source.mimeType === 'image/png'
    ? await outDoc.embedPng(source.arrayBuffer)
    : await outDoc.embedJpg(source.arrayBuffer);

  page.drawImage(image, {
    x: 0,
    y: 0,
    width: pageSpec.widthPt,
    height: pageSpec.heightPt,
  });

  return page;
}

function dataUrlToBytes(dataUrl: string): { mimeType: string; bytes: Uint8Array } {
  const match = dataUrl.match(/^data:([^;,]+)(;base64)?,(.*)$/);
  if (!match) throw new Error('Unsupported embedded image data');

  const [, mimeType, isBase64, payload] = match;
  const binary = isBase64 ? atob(payload) : decodeURIComponent(payload);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return { mimeType, bytes };
}

async function compressDataUrlToJpeg(
  dataUrl: string,
  quality: number,
  maxDimensionPx: number
): Promise<Uint8Array> {
  const { bytes, mimeType } = dataUrlToBytes(dataUrl);
  const byteBuffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(byteBuffer).set(bytes);
  const blob = new Blob([byteBuffer], { type: mimeType });
  const bitmap = await createImageBitmap(blob);
  const scale = Math.min(1, maxDimensionPx / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    bitmap.close();
    return bytes;
  }

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const jpegBlob = await canvas.convertToBlob({
    type: 'image/jpeg',
    quality: Math.min(0.95, Math.max(0.35, quality)),
  });

  return new Uint8Array(await jpegBlob.arrayBuffer());
}

async function addRasterizedPage(
  outDoc: PDFDocument,
  pageSpec: CompileWorkerPage,
  options: CompileWorkerRequest['exportOptions']
) {
  const page = outDoc.addPage([pageSpec.widthPt, pageSpec.heightPt]);

  if (!pageSpec.rasterBaseDataUrl) return page;

  const compression = options.compression;
  const imageBytes = compression?.enabled
    ? await compressDataUrlToJpeg(
        pageSpec.rasterBaseDataUrl,
        compression.imageQuality,
        compression.maxDimensionPx
      )
    : dataUrlToBytes(pageSpec.rasterBaseDataUrl).bytes;

  const image = await outDoc.embedJpg(imageBytes);
  page.drawImage(image, {
    x: 0,
    y: 0,
    width: pageSpec.widthPt,
    height: pageSpec.heightPt,
  });

  return page;
}

async function addCompiledPage(
  outDoc: PDFDocument,
  pdfCache: Map<string, PDFDocument>,
  sourceMap: Map<string, CompileWorkerSource>,
  pageSpec: CompileWorkerPage,
  options: CompileWorkerRequest['exportOptions']
) {
  if (options.compression?.enabled && pageSpec.rasterBaseDataUrl) {
    return addRasterizedPage(outDoc, pageSpec, options);
  }

  if (pageSpec.sourceType === 'blank' || pageSpec.originalIndex < 0) {
    return outDoc.addPage([pageSpec.widthPt || 595, pageSpec.heightPt || 842]);
  }

  const source = sourceMap.get(pageSpec.sourceId);
  if (!source) throw new Error('Missing source for page export');

  if (source.type === 'image') {
    return addImagePage(outDoc, source, pageSpec);
  }

  let srcDoc = pdfCache.get(source.id);
  if (!srcDoc) {
    srcDoc = await PDFDocument.load(source.arrayBuffer);
    pdfCache.set(source.id, srcDoc);
  }

  const [copied] = await outDoc.copyPages(srcDoc, [pageSpec.originalIndex]);
  outDoc.addPage(copied);
  return copied;
}

function getObjectType(obj: FabricOverlayObject): string {
  return String(obj?.type || '').toLowerCase().replace(/[^a-z-]/g, '');
}

async function embedCanvasImage(outDoc: PDFDocument, src: string) {
  const { mimeType, bytes } = src.startsWith('data:')
    ? dataUrlToBytes(src)
    : {
        mimeType: src.includes('image/png') ? 'image/png' : 'image/jpeg',
        bytes: new Uint8Array(await (await fetch(src)).arrayBuffer()),
      };

  if (mimeType.includes('png')) return outDoc.embedPng(bytes);
  return outDoc.embedJpg(bytes);
}

async function applyOverlay(
  outDoc: PDFDocument,
  page: PDFPage,
  pageSpec: CompileWorkerPage,
  overlays: CompileWorkerRequest['overlays'],
  helveticaFont: Awaited<ReturnType<PDFDocument['embedFont']>>
) {
  const overlay = overlays.find((o) => o.pageId === pageSpec.id);
  if (!overlay?.fabricJson) return;

  const fabricJson = overlay.fabricJson as FabricOverlayJson;
  const objects = fabricJson.objects;
  const canvasWidthPx = fabricJson.canvasWidth;
  const canvasHeightPx = fabricJson.canvasHeight;
  const { width: pageWidthPt, height: pageHeightPt } = page.getSize();

  if (!objects || !Array.isArray(objects) || !canvasWidthPx || !canvasHeightPx) return;

  for (const obj of objects) {
    const metrics = {
      left: obj.left || 0,
      top: obj.top || 0,
      scaledWidth: (obj.width || 0) * (obj.scaleX || 1),
      scaledHeight: (obj.height || 0) * (obj.scaleY || 1),
      angle: obj.angle || 0,
      canvasWidthPx,
      canvasHeightPx,
      pageWidthPt,
      pageHeightPt,
    };

    const coords = canvasToPdfCoords(metrics);

    const objectType = getObjectType(obj);

    if (objectType === 'i-text' || objectType === 'itext' || objectType === 'textbox' || objectType === 'text') {
      const fill = obj.fill ? hexToRgb(obj.fill) : null;
      page.drawText(obj.text || '', {
        x: coords.x,
        y: coords.y,
        size: pxToPt((obj.fontSize || 24) * (obj.scaleY || 1), canvasWidthPx, pageWidthPt),
        font: helveticaFont,
        color: fill ? rgb(fill.r, fill.g, fill.b) : undefined,
        rotate: degrees(coords.rotation),
      });
    } else if (objectType === 'path' && obj.path) {
      const stroke = obj.stroke ? hexToRgb(obj.stroke) : null;
      const fill = obj.fill ? hexToRgb(obj.fill) : null;
      page.drawSvgPath(fabricPathToSvgString(obj.path), {
        x: coords.x,
        y: coords.y + coords.height,
        scale: (pageWidthPt / canvasWidthPx) * (obj.scaleX || 1),
        color: fill ? rgb(fill.r, fill.g, fill.b) : undefined,
        borderColor: stroke ? rgb(stroke.r, stroke.g, stroke.b) : undefined,
        borderWidth: pxToPt(obj.strokeWidth || 1, canvasWidthPx, pageWidthPt),
      });
    } else if (objectType === 'image' && obj.src) {
      const image = await embedCanvasImage(outDoc, obj.src);

      page.drawImage(image, {
        x: coords.x,
        y: coords.y,
        width: coords.width,
        height: coords.height,
        rotate: degrees(coords.rotation),
      });
    }
  }
}

self.onmessage = async (event: MessageEvent<CompileWorkerRequest>) => {
  const { sources, orderedPages, overlays, metadata, exportOptions } = event.data;

  try {
    const outDoc = await PDFDocument.create();
    const helveticaFont = await outDoc.embedFont(StandardFonts.Helvetica);
    const sourceMap = new Map(sources.map((source) => [source.id, source]));
    const pdfCache = new Map<string, PDFDocument>();

    for (const orderedPage of orderedPages) {
      const page = await addCompiledPage(outDoc, pdfCache, sourceMap, orderedPage, exportOptions);

      if (orderedPage.rotation !== 0) {
        page.setRotation(degrees(orderedPage.rotation));
      }

      await applyOverlay(outDoc, page, orderedPage, overlays, helveticaFont);
    }

    if (metadata?.title) outDoc.setTitle(metadata.title);
    if (metadata?.author) outDoc.setAuthor(metadata.author);
    if (metadata?.subject) outDoc.setSubject(metadata.subject);
    if (metadata?.keywords) outDoc.setKeywords([metadata.keywords]);
    if (metadata?.creator) outDoc.setCreator(metadata.creator);

    const pdfBytes = await outDoc.save();

    self.postMessage({ type: 'COMPILE_DONE', pdfBytes } as CompileWorkerResponse, [pdfBytes.buffer]);
  } catch (err) {
    const error = err as Error;
    self.postMessage({ type: 'COMPILE_ERROR', error: error.message } as CompileWorkerResponse);
  }
};

export {};
