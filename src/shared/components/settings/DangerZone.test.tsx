import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DangerZone } from './DangerZone';

describe('DangerZone', () => {
    const defaultProps = {
        showDeleteConfirm: false,
        setShowDeleteConfirm: vi.fn(),
        deletePassword: '',
        setDeletePassword: vi.fn(),
        onDeleteProfile: vi.fn(),
    };

    it('renders initial delete profile button', () => {
        const setShowDeleteConfirm = vi.fn();
        render(<DangerZone {...defaultProps} setShowDeleteConfirm={setShowDeleteConfirm} />);

        expect(screen.getByText('Danger Zone')).toBeInTheDocument();
        const deleteBtn = screen.getByRole('button', { name: /delete profile/i });
        fireEvent.click(deleteBtn);
        expect(setShowDeleteConfirm).toHaveBeenCalledWith(true);
    });

    it('renders confirmation password input when showDeleteConfirm is true', () => {
        const setDeletePassword = vi.fn();
        const onDeleteProfile = vi.fn();
        const setShowDeleteConfirm = vi.fn();

        render(
            <DangerZone
                {...defaultProps}
                showDeleteConfirm={true}
                deletePassword="mypassword"
                setDeletePassword={setDeletePassword}
                onDeleteProfile={onDeleteProfile}
                setShowDeleteConfirm={setShowDeleteConfirm}
            />
        );

        const passwordInput = screen.getByPlaceholderText(/enter password to confirm/i);
        expect(passwordInput).toHaveValue('mypassword');

        fireEvent.change(passwordInput, { target: { value: 'newpassword' } });
        expect(setDeletePassword).toHaveBeenCalledWith('newpassword');

        const confirmBtn = screen.getByRole('button', { name: /confirm/i });
        fireEvent.click(confirmBtn);
        expect(onDeleteProfile).toHaveBeenCalledTimes(1);

        const cancelBtn = screen.getByRole('button', { name: /cancel/i });
        fireEvent.click(cancelBtn);
        expect(setShowDeleteConfirm).toHaveBeenCalledWith(false);
        expect(setDeletePassword).toHaveBeenCalledWith('');
    });
});
