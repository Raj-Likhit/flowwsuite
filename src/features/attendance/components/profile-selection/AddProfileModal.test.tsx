import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AddProfileModal } from './AddProfileModal';

describe('AddProfileModal', () => {
    const defaultProps = {
        isOpen: true,
        onClose: vi.fn(),
        newName: '',
        setNewName: vi.fn(),
        newPassword: '',
        setNewPassword: vi.fn(),
        selectedAvatar: '',
        setSelectedAvatar: vi.fn(),
        customAvatarBlob: null as Blob | null,
        setCustomAvatarBlob: vi.fn(),
        errorMsg: null as string | null,
        submitting: false,
        onSubmit: vi.fn(),
        onOpenPicker: vi.fn(),
    };

    it('returns null when isOpen is false', () => {
        const { container } = render(<AddProfileModal {...defaultProps} isOpen={false} />);
        expect(container.firstChild).toBeNull();
    });

    it('renders form inputs, avatars, and submits form', () => {
        const setNewName = vi.fn();
        const setNewPassword = vi.fn();
        const onSubmit = vi.fn((e) => e.preventDefault());
        const onClose = vi.fn();
        const onOpenPicker = vi.fn();

        render(
            <AddProfileModal
                {...defaultProps}
                setNewName={setNewName}
                setNewPassword={setNewPassword}
                onSubmit={onSubmit}
                onClose={onClose}
                onOpenPicker={onOpenPicker}
            />
        );

        expect(screen.getByText('New Profile')).toBeInTheDocument();

        // Custom avatar button
        const customBtn = screen.getByText('Custom').closest('button');
        fireEvent.click(customBtn!);
        expect(onOpenPicker).toHaveBeenCalledTimes(1);

        // Name input
        const nameInput = screen.getByPlaceholderText(/enter name/i);
        fireEvent.change(nameInput, { target: { value: 'New User' } });
        expect(setNewName).toHaveBeenCalledWith('New User');

        // Password input
        const pwdInput = screen.getByPlaceholderText(/default: 123/i);
        fireEvent.change(pwdInput, { target: { value: '456' } });
        expect(setNewPassword).toHaveBeenCalledWith('456');

        // Submit form
        const submitBtn = screen.getByRole('button', { name: /initialize profile/i });
        fireEvent.click(submitBtn);
        expect(onSubmit).toHaveBeenCalledTimes(1);

        // Cancel button
        const cancelBtn = screen.getByRole('button', { name: /cancel/i });
        fireEvent.click(cancelBtn);
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('displays error message when errorMsg is provided', () => {
        render(<AddProfileModal {...defaultProps} errorMsg="Name is required" />);
        expect(screen.getByText('Name is required')).toBeInTheDocument();
    });

    it('disables submit button and shows Saving... when submitting is true', () => {
        render(<AddProfileModal {...defaultProps} submitting={true} />);
        const submitBtn = screen.getByRole('button', { name: /saving\.\.\./i });
        expect(submitBtn).toBeDisabled();
    });

    it('selects avatar from preset list', () => {
        const setSelectedAvatar = vi.fn();
        const setCustomAvatarBlob = vi.fn();

        render(
            <AddProfileModal
                {...defaultProps}
                setSelectedAvatar={setSelectedAvatar}
                setCustomAvatarBlob={setCustomAvatarBlob}
            />
        );

        const avatarImgs = screen.getAllByAltText('Avatar option');
        expect(avatarImgs.length).toBeGreaterThan(0);

        fireEvent.click(avatarImgs[0].closest('button')!);
        expect(setSelectedAvatar).toHaveBeenCalled();
        expect(setCustomAvatarBlob).toHaveBeenCalledWith(null);
    });

    it('renders custom avatar preview when customAvatarBlob is present', () => {
        render(
            <AddProfileModal
                {...defaultProps}
                selectedAvatar="blob:test-url"
                customAvatarBlob={new Blob(['test'])}
            />
        );

        expect(screen.getByAltText('Custom')).toBeInTheDocument();
    });
});
