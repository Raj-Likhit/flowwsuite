import { PDFDocument, degrees, StandardFonts, rgb, type PDFPage, type PDFFont } from 'pdf-lib';
import {
  canvasToPdfCoords,
  hexToRgb,
  pxToPt,
  applyRotationToPdfCoords,
  transformPointToUnrotated,
} from '../utils/coordTranslate';
import { fabricPathToSvgString } from '../utils/fabricSerializer';
import { ensurePngOrJpgBytes, dataUrlToBytes } from '../utils/imageTranscoder';
import { getOrEmbedStandardFont } from '../utils/fontResolver';
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
  fontFamily?: string;
  fontWeight?: string | number;
  fontStyle?: string;
  fontSize?: number;
  lineHeight?: number;
  opacity?: number;
  textAlign?: string;
  path?: Array<Array<string | number>>;
  src?: string;
  pathOffset?: { x: number; y: number };
  originX?: string;
  originY?: string;
}

export function sanitizeWinAnsiText(text: string): string {
  const normalized = text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\u2022/g, '*')
    .replace(/\u00A0/g, ' ');

  return Array.from(normalized)
    .map((char) => (char.charCodeAt(0) <= 255 ? char : '?'))
    .join('');
}

interface FabricOverlayJson {
  objects?: FabricOverlayObject[];
  canvasWidth?: number;
  canvasHeight?: number;
}

async function addImagePage(outDoc: PDFDocument, source: CompileWorkerSource, pageSpec: CompileWorkerPage) {
  const page = outDoc.addPage([pageSpec.widthPt, pageSpec.heightPt]);
  const sourceBytes = new Uint8Array(source.arrayBuffer);
  const { bytes: readyBytes, isPng } = await ensurePngOrJpgBytes(sourceBytes, source.mimeType);

  const image = isPng
    ? await outDoc.embedPng(readyBytes)
    : await outDoc.embedJpg(readyBytes);

  page.drawImage(image, {
    x: 0,
    y: 0,
    width: pageSpec.widthPt,
    height: pageSpec.heightPt,
  });

  return page;
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
  try {
    const scale = Math.min(1, maxDimensionPx / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return bytes;
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);

    const jpegBlob = await canvas.convertToBlob({
      type: 'image/jpeg',
      quality: Math.min(0.95, Math.max(0.35, quality)),
    });

    return new Uint8Array(await jpegBlob.arrayBuffer());
  } finally {
    bitmap.close();
  }
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
        mimeType: src.includes('image/png')
          ? 'image/png'
          : src.includes('image/webp')
            ? 'image/webp'
            : 'image/jpeg',
        bytes: new Uint8Array(await (await fetch(src)).arrayBuffer()),
      };

  const { bytes: readyBytes, isPng } = await ensurePngOrJpgBytes(bytes, mimeType);
  if (isPng) return outDoc.embedPng(readyBytes);
  return outDoc.embedJpg(readyBytes);
}

