import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatCard } from './StatCard';
import { Users } from 'lucide-react';

describe('StatCard', () => {
    it('renders label, value, trend, and icon correctly', () => {
        render(
            <StatCard
                label="Total Users"
                value={42}
                icon={<Users data-testid="user-icon" size={18} />}
                trend="+12%"
            />
        );

        expect(screen.getByText('42')).toBeInTheDocument();
        expect(screen.getByText('Total Users')).toBeInTheDocument();
        expect(screen.getByText('+12%')).toBeInTheDocument();
        expect(screen.getByTestId('user-icon')).toBeInTheDocument();
    });

    it('renders with warning styling when warning prop is true', () => {
        const { container } = render(
            <StatCard
                label="Flagged Content"
                value="5 Action Reqd"
                icon={<Users size={18} />}
                trend="Warning"
                warning={true}
            />
        );

        expect(screen.getByText('5 Action Reqd')).toBeInTheDocument();
        expect(screen.getByText('Warning')).toBeInTheDocument();
        // check presence of orange styling classes
        expect(container.innerHTML).toContain('text-orange-400');
    });
});
