# Refactor Plan — convertfloww (FlowwSuite)

> Tracked as requested. Updated in place each step.

---

## 1. Architecture Overview

```
src/
├── assets/
├── core/
│   └── lib/           ← supabase client, useAuthStore
├── features/
│   ├── admin/         ← AdminLayout, AdminDashboard, useAdminDashboard hook, types
│   ├── attendance/    ← AttendanceView, ProfileSelection, useAttendanceStore, profileRepository
│   └── pdf-engine/    ← PdfEngineView, usePdfStore, usePdfDocument, workers, utils
├── shared/
│   ├── components/    ← SettingsMenu (412 lines), BottomTabs, GlassCard, AnnouncementModal, ui/
│   └── store/         ← useThemeStore
└── store/             ← (empty, vestigial)
```

**Tech Stack Rationale:**
- React 19 + Vite 7 — latest ecosystem; good choice
- Zustand — lightweight predictable state; well used for pdf-engine store, somewhat less clean for attendance (side-effects inside store actions)
- Supabase — serverless backend; nullable client pattern is sound
- Framer Motion + Tailwind — rich UI; consistent
- pdf-lib + pdfjs-dist + fabric.js — covers viewing, editing, compiling; correct split

---

## 2. Issues Found

### 🔴 Critical / High Priority

| # | File | Issue |
|---|------|-------|
| H1 | `SettingsMenu.tsx` | **God component** — 412 lines, 3 different responsibilities: Accessibility/Theme settings, Profile CRUD (name/password/avatar), and Danger Zone (delete). Multiple inline async handlers, inline repo instantiation each call, no separation of concern. |
| H2 | `ProfileSelection.tsx` | **Monolith view component** — 611 lines. Profile list, Add-modal form, password-unlock prompt, avatar picker, lockout logic — all inlined. Should be 4-5 focused components. |
| H3 | `useAdminDashboard.ts` | **Raw SQL in hook** — Direct `supabase.from(...)` queries scattered across 7 functions. No repository/service layer. Parallel fetches in fetchDashboardData produce unmapped raw rows; `AdminProfile` and `Announcement` types duplicate concepts from `attendance/` domain. |
| H4 | `AttendanceView.tsx` | **Announcement fetching in view** — Raw Supabase call inside a render component (lines 86–117). Fetching + RPC `mark_announcement_seen` should be in a service or hook. Also, `Announcement` interface is re-declared here, already exists in `admin.types.ts`. |
| H5 | `useThemeStore.ts` | **DOM side-effects at module load** — `document.documentElement.classList.add` runs during store initialisation (line 20–22), outside React lifecycle. Breaks SSR/test environments. Should use `persist` middleware + `onRehydrateStorage`. |

### 🟡 Medium Priority

| # | File | Issue |
|---|------|-------|
| M1 | `useAttendanceStore.ts` | Store has async side-effects: `uploadAvatar` calls `createProfileRepository` and `useAttendanceStore.getState()` from within a store action (self-reference anti-pattern). `syncFromCloud` is a large async operation in the store. Both should live in a service or hook. |
| M2 | `SettingsMenu.tsx` | `createProfileRepository(supabase)` instantiated 3 separate times inside click handlers. Repository should be obtained once via a hook or stable ref. |
| M3 | `usePdfDocument.ts` | Module-level mutable state (`renderQueue`, `isQueueRunning`) — globals that persist between tests, cause race conditions on HMR. Should be scoped to the hook instance or moved to a class. |
| M4 | `AttendanceView.tsx` | `isSyncing` is a `useRef`, but logic also calls `setLoading(true)` in the store — dual state management. Ref-based synchronisation guards should be unified. |
| M5 | `src/store/` | Empty vestigial directory should be removed. |
| M6 | `useAuthStore.ts` | `supabase?.auth.onAuthStateChange` runs at module load time (line 66) — ordering issue. If the store is imported before Supabase initialises, listener is silently skipped. Should be initialised inside the store's persist `onRehydrateStorage`. |

### 🟢 Low Priority / Polish

| # | File | Issue |
|---|------|-------|
| L1 | `App.tsx` | Admin routing uses `window.location.href` (line 49) instead of React Router `navigate()` — breaks back-button SPA behaviour. |
| L2 | `AttendanceView.tsx` | `Announcement` re-declared (line 21) — import from `admin.types.ts` or move to `shared/types`. |
| L3 | `ProfileSelection.tsx` | `AVATARS` constant array (16 items, lines 14–31) is module-level magic data. Should be in a `constants.ts` or config file. |
| L4 | `useAdminDashboard.ts` | `moderateAll` is defined inline inside the return object (line 224), unlike every other function. Extract to a named function for consistency and testability. |
| L5 | All features | No shared `types/` barrel for cross-feature types (e.g., `Announcement` is in 3 places). |

