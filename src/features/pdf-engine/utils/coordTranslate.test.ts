import { describe, it, expect } from 'vitest';
import { canvasToPdfCoords, pxToPt, hexToRgb } from './coordTranslate';

describe('coordTranslate Utilities', () => {
  describe('canvasToPdfCoords', () => {
    it('correctly translates top-left origin to bottom-left PDF coordinates', () => {
      // Mock inputs:
      // Canvas: 800x600 px
      // PDF Page: 400x300 pt
      // Therefore, scale is 0.5 (400/800 and 300/600)
      
      const metrics = {
        left: 100, // x on canvas
        top: 200,  // y on canvas
        scaledWidth: 100,
        scaledHeight: 50,
        angle: 45, // clockwise
        canvasWidthPx: 800,
        canvasHeightPx: 600,
        pageWidthPt: 400,
        pageHeightPt: 300
      };

      const result = canvasToPdfCoords(metrics);

      // Expected x = left * scaleX = 100 * 0.5 = 50
      expect(result.x).toBe(50);
      
      // Expected width = scaledWidth * scaleX = 100 * 0.5 = 50
      expect(result.width).toBe(50);
      
      // Expected height = scaledHeight * scaleY = 50 * 0.5 = 25
      expect(result.height).toBe(25);
      
      // Expected y: 
      // PDF origin is bottom-left, y goes UP.
      // Canvas origin is top-left, y goes DOWN.
      // pdf_y = pageHeightPt - (top * scaleY) - pdf_height
      // pdf_y = 300 - (200 * 0.5) - 25 = 300 - 100 - 25 = 175
      expect(result.y).toBe(175);
      
      // Expected rotation = -angle
      expect(result.rotation).toBe(-45);
    });
  });

  describe('pxToPt', () => {
    it('scales pixels to points according to page ratio', () => {
      // 100px on an 800px canvas -> PDF with 400pt width
      expect(pxToPt(100, 800, 400)).toBe(50);
      
      // 0px should be 0pt
      expect(pxToPt(0, 800, 400)).toBe(0);
    });
  });

  describe('hexToRgb', () => {
    it('parses valid 6-character hex string', () => {
      const rgb = hexToRgb('#ff0000'); // Red
      expect(rgb.r).toBe(1);
      expect(rgb.g).toBe(0);
      expect(rgb.b).toBe(0);
    });

    it('parses valid 3-character hex string', () => {
      const rgb = hexToRgb('#0f0'); // Green
      expect(rgb.r).toBe(0);
      expect(rgb.g).toBe(1);
      expect(rgb.b).toBe(0);
    });

    it('handles hex without # prefix', () => {
      const rgb = hexToRgb('0000ff'); // Blue
      expect(rgb.r).toBe(0);
      expect(rgb.g).toBe(0);
      expect(rgb.b).toBe(1);
    });

    it('falls back to black for invalid hex', () => {
      const rgb = hexToRgb('invalid');
      expect(rgb.r).toBe(0);
      expect(rgb.g).toBe(0);
      expect(rgb.b).toBe(0);
    });
  });
});
