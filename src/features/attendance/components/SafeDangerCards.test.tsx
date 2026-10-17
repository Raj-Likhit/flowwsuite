import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SafeDangerCards } from './SafeDangerCards';

// Mock SpotlightCard component
vi.mock('../../../shared/components/ui/reactbits/SpotlightCard', () => ({
    default: ({ children, className }: any) => <div className={className}>{children}</div>
}));

describe('SafeDangerCards', () => {
    it('renders Safe Zone with welcome buffer text for new profile with 0/0 classes', () => {
        render(<SafeDangerCards percentage={0} attendedCount={0} totalCount={0} />);

        expect(screen.getByText(/Safe Zone/i)).toBeInTheDocument();
        expect(screen.getByText(/No classes recorded yet/i)).toBeInTheDocument();
        expect(screen.getByText(/attend classes to build buffer/i)).toBeInTheDocument();
        expect(screen.queryByText(/Danger Zone/i)).not.toBeInTheDocument();
    });

    it('correctly places 74.87% (149/199) in Danger Zone despite display rounding', () => {
        // 149 / 199 = 0.74874... which rounds to 74.9% or 75.0%
        render(<SafeDangerCards percentage={75.0} attendedCount={149} totalCount={199} />);

        expect(screen.getByText(/Danger Zone/i)).toBeInTheDocument();
        expect(screen.getByText(/Recovery Mode/i)).toBeInTheDocument();
        expect(screen.getByText(/1/)).toBeInTheDocument(); // 1 class needed to cross 75%
        expect(screen.queryByText(/Safe Zone/i)).not.toBeInTheDocument();
    });

    it('renders Safe Zone and calculates safe to skip when above 75%', () => {
        // 80 / 100 = 80%. Floor(80 / 0.75 - 100) = Floor(106.66 - 100) = 6
        render(<SafeDangerCards percentage={80} attendedCount={80} totalCount={100} />);

        expect(screen.getByText(/Safe Zone/i)).toBeInTheDocument();
        expect(screen.getByText(/Safe to Skip/i)).toBeInTheDocument();
        expect(screen.getByText('6')).toBeInTheDocument();
    });

    it('renders exact 75% as Safe Zone with 0 safe to miss', () => {
        render(<SafeDangerCards percentage={75} attendedCount={75} totalCount={100} />);

        expect(screen.getByText(/Safe Zone/i)).toBeInTheDocument();
        expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('displays dash when recovery exceeds RECOVERY_CAP (impossible recovery)', () => {
        // 10 attended out of 200 total: needs (0.75 * 200 - 10) / 0.25 = 140 / 0.25 = 560 classes needed
        // 200 + 560 = 760 > 400 RECOVERY_CAP
        render(<SafeDangerCards percentage={5} attendedCount={10} totalCount={200} />);

        expect(screen.getByText(/Danger Zone/i)).toBeInTheDocument();
        expect(screen.getByText('—')).toBeInTheDocument();
        expect(screen.getByText(/Not realistic/i)).toBeInTheDocument();
    });
});
