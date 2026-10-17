import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sanitizeWinAnsiText, compilePdfDocument } from './pdf.compile.worker';
import { PDFDocument } from 'pdf-lib';
import type { CompileWorkerRequest } from '../types/pdf.types';

describe('pdf.compile.worker - Export Fidelity & WinAnsi Sanitization', () => {
  it('preserves clean ASCII text without changes', () => {
    const input = 'Hello World! Standard text 12345.';
    expect(sanitizeWinAnsiText(input)).toBe(input);
  });

  it('replaces curly smart quotes with straight quotes', () => {
    const input = '“Hello” and ‘World’';
    expect(sanitizeWinAnsiText(input)).toBe('"Hello" and \'World\'');
  });

  it('replaces em-dash and en-dash with standard hyphen', () => {
    const input = 'Section A–B — Full Overview';
    expect(sanitizeWinAnsiText(input)).toBe('Section A-B - Full Overview');
  });

  it('replaces bullets, ellipsis, and non-breaking spaces', () => {
    const input = '• Item 1… Next\u00A0Word';
    expect(sanitizeWinAnsiText(input)).toBe('* Item 1... Next Word');
  });

  it('replaces non-WinAnsi unicode symbols with question mark fallback', () => {
    const input = 'Status: ✔ Passed ⚡ High';
    expect(sanitizeWinAnsiText(input)).toBe('Status: ? Passed ? High');
  });
});

