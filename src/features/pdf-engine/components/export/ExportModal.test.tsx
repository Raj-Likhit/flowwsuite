import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ExportModal } from './ExportModal';
import { usePdfExport } from '../../hooks/usePdfExport';

vi.mock('../../hooks/usePdfExport', () => ({
    usePdfExport: vi.fn(),
}));

describe('ExportModal', () => {
    const mockExportPdf = vi.fn().mockResolvedValue(undefined);
    const mockExportAsJpegZip = vi.fn().mockResolvedValue(undefined);
    const mockOnClose = vi.fn();
    const mockOnOpenMetadata = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(usePdfExport).mockReturnValue({
            exportPdf: mockExportPdf,
            exportAsJpegZip: mockExportAsJpegZip,
            isExporting: false,
        } as any);
    });

    it('handles standard PDF download export', async () => {
        render(<ExportModal onClose={mockOnClose} onOpenMetadata={mockOnOpenMetadata} />);

        const downloadBtn = screen.getByLabelText('Download as PDF');
        await act(async () => {
            fireEvent.click(downloadBtn);
        });

        expect(mockExportPdf).toHaveBeenCalledWith({ intent: 'download' });
        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('handles web sharing when navigator.share is available', async () => {
        const originalShare = navigator.share;
        const originalCanShare = navigator.canShare;
        Object.defineProperty(navigator, 'share', { value: vi.fn(), configurable: true, writable: true });
        Object.defineProperty(navigator, 'canShare', { value: vi.fn().mockReturnValue(true), configurable: true, writable: true });

        render(<ExportModal onClose={mockOnClose} onOpenMetadata={mockOnOpenMetadata} />);

        const shareBtn = screen.getByLabelText('Share Document');
        expect(shareBtn).toBeInTheDocument();

        await act(async () => {
            fireEvent.click(shareBtn);
        });

        expect(mockExportPdf).toHaveBeenCalledWith({ intent: 'share' });
        expect(mockOnClose).toHaveBeenCalledTimes(1);

        Object.defineProperty(navigator, 'share', { value: originalShare, configurable: true, writable: true });
        Object.defineProperty(navigator, 'canShare', { value: originalCanShare, configurable: true, writable: true });
    });

    it('handles compressed PDF export', async () => {
        render(<ExportModal onClose={mockOnClose} onOpenMetadata={mockOnOpenMetadata} />);

        const compressBtn = screen.getByLabelText('Compress and export PDF');
        await act(async () => {
            fireEvent.click(compressBtn);
        });

        expect(mockExportPdf).toHaveBeenCalledWith(expect.objectContaining({
            intent: 'download',
            compression: expect.objectContaining({ enabled: true }),
        }));
        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('handles JPEG ZIP export', async () => {
        render(<ExportModal onClose={mockOnClose} onOpenMetadata={mockOnOpenMetadata} />);

        const zipBtn = screen.getByLabelText('Export as JPEG ZIP archive');
        await act(async () => {
            fireEvent.click(zipBtn);
        });

        expect(mockExportAsJpegZip).toHaveBeenCalledTimes(1);
        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('opens metadata and handles close button', () => {
        render(<ExportModal onClose={mockOnClose} onOpenMetadata={mockOnOpenMetadata} />);

        const metaBtn = screen.getByText('Edit document metadata →');
        fireEvent.click(metaBtn);
        expect(mockOnOpenMetadata).toHaveBeenCalledTimes(1);

        const closeBtn = screen.getByLabelText('Close');
        fireEvent.click(closeBtn);
        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('renders compiling/compressing indicators and disables buttons when isExporting is true', () => {
        vi.mocked(usePdfExport).mockReturnValue({
            exportPdf: mockExportPdf,
            exportAsJpegZip: mockExportAsJpegZip,
            isExporting: true,
        } as any);

        render(<ExportModal onClose={mockOnClose} onOpenMetadata={mockOnOpenMetadata} />);

        expect(screen.getByText('Compiling...')).toBeInTheDocument();
        expect(screen.getByText('Compressing...')).toBeInTheDocument();
        expect(screen.getByLabelText('Download as PDF')).toBeDisabled();
        expect(screen.getByLabelText('Compress and export PDF')).toBeDisabled();
    });
});
