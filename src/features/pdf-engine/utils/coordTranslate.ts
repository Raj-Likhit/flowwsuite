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
  /** Fabric.js left (x of object's top-left corner in canvas px) */
  left: number;
  /** Fabric.js top (y of object's top-left corner in canvas px) */
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
}

/**
 * Translates a Fabric.js object's position into pdf-lib point coordinates.
 *
 * TODO: Implement this function.
 *
 * Implementation notes:
 *   scaleX = pageWidthPt / canvasWidthPx
 *   scaleY = pageHeightPt / canvasHeightPx
 *   pdf_x = left * scaleX
 *   pdf_y = pageHeightPt - (top * scaleY) - (scaledHeight * scaleY)
 *     ↑ This flips the y-axis from canvas-space to PDF-space
 *   pdf_width = scaledWidth * scaleX
 *   pdf_height = scaledHeight * scaleY
 *   rotation = -angle  (pdf-lib uses counter-clockwise, fabric uses clockwise)
 */
export function canvasToPdfCoords(metrics: CanvasObjectMetrics): PdfCoords {
  const scaleX = metrics.pageWidthPt / metrics.canvasWidthPx;
  const scaleY = metrics.pageHeightPt / metrics.canvasHeightPx;
  
  const pdf_x = metrics.left * scaleX;
  const pdf_height = metrics.scaledHeight * scaleY;
  // Note: PDF origin is bottom-left, fabric is top-left
  const pdf_y = metrics.pageHeightPt - (metrics.top * scaleY) - pdf_height;
  const pdf_width = metrics.scaledWidth * scaleX;
  
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
