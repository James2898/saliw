# Spec — Navbar UI Enhancements (Tooltip, Auth Greeting, Logout Modal)

## Feature Summary

Three UI enhancements are added to the existing `Navbar` client component (`src/components/client/navbar.tsx`). First, a tooltip is shown on hover of the login button (unauthenticated state) reading "Sign in to Saliw". Second, when a user is authenticated, a greeting — "Hi, {full_name}!" — is displayed in the desktop navbar and mobile sidebar footer; if `full_name` is null, the fallback is "Hi there!". Third, pressing the logout button (desktop or mobile) opens a confirmation modal before executing sign-out; the user must confirm before `supabase.auth.signOut()` is called. All UI must use the Artisan Palette and follow existing component patterns.

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
16. The logout button tooltip ("Sign out") is added for parity and accessibility — visible on hover in desktop navbar. (This is the `aria-label` already present; a visible tooltip is required to match the login tooltip UX pattern.)
17. No new npm packages are introduced without explicit user approval.
18. The feature branch is named `feature/TASK-009-navbar-ui-enhancements` (or next sequential TASK ID) from the `develop` base branch.

## Out of Scope

- Changing the sign-out Server Action or auth flow beyond intercepting the button click.
- Adding the user's avatar or profile photo.
- Modifying navigation links or their active states.
- Implementing any new Supabase RLS policies (the existing `profiles_select_own` policy is sufficient).
- Adding animations beyond what Tailwind `transition-*` utilities provide.
- Supporting a "remember me" or session persistence setting.

## Fallback Behaviors

- If the `profiles` table query for `full_name` fails or returns null: display "Hi there!" — never show a raw error or leave the greeting blank.
- If the `profiles` query is loading (brief async gap after auth state fires): render nothing in the greeting slot until the name resolves, then fade in. An empty string is acceptable during the loading window; a loading spinner is not required.

## Resolved Ambiguities

- **Where does full name come from?** → `profiles.full_name` column (authoritative per `profileActions.ts` and migration `20260415000000_create_profiles_table.sql`). Client-side fetch using `createBrowserClient` is safe because RLS `profiles_select_own` ensures a user can only read their own row.
- **What if full_name is null?** → Fallback to "Hi there!" — resolved from task description intent and Profile type definition (`full_name: string | null`).
- **Does the mobile sidebar also need the greeting and modal?** → Yes. The sidebar has a duplicate auth button (lines 344–358 in navbar.tsx). Consistency requires the same tooltip (login) and modal (logout) behavior, and the same greeting in the sidebar footer.
- **Tooltip trigger mechanism?** → CSS `:hover` group pattern with `relative`/`absolute` positioning, or a `useState`-gated `div`. No third-party library. Resolved from anti-pattern guidance (no new deps without approval).
- **Tooltip for logout button?** → Yes — criterion 16 adds a visible tooltip for logout ("Sign out") to match the login tooltip UX. The `aria-label` already exists; a visible tooltip is additive and required for parity.
- **Modal as separate component or inline?** → Separate Client Component at `src/components/client/logout-modal.tsx` to keep navbar manageable. The modal is rendered conditionally inside `Navbar` via a `showLogoutModal` state boolean.

## Open Questions (Blocking)

- None.
