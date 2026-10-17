import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePdfDocument } from './usePdfDocument';
import { usePdfStore } from '../store/usePdfStore';
import { toast } from 'sonner';
import * as pdfLoader from '../utils/pdfLoader';

// Mock dependencies
vi.mock('../store/usePdfStore', () => ({
    usePdfStore: Object.assign(
        vi.fn(),
        {
            getState: vi.fn(),
        }
    )
}));
vi.mock('sonner', () => ({
    toast: { error: vi.fn(), success: vi.fn() }
}));
vi.mock('../utils/pdfLoader', () => ({
    initPdfJs: vi.fn(),
    loadPdfDocument: vi.fn(),
    renderPageToImageBitmap: vi.fn(),
    destroyPdfDocument: vi.fn().mockImplementation(async (doc) => {
        if (doc && typeof doc.destroy === 'function') {
            await doc.destroy();
        }
    }),
}));

// Mock browser APIs
const mockGetContext = vi.fn();
const mockConvertToBlob = vi.fn();
const mockCreateImageBitmap = vi.fn();
class MockOffscreenCanvas {
    width: number;
    height: number;
    constructor(w: number, h: number) {
        this.width = w;
        this.height = h;
    }
    getContext = mockGetContext.mockReturnValue({
        fillStyle: '',
        fillRect: vi.fn(),
        drawImage: vi.fn(),
    });
    convertToBlob = mockConvertToBlob.mockResolvedValue({
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(10)),
        type: 'image/jpeg'
    });
}
const mockFileReader = vi.fn();
/*const _mockCrypto = {};*/

