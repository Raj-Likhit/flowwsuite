import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabase, isSupabaseAvailable } from '../../../core/lib/supabase';
import { createProfileRepository } from '../repository/profileRepository';
import type { AttendanceLog, Profile } from '../domain/types';
import { applyAttendanceChange, isValidGoal, revertLog } from '../domain/attendance';
import { planSync } from '../domain/sync';

export type { AttendanceLog, Profile };

export const sanitize = (str: string, maxLength = 50): string =>
    str
        .replace(/<[^>]*>/g, '')
        .slice(0, maxLength)
        .trim();

export type AttendanceAccessMode = 'editable' | 'readOnly';

export type SyncOutcome = 'updated' | 'in-sync' | 'failed' | 'offline' | 'conflict';

type ProfileUpdates = Partial<Pick<Profile, 'name' | 'avatar_url' | 'notes' | 'last_active_at'>>;

interface AttendanceStore {
    // State
    profiles: Profile[];
    activeProfile: Profile | null;
    accessMode: AttendanceAccessMode;
    loading: boolean;
    error: string | null;
    isCloudSyncEnabled: boolean;
    lastSyncedAt: Record<string, number>;
    hideProfileName: boolean;

    // Actions
    setProfiles: (profiles: Profile[]) => void;
    setActiveProfile: (profile: Profile | null, accessMode?: AttendanceAccessMode) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    setHideProfileName: (hide: boolean) => void;
    toggleHideProfileName: () => void;
    setLastSyncedAt: (profileId: string, timestamp?: number) => void;

    updateAttendance: (attended: number, total: number, title?: string) => string | undefined;
    deleteLog: (logId: string) => void;
    updateTargetGoal: (profileId: string, goal: number) => void;
    deleteProfile: (profileId: string) => void;
    updateProfile: (profileId: string, updates: ProfileUpdates) => void;
    uploadAvatar: (profileId: string, file: Blob) => Promise<string | null>;
    syncFromCloud: (profileId: string, force?: boolean) => Promise<SyncOutcome>;
}

type ProfileSlice = Pick<AttendanceStore, 'profiles' | 'activeProfile'>;

/**
 * The single place that applies a patch to a profile.
 * `activeProfile` is a denormalised copy of one list entry, so every mutation
 * must touch both; funnelling them through here keeps the two from diverging.
 */
const patchProfile = (state: ProfileSlice, id: string, patch: Partial<Profile>): ProfileSlice => ({
    profiles: state.profiles.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    activeProfile: state.activeProfile?.id === id ? { ...state.activeProfile, ...patch } : state.activeProfile,
});

