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

## PDF Engine Remediation (Step 1 - Issue #14: Localize pdf.js CDN Assets)

| Task | Description | Status |
| --- | --- | --- |
| Task 66 | Copy CMaps and standard fonts from `node_modules/pdfjs-dist` to `public/` | Completed |
| Task 67 | Update `pdfLoader.ts` and `pdfLoader.test.ts` to load CMaps and standard fonts locally | Completed |
| Task 68 | Verify Step 1 with unit tests and typecheck | Completed |

## PDF Engine Remediation (Step 2 - Issue #8: WebP Overlay Transcoding)

| Task | Description | Status |
| --- | --- | --- |
| Task 69 | Implement WebP/image transcoding in `pdf.compile.worker.ts` to valid PNG for pdf-lib | Completed |
| Task 70 | Add unit/integration tests for WebP overlay embedding during PDF compilation | Completed |
| Task 71 | Verify Step 2 with unit tests, typecheck, and build | Completed |

## PDF Engine Remediation (Step 3 - Issues #9 & #10: Page Rotation & Rotated Overlays)

| Task | Description | Status |
| --- | --- | --- |
| Task 72 | Remove rotation !== 0 guard in `pdf.compile.worker.ts` to burn in 0° and all angles | Completed |
| Task 73 | Update `rotatePage` in `usePdfStore.ts` to swap `widthPt` and `heightPt` | Completed |
| Task 74 | Implement rotation-aware coordinate translation in `coordTranslate.ts` & worker | Completed |
| Task 75 | Add unit tests for rotated coordinate translation and store rotation | Completed |

## PDF Engine Remediation (Step 4 - Issue #7: Dynamic Text Overlay Fonts)

| Task | Description | Status |
| --- | --- | --- |
| Task 76 | Create `fontResolver.ts` resolving family, weight, and style to StandardFonts | Completed |
| Task 77 | Wire font resolver and font cache in `pdf.compile.worker.ts` | Completed |
| Task 78 | Add unit tests in `fontResolver.test.ts` | Completed |

## PDF Engine Remediation (Step 5 - Final Verification Gate)

| Task | Description | Status |
| --- | --- | --- |
| Task 79 | Final verification gate (vitest, tsc -b, lint, build, localhost 200 OK) | Completed |

## PDF Engine Remediation (Batch 2: Issues #22, #23, #24 - Single-Flow Execution)

| Task | Description | Status |
| --- | --- | --- |
| Task 80 | Fix Issue #22: Memory and performance leaks (document/page destruction, bitmap closing, worker cleanup) | Completed |
| Task 81 | Fix Issue #23: Compressed export inefficiencies (on-demand rasterization, quality optimization, buffer transfer) | Completed |
| Task 82 | Fix Issue #24: "Export as JPEG ZIP" is broken (full overlay compilation, hi-res export, non-blocking pipeline) | Completed |
| Task 83 | Update unit tests in `usePdfDocument.test.ts`, `pdfLoader.test.ts`, and `usePdfExport.test.ts` | Completed |
| Task 84 | Final Verification Gate (full vitest run, tsc -b, npm run lint, npm run build, localhost check) | Completed |

## PDF Engine Remediation (Final Batch: Issues #25, #30, #33 - Single-Flow Execution)

| Task | Description | Status |
| --- | --- | --- |
| Task 85 | Fix Issue #30: DropZone checks (file size limits, extension fallback, empty file rejection, skipped feedback) | Completed |
| Task 86 | Fix Issue #25: Export fidelity loss (WinAnsi character sanitization, multi-line lineHeight, opacity support) | Completed |
| Task 87 | Fix Issue #33: Bundle bloat (split `jspdf` and `html2canvas` from `pdf-lib`, optimize lazy vendor chunks) | Completed |
| Task 88 | Unit & integration tests for Issues #25, #30, and #33 | Completed |
| Task 89 | Final Verification Gate (vitest, tsc -b, lint, build, localhost check) | Completed |
| Task 90 | Commit and push all PDF engine fixes to `origin/main` | Completed |

