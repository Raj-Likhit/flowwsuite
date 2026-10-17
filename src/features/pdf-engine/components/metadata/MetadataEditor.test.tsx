import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MetadataEditor } from './MetadataEditor';
import { usePdfStore } from '../../store/usePdfStore';
import { toast } from 'sonner';

vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
    },
}));

describe('MetadataEditor', () => {
    const mockOnClose = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        usePdfStore.setState({
            metadata: {
                title: 'Initial Title',
                author: 'Initial Author',
                subject: 'Initial Subject',
                keywords: 'test, doc',
                creator: 'FlowwSuite PDF Engine',
            },
        });
    });

    it('renders all fields with existing metadata values', () => {
        render(<MetadataEditor onClose={mockOnClose} />);

        expect(screen.getByText('Document Metadata')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Initial Title')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Initial Author')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Initial Subject')).toBeInTheDocument();
        expect(screen.getByDisplayValue('test, doc')).toBeInTheDocument();
        expect(screen.getByDisplayValue('FlowwSuite PDF Engine')).toBeInTheDocument();
    });

    it('updates local state and saves to store on Save click', () => {
        render(<MetadataEditor onClose={mockOnClose} />);

        const titleInput = screen.getByDisplayValue('Initial Title');
        fireEvent.change(titleInput, { target: { value: 'Updated Title' } });

        const authorInput = screen.getByDisplayValue('Initial Author');
        fireEvent.change(authorInput, { target: { value: 'Updated Author' } });

        const saveBtn = screen.getByText('Save');
        fireEvent.click(saveBtn);

        expect(usePdfStore.getState().metadata.title).toBe('Updated Title');
        expect(usePdfStore.getState().metadata.author).toBe('Updated Author');
        expect(toast.success).toHaveBeenCalledWith('Metadata saved — will be applied on export');
        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('closes on Close (X) or Cancel click', () => {
        const { unmount } = render(<MetadataEditor onClose={mockOnClose} />);

        const closeBtn = screen.getByLabelText('Close');
        fireEvent.click(closeBtn);
        expect(mockOnClose).toHaveBeenCalledTimes(1);

        unmount();
        render(<MetadataEditor onClose={mockOnClose} />);

        const cancelBtn = screen.getByText('Cancel');
        fireEvent.click(cancelBtn);
        expect(mockOnClose).toHaveBeenCalledTimes(2);
    });
});
