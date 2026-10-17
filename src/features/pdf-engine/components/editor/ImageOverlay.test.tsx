import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ImageOverlay } from './ImageOverlay';

describe('ImageOverlay', () => {
    const mockOnClose = vi.fn();
    const mockOnAddImage = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders initial drop and browse area', () => {
        render(<ImageOverlay onClose={mockOnClose} onAddImage={mockOnAddImage} />);

        expect(screen.getByText('Add Image')).toBeInTheDocument();
        expect(screen.getByText('Drop an image or click to browse')).toBeInTheDocument();
    });

    it('handles file selection via input and adds image to canvas', async () => {
        const { container } = render(<ImageOverlay onClose={mockOnClose} onAddImage={mockOnAddImage} />);

        const input = container.querySelector('input[type="file"]') as HTMLInputElement;
        const file = new File(['fake-png-data'], 'stamp.png', { type: 'image/png' });

        // Mock FileReader
        const originalFileReader = globalThis.FileReader;
        class MockFileReader {
            result = 'data:image/png;base64,samplepng';
            onloadend: any = null;
            readAsDataURL() {
                setTimeout(() => {
                    if (this.onloadend) this.onloadend();
                }, 0);
            }
        }
        (globalThis as any).FileReader = MockFileReader;

        await act(async () => {
            fireEvent.change(input, { target: { files: [file] } });
            await new Promise((r) => setTimeout(r, 10));
        });

        // Image preview now visible
        const preview = screen.getByAltText('Preview') as HTMLImageElement;
        expect(preview).toBeInTheDocument();
        expect(preview.src).toBe('data:image/png;base64,samplepng');

        // Add to canvas
        const addBtn = screen.getByText('Add to Canvas');
        fireEvent.click(addBtn);

        expect(mockOnAddImage).toHaveBeenCalledWith('data:image/png;base64,samplepng');
        expect(mockOnClose).toHaveBeenCalledTimes(1);

        (globalThis as any).FileReader = originalFileReader;
    });

    it('allows changing image by clearing preview', async () => {
        render(<ImageOverlay onClose={mockOnClose} onAddImage={mockOnAddImage} />);

        const input = screen.getByLabelText('Select image file') as HTMLInputElement;
        const file = new File(['fake-png-data'], 'stamp.png', { type: 'image/png' });

        const originalFileReader = globalThis.FileReader;
        class MockFileReader {
            result = 'data:image/png;base64,samplepng';
            onloadend: any = null;
            readAsDataURL() {
                setTimeout(() => {
                    if (this.onloadend) this.onloadend();
                }, 0);
            }
        }
        (globalThis as any).FileReader = MockFileReader;

        await act(async () => {
            fireEvent.change(input, { target: { files: [file] } });
            await new Promise((r) => setTimeout(r, 10));
        });

        expect(screen.getByText('Change')).toBeInTheDocument();
        fireEvent.click(screen.getByText('Change'));

        expect(screen.queryByAltText('Preview')).not.toBeInTheDocument();
        expect(screen.getByText('Drop an image or click to browse')).toBeInTheDocument();

        (globalThis as any).FileReader = originalFileReader;
    });

    it('handles drag over, drag leave, and drop events', async () => {
        render(<ImageOverlay onClose={mockOnClose} onAddImage={mockOnAddImage} />);

        const dropArea = screen.getByText('Drop an image or click to browse').closest('div')!;

        // Drag over
        fireEvent.dragOver(dropArea);
        expect(dropArea.className).toContain('border-primary-500');

        // Drag leave
        fireEvent.dragLeave(dropArea);
        expect(dropArea.className).not.toContain('bg-primary-500/5');

        // Drop
        const originalFileReader = globalThis.FileReader;
        class MockFileReader {
            result = 'data:image/jpeg;base64,samplejpg';
            onloadend: any = null;
            readAsDataURL() {
                setTimeout(() => {
                    if (this.onloadend) this.onloadend();
                }, 0);
            }
        }
        (globalThis as any).FileReader = MockFileReader;

        const file = new File(['jpg-data'], 'photo.jpg', { type: 'image/jpeg' });
        await act(async () => {
            fireEvent.drop(dropArea, { dataTransfer: { files: [file] } });
            await new Promise((r) => setTimeout(r, 10));
        });

        expect(screen.getByAltText('Preview')).toBeInTheDocument();

        (globalThis as any).FileReader = originalFileReader;
    });

    it('handles close button', () => {
        render(<ImageOverlay onClose={mockOnClose} onAddImage={mockOnAddImage} />);

        const closeBtn = screen.getByLabelText('Close');
        fireEvent.click(closeBtn);

        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
});