## 100% Test Coverage Goal (Single-Flow Execution)

| Task | Description | Status |
| --- | --- | --- |
| Task 91 | Test Shared UI Components (`ErrorBoundary`, `ProgressRing`, `PremiumButton`, `BottomTabs`, `AnnouncementModal`, `GlassSurface`, `SpotlightCard`) | Completed |
| Task 92 | Test Shared Settings & Actions (`useSettingsActions`, `SecuritySettings`, `DangerZone`, `ProfileSettings`, `ThemeSettings`, `SettingsMenu`, `ProfilePicturePicker`) | Completed |
| Task 93 | Test Core & App (`useAuthStore` branch gaps, `supabase.ts`, `App.tsx`) | Completed |
| Task 94 | Test Attendance Profile Selection & Modals (`ProfileCard`, `UnlockModal`, `NewProfileModal`, `ProfileSelection`) | Completed |
| Task 95 | Test Attendance Components & Views (`AuditTrail`, `GoalSection`, `AttendanceView`, `AttendanceControls`, `ProfileNotes`) | Completed |
| Task 96 | Test Attendance Hooks & Domain (`useProfileAuth`, `useNotifications`, `index.ts`, store & repo branch gaps) | Completed |
| Task 97 | Test Admin Components & Pages (`StatCard`, `ModerationCard`, `AnnouncerBox`, `UserRow`, `AdminDashboard.tsx`, AdminLayout branches) | Completed |
| Task 98 | Test PDF Engine Workspace & Modals (`exportConfig`, `usePageThumbnail`, `PageThumbnail`, `GridToolbar`, `PageGrid`, `MetadataEditor`, `ExportModal`, `DropZone`) | Completed |
| Task 99 | Test PDF Engine Editor & Views (`EditorToolbar`, `SignaturePad`, `ImageOverlay`, `CanvasEditor`, `PdfEngineView`) | Completed |
| Task 100 | Test PDF Engine Utilities, Worker & Hooks (`imageTranscoder`, `pdfLoader`, `coordTranslate`, `useFabricCanvas`, `usePdfExport`, `usePdfDocument`, `pdf.compile.worker`) | Completed |
| Task 101 | Final Verification Gate & Commit: 100% test coverage achieved, tsc -b, lint, build, commit & push | Completed |

## Dynamic Import & Deployment Chunk-Loading Remediation (Single-Flow Execution)

| Task | Description | Status |
| --- | --- | --- |
| Task 102 | Fix `vercel.json` SPA rewrite rule and strict cache-control for HTML/SW | Completed |
| Task 103 | Update `vite.config.ts` Workbox PWA configuration | Completed |
| Task 104 | Create `lazyWithRetry` utility and `vite:preloadError` listener | Completed |
| Task 105 | Update `App.tsx` to use `lazyWithRetry` and enhance `ErrorBoundary.tsx` | Completed |
| Task 106 | Add unit tests, run verification gate, commit and push to remote | Completed |

## Codebase Cleanup & Pruning (Single-Flow Execution)

| Task | Description | Status |
| --- | --- | --- |
| Task 107 | Remove unused static assets (`vite.svg`, `react.svg`, `public/avatars/`) | Completed |
| Task 108 | Remove dead types & unused code (`RenderWorker*`, `RECOVERY_CAP`) | Completed |
| Task 109 | Remove obsolete artifacts & scripts (`.vite-dev.log`, `benchmark.js`, stale reports) | Completed |
| Task 110 | Prune unused devDependencies (`puppeteer`, `@vitest/ui`, `@testing-library/dom`) | Completed |
| Task 111 | Verification Gate (vitest, tsc, lint, build) and push to remote | Completed |

## Restore Beloved Dicebear bottts-neutral Avatar Assets (Single-Flow Execution)

