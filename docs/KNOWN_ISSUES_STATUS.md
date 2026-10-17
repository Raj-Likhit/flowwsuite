# Known Issues and Bug Tracking (Status)

This document tracks all 49 known bugs, vulnerabilities, and inconsistencies identified in the application, alongside 2 near-misses.

## 🚨 Critical
* [x] **1. Hardcoded admin password in the client bundle:** RESOLVED — Removed client hardcoded password and implemented Supabase authenticated admin login via `useAuthStore` and `AdminLayout`.
* [x] **2. Profile "login" is client-side:** RESOLVED — Stopped sending password hashes across the wire in `fetchAll()`, removed hash leakage to `localStorage`, implemented `verifyAndUnlock` with fallback avatar.
* [x] **3. Backend schema and RLS aren't in the repo:** RESOLVED — Baseline migrations created in `supabase/migrations/20261016000000_baseline_schema.sql` including `profiles`, `announcements`, RLS policies, and RPCs.
* [x] **4. Likely permissive RLS (inferred):** RESOLVED — Strict RLS policies and secure RPC functions implemented.
* [x] **5. Production dependency vulnerabilities:** RESOLVED — Vulnerabilities remediated and `vite.config.ts` secured with `server.host: false`.
* [x] **6. Undo/redo and page reload in the editor are broken:** RESOLVED — Fabric 7 `loadFromJSON` promise resolution correctly awaited.

## 🔴 High
* [ ] **7. Text overlays use Helvetica only:** (PDF Engine — Back Burner)
* [ ] **8. WebP overlay image breaks export:** (PDF Engine — Back Burner)
* [ ] **9. Rotating a page back to 0° is ignored:** (PDF Engine — Back Burner)
* [ ] **10. Source-rotated PDFs are handled wrong (inferred):** (PDF Engine — Back Burner)
* [x] **11. Push notifications are non-functional (inferred):** RESOLVED — Push notifications authenticated against current user session and error swallowing removed.
* [x] **12. `mark_announcement_seen` exploit:** RESOLVED — RPC hardened with profile password verification to prevent cross-profile spoofing.
* [x] **13. Writes never check affected rows:** RESOLVED — ProfileRepository checks affected row counts on all updates and deletes, throwing on 0 affected rows.
* [ ] **14. pdf.js CDN Dependencies:** (PDF Engine — Back Burner)
* [x] **15. Safe/Danger logic uses a rounded percentage:** RESOLVED — Exact percentage calculation with tolerance used; 0/0 fresh profile state properly handled.
* [x] **16. Sync can lose data:** RESOLVED — Optimistic concurrency with `last_active_at` prevents silent overwrites; conflict divergence surfaced.
* [x] **17. Avatar moderation can be bypassed:** RESOLVED — Client and server MIME/size validation (2MB limit), automated cleanup of replaced/deleted avatar files in Supabase storage, and `is_flagged: true` moderation preservation.

## 🟠 Medium
* [x] **18. CSP Vulnerabilities:** RESOLVED — Hardened CSP `<meta>` tag with `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-src 'none'`. Upgraded Vercel security headers with `Referrer-Policy: strict-origin-when-cross-origin` and `Permissions-Policy`.
* [x] **19. Third-party requests contradict “privacy-focused”:** RESOLVED — Replaced remote `api.dicebear.com` and `grainy-gradients` network calls with 16 bespoke inline local SVGs and native CSS. Removed remote domains from CSP.
* [x] **20. Edge function (send-push) flaws:** RESOLVED — Enforced 4KB RFC 8030 payload size limit, capped target profiles at 500, implemented automated pruning of 410 Gone / 404 Not Found expired push subscriptions, pinned `@supabase/supabase-js` to `2.97.0`, and standardized JSON/CORS headers.
* [x] **21. Auth store issues:** RESOLVED — Removed duplicate localStorage role persistence to prevent role tampering, derived roles directly from session metadata, initialized session lifecycle reactively, and wired live auth state listeners.
* [ ] **22. Memory and performance leaks:** (PDF Engine — Back Burner)
* [ ] **23. Compressed export inefficiencies:** (PDF Engine — Back Burner)
* [ ] **24. "Export as JPEG ZIP" is broken:** (PDF Engine — Back Burner)
* [ ] **25. Export fidelity loss:** (PDF Engine — Back Burner)
* [x] **26. Custom goal of 100% gives Infinity/NaN:** RESOLVED — Pure mathematical calculations in `attendanceCalculations.ts`, division-by-zero handled, and impossibility indicator rendered.
* [x] **27. Attendance report PDF formatting:** RESOLVED — Unified attendance metrics calculation via `calculateAttendanceMetrics`, sanitized WinAnsi text glyphs, and sanitized export PDF filenames against injection and path traversal.
* [x] **28. Notes autosave data loss:** RESOLVED — Pending debounced notes automatically flushed on unmount and textarea blur.
* [x] **29. Theme persistence fails:** RESOLVED — Saved theme applied to `document.documentElement` immediately on reload via early hydration script and store subscription.
* [ ] **30. DropZone checks are weak:** (PDF Engine — Back Burner)
* [x] **31. Signatures sit in plaintext `localStorage`:** RESOLVED — Added `clearStoredSignatures()` and `clearSignatures()`, automatically purging saved handwritten signatures on user sign-out and profile deletion, and aligned documented keys and limits (max 5 with FIFO eviction).
* [x] **32. Delete-profile inconsistencies:** RESOLVED — Orphaned avatars deleted from Supabase storage on profile deletion; consistent deletion verification.
* [ ] **33. Bundle bloat:** (PDF Engine — Back Burner)

