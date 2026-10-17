import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AnnouncementModal } from './AnnouncementModal';
import type { Announcement } from '../types/announcement.types';

describe('AnnouncementModal', () => {
    const mockAnnouncement: Announcement = {
        id: 'ann-1',
        content: 'System will undergo maintenance at midnight.',
        created_at: '2026-10-17T12:00:00Z',
        is_active: true,
    };

    it('returns null when announcement is null', () => {
        const { container } = render(<AnnouncementModal announcement={null} onClose={vi.fn()} />);
        expect(container.firstChild).toBeNull();
    });

    it('renders announcement details with formatted timestamp and handles click on backdrop & button', () => {
        const handleClose = vi.fn();
        const { container } = render(<AnnouncementModal announcement={mockAnnouncement} onClose={handleClose} />);

        expect(screen.getByText('System Update')).toBeInTheDocument();
        expect(screen.getByText('System will undergo maintenance at midnight.')).toBeInTheDocument();
        expect(screen.getByText(/transmission received/i)).toBeInTheDocument();

        // Click acknowledged button
        const ackBtn = screen.getByRole('button', { name: /acknowledged/i });
        fireEvent.click(ackBtn);
        expect(handleClose).toHaveBeenCalledTimes(1);

        // Click backdrop
        const backdrop = container.querySelector('.bg-black\\/60');
        if (backdrop) {
            fireEvent.click(backdrop);
            expect(handleClose).toHaveBeenCalledTimes(2);
        }
    });

    it('renders without timestamp if created_at is omitted', () => {
        const announcementNoDate: Announcement = {
            id: 'ann-2',
            content: 'Notice content without timestamp',
            is_active: true,
        };

        render(<AnnouncementModal announcement={announcementNoDate} onClose={vi.fn()} />);
        expect(screen.getByText('Notice content without timestamp')).toBeInTheDocument();
        expect(screen.queryByText(/transmission received/i)).not.toBeInTheDocument();
    });
});
