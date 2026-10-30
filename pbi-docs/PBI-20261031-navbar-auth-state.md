# PBI-20261031 — Navbar Auth State Synchronization After Login

- **Saved:** 2026-10-31
- **Source:** User request + `/design-grill` decisions & recommendations (chat, 2026-10-31)

---

## PBI (verbatim)

### Original request

> there is an issue where after i login on the saliw the nav bar doesnt update, the login button is still there and it still looks like the user is not logged unless i've done a refresh

### Grill Decisions & Recommendations (2026-10-31)

| # | Topic | Decision / Recommendation | Source | Spec Section |
|---|---|---|---|---|
| Q1.1 | State Architecture | **Route-Aware Client Component**: Keep `Navbar` self-contained and synchronize auth state on client-side route changes (`pathname`). Do not introduce a global `AuthProvider` or wrap `RootLayout`. | Lean Change Rules & Next.js RSC conventions | Scope & Architecture |
| Q1.2 | Login Action Contract | **Preserve Server `redirect('/')`**: Keep `signInWithPasswordAction` unchanged. The client `Navbar` will catch the route transition from `/login` to `/` to re-sync its session. | `TASK-006` / `TASK-025` specs & existing tests | Scope & AC |
| Q1.3 | Session Inspection | **`getSession()` for client UI transitions**: Read local cookies via `supabase.auth.getSession()` on route changes for 0ms network latency. Rely on `middleware.ts` for authoritative server-side JWT verification. | Supabase SSR documentation | Performance & NFR |
| Q1.4 | Profile Retrieval | **Optimistic Metadata Display**: Set `fullName` immediately from `user.user_metadata?.full_name` upon detecting the user, then query `profiles` table in the background for authoritative updates to avoid layout shift ("Hi, there!" -> "Hi, {name}!"). | UX / Performance | User Behavior & UI |
| Q1.5 | Multi-Tab Sync | **Tab Visibility Listener**: Re-sync session state when `document.visibilityState === "visible"` so logging in or out in another tab updates immediately upon switching back. | Production Resilience | Edge Cases & State |
| Q1.6 | Visual Flicker | **Smooth Transition**: Prevent flash of the guest "Sign In" button during post-login route transition by checking session presence synchronously/immediately on route change. | UX / Accessibility | Acceptance / DoD |
| Q1.7 | Auth Callback Scope | **Exclude `/auth/callback/route.ts`**: PKCE callback performs full HTTP navigation (`NextResponse.redirect`) and already works; scope is strictly limited to soft navigation following Server Action login. | Codebase inspection | Scope Boundary |

---

## Analysis

### Acceptance Criteria

- [ ] **Post-login immediate update**: After submitting the login form on `/login`, upon being redirected to `/`, `Navbar` immediately displays the authenticated state (greeting, logout trigger, and `/musicians` link) without requiring a manual browser refresh (F5).
- [ ] **Sign-in button replacement**: The guest "Sign In" button is no longer visible on `/` once the user lands from a successful login.
- [ ] **Route transition awareness**: `Navbar` re-evaluates its authentication session whenever the active route path (`pathname`) changes.
- [ ] **Optimistic greeting**: `Navbar` immediately displays `user.user_metadata.full_name` (if present) in the greeting while the authoritative `profiles` row is fetched, preventing a delayed flash from "Hi, there!" to "Hi, {name}!".
- [ ] **Authoritative profile sync**: Once the `profiles` query finishes, `fullName` is updated to the `profiles.full_name` value if it differs from metadata.
- [ ] **Multi-tab visibility synchronization**: When the user switches back to an inactive Saliw tab (`document.visibilityState === "visible"`), `Navbar` checks auth state and reflects any login or logout that occurred in another window/tab.
- [ ] **Logout flow preservation**: The modal-driven logout flow in `Navbar` continues to sign the user out immediately, update `Navbar` to the guest state, and clear errors/loading indicators without regression.
- [ ] **Server action integrity**: `signInWithPasswordAction` in `src/app/actions/authActions.ts` retains its existing signature, behavior, and server-side `redirect('/')` without modification.
- [ ] **No global provider wrapper**: The application is not wrapped in an `AuthProvider` context; `RootLayout` remains clean and server-first.

