// =============================================================================
// UTILITY — FABRIC.JS SERIALIZER
// Serializes a Fabric.js canvas state into a format consumable by the
// compile worker. Extracts each object's position, style, and content.
//
// This utility runs on the MAIN thread only (uses Fabric.js APIs).
// The output is a plain JSON-serializable structure passed to the worker.
// =============================================================================

import type { Canvas } from 'fabric';

export function serializeFabricCanvas(canvas: Canvas): object {
  const json = canvas.toObject([
    'type', 'left', 'top', 'scaleX', 'scaleY', 'angle',
    'fill', 'stroke', 'strokeWidth', 'text', 'fontFamily', 'fontSize',
    'fontWeight', 'fontStyle', 'src', 'path', 'pathOffset',
    'originX', 'originY', 'width', 'height'
  ]);
  
  return {
    ...json,
    canvasWidth: canvas.width,
    canvasHeight: canvas.height
  };
}

export function fabricPathToSvgString(pathData: Array<Array<string | number>>): string {
  if (!pathData || !Array.isArray(pathData)) return '';
  return pathData.map(cmd => cmd.join(' ')).join(' ');
}
