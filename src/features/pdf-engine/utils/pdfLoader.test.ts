import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as pdfjsLib from 'pdfjs-dist';
import { initPdfJs, loadPdfDocument, renderPageToImageBitmap } from './pdfLoader';

// Mock pdfjs-dist
vi.mock('pdfjs-dist', () => {
    return {
        GlobalWorkerOptions: {
            workerSrc: ''
        },
        version: 'mock-version',
        getDocument: vi.fn(),
    };
});

// Mock vite asset URL
vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => {
    return { default: 'mocked-worker-url' };
});

describe('pdfLoader utilities', () => {
    beforeEach(() => {
        pdfjsLib.GlobalWorkerOptions.workerSrc = '';
        vi.clearAllMocks();

        // Polyfill OffscreenCanvas for jsdom
        global.OffscreenCanvas = vi.fn().mockImplementation(function (this: any, width, height) {
            this.width = width;
            this.height = height;
            this.getContext = vi.fn().mockImplementation((type) => {
                if (type === '2d') {
                    return {
                        drawImage: vi.fn(),
                    };
                }
                return null;
            });
            this.transferToImageBitmap = vi.fn().mockReturnValue({});
        }) as any;
    });

    afterEach(() => {
        delete (global as any).OffscreenCanvas;
    });

    describe('initPdfJs', () => {
        it('should set workerSrc if not already set', () => {
            initPdfJs();
            expect(pdfjsLib.GlobalWorkerOptions.workerSrc).toBe('mocked-worker-url');
        });

        it('should not override workerSrc if already set', () => {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'custom-url';
            initPdfJs();
            expect(pdfjsLib.GlobalWorkerOptions.workerSrc).toBe('custom-url');
        });
    });

    describe('loadPdfDocument', () => {
        it('should return PDFDocumentProxy on success', async () => {
            const mockProxy = { numPages: 1 };
            const mockGetDocument = vi.mocked(pdfjsLib.getDocument);
            mockGetDocument.mockReturnValue({ promise: Promise.resolve(mockProxy) } as any);

            const buffer = new ArrayBuffer(8);
            const result = await loadPdfDocument(buffer);

            expect(result).toBe(mockProxy);
            expect(mockGetDocument).toHaveBeenCalledWith(expect.objectContaining({
                data: buffer,
                cMapUrl: 'https://unpkg.com/pdfjs-dist@mock-version/cmaps/',
                cMapPacked: true,
                standardFontDataUrl: 'https://unpkg.com/pdfjs-dist@mock-version/standard_fonts/',
                enableHWA: true,
            }));
        });

        it('should throw PASSWORD_REQUIRED on PasswordException', async () => {
            const mockGetDocument = vi.mocked(pdfjsLib.getDocument);
            const error = new Error('Password required');
            error.name = 'PasswordException';
            mockGetDocument.mockReturnValue({ promise: Promise.reject(error) } as any);

            await expect(loadPdfDocument(new ArrayBuffer(8))).rejects.toThrow('PASSWORD_REQUIRED');
        });

        it('should throw INVALID_PDF on InvalidPDFException', async () => {
            const mockGetDocument = vi.mocked(pdfjsLib.getDocument);
            const error = new Error('Invalid PDF');
            error.name = 'InvalidPDFException';
            mockGetDocument.mockReturnValue({ promise: Promise.reject(error) } as any);

            await expect(loadPdfDocument(new ArrayBuffer(8))).rejects.toThrow('INVALID_PDF');
        });

        it('should throw original error if unrecognized', async () => {
            const mockGetDocument = vi.mocked(pdfjsLib.getDocument);
            const error = new Error('Unknown error');
            mockGetDocument.mockReturnValue({ promise: Promise.reject(error) } as any);

            await expect(loadPdfDocument(new ArrayBuffer(8))).rejects.toThrow('Unknown error');
        });
    });

    describe('renderPageToImageBitmap', () => {
        it('should render page to ImageBitmap', async () => {
            const mockRenderPromise = Promise.resolve();
            const mockViewport = { width: 800, height: 600 };
            const mockPage = {
                getViewport: vi.fn().mockReturnValue(mockViewport),
                render: vi.fn().mockReturnValue({ promise: mockRenderPromise }),
            };
            const mockPdfDoc = {
                getPage: vi.fn().mockResolvedValue(mockPage),
            } as any;

            const result = await renderPageToImageBitmap(mockPdfDoc, 0, 1.5);
            
            expect(mockPdfDoc.getPage).toHaveBeenCalledWith(1); // 1-indexed
            expect(mockPage.getViewport).toHaveBeenCalledWith({ scale: 1.5 });
            expect(mockPage.render).toHaveBeenCalled();
            expect(result).toBeDefined();
        });

        it('should throw if context is null', async () => {
            // Override OffscreenCanvas just for this test
            global.OffscreenCanvas = vi.fn().mockImplementation(function (this: any, width, height) {
                this.width = width;
                this.height = height;
                this.getContext = vi.fn().mockReturnValue(null);
            }) as any;

            const mockPage = {
                getViewport: vi.fn().mockReturnValue({ width: 800, height: 600 }),
            };
            const mockPdfDoc = {
                getPage: vi.fn().mockResolvedValue(mockPage),
            } as any;

            await expect(renderPageToImageBitmap(mockPdfDoc, 0, 1.5))
                .rejects.toThrow('Could not get 2d context from OffscreenCanvas');
        });
    });
});
