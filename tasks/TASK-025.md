# TASK-025 — Dashboard as Root Route

- **Tier:** 1
- **Date Created:** 2026-04-24
- **Status:** In Progress

---

## Feature Summary

The current `/dashboard` route — which serves both the authenticated dashboard view and the public marketing preview (`PublicDashboardView`) for guests — is promoted to the application root `/`. The existing `src/app/page.tsx` (an Artisan UI component demo left from TASK-003) is replaced entirely with the dashboard page content. The `src/app/dashboard/` directory is removed; any request to `/dashboard` or `/dashboard?*` is permanently redirected (HTTP 308) to `/`. The sub-route `/dashboard/profile` moves to `/profile`. All navigation links, active-state logic, middleware protection entries, and page metadata are updated accordingly. No dashboard widget content or visual design changes.

---

## Acceptance Criteria

1. Visiting `/` (root) renders the full dashboard — the authenticated view for logged-in users and the public marketing/preview view (`PublicDashboardView`) for unauthenticated visitors — identical in content and behaviour to the previous `/dashboard` route.
2. Visiting `/dashboard` (exact) returns an HTTP 308 permanent redirect to `/`, preserving no query string on the redirect target (i.e. `/dashboard?foo=bar` → `/`). The redirect is implemented via a Next.js `next.config.ts` redirect rule, not a page-level component.
3. Visiting `/dashboard/profile` returns an HTTP 308 permanent redirect to `/profile`.
4. The profile page is accessible at `/profile` and continues to require authentication (unauthenticated visitors are redirected to `/login`).
5. `src/app/page.tsx` contains the full dashboard data-fetching and rendering logic previously in `src/app/dashboard/page.tsx`. It handles both the authenticated and unauthenticated (guest) paths.
6. `src/app/dashboard/` directory and all files inside it are deleted.
7. The root page is wrapped in the same layout shell previously provided by `src/app/dashboard/layout.tsx` (`min-h-screen bg-brand-cream p-4 sm:p-8`, centered `max-w-5xl`, `Card` wrapper). This wrapper is inlined directly in the return value of `src/app/page.tsx` — it is not a separate layout file and must not affect other top-level routes (`/library`, `/setlists`, `/login`).
8. The `navLinks` array in `src/components/client/navbar.tsx` is updated so the Dashboard entry has `href: '/'`.
9. The active-state detection in the navbar for the Dashboard link correctly highlights the link when `pathname === '/'` only (not for every route). The current `pathname.startsWith(href + '/')` guard must not fire when `href` is `'/'`.
10. The middleware `PROTECTED_PATHS` array in `src/middleware.ts` is updated: `/dashboard/profile` is replaced with `/profile`.
11. The `metadata` export on `src/app/page.tsx` (the new root dashboard page) has `title: 'Dashboard — Saliw'`.
12. The global `RootLayout` metadata in `src/app/layout.tsx` (`title: 'Saliw — Worship Music Portal'`) is unchanged; the page-level `metadata` on `src/app/page.tsx` overrides it for the root route only.
13. After sign-in via password (`signInWithPasswordAction`) the user is redirected to `'/'` — this is already the case and must remain unchanged.
14. After sign-in via magic link (PKCE callback at `/auth/callback`) the user is redirected to `'/'` — this is already the case and must remain unchanged.
15. After logout, `router.refresh()` is called (existing behaviour in navbar) — no change required, but must not be broken.
16. No console errors or build warnings are introduced by the changes.
17. `next build` completes with zero TypeScript errors and zero React Compiler bail-outs.

---

## Out of Scope

- Changing the content or visual design of the dashboard widgets
- Adding new authentication flows or role-based redirects beyond what currently exists
- Removing or modifying the `/library` or `/setlists` routes
- Any changes to the internals of `PublicDashboardView`, `GreetingStrip`, `NextUpCard`, `QuickActions`, `RecentSongs`, or `UpcomingSetlists`
- Dark mode or theme changes
- SEO/Open Graph meta tags beyond the page `title`

---

## Relevant Files

