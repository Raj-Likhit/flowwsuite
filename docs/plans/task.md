## Attendance Module Refactor (Completed)

| Task | Description | Status |
| --- | --- | --- |
| Task 1 | Create the `ProfileRepository` module | Completed |
| Task 2 | Write tests for `ProfileRepository` | Completed |
| Task 3–7 | Migrate all components to use `ProfileRepository` | Completed |
| Task 8 | Final verification (grep check, full tests, production build) | Completed |

## Critical Issues Remediation (Single-Flow Execution)

| Task | Description | Status |
| --- | --- | --- |
| Task 1 | Draft comprehensive implementation plan for Critical Issues 1–6 | Completed |
| Task 2 | Generate interactive review HTML explaining critical fixes | Completed |
| Task 3 | Fix Issue #6: Fabric 7 `loadFromJSON` promise resolution in `useFabricCanvas.ts` | Completed |
| Task 4 | Fix Issue #1: Remove client-side hardcoded admin password & enforce auth | Completed |
| Task 5 | Fix Issue #2: Seal profile data leakage in `ProfileRepository` & sanitize selection | Completed |
| Task 6 | Fix Issues #3 & #4: Create baseline DB schema, RLS policies & RPC migrations | Completed |
| Task 7 | Fix Issue #5: Remediate vulnerable dependencies & secure `vite.config.ts` | Completed |
| Task 8 | Verification (test suites, typecheck, build validation) | Completed |

## Next 5 High Issues Remediation (Single-Flow Execution)

| Task | Description | Status |
| --- | --- | --- |
| Task 9 | Fix Issue #13: Verify affected rows on writes/deletes in `ProfileRepository` | Completed |
| Task 10 | Fix Issue #15: Correct Safe/Danger percentage calculation and 0/0 state; add tests | Completed |
| Task 11 | Fix Issue #12: Secure `mark_announcement_seen` against arbitrary spoofing | Completed |
| Task 12 | Fix Issue #11: Fix push notification error swallowing and authentication alignment | Completed |
| Task 13 | Fix Issue #16: Harden syncUp against blind overwrites and data loss | Completed |
| Task 14 | Final Verification: Run full tests, typecheck, build, and verify localhost | Completed |

## Desktop Profile Spacing Refinement (Single-Flow Execution)

| Task | Description | Status |
| --- | --- | --- |
| Task 1 | Add desktop bottom padding between last profile row and bottom tabs toggle | Completed |

## Next 5 Issues Remediation (Single-Flow Execution)

| Task | Description | Status |
| --- | --- | --- |
| Task 15 | Fix Issue #26: Handle 100% custom goal division-by-zero & formula safety in attendance goals | Completed |
| Task 16 | Fix Issue #29: Fix theme persistence on reload by applying saved theme to document element | Completed |
| Task 17 | Fix Issue #49: Harden `useAttendanceStore` persistence with `partialize` to exclude transient states | Completed |
| Task 18 | Fix Issue #28: Prevent notes autosave data loss by flushing pending edits on unmount | Completed |
| Task 19 | Fix Issue #17: Secure avatar upload & moderation (size/mime validation & old avatar cleanup) | Completed |
| Task 20 | Final Verification: Run full tests, typecheck, build, and verify on localhost | Completed |

## Next 5 Issues Remediation (Batch 4 - Single-Flow Execution)

| Task | Description | Status |
| --- | --- | --- |
| Task 21 | Fix Issue #18: Harden Content-Security-Policy (`object-src 'none'`, `base-uri 'self'`, and clean headers) | Completed |
| Task 22 | Fix Issue #19: Remove third-party requests (`dicebear.com`, `grainy-gradients`) for true local offline privacy | Completed |
| Task 23 | Fix Issue #21: Harden `useAuthStore` session synchronization and prevent client role tampering | Completed |
| Task 24 | Fix Issue #27: Fix attendance report PDF formatting, metric precision, and sanitized filenames | Completed |
| Task 25 | Fix Issue #34: Fix ESLint errors and code quality issues in `AttendanceControls.tsx` | Completed |
| Task 26 | Final Verification: Run full tests, typecheck, build, and verify on localhost | Completed |

## Avatar Presets & Next 5 Issues Remediation (Batch 5 - Single-Flow Execution)

| Task | Description | Status |
| --- | --- | --- |
| Task 27 | Download 16 beloved Dicebear avatar presets into `public/avatars/` for offline PWA | Completed |
| Task 28 | Fix Issue #20: Edge function (`send-push`) security, 410 subscription pruning, and payload limits | Completed |
| Task 29 | Fix Issue #31: Secure and clear signatures from storage on sign-out / profile deletion | Completed |
| Task 30 | Fix Issue #37: Restore `.env.example` with Supabase/VAPID keys and fix documentation metadata | Completed |
| Task 31 | Fix Issue #41: Resolve `.npmrc` legacy-peer-deps and peer dependency alignment | Completed |
| Task 32 | Fix Issue #42: Clean up obsolete `manualChunks` (`radix-ui`, `date-fns`) in `vite.config.ts` | Completed |
| Task 33 | Final Verification Gate: Full typecheck, test suite, production build, and localhost check | Completed |

