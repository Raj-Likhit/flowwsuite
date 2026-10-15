import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabase, isSupabaseAvailable } from '../../../core/lib/supabase';
import { createProfileRepository } from '../repository/profileRepository';

const sanitize = (str: string) => str.replace(/[<>]/g, '').slice(0, 100).trim();

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
    password?: string;
    created_at?: string;
    updated_at?: number;
    is_suspended?: boolean;
    logs?: AttendanceLog[];
    targetGoal?: number;
    notes?: string;
}

export type AttendanceAccessMode = 'editable' | 'readOnly';

interface AttendanceStore {
    // State
    profiles: Profile[];
    activeProfile: Profile | null;
    accessMode: AttendanceAccessMode;
    loading: boolean;
    error: string | null;
    isCloudSyncEnabled: boolean;
    lastSyncedAt: number | null;
    hideProfileName: boolean;

    // Actions

    setProfiles: (profiles: Profile[]) => void;
    setActiveProfile: (profile: Profile | null, accessMode?: AttendanceAccessMode) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    setHideProfileName: (hide: boolean) => void;
    toggleHideProfileName: () => void;

    updateAttendance: (attended: number, total: number, title?: string) => string | undefined;
    deleteLog: (logId: string) => void;
    updateTargetGoal: (profileId: string, goal: number) => void;
    deleteProfile: (profileId: string) => void;
    updateProfile: (profileId: string, updates: Partial<Pick<Profile, 'name' | 'avatar_url' | 'password' | 'notes'>>) => void;
    uploadAvatar: (profileId: string, file: Blob) => Promise<string | null>;
    syncFromCloud: (profileId: string, force?: boolean) => Promise<'updated' | 'in-sync' | 'failed' | 'offline' | 'conflict'>;
}

