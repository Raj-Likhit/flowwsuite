import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Suspense } from 'react';
import { isChunkLoadError, lazyWithRetry, CHUNK_RETRY_KEY } from './lazyWithRetry';

describe('lazyWithRetry & isChunkLoadError', () => {
    describe('isChunkLoadError', () => {
        it('returns false for null, undefined, or empty values', () => {
            expect(isChunkLoadError(null)).toBe(false);
            expect(isChunkLoadError(undefined)).toBe(false);
            expect(isChunkLoadError('')).toBe(false);
        });

        it('identifies dynamic import failure messages', () => {
            expect(isChunkLoadError(new Error('Failed to fetch dynamically imported module: https://example.com/asset.js'))).toBe(true);
            expect(isChunkLoadError(new Error('Failed to fetch'))).toBe(true);
            expect(isChunkLoadError(new Error('error loading chunk 123'))).toBe(true);
            expect(isChunkLoadError(new Error('error loading module'))).toBe(true);
        });

        it('identifies ChunkLoadError by name', () => {
            const err = new Error('Custom chunk failure');
            err.name = 'ChunkLoadError';
            expect(isChunkLoadError(err)).toBe(true);
        });

        it('returns false for standard business/runtime errors', () => {
            expect(isChunkLoadError(new Error('Invalid credentials'))).toBe(false);
            expect(isChunkLoadError(new TypeError('Cannot read properties of undefined'))).toBe(false);
        });
    });

    describe('lazyWithRetry component loading', () => {
        let reloadMock: any;
        const originalLocation = window.location;

        beforeEach(() => {
            sessionStorage.clear();
            reloadMock = vi.fn();
            Object.defineProperty(window, 'location', {
                configurable: true,
                value: { ...originalLocation, reload: reloadMock },
            });
        });

        afterEach(() => {
            Object.defineProperty(window, 'location', {
                configurable: true,
                value: originalLocation,
            });
            vi.restoreAllMocks();
        });

        it('renders component when factory resolves successfully', async () => {
            const DummyComponent = () => <div>Lazy Loaded Content</div>;
            const factory = vi.fn().mockResolvedValue({ default: DummyComponent });
            const Component = lazyWithRetry(factory);

            render(
                <Suspense fallback={<div>Loading...</div>}>
                    <Component />
                </Suspense>
            );

            expect(await screen.findByText('Lazy Loaded Content')).toBeInTheDocument();
            expect(reloadMock).not.toHaveBeenCalled();
        });

        it('triggers window.reload() and stores timestamp when dynamic import fails', async () => {
            const chunkError = new Error('Failed to fetch dynamically imported module: /assets/Test.js');
            const factory = vi.fn().mockRejectedValue(chunkError);
            const Component = lazyWithRetry(factory);

            render(
                <Suspense fallback={<div>Loading fallback</div>}>
                    <Component />
                </Suspense>
            );

            // Wait microtask
            await vi.waitFor(() => {
                expect(reloadMock).toHaveBeenCalledTimes(1);
            });

            expect(sessionStorage.getItem(CHUNK_RETRY_KEY)).toBeTruthy();
        });

        it('re-throws error if chunk failure already triggered reload within threshold', async () => {
            const chunkError = new Error('Failed to fetch dynamically imported module: /assets/Test.js');
            const factory = vi.fn().mockRejectedValue(chunkError);
            sessionStorage.setItem(CHUNK_RETRY_KEY, Date.now().toString());

            const Component = lazyWithRetry(factory);

            // Using a simple try/catch or boundary to assert it doesn't reload twice
            const { ErrorBoundary } = await import('../components/ui/ErrorBoundary');
            render(
                <ErrorBoundary>
                    <Suspense fallback={<div>Loading...</div>}>
                        <Component />
                    </Suspense>
                </ErrorBoundary>
            );

            await screen.findByText('Update Available');
            expect(reloadMock).not.toHaveBeenCalled();
        });

        it('re-throws non-chunk error immediately without reloading', async () => {
            const runtimeError = new Error('State assertion failure');
            const factory = vi.fn().mockRejectedValue(runtimeError);
            const Component = lazyWithRetry(factory);

            const { ErrorBoundary } = await import('../components/ui/ErrorBoundary');
            render(
                <ErrorBoundary>
                    <Suspense fallback={<div>Loading...</div>}>
                        <Component />
                    </Suspense>
                </ErrorBoundary>
            );

            await screen.findByText('State assertion failure');
            expect(reloadMock).not.toHaveBeenCalled();
        });
    });
});
