import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PageThumbnail } from './PageThumbnail';
import type { PdfPage } from '../../types/pdf.types';
import { usePageThumbnail } from '../../hooks/usePageThumbnail';

vi.mock('@dnd-kit/sortable', () => ({
    useSortable: () => ({
        attributes: {},
        listeners: {},
        setNodeRef: vi.fn(),
        transform: null,
        transition: undefined,
        isDragging: false,
    }),
}));

vi.mock('../../hooks/usePageThumbnail', () => ({
    usePageThumbnail: vi.fn(),
}));

describe('PageThumbnail', () => {
    const mockOnSelect = vi.fn();
    const mockOnRotateCw = vi.fn();
    const mockOnRotateCcw = vi.fn();
    const mockOnDelete = vi.fn();
    const mockOnEdit = vi.fn();

    const samplePage: PdfPage = {
        id: 'p-1',
        sourceId: 'doc-1',
        sourceType: 'pdf',
        originalIndex: 0,
        rotation: 90,
        widthPt: 612,
        heightPt: 792,
        thumbnailDataUrl: 'data:image/png;base64,thumb123',
        currentIndex: 0,
        isSelected: false,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(usePageThumbnail).mockReturnValue({
            cardRef: { current: null },
            isRendering: false,
        });
    });

    it('renders thumbnail image with proper rotation and page number', () => {
        render(
            <PageThumbnail
                page={samplePage}
                pageNumber={1}
                isSelected={false}
                onSelect={mockOnSelect}
                onRotateCw={mockOnRotateCw}
                onRotateCcw={mockOnRotateCcw}
                onDelete={mockOnDelete}
                onEdit={mockOnEdit}
            />
        );

        const img = screen.getByAltText('Page 1') as HTMLImageElement;
        expect(img).toBeInTheDocument();
        expect(img.src).toContain('data:image/png;base64,thumb123');
        expect(img.style.transform).toBe('rotate(90deg)');
        expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('renders blank surface when page is blank source', () => {
        const blankPage: PdfPage = { ...samplePage, sourceId: 'blank' };
        render(
            <PageThumbnail
                page={blankPage}
                pageNumber={2}
                isSelected={false}
                onSelect={mockOnSelect}
                onRotateCw={mockOnRotateCw}
                onRotateCcw={mockOnRotateCcw}
                onDelete={mockOnDelete}
                onEdit={mockOnEdit}
            />
        );

        expect(screen.getByText('Blank')).toBeInTheDocument();
    });

    it('renders loading skeleton and Rendering text when isRendering is true', () => {
        vi.mocked(usePageThumbnail).mockReturnValue({
            cardRef: { current: null },
            isRendering: true,
        });

        const noThumbPage: PdfPage = { ...samplePage, thumbnailDataUrl: null, currentIndex: 0, isSelected: false };
        render(
            <PageThumbnail
                page={noThumbPage}
                pageNumber={3}
                isSelected={false}
                onSelect={mockOnSelect}
                onRotateCw={mockOnRotateCw}
                onRotateCcw={mockOnRotateCcw}
                onDelete={mockOnDelete}
                onEdit={mockOnEdit}
            />
        );

        expect(screen.getByText('Rendering…')).toBeInTheDocument();
    });

    it('handles selection click and reflects selected styling', () => {
        const { rerender } = render(
            <PageThumbnail
                page={samplePage}
                pageNumber={1}
                isSelected={false}
                onSelect={mockOnSelect}
                onRotateCw={mockOnRotateCw}
                onRotateCcw={mockOnRotateCcw}
                onDelete={mockOnDelete}
                onEdit={mockOnEdit}
            />
        );

        const selectBtn = screen.getByLabelText('Select page');
        fireEvent.click(selectBtn);
        expect(mockOnSelect).toHaveBeenCalledWith('p-1');

        rerender(
            <PageThumbnail
                page={samplePage}
                pageNumber={1}
                isSelected={true}
                onSelect={mockOnSelect}
                onRotateCw={mockOnRotateCw}
                onRotateCcw={mockOnRotateCcw}
                onDelete={mockOnDelete}
                onEdit={mockOnEdit}
            />
        );

        expect(screen.getByLabelText('Deselect page')).toBeInTheDocument();
    });

    it('triggers rotate, edit, and delete action buttons', () => {
        render(
            <PageThumbnail
                page={samplePage}
                pageNumber={1}
                isSelected={false}
                onSelect={mockOnSelect}
                onRotateCw={mockOnRotateCw}
                onRotateCcw={mockOnRotateCcw}
                onDelete={mockOnDelete}
                onEdit={mockOnEdit}
            />
        );

        fireEvent.click(screen.getByLabelText('Rotate counter-clockwise'));
        expect(mockOnRotateCcw).toHaveBeenCalledWith('p-1');

        fireEvent.click(screen.getByLabelText('Edit page'));
        expect(mockOnEdit).toHaveBeenCalledWith('p-1');

        fireEvent.click(screen.getByLabelText('Rotate clockwise'));
        expect(mockOnRotateCw).toHaveBeenCalledWith('p-1');

        fireEvent.click(screen.getByLabelText('Delete page'));
        expect(mockOnDelete).toHaveBeenCalledWith('p-1');
    });
});