| Task | Description | Status |
| --- | --- | --- |
| Task 112 | Restore all 16 `bottts-neutral` avatar SVG assets in `public/avatars/` | Completed |
| Task 113 | Restore `bottts-neutral` preset URLs and generator in `constants.ts` | Completed |
| Task 114 | Update unit tests in `constants.test.ts` & `profileRepository.test.ts` | Completed |
| Task 115 | Verification Gate (vitest, tsc, lint, build) and push to remote | Completed |

## Phase 1: Critical Security & Supabase Schema (Single-Flow Execution)

| Task | Description | Status |
| --- | --- | --- |
| Task 116 | Create migration `20261018000000_secure_rls_and_storage.sql` (`profile_directory` view, strict RLS, push_subscriptions constraints, storage bucket limits) | Completed |
| Task 117 | Update `profileRepository.ts` & `profileMapper.ts` (synthetic auth, strip password column, safe avatar upload order, public directory view) | Completed |
| Task 118 | Update unit tests in `profileRepository.test.ts` & `profileMapper.test.ts` | Completed |
| Task 119 | Verification Gate (vitest, tsc, lint, build) | Completed |

## Phase 2: High-Priority Functional Bug Fixes (Single-Flow Execution)

| Task | Description | Status |
| --- | --- | --- |
| Task 120 | Fix `accessMode` persistence & rehydration in `useAttendanceStore.ts` | Completed |
| Task 121 | Fix cloud sync data loss & per-profile `lastSyncedAt` tracking in store & `AttendanceView` | Completed |
| Task 122 | Fix lockout stale closure in `useProfileAuth.ts` | Completed |
| Task 123 | Fix `sanitize()` to strip only `<[^>]*>` without deleting quotes/ampersands | Completed |
| Task 124 | Fix recovery cap in `attendance.ts` to check `needed <= RECOVERY_CAP_CLASSES` | Completed |
| Task 125 | Add/update unit tests across domain, store, and auth hooks | Completed |
| Task 126 | Verification Gate (vitest, tsc, lint, build) | Completed |

## Phase 3: PDF Engine & Rendering Remediation (Single-Flow Execution)

| Task | Description | Status |
| --- | --- | --- |
| Task 127 | Localize PDF.js WASM decoders (`openjpeg.wasm`, `jbig2.wasm`) & add `'wasm-unsafe-eval'` to CSP | Completed |
| Task 128 | Fix double rotation in `usePdfDocument.ts` & `pdf.compile.worker.ts` | Completed |
| Task 129 | Fix export rasterization resolution & quality in `useFabricCanvas.ts` and `usePdfExport.ts` | Completed |
| Task 130 | Support non-Latin & Indic text via canvas-based rendering in `useAttendanceReport.ts` | Completed |
| Task 131 | Fix SPA wildcard 404 route & `/admin-portal-floww-security` path matching in `App.tsx` | Completed |
| Task 132 | Fix image import transparency preservation & OffscreenCanvas feature detection in `usePdfDocument.ts` | Completed |
| Task 133 | Verification Gate (vitest, tsc -b, lint, build) | Completed |

## Phase 4: Performance, CI & Documentation Alignment (Single-Flow Execution)

| Task | Description | Status |
| --- | --- | --- |
| Task 134 | Dynamic `jsPDF` import in `useAttendanceReport.ts` to eliminate bundle bloat | Completed |
| Task 135 | Fix store selector usage in `usePdfExport.ts`, `usePdfDocument.ts`, `useFabricCanvas.ts`, `useSettingsActions.ts` | Completed |
| Task 136 | Fix `deriveUserRole` least-privilege default to `'guest'` in `useAuthStore.ts` | Completed |
| Task 137 | Add lint & audit check to CI workflow in `.github/workflows/ci.yml` | Completed |
| Task 138 | Reconcile `docs/KNOWN_ISSUES_STATUS.md` and `README.md` with true codebase status | Completed |
| Task 139 | Final Verification Gate & Git push | Completed |
