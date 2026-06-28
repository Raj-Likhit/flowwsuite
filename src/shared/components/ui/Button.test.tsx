import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Button } from './Button';
import React from 'react';

describe('Button component', () => {
    it('renders with children', () => {
        render(<Button>Click Me</Button>);
        expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
    });

    it('applies primary variant classes by default', () => {
        render(<Button>Click Me</Button>);
        const button = screen.getByRole('button', { name: /click me/i });
        expect(button).toHaveClass('bg-primary-500');
    });

    it('applies secondary variant classes when specified', () => {
        render(<Button variant="secondary">Click Me</Button>);
        const button = screen.getByRole('button', { name: /click me/i });
        expect(button).toHaveClass('bg-white/5');
    });

    it('applies size classes', () => {
        render(<Button size="sm">Click Me</Button>);
        const button = screen.getByRole('button', { name: /click me/i });
        expect(button).toHaveClass('px-3 py-1.5');
    });

    it('passes extra props to button', () => {
        render(<Button data-testid="custom-btn" aria-label="test btn">Click Me</Button>);
        expect(screen.getByTestId('custom-btn')).toHaveAttribute('aria-label', 'test btn');
    });

    it('forwards ref', () => {
        const ref = React.createRef<HTMLButtonElement>();
        render(<Button ref={ref}>Click Me</Button>);
        expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });

    it('calls onClick handler', () => {
        const handleClick = vi.fn();
        render(<Button onClick={handleClick}>Click Me</Button>);
        fireEvent.click(screen.getByRole('button', { name: /click me/i }));
        expect(handleClick).toHaveBeenCalledTimes(1);
    });
});
