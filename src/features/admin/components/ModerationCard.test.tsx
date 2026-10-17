import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ModerationCard } from './ModerationCard';

describe('ModerationCard', () => {
    it('renders image, name, and triggers onApprove and onReject', () => {
        const onApprove = vi.fn();
        const onReject = vi.fn();

        render(
            <ModerationCard
                id="pfp-1"
                src="https://example.com/pfp.jpg"
                name="JohnDoe"
                onApprove={onApprove}
                onReject={onReject}
            />
        );

        const img = screen.getByAltText('JohnDoe') as HTMLImageElement;
        expect(img).toBeInTheDocument();
        expect(img.src).toBe('https://example.com/pfp.jpg');
        expect(screen.getByText('JohnDoe')).toBeInTheDocument();

        const approveBtn = screen.getByTitle('Approve PFP');
        fireEvent.click(approveBtn);
        expect(onApprove).toHaveBeenCalledWith('pfp-1');

        const rejectBtn = screen.getByTitle('Reject PFP');
        fireEvent.click(rejectBtn);
        expect(onReject).toHaveBeenCalledWith('pfp-1');
    });
});