## 📝 Documentation and Claims
* [x] **34. “Zero ESLint errors” is false:** RESOLVED — Replaced cascading effect setState in `AttendanceControls.tsx` with React-idiomatic render-time prop synchronization and added displayName. 0 ESLint errors and warnings across the component.
* [x] **35. “100% coverage for core logic” is false:** RESOLVED — Corrected stale test numbers and absolute claims across documentation to accurately report 238 passed unit/integration tests across 26 test suites.
* [x] **36. Feature claims don't match code:** RESOLVED — Removed inaccurate claims about HEIC, WebAssembly, and real-time WebSockets; accurately documented JPG/PNG/WebP support, Web Worker architecture, and concurrency-safe cloud sync.
* [x] **37. Missing setup files:** RESOLVED — Restored `.env.example` with Supabase credentials and `VITE_VAPID_PUBLIC_KEY`, and updated README.md installation and environment setup documentation.
* [x] **38. `CODE_HEALTH.md` contradicts itself:** RESOLVED — Reconciled `docs/CODE_HEALTH.md` to align with current test metrics (238 passing tests across 26 test files, zero compiler errors, 0 ESLint errors, active CI).
* [x] **39. The “security audited” badge is a static image:** RESOLVED — Replaced unverified static badge with verified project Security Policy link in `README.md`.
* [x] **40. Naming and metadata inconsistencies:** RESOLVED — Aligned `public/robots.txt` sitemap URL with `public/sitemap.xml` domain (`https://flowwsuite.app/sitemap.xml`) and updated `LICENSE` copyright year to 2026 FlowSuite.

## ⚙️ Config and Hygiene
* [x] **41. `.npmrc` sets `legacy-peer-deps=true`:** RESOLVED — Upgraded `vite-plugin-pwa` to `^1.2.0` which natively supports Vite 7 peer dependencies, removed `legacy-peer-deps=true`, and validated clean npm dependency tree.
* [x] **42. `vite.config.ts` has leftovers:** RESOLVED — Removed obsolete `manualChunks` references to uninstalled `@radix-ui` and `date-fns` packages.
* [x] **43. PWA `devOptions.enabled: true`:** RESOLVED — Disabled `devOptions.enabled` in `vite.config.ts`, removed committed `dev-dist/` files from git, and added `dev-dist` to `.gitignore`.
* [x] **44. Committed files that shouldn't be:** RESOLVED — Untracked sensitive `supabase/.temp/*` metadata from git repository and added `supabase/.temp/` to `.gitignore`.
* [x] **45. No CI and no Dependabot:** RESOLVED — Added GitHub Actions CI workflow (`.github/workflows/ci.yml`) covering typecheck, vitest, and production build, plus automated weekly dependency updates via `.github/dependabot.yml`.
* [x] **46. Dead or heavy dependencies:** RESOLVED — Safely removed dead and unimported `heic2any` dependency from `package.json` and lockfile.
* [x] **47. Test blind spots:** RESOLVED — Expanded `AdminLayout.test.tsx` with rigorous authentication failure, missing admin role validation, and `signOut` verification, eliminating previous test blind spots.
* [x] **48. Small code smells:** RESOLVED — Replaced weak `sanitize()` with robust HTML tag/markup stripper, aligned profile name limits consistently across modals and store to 30 chars, fixed `AdminLayout` error typing, and resolved all ESLint errors (0 errors, 0 warnings).

## 🧠 Core Architecture
* [x] **49. Persisted stores save everything (No Partialize/Version):** RESOLVED — `partialize` configured on `useAttendanceStore` to strictly exclude `loading`, `error`, and `accessMode`, and `onRehydrateStorage` cleans state.

## 🔎 Near-Misses (Bonus)
* [x] **50. Broken Avatar Fallback:** RESOLVED — Built-in SVG fallback rendered when profile avatar URL is missing or rejected.
* [x] **51. Swallowed Upload Errors:** RESOLVED — Caught and surfaced via Sonner toast error notifications.
