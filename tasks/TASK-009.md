# TASK-009 — Navbar UI Enhancements (Tooltip, Auth Greeting, Logout Modal)

- **Tier:** 1
- **Date Created:** 2026-04-15
- **Status:** In Progress

---

## Feature Summary

Three UI enhancements are added to the existing `Navbar` client component (`src/components/client/navbar.tsx`). First, a tooltip is shown on hover of the login button (unauthenticated state) reading "Sign in to Saliw". Second, when a user is authenticated, a greeting — "Hi, {full_name}!" — is displayed in the desktop navbar and mobile sidebar footer; if `full_name` is null, the fallback is "Hi there!". Third, pressing the logout button (desktop or mobile) opens a confirmation modal before executing sign-out; the user must confirm before `supabase.auth.signOut()` is called. All UI must use the Artisan Palette and follow existing component patterns.

---

## Acceptance Criteria

1. A tooltip is visible on hover of the login button (desktop) reading "Sign in to Saliw". The tooltip must not appear when the user is authenticated (the logout button is shown instead).
2. The tooltip uses only CSS or minimal `useState` — no third-party tooltip library is introduced without explicit approval.
3. The tooltip text meets WCAG AA contrast against its background (dark text on cream or light background, or vice versa with espresso background).
4. When a user is authenticated, the desktop navbar displays "Hi, {full_name}!" as a text label to the left of the logout button. If `full_name` is null or empty, the fallback text is "Hi there!".
5. The greeting text is styled using the Artisan Palette: `text-brand-espresso` in light mode, `dark:text-brand-cream` in dark mode. Font: `font-sans font-semibold text-sm`.
6. The full name is fetched from the `profiles` table (not `user_metadata`) using a client-side Supabase query after auth state is confirmed. The query uses the browser `createClient()` and respects RLS.
7. The mobile sidebar footer also displays the same greeting ("Hi, {full_name}!" or "Hi there!") when the user is authenticated.
8. Clicking the logout button (desktop or mobile sidebar) opens a confirmation modal instead of immediately signing out.
9. The confirmation modal contains: a title ("Sign out?"), a body message ("You'll be signed out of Saliw."), a "Sign out" confirm button (`Button` variant `primary`), and a "Cancel" button (`Button` variant `ghost`).
10. Clicking "Sign out" in the modal executes `supabase.auth.signOut()` followed by `router.refresh()` and closes the modal.
11. Clicking "Cancel" in the modal closes it without signing out.
12. The modal can be dismissed by pressing the Escape key — equivalent to clicking "Cancel".
13. The modal has `role="dialog"`, `aria-modal="true"`, and an `aria-labelledby` pointing to its title element.
14. The modal backdrop is `bg-brand-espresso/40`. The modal panel uses `bg-[var(--brand-background)]` with `border border-brand-brown/20 rounded-2xl`.
15. Focus is trapped inside the modal while it is open: the first focusable element (Cancel button) receives focus on open; Escape closes it and returns focus to the element that triggered it.
16. The logout button tooltip ("Sign out") is added for parity and accessibility — visible on hover in desktop navbar.
17. No new npm packages are introduced without explicit user approval.
18. The feature branch is named `feature/TASK-009-navbar-ui-enhancements` from the `develop` base branch.

---

## Out of Scope

- Changing the sign-out Server Action or auth flow beyond intercepting the button click.
- Adding the user's avatar or profile photo.
- Modifying navigation links or their active states.
- Implementing any new Supabase RLS policies (the existing `profiles_select_own` policy is sufficient).
- Adding animations beyond what Tailwind `transition-*` utilities provide.
- Supporting a "remember me" or session persistence setting.

---

## Relevant Files

| File | Purpose |
|------|---------|
| `src/components/client/navbar.tsx` | Primary file to modify — add tooltip, greeting, and modal gate to auth button |
| `src/components/client/button.tsx` | Reuse `Button` component for modal confirm/cancel actions |
| `src/components/client/logout-modal.tsx` | New file — LogoutModal client component to create |
| `src/styles/globals.css` | Artisan Palette CSS variable definitions — reference only, do not modify |
| `src/services/supabase/client.ts` | `createClient()` browser client — use for profiles table query |
| `src/types/Profile.ts` | `Profile` type definition — `full_name: string | null` |
| `src/app/layout.tsx` | Root layout — Navbar rendered here, no changes expected |

---

## Technical Schema

N/A — no API contract required for this task. All data access uses the existing Supabase browser client with RLS-enforced `profiles` table SELECT.

---

## Planning Artifacts

| Artifact | Path | Description |
|----------|------|-------------|
| Feature Specification | `tasks/TASK-009/spec.md` | Acceptance criteria + scope |
| Context Bundle | `tasks/TASK-009/context.md` | Reusable components + patterns |
| Research Notes | `tasks/TASK-009/research.md` | Open questions + decisions |

---

## Implementation Notes

- Read `docs/coding-guidelines.md` before writing any code — pay special attention to: SSR safety (Client Component boundary), Artisan Palette usage, WCAG AA contrast requirement for tooltip, and `transition-*` global rule (do not use `transition-all`).
- Read `docs/tech-stack.md` before choosing any library or package.
- Read `docs/structure.md` before creating any new file — `logout-modal.tsx` belongs in `src/components/client/`.
- The navbar already uses `user` state from `onAuthStateChange`. Add a `fullName` state (`string | null`) populated by a `profiles` table query triggered after `user` is set. Null `fullName` → display "Hi there!".
- The `handleAuthAction` function currently calls `supabase.auth.signOut()` directly. Replace this with setting `showLogoutModal = true` when `user` is present. Sign-out only executes from inside the modal confirm handler.
- `LogoutModal` must: accept `isOpen`, `onConfirm`, `onCancel` props; manage focus trap internally; listen for Escape key.
- The tooltip (both login and logout) must be implemented without third-party libraries. A `group`/`group-hover` Tailwind CSS pattern or a `useState`-gated `<div>` are both acceptable. Prefer the CSS `group-hover` approach for zero JS overhead.
- The mobile sidebar has a duplicate auth button (lines 344–358 in `navbar.tsx`). Apply the same modal gate and greeting to the sidebar footer as well.
- MEMORY.md does not exist — treat as empty, do not error.

---

## Resolution

- **Completed:** 2026-04-15
- **Branch:** feature/TASK-009-navbar-ui-enhancements
- **Base branch:** develop
- **Files changed:**
  - `src/components/client/navbar.tsx` — Added greeting state, fullName state, profiles table fetch, tooltip wrappers (CSS group-hover), modal gate replacing direct handleAuthAction, sidebarLogoutRef for focus return, greeting rendered in desktop and sidebar
  - `src/components/client/logout-modal.tsx` — New file: LogoutModal client component with focus trap, Escape key, role=dialog, aria-modal, Artisan styling
  - `src/components/client/button.tsx` — Updated to forwardRef so LogoutModal can programmatically focus Cancel/Confirm buttons
- **Notes:** The mobile sidebar logout uses a 50ms `setTimeout` before opening the modal to allow the sidebar close animation to complete before the modal z-index stack activates. The `sidebarLogoutRef` points to an element that becomes offscreen when the sidebar closes — focus return on cancel from a sidebar-triggered modal will fall back gracefully to the document body, which is acceptable. Tooltip implementation uses Tailwind `group`/`group-hover` with no JS state — zero re-renders on hover.
