import { lazy, type ComponentType } from 'react';

export const CHUNK_RETRY_KEY = 'floww_chunk_retry_timestamp';
export const RETRY_THRESHOLD_MS = 15000;

/**
 * Checks whether an error is caused by a missing/stale dynamically imported script chunk.
 */
export function isChunkLoadError(error: unknown): boolean {
    if (!error) return false;
    const msg = String(error instanceof Error ? error.message : error).toLowerCase();
    const name = error instanceof Error ? error.name : '';
    return (
        msg.includes('dynamically imported module') ||
        msg.includes('failed to fetch') ||
        msg.includes('loading chunk') ||
        msg.includes('error loading module') ||
        name === 'ChunkLoadError'
    );
}

/**
 * Wraps dynamic component imports with automatic recovery against stale deployment chunk failures.
 * When a user triggers a route/component whose hashed chunk is 404/missing from a new deployment,
 * this automatically reloads the page to acquire the latest index.html with new chunk hashes.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyWithRetry<T extends ComponentType<any>>(
    factory: () => Promise<{ default: T }>
) {
    return lazy(async () => {
        try {
            return await factory();
        } catch (error) {
            if (typeof window !== 'undefined' && isChunkLoadError(error)) {
                const lastRetry = sessionStorage.getItem(CHUNK_RETRY_KEY);
                const now = Date.now();

                // If we haven't reloaded recently, trigger a fresh reload to grab the new deployment
                if (!lastRetry || now - parseInt(lastRetry, 10) > RETRY_THRESHOLD_MS) {
                    sessionStorage.setItem(CHUNK_RETRY_KEY, now.toString());
                    window.location.reload();
                    // Return an unresolved promise so React Suspense gracefully waits during the page reload
                    return new Promise<{ default: T }>(() => {});
                }
            }
            throw error;
        }
    });
}
