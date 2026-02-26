import { create } from 'zustand';

export type TabId = 'attendance' | 'converter';

interface NavigationState {
    activeTab: TabId;
    setActiveTab: (tab: TabId) => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
    activeTab: 'attendance',
    setActiveTab: (tab) => set({ activeTab: tab }),
}));
