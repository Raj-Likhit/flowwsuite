import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PremiumButton } from './PremiumButton';

describe('PremiumButton', () => {
    it('renders with children and default primary variant and md size', () => {
        render(<PremiumButton>Click Me</PremiumButton>);

        const button = screen.getByRole('button', { name: /click me/i });
        expect(button).toBeInTheDocument();
        expect(button.className).toContain('accent-gradient');
        expect(button.className).toContain('px-6 py-3');
    });

    it('renders secondary variant and sm size', () => {
        render(<PremiumButton variant="secondary" size="sm">Secondary</PremiumButton>);

        const button = screen.getByRole('button', { name: /secondary/i });
        expect(button.className).toContain('glass-tubular');
        expect(button.className).toContain('px-4 py-2');
    });

    it('renders ghost variant and lg size with custom className', () => {
        render(<PremiumButton variant="ghost" size="lg" className="my-custom-class">Ghost</PremiumButton>);

        const button = screen.getByRole('button', { name: /ghost/i });
        expect(button.className).toContain('bg-transparent');
        expect(button.className).toContain('px-8 py-4');
        expect(button.className).toContain('my-custom-class');
    });

    it('handles click events when enabled', () => {
        const handleClick = vi.fn();
        render(<PremiumButton onClick={handleClick}>Action</PremiumButton>);

        fireEvent.click(screen.getByRole('button', { name: /action/i }));
        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('is disabled and prevents click when disabled prop is true', () => {
        const handleClick = vi.fn();
        render(<PremiumButton disabled onClick={handleClick}>Disabled</PremiumButton>);

        const button = screen.getByRole('button', { name: /disabled/i });
        expect(button).toBeDisabled();
        expect(button.className).toContain('disabled:opacity-40');

        fireEvent.click(button);
        expect(handleClick).not.toHaveBeenCalled();
    });
});
