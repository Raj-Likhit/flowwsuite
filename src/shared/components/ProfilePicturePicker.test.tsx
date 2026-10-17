import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
    default: () => <div data-testid="mock-cropper">Cropper</div>,
}));

vi.mock('./ui/reactbits/GlassSurface', () => ({
    default: ({ children }: any) => <div data-testid="mock-glass-surface">{children}</div>,
}));

describe('ProfilePicturePicker', () => {
    beforeEach(() => {
        vi.clearAllMocks();
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

        // Create a fake 3MB file
        const largeFile = new File(['x'.repeat(100)], 'huge.png', { type: 'image/png' });
        Object.defineProperty(largeFile, 'size', { value: 3 * 1024 * 1024 });

        fireEvent.change(input, { target: { files: [largeFile] } });

        expect(toast.error).toHaveBeenCalledWith(
            expect.stringMatching(/exceeds 2MB limit/i)
        );
    });
});
