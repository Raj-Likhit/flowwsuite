import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProfileSettings } from './ProfileSettings';

describe('ProfileSettings', () => {
    const defaultProps = {
        activeProfile: {
            id: 'p1',
            name: 'Charlie',
            avatar_url: 'https://example.com/avatar.png',
        } as any,
        newName: 'Charlie',
        setNewName: vi.fn(),
        newPassword: '',
        setNewPassword: vi.fn(),
        onOpenAvatarPicker: vi.fn(),
        onUpdateName: vi.fn(),
        onUpdatePassword: vi.fn(),
    };

    it('renders profile picture with fallback and button to change avatar', () => {
        const onOpenAvatarPicker = vi.fn();
        render(<ProfileSettings {...defaultProps} onOpenAvatarPicker={onOpenAvatarPicker} />);

        const img = screen.getByAltText('Charlie');
        expect(img).toHaveAttribute('src', 'https://example.com/avatar.png');

        const changeAvatarBtn = screen.getByRole('button', { name: /change avatar/i });
        fireEvent.click(changeAvatarBtn);
        expect(onOpenAvatarPicker).toHaveBeenCalledTimes(1);

        // Test img onError fallback
        fireEvent.error(img);
        expect(img.getAttribute('src')).toContain('dicebear');
    });

    it('handles updating display name', () => {
        const setNewName = vi.fn();
        const onUpdateName = vi.fn();
        render(
            <ProfileSettings
                {...defaultProps}
                newName="Charlie Brown"
                setNewName={setNewName}
                onUpdateName={onUpdateName}
            />
        );

        const nameInput = screen.getByPlaceholderText(/profile name/i);
        expect(nameInput).toHaveValue('Charlie Brown');

        fireEvent.change(nameInput, { target: { value: 'Chuck' } });
        expect(setNewName).toHaveBeenCalledWith('Chuck');

        const updateNameBtn = screen.getAllByRole('button', { name: /update/i })[0];
        fireEvent.click(updateNameBtn);
        expect(onUpdateName).toHaveBeenCalledTimes(1);
    });

    it('handles updating password', () => {
        const setNewPassword = vi.fn();
        const onUpdatePassword = vi.fn();
        render(
            <ProfileSettings
                {...defaultProps}
                newPassword="secret123"
                setNewPassword={setNewPassword}
                onUpdatePassword={onUpdatePassword}
            />
        );

        const pwdInput = screen.getByPlaceholderText(/new password/i);
        expect(pwdInput).toHaveValue('secret123');

        fireEvent.change(pwdInput, { target: { value: 'betterSecret' } });
        expect(setNewPassword).toHaveBeenCalledWith('betterSecret');

        const updatePwdBtn = screen.getAllByRole('button', { name: /update/i })[1];
        fireEvent.click(updatePwdBtn);
        expect(onUpdatePassword).toHaveBeenCalledTimes(1);
    });
});
