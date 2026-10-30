<Spec — Navbar Auth State Synchronization After Login>
## Feature Summary
Currently, after a user logs in via the `/login` page and is redirected to `/` by the server action `signInWithPasswordAction`, the client-side `Navbar` component fails to reflect the authenticated state, leaving the guest "Sign In" button visible and withholding authenticated navigation elements until a manual browser refresh (F5). This feature updates `Navbar` to become route-transition aware and tab-visibility aware, synchronizing authentication session state via `supabase.auth.getSession()` on route changes (`usePathname()`) and window focus (`visibilitychange`), immediately showing optimistic user metadata while asynchronously resolving the authoritative profile, without requiring an `AuthProvider` wrapper or modifying server actions.

## Acceptance Criteria
1. After submitting the login form on `/login` and redirecting to `/` (or another route), `Navbar` immediately displays the authenticated state on both desktop and mobile drawer views without requiring a page refresh (F5).
2. The guest "Sign In" button is no longer visible on `/` once the user lands from a successful login, replaced by the authenticated greeting, logout trigger, and role-appropriate navigation items (e.g., `/musicians`).
3. `Navbar` re-evaluates its authentication session whenever the active route path (`pathname`) changes using `usePathname()`.
4. If `user.user_metadata?.full_name` is present, `Navbar` immediately renders this name in the greeting while the authoritative `profiles` row is fetched in the background, preventing an unstyled or delayed visual flash.
5. Once the background `profiles` query finishes, `Navbar` updates the displayed greeting to `profiles.full_name` if it differs from metadata.
6. If neither `user.user_metadata?.full_name` nor `profiles.full_name` is present, or if the profile query encounters an error, `Navbar` falls back to the default greeting (e.g. `<must match codebase convention — see context.md "Patterns to Follow">`, such as "Hi, there!") without crashing or throwing unhandled promise rejections.
7. When the document visibility changes to visible (`document.visibilityState === "visible"` via `visibilitychange`), `Navbar` checks auth state and reflects any login or logout that occurred in another window or tab.
8. The existing modal-driven logout workflow in `Navbar` continues to sign out the user, update `Navbar` to the guest state, close modals, and reset state without regression.
9. `signInWithPasswordAction` in `src/app/actions/authActions.ts` retains its existing signature, behavior, and server-side `redirect('/')` without modification.
10. The application is not wrapped in an `AuthProvider` context; `src/app/layout.tsx` remains clean and server-first.
11. Event listeners attached for `visibilitychange` are properly removed on component unmount to prevent memory leaks.

## Out of Scope
- Modifying `src/app/actions/authActions.ts` or `src/components/client/LoginForm.tsx`.
- Modifying `src/app/layout.tsx` or introducing a global React Context / `AuthProvider`.
- Modifying `/auth/callback/route.ts` or modifying OAuth / PKCE email redirect behavior.
- Modifying Supabase database tables, schemas, or RLS policies.
- Redesigning visual themes, colors, or typography of `Navbar`.

## Fallback Behaviors
- **Missing or Failed Profile Fetch**: If the `profiles` query fails (e.g. network disconnect or RLS denial), `Navbar` retains the optimistic metadata (`user.user_metadata?.full_name`) or the default greeting ("Hi, there!") and logs/handles the error gracefully without throwing an uncaught exception or locking the UI.
- **Null or Invalid Session**: If `supabase.auth.getSession()` returns null or fails, `Navbar` safely falls back to the unauthenticated/guest state (displaying "Sign In") without breaking component rendering.

## Resolved Ambiguities
- **State Management Architecture** → Resolved via `/design-grill` (Q1.1): Keep `Navbar` self-contained and synchronize state via route transition (`usePathname()`) and visibility changes rather than introducing a global `AuthProvider` or wrapping `RootLayout`.
- **Server Action vs Client Coordination** → Resolved via `/design-grill` (Q1.2): Server action `signInWithPasswordAction` keeps its `redirect('/')` contract; client catches soft navigation on route change.
- **Client Session Verification Method** → Resolved via `/design-grill` (Q1.3): Use `supabase.auth.getSession()` on route changes for immediate (0ms local cookie read) client UI rendering; middleware and server components enforce authoritative verification.
- **Greeting Display Shift / Flicker** → Resolved via `/design-grill` (Q1.4, Q1.6): Read `user.user_metadata?.full_name` optimistically to avoid flash of "Hi, there!" or "Sign In" before profile fetch completes.
- **Multi-Tab Session State** → Resolved via `/design-grill` (Q1.5): Attach `visibilitychange` listener to sync state when returning to the tab.
- **Scope Boundary with Auth Callback** → Resolved via `/design-grill` (Q1.7): `/auth/callback/route.ts` is out of scope as it performs a hard HTTP redirect that already works.