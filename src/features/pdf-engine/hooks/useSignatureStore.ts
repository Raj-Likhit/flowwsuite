// =============================================================================
// HOOK — useSignatureStore
// Manages saved signatures in localStorage.
// Max 5 signatures stored. Oldest is evicted when limit is reached.
//
// USAGE:
//   const { signatures, saveSignature, deleteSignature, clearSignatures } = useSignatureStore();
// =============================================================================

import { useState, useCallback } from 'react';
import type { SavedSignature } from '../types/pdf.types';

export const SIGNATURES_STORAGE_KEY = 'pdf-engine-signatures';
export const LEGACY_SIGNATURES_KEY = 'flowwsuite-signatures';
export const MAX_SIGNATURES = 5;

/**
 * Securely purges all stored handwritten signatures from persistent storage.
 * Called automatically during user sign-out and profile deletion.
 */
export function clearStoredSignatures(): void {
  try {
    localStorage.removeItem(SIGNATURES_STORAGE_KEY);
    localStorage.removeItem(LEGACY_SIGNATURES_KEY);
  } catch (e) {
    console.error('Failed to clear signatures from localStorage', e);
  }
}

export function useSignatureStore() {
  const [signatures, setSignatures] = useState<SavedSignature[]>(() => {
    try {
      const raw = localStorage.getItem(SIGNATURES_STORAGE_KEY) || localStorage.getItem(LEGACY_SIGNATURES_KEY);
      return raw ? JSON.parse(raw) as SavedSignature[] : [];
    } catch (e) {
      console.error('Failed to parse signatures from localStorage', e);
      return [];
    }
  });

  const persist = useCallback((sigs: SavedSignature[]): void => {
    try {
      localStorage.setItem(SIGNATURES_STORAGE_KEY, JSON.stringify(sigs));
    } catch (e) {
      console.error('Failed to save signatures to localStorage', e);
    }
  }, []);

  const saveSignature = useCallback((dataUrl: string): void => {
    // Prevent duplicate saving
    if (signatures.some(sig => sig.dataUrl === dataUrl)) return;
    
    const newSig: SavedSignature = { id: crypto.randomUUID(), dataUrl, createdAt: Date.now() };
    const updated = [newSig, ...signatures].slice(0, MAX_SIGNATURES);
    setSignatures(updated);
    persist(updated);
  }, [signatures, persist]);

  const deleteSignature = useCallback((id: string): void => {
    const updated = signatures.filter((sig) => sig.id !== id);
    setSignatures(updated);
    persist(updated);
  }, [signatures, persist]);

  const clearSignatures = useCallback((): void => {
    setSignatures([]);
    clearStoredSignatures();
  }, []);

  return { signatures, saveSignature, deleteSignature, clearSignatures };
}