---

### Scope & Out-of-Scope

- **In scope:**
  - Updating `src/components/client/navbar.tsx` to listen to route transitions (`usePathname()`) and document visibility (`visibilitychange`).
  - Synchronizing `user` and `fullName` state on transition from `/login` to `/` (and any other authenticated destination).
  - Optimistic fallback for user display name using `user.user_metadata`.
  - Regression testing on existing desktop and mobile navigation links (including role-gated `/musicians`).
- **Out of scope:**
  - Modifying `src/app/actions/authActions.ts` or `src/components/client/LoginForm.tsx`.
  - Introducing an `AuthProvider` or React Context into `src/app/layout.tsx`.
  - Changing `/auth/callback/route.ts` or modifying OAuth / PKCE email redirect behavior.
  - Modifying Supabase database tables or RLS policies.
  - Redesigning visual themes, colors, or typography of `Navbar`.

---

### Ambiguities & Risks

1. **Client inspection network overhead (Mitigated):**
   - *Risk:* Calling `supabase.auth.getUser()` on every route change would fire an HTTP request to Supabase GoTrue on every internal link click, causing latency and risk of rate limiting.
   - *Mitigation:* Use `supabase.auth.getSession()` for client-side route transitions, which reads `document.cookie` synchronously. `src/middleware.ts` already validates the JWT with `getUser()` server-side on every request, guaranteeing cookie integrity.
2. **Race condition during profile fetch:**
   - *Risk:* If a user rapidly clicks navigation links, multiple concurrent `supabase.from("profiles")` queries could resolve out of order.
   - *Mitigation:* Use an active effect flag (e.g., `let isCurrent = true; ... return () => { isCurrent = false; }`) to ignore stale responses.
3. **Flash of unauthenticated state:**
   - *Risk:* If session state briefly resets to `null` during re-synchronization, the "Sign In" button might flicker for a single render frame.
   - *Mitigation:* Ensure `syncSession` only updates `user` when the session actually differs from current state.

---

### Codebase-Aware Notes

- **Primary modification target:**
  - [`src/components/client/navbar.tsx`](file:///C:/Users/James2898/.gemini/antigravity/worktrees/saliw/fix_navbar_auth_state/src/components/client/navbar.tsx):
    - Currently lines 68–99 register `onAuthStateChange` inside `useEffect` with dependency `[]`.
    - Needs to incorporate `pathname` (from `usePathname()`, already imported at line 5 and called at line 36) in the effect dependencies or trigger a dedicated `syncSession` function.
    - Add `visibilitychange` listener for cross-tab synchronization.
    - Set `currentUser.user_metadata?.full_name` optimistically before awaiting `profiles.select("full_name")`.
- **Verified existing callers & patterns (must NOT break):**
  - [`src/app/actions/authActions.ts#L20-L34`](file:///C:/Users/James2898/.gemini/antigravity/worktrees/saliw/fix_navbar_auth_state/src/app/actions/authActions.ts#L20-L34): `signInWithPasswordAction` calls `redirect('/')`.
  - [`src/components/client/LoginForm.tsx#L33-L41`](file:///C:/Users/James2898/.gemini/antigravity/worktrees/saliw/fix_navbar_auth_state/src/components/client/LoginForm.tsx#L33-L41): Form invocation via `startPasswordTransition`.
  - [`src/middleware.ts#L59-L67`](file:///C:/Users/James2898/.gemini/antigravity/worktrees/saliw/fix_navbar_auth_state/src/middleware.ts#L59-L67): Ensures session cookies are refreshed on every request.
  - [`src/components/client/logout-modal.tsx`](file:///C:/Users/James2898/.gemini/antigravity/worktrees/saliw/fix_navbar_auth_state/src/components/client/logout-modal.tsx): Consumed by `Navbar` for sign-out confirmation.
