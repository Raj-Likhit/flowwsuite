import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePdfExport } from './usePdfExport';
import { usePdfStore } from '../store/usePdfStore';
import { toast } from 'sonner';
import JSZip from 'jszip';
import type { Page, PdfSource } from '../types/pdf.types';

vi.mock('../store/usePdfStore');
vi.mock('sonner');
vi.mock('jszip');

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
        pages: [] as Page[],
        overlays: [],
        sources: [] as PdfSource[],
        metadata: { title: 'Test PDF' },
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(usePdfStore).mockReturnValue(mockState as any);
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
                await result.current.exportPdf({ compression: { enabled: true } });
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
    });
});
