import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  dataUrlToBytes,
  isJpegBytes,
  isPngBytes,
  ensurePngOrJpgBytes,
  transcodeToPng,
} from './imageTranscoder';

describe('imageTranscoder utility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('dataUrlToBytes', () => {
    it('correctly decodes base64 data URLs', () => {
      const dataUrl = 'data:image/webp;base64,aGVsbG8=';
      const result = dataUrlToBytes(dataUrl);

      expect(result.mimeType).toBe('image/webp');
      expect(result.bytes.length).toBe(5);
      expect(String.fromCharCode(...result.bytes)).toBe('hello');
    });

    it('correctly decodes percent-encoded data URLs', () => {
      const dataUrl = 'data:text/plain,hello%20world';
      const result = dataUrlToBytes(dataUrl);

      expect(result.mimeType).toBe('text/plain');
      expect(String.fromCharCode(...result.bytes)).toBe('hello world');
    });

    it('throws on invalid data URL format', () => {
      expect(() => dataUrlToBytes('not-a-data-url')).toThrow('Unsupported embedded image data');
    });
  });

  describe('format checkers', () => {
    it('detects JPEG header bytes correctly', () => {
      const validJpg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
      const invalidJpg = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
      const shortBytes = new Uint8Array([0xff]);

      expect(isJpegBytes(validJpg)).toBe(true);
      expect(isJpegBytes(invalidJpg)).toBe(false);
      expect(isJpegBytes(shortBytes)).toBe(false);
    });

    it('detects PNG header bytes correctly', () => {
      const validPng = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
      const invalidPng = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
      const shortBytes = new Uint8Array([0x89, 0x50]);

      expect(isPngBytes(validPng)).toBe(true);
      expect(isPngBytes(invalidPng)).toBe(false);
      expect(isPngBytes(shortBytes)).toBe(false);
    });
  });

  describe('ensurePngOrJpgBytes and transcodeToPng', () => {
    it('returns JPEG unchanged if valid JPEG header present', async () => {
      const jpgBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
      const result = await ensurePngOrJpgBytes(jpgBytes, 'image/jpeg');

      expect(result.isPng).toBe(false);
      expect(result.bytes).toBe(jpgBytes);
    });

    it('returns PNG unchanged if valid PNG header present', async () => {
      const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const result = await ensurePngOrJpgBytes(pngBytes, 'image/png');

      expect(result.isPng).toBe(true);
      expect(result.bytes).toBe(pngBytes);
    });

    it('transcodes WebP bytes using OffscreenCanvas and returns PNG', async () => {
      const mockPngOutput = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x11, 0x22]);

      const originalCreateImageBitmap = global.createImageBitmap;
      const originalOffscreenCanvas = global.OffscreenCanvas;

      const mockBitmapClose = vi.fn();
      global.createImageBitmap = vi.fn().mockResolvedValue({
        width: 100,
        height: 50,
        close: mockBitmapClose,
      });

      const mockDrawImage = vi.fn();
      global.OffscreenCanvas = vi.fn().mockImplementation(function (this: any, width: number, height: number) {
        this.width = width;
        this.height = height;
        this.getContext = vi.fn().mockReturnValue({
          drawImage: mockDrawImage,
        });
        this.convertToBlob = vi.fn().mockResolvedValue(new Blob([mockPngOutput], { type: 'image/png' }));
      }) as any;

      const webpBytes = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x00]);
      const result = await ensurePngOrJpgBytes(webpBytes, 'image/webp');

      expect(result.isPng).toBe(true);
      expect(result.bytes[0]).toBe(0x89);
      expect(result.bytes[1]).toBe(0x50);
      expect(mockBitmapClose).toHaveBeenCalled();
      expect(mockDrawImage).toHaveBeenCalled();

      global.createImageBitmap = originalCreateImageBitmap;
      global.OffscreenCanvas = originalOffscreenCanvas;
    });

    it('throws error when OffscreenCanvas 2D context is unavailable', async () => {
      const origCreateImageBitmap = global.createImageBitmap;
      const origOffscreen = global.OffscreenCanvas;

      const mockClose = vi.fn();
      global.createImageBitmap = vi.fn().mockResolvedValue({
        width: 100,
        height: 50,
        close: mockClose,
      });

      global.OffscreenCanvas = vi.fn().mockImplementation(function (this: any) {
        this.getContext = vi.fn().mockReturnValue(null);
      }) as any;

      await expect(transcodeToPng(new Uint8Array([1, 2, 3]), 'image/webp')).rejects.toThrow(
        'Canvas 2D context unavailable for image transcoding'
      );
      expect(mockClose).toHaveBeenCalled();

      global.createImageBitmap = origCreateImageBitmap;
      global.OffscreenCanvas = origOffscreen;
    });

    it('uses DOM HTMLCanvasElement fallback when createImageBitmap is unavailable', async () => {
      const origCreateImageBitmap = global.createImageBitmap;
      delete (global as any).createImageBitmap;

      const origRevoke = URL.revokeObjectURL;
      const origCreate = URL.createObjectURL;
      URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
      URL.revokeObjectURL = vi.fn();

      const mockPngOutput = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 9, 9]);

      // Mock HTMLImageElement and HTMLCanvasElement
      const origImage = global.Image;
      class MockImage {
        width = 80;
        height = 60;
        onload: any = null;
        onerror: any = null;
        set src(_v: string) {
          setTimeout(() => {
            if (this.onload) this.onload();
          }, 0);
        }
      }
      (global as any).Image = MockImage;

      const origCreateElement = document.createElement.bind(document);
      const canvasSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'canvas') {
          return {
            width: 0,
            height: 0,
            getContext: vi.fn().mockReturnValue({
              drawImage: vi.fn(),
            }),
            toBlob: (cb: any) => cb(new Blob([mockPngOutput], { type: 'image/png' })),
          } as any;
        }
        return origCreateElement(tag);
      });

      const result = await transcodeToPng(new Uint8Array([5, 6, 7]), 'image/webp');
      expect(result).toEqual(mockPngOutput);

      canvasSpy.mockRestore();
      (global as any).Image = origImage;
      URL.createObjectURL = origCreate;
      URL.revokeObjectURL = origRevoke;
      global.createImageBitmap = origCreateImageBitmap;
    });

    it('rejects in DOM fallback when image loading fails', async () => {
      const origCreateImageBitmap = global.createImageBitmap;
      delete (global as any).createImageBitmap;

      const origRevoke = URL.revokeObjectURL;
      const origCreate = URL.createObjectURL;
      URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
      URL.revokeObjectURL = vi.fn();

      const origImage = global.Image;
      class MockBrokenImage {
        onload: any = null;
        onerror: any = null;
        set src(_v: string) {
          setTimeout(() => {
            if (this.onerror) this.onerror(new Error('Decode error'));
          }, 0);
        }
      }
      (global as any).Image = MockBrokenImage;

      await expect(transcodeToPng(new Uint8Array([5, 6, 7]), 'image/custom')).rejects.toThrow(
        'Failed to decode image of type: image/custom'
      );

      (global as any).Image = origImage;
      URL.createObjectURL = origCreate;
      URL.revokeObjectURL = origRevoke;
      global.createImageBitmap = origCreateImageBitmap;
    });

    it('rejects in DOM fallback when canvas 2D context is null', async () => {
      const origCreateImageBitmap = global.createImageBitmap;
      delete (global as any).createImageBitmap;

      const origRevoke = URL.revokeObjectURL;
      const origCreate = URL.createObjectURL;
      URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
      URL.revokeObjectURL = vi.fn();

      const origImage = global.Image;
      class MockImage {
        onload: any = null;
        set src(_v: string) {
          setTimeout(() => { if (this.onload) this.onload(); }, 0);
        }
      }
      (global as any).Image = MockImage;

      const origCreateElement = document.createElement.bind(document);
      const canvasSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'canvas') {
          return {
            width: 0,
            height: 0,
            getContext: vi.fn().mockReturnValue(null),
          } as any;
        }
        return origCreateElement(tag);
      });

      await expect(transcodeToPng(new Uint8Array([1, 2]), 'image/webp')).rejects.toThrow(
        'Canvas 2D context unavailable'
      );

      canvasSpy.mockRestore();
      (global as any).Image = origImage;
      URL.createObjectURL = origCreate;
      URL.revokeObjectURL = origRevoke;
      global.createImageBitmap = origCreateImageBitmap;
    });

    it('rejects in DOM fallback when canvas.toBlob yields null', async () => {
      const origCreateImageBitmap = global.createImageBitmap;
      delete (global as any).createImageBitmap;

      const origRevoke = URL.revokeObjectURL;
      const origCreate = URL.createObjectURL;
      URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
      URL.revokeObjectURL = vi.fn();

      const origImage = global.Image;
      class MockImage {
        onload: any = null;
        set src(_v: string) {
          setTimeout(() => { if (this.onload) this.onload(); }, 0);
        }
      }
      (global as any).Image = MockImage;

      const origCreateElement = document.createElement.bind(document);
      const canvasSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'canvas') {
          return {
            width: 0,
            height: 0,
            getContext: vi.fn().mockReturnValue({ drawImage: vi.fn() }),
            toBlob: (cb: any) => cb(null),
          } as any;
        }
        return origCreateElement(tag);
      });

      await expect(transcodeToPng(new Uint8Array([1, 2]), 'image/webp')).rejects.toThrow(
        'Failed to convert canvas to blob'
      );

      canvasSpy.mockRestore();
      (global as any).Image = origImage;
      URL.createObjectURL = origCreate;
      URL.revokeObjectURL = origRevoke;
      global.createImageBitmap = origCreateImageBitmap;
    });

    it('throws when runtime APIs are unavailable', async () => {
      const origCreateImageBitmap = global.createImageBitmap;
      const origDocument = global.document;
      delete (global as any).createImageBitmap;
      delete (global as any).document;

      await expect(transcodeToPng(new Uint8Array([1, 2]), 'image/webp')).rejects.toThrow(
        'Image transcoding APIs unavailable in current runtime'
      );

      global.createImageBitmap = origCreateImageBitmap;
      global.document = origDocument;
    });
  });
});
