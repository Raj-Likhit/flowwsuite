import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { usePageThumbnail } from './usePageThumbnail';
import { usePdfStore } from '../store/usePdfStore';
import { usePdfDocument } from './usePdfDocument';
import type { PdfPage } from '../types/pdf.types';

vi.mock('./usePdfDocument', () => ({
    usePdfDocument: vi.fn(),
}));

describe('usePageThumbnail', () => {
    let observerCallback: (entries: any[]) => void;
    let observeMock: any;
    let disconnectMock: any;
    const mockRenderThumbnailOnDemand = vi.fn();

    const samplePage: PdfPage = {
        id: 'page-1',
        sourceId: 'doc-1',
        sourceType: 'pdf',
        originalIndex: 0,
        rotation: 0,
        widthPt: 612,
        heightPt: 792,
        thumbnailDataUrl: null, currentIndex: 0, isSelected: false,
        };

    const TestThumbnailComponent = ({ page }: { page: PdfPage }) => {
        const { cardRef, isRendering } = usePageThumbnail(page);
        return (
            <div ref={cardRef} data-testid="card">
                {isRendering ? 'rendering' : 'idle'}
            </div>
        );
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockRenderThumbnailOnDemand.mockResolvedValue(undefined);
        vi.mocked(usePdfDocument).mockReturnValue({
            renderThumbnailOnDemand: mockRenderThumbnailOnDemand,
        } as any);

        usePdfStore.setState({
            pages: [samplePage],
        });

        observeMock = vi.fn();
        disconnectMock = vi.fn();

        (globalThis as any).IntersectionObserver = class {
            constructor(cb: any) {
                observerCallback = cb;
            }
            observe = observeMock;
            disconnect = disconnectMock;
        };
    });

    afterEach(() => {
        delete (globalThis as any).IntersectionObserver;
    });

    it('does not observe for non-pdf pages', () => {
        const imagePage: PdfPage = { ...samplePage, sourceType: 'image' };
        render(<TestThumbnailComponent page={imagePage} />);

        expect(observeMock).not.toHaveBeenCalled();
        expect(screen.getByText('idle')).toBeInTheDocument();
    });

    it('does not observe if page already has thumbnailDataUrl in store', () => {
        usePdfStore.setState({
            pages: [{ ...samplePage, thumbnailDataUrl: 'data:image/png;base64,abc' }],
        });

        render(<TestThumbnailComponent page={samplePage} />);

        expect(observeMock).not.toHaveBeenCalled();
        expect(screen.getByText('idle')).toBeInTheDocument();
    });

    it('observes card element and triggers thumbnail render when intersecting', async () => {
        render(<TestThumbnailComponent page={samplePage} />);

        expect(observeMock).toHaveBeenCalled();

        // 1. Fire observer with isIntersecting = false -> no action
        act(() => {
            observerCallback([{ isIntersecting: false }]);
        });
        expect(mockRenderThumbnailOnDemand).not.toHaveBeenCalled();

        // 2. Fire observer with isIntersecting = true -> triggers render
        await act(async () => {
            observerCallback([{ isIntersecting: true }]);
        });

        expect(mockRenderThumbnailOnDemand).toHaveBeenCalledWith('doc-1', 'page-1', 0);
        expect(disconnectMock).toHaveBeenCalled();
        expect(screen.getByText('idle')).toBeInTheDocument();
    });

    it('disconnects without rendering if thumbnail completed in store before callback executes', () => {
        render(<TestThumbnailComponent page={samplePage} />);

        expect(observeMock).toHaveBeenCalled();

        // Store already got thumbnail
        usePdfStore.setState({
            pages: [{ ...samplePage, thumbnailDataUrl: 'data:image/png;base64,finished' }],
        });

        act(() => {
            observerCallback([{ isIntersecting: true }]);
        });

        expect(mockRenderThumbnailOnDemand).not.toHaveBeenCalled();
        expect(disconnectMock).toHaveBeenCalled();
    });
});
