import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { AnnouncerBox } from './AnnouncerBox';
import type { AdminProfile } from '../types/admin.types';

describe('AnnouncerBox', () => {
    const mockProfiles: AdminProfile[] = [
        { id: 'prof-1', name: 'Alice', avatar_url: null, attended: 10, total: 10 },
        { id: 'prof-2', name: 'Bob', avatar_url: null, attended: 5, total: 8 },
    ];

    it('renders global broadcast mode and transmits announcement', async () => {
        const onPublish = vi.fn().mockResolvedValue(true);

        render(
            <AnnouncerBox
                allProfiles={mockProfiles}
                isPublishing={false}
                onPublish={onPublish}
            />
        );

        expect(screen.getByText('// GLOBAL BROADCAST')).toBeInTheDocument();
        const textarea = screen.getByPlaceholderText('Message to all users...');
        const transmitBtn = screen.getByText('Transmit');

        // Initially disabled because content is empty
        expect(transmitBtn.closest('button')).toBeDisabled();

        fireEvent.change(textarea, { target: { value: 'Important global notice' } });
        expect(transmitBtn.closest('button')).not.toBeDisabled();

        await act(async () => {
            fireEvent.click(transmitBtn);
        });

        expect(onPublish).toHaveBeenCalledWith(
            'Important global notice',
            'all',
            '',
            expect.any(String) // expiresAt ISO string
        );

        // After success, input is cleared
        expect((textarea as HTMLTextAreaElement).value).toBe('');
    });

    it('handles targeted announcement mode and profile selection', async () => {
        const onPublish = vi.fn().mockResolvedValue(true);

        render(
            <AnnouncerBox
                allProfiles={mockProfiles}
                isPublishing={false}
                onPublish={onPublish}
            />
        );

        // Switch to Targeted
        fireEvent.click(screen.getByText('Targeted'));
        expect(screen.getByText('// TARGETED MESSAGE')).toBeInTheDocument();

        const textarea = screen.getByPlaceholderText('Message for selected user...');
        fireEvent.change(textarea, { target: { value: 'Private direct notice' } });

        const transmitBtn = screen.getByText('Transmit');
        // Still disabled because no profile selected yet
        expect(transmitBtn.closest('button')).toBeDisabled();

        // Select profile
        const selectProfile = screen.getByDisplayValue('Select profile...');
        fireEvent.change(selectProfile, { target: { value: 'prof-2' } });

        expect(transmitBtn.closest('button')).not.toBeDisabled();

        await act(async () => {
            fireEvent.click(transmitBtn);
        });

        expect(onPublish).toHaveBeenCalledWith(
            'Private direct notice',
            'single',
            'prof-2',
            expect.any(String)
        );
    });

    it('supports selecting "No expiry" and displays Sending... when isPublishing is true', async () => {
        const onPublish = vi.fn().mockResolvedValue(true);

        const { rerender } = render(
            <AnnouncerBox
                allProfiles={mockProfiles}
                isPublishing={false}
                onPublish={onPublish}
            />
        );

        const expirySelect = screen.getByDisplayValue('Expires in 48 hours');
        fireEvent.change(expirySelect, { target: { value: '' } });

        const textarea = screen.getByPlaceholderText('Message to all users...');
        fireEvent.change(textarea, { target: { value: 'Permanent announcement' } });

        await act(async () => {
            fireEvent.click(screen.getByText('Transmit'));
        });

        expect(onPublish).toHaveBeenCalledWith(
            'Permanent announcement',
            'all',
            '',
            null
        );

        rerender(
            <AnnouncerBox
                allProfiles={mockProfiles}
                isPublishing={true}
                onPublish={onPublish}
            />
        );

        expect(screen.getByText('Sending...')).toBeInTheDocument();
        expect(screen.getByText('Sending...').closest('button')).toBeDisabled();
    });
});
