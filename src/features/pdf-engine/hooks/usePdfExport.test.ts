import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePdfExport } from './usePdfExport';
import { usePdfStore } from '../store/usePdfStore';
import { toast } from 'sonner';
import JSZip from 'jszip';
import type { PdfPage, PdfSource } from '../types/pdf.types';

vi.mock('../store/usePdfStore');
vi.mock('sonner');
vi.mock('jszip');
vi.mock('../utils/pdfLoader', () => ({
    loadPdfDocument: vi.fn(),
    renderPageToImageBitmap: vi.fn(),
    destroyPdfDocument: vi.fn(),
}));

const mockWorker = {
    postMessage: vi.fn(),
    onmessage: null as any,
    onerror: null as any,
    terminate: vi.fn(),
};

class MockWorker {
    postMessage = mockWorker.postMessage;
    terminate = mockWorker.terminate;
    
    get onmessage() { return mockWorker.onmessage; }
    set onmessage(fn: any) { mockWorker.onmessage = fn; }
    
    get onerror() { return mockWorker.onerror; }
    set onerror(fn: any) { mockWorker.onerror = fn; }

    constructor() {
        mockWorker.onmessage = null;
        mockWorker.onerror = null;
    }
}

global.Worker = MockWorker as any;

class MockOffscreenCanvas {
    width: number;
    height: number;
    constructor(w: number, h: number) {
        this.width = w;
        this.height = h;
    }
    getContext = vi.fn().mockReturnValue({
        fillStyle: '',
        fillRect: vi.fn(),
    });
    convertToBlob = vi.fn().mockResolvedValue(new Blob(['test']));
}
global.OffscreenCanvas = MockOffscreenCanvas as any;
global.FileReader = class {
    onloadend: any = null;
    result = 'data:image/jpeg;base64,testdata';
    readAsDataURL() {
        setTimeout(() => this.onloadend && this.onloadend(), 0);
    }
} as any;

