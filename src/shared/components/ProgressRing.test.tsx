import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressRing } from './ProgressRing';

describe('ProgressRing', () => {
    it('renders progressbar with high percentage (>80%) and emerald color', () => {
        const { container } = render(<ProgressRing percentage={85} />);

        const progressbar = screen.getByRole('progressbar');
        expect(progressbar).toBeInTheDocument();
        expect(progressbar).toHaveAttribute('aria-valuenow', '85');
        expect(progressbar).toHaveAttribute('aria-valuemin', '0');
        expect(progressbar).toHaveAttribute('aria-valuemax', '100');
        expect(screen.getByText('Attendance')).toBeInTheDocument();

        const circles = container.querySelectorAll('circle');
        expect(circles.length).toBe(2);
        // Second circle is progress circle
        expect(circles[1]).toHaveAttribute('stroke', 'var(--color-emerald)');
    });

    it('renders progressbar with warning percentage (75-80%) and amber color', () => {
        const { container } = render(<ProgressRing percentage={75.5} />);

        const progressbar = screen.getByRole('progressbar');
        expect(progressbar).toHaveAttribute('aria-valuenow', '76');

        const circles = container.querySelectorAll('circle');
        expect(circles[1]).toHaveAttribute('stroke', 'var(--color-amber)');
    });

    it('renders progressbar with danger percentage (<75%) and crimson color', () => {
        const { container } = render(<ProgressRing percentage={60} />);

        const progressbar = screen.getByRole('progressbar');
        expect(progressbar).toHaveAttribute('aria-valuenow', '60');

        const circles = container.querySelectorAll('circle');
        expect(circles[1]).toHaveAttribute('stroke', 'var(--color-crimson)');
    });

    it('clamps negative values to 0 and values over 100 to 100', () => {
        const { rerender } = render(<ProgressRing percentage={-20} />);
        expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');

        rerender(<ProgressRing percentage={150} />);
        expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
    });

    it('applies custom size and strokeWidth', () => {
        const { container } = render(<ProgressRing percentage={80} size={300} strokeWidth={20} />);

        const progressbar = screen.getByRole('progressbar');
        expect(progressbar).toHaveStyle({ width: '300px', height: '300px' });

        const svg = container.querySelector('svg');
        expect(svg).toHaveAttribute('width', '300');
        expect(svg).toHaveAttribute('height', '300');
    });
});