describe('usePdfDocument', () => {
    let mockAddSource: any;
    let mockSetPageThumbnail: any;
    let mockSetLoading: any;
    let mockSetError: any;
    let mockSetPages: any;

    beforeEach(() => {
        vi.clearAllMocks();

        mockAddSource = vi.fn();
        mockSetPageThumbnail = vi.fn();
        mockSetLoading = vi.fn();
        mockSetError = vi.fn();
        mockSetPages = vi.fn();

        (usePdfStore as any).mockReturnValue({
            addSource: mockAddSource,
            setPageThumbnail: mockSetPageThumbnail,
            setLoading: mockSetLoading,
            setError: mockSetError,
        });

        (usePdfStore.getState as any).mockReturnValue({
            pages: [],
            sources: [],
            setPages: mockSetPages,
        });

        // Setup global mocks
        global.createImageBitmap = mockCreateImageBitmap as any;
        global.OffscreenCanvas = MockOffscreenCanvas as any;
        vi.spyOn(crypto, 'randomUUID').mockReturnValue(('123e4567-e89b-12d3-a456-426614174000' as any));
        global.FileReader = mockFileReader as any;
        
        if (!File.prototype.arrayBuffer) {
            File.prototype.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(10));
        }

        mockCreateImageBitmap.mockResolvedValue({ width: 800, height: 600, close: vi.fn() });

        mockFileReader.mockImplementation(function (this: any) {
            this.readAsDataURL = function () {
                this.result = 'data:image/jpeg;base64,test';
                if (this.onloadend) this.onloadend();
            };
        });
    });

    it('should reject unsupported file types', async () => {
        const { result } = renderHook(() => usePdfDocument());
        
        const file = new File([''], 'test.txt', { type: 'text/plain' });
        
        await act(async () => {
            await result.current.loadFile(file);
        });

        expect(toast.error).toHaveBeenCalledWith('Unsupported file type. Use PDF, JPG, PNG, or WEBP.');
    });

    it('should load an image file successfully', async () => {
        const { result } = renderHook(() => usePdfDocument());
        
        const file = new File(['image-data'], 'test.png', { type: 'image/png' });
        
        await act(async () => {
            await result.current.loadFile(file);
        });

        expect(mockSetLoading).toHaveBeenCalledWith(true, 'Importing image...');
        expect(mockAddSource).toHaveBeenCalledWith(expect.objectContaining({
            id: ('123e4567-e89b-12d3-a456-426614174000' as any),
            type: 'image',
            name: 'test.png'
        }));
        expect(mockSetPages).toHaveBeenCalled();
        expect(mockSetLoading).toHaveBeenCalledWith(false);
    });

    it('should handle image loading errors gracefully', async () => {
        const { result } = renderHook(() => usePdfDocument());
        
        const file = new File(['image-data'], 'test.png', { type: 'image/png' });
        mockCreateImageBitmap.mockRejectedValueOnce(new Error('Bitmap error'));

        await act(async () => {
            await result.current.loadFile(file);
        });

        expect(mockSetError).toHaveBeenCalledWith('Bitmap error');
        expect(toast.error).toHaveBeenCalledWith('Failed to import image: Bitmap error');
        expect(mockSetLoading).toHaveBeenCalledWith(false);
    });

    it('should load a PDF file successfully', async () => {
        const { result } = renderHook(() => usePdfDocument());
        
        const file = new File(['pdf-data'], 'test.pdf', { type: 'application/pdf' });
        
        const mockPdfDoc = {
            numPages: 2,
            getPage: vi.fn().mockResolvedValue({
                getViewport: () => ({ width: 600, height: 800 }),
                rotate: 0,
            })
        };
        vi.mocked(pdfLoader.loadPdfDocument).mockResolvedValue(mockPdfDoc as any);
        vi.mocked(pdfLoader.renderPageToImageBitmap).mockResolvedValue({ width: 800, height: 600, close: vi.fn() } as any);

        await act(async () => {
            await result.current.loadFile(file);
        });

        expect(mockAddSource).toHaveBeenCalledWith(expect.objectContaining({
            id: ('123e4567-e89b-12d3-a456-426614174000' as any),
            type: 'pdf',
            pageCount: 2
        }));
        expect(mockSetPages).toHaveBeenCalled();
        
        // Wait for render queue to drain
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Render thumbnail jobs
        expect(pdfLoader.loadPdfDocument).toHaveBeenCalled(); // One for initial, plus one for each thumbnail?
        // Wait, the test uses enqueueRender which executes immediately or on microtask
        // I need to ensure it drained
        expect(mockSetPageThumbnail).toHaveBeenCalled();
    });

    it('should handle PDF load errors gracefully (password)', async () => {
        const { result } = renderHook(() => usePdfDocument());
        
        const file = new File(['pdf-data'], 'test.pdf', { type: 'application/pdf' });
        vi.mocked(pdfLoader.loadPdfDocument).mockRejectedValueOnce(new Error('PASSWORD_REQUIRED'));

        await act(async () => {
            await result.current.loadFile(file);
        });

        expect(toast.error).toHaveBeenCalledWith('Password protected PDFs are not yet supported.');
        expect(mockSetError).not.toHaveBeenCalled();
        expect(mockSetLoading).toHaveBeenCalledWith(false);
    });

    it('should handle generic PDF load errors', async () => {
        const { result } = renderHook(() => usePdfDocument());
        
        const file = new File(['pdf-data'], 'test.pdf', { type: 'application/pdf' });
        vi.mocked(pdfLoader.loadPdfDocument).mockRejectedValueOnce(new Error('Generic error'));

        await act(async () => {
            await result.current.loadFile(file);
        });

        expect(toast.error).toHaveBeenCalledWith('Failed to load PDF: Generic error');
        expect(mockSetError).toHaveBeenCalledWith('Generic error');
        expect(mockSetLoading).toHaveBeenCalledWith(false);
    });

    it('should handle thumbnail rendering errors gracefully', async () => {
        const { result } = renderHook(() => usePdfDocument());
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

        const file = new File(['pdf-data'], 'test.pdf', { type: 'application/pdf' });
        
        const mockPdfDoc = {
            numPages: 1,
            getPage: vi.fn().mockResolvedValue({
                getViewport: () => ({ width: 600, height: 800 }),
                rotate: 0,
            })
        };
        
        // First call works (metadata load), second call works (shared doc for renders)
        vi.mocked(pdfLoader.loadPdfDocument)
            .mockResolvedValueOnce(mockPdfDoc as any)
            .mockResolvedValueOnce(mockPdfDoc as any);
        
        // Render thumbnail fails
        vi.mocked(pdfLoader.renderPageToImageBitmap)
            .mockRejectedValueOnce(new Error('Thumbnail fail'));

        await act(async () => {
            await result.current.loadFile(file);
        });

        await new Promise(resolve => setTimeout(resolve, 50));
        
        expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('Thumbnail render failed'), expect.any(Error));
        
        consoleError.mockRestore();
    });

    it('should render hi-res page correctly', async () => {
        const { result } = renderHook(() => usePdfDocument());
        
        (usePdfStore.getState as any).mockReturnValue({
            sources: [{
                id: 'test-source',
                type: 'pdf',
                arrayBuffer: new ArrayBuffer(10)
            }]
        });

        const mockBitmap = { width: 1000, height: 1000 };
        vi.mocked(pdfLoader.renderPageToImageBitmap).mockResolvedValueOnce(mockBitmap as any);
        
        let res: any;
        await act(async () => {
            res = await result.current.renderPageHiRes('test-source', 0, 2);
        });

        expect(res).toBe(mockBitmap);
        expect(pdfLoader.loadPdfDocument).toHaveBeenCalled();
    });

    it('should return null when rendering hi-res page for invalid source', async () => {
        const { result } = renderHook(() => usePdfDocument());
        
        (usePdfStore.getState as any).mockReturnValue({
            sources: []
        });

        let res: any;
        await act(async () => {
            res = await result.current.renderPageHiRes('invalid-source', 0, 2);
        });

        expect(res).toBeNull();
    });

    it('should return null when rendering hi-res page for non-pdf source', async () => {
        const { result } = renderHook(() => usePdfDocument());
        
        (usePdfStore.getState as any).mockReturnValue({
            sources: [{
                id: 'test-source',
                type: 'image',
            }]
        });

        let res: any;
        await act(async () => {
            res = await result.current.renderPageHiRes('test-source', 0, 2);
        });

        expect(res).toBeNull();
    });

    it('should handle rendering hi-res page errors', async () => {
        const { result } = renderHook(() => usePdfDocument());
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

        (usePdfStore.getState as any).mockReturnValue({
            sources: [{
                id: 'test-source',
                type: 'pdf',
                arrayBuffer: new ArrayBuffer(10)
            }]
        });

        vi.mocked(pdfLoader.loadPdfDocument).mockRejectedValueOnce(new Error('Load error'));

        let res: any;
        await act(async () => {
            res = await result.current.renderPageHiRes('test-source', 0, 2);
        });

        expect(res).toBeNull();
        expect(consoleError).toHaveBeenCalled();
        
        consoleError.mockRestore();
    });

    it('should call pdfDoc.destroy() when rendering hi-res page', async () => {
        const { result } = renderHook(() => usePdfDocument());
        const mockDestroy = vi.fn().mockResolvedValue(undefined);

        (usePdfStore.getState as any).mockReturnValue({
            sources: [{
                id: 'test-source',
                type: 'pdf',
                arrayBuffer: new ArrayBuffer(10)
            }]
        });

        const mockPdfDoc = {
            numPages: 1,
            destroy: mockDestroy,
        };
        vi.mocked(pdfLoader.loadPdfDocument).mockResolvedValueOnce(mockPdfDoc as any);
        vi.mocked(pdfLoader.renderPageToImageBitmap).mockResolvedValueOnce({ width: 100, height: 100 } as any);

        await act(async () => {
            await result.current.renderPageHiRes('test-source', 0, 2);
        });

        expect(mockDestroy).toHaveBeenCalledTimes(1);
    });

    it('should call doc.destroy() when lazily rendering thumbnail on demand', async () => {
        const { result } = renderHook(() => usePdfDocument());
        const mockDestroy = vi.fn().mockResolvedValue(undefined);

        (usePdfStore.getState as any).mockReturnValue({
            sources: [{
                id: 'test-source',
                type: 'pdf',
                arrayBuffer: new ArrayBuffer(10)
            }]
        });

        const mockPdfDoc = {
            numPages: 1,
            destroy: mockDestroy,
        };
        vi.mocked(pdfLoader.loadPdfDocument).mockResolvedValueOnce(mockPdfDoc as any);
        vi.mocked(pdfLoader.renderPageToImageBitmap).mockResolvedValueOnce({ width: 100, height: 100, close: vi.fn() } as any);

        await act(async () => {
            await result.current.renderThumbnailOnDemand('test-source', 'page-1', 0);
        });

        expect(mockDestroy).toHaveBeenCalledTimes(1);
    });
});
