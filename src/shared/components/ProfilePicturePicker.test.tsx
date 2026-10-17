import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ProfilePicturePicker } from './ProfilePicturePicker';
import { toast } from 'sonner';

vi.mock('sonner', () => ({
    toast: {
        error: vi.fn(),
        success: vi.fn(),
    },
}));

// Mock react-easy-crop
vi.mock('react-easy-crop', () => ({
    default: ({ onCropChange, onCropComplete, onZoomChange }: any) => (
        <div data-testid="mock-cropper">
            <button onClick={() => onCropChange({ x: 10, y: 10 })}>Change Crop</button>
            <button onClick={() => onCropComplete({ x: 0, y: 0, width: 100, height: 100 }, { x: 0, y: 0, width: 100, height: 100 })}>
                Complete Crop
            </button>
            <button onClick={() => onZoomChange(2)}>Change Zoom</button>
        </div>
    ),
}));

vi.mock('./ui/reactbits/GlassSurface', () => ({
    default: ({ children }: any) => <div data-testid="mock-glass-surface">{children}</div>,
}));

describe('ProfilePicturePicker', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Setup FileReader mock
        class MockFileReader {
            result = 'data:image/png;base64,testimagedata';
            onload: any = null;
            addEventListener(event: string, callback: any) {
                if (event === 'load') this.onload = callback;
            }
            readAsDataURL() {
                setTimeout(() => {
                    if (this.onload) this.onload();
                }, 0);
            }
        }
        global.FileReader = MockFileReader as any;

        // Mock canvas and 2d context for getCroppedImg
        const mockContext = {
            drawImage: vi.fn(),
        };
        const mockCanvas = {
            getContext: vi.fn().mockReturnValue(mockContext),
            toBlob: vi.fn((callback) => callback(new Blob(['cropped'], { type: 'image/jpeg' }))),
            width: 0,
            height: 0,
        };
        const origCreateElement = Document.prototype.createElement;
        vi.spyOn(document, 'createElement').mockImplementation(function (this: any, tagName: string, options?: any) {
            if (tagName === 'canvas') return mockCanvas as any;
            return origCreateElement.call(this, tagName, options);
        });

        // Mock Image constructor
        global.Image = class {
            onload: any = null;
            src = '';
            addEventListener(event: string, cb: any) {
                if (event === 'load') setTimeout(cb, 0);
            }
            setAttribute() {}
        } as any;
    });

    it('renders file upload prompt initially', () => {
        render(<ProfilePicturePicker onCropComplete={vi.fn()} onClose={vi.fn()} />);
        expect(screen.getByText(/Select an image or GIF/i)).toBeInTheDocument();
        expect(screen.getByText(/max 2MB/i)).toBeInTheDocument();
    });

    it('rejects files with invalid MIME types and triggers toast error', () => {
        render(<ProfilePicturePicker onCropComplete={vi.fn()} onClose={vi.fn()} />);
        const input = document.querySelector('input[type="file"]') as HTMLInputElement;

        const invalidFile = new File(['<svg></svg>'], 'avatar.svg', { type: 'image/svg+xml' });
        fireEvent.change(input, { target: { files: [invalidFile] } });

        expect(toast.error).toHaveBeenCalledWith(
            expect.stringMatching(/Invalid file type/i)
        );
    });

    it('rejects files exceeding 2MB size limit and triggers toast error', () => {
        render(<ProfilePicturePicker onCropComplete={vi.fn()} onClose={vi.fn()} />);
        const input = document.querySelector('input[type="file"]') as HTMLInputElement;

        const largeFile = new File(['x'.repeat(100)], 'huge.png', { type: 'image/png' });
        Object.defineProperty(largeFile, 'size', { value: 3 * 1024 * 1024 });

        fireEvent.change(input, { target: { files: [largeFile] } });

        expect(toast.error).toHaveBeenCalledWith(
            expect.stringMatching(/exceeds 2MB limit/i)
        );
    });

    it('handles animated GIF upload and bypasses cropping to preserve animation', async () => {
        const onCropComplete = vi.fn();
        render(<ProfilePicturePicker onCropComplete={onCropComplete} onClose={vi.fn()} />);
        const input = document.querySelector('input[type="file"]') as HTMLInputElement;

        const gifFile = new File(['gifdata'], 'avatar.gif', { type: 'image/gif' });
        await act(async () => {
            fireEvent.change(input, { target: { files: [gifFile] } });
            await new Promise((r) => setTimeout(r, 10));
        });

        expect(screen.getByText('Animated GIF Photo')).toBeInTheDocument();
        expect(screen.getByText(/Animated GIF Active/i)).toBeInTheDocument();

        const saveBtn = screen.getByRole('button', { name: /use animated gif/i });
        await act(async () => {
            fireEvent.click(saveBtn);
        });

        expect(onCropComplete).toHaveBeenCalledWith(gifFile);
    });

    it('handles standard image upload, zoom change, crop completion and save picture', async () => {
        const onCropComplete = vi.fn();
        const onClose = vi.fn();
        render(<ProfilePicturePicker onCropComplete={onCropComplete} onClose={onClose} />);
        const input = document.querySelector('input[type="file"]') as HTMLInputElement;

        const pngFile = new File(['pngdata'], 'avatar.png', { type: 'image/png' });
        await act(async () => {
            fireEvent.change(input, { target: { files: [pngFile] } });
            await new Promise((r) => setTimeout(r, 10));
        });

        expect(screen.getByText('Adjust Photo')).toBeInTheDocument();
        expect(screen.getByTestId('mock-cropper')).toBeInTheDocument();

        // Interact with zoom slider
        const zoomSlider = screen.getByRole('slider');
        fireEvent.change(zoomSlider, { target: { value: '2.5' } });
        expect(zoomSlider).toHaveValue('2.5');

        // Interact with mock cropper
        fireEvent.click(screen.getByText('Change Crop'));
        fireEvent.click(screen.getByText('Complete Crop'));

        // Save picture
        const saveBtn = screen.getByRole('button', { name: /save picture/i });
        await act(async () => {
            fireEvent.click(saveBtn);
            await new Promise((r) => setTimeout(r, 10));
        });

        expect(onCropComplete).toHaveBeenCalledWith(expect.any(Blob));

        // Close button
        const closeBtn = screen.getByRole('button', { name: 'Close' });
        fireEvent.click(closeBtn);
        expect(onClose).toHaveBeenCalled();
    });

    it('allows changing selected image back to file selection', async () => {
        render(<ProfilePicturePicker onCropComplete={vi.fn()} onClose={vi.fn()} />);
        const input = document.querySelector('input[type="file"]') as HTMLInputElement;

        const pngFile = new File(['pngdata'], 'avatar.png', { type: 'image/png' });
        await act(async () => {
            fireEvent.change(input, { target: { files: [pngFile] } });
            await new Promise((r) => setTimeout(r, 10));
        });

        const changeBtn = screen.getByRole('button', { name: /^change$/i });
        fireEvent.click(changeBtn);

        expect(screen.getByText(/Select an image or GIF/i)).toBeInTheDocument();
    });
});
