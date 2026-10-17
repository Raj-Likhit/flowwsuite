import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { PageGridToolbar } from './PageGridToolbar';
import { usePdfStore } from '../../store/usePdfStore';
import { usePdfDocument } from '../../hooks/usePdfDocument';
import { usePdfExport } from '../../hooks/usePdfExport';
import { toast } from 'sonner';

vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

vi.mock('../../hooks/usePdfDocument', () => ({
    usePdfDocument: vi.fn(),
    DEFAULT_PAGE_SIZE: { widthPt: 612, heightPt: 792 },
}));

vi.mock('../../hooks/usePdfExport', () => ({
    usePdfExport: vi.fn(),
}));

describe('PageGridToolbar', () => {
    const mockLoadFile = vi.fn().mockResolvedValue(undefined);
    const mockExportPdf = vi.fn().mockResolvedValue(undefined);

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(usePdfDocument).mockReturnValue({
            loadFile: mockLoadFile,
        } as any);

        vi.mocked(usePdfExport).mockReturnValue({
            exportPdf: mockExportPdf,
            isExporting: false,
        } as any);

        usePdfStore.setState({
            pages: [
                { id: 'p1', sourceId: 'd1', sourceType: 'pdf', originalIndex: 0, rotation: 0, widthPt: 600, heightPt: 800, thumbnailDataUrl: null, currentIndex: 0, isSelected: false, },
                { id: 'p2', sourceId: 'd1', sourceType: 'pdf', originalIndex: 1, rotation: 0, widthPt: 600, heightPt: 800, thumbnailDataUrl: null, currentIndex: 0, isSelected: false, },
            ],
            selectedPageIds: new Set<string>(),
        });
    });

    it('toggles selection between select all and clear selection', () => {
        render(<PageGridToolbar />);

        const selectAllBtn = screen.getByLabelText('Select all pages');
        expect(selectAllBtn).toBeInTheDocument();

        // Click Select All
        fireEvent.click(selectAllBtn);
        expect(usePdfStore.getState().selectedPageIds.size).toBe(2);

        // Click Deselect All
        const deselectBtn = screen.getByLabelText('Deselect all pages');
        expect(screen.getByText('2 selected')).toBeInTheDocument();
        fireEvent.click(deselectBtn);
        expect(usePdfStore.getState().selectedPageIds.size).toBe(0);
    });

    it('extracts selected pages and triggers exportPdf', async () => {
        usePdfStore.setState({
            selectedPageIds: new Set(['p1']),
        });

        render(<PageGridToolbar />);

        const extractBtn = screen.getByLabelText('Extract selected pages');
        expect(extractBtn).not.toBeDisabled();

        await act(async () => {
            fireEvent.click(extractBtn);
        });

        expect(mockExportPdf).toHaveBeenCalledWith({
            pageIds: ['p1'],
            filename: 'flowwsuite-extracted-pages.pdf',
        });
    });

    it('deletes selected pages from store', () => {
        usePdfStore.setState({
            selectedPageIds: new Set(['p1']),
        });

        render(<PageGridToolbar />);

        const deleteBtn = screen.getByLabelText('Delete selected pages');
        expect(deleteBtn).not.toBeDisabled();

        fireEvent.click(deleteBtn);
        expect(usePdfStore.getState().pages.map(p => p.id)).toEqual(['p2']);
        expect(usePdfStore.getState().selectedPageIds.size).toBe(0);
    });

    it('inserts a blank page and notifies with toast', () => {
        render(<PageGridToolbar />);

        const blankBtn = screen.getByLabelText('Insert blank page');
        fireEvent.click(blankBtn);

        expect(usePdfStore.getState().pages).toHaveLength(3);
        expect(usePdfStore.getState().pages[2].sourceId).toBe('blank');
        expect(toast.success).toHaveBeenCalledWith('Blank page added');
    });

    it('handles merging additional files via file input change', async () => {
        render(<PageGridToolbar />);

        const input = document.querySelector('input[type="file"]') as HTMLInputElement;
        expect(input).toBeInTheDocument();

        const file1 = new File(['content1'], 'page1.pdf', { type: 'application/pdf' });
        const file2 = new File(['content2'], 'image.png', { type: 'image/png' });

        await act(async () => {
            fireEvent.change(input, { target: { files: [file1, file2] } });
        });

        expect(mockLoadFile).toHaveBeenCalledWith(file1);
        expect(mockLoadFile).toHaveBeenCalledWith(file2);
    });

    it('prompts confirmation on clear all and resets state if confirmed', () => {
        const confirmSpy = vi.spyOn(window, 'confirm');

        // Case 1: Cancel confirmation
        confirmSpy.mockReturnValueOnce(false);
        render(<PageGridToolbar />);

        const clearBtn = screen.getByLabelText('Clear all pages');
        fireEvent.click(clearBtn);

        expect(confirmSpy).toHaveBeenCalled();
        expect(usePdfStore.getState().pages).toHaveLength(2);

        // Case 2: Accept confirmation
        confirmSpy.mockReturnValueOnce(true);
        fireEvent.click(clearBtn);

        expect(usePdfStore.getState().pages).toHaveLength(0);
        confirmSpy.mockRestore();
    });
});
