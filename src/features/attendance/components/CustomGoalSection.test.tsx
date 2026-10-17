import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CustomGoalSection } from './CustomGoalSection';
import { useAttendanceStore } from '../store/useAttendanceStore';
import { toast } from 'sonner';

vi.mock('sonner', () => ({
    toast: {
        error: vi.fn(),
        info: vi.fn(),
        success: vi.fn(),
    },
}));

vi.mock('../store/useAttendanceStore');

describe('CustomGoalSection', () => {
    let mockUpdateTargetGoal: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockUpdateTargetGoal = vi.fn();
    });

    it('returns null if targetGoal is default 75% or activeProfile is missing', () => {
        vi.mocked(useAttendanceStore).mockImplementation(((selector: any) => {
            const state = {
                activeProfile: { id: 'p1', targetGoal: 75 },
                updateTargetGoal: mockUpdateTargetGoal,
            };
            return typeof selector === 'function' ? selector(state) : state;
        }) as any);

        const { container } = render(
            <CustomGoalSection percentage={80} attendedCount={8} totalCount={10} />
        );
        expect(container.firstChild).toBeNull();
    });

    it('renders custom goal section when goal is non-default (e.g. 85%)', () => {
        vi.mocked(useAttendanceStore).mockImplementation(((selector: any) => {
            const state = {
                activeProfile: { id: 'p1', targetGoal: 85 },
                updateTargetGoal: mockUpdateTargetGoal,
            };
            return typeof selector === 'function' ? selector(state) : state;
        }) as any);

        render(
            <CustomGoalSection percentage={80} attendedCount={8} totalCount={10} />
        );

        expect(screen.getByText('Your Goal')).toBeInTheDocument();
        expect(screen.getByText('85%')).toBeInTheDocument();
    });

    it('toggles expansion when header is clicked', () => {
        vi.mocked(useAttendanceStore).mockImplementation(((selector: any) => {
            const state = {
                activeProfile: { id: 'p1', targetGoal: 85 },
                updateTargetGoal: mockUpdateTargetGoal,
            };
            return typeof selector === 'function' ? selector(state) : state;
        }) as any);

        render(
            <CustomGoalSection percentage={80} attendedCount={8} totalCount={10} />
        );

        const headerBtn = screen.getByRole('button', { name: /your goal/i });
        expect(headerBtn).toHaveAttribute('aria-expanded', 'false');

        fireEvent.click(headerBtn);
        expect(headerBtn).toHaveAttribute('aria-expanded', 'true');
    });

    it('allows editing and saving valid custom goal', () => {
        vi.mocked(useAttendanceStore).mockImplementation(((selector: any) => {
            const state = {
                activeProfile: { id: 'p1', targetGoal: 85 },
                updateTargetGoal: mockUpdateTargetGoal,
            };
            return typeof selector === 'function' ? selector(state) : state;
        }) as any);

        render(
            <CustomGoalSection percentage={80} attendedCount={8} totalCount={10} />
        );

        // Click edit pencil button
        const editBtn = screen.getByRole('button', { name: /edit target goal/i });
        fireEvent.click(editBtn);

        const input = screen.getByDisplayValue('85');
        fireEvent.change(input, { target: { value: '90' } });

        // Save with Enter key
        fireEvent.keyDown(input, { key: 'Enter' });

        expect(mockUpdateTargetGoal).toHaveBeenCalledWith('p1', 90);
        expect(toast.success).toHaveBeenCalledWith('Goal updated to 90%');
    });

    it('rejects invalid goal outside 1-100%', () => {
        vi.mocked(useAttendanceStore).mockImplementation(((selector: any) => {
            const state = {
                activeProfile: { id: 'p1', targetGoal: 85 },
                updateTargetGoal: mockUpdateTargetGoal,
            };
            return typeof selector === 'function' ? selector(state) : state;
        }) as any);

        render(
            <CustomGoalSection percentage={80} attendedCount={8} totalCount={10} />
        );

        const editBtn = screen.getByRole('button', { name: /edit target goal/i });
        fireEvent.click(editBtn);

        const input = screen.getByDisplayValue('85');
        fireEvent.change(input, { target: { value: '150' } });

        fireEvent.keyDown(input, { key: 'Enter' });

        expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/Goal must be between/i));
        expect(mockUpdateTargetGoal).not.toHaveBeenCalled();
    });

    it('informs user when goal is set back to default 75%', () => {
        vi.mocked(useAttendanceStore).mockImplementation(((selector: any) => {
            const state = {
                activeProfile: { id: 'p1', targetGoal: 85 },
                updateTargetGoal: mockUpdateTargetGoal,
            };
            return typeof selector === 'function' ? selector(state) : state;
        }) as any);

        render(
            <CustomGoalSection percentage={80} attendedCount={8} totalCount={10} />
        );

        const editBtn = screen.getByRole('button', { name: /edit target goal/i });
        fireEvent.click(editBtn);

        const input = screen.getByDisplayValue('85');
        fireEvent.change(input, { target: { value: '75' } });

        fireEvent.keyDown(input, { key: 'Enter' });

        expect(toast.info).toHaveBeenCalledWith(expect.stringMatching(/using the main section/i));
        expect(mockUpdateTargetGoal).toHaveBeenCalledWith('p1', 75);
    });

    it('cancels edit on Escape key', () => {
        vi.mocked(useAttendanceStore).mockImplementation(((selector: any) => {
            const state = {
                activeProfile: { id: 'p1', targetGoal: 85 },
                updateTargetGoal: mockUpdateTargetGoal,
            };
            return typeof selector === 'function' ? selector(state) : state;
        }) as any);

        render(
            <CustomGoalSection percentage={80} attendedCount={8} totalCount={10} />
        );

        const editBtn = screen.getByRole('button', { name: /edit target goal/i });
        fireEvent.click(editBtn);

        const input = screen.getByDisplayValue('85');
        fireEvent.change(input, { target: { value: '95' } });

        fireEvent.keyDown(input, { key: 'Escape' });

        expect(mockUpdateTargetGoal).not.toHaveBeenCalled();
    });
});