---

## 3. Proposed Refactoring Steps

Steps are ordered by impact and dependency. Each requires your confirmation before I implement.

---

### Step 1 — Split `SettingsMenu.tsx` into focused sub-components
**Scope:** `src/shared/components/SettingsMenu.tsx` → 4 files  
**Changes:**
- Extract `AccessibilitySettings` panel section  
- Extract `ThemeSettings` panel section  
- Extract `ProfileSettings` panel section (name, password, avatar)  
- Extract `DangerZone` panel section  
- Extract `useSettingsActions` hook with stable repo ref, eliminating 3x `createProfileRepository` inline calls  
- `SettingsMenu.tsx` becomes a thin shell composing these  

**Benefit:** Each section independently testable; SettingsMenu drops from 412 to ~60 lines.

---

### Step 2 — Create `AnnouncementService` + split `AttendanceView.tsx`
**Scope:** New `src/features/attendance/services/announcementService.ts` + `useAnnouncement.ts` hook  
**Changes:**
- Move raw Supabase announcement fetch + `mark_announcement_seen` RPC out of `AttendanceView`  
- Create `useAnnouncement(profileId)` hook returning `{ announcement, dismiss }`  
- Remove duplicate `Announcement` type in `AttendanceView` — import from `admin.types.ts` or `shared/types`  
- `AttendanceView` calls the hook instead of inline `useEffect`  

**Benefit:** AttendanceView drops from 439 to ~300 lines; announcement logic is reusable/testable.

---

### Step 3 — Create `AdminRepository` (admin's own data layer)
**Scope:** New `src/features/admin/repository/adminRepository.ts`  
**Changes:**
- Move all `supabase.from('profiles')` and `supabase.from('announcements')` calls out of `useAdminDashboard.ts` into a typed repository class  
- `useAdminDashboard.ts` becomes coordination logic only (state + toast)  
- Extract `moderateAll` to a named function  

**Benefit:** Hook drops from 238 to ~120 lines; SQL is encapsulated; each operation independently testable.

---

### Step 4 — Split `ProfileSelection.tsx` into focused components
**Scope:** `src/features/attendance/components/ProfileSelection.tsx` → 4 files  
**Changes:**
- Extract `AddProfileModal` (form + avatar picker logic)  
- Extract `PasswordUnlockModal` (password prompt + lockout logic)  
- Extract `ProfileCard` (the clickable card)  
- Extract `AVATARS` constant to `attendance/constants.ts`  
- `ProfileSelection` becomes a coordinator: fetches profiles, renders grid + modals  

**Benefit:** Each modal independently testable; ProfileSelection drops from 611 to ~150 lines.

---

### Step 5 — Fix module-level side-effects (useThemeStore + useAuthStore)
**Scope:** `src/shared/store/useThemeStore.ts`, `src/core/lib/useAuthStore.ts`  
**Changes:**
- `useThemeStore`: move DOM mutations (`classList.add`, `setAttribute`) into `onRehydrateStorage` lifecycle  
- `useAuthStore`: move `supabase.auth.onAuthStateChange` subscription into an `initAuth()` function called from `main.tsx` (after mount), not at module-import time  

**Benefit:** Stores are pure; tests no longer need `document` mocking; no subtle ordering bugs.

---

### Step 6 — Scope render queue in `usePdfDocument.ts`
**Scope:** `src/features/pdf-engine/hooks/usePdfDocument.ts`  
**Changes:**
- Move `renderQueue` and `isQueueRunning` from module-level globals into a `RenderQueue` class  
- Instantiate once via `useMemo` inside the hook  

**Benefit:** No cross-test contamination; correct HMR behaviour; enables future cancellation.

---

### Step 7 — Fix `App.tsx` admin navigation + remove vestigial `/store`
**Scope:** `src/App.tsx`, `src/store/` directory  
**Changes:**
- Replace `window.location.href = '/admin-portal-...'` with `useNavigate()` hook  
- Delete empty `src/store/` directory  

**Benefit:** SPA navigation preserved; no dead code.

---

## 4. Progress Tracker

| Step | Description | Status |
|------|-------------|--------|
| 1 | Split SettingsMenu → sub-components + useSettingsActions | ⬜ Awaiting confirmation |
| 2 | AnnouncementService + useAnnouncement hook | ⬜ Awaiting confirmation |
| 3 | AdminRepository data layer | ⬜ Awaiting confirmation |
| 4 | Split ProfileSelection → sub-components | ⬜ Awaiting confirmation |
| 5 | Fix module-level side-effects (stores) | ⬜ Awaiting confirmation |
| 6 | Scope render queue in usePdfDocument | ⬜ Awaiting confirmation |
| 7 | Fix App.tsx navigation + remove /store | ⬜ Awaiting confirmation |

---

*Last updated: 2026-10-15*