## Restore Dicebear Bottts Avatars & Next 5 Issues (Batch 6 - Single-Flow Execution)

| Task | Description | Status |
| --- | --- | --- |
| Task 34 | Restore Dicebear Bottts avatars (`https://api.dicebear.com/7.x/bottts/svg?seed=...`) in presets, profile fallbacks, CSP, and PWA runtime caching | Completed |
| Task 35 | Fix Issue #43: Disable PWA `devOptions.enabled` and clean up `dev-dist/` | Completed |
| Task 36 | Fix Issue #44: Remove sensitive `supabase/.temp/*` from repo and add to `.gitignore` | Completed |
| Task 37 | Fix Issue #45: Set up GitHub Actions CI workflow and Dependabot configuration | Completed |
| Task 38 | Fix Issue #46: Safely remove unused dead dependency (`heic2any`) | Completed |
| Task 39 | Fix Issue #48: Remediate code smells (SPA navigation for Admin, consistent name limits, and sanitization) | Completed |
| Task 40 | Final Verification Gate: Full typecheck, test suite, production build, and localhost check | Completed |

## Documentation, Test Blind Spots & Metadata Alignment (Batch 7 - Single-Flow Execution)

| Task | Description | Status |
| --- | --- | --- |
| Task 41 | Fix Issue #47: Resolve test blind spots in `AdminLayout.test.tsx` (auth errors, role validation, signout) | Completed |
| Task 42 | Fix Issue #35: Correct test counts, coverage claims, and test suite health in documentation | Completed |
| Task 43 | Fix Issue #36: Align feature claims in `FEATURES.md` and `README.md` to match actual codebase | Completed |
| Task 44 | Fix Issue #38: Reconcile contradictions in `CODE_HEALTH.md` with current codebase state | Completed |
| Task 45 | Fix Issue #40: Standardize naming, metadata, `robots.txt`, `sitemap.xml`, and LICENSE | Completed |
| Task 46 | Final Verification Gate: Full typecheck, test suite, production build, and localhost check | Completed |
## Attendance Module Architecture Refactor (Step 1 - Single-Flow Execution)

| Task | Description | Status |
| --- | --- | --- |
| Task 47 | Create `src/features/attendance/domain/types.ts` & domain interfaces | Completed |
| Task 48 | Create `domain/text.ts`, `domain/attendance.ts`, and `domain/sync.ts` with exact integer math | Completed |
| Task 49 | Create `domain/attendance.test.ts` & `domain/sync.test.ts` unit tests | Completed |
| Task 50 | Break circular dependency in `profileRepository.ts` and `useAttendanceStore.ts` | Completed |
## Attendance Module Architecture Refactor (Step 2 - Single-Flow Execution)

| Task | Description | Status |
| --- | --- | --- |
| Task 52 | Create `src/features/attendance/repository/profileMapper.ts` boundary mapper | Completed |
| Task 53 | Create `src/features/attendance/repository/profileMapper.test.ts` unit tests | Completed |
| Task 54 | Update `profileRepository.ts` to map database rows through `profileMapper` | Completed |
## Attendance Module Architecture Refactor (Step 3 - Single-Flow Execution)

| Task | Description | Status |
| --- | --- | --- |
| Task 56 | Refactor `useAttendanceStore.ts` with pure actions and `patchProfile` helper | Completed |
| Task 57 | Refactor `deleteLog` to use `revertLog` and maintain `attended <= total` invariant | Completed |
| Task 58 | Refactor `syncFromCloud` to use `planSync` from `domain/sync` | Completed |
| Task 59 | Add store tests for impure reducer purity, dual-write consistency, and sync | Completed |
## Attendance Module Architecture Refactor (Step 4 - Single-Flow Execution)

| Task | Description | Status |
| --- | --- | --- |
| Task 61 | Create `src/features/attendance/components/goalCopy.ts` & unit tests | Completed |
| Task 62 | Update `attendanceCalculations.ts` to delegate to domain's `evaluateGoal` | Completed |
| Task 63 | Wire `SafeDangerCards.tsx`, `CustomGoalSection.tsx`, and `useAttendanceReport.ts` | Completed |

## Attendance Module Architecture Refactor (Step 5 - Single-Flow Execution)

| Task | Description | Status |
| --- | --- | --- |
| Task 64 | Add ESLint architecture guardrails for domain and repository isolation in `eslint.config.js` | Completed |
| Task 65 | Final Verification Gate (full vitest run, tsc -b, npm run lint, npm run build, localhost check) | Completed |


