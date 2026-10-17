import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { CanvasEditor } from './CanvasEditor';
import { usePdfStore } from '../../store/usePdfStore';
import { useFabricCanvas } from '../../hooks/useFabricCanvas';
import { usePdfDocument } from '../../hooks/usePdfDocument';
import { toast } from 'sonner';

vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
    },
}));

vi.mock('../../hooks/useFabricCanvas', () => ({
    useFabricCanvas: vi.fn(),
}));

vi.mock('../../hooks/usePdfDocument', () => ({
    usePdfDocument: vi.fn(),
}));

vi.mock('./EditorToolbar', () => ({
    EditorToolbar: ({ orientation, onAddImage, onDeleteSelected }: any) => (
        <div data-testid={`toolbar-${orientation}`}>
            <button onClick={() => onAddImage?.('test-img')}>Add Image ({orientation})</button>
            <button onClick={() => onDeleteSelected?.()}>Delete Selected ({orientation})</button>
        </div>
    ),
}));

describe('CanvasEditor', () => {
    const mockInitCanvas = vi.fn();
    const mockSetBackground = vi.fn();
    const mockAddImage = vi.fn();
    const mockSaveChanges = vi.fn();
    const mockUndo = vi.fn();
    const mockRedo = vi.fn();
    const mockDeleteSelected = vi.fn();
    const mockRenderPageHiRes = vi.fn();

    const samplePages = [
        { id: 'page-1', sourceId: 'doc-1', sourceType: 'pdf', pageNumber: 1, originalIndex: 0, rotation: 0, widthPt: 600, heightPt: 800, thumbnailDataUrl: null, overlays: [] },
        { id: 'page-2', sourceId: 'blank', sourceType: 'blank', pageNumber: 2, originalIndex: -1, rotation: 0, widthPt: 600, heightPt: 800, thumbnailDataUrl: null, overlays: [] },
        { id: 'page-3', sourceId: 'img-1', sourceType: 'image', pageNumber: 3, originalIndex: 0, rotation: 0, widthPt: 600, heightPt: 800, thumbnailDataUrl: 'data:image/png;base64,imgthumb', overlays: [] },
    ];

    beforeEach(() => {
        vi.clearAllMocks();

        usePdfStore.setState({
            pages: samplePages as any,
            activeEditorPageId: 'page-1',
        });

        vi.mocked(useFabricCanvas).mockReturnValue({
            initCanvas: mockInitCanvas,
            setBackground: mockSetBackground,
            addImage: mockAddImage,
            saveChanges: mockSaveChanges,
            isDirty: true,
            lastSavedAt: null,
            undo: mockUndo,
            redo: mockRedo,
            deleteSelected: mockDeleteSelected,
            fabricRef: { current: { calcOffset: vi.fn() } } as any,
        } as any);

        vi.mocked(usePdfDocument).mockReturnValue({
            renderPageHiRes: mockRenderPageHiRes,
        } as any);
    });

    it('renders top bar with page info, navigation, undo, redo, and save buttons', () => {
        render(<CanvasEditor pageId="page-1" />);

        expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
        expect(screen.getByLabelText('Close editor')).toBeInTheDocument();
        expect(screen.getByLabelText('Previous page')).toBeDisabled();
        expect(screen.getByLabelText('Next page')).not.toBeDisabled();
        expect(screen.getByLabelText('Undo')).toBeInTheDocument();
        expect(screen.getByLabelText('Redo')).toBeInTheDocument();
        expect(screen.getByLabelText('Save page changes')).toBeInTheDocument();
    });

    it('handles save changes, undo, and redo interactions', () => {
        render(<CanvasEditor pageId="page-1" />);

        fireEvent.click(screen.getByLabelText('Save page changes'));
        expect(mockSaveChanges).toHaveBeenCalledTimes(1);
        expect(toast.success).toHaveBeenCalledWith('Page changes saved.');

        fireEvent.click(screen.getByLabelText('Undo'));
        expect(mockUndo).toHaveBeenCalledTimes(1);

        fireEvent.click(screen.getByLabelText('Redo'));
        expect(mockRedo).toHaveBeenCalledTimes(1);
    });

    it('saves and closes editor on Back click', () => {
        render(<CanvasEditor pageId="page-1" />);

        fireEvent.click(screen.getByLabelText('Close editor'));
        expect(mockSaveChanges).toHaveBeenCalledTimes(1);
        expect(usePdfStore.getState().activeEditorPageId).toBeNull();
    });

    it('navigates to next page on Next Page click', () => {
        render(<CanvasEditor pageId="page-1" />);

        fireEvent.click(screen.getByLabelText('Next page'));
        expect(mockSaveChanges).toHaveBeenCalledTimes(1);
        expect(usePdfStore.getState().activeEditorPageId).toBe('page-2');
    });

    it('sets white background for blank page without calling renderPageHiRes', async () => {
        render(<CanvasEditor pageId="page-2" />);

        await act(async () => {
            await Promise.resolve();
        });

        expect(mockInitCanvas).toHaveBeenCalled();
        expect(mockSetBackground).toHaveBeenCalledWith(null);
        expect(mockRenderPageHiRes).not.toHaveBeenCalled();
    });

    it('sets image thumbnail data url for image source page', async () => {
        render(<CanvasEditor pageId="page-3" />);

        await act(async () => {
            await Promise.resolve();
        });

        expect(mockInitCanvas).toHaveBeenCalled();
        expect(mockSetBackground).toHaveBeenCalledWith('data:image/png;base64,imgthumb');
        expect(mockRenderPageHiRes).not.toHaveBeenCalled();
    });

    it('renders HiRes bitmap for pdf page and closes bitmap', async () => {
        const mockBitmap = {
            width: 100,
            height: 100,
            close: vi.fn(),
        };
        mockRenderPageHiRes.mockResolvedValue(mockBitmap);

        // Mock OffscreenCanvas
        const originalOffscreenCanvas = (globalThis as any).OffscreenCanvas;
        class MockOffscreenCanvas {
            width = 100;
            height = 100;
            getContext() {
                return {
                    drawImage: vi.fn(),
                };
            }
            convertToBlob() {
                return Promise.resolve(new Blob(['blob'], { type: 'image/jpeg' }));
            }
        }
        (globalThis as any).OffscreenCanvas = MockOffscreenCanvas;

        // Mock FileReader
        const originalFileReader = globalThis.FileReader;
        class MockFileReader {
            result = 'data:image/jpeg;base64,renderedHiRes';
            onloadend: any = null;
            readAsDataURL() {
                setTimeout(() => {
                    if (this.onloadend) this.onloadend();
                }, 0);
            }
        }
        (globalThis as any).FileReader = MockFileReader;

        render(<CanvasEditor pageId="page-1" />);

        await act(async () => {
            await new Promise((r) => setTimeout(r, 20));
        });

        expect(mockRenderPageHiRes).toHaveBeenCalledWith('doc-1', 0, expect.any(Number));
        expect(mockBitmap.close).toHaveBeenCalled();
        expect(mockSetBackground).toHaveBeenCalledWith('data:image/jpeg;base64,renderedHiRes');

        (globalThis as any).OffscreenCanvas = originalOffscreenCanvas;
        (globalThis as any).FileReader = originalFileReader;
    });
});
