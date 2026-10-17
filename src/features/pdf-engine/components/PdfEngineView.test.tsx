import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { PdfEngineView } from './PdfEngineView';
import { usePdfStore } from '../store/usePdfStore';
import { usePdfDocument } from '../hooks/usePdfDocument';

vi.mock('../hooks/usePdfDocument', () => ({
    usePdfDocument: vi.fn(),
}));

vi.mock('./workspace/DropZone', () => ({
    DropZone: ({ onFilesAccepted }: any) => (
        <div data-testid="mock-dropzone">
            <button onClick={() => onFilesAccepted([new File(['data'], 'test.pdf')])}>Drop Test File</button>
        </div>
    ),
}));

vi.mock('./workspace/PageGrid', () => ({
    PageGrid: () => <div data-testid="mock-page-grid">Page Grid Area</div>,
}));

vi.mock('./workspace/PageGridToolbar', () => ({
    PageGridToolbar: () => <div data-testid="mock-grid-toolbar">Toolbar Area</div>,
}));

vi.mock('./editor/CanvasEditor', () => ({
    CanvasEditor: ({ pageId }: any) => <div data-testid="mock-canvas-editor">Editing {pageId}</div>,
}));

vi.mock('./export/ExportModal', () => ({
    ExportModal: ({ onClose, onOpenMetadata }: any) => (
        <div data-testid="mock-export-modal">
            <button onClick={onOpenMetadata}>To Metadata</button>
            <button onClick={onClose}>Close Export</button>
        </div>
    ),
}));

vi.mock('./metadata/MetadataEditor', () => ({
    MetadataEditor: ({ onClose }: any) => (
        <div data-testid="mock-metadata-editor">
            <button onClick={onClose}>Close Metadata</button>
        </div>
    ),
}));

vi.mock('framer-motion', async (importOriginal) => {
    const actual = await importOriginal<typeof import('framer-motion')>();
    return {
        ...actual,
        AnimatePresence: ({ children }: any) => <>{children}</>,
    };
});

describe('PdfEngineView', () => {
    const mockLoadFile = vi.fn().mockResolvedValue(undefined);

    const renderWithHelmet = () => {
        return render(
            <HelmetProvider>
                <PdfEngineView />
            </HelmetProvider>
        );
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(usePdfDocument).mockReturnValue({
            loadFile: mockLoadFile,
        } as any);

        usePdfStore.setState({
            pages: [],
            activeEditorPageId: null,
            isLoading: false,
            loadingMessage: '',
        });
    });

    it('renders DropZone when no pages are loaded and handles file drops', async () => {
        renderWithHelmet();

        expect(screen.getByTestId('mock-dropzone')).toBeInTheDocument();
        expect(screen.queryByTestId('mock-page-grid')).not.toBeInTheDocument();

        fireEvent.click(screen.getByText('Drop Test File'));
        expect(mockLoadFile).toHaveBeenCalledWith(expect.any(File));
    });

    it('renders loading overlay with message when isLoading is true', () => {
        usePdfStore.setState({
            isLoading: true,
            loadingMessage: 'Rasterizing document pages...',
        });

        renderWithHelmet();

        expect(screen.getByText('Rasterizing document pages...')).toBeInTheDocument();
    });

    it('renders PageGrid and Toolbar when pages exist and no editor is active', () => {
        usePdfStore.setState({
            pages: [
                { id: 'p1', sourceId: 'd1', sourceType: 'pdf', originalIndex: 0, rotation: 0, widthPt: 600, heightPt: 800, thumbnailDataUrl: null, currentIndex: 0, isSelected: false, },
            ],
            activeEditorPageId: null,
        });

        renderWithHelmet();

        expect(screen.getByTestId('mock-grid-toolbar')).toBeInTheDocument();
        expect(screen.getByTestId('mock-page-grid')).toBeInTheDocument();
        expect(screen.getByText('Export')).toBeInTheDocument();
    });

    it('opens and closes ExportModal and switches to MetadataEditor', async () => {
        usePdfStore.setState({
            pages: [
                { id: 'p1', sourceId: 'd1', sourceType: 'pdf', originalIndex: 0, rotation: 0, widthPt: 600, heightPt: 800, thumbnailDataUrl: null, currentIndex: 0, isSelected: false, },
            ],
        });

        renderWithHelmet();

        fireEvent.click(screen.getByText('Export'));

        // Export modal is lazy loaded
        await act(async () => {
            await Promise.resolve();
        });

        expect(await screen.findByTestId('mock-export-modal')).toBeInTheDocument();

        // Switch to metadata modal
        fireEvent.click(screen.getByText('To Metadata'));

        await act(async () => {
            await Promise.resolve();
        });

        expect(await screen.findByTestId('mock-metadata-editor')).toBeInTheDocument();

        // Close metadata modal
        fireEvent.click(screen.getByText('Close Metadata'));
        expect(screen.queryByTestId('mock-metadata-editor')).not.toBeInTheDocument();
    });

    it('renders CanvasEditor when activeEditorPageId is set', async () => {
        usePdfStore.setState({
            pages: [
                { id: 'p1', sourceId: 'd1', sourceType: 'pdf', originalIndex: 0, rotation: 0, widthPt: 600, heightPt: 800, thumbnailDataUrl: null, currentIndex: 0, isSelected: false, },
            ],
            activeEditorPageId: 'p1',
        });

        renderWithHelmet();

        await act(async () => {
            await Promise.resolve();
        });

        expect(await screen.findByTestId('mock-canvas-editor')).toBeInTheDocument();
        expect(screen.getByText('Editing p1')).toBeInTheDocument();
    });
});