export const useAttendanceStore = create<AttendanceStore>()(
    persist(
        (set) => ({
            profiles: [],
            activeProfile: null,
            accessMode: 'editable',
            loading: false,
            error: null,
            isCloudSyncEnabled: isSupabaseAvailable(),
            lastSyncedAt: null,
            hideProfileName: false,

            setProfiles: (profiles) => set({ profiles }),
            setActiveProfile: (activeProfile, accessMode = 'editable') => {
                set({
                    activeProfile,
                    accessMode: activeProfile ? accessMode : 'editable',
                });
            },
            setLoading: (loading) => set({ loading }),
            setError: (error) => set({ error }),
            setHideProfileName: (hideProfileName) => set({ hideProfileName }),
            toggleHideProfileName: () => set((state) => ({ hideProfileName: !state.hideProfileName })),

            updateAttendance: (rawAttended, rawTotal, title) => {
                let generatedId: string | undefined;
                set((state) => {
                    if (!state.activeProfile || state.accessMode === 'readOnly') return state;

                    // Clamping and Sanitization logic for robustness
                    const safeRawTotal = isNaN(rawTotal) ? 0 : rawTotal;
                    const safeRawAttended = isNaN(rawAttended) ? 0 : rawAttended;

                    const total = Math.max(0, safeRawTotal);
                    const attended = Math.max(0, Math.min(safeRawAttended, total));

                    const diffAttended = attended - state.activeProfile.attended;
                    const diffTotal = total - state.activeProfile.total;

                    if (diffAttended === 0 && diffTotal === 0) return state;

                    // Auto-detect title if not provided
                    let finalTitle = title ? sanitize(title) : 'Manual Edit';
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
                        updated_at: Date.now(),
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

            updateTargetGoal: (profileId, goal) => set((state) => ({
                profiles: state.profiles.map((p) => p.id === profileId ? { ...p, targetGoal: goal, updated_at: Date.now() } : p),
                activeProfile: state.activeProfile?.id === profileId ? { ...state.activeProfile, targetGoal: goal, updated_at: Date.now() } : state.activeProfile
            })),

            deleteProfile: (profileId) =>
                set((state) => {
                    const profiles = state.profiles.filter((p) => p.id !== profileId);
                    return {
                        profiles,
                        activeProfile:
                            state.activeProfile?.id === profileId ? null : state.activeProfile,
                        accessMode:
                            state.activeProfile?.id === profileId ? 'editable' : state.accessMode,
                    };
                }),

            updateProfile: (profileId, updates) =>
                set((state) => {
                    const sanitizedUpdates: Partial<Profile> = { ...updates, updated_at: Date.now() };
                    if (updates.name) sanitizedUpdates.name = sanitize(updates.name);

                    const updatedProfiles = state.profiles.map((p) =>
                        p.id === profileId ? { ...p, ...sanitizedUpdates } : p
                    );
                    const updatedActive =
                        state.activeProfile?.id === profileId
                            ? { ...state.activeProfile, ...sanitizedUpdates }
                            : state.activeProfile;
                    return { profiles: updatedProfiles, activeProfile: updatedActive };
                }),

            deleteLog: (logId) =>
                set((state) => {
                    if (!state.activeProfile || !state.activeProfile.logs || state.accessMode === 'readOnly') return state;
                    const logToRevert = state.activeProfile.logs.find((l) => l.id === logId);
                    if (!logToRevert) return state;

                    const newAttended = Math.max(0, state.activeProfile.attended - logToRevert.diffAttended);
                    const newTotal = Math.max(0, state.activeProfile.total - logToRevert.diffTotal);

                    const updatedProfile = {
                        ...state.activeProfile,
                        attended: newAttended,
                        total: newTotal,
                        updated_at: Date.now(),
                        logs: state.activeProfile.logs.filter((l) => l.id !== logId),
                    };

                    return {
                        activeProfile: updatedProfile,
                        profiles: state.profiles.map((p) =>
                            p.id === updatedProfile.id ? updatedProfile : p
                        ),
                    };
                }),

            uploadAvatar: async (profileId, file) => {
                const repo = createProfileRepository(supabase);
                if (!repo) return null;

                try {
                    const { publicUrl } = await repo.uploadAvatar(profileId, file);
                    useAttendanceStore.getState().updateProfile(profileId, { avatar_url: publicUrl });
                    return publicUrl;
                } catch (error) {
                    console.error('Upload failed:', error);
                    return null;
                }
            },
            
            syncFromCloud: async (profileId, force = false) => {
                if (!isSupabaseAvailable()) return 'offline';
                const repo = createProfileRepository(supabase);
                if (!repo) return 'offline';

                try {
                    const cloudData = await repo.fetchOne(profileId);
                    if (!cloudData) return 'failed';

                    const state = useAttendanceStore.getState();
                    const local = state.activeProfile;

                    // Determine which data source wins (cloud is truth on fresh mount)
                    const cloudTargetGoal = cloudData.target_goal;
                    const cloudLogs = cloudData.logs;
                    const cloudNotes = cloudData.notes;

                    const hasChanges =
                        local?.attended !== cloudData.attended ||
                        local?.total !== cloudData.total ||
                        (cloudTargetGoal !== undefined && local?.targetGoal !== cloudTargetGoal) ||
                        (cloudLogs !== undefined && JSON.stringify(local?.logs) !== JSON.stringify(cloudLogs)) ||
                        (cloudNotes !== undefined && local?.notes !== cloudNotes);

                    const hasLocalChanges = local?.updated_at && state.lastSyncedAt && local.updated_at > state.lastSyncedAt;

                    if (hasChanges && hasLocalChanges && !force) {
                        return 'conflict';
                    }

                    if (hasChanges && local) {
                        const mergedProfile = {
                            ...local,
                            attended: cloudData.attended,
                            total: cloudData.total,
                            ...(cloudTargetGoal !== undefined ? { targetGoal: cloudTargetGoal } : {}),
                            ...(cloudLogs !== undefined ? { logs: cloudLogs } : {}),
                            ...(cloudNotes !== undefined ? { notes: cloudNotes } : {}),
                        };
                        set((s) => ({
                            activeProfile: mergedProfile,
                            profiles: s.profiles.map((p) =>
                                p.id === profileId ? mergedProfile : p
                            ),
                            lastSyncedAt: Date.now(),
                        }));
                        return 'updated';
                    }

                    set({ lastSyncedAt: Date.now() });
                    return 'in-sync';
                } catch {
                    return 'failed';
                }
            },
        }),
        {
            name: 'attendance-profile-metrics-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
