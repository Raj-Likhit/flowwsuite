import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PageGrid } from './PageGrid';
import { usePdfStore } from '../../store/usePdfStore';

vi.mock('./PageThumbnail', () => ({
    PageThumbnail: ({ page, pageNumber, isSelected, previewDataUrl, onSelect, onRotateCw, onRotateCcw, onDelete, onEdit }: any) => (
        <div data-testid={`page-thumb-${page.id}`}>
            <span>Page #{pageNumber}</span>
            <span>Selected: {isSelected ? 'yes' : 'no'}</span>
            <span>Preview: {previewDataUrl || 'none'}</span>
            <button onClick={() => onSelect(page.id)}>Select {page.id}</button>
            <button onClick={() => onRotateCw(page.id)}>RotateCw {page.id}</button>
            <button onClick={() => onRotateCcw(page.id)}>RotateCcw {page.id}</button>
            <button onClick={() => onDelete(page.id)}>Delete {page.id}</button>
            <button onClick={() => onEdit(page.id)}>Edit {page.id}</button>
        </div>
    ),
}));

describe('PageGrid', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        usePdfStore.setState({
            pages: [
                { id: 'page-1', sourceId: 'd1', sourceType: 'pdf', originalIndex: 0, rotation: 0, widthPt: 612, heightPt: 792, thumbnailDataUrl: null, currentIndex: 0, isSelected: false, },
                { id: 'page-2', sourceId: 'd1', sourceType: 'pdf', originalIndex: 1, rotation: 0, widthPt: 612, heightPt: 792, thumbnailDataUrl: null, currentIndex: 0, isSelected: false, },
            ],
            overlays: [
                { id: 'ov-1', pageId: 'page-1', fabricJson: '{}', previewDataUrl: 'data:image/png;base64,preview1' } as any,
            ],
            selectedPageIds: new Set(['page-1']),
        });
    });

    it('renders page thumbnails with correct page numbers, selection and preview URLs', () => {
        render(<PageGrid />);

        expect(screen.getByTestId('page-thumb-page-1')).toBeInTheDocument();
        expect(screen.getByTestId('page-thumb-page-2')).toBeInTheDocument();

        expect(screen.getByText('Page #1')).toBeInTheDocument();
        expect(screen.getByText('Page #2')).toBeInTheDocument();

        expect(screen.getByText('Selected: yes')).toBeInTheDocument();
        expect(screen.getByText('Selected: no')).toBeInTheDocument();

        expect(screen.getByText('Preview: data:image/png;base64,preview1')).toBeInTheDocument();
        expect(screen.getByText('Preview: none')).toBeInTheDocument();
    });

    it('handles selection, rotation, deletion, and edit callbacks', () => {
        render(<PageGrid />);

        // Toggle selection
        fireEvent.click(screen.getByText('Select page-2'));
        expect(usePdfStore.getState().selectedPageIds.has('page-2')).toBe(true);

        // Rotate CW
        fireEvent.click(screen.getByText('RotateCw page-1'));
        expect(usePdfStore.getState().pages[0].rotation).toBe(90);

        // Rotate CCW
        fireEvent.click(screen.getByText('RotateCcw page-1'));
        expect(usePdfStore.getState().pages[0].rotation).toBe(0);

        // Edit
        fireEvent.click(screen.getByText('Edit page-1'));
        expect(usePdfStore.getState().activeEditorPageId).toBe('page-1');

        // Delete
        fireEvent.click(screen.getByText('Delete page-2'));
        expect(usePdfStore.getState().pages.map(p => p.id)).toEqual(['page-1']);
    });
});