async function applyOverlay(
  outDoc: PDFDocument,
  page: PDFPage,
  pageSpec: CompileWorkerPage,
  overlays: CompileWorkerRequest['overlays'],
  fontCache: Map<StandardFonts, PDFFont>
) {
  const overlay = overlays.find((o) => o.pageId === pageSpec.id);
  if (!overlay?.fabricJson) return;

  const fabricJson = overlay.fabricJson as FabricOverlayJson;
  const objects = fabricJson.objects;
  const canvasWidthPx = fabricJson.canvasWidth;
  const canvasHeightPx = fabricJson.canvasHeight;
  const visualWidthPt = pageSpec.widthPt || page.getWidth();
  const visualHeightPt = pageSpec.heightPt || page.getHeight();
  const pageRotation = pageSpec.rotation || 0;

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
      pageWidthPt: visualWidthPt,
      pageHeightPt: visualHeightPt,
      originX: obj.originX || 'left',
      originY: obj.originY || 'top',
    };

    const visualCoords = canvasToPdfCoords(metrics);
    const coords = applyRotationToPdfCoords(visualCoords, visualWidthPt, visualHeightPt, pageRotation);
    const opacity = typeof obj.opacity === 'number' ? Math.max(0, Math.min(1, obj.opacity)) : undefined;

    const objectType = getObjectType(obj);

    if (objectType === 'i-text' || objectType === 'itext' || objectType === 'textbox' || objectType === 'text') {
      const fill = obj.fill ? hexToRgb(obj.fill) : null;
      // Use height ratio for font size since fontSize is a vertical measurement
      const fontScaleRatio = visualHeightPt / canvasHeightPx;
      const fontSizePt = (obj.fontSize || 24) * (obj.scaleY || 1) * fontScaleRatio;
      const lineHeightPt = fontSizePt * (obj.lineHeight || 1.16);
      const font = await getOrEmbedStandardFont(outDoc, fontCache, {
        fontFamily: obj.fontFamily,
        fontWeight: obj.fontWeight,
        fontStyle: obj.fontStyle,
      });

      const sanitizedText = sanitizeWinAnsiText(obj.text || '');

      page.drawText(sanitizedText, {
        x: coords.x,
        y: coords.y,
        size: fontSizePt,
        lineHeight: lineHeightPt,
        font,
        color: fill ? rgb(fill.r, fill.g, fill.b) : undefined,
        opacity,
        rotate: degrees(coords.rotation),
      });
    } else if (objectType === 'path' && obj.path) {
      const stroke = obj.stroke ? hexToRgb(obj.stroke) : null;
      const fill = obj.fill ? hexToRgb(obj.fill) : null;
      
      const baseScaleX = visualWidthPt / canvasWidthPx;
      const baseScaleY = visualHeightPt / canvasHeightPx;
      
      // Fabric path objects store path data in their local coordinate space.
      // The path's position on the canvas is determined by (left, top) and pathOffset.
      // pathOffset is the center of the path's bounding box in path-local coordinates.
      // scaleX/scaleY must be applied to the path rendering to handle user resizing.
      const objScaleX = obj.scaleX || 1;
      const objScaleY = obj.scaleY || 1;

      const canvas_x = (obj.left || 0) - (obj.pathOffset?.x || 0) * objScaleX;
      const canvas_y = (obj.top || 0) - (obj.pathOffset?.y || 0) * objScaleY;
      
      const pdf_x = canvas_x * baseScaleX;
      const pdf_y = visualHeightPt - (canvas_y * baseScaleY);
      const rotatedPt = transformPointToUnrotated(pdf_x, pdf_y, visualWidthPt, visualHeightPt, pageRotation);

      page.drawSvgPath(fabricPathToSvgString(obj.path), {
        x: rotatedPt.x,
        y: rotatedPt.y,
        scale: baseScaleX * objScaleX,
        color: fill ? rgb(fill.r, fill.g, fill.b) : undefined,
        borderColor: stroke ? rgb(stroke.r, stroke.g, stroke.b) : undefined,
        borderWidth: pxToPt((obj.strokeWidth || 1) * objScaleX, canvasWidthPx, visualWidthPt),
        opacity,
        borderOpacity: opacity,
      });
    } else if (objectType === 'image' && obj.src) {
      const image = await embedCanvasImage(outDoc, obj.src);

      page.drawImage(image, {
        x: coords.x,
        y: coords.y,
        width: coords.width,
        height: coords.height,
        opacity,
        rotate: degrees(coords.rotation),
      });
    }
  }
}

self.onmessage = async (event: MessageEvent<CompileWorkerRequest>) => {
  const { sources, orderedPages, overlays, metadata, exportOptions } = event.data;

  const fontCache = new Map<StandardFonts, PDFFont>();
  const sourceMap = new Map(sources.map((source) => [source.id, source]));
  const pdfCache = new Map<string, PDFDocument>();

  try {
    const outDoc = await PDFDocument.create();

    for (const orderedPage of orderedPages) {
      const page = await addCompiledPage(outDoc, pdfCache, sourceMap, orderedPage, exportOptions);

      page.setRotation(degrees(orderedPage.rotation));

      await applyOverlay(outDoc, page, orderedPage, overlays, fontCache);
    }

    if (metadata?.title) outDoc.setTitle(metadata.title);
    if (metadata?.author) outDoc.setAuthor(metadata.author);
    if (metadata?.subject) outDoc.setSubject(metadata.subject);
    if (metadata?.keywords) outDoc.setKeywords([metadata.keywords]);
    if (metadata?.creator) outDoc.setCreator(metadata.creator);

    const pdfBytes = await outDoc.save();

    self.postMessage({ type: 'COMPILE_DONE', pdfBytes } as CompileWorkerResponse, [pdfBytes.buffer]);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    self.postMessage({ type: 'COMPILE_ERROR', error: errorMessage } as CompileWorkerResponse);
  } finally {
    fontCache.clear();
    pdfCache.clear();
    sourceMap.clear();
  }
};

export {};
