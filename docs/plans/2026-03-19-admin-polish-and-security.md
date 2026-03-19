# Admin Polish & Security Hardening Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Fix Admin Portal alignment/performance issues, implement secure password hashing, and optimize mobile layout.

**Architecture:** Use `bcryptjs` for client-side hashing with a migrate-on-login strategy. Optimize CSS/Framer Motion by reducing blur radii and using GPU-accelerated transforms. Adjust mobile layouts using Tailwind's responsive prefixes.

**Tech Stack:** React, Tailwind CSS, Framer Motion, bcryptjs, Supabase.

---

### Task 1: Environment & Dependencies
**Files:**
- Modify: `package.json`

**Step 1: Add bcryptjs dependency**
Run: `npm install bcryptjs`
Run: `npm install --save-dev @types/bcryptjs`

**Step 2: Commit**
```bash
git add package.json
git commit -m "chore: add bcryptjs for password hashing"
```

---

### Task 2: Admin Portal Alignment & Performance
**Files:**
- Modify: `src/features/admin/AdminLayout.tsx`

**Step 1: Fix Unlock Button Alignment**
Modify the password input container to ensure the `ArrowRight` button is perfectly centered.
```tsx
// Around line 91
<div className="relative group flex items-center">
    <input
        // ... grid-related or padding classes
        className="... pr-16 ..." // Ensure enough padding for the button
    />
    <AnimatePresence>
        {unlockPassword && (
            <motion.button 
                className="absolute right-3 ..." // Use absolute positioning with correct vertical centering
            >
                <ArrowRight size={20} />
            </motion.button>
        )}
    </AnimatePresence>
</div>
```

**Step 2: Optimize Background Blur**
Reduce `blur-[140px]` to `blur-[64px]` and simplify the pulse animation.
- Modify line 48: `blur-[64px]`
- Modify line 49: Adjust gradient opacity for better performance.

**Step 3: Mobile Title Scaling**
- Modify line 81: `text-3xl sm:text-5xl`

**Step 4: Commit**
```bash
git add src/features/admin/AdminLayout.tsx
git commit -m "fix: align admin unlock button and optimize background performance"
```

---

### Task 3: Dashboard Performance Optimization
**Files:**
- Modify: `src/features/admin/pages/AdminDashboard.tsx`

**Step 1: Optimize entrance animations**
Ensure all motion elements use `will-change: transform`.
Reduce complexity of layout transitions.

**Step 2: Commit**
```bash
git add src/features/admin/pages/AdminDashboard.tsx
git commit -m "perf: optimize dashboard entrance animations"
```

---

### Task 4: Security - Password Hashing Logic
**Files:**
- Modify: `src/features/attendance/components/ProfileSelection.tsx`

**Step 1: Implement Hashing in handleSubmit**
- Import `bcrypt` from `bcryptjs`.
- In `handleSubmit` for 'add' mode, hash the password before inserting.
- In `handleSubmit` for 'edit' mode, hash if changed.

**Step 2: Implement Verify & Upgrade Logic in Password Prompt**
- In the password prompt `onKeyDown` and `Unlock` button handler:
    - Attempt `bcrypt.compare(enteredPassword, profile.password)`.
    - If it fails, check if `enteredPassword === profile.password` (legacy plain text).
    - If plain text match succeeds:
        - Unlock profile.
        - Trigger a background update to hash and save the password in Supabase.

**Step 3: Update confirmDelete**
- Verify password using `bcrypt.compare()`.

**Step 4: Commit**
```bash
git add src/features/attendance/components/ProfileSelection.tsx
git commit -m "feat: implement bcrypt password hashing with legacy migration"
```

---

### Task 5: Mobile Layout Fixes
**Files:**
- Modify: `src/shared/components/BottomTabs.tsx`
- Modify: `src/features/attendance/components/ProfileSelection.tsx`

**Step 1: Fix Title Clipping on Mobile**
- Adjust top margin in `ProfileSelection.tsx`.

**Step 2: Fix Dock Overlap**
- Increase bottom padding in `ProfileSelection.tsx` (`pb-32` to `pb-40`).

**Step 3: Commit**
```bash
git add src/features/attendance/components/ProfileSelection.tsx src/shared/components/BottomTabs.tsx
git commit -m "fix: mobile layout clipping and overlap issues"
```

---

### Task 6: Verification
**Step 1: Verify Admin Unlock button alignment**
- Check visually in browser at various widths.

**Step 2: Verify Password Hashing**
- Create a new profile.
- Verify in Supabase console that the password is a `$2a$` hash.
- Log in with the new profile.
- Log in with an old profile (verify migration).

**Step 3: Verify Mobile Layout**
- Use browser devtools to check 390px width.
