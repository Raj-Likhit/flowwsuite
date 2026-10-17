import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProfileCard } from './ProfileCard';
import type { Profile } from '../../store/useAttendanceStore';

describe('ProfileCard', () => {
    const mockProfile: Profile = {
        id: 'p1',
        name: 'David',
        attended: 10,
        total: 12,
        avatar_url: 'https://example.com/david.png',
    };

    it('renders profile card with name and avatar and triggers onSelect on click', () => {
        const onSelect = vi.fn();
        render(<ProfileCard profile={mockProfile} onSelect={onSelect} />);

        expect(screen.getByText('David')).toBeInTheDocument();
        const img = screen.getByAltText('David');
        expect(img).toHaveAttribute('src', 'https://example.com/david.png');

        // Simulate load event
        fireEvent.load(img);
        expect(img.className).toContain('opacity-100');

        // Click card
        fireEvent.click(screen.getByRole('button'));
        expect(onSelect).toHaveBeenCalledWith(mockProfile);
    });

    it('falls back to Dicebear on image error', () => {
        render(<ProfileCard profile={mockProfile} onSelect={vi.fn()} />);

        const img = screen.getByAltText('David');
        fireEvent.error(img);

        expect(img.getAttribute('src')).toContain('dicebear');
    });

    it('renders suspended badge and styles when profile is suspended', () => {
        const suspendedProfile: Profile = {
            ...mockProfile,
            is_suspended: true,
        };

        const { container } = render(<ProfileCard profile={suspendedProfile} onSelect={vi.fn()} />);

        expect(screen.getByText('Suspended')).toBeInTheDocument();
        expect(container.firstChild).toHaveClass('opacity-40');
        expect(container.firstChild).toHaveClass('grayscale');
    });
});
