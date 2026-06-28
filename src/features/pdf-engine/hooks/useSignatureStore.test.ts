import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useSignatureStore } from './useSignatureStore';

describe('useSignatureStore', () => {
    beforeEach(() => {
        vi.spyOn(Storage.prototype, 'getItem');
        vi.spyOn(Storage.prototype, 'setItem');
        vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.spyOn(crypto, 'randomUUID').mockReturnValue('test-uuid');
        localStorage.clear();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should initialize with empty array if localStorage is empty', () => {
        const { result } = renderHook(() => useSignatureStore());
        expect(result.current.signatures).toEqual([]);
    });

    it('should initialize with stored signatures if present', () => {
        const stored = [{ id: '1', dataUrl: 'data', createdAt: 123 }];
        localStorage.setItem('pdf-engine-signatures', JSON.stringify(stored));
        
        const { result } = renderHook(() => useSignatureStore());
        expect(result.current.signatures).toEqual(stored);
    });

    it('should initialize with empty array if localStorage parsing fails', () => {
        localStorage.setItem('pdf-engine-signatures', 'invalid json');
        
        const { result } = renderHook(() => useSignatureStore());
        expect(result.current.signatures).toEqual([]);
        expect(console.error).toHaveBeenCalledWith('Failed to parse signatures from localStorage', expect.any(Error));
    });

    describe('saveSignature', () => {
        it('should save a new signature', () => {
            const { result } = renderHook(() => useSignatureStore());
            
            act(() => {
                result.current.saveSignature('new-data');
            });

            expect(result.current.signatures).toHaveLength(1);
            expect(result.current.signatures[0]).toEqual({
                id: 'test-uuid',
                dataUrl: 'new-data',
                createdAt: expect.any(Number)
            });
            expect(localStorage.setItem).toHaveBeenCalledWith(
                'pdf-engine-signatures', 
                JSON.stringify(result.current.signatures)
            );
        });

        it('should not save duplicate signature', () => {
            const { result } = renderHook(() => useSignatureStore());
            
            act(() => {
                result.current.saveSignature('new-data');
            });
            act(() => {
                result.current.saveSignature('new-data');
            });

            expect(result.current.signatures).toHaveLength(1);
        });

        it('should limit signatures to MAX_SIGNATURES (5)', () => {
            const { result } = renderHook(() => useSignatureStore());
            
            act(() => {
                result.current.saveSignature('data-1');
            });
            vi.mocked(crypto.randomUUID).mockReturnValue('uuid-2');
            act(() => {
                result.current.saveSignature('data-2');
            });
            vi.mocked(crypto.randomUUID).mockReturnValue('uuid-3');
            act(() => {
                result.current.saveSignature('data-3');
            });
            vi.mocked(crypto.randomUUID).mockReturnValue('uuid-4');
            act(() => {
                result.current.saveSignature('data-4');
            });
            vi.mocked(crypto.randomUUID).mockReturnValue('uuid-5');
            act(() => {
                result.current.saveSignature('data-5');
            });
            vi.mocked(crypto.randomUUID).mockReturnValue('uuid-6');
            act(() => {
                result.current.saveSignature('data-6');
            });

            expect(result.current.signatures).toHaveLength(5);
            expect(result.current.signatures[0].dataUrl).toBe('data-6');
            expect(result.current.signatures.some(s => s.dataUrl === 'data-1')).toBe(false);
        });
        
        it('should handle localStorage setItem errors gracefully', () => {
            vi.mocked(localStorage.setItem).mockImplementation(() => {
                throw new Error('Quota exceeded');
            });
            const { result } = renderHook(() => useSignatureStore());
            
            act(() => {
                result.current.saveSignature('new-data');
            });

            expect(result.current.signatures).toHaveLength(1);
            expect(console.error).toHaveBeenCalledWith('Failed to save signatures to localStorage', expect.any(Error));
        });
    });

    describe('deleteSignature', () => {
        it('should delete a signature', () => {
            const stored = [{ id: '1', dataUrl: 'data', createdAt: 123 }];
            localStorage.setItem('pdf-engine-signatures', JSON.stringify(stored));
            
            const { result } = renderHook(() => useSignatureStore());
            
            act(() => {
                result.current.deleteSignature('1');
            });

            expect(result.current.signatures).toEqual([]);
            expect(localStorage.setItem).toHaveBeenCalledWith(
                'pdf-engine-signatures', 
                JSON.stringify([])
            );
        });
    });
});
