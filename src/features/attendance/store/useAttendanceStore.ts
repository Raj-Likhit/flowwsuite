import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabase, isSupabaseAvailable } from '../../../core/lib/supabase';

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
    is_suspended?: boolean;
    logs?: AttendanceLog[];
}

export type AttendanceAccessMode = 'editable' | 'readOnly';

interface AttendanceStore {
    // State
    profiles: Profile[];
    activeProfile: Profile | null;
    accessMode: AttendanceAccessMode;
    loading: boolean;
    error: string | null;
    hideProfileName: boolean;
    isCloudSyncEnabled: boolean;
    lastSyncedAt: number | null;

    // Actions

    setProfiles: (profiles: Profile[]) => void;
    setActiveProfile: (profile: Profile | null, accessMode?: AttendanceAccessMode) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;

    updateAttendance: (attended: number, total: number, title?: string) => string | undefined;
    deleteLog: (logId: string) => void;
    toggleHideProfileName: () => void;
    deleteProfile: (profileId: string) => void;
    updateProfile: (profileId: string, updates: Partial<Pick<Profile, 'name' | 'avatar_url' | 'password'>>) => void;
    uploadAvatar: (profileId: string, file: Blob) => Promise<string | null>;
    syncFromCloud: (profileId: string) => Promise<'updated' | 'in-sync' | 'failed' | 'offline'>;
}

export const useAttendanceStore = create<AttendanceStore>()(
    persist(
        (set) => ({
            profiles: [],
            activeProfile: null,
            accessMode: 'editable',
            loading: false,
            error: null,
            hideProfileName: false,
            isCloudSyncEnabled: isSupabaseAvailable(),
            lastSyncedAt: null,

            setProfiles: (profiles) => set({ profiles }),
            setActiveProfile: (activeProfile, accessMode = 'editable') => {
                set({
                    activeProfile,
                    accessMode: activeProfile ? accessMode : 'editable',
                });
            },
            setLoading: (loading) => set({ loading }),
            setError: (error) => set({ error }),

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
                    const sanitizedUpdates = { ...updates };
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
                const sp = supabase;
                if (!sp) return null;

                try {
                    const fileName = `${profileId}-${Date.now()}.jpg`;
                    const { data, error } = await sp.storage
                        .from('avatars')
                        .upload(fileName, file, { contentType: 'image/jpeg', upsert: true });

                    if (error) throw error;

                    const { data: { publicUrl } } = sp.storage.from('avatars').getPublicUrl(data.path);

                    // Update profile with new avatar URL
                    useAttendanceStore.getState().updateProfile(profileId, { avatar_url: publicUrl });

                    return publicUrl;
                } catch (error) {
                    console.error('Upload failed:', error);
                    return null;
                }
            },
            
            syncFromCloud: async (profileId) => {
                if (!isSupabaseAvailable()) return 'offline';
                try {
                    const { data, error } = await supabase!
                        .from('profiles')
                        .select('attended, total, name, avatar_url')
                        .eq('id', profileId)
                        .single();

                    if (error || !data) return 'failed';

                    const state = useAttendanceStore.getState();
                    const local = state.activeProfile;

                    const hasChanges =
                        local?.attended !== data.attended ||
                        local?.total !== data.total;

                    if (hasChanges && local) {
                        set((s) => ({
                            activeProfile: { ...s.activeProfile!, attended: data.attended, total: data.total },
                            profiles: s.profiles.map((p) =>
                                p.id === profileId ? { ...p, attended: data.attended, total: data.total } : p
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
