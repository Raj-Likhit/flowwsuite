import { create } from 'zustand';
import { FileStorage } from '../../../core/services/fileStorage';

export interface ScannedPage {
    id: string;
    previewUrl: string;
    rotation: number;
}

interface ConverterState {
    pages: ScannedPage[];
    isProcessing: boolean;
    statusText: string;
    error: string | null;
    settings: {
        borderWidth: number;
        baseColor: string;
        showPageNumbers: boolean;
        activeFilter: 'none' | 'grayscale' | 'sepia' | 'vibrant';
    };
    addPages: (files: File[]) => void;
    updatePageRotation: (id: string, rotation: number) => void;
    removePage: (id: string) => void;
    clearPages: () => void;
    reorderPages: (newOrder: ScannedPage[]) => void;
    updateSettings: (settings: Partial<ConverterState['settings']>) => void;
    setProcessing: (isProcessing: boolean, text?: string) => void;
    setError: (error: string | null) => void;
}

export const useConverterStore = create<ConverterState>((set, get) => ({
    pages: [],
    isProcessing: false,
    statusText: '',
    error: null,
    settings: {
        borderWidth: 3,
        baseColor: '#000000',
        showPageNumbers: false,
        activeFilter: 'none',
    },
    addPages: (files) => {
        const newPages = files.map((file) => {
            const id = Math.random().toString(36).substring(7);
            const url = URL.createObjectURL(file);

            // Store heavy file in static map
            FileStorage.add(id, file);

            return {
                id,
                previewUrl: url,
                rotation: 0,
            };
        });
        set((state) => ({ pages: [...state.pages, ...newPages] }));
    },
    updatePageRotation: (id, rotation) =>
        set((state) => ({
            pages: state.pages.map((p) => (p.id === id ? { ...p, rotation } : p)),
        })),
    removePage: (id) => {
        const page = get().pages.find(p => p.id === id);
        if (page) {
            // Cleanup memory
            URL.revokeObjectURL(page.previewUrl);
            FileStorage.remove(id);
        }
        set((state) => ({
            pages: state.pages.filter((p) => p.id !== id),
        }));
    },
    clearPages: () => {
        get().pages.forEach(page => {
            URL.revokeObjectURL(page.previewUrl);
            FileStorage.remove(page.id);
        });
        set({ pages: [] });
    },
    reorderPages: (newOrder) => set({ pages: newOrder }),
    updateSettings: (newSettings) =>
        set((state) => ({ settings: { ...state.settings, ...newSettings } })),
    setProcessing: (isProcessing, text = '') => set({ isProcessing, statusText: text }),
    setError: (error) => set({ error }),
}));