export const useAttendanceStore = create<AttendanceStore>()(
    persist(
        (set, get) => ({
            profiles: [] as Profile[],
            activeProfile: null as Profile | null,
            accessMode: 'editable' as AttendanceAccessMode,
            loading: false,
            error: null as string | null,
            isCloudSyncEnabled: isSupabaseAvailable(),
            lastSyncedAt: {} as Record<string, number>,
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
            setLastSyncedAt: (profileId, timestamp = Date.now()) => {
                set((state) => ({
                    lastSyncedAt: {
                        ...(typeof state.lastSyncedAt === 'object' && state.lastSyncedAt ? state.lastSyncedAt : {}),
                        [profileId]: timestamp,
                    },
                }));
            },

            updateAttendance: (attended, total, title) => {
                const { activeProfile, accessMode } = get();
                if (!activeProfile || accessMode === 'readOnly') return undefined;

                const sanitizedTitle = title ? sanitize(title) : undefined;

                const change = applyAttendanceChange(
                    activeProfile,
                    { attended, total, title: sanitizedTitle },
                    { now: Date.now(), newId: () => crypto.randomUUID() },
                );
                if (change.kind === 'unchanged') return undefined;

                set((state) =>
                    patchProfile(state, activeProfile.id, {
                        attended: change.attended,
                        total: change.total,
                        logs: change.logs,
                        updated_at: Date.now(),
                    }),
                );
                return change.log.id;
            },

            deleteLog: (logId) => {
                const { activeProfile, accessMode } = get();
                if (!activeProfile || accessMode === 'readOnly') return;

                const reverted = revertLog(activeProfile, logId);
                if (!reverted) return;

                set((state) =>
                    patchProfile(state, activeProfile.id, {
                        ...reverted,
                        updated_at: Date.now(),
                    }),
                );
            },

            updateTargetGoal: (profileId, goal) => {
                if (!isValidGoal(goal)) return;
                set((state) =>
                    patchProfile(state, profileId, {
                        targetGoal: goal,
                        updated_at: Date.now(),
                    }),
                );
            },

            deleteProfile: (profileId) =>
                set((state) => {
                    const wasActive = state.activeProfile?.id === profileId;
                    return {
                        profiles: state.profiles.filter((p) => p.id !== profileId),
                        activeProfile: wasActive ? null : state.activeProfile,
                        accessMode: wasActive ? 'editable' : state.accessMode,
                    };
                }),

            updateProfile: (profileId, updates) => {
                const patch: Partial<Profile> = { ...updates, updated_at: Date.now() };
                if (updates.name) patch.name = sanitize(updates.name, 30);
                set((state) => patchProfile(state, profileId, patch));
            },

            uploadAvatar: async (profileId: string, file: Blob) => {
                const repo = createProfileRepository(supabase);
                if (!repo) return null;

                try {
                    const currentProfile = get().profiles.find((p) => p.id === profileId);
                    const { publicUrl } = currentProfile?.avatar_url
                        ? await repo.uploadAvatar(profileId, file, currentProfile.avatar_url)
                        : await repo.uploadAvatar(profileId, file);
                    get().updateProfile(profileId, { avatar_url: publicUrl });
                    return publicUrl;
                } catch (error) {
                    console.error('Upload failed:', error);
                    return null;
                }
            },

            syncFromCloud: async (profileId: string, force = false) => {
                if (!isSupabaseAvailable()) return 'offline';
                const repo = createProfileRepository(supabase);
                if (!repo) return 'offline';

                try {
                    const cloud = await repo.fetchOne(profileId);
                    if (!cloud) return 'failed';

                    const { activeProfile, lastSyncedAt } = get();
                    const profileSyncTimestamp = typeof lastSyncedAt === 'object' && lastSyncedAt ? lastSyncedAt[profileId] ?? null : typeof lastSyncedAt === 'number' ? lastSyncedAt : null;
                    const decision = planSync({ local: activeProfile, cloud, lastSyncedAt: profileSyncTimestamp, force });

                    switch (decision.kind) {
                        case 'conflict':
                            return 'conflict';
                        case 'pull': {
                            const nextSyncRecord = {
                                ...(typeof get().lastSyncedAt === 'object' && get().lastSyncedAt ? get().lastSyncedAt : {}),
                                [profileId]: Date.now(),
                            };
                            set((state) => ({
                                ...patchProfile(state, profileId, {
                                    ...decision.patch,
                                    ...(cloud.last_active_at ? { last_active_at: cloud.last_active_at } : {}),
                                }),
                                lastSyncedAt: nextSyncRecord,
                            }));
                            return 'updated';
                        }
                        case 'in-sync': {
                            const nextSyncRecord = {
                                ...(typeof get().lastSyncedAt === 'object' && get().lastSyncedAt ? get().lastSyncedAt : {}),
                                [profileId]: Date.now(),
                            };
                            if (cloud.last_active_at && activeProfile && activeProfile.last_active_at !== cloud.last_active_at) {
                                set((state) => ({
                                    ...patchProfile(state, profileId, { last_active_at: cloud.last_active_at }),
                                    lastSyncedAt: nextSyncRecord,
                                }));
                            } else {
                                set({ lastSyncedAt: nextSyncRecord });
                            }
                            return 'in-sync';
                        }
                    }
                } catch {
                    return 'failed';
                }
            },
        }),
        {
            name: 'attendance-profile-metrics-storage',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                profiles: state.profiles,
                activeProfile: state.activeProfile,
                accessMode: state.accessMode,
                isCloudSyncEnabled: state.isCloudSyncEnabled,
                lastSyncedAt: state.lastSyncedAt,
                hideProfileName: state.hideProfileName,
            }),
            onRehydrateStorage: () => (state) => {
                if (state) {
                    state.loading = false;
                    state.error = null;
                    if (!state.accessMode) {
                        state.accessMode = 'readOnly';
                    }
                }
            },
        }
    )
);
