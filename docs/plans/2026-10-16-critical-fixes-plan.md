# Critical Issues Remediation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Remediate the 6 critical security, data privacy, database infrastructure, and editor-breaking bugs in ConvertFloww while isolating non-critical PDF engine issues on the back burner.

**Architecture:** 
1. Decouple client-side admin bypasses in favor of genuine Supabase session authorization.
2. Partition the profile directory queries so unauthenticated users only receive non-sensitive profile metadata, stopping hash and note leakage.
3. Establish a baseline PostgreSQL schema migration defining `profiles`, `announcements`, storage buckets, and secure RPCs with strict Row-Level Security (RLS) policies.
4. Modernize Fabric.js canvas deserialization in `useFabricCanvas.ts` from deprecated callbacks to async Promise handling to unblock undo/redo and canvas reloads.
5. Close local network dev server exposure in `vite.config.ts` and audit high-severity dependencies.

**Tech Stack:** React 19, TypeScript, Supabase (PostgreSQL DDL & RLS), Fabric.js 7, Vitest, Vite 7.

---

### Task 1: Fix Fabric 7 `loadFromJSON` Promise Deserialization (Issue #6)

**Files:**
- Modify: `src/features/pdf-engine/hooks/useFabricCanvas.ts:192-218, 410-447`
- Test: `src/features/pdf-engine/hooks/useFabricCanvas.test.ts`

**Step 1: Inspect and update test mock for Fabric 7 Promise signature**
Ensure `mockLoadFromJSON` in `useFabricCanvas.test.ts` returns a Promise rather than calling a callback argument, mirroring Fabric 7 behavior:
```typescript
mockLoadFromJSON = vi.fn().mockImplementation(() => Promise.resolve());
```

**Step 2: Update `useFabricCanvas.ts` initialization**
Convert `canvas.loadFromJSON(existingOverlay, callback)` to async/await or `.then()` with a guaranteed `finally` block resetting `isRestoringRef.current = false`:
```typescript
if (existingOverlay) {
  isRestoringRef.current = true;
  canvas.loadFromJSON(existingOverlay)
    .then(() => {
      const previousSize = getSavedCanvasDimensions(existingOverlay, width, height);
      const scaleX = width / previousSize.width;
      const scaleY = height / previousSize.height;

      if (Math.abs(scaleX - 1) > 0.001 || Math.abs(scaleY - 1) > 0.001) {
        canvas.getObjects().forEach((obj) => {
          obj.set({
            left: (obj.left ?? 0) * scaleX,
            top: (obj.top ?? 0) * scaleY,
            scaleX: (obj.scaleX ?? 1) * scaleX,
            scaleY: (obj.scaleY ?? 1) * scaleY,
          });
          obj.setCoords();
        });
      }

      canvas.requestRenderAll();
      setIsDirty(false);
      undoStackRef.current = [serializeCanvas(canvas)];
    })
    .finally(() => {
      isRestoringRef.current = false;
    });
}
```

**Step 3: Update `undo` and `redo` handlers in `useFabricCanvas.ts`**
Update `undo` and `redo` functions to handle `loadFromJSON` as a Promise:
```typescript
isRestoringRef.current = true;
canvas.loadFromJSON(prevState)
  .then(() => {
    rescaleLoadedObjects(canvas, prevState);
    canvas.renderAll();
    setOverlay(pageId, JSON.parse(prevState));
    setIsDirty(true);
  })
  .finally(() => {
    isRestoringRef.current = false;
  });
```

**Step 4: Run unit tests**
Run: `npm test -- useFabricCanvas.test.ts`
Expected: PASS

---

### Task 2: Remove Hardcoded Admin Password & Enforce Auth (Issue #1)

**Files:**
- Modify: `src/features/admin/AdminLayout.tsx:8-47`
- Test: `src/features/admin/AdminLayout.test.tsx`

**Step 1: Eliminate hardcoded constants**
Remove:
```typescript
// DELETE:
const UNLOCK_KEY = 'admin_portal_unlocked';
const UNLOCK_PASSWORD = 'AdminUnlock';
```

**Step 2: Enforce genuine authenticated session check**
Replace the client-side unlock state with Supabase Auth credentials login or admin role check:
```typescript
const hasAccess = user && role === 'admin';
```
When `!hasAccess`, render a secure Supabase authentication sign-in form using `supabase.auth.signInWithPassword({ email, password })` rather than comparing against a client-bundled string.

**Step 3: Update tests**
Update `AdminLayout.test.tsx` to verify that hardcoded bypass strings are rejected and only authenticated admin roles gain entry.

**Step 4: Run tests**
Run: `npm test -- AdminLayout.test.tsx`
Expected: PASS

---

### Task 3: Seal Profile Data Leakage in `ProfileRepository` (Issue #2)

**Files:**
- Modify: `src/features/attendance/repository/profileRepository.ts:48-57`
- Modify: `src/features/attendance/components/ProfileSelection.tsx`
- Modify: `src/features/attendance/store/useAttendanceStore.ts`
- Test: `src/features/attendance/repository/profileRepository.test.ts`

**Step 1: Narrow the public profile directory query**
Update `ProfileRepository.fetchAll()` to only select public, non-sensitive columns:
```typescript
async fetchDirectory(): Promise<PublicProfileSummary[]> {
  const { data, error } = await this.db
    .from('profiles')
    .select('id, name, avatar_url, attended, total, target_goal, last_active_at, is_flagged')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as PublicProfileSummary[];
}
```

**Step 2: Restrict password verification & private data retrieval**
Provide a dedicated method to verify credentials and fetch sensitive notes/logs only upon successful authentication:
```typescript
async unlockProfile(profileId: string, passwordAttempt: string): Promise<ProfileDetail>
```
Never download bcrypt hashes or private notes of all profiles into client `localStorage`.

**Step 3: Run tests**
Run: `npm test -- profileRepository.test.ts`
Expected: PASS

---

### Task 4: Create Baseline Migrations, RLS Policies & RPCs (Issues #3 & #4)

**Files:**
- Create: `supabase/migrations/20261016000000_baseline_schema_and_rls.sql`

**Step 1: Write DDL for missing tables and storage**
- Define `profiles` table with proper typed constraints.
- Define `announcements` table with `seen_by_profile_ids text[]`.
- Define `mark_announcement_seen(p_id text, a_id uuid)` RPC function with safety checks.
- Create `avatars` storage bucket with public read policies.

**Step 2: Add Row-Level Security (RLS)**
- Enable RLS on `profiles` and `announcements`.
- Add policy: `anon` can read public directory columns of `profiles`.
- Add policy: profile update/delete requires valid authorization.
- Add policy: `announcements` are readable if `active = true`.

---

### Task 5: Remediate Dependency Vulnerabilities & Dev Server Security (Issue #5)

**Files:**
- Modify: `vite.config.ts:63-65`
- Modify: `package.json`

**Step 1: Disallow open LAN binding by default in `vite.config.ts`**
Change:
```typescript
server: {
  host: false, // Prevents unintended local network exposure of dev server
}
```

**Step 2: Audit and upgrade critical packages**
Audit and bump versions for high-advisory libraries (`pdfjs-dist`, `react-router`).

---

### Task 6: Full Verification and Regression Gate

**Step 1: Run type checking**
`npm run typecheck` or `npx tsc -b`

**Step 2: Run all test suites**
`npm test`

**Step 3: Run production build**
`npm run build`
Verify clean output and zero compilation/bundling errors.
