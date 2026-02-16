import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { TabId } from '../components/shared/BottomTabs';

interface AttendanceState {
    totalClasses: number;
    attendedClasses: number;
}

interface AppState {
    activeTab: TabId;
    attendance: AttendanceState;

    // Actions
    setActiveTab: (tab: TabId) => void;
    setTotalClasses: (value: number) => void;
    setAttendedClasses: (value: number) => void;
    logToday: () => void;
    resetAttendance: () => void;
}

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
            activeTab: 'attendance',
            attendance: {
                totalClasses: 0,
                attendedClasses: 0,
            },

            setActiveTab: (tab) => set({ activeTab: tab }),

            setTotalClasses: (value) =>
                set((state) => ({
                    attendance: { ...state.attendance, totalClasses: Math.max(0, value) },
                })),

            setAttendedClasses: (value) =>
                set((state) => ({
                    attendance: {
                        ...state.attendance,
                        attendedClasses: Math.max(0, Math.min(value, state.attendance.totalClasses)),
                    },
                })),

            logToday: () =>
                set((state) => ({
                    attendance: {
                        totalClasses: state.attendance.totalClasses + 1,
                        attendedClasses: state.attendance.attendedClasses + 1,
                    },
                })),

            resetAttendance: () =>
                set({
                    attendance: { totalClasses: 0, attendedClasses: 0 },
                }),
        }),
        {
            name: 'flowsuite-storage',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                attendance: state.attendance,
                activeTab: state.activeTab,
            }),
        }
    )
);
