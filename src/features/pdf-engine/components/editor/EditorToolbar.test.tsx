import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EditorToolbar } from './EditorToolbar';
import { usePdfStore } from '../../store/usePdfStore';

vi.mock('./SignaturePad', () => ({
    SignaturePad: ({ onClose, onStamp }: any) => (
        <div data-testid="signature-pad-modal">
            <button onClick={() => onStamp('data:image/png;base64,sig123')}>Stamp Sig</button>
            <button onClick={onClose}>Close Sig</button>
        </div>
    ),
}));

vi.mock('./ImageOverlay', () => ({
    ImageOverlay: ({ onClose, onAddImage }: any) => (
        <div data-testid="image-overlay-modal">
            <button onClick={() => onAddImage('data:image/png;base64,img123')}>Add Img</button>
            <button onClick={onClose}>Close Img</button>
        </div>
    ),
}));

describe('EditorToolbar', () => {
    const mockOnAddImage = vi.fn();
    const mockOnStamp = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        usePdfStore.setState({ activeTool: 'select' });
    });

    it('renders tools in vertical orientation and switches active tool', () => {
        render(
            <EditorToolbar
                orientation="vertical"
                onAddImage={mockOnAddImage}
                onStamp={mockOnStamp}
            />
        );

        const textBtn = screen.getByLabelText('Text');
        fireEvent.click(textBtn);
        expect(usePdfStore.getState().activeTool).toBe('text');

        const eraserBtn = screen.getByLabelText('Eraser');
        fireEvent.click(eraserBtn);
        expect(usePdfStore.getState().activeTool).toBe('eraser');
    });

    it('renders tools in horizontal orientation with text labels', () => {
        render(
            <EditorToolbar
                orientation="horizontal"
                onAddImage={mockOnAddImage}
                onStamp={mockOnStamp}
            />
        );

        expect(screen.getByText('Select')).toBeInTheDocument();
        expect(screen.getByText('Text')).toBeInTheDocument();
        expect(screen.getByText('Draw')).toBeInTheDocument();
        expect(screen.getByText('Image')).toBeInTheDocument();
        expect(screen.getByText('Eraser')).toBeInTheDocument();
        expect(screen.getByText('Sign')).toBeInTheDocument();
    });

    it('opens and closes SignaturePad modal and calls onStamp', () => {
        render(
            <EditorToolbar
                orientation="vertical"
                onAddImage={mockOnAddImage}
                onStamp={mockOnStamp}
            />
        );

        const sigBtn = screen.getByLabelText('Add signature');
        fireEvent.click(sigBtn);

        expect(screen.getByTestId('signature-pad-modal')).toBeInTheDocument();

        fireEvent.click(screen.getByText('Stamp Sig'));
        expect(mockOnStamp).toHaveBeenCalledWith('data:image/png;base64,sig123');
        expect(screen.queryByTestId('signature-pad-modal')).not.toBeInTheDocument();

        // Open and close
        fireEvent.click(sigBtn);
        fireEvent.click(screen.getByText('Close Sig'));
        expect(screen.queryByTestId('signature-pad-modal')).not.toBeInTheDocument();
    });

    it('opens and closes ImageOverlay modal, adds image and resets tool to select', () => {
        render(
            <EditorToolbar
                orientation="vertical"
                onAddImage={mockOnAddImage}
                onStamp={mockOnStamp}
            />
        );

        const imageBtn = screen.getByLabelText('Image');
        fireEvent.click(imageBtn);

        expect(screen.getByTestId('image-overlay-modal')).toBeInTheDocument();
        expect(usePdfStore.getState().activeTool).toBe('image');

        fireEvent.click(screen.getByText('Add Img'));
        expect(mockOnAddImage).toHaveBeenCalledWith('data:image/png;base64,img123');
        expect(usePdfStore.getState().activeTool).toBe('select');
        expect(screen.queryByTestId('image-overlay-modal')).not.toBeInTheDocument();

        // Open and close
        fireEvent.click(imageBtn);
        fireEvent.click(screen.getByText('Close Img'));
        expect(screen.queryByTestId('image-overlay-modal')).not.toBeInTheDocument();
    });
});
