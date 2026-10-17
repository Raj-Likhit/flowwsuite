import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SignaturePad } from './SignaturePad';
import { SIGNATURES_STORAGE_KEY } from '../../hooks/useSignatureStore';

describe('SignaturePad', () => {
    const mockOnClose = vi.fn();
    const mockOnStamp = vi.fn();

    const mockCtx = {
        fillStyle: '',
        fillRect: vi.fn(),
        strokeStyle: '',
        lineWidth: 1,
        lineCap: '',
        lineJoin: '',
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
        clearRect: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        localStorage.setItem(
            SIGNATURES_STORAGE_KEY,
            JSON.stringify([{ id: 'sig-1', dataUrl: 'data:image/png;base64,storedSig1', createdAt: 1234 }])
        );

        vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(mockCtx as any);
        vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,newSignature');
        HTMLCanvasElement.prototype.setPointerCapture = vi.fn();
        HTMLCanvasElement.prototype.releasePointerCapture = vi.fn();
        HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn().mockReturnValue({
            left: 0,
            top: 0,
            width: 380,
            height: 180,
        });
    });

    it('renders drawing canvas, controls, and saved signatures', () => {
        render(<SignaturePad onClose={mockOnClose} onStamp={mockOnStamp} />);

        expect(screen.getByText('Draw Signature')).toBeInTheDocument();
        expect(screen.getByLabelText('Signature drawing area')).toBeInTheDocument();
        expect(screen.getByText('Clear')).toBeInTheDocument();
        expect(screen.getByText('Save & Stamp')).toBeDisabled(); // Initially empty

        // Saved signature
        const savedSigBtn = screen.getByLabelText('Use saved signature');
        expect(savedSigBtn).toBeInTheDocument();

        fireEvent.click(savedSigBtn);
        expect(mockOnStamp).toHaveBeenCalledWith('data:image/png;base64,storedSig1');
    });

    it('handles drawing on canvas and enables Save & Stamp', () => {
        render(<SignaturePad onClose={mockOnClose} onStamp={mockOnStamp} />);

        const canvas = screen.getByLabelText('Signature drawing area');

        // Pointer down
        fireEvent.pointerDown(canvas, { clientX: 50, clientY: 50, pointerId: 1 });
        // Pointer move
        fireEvent.pointerMove(canvas, { clientX: 60, clientY: 60, pointerId: 1 });
        // Pointer up
        fireEvent.pointerUp(canvas, { clientX: 60, clientY: 60, pointerId: 1 });

        const saveStampBtn = screen.getByText('Save & Stamp');
        expect(saveStampBtn).not.toBeDisabled();

        // Save & Stamp
        fireEvent.click(saveStampBtn);
        expect(mockOnStamp).toHaveBeenCalledWith('data:image/png;base64,newSignature');
        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('clears canvas and disables Save & Stamp button', () => {
        render(<SignaturePad onClose={mockOnClose} onStamp={mockOnStamp} />);

        const canvas = screen.getByLabelText('Signature drawing area');

        fireEvent.pointerDown(canvas, { clientX: 50, clientY: 50, pointerId: 1 });
        expect(screen.getByText('Save & Stamp')).not.toBeDisabled();

        const clearBtn = screen.getByText('Clear');
        fireEvent.click(clearBtn);

        expect(screen.getByText('Save & Stamp')).toBeDisabled();
    });

    it('handles close button click', () => {
        render(<SignaturePad onClose={mockOnClose} onStamp={mockOnStamp} />);

        const closeBtn = screen.getByLabelText('Close');
        fireEvent.click(closeBtn);

        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
});
