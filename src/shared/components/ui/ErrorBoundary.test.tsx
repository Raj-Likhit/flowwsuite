import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

const ThrowingComponent = ({ shouldThrow, message }: { shouldThrow: boolean; message?: string }) => {
    if (shouldThrow) {
        throw new Error(message || 'Test explosion');
    }
    return <div>Normal Content</div>;
};

describe('ErrorBoundary', () => {
    const originalConsoleError = console.error;

    beforeEach(() => {
        console.error = vi.fn();
    });

    afterEach(() => {
        console.error = originalConsoleError;
    });

    it('renders children when no error occurs', () => {
        render(
            <ErrorBoundary>
                <div>Everything is fine</div>
            </ErrorBoundary>
        );

        expect(screen.getByText('Everything is fine')).toBeInTheDocument();
    });

    it('catches an error and displays error UI with the error message', () => {
        render(
            <ErrorBoundary>
                <ThrowingComponent shouldThrow={true} message="Critical failure occurred" />
            </ErrorBoundary>
        );

        expect(screen.getByText('System Error')).toBeInTheDocument();
        expect(screen.getByText('Critical failure occurred')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /reboot system/i })).toBeInTheDocument();
        expect(console.error).toHaveBeenCalledWith('Uncaught error:', expect.any(Error), expect.anything());
    });

    it('displays fallback error message when error has no message', () => {
        const EmptyErrorComponent = () => {
            const err = new Error('');
            err.message = '';
            throw err;
        };

        render(
            <ErrorBoundary>
                <EmptyErrorComponent />
            </ErrorBoundary>
        );

        expect(screen.getByText('The application encountered an unexpected state and needs to recover.')).toBeInTheDocument();
    });

    it('reloads window when Reboot System button is clicked', () => {
        const reloadMock = vi.fn();
        Object.defineProperty(window, 'location', {
            configurable: true,
            value: { reload: reloadMock }
        });

        render(
            <ErrorBoundary>
                <ThrowingComponent shouldThrow={true} />
            </ErrorBoundary>
        );

        const rebootBtn = screen.getByRole('button', { name: /reboot system/i });
        fireEvent.click(rebootBtn);

        expect(reloadMock).toHaveBeenCalledTimes(1);
    });
});
