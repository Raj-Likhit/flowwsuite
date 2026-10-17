import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AttendanceControls } from './AttendanceControls';

describe('AttendanceControls', () => {
    it('renders initial total and attended values', () => {
        const onUpdate = vi.fn();
        render(<AttendanceControls totalCount={20} attendedCount={15} onUpdate={onUpdate} />);

        const totalInput = screen.getByLabelText('Total Classes') as HTMLInputElement;
        const attendedInput = screen.getByLabelText('Attended') as HTMLInputElement;

        expect(totalInput.value).toBe('20');
        expect(attendedInput.value).toBe('15');
    });

    it('increments total count when plus button is clicked', () => {
        const onUpdate = vi.fn();
        render(<AttendanceControls totalCount={10} attendedCount={8} onUpdate={onUpdate} />);

        const plusButtons = screen.getAllByRole('button', { name: /Increase total classes/i });
        fireEvent.click(plusButtons[0]);

        expect(onUpdate).toHaveBeenCalledWith(8, 11);
    });

    it('decrements total and clamps attended if attended would exceed new total', () => {
        const onUpdate = vi.fn();
        render(<AttendanceControls totalCount={10} attendedCount={10} onUpdate={onUpdate} />);

        const minusButtons = screen.getAllByRole('button', { name: /Decrease total classes/i });
        fireEvent.click(minusButtons[0]);

        // total becomes 9, so attended clamped to 9
        expect(onUpdate).toHaveBeenCalledWith(9, 9);
    });

    it('increments attended and pushes total if attended exceeds total', () => {
        const onUpdate = vi.fn();
        render(<AttendanceControls totalCount={10} attendedCount={10} onUpdate={onUpdate} />);

        const plusButtons = screen.getAllByRole('button', { name: /Increase attended classes/i });
        fireEvent.click(plusButtons[0]);

        // attended becomes 11, total should also be bumped to 11
        expect(onUpdate).toHaveBeenCalledWith(11, 11);
    });

    it('shows validation warning when user manually types attended > total', () => {
        const onUpdate = vi.fn();
        render(<AttendanceControls totalCount={10} attendedCount={8} onUpdate={onUpdate} />);

        const attendedInput = screen.getByLabelText('Attended') as HTMLInputElement;
        fireEvent.change(attendedInput, { target: { value: '15' } });

        expect(screen.getByText(/Attended cannot exceed total classes/i)).toBeInTheDocument();
    });

    it('clamps attended on blur when user types attended > total', () => {
        const onUpdate = vi.fn();
        render(<AttendanceControls totalCount={10} attendedCount={8} onUpdate={onUpdate} />);

        const attendedInput = screen.getByLabelText('Attended') as HTMLInputElement;
        fireEvent.change(attendedInput, { target: { value: '15' } });
        fireEvent.blur(attendedInput);

        expect(onUpdate).toHaveBeenCalledWith(10, 10);
    });

    it('syncs input values when props change from external updates', () => {
        const onUpdate = vi.fn();
        const { rerender } = render(<AttendanceControls totalCount={10} attendedCount={8} onUpdate={onUpdate} />);

        const totalInput = screen.getByLabelText('Total Classes') as HTMLInputElement;
        expect(totalInput.value).toBe('10');

        rerender(<AttendanceControls totalCount={25} attendedCount={20} onUpdate={onUpdate} />);

        expect(totalInput.value).toBe('25');
        const attendedInput = screen.getByLabelText('Attended') as HTMLInputElement;
        expect(attendedInput.value).toBe('20');
    });

    it('disables controls when readOnly is true', () => {
        const onUpdate = vi.fn();
        render(<AttendanceControls totalCount={10} attendedCount={8} onUpdate={onUpdate} readOnly={true} />);

        const buttons = screen.getAllByRole('button');
        buttons.forEach(btn => {
            expect(btn).toBeDisabled();
        });

        const totalInput = screen.getByLabelText('Total Classes') as HTMLInputElement;
        expect(totalInput).toHaveAttribute('readonly');
    });
});
