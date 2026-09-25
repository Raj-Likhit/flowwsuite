# Design Doc: Admin Portal Polish & Security Hardening

## Overview
This design covers the visual polish of the Admin Portal login page, performance optimization of animations to eliminate "jank", implementation of secure password hashing, and mobile view layout fixes.

## Proposed Changes

### 1. UI ALIGNMENT (Admin Portal Login)
- **File**: `AdminLayout.tsx`
- **Issue**: The `ArrowRight` button inside the password input is vertically offset and overlaps the border.
- **Solution**: 
  - Ensure the parent `div` has `display: flex` and `items-center` for robust vertical centering.
  - Standardize the `px-6 py-5` input height and explicitly position the button at a consistent `right-2` or `right-3`.
  - Add `pointer-events-none` to the `AnimatePresence` wrapper to ensure it doesn't block clicks if it accidentally overlaps.

### 2. PERFORMANCE OPTIMIZATION
- **Files**: `AdminLayout.tsx`, `AdminDashboard.tsx`
- **Goal**: Resolve "janky" scrolling and animations.
- **Optimization Strategy**:
  - **Reduce Blur**: Large `blur-[140px]` elements are extremely expensive. We will reduce this to a more performant `blur-[64px]` or `blur-[80px]`.
  - **GPU Acceleration**: Ensure all animated elements have `will-change: transform`.
  - **Throttle Animations**: Replace `animate-pulse` on large backgrounds with a slower, opacity-only transition or eliminate it in favor of a static gradient if performance remains low.
  - **Simplify Variants**: Review `framer-motion` variants in `AdminDashboard.tsx` to ensure `layout` prop isn't causing excessive reflows on every frame.

### 3. SECURITY HARDENING (PASSWORD HASHING)
- **Files**: `ProfileSelection.tsx`, `useAttendanceStore.ts`
- **Goal**: Eliminate plain-text password storage.
- **Approach**:
  - **Library**: `bcryptjs` (lightweight, zero-dependency).
  - **Implementation**:
    - **Registration**: Hash the user's password before calling `supabase.from('profiles').insert()`.
    - **Login**: Use `bcrypt.compare()` to verify the entered password against the stored hash.
    - **Legacy Compatibility**: Implement a "Check & Upgrade" logic. If `storedPassword === inputPassword` (plain match) and the stored password does *not* look like a bcrypt hash, allow login and immediately trigger a background update to replace the plain-text password with its hash.
  - **Admin Unlock**: The 'AdminUnlock' hardcoded string has been completely removed in favor of pure RBAC checking.

### 4. MOBILE VIEW OPTIMIZATION
- **Issues**: Clipping titles, dock overlapping cards, large headers.
- **Fixes**:
  - **Typography**: Scale down `text-4xl` to `text-2xl` for mobile screens using `text-2xl sm:text-4xl`.
  - **Spacing**: Add a safety margin (`pb-32`) to the profile selection grid to ensure the bottom dock doesn't obscure the cards.
  - **Clipping**: Use `overflow-y-auto` and `max-h-screen` on mobile to prevent content from going under the fold without scrolling.

## Verification Plan

### Automated Tests
- Browser test to verify login flow (both hashed and legacy plain-text).
- Vertical alignment check in various browser widths.

### Manual Verification
- Review on mobile device/emulator to confirm heading sizes and card visibility.
- Monitor console performance logs for drop-frames during dashboard entrance.