| File | Purpose |
|------|---------|
| `src/app/page.tsx` | Replace entirely with the dashboard logic (data-fetching + render, both auth and guest paths, layout shell inlined) |
| `src/app/dashboard/page.tsx` | Source to migrate into `src/app/page.tsx`, then deleted |
| `src/app/dashboard/layout.tsx` | Source for the Card+padding layout shell to inline into `src/app/page.tsx`, then deleted |
| `src/app/dashboard/profile/page.tsx` | Move to `src/app/profile/page.tsx` |
| `src/components/client/navbar.tsx` | Update Dashboard `navLinks` entry `href` to `'/'` and fix active-state exact-match guard |
| `src/middleware.ts` | Replace `/dashboard/profile` with `/profile` in `PROTECTED_PATHS` |
| `next.config.ts` | Add two 308 permanent redirects: `/dashboard` → `/` and `/dashboard/profile` → `/profile` |
| `src/app/layout.tsx` | Verify `RootLayout` metadata title is unchanged (`'Saliw — Worship Music Portal'`) |
| `src/app/actions/authActions.ts` | Verify `signInWithPasswordAction` still redirects to `'/'` (must not regress) |
| `src/app/auth/callback/route.ts` | Verify PKCE callback still redirects to `'/'` by default (must not regress) |

---

## Technical Schema

N/A — no API contract required for this task.

---

## Planning Artifacts

| Artifact | Path | Description |
|----------|------|-------------|
| Feature Specification | `tasks/TASK-025/spec.md` | Acceptance criteria + scope + resolved ambiguities |
| Research Notes | `tasks/TASK-025/research.md` | Open questions (none remaining) |

---

## Implementation Notes

- Read `docs/coding-guidelines.md` before writing any code.
- Read `docs/tech-stack.md` before choosing any library or package.
- Read `docs/structure.md` before creating any new file or directory.
- `src/app/dashboard/` must be fully deleted (directory + all contents). Do not leave any orphaned files.
- The layout shell wrapper (`min-h-screen bg-brand-cream p-4 sm:p-8`, `max-w-5xl mx-auto`, `Card`) must be inlined in `src/app/page.tsx`'s JSX return — do not create a new `(dashboard)/layout.tsx` or modify `src/app/layout.tsx`, as that would propagate the shell to all routes.
- For the navbar active-state fix: the guard must special-case `href === '/'` to use `pathname === '/'` (exact equality) rather than the `startsWith` variant. All other nav links with non-root hrefs are unaffected.
- The `next.config.ts` redirects must use `permanent: true` (which Next.js maps to HTTP 308 for App Router). The source for `/dashboard` should not forward query strings — use `source: '/dashboard'` without a `:path*` wildcard. Separately, add `source: '/dashboard/profile'` → `destination: '/profile'`.
- `src/app/profile/page.tsx` (moved from `src/app/dashboard/profile/page.tsx`) must preserve the existing authentication guard that redirects unauthenticated users to `/login`.
- Do not modify `signInWithPasswordAction` or `/auth/callback/route.ts` — they already redirect to `'/'`. Verify, but do not change.
- No widget component files are touched. Only routing, layout shell wiring, nav links, middleware, and redirects change.
- After implementation, run `next build` locally to confirm zero TypeScript errors and zero React Compiler bail-outs before handing off to `@release-manager`.

---

## Amendments (from Context Bundle)

> No `context.md` was produced for this task. No anti-patterns or MEMORY.md notes flagged. No amendments required.

---

## Resolution

- **Completed:** 2026-04-24
- **Branch:** `feature/TASK-025-dashboard-as-root`
- **Base branch:** `develop`
- **Files changed:**
  - `src/app/page.tsx` — replaced TASK-003 demo with full dashboard logic (data-fetching + auth check + layout shell inlined)
  - `src/app/profile/page.tsx` — new file; moved from `src/app/dashboard/profile/page.tsx`; unauthenticated redirect updated to `/login`
  - `src/app/dashboard/page.tsx` — deleted
  - `src/app/dashboard/layout.tsx` — deleted
  - `src/app/dashboard/profile/page.tsx` — deleted (moved to `src/app/profile/page.tsx`)
  - `src/app/dashboard/.gitkeep` — deleted
  - `src/components/client/navbar.tsx` — Dashboard `href` changed to `'/'`; `isActive` guard updated to exact-match only for `href === '/'` in both desktop and mobile nav
  - `src/middleware.ts` — replaced `/dashboard/profile` with `/profile` in `PROTECTED_PATHS`; updated comment
  - `next.config.ts` — added 308 permanent redirects `/dashboard` → `/` and `/dashboard/profile` → `/profile`
- **Notes:**
  - `next build` passes with zero TypeScript errors and zero React Compiler bail-outs. Pre-existing ESLint warnings in `ServiceNavigator.tsx` and `useSetlistSync.ts` are unrelated to this task.
  - The profile page's page-level auth guard was updated to redirect unauthenticated users to `/login` (previously redirected to `/`), which is the correct behaviour now that middleware protects `/profile`.
  - `signInWithPasswordAction` and `/auth/callback` already redirect to `'/'` — verified, no change needed.
  - The `PublicDashboardView` guest path does not render the Card+padding layout shell; it manages its own layout internally (same behaviour as before).
