import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface Profile {
    id: string;
    name: string;
    attended: number;
    total: number;
    avatar_url?: string;
    created_at?: string;
}

interface AttendanceStore {
    // State
    profiles: Profile[];
    activeProfile: Profile | null;
    loading: boolean;
    error: string | null;

    // Actions
    setProfiles: (profiles: Profile[]) => void;
    setActiveProfile: (profile: Profile | null) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;

    updateAttendance: (attended: number, total: number) => void;
}

export const useAttendanceStore = create<AttendanceStore>()(
    persist(
        (set) => ({
            profiles: [],
            activeProfile: null,
            loading: false,
            error: null,

            setProfiles: (profiles) => set({ profiles }),
            setActiveProfile: (activeProfile) => {
                set({ activeProfile });
            },
            setLoading: (loading) => set({ loading }),
            setError: (error) => set({ error }),

            updateAttendance: (attended, total) =>
                set((state) => {
                    if (!state.activeProfile) return state;
                    const updatedProfile = { ...state.activeProfile, attended, total };
                    return {
                        activeProfile: updatedProfile,
                        profiles: state.profiles.map((p) =>
                            p.id === updatedProfile.id ? updatedProfile : p
                        ),
                    };
                }),
        }),
        {
            name: 'attendance-profile-metrics-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
