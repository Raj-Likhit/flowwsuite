import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AccessibilitySettings } from './AccessibilitySettings';

describe('AccessibilitySettings', () => {
    const defaultProps = {
        isHighContrast: false,
        toggleHighContrast: vi.fn(),
        activeProfile: null as any,
        isSupported: false,
        isSubscribed: false,
        subscribeToPush: vi.fn(),
        unsubscribeFromPush: vi.fn(),
        isReadOnly: false,
        updateTargetGoal: vi.fn(),
    };

    it('renders High Contrast toggle and fires toggle on click', () => {
        const toggleHighContrast = vi.fn();
        render(<AccessibilitySettings {...defaultProps} toggleHighContrast={toggleHighContrast} />);

        const toggleBtn = screen.getByRole('button', { name: /toggle high contrast/i });
        expect(toggleBtn).toHaveAttribute('aria-pressed', 'false');

        fireEvent.click(toggleBtn);
        expect(toggleHighContrast).toHaveBeenCalledTimes(1);
    });

    it('renders high contrast active state', () => {
        render(<AccessibilitySettings {...defaultProps} isHighContrast={true} />);

        const toggleBtn = screen.getByRole('button', { name: /toggle high contrast/i });
        expect(toggleBtn).toHaveAttribute('aria-pressed', 'true');
    });

    it('renders push notifications section when activeProfile and supported', () => {
        const subscribeToPush = vi.fn();
        render(
            <AccessibilitySettings
                {...defaultProps}
                activeProfile={{ id: 'p1', name: 'Bob' } as any}
                isSupported={true}
                isSubscribed={false}
                subscribeToPush={subscribeToPush}
            />
        );

        expect(screen.getByText('Push Notifications')).toBeInTheDocument();
        const pushBtn = screen.getByRole('button', { name: /toggle push notifications/i });
        expect(pushBtn).toHaveAttribute('aria-pressed', 'false');
        fireEvent.click(pushBtn);
        expect(subscribeToPush).toHaveBeenCalledTimes(1);
    });

    it('unsubscribes when already subscribed', () => {
        const unsubscribeFromPush = vi.fn();
        render(
            <AccessibilitySettings
                {...defaultProps}
                activeProfile={{ id: 'p1', name: 'Bob' } as any}
                isSupported={true}
                isSubscribed={true}
                unsubscribeFromPush={unsubscribeFromPush}
            />
        );

        const pushBtn = screen.getByRole('button', { name: /toggle push notifications/i });
        expect(pushBtn).toHaveAttribute('aria-pressed', 'true');
        fireEvent.click(pushBtn);
        expect(unsubscribeFromPush).toHaveBeenCalledTimes(1);
    });

    it('renders target goal slider when activeProfile is present', () => {
        const updateTargetGoal = vi.fn();
        render(
            <AccessibilitySettings
                {...defaultProps}
                activeProfile={{ id: 'p1', name: 'Bob', targetGoal: 85 } as any}
                updateTargetGoal={updateTargetGoal}
            />
        );

        expect(screen.getByText('Target Goal')).toBeInTheDocument();
        const slider = screen.getByRole('slider');
        expect(slider).toHaveValue('85');

        fireEvent.change(slider, { target: { value: '90' } });
        expect(updateTargetGoal).toHaveBeenCalledWith('p1', 90);
    });
});
