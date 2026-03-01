import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface AttendanceLog {
    id: string;
    timestamp: number;
    title: string;
    diffAttended: number;
    diffTotal: number;
}

export interface Profile {
    id: string;
    name: string;
    attended: number;
    total: number;
    avatar_url?: string;
    created_at?: string;
    logs?: AttendanceLog[];
}

interface AttendanceStore {
    // State
    profiles: Profile[];
    activeProfile: Profile | null;
    loading: boolean;
    error: string | null;
    hideProfileName: boolean;

    // Actions
    setProfiles: (profiles: Profile[]) => void;
    setActiveProfile: (profile: Profile | null) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;

    updateAttendance: (attended: number, total: number, title?: string) => string | undefined;
    deleteLog: (logId: string) => void;
    toggleHideProfileName: () => void;
    deleteProfile: (profileId: string) => void;
    updateProfile: (profileId: string, updates: Partial<Pick<Profile, 'name' | 'avatar_url'>>) => void;
}

export const useAttendanceStore = create<AttendanceStore>()(
    persist(
        (set) => ({
            profiles: [],
            activeProfile: null,
            loading: false,
            error: null,
            hideProfileName: false,

            setProfiles: (profiles) => set({ profiles }),
            setActiveProfile: (activeProfile) => {
                set({ activeProfile });
            },
            setLoading: (loading) => set({ loading }),
            setError: (error) => set({ error }),

            updateAttendance: (rawAttended, rawTotal, title) => {
                let generatedId: string | undefined;
                set((state) => {
                    if (!state.activeProfile) return state;

                    // Clamping and Sanitization logic for robustness
                    const safeRawTotal = isNaN(rawTotal) ? 0 : rawTotal;
                    const safeRawAttended = isNaN(rawAttended) ? 0 : rawAttended;

                    const total = Math.max(0, safeRawTotal);
                    const attended = Math.max(0, Math.min(safeRawAttended, total));

                    const diffAttended = attended - state.activeProfile.attended;
                    const diffTotal = total - state.activeProfile.total;

                    if (diffAttended === 0 && diffTotal === 0) return state;

                    // Auto-detect title if not provided
                    let finalTitle = title || 'Manual Edit';
                    if (!title && diffAttended === 1 && diffTotal === 1) {
                        finalTitle = 'Logged +1 class';
                    }

                    const newLog: AttendanceLog = {
                        id: crypto.randomUUID(),
                        timestamp: Date.now(),
                        title: finalTitle,
                        diffAttended,
                        diffTotal,
                    };

                    generatedId = newLog.id;

                    const updatedProfile = {
                        ...state.activeProfile,
                        attended,
                        total,
                        logs: [newLog, ...(state.activeProfile.logs || [])].slice(0, 50) // keep last 50 logs
                    };
                    return {
                        activeProfile: updatedProfile,
                        profiles: state.profiles.map((p) =>
                            p.id === updatedProfile.id ? updatedProfile : p
                        ),
                    };
                });
                return generatedId;
            },

            toggleHideProfileName: () => set((state) => ({ hideProfileName: !state.hideProfileName })),

            deleteProfile: (profileId) =>
                set((state) => ({
                    profiles: state.profiles.filter((p) => p.id !== profileId),
                    activeProfile:
                        state.activeProfile?.id === profileId ? null : state.activeProfile,
                })),

            updateProfile: (profileId, updates) =>
                set((state) => {
                    const updatedProfiles = state.profiles.map((p) =>
                        p.id === profileId ? { ...p, ...updates } : p
                    );
                    const updatedActive =
                        state.activeProfile?.id === profileId
                            ? { ...state.activeProfile, ...updates }
                            : state.activeProfile;
                    return { profiles: updatedProfiles, activeProfile: updatedActive };
                }),

            deleteLog: (logId) =>
                set((state) => {
                    if (!state.activeProfile || !state.activeProfile.logs) return state;
                    const logToRevert = state.activeProfile.logs.find((l) => l.id === logId);
                    if (!logToRevert) return state;

                    const newAttended = Math.max(0, state.activeProfile.attended - logToRevert.diffAttended);
                    const newTotal = Math.max(0, state.activeProfile.total - logToRevert.diffTotal);

                    const updatedProfile = {
                        ...state.activeProfile,
                        attended: newAttended,
                        total: newTotal,
                        logs: state.activeProfile.logs.filter((l) => l.id !== logId),
                    };

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