describe('usePdfExport', () => {
    const mockState = {
        pages: [] as PdfPage[],
        overlays: [] as any[],
        sources: [] as PdfSource[],
        metadata: { title: 'Test PDF' },
    };

    beforeEach(() => {
        vi.mocked(usePdfStore).mockImplementation(((selector?: (state: typeof mockState) => unknown) => {
            return typeof selector === 'function' ? selector(mockState) : mockState;
        }) as any);
        mockWorker.postMessage.mockClear();
        mockWorker.onmessage = null;
        mockWorker.onerror = null;

        // Mock URL.createObjectURL and URL.revokeObjectURL
        global.URL.createObjectURL = vi.fn().mockReturnValue('blob:test-url');
        global.URL.revokeObjectURL = vi.fn();
    });

    describe('exportPdf', () => {
        it('should show error toast if no pages to export', async () => {
            const { result } = renderHook(() => usePdfExport());
            
            await act(async () => {
                await result.current.exportPdf();
            });

            expect(toast.error).toHaveBeenCalledWith('No pages to export.');
            expect(result.current.isExporting).toBe(false);
        });

        it('should show error toast if compression enabled but missing thumbnails', async () => {
            mockState.pages = [
                { id: 'page1', sourceType: 'pdf', thumbnailDataUrl: null } as any
            ];
            
            const { result } = renderHook(() => usePdfExport());
            
            await act(async () => {
                await result.current.exportPdf({ compression: { enabled: true, imageQuality: 0.8, maxDimensionPx: 2000 } });
            });

            expect(toast.error).toHaveBeenCalledWith('Some pages are still rendering. Try compressed export again in a moment.');
        });

        it('should export successfully', async () => {
            mockState.pages = [
                { id: 'page1', sourceId: 'src1', sourceType: 'pdf', originalIndex: 0, widthPt: 100, heightPt: 100 } as any
            ];
            mockState.sources = [
                { id: 'src1', type: 'pdf', arrayBuffer: new ArrayBuffer(10) } as any
            ];

            const { result } = renderHook(() => usePdfExport());

            let exportPromise: Promise<void>;
            act(() => {
                exportPromise = result.current.exportPdf();
            });

            expect(result.current.isExporting).toBe(true);
            
            // Simulate worker response
            act(() => {
                if (mockWorker.onmessage) {
                    mockWorker.onmessage({ data: { type: 'COMPILE_DONE', pdfBytes: new Uint8Array([1, 2, 3]) } } as any);
                }
            });

            await act(async () => {
                await exportPromise;
            });

            expect(toast.success).toHaveBeenCalled();
            expect(global.URL.createObjectURL).toHaveBeenCalled();
            expect(result.current.isExporting).toBe(false);
        });

        it('should handle worker error', async () => {
            mockState.pages = [
                { id: 'page1', sourceId: 'src1', sourceType: 'pdf', originalIndex: 0, widthPt: 100, heightPt: 100 } as any
            ];
            mockState.sources = [
                { id: 'src1', type: 'pdf', arrayBuffer: new ArrayBuffer(10) } as any
            ];

            const { result } = renderHook(() => usePdfExport());

            let exportPromise: Promise<void>;
            act(() => {
                exportPromise = result.current.exportPdf();
            });

            // Simulate worker error
            act(() => {
                if (mockWorker.onerror) {
                    mockWorker.onerror(new Error('Worker error') as any);
                }
            });

            await act(async () => {
                await exportPromise;
            });

            expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Export failed'), expect.any(Object));
            expect(result.current.isExporting).toBe(false);
        });
    });

    describe('exportAsJpegZip', () => {
        it('should show error toast if no pages to export', async () => {
            mockState.pages = [];
            const { result } = renderHook(() => usePdfExport());
            
            await act(async () => {
                await result.current.exportAsJpegZip();
            });

            expect(toast.error).toHaveBeenCalledWith('No pages to export.');
        });

        it('should show error toast if missing thumbnails', async () => {
            mockState.pages = [
                { id: 'page1', sourceType: 'pdf', thumbnailDataUrl: null } as any
            ];
            
            const { result } = renderHook(() => usePdfExport());
            
            await act(async () => {
                await result.current.exportAsJpegZip();
            });

            expect(toast.error).toHaveBeenCalledWith('Some pages are still rendering. Try again in a moment.');
        });

        it('should export jpeg zip successfully', async () => {
            mockState.pages = [
                { id: 'page1', sourceType: 'pdf', thumbnailDataUrl: 'data:image/jpeg;base64,testdata', widthPt: 100, heightPt: 100 } as any
            ];

            const mockZipFile = vi.fn();
            const mockZipGenerateAsync = vi.fn().mockResolvedValue(new Blob(['test']));
            vi.mocked(JSZip).mockImplementation(class {
                file = mockZipFile;
                generateAsync = mockZipGenerateAsync;
            } as any);

            const { result } = renderHook(() => usePdfExport());

            await act(async () => {
                await result.current.exportAsJpegZip();
            });

            expect(mockZipFile).toHaveBeenCalledWith('page-001.jpg', 'testdata', { base64: true });
            expect(mockZipGenerateAsync).toHaveBeenCalled();
            expect(toast.success).toHaveBeenCalledWith('JPEG ZIP exported.', expect.any(Object));
        });

        it('should handle export error', async () => {
            mockState.pages = [
                { id: 'page1', sourceType: 'pdf', thumbnailDataUrl: 'data:image/jpeg;base64,testdata', widthPt: 100, heightPt: 100 } as any
            ];

            vi.mocked(JSZip).mockImplementation(class {
                file = vi.fn();
                generateAsync = vi.fn().mockRejectedValue(new Error('Zip failed'));
            } as any);

            const { result } = renderHook(() => usePdfExport());

            await act(async () => {
                await result.current.exportAsJpegZip();
            });

            expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('JPEG ZIP export failed'), expect.any(Object));
        });

        it('should use overlay.previewDataUrl over thumbnailDataUrl when available in JPEG ZIP', async () => {
            mockState.pages = [
                { id: 'page1', sourceType: 'pdf', thumbnailDataUrl: 'data:image/jpeg;base64,rawthumbnail', widthPt: 100, heightPt: 100 } as any
            ];
            mockState.overlays = [
                { pageId: 'page1', fabricJson: {}, previewDataUrl: 'data:image/jpeg;base64,annotatedpreview' } as any
            ];

            const mockZipFile = vi.fn();
            const mockZipGenerateAsync = vi.fn().mockResolvedValue(new Blob(['test']));
            vi.mocked(JSZip).mockImplementation(class {
                file = mockZipFile;
                generateAsync = mockZipGenerateAsync;
            } as any);

            const { result } = renderHook(() => usePdfExport());

            await act(async () => {
                await result.current.exportAsJpegZip();
            });

            expect(mockZipFile).toHaveBeenCalledWith('page-001.jpg', 'annotatedpreview', { base64: true });
        });
    });

    describe('worker lifecycle', () => {
        it('should terminate compile worker on unmount', async () => {
            mockState.pages = [
                { id: 'page1', sourceId: 'src1', sourceType: 'pdf', originalIndex: 0, widthPt: 100, heightPt: 100 } as any
            ];
            mockState.sources = [
                { id: 'src1', type: 'pdf', arrayBuffer: new ArrayBuffer(10) } as any
            ];

            const { result, unmount } = renderHook(() => usePdfExport());

            let exportPromise: Promise<void>;
            act(() => {
                exportPromise = result.current.exportPdf();
            });

            act(() => {
                if (mockWorker.onmessage) {
                    mockWorker.onmessage({ data: { type: 'COMPILE_DONE', pdfBytes: new Uint8Array([1, 2, 3]) } } as any);
                }
            });

            await act(async () => {
                await exportPromise;
            });

            unmount();
            expect(mockWorker.terminate).toHaveBeenCalled();
        });
    });

    describe('advanced export options & fallbacks', () => {
        it('supports web share API when intent is share', async () => {
            const shareMock = vi.fn().mockResolvedValue(undefined);
            const canShareMock = vi.fn().mockReturnValue(true);
            Object.assign(navigator, {
                share: shareMock,
                canShare: canShareMock,
            });

            mockState.pages = [
                { id: 'page1', sourceId: 'src1', sourceType: 'pdf', originalIndex: 0, widthPt: 100, heightPt: 100 } as any
            ];
            mockState.sources = [
                { id: 'src1', type: 'pdf', arrayBuffer: new ArrayBuffer(10) } as any
            ];

            const { result } = renderHook(() => usePdfExport());

            let exportPromise: Promise<void>;
            act(() => {
                exportPromise = result.current.exportPdf({ intent: 'share' });
            });

            act(() => {
                if (mockWorker.onmessage) {
                    mockWorker.onmessage({ data: { type: 'COMPILE_DONE', pdfBytes: new Uint8Array([1, 2, 3]) } } as any);
                }
            });

            await act(async () => {
                await exportPromise;
            });

            expect(shareMock).toHaveBeenCalled();
        });

        it('falls back to download when navigator.share throws', async () => {
            const shareMock = vi.fn().mockRejectedValue(new Error('Share error'));
            const canShareMock = vi.fn().mockReturnValue(true);
            Object.assign(navigator, {
                share: shareMock,
                canShare: canShareMock,
            });

            mockState.pages = [
                { id: 'page1', sourceId: 'src1', sourceType: 'pdf', originalIndex: 0, widthPt: 100, heightPt: 100 } as any
            ];
            mockState.sources = [
                { id: 'src1', type: 'pdf', arrayBuffer: new ArrayBuffer(10) } as any
            ];

            const { result } = renderHook(() => usePdfExport());

            let exportPromise: Promise<void>;
            act(() => {
                exportPromise = result.current.exportPdf({ intent: 'share' });
            });

            act(() => {
                if (mockWorker.onmessage) {
                    mockWorker.onmessage({ data: { type: 'COMPILE_DONE', pdfBytes: new Uint8Array([1, 2, 3]) } } as any);
                }
            });

            await act(async () => {
                await exportPromise;
            });

            expect(toast.success).toHaveBeenCalled();
        });

        it('shows compressed export toast when compression is enabled', async () => {
            mockState.pages = [
                { id: 'page1', sourceId: 'src1', sourceType: 'blank', originalIndex: -1, widthPt: 100, heightPt: 100, thumbnailDataUrl: 'data:image/jpeg;base64,thumb' } as any
            ];
            mockState.sources = [];

            const { result } = renderHook(() => usePdfExport());

            let exportPromise: Promise<void>;
            act(() => {
                exportPromise = result.current.exportPdf({ compression: { enabled: true, imageQuality: 0.8, maxDimensionPx: 1000 } });
            });

            act(() => {
                if (mockWorker.onmessage) {
                    mockWorker.onmessage({ data: { type: 'COMPILE_DONE', pdfBytes: new Uint8Array([1, 2, 3]) } } as any);
                }
            });

            await act(async () => {
                await exportPromise;
            });

            expect(toast.success).toHaveBeenCalledWith('Compressed export successful!', expect.any(Object));
        });

        it('handles worker compilation error message and onerror', async () => {
            mockState.pages = [
                { id: 'page1', sourceId: 'src1', sourceType: 'pdf', originalIndex: 0, widthPt: 100, heightPt: 100 } as any
            ];
            mockState.sources = [
                { id: 'src1', type: 'pdf', arrayBuffer: new ArrayBuffer(10) } as any
            ];

            const { result } = renderHook(() => usePdfExport());

            let exportPromise: Promise<void>;
            act(() => {
                exportPromise = result.current.exportPdf();
            });

            act(() => {
                if (mockWorker.onmessage) {
                    mockWorker.onmessage({ data: { type: 'COMPILE_ERROR', error: 'Compile failed' } } as any);
                }
            });

            await act(async () => {
                await exportPromise;
            });

            expect(toast.error).toHaveBeenCalledWith('Export failed: Compile failed', expect.any(Object));

            // Test worker.onerror
            act(() => {
                exportPromise = result.current.exportPdf();
            });

            act(() => {
                if (mockWorker.onerror) {
                    mockWorker.onerror(new Error('Fatal worker crash') as any);
                }
            });

            await act(async () => {
                await exportPromise;
            });

            expect(toast.error).toHaveBeenCalledWith('Export failed: Fatal worker crash', expect.any(Object));
        });

        it('handles blank pages in JPEG ZIP export', async () => {
            mockState.pages = [
                { id: 'blank-page', sourceType: 'blank', widthPt: 200, heightPt: 300 } as any
            ];
            mockState.overlays = [];

            const mockZipFile = vi.fn();
            const mockZipGenerateAsync = vi.fn().mockResolvedValue(new Blob(['test']));
            vi.mocked(JSZip).mockImplementation(class {
                file = mockZipFile;
                generateAsync = mockZipGenerateAsync;
            } as any);

            const { result } = renderHook(() => usePdfExport());

            await act(async () => {
                await result.current.exportAsJpegZip();
            });

            expect(mockZipFile).toHaveBeenCalledWith('page-001.jpg', expect.any(String), { base64: true });
        });

        it('shows warning when some pages fail thumbnail generation in JPEG ZIP', async () => {
            mockState.pages = [
                { id: 'missing-page', sourceId: 'non-existent', sourceType: 'pdf', thumbnailDataUrl: null, widthPt: 200, heightPt: 300 } as any
            ];
            mockState.sources = [];

            const { result } = renderHook(() => usePdfExport());

            await act(async () => {
                await result.current.exportAsJpegZip();
            });

            expect(toast.error).toHaveBeenCalledWith('Some pages are still rendering. Try again in a moment.');
        });
    });
});
