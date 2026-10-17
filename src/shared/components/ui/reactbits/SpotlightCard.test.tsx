import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SpotlightCard from './SpotlightCard';

describe('SpotlightCard', () => {
    it('renders children and default classes', () => {
        render(
            <SpotlightCard className="extra-class">
                <div>Spotlight Content</div>
            </SpotlightCard>
        );

        expect(screen.getByText('Spotlight Content')).toBeInTheDocument();
        const card = screen.getByText('Spotlight Content').parentElement;
        expect(card?.className).toContain('card-spotlight');
        expect(card?.className).toContain('extra-class');
    });

    it('updates mouse-x, mouse-y and spotlight-color on mouseMove', () => {
        render(
            <SpotlightCard spotlightColor="rgba(255, 0, 0, 0.5)">
                <div>Interactive Card</div>
            </SpotlightCard>
        );

        const card = screen.getByText('Interactive Card').parentElement as HTMLElement;
        expect(card).toBeInTheDocument();

        // Mock getBoundingClientRect
        card.getBoundingClientRect = () => ({
            left: 50,
            top: 50,
            width: 200,
            height: 100,
            right: 250,
            bottom: 150,
            x: 50,
            y: 50,
            toJSON: () => {},
        });

        fireEvent.mouseMove(card, { clientX: 120, clientY: 90 });

        expect(card.style.getPropertyValue('--mouse-x')).toBe('70px');
        expect(card.style.getPropertyValue('--mouse-y')).toBe('40px');
        expect(card.style.getPropertyValue('--spotlight-color')).toBe('rgba(255, 0, 0, 0.5)');
    });
});
