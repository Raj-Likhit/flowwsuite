// =============================================================================
// UTILITY — COORDINATE TRANSLATION
// Converts between HTML Canvas/Fabric.js coordinates and PDF coordinate space.
//
// Canvas (pdfjs/Fabric):  origin = top-left,  y increases DOWNWARD
// PDF (pdf-lib):          origin = bottom-left, y increases UPWARD
//
// This file must remain a pure utility with NO imports from React, Zustand,
// or browser APIs. It is imported by both the compile worker and React components.
// =============================================================================

/** Result of a coordinate translation */
export interface PdfCoords {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Rotation in degrees (pdf-lib convention) */
  rotation: number;
}

/** Input from a Fabric.js object */
export interface CanvasObjectMetrics {
  /** Fabric.js left (x position in canvas px — meaning depends on originX) */
  left: number;
  /** Fabric.js top (y position in canvas px — meaning depends on originY) */
  top: number;
  /** Scaled width of the object in canvas px */
  scaledWidth: number;
  /** Scaled height of the object in canvas px */
  scaledHeight: number;
  /** Fabric.js angle in degrees (clockwise) */
  angle: number;
  /** The canvas element's pixel width */
  canvasWidthPx: number;
  /** The canvas element's pixel height */
  canvasHeightPx: number;
  /** The PDF page's width in points */
  pageWidthPt: number;
  /** The PDF page's height in points */
  pageHeightPt: number;
  /** Fabric.js originX — 'left' | 'center' | 'right'. Defaults to 'left'. */
  originX?: string;
  /** Fabric.js originY — 'top' | 'center' | 'bottom'. Defaults to 'top'. */
  originY?: string;
}

/**
 * Converts a Fabric.js origin-relative position to the object's top-left corner.
 * Fabric.js stores (left, top) relative to the origin point, so we need to
 * resolve to top-left before translating to PDF space.
 */
function resolveToTopLeft(
  left: number,
  top: number,
  scaledWidth: number,
  scaledHeight: number,
  originX: string,
  originY: string
): { tlLeft: number; tlTop: number } {
  let tlLeft = left;
  let tlTop = top;

  if (originX === 'center') {
    tlLeft = left - scaledWidth / 2;
  } else if (originX === 'right') {
    tlLeft = left - scaledWidth;
  }

  if (originY === 'center') {
    tlTop = top - scaledHeight / 2;
  } else if (originY === 'bottom') {
    tlTop = top - scaledHeight;
  }

  return { tlLeft, tlTop };
}

/**
 * Translates a Fabric.js object's position into pdf-lib point coordinates.
 *
 * Implementation notes:
 *   1. Resolve origin to top-left corner
 *   2. Scale from canvas-px to PDF-pt:
 *        scaleX = pageWidthPt / canvasWidthPx
 *        scaleY = pageHeightPt / canvasHeightPx
 *   3. Flip y-axis (canvas: y↓, PDF: y↑):
 *        pdf_y = pageHeightPt - (top * scaleY) - (scaledHeight * scaleY)
 *   4. Rotation pivot adjustment:
 *        pdf-lib rotates around bottom-left, Fabric around top-left
 *        rotation = -angle (counter-clockwise vs clockwise)
 */
export function canvasToPdfCoords(metrics: CanvasObjectMetrics): PdfCoords {
  const scaleX = metrics.pageWidthPt / metrics.canvasWidthPx;
  const scaleY = metrics.pageHeightPt / metrics.canvasHeightPx;

  const { tlLeft, tlTop } = resolveToTopLeft(
    metrics.left,
    metrics.top,
    metrics.scaledWidth,
    metrics.scaledHeight,
    metrics.originX || 'left',
    metrics.originY || 'top'
  );

  const pdf_left = tlLeft * scaleX;
  const pdf_top = metrics.pageHeightPt - (tlTop * scaleY);
  
  const pdf_width = metrics.scaledWidth * scaleX;
  const pdf_height = metrics.scaledHeight * scaleY;
  
  // Fabric rotates around the top-left (left, top) because we enforce originX='left', originY='top'
  // pdf-lib rotates around the bottom-left (x, y) that we pass to drawImage/drawText.
  // We must calculate the correct (x, y) so that the local top-left ends up exactly at (pdf_left, pdf_top).
  const rad = (-metrics.angle * Math.PI) / 180;
  const pdf_x = pdf_left + pdf_height * Math.sin(rad);
  const pdf_y = pdf_top - pdf_height * Math.cos(rad);
  
  return {
    x: pdf_x,
    y: pdf_y,
    width: pdf_width,
    height: pdf_height,
    rotation: -metrics.angle,
  };
}

export function pxToPt(px: number, canvasWidthPx: number, pageWidthPt: number): number {
  return px * (pageWidthPt / canvasWidthPx);
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let normalizedHex = hex.replace(/^#/, '');
  
  if (normalizedHex.length === 3) {
    normalizedHex = normalizedHex.split('').map((char) => char + char).join('');
  }
  
  if (normalizedHex.length !== 6) {
    // Fallback to black on invalid hex
    return { r: 0, g: 0, b: 0 };
  }
  
  const intVal = parseInt(normalizedHex, 16);
  
  return {
    r: ((intVal >> 16) & 255) / 255,
    g: ((intVal >> 8) & 255) / 255,
    b: (intVal & 255) / 255,
  };
}