describe('compilePdfDocument', () => {
  let samplePdfBytes: Uint8Array;

  beforeEach(async () => {
    const doc = await PDFDocument.create();
    doc.addPage([600, 800]);
    samplePdfBytes = await doc.save();

    (globalThis as any).createImageBitmap = vi.fn().mockResolvedValue({
      width: 100,
      height: 100,
      close: vi.fn(),
    });
    const validJpgBytes = Uint8Array.from(atob('data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA='.split(',')[1]), c => c.charCodeAt(0));

    (globalThis as any).OffscreenCanvas = class {
      width: number;
      height: number;
      constructor(w: number, h: number) {
        this.width = w;
        this.height = h;
      }
      getContext() {
        return {
          fillStyle: '',
          fillRect: vi.fn(),
          drawImage: vi.fn(),
        };
      }
      convertToBlob() {
        return Promise.resolve(new Blob([validJpgBytes], { type: 'image/jpeg' }));
      }
    };
  });

  it('compiles blank pages with metadata', async () => {
    const request: CompileWorkerRequest = {
      type: 'COMPILE_PDF',
      sources: [],
      orderedPages: [
        {
          id: 'p-blank-1',
          sourceId: 'blank',
          sourceType: 'blank',
          originalIndex: -1,
          widthPt: 612,
          heightPt: 792,
          rotation: 0,
        },
      ],
      overlays: [],
      metadata: {
        title: 'Compiled Blank Doc',
        author: 'Antigravity Tester',
        subject: 'Testing',
        keywords: 'test, worker',
        creator: 'FlowwSuite Test',
      },
      exportOptions: {},
    };

    const result = await compilePdfDocument(request);
    expect(result).toBeInstanceOf(Uint8Array);

    const compiled = await PDFDocument.load(result);
    expect(compiled.getPageCount()).toBe(1);
    expect(compiled.getTitle()).toBe('Compiled Blank Doc');
    expect(compiled.getAuthor()).toBe('Antigravity Tester');
    expect(compiled.getSubject()).toBe('Testing');
    expect(compiled.getKeywords()).toBe('test, worker');
    expect(compiled.getCreator()).toBe('FlowwSuite Test');
  });

  it('compiles pages from existing PDF sources and applies overlays', async () => {
    const request: CompileWorkerRequest = {
      type: 'COMPILE_PDF',
      sources: [
        {
          id: 'source-pdf-1',
          name: 'source-pdf-1.pdf',
          type: 'pdf',
          arrayBuffer: samplePdfBytes.buffer as ArrayBuffer,
          mimeType: 'application/pdf',
        },
      ],
      orderedPages: [
        {
          id: 'p-1',
          sourceId: 'source-pdf-1',
          sourceType: 'pdf',
          originalIndex: 0,
          widthPt: 600,
          heightPt: 800,
          rotation: 90,
        },
      ],
      overlays: [
        {
          pageId: 'p-1',
          fabricJson: {
            canvasWidth: 600,
            canvasHeight: 800,
            objects: [
              {
                type: 'textbox',
                left: 100,
                top: 150,
                width: 200,
                height: 50,
                text: 'Smart Quote: “Approved”',
                fill: '#ff0000',
                fontSize: 20,
                lineHeight: 1.2,
                opacity: 0.9,
              },
              {
                type: 'path',
                left: 200,
                top: 300,
                width: 100,
                height: 100,
                stroke: '#00ff00',
                strokeWidth: 2,
                opacity: 0.8,
                path: [
                  ['M', 0, 0],
                  ['L', 50, 50],
                  ['L', 100, 0],
                ],
                pathOffset: { x: 50, y: 25 },
              },
            ],
          },
        },
      ],
      exportOptions: {},
    };

    const result = await compilePdfDocument(request);
    expect(result).toBeInstanceOf(Uint8Array);

    const compiled = await PDFDocument.load(result);
    expect(compiled.getPageCount()).toBe(1);
    expect(compiled.getPage(0).getRotation().angle).toBe(90);
  });

  it('handles image overlay embedding', async () => {
    // 1x1 transparent PNG data url
    const pngDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const request: CompileWorkerRequest = {
      type: 'COMPILE_PDF',
      sources: [],
      orderedPages: [
        {
          id: 'p-img-overlay',
          sourceId: 'blank',
          sourceType: 'blank',
          originalIndex: -1,
          widthPt: 612,
          heightPt: 792,
          rotation: 0,
        },
      ],
      overlays: [
        {
          pageId: 'p-img-overlay',
          fabricJson: {
            canvasWidth: 612,
            canvasHeight: 792,
            objects: [
              {
                type: 'image',
                src: pngDataUrl,
                left: 50,
                top: 50,
                width: 100,
                height: 100,
                opacity: 0.95,
              },
            ],
          },
        },
      ],
      exportOptions: {},
    };

    const result = await compilePdfDocument(request);
    expect(result).toBeInstanceOf(Uint8Array);
  });

  it('handles rasterized page when compression is enabled and rasterBaseDataUrl is provided', async () => {
    const pngDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const request: CompileWorkerRequest = {
      type: 'COMPILE_PDF',
      sources: [],
      orderedPages: [
        {
          id: 'p-rasterized',
          sourceId: 'blank',
          sourceType: 'blank',
          originalIndex: -1,
          widthPt: 612,
          heightPt: 792,
          rotation: 0,
          rasterBaseDataUrl: pngDataUrl,
        },
      ],
      overlays: [],
      exportOptions: {
        compression: {
          enabled: true,
          imageQuality: 0.8, maxDimensionPx: 1000,
        },
      },
    };

    const result = await compilePdfDocument(request);
    expect(result).toBeInstanceOf(Uint8Array);
  });

  it('handles image source page and JPEG overlay', async () => {
    // 1x1 JPEG data url
    const jpgDataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
    const jpgBuffer = Uint8Array.from(atob(jpgDataUrl.split(',')[1]), c => c.charCodeAt(0)).buffer;

    const request: CompileWorkerRequest = {
      type: 'COMPILE_PDF',
      sources: [
        {
          id: 'source-img-1',
          name: 'source-img-1.jpg',
          type: 'image',
          arrayBuffer: jpgBuffer,
          mimeType: 'image/jpeg',
                  },
      ],
      orderedPages: [
        {
          id: 'p-img-src',
          sourceId: 'source-img-1',
          sourceType: 'image',
          originalIndex: 0,
          widthPt: 500,
          heightPt: 500,
          rotation: 0,
        },
      ],
      overlays: [
        {
          pageId: 'p-img-src',
          fabricJson: {
            canvasWidth: 500,
            canvasHeight: 500,
            objects: [
              {
                type: 'image',
                src: jpgDataUrl,
                left: 10,
                top: 10,
                width: 50,
                height: 50,
              },
            ],
          },
        },
      ],
      exportOptions: {},
    };

    const result = await compilePdfDocument(request);
    expect(result).toBeInstanceOf(Uint8Array);
  });

  it('handles worker message event and postMessage response', async () => {
    const postMessageSpy = vi.fn();
    (globalThis as any).postMessage = postMessageSpy;

    const request: CompileWorkerRequest = {
      type: 'COMPILE_PDF',
      sources: [],
      orderedPages: [
        {
          id: 'p-msg-1',
          sourceId: 'blank',
          sourceType: 'blank',
          originalIndex: -1,
          widthPt: 612,
          heightPt: 792,
          rotation: 0,
        },
      ],
      overlays: [],
      exportOptions: {},
    };

    // Trigger onmessage
    await (globalThis as any).onmessage({ data: request });

    expect(postMessageSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'COMPILE_DONE' }),
      expect.any(Array)
    );

    // Trigger error in onmessage
    await (globalThis as any).onmessage({
      data: {
        sources: [],
        orderedPages: [
          {
            id: 'p-missing-src',
            sourceId: 'non-existent-source',
            sourceType: 'pdf',
            originalIndex: 0,
            widthPt: 600,
            heightPt: 800,
            rotation: 0,
          },
        ],
        overlays: [],
      },
    });

    expect(postMessageSpy).toHaveBeenCalledWith({
      type: 'COMPILE_ERROR',
      error: 'Missing source for page export',
    });
  });
});
