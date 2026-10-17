import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ProfileNotes } from './ProfileNotes';
import { useAttendanceStore } from '../store/useAttendanceStore';

const mockUpdate = vi.fn().mockResolvedValue({ success: true });

vi.mock('../repository/profileRepository', () => ({
    createProfileRepository: vi.fn(() => ({
        update: mockUpdate,
    })),
}));

vi.mock('../../../core/lib/supabase', () => ({
    supabase: {},
    isSupabaseAvailable: vi.fn().mockReturnValue(true),
}));

describe('ProfileNotes', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        mockUpdate.mockClear();
        useAttendanceStore.setState({
            activeProfile: {
                id: 'prof-1',
                name: 'Test Student',
                attended: 10,
                total: 12,
                notes: 'Initial notes content',
            },
            updateProfile: vi.fn(),
        });
    });

    afterEach(() => {
        vi.runOnlyPendingTimers();
        vi.useRealTimers();
    });

    it('renders existing notes from active profile', () => {
        render(<ProfileNotes />);
        const textarea = screen.getByLabelText(/Private notes for profile/i) as HTMLTextAreaElement;
        expect(textarea.value).toBe('Initial notes content');
    });

    it('updates text locally and triggers debounce timer for remote update', async () => {
        render(<ProfileNotes />);
        const textarea = screen.getByLabelText(/Private notes for profile/i);

        act(() => {
            fireEvent.change(textarea, { target: { value: 'Updated class memo' } });
        });

        // Local state changed
        expect((textarea as HTMLTextAreaElement).value).toBe('Updated class memo');

        // Before debounce expires, repo.update not yet called
        expect(mockUpdate).not.toHaveBeenCalled();

        // Advance timer past 1200ms debounce
        await act(async () => {
            vi.advanceTimersByTime(1300);
        });

        expect(mockUpdate).toHaveBeenCalledTimes(1);
        expect(mockUpdate).toHaveBeenCalledWith('prof-1', { notes: 'Updated class memo' });
    });

    it('flushes pending notes to repository immediately on blur', async () => {
        render(<ProfileNotes />);
        const textarea = screen.getByLabelText(/Private notes for profile/i);

        act(() => {
            fireEvent.change(textarea, { target: { value: 'Notes before blur' } });
        });
        expect(mockUpdate).not.toHaveBeenCalled();

        // Blur event occurs
        act(() => {
            fireEvent.blur(textarea);
        });

        // Flushed immediately without waiting 1200ms
        expect(mockUpdate).toHaveBeenCalledTimes(1);
        expect(mockUpdate).toHaveBeenCalledWith('prof-1', { notes: 'Notes before blur' });
    });

    it('flushes pending notes on unmount before debounce timer finishes (Issue #28)', async () => {
        const { unmount } = render(<ProfileNotes />);
        const textarea = screen.getByLabelText(/Private notes for profile/i);

        act(() => {
            fireEvent.change(textarea, { target: { value: 'Critical note before page switch' } });
        });
        expect(mockUpdate).not.toHaveBeenCalled();

        // Unmount while debounce is still ticking
        act(() => {
            unmount();
        });

        // Flush must have executed on unmount!
        expect(mockUpdate).toHaveBeenCalledTimes(1);
        expect(mockUpdate).toHaveBeenCalledWith('prof-1', { notes: 'Critical note before page switch' });
    });

    it('copies notes to clipboard when Copy button is clicked', async () => {
        const writeTextMock = vi.fn().mockResolvedValue(undefined);
        Object.assign(navigator, {
            clipboard: {
                writeText: writeTextMock,
            },
        });

        render(<ProfileNotes />);
        const copyBtn = screen.getByRole('button', { name: /copy notes to clipboard/i });
        await act(async () => {
            fireEvent.click(copyBtn);
        });

        expect(writeTextMock).toHaveBeenCalledWith('Initial notes content');
    });

    it('returns null when readOnly is true or activeProfile is null', () => {
        const { container: container1 } = render(<ProfileNotes readOnly={true} />);
        expect(container1.firstChild).toBeNull();

        useAttendanceStore.setState({ activeProfile: null });
        const { container: container2 } = render(<ProfileNotes />);
        expect(container2.firstChild).toBeNull();
    });
});

