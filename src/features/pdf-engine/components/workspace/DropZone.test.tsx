import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { DropZone } from './DropZone';
import { validateFile, MAX_FILE_SIZE_BYTES } from '../../utils/fileValidation';
import { toast } from 'sonner';

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    warning: vi.fn(),
    success: vi.fn(),
  },
}));

describe('DropZone & validateFile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateFile', () => {
    it('accepts valid PDF, JPEG, PNG, and WEBP files', () => {
      const pdf = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const jpg = new File(['content'], 'photo.jpg', { type: 'image/jpeg' });
      const png = new File(['content'], 'logo.png', { type: 'image/png' });
      const webp = new File(['content'], 'image.webp', { type: 'image/webp' });

      expect(validateFile(pdf).valid).toBe(true);
      expect(validateFile(jpg).valid).toBe(true);
      expect(validateFile(png).valid).toBe(true);
      expect(validateFile(webp).valid).toBe(true);
    });

    it('accepts valid files even if file.type is empty by checking extension', () => {
      const pdfNoMime = new File(['content'], 'doc.pdf', { type: '' });
      const pngNoMime = new File(['content'], 'screenshot.png', { type: '' });

      expect(validateFile(pdfNoMime).valid).toBe(true);
      expect(validateFile(pngNoMime).valid).toBe(true);
    });

    it('rejects 0-byte empty files', () => {
      const emptyFile = new File([], 'empty.pdf', { type: 'application/pdf' });
      const result = validateFile(emptyFile);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('empty');
      expect(result.message).toContain('0 bytes');
    });

    it('rejects files larger than 50MB', () => {
      const largeFile = new File(['x'], 'giant.pdf', { type: 'application/pdf' });
      Object.defineProperty(largeFile, 'size', { value: MAX_FILE_SIZE_BYTES + 1024 });

      const result = validateFile(largeFile);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('too_large');
      expect(result.message).toContain('exceeds the 50MB size limit');
    });

    it('rejects unsupported extensions and types', () => {
      const exe = new File(['x'], 'script.exe', { type: 'application/x-msdownload' });
      const txt = new File(['x'], 'notes.txt', { type: 'text/plain' });

      expect(validateFile(exe).valid).toBe(false);
      expect(validateFile(exe).error).toBe('unsupported_type');
      expect(validateFile(txt).valid).toBe(false);
      expect(validateFile(txt).error).toBe('unsupported_type');
    });
  });

  describe('DropZone component', () => {
    it('renders drop zone title and button', () => {
      render(<DropZone onFilesAccepted={vi.fn()} />);

      expect(screen.getByText('Drop PDFs or images here')).toBeInTheDocument();
      expect(screen.getByText('Browse Files')).toBeInTheDocument();
    });

    it('calls onFilesAccepted when valid files are dropped', () => {
      const onFilesAccepted = vi.fn();
      render(<DropZone onFilesAccepted={onFilesAccepted} />);

      const dropZone = screen.getByRole('button', { name: /upload pdf or image files/i });
      const file = new File(['data'], 'test.pdf', { type: 'application/pdf' });

      fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [file],
        },
      });

      expect(onFilesAccepted).toHaveBeenCalledWith([file]);
    });

    it('shows error toast when dropping only invalid files', () => {
      const onFilesAccepted = vi.fn();
      render(<DropZone onFilesAccepted={onFilesAccepted} />);

      const dropZone = screen.getByRole('button', { name: /upload pdf or image files/i });
      const invalidFile = new File(['data'], 'virus.exe', { type: 'application/x-msdownload' });

      fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [invalidFile],
        },
      });

      expect(onFilesAccepted).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalled();
    });

    it('shows generic error toast when dropping multiple invalid files', () => {
      const onFilesAccepted = vi.fn();
      render(<DropZone onFilesAccepted={onFilesAccepted} />);

      const dropZone = screen.getByRole('button', { name: /upload pdf or image files/i });
      const inv1 = new File(['data'], 'file1.exe', { type: 'application/x-msdownload' });
      const inv2 = new File(['data'], 'file2.zip', { type: 'application/zip' });

      fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [inv1, inv2],
        },
      });

      expect(onFilesAccepted).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith('No valid files found. Please upload PDF, JPEG, PNG, or WEBP files under 50MB.');
    });

    it('warns with toast when mixed valid and invalid files are dropped', () => {
      const onFilesAccepted = vi.fn();
      render(<DropZone onFilesAccepted={onFilesAccepted} />);

      const dropZone = screen.getByRole('button', { name: /upload pdf or image files/i });
      const validFile = new File(['pdf-data'], 'doc.pdf', { type: 'application/pdf' });
      const invalidFile = new File(['exe-data'], 'bad.exe', { type: 'application/x-msdownload' });

      fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [validFile, invalidFile],
        },
      });

      expect(onFilesAccepted).toHaveBeenCalledWith([validFile]);
      expect(toast.warning).toHaveBeenCalledWith('Accepted 1 file(s). Skipped 1 invalid file(s).');
    });

    it('handles file selection via file input and drag over/leave states', () => {
      const onFilesAccepted = vi.fn();
      const { container } = render(<DropZone onFilesAccepted={onFilesAccepted} />);

      const dropZone = screen.getByRole('button', { name: /upload pdf or image files/i });

      // Drag over
      fireEvent.dragOver(dropZone);
      expect(dropZone.className).toContain('border-primary-500');

      // Drag leave
      fireEvent.dragLeave(dropZone);
      expect(dropZone.className).not.toContain('bg-primary-500/10 scale-[1.02]');

      // Click on dropzone triggers input click
      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      const clickSpy = vi.spyOn(input, 'click');
      fireEvent.click(dropZone);
      expect(clickSpy).toHaveBeenCalled();

      // Change file input
      const file = new File(['content'], 'upload.pdf', { type: 'application/pdf' });
      fireEvent.change(input, { target: { files: [file] } });
      expect(onFilesAccepted).toHaveBeenCalledWith([file]);
    });
  });
});
