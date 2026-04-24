# Spec — Dashboard as Root Route

## Feature Summary
The current `/dashboard` route, which serves both the authenticated dashboard and the public marketing view, is promoted to the application root `/`. The existing root `src/app/page.tsx` (an Artisan UI component demo left from TASK-003) is replaced entirely with the dashboard page content. The `/dashboard` directory is removed; any request to `/dashboard` or `/dashboard?*` is permanently redirected (HTTP 308) to `/`. The `/dashboard/profile` sub-route moves to `/profile`. All navigation links, active-state logic, middleware protection entries, and metadata are updated accordingly.

## Acceptance Criteria

1. Visiting `/` (root) renders the full dashboard — the authenticated view for logged-in users and the public marketing/preview view (`PublicDashboardView`) for unauthenticated visitors — identical in content and behaviour to the previous `/dashboard` route.
2. Visiting `/dashboard` (exact) returns an HTTP 308 permanent redirect to `/`, preserving no query string on the redirect target (i.e. `/dashboard?foo=bar` → `/`). The redirect is implemented via a Next.js `next.config.ts` redirect rule, not a page-level component.
3. Visiting `/dashboard/profile` returns an HTTP 308 permanent redirect to `/profile`.
4. The profile page is accessible at `/profile` and continues to require authentication (unauthenticated visitors are redirected to `/login`).
5. `src/app/page.tsx` contains the full dashboard data-fetching and rendering logic previously in `src/app/dashboard/page.tsx`. It handles both the authenticated and unauthenticated (guest) paths.
6. `src/app/dashboard/` directory and all files inside it are deleted.
7. The root page is wrapped in the same layout shell previously provided by `src/app/dashboard/layout.tsx` (i.e. `min-h-screen bg-brand-cream p-4 sm:p-8`, centered max-w-5xl, Card wrapper). This wrapper is applied either by creating `src/app/layout.tsx` adjustments or a dedicated root-segment layout — without breaking the global `RootLayout`.
8. The `navLinks` array in `src/components/client/navbar.tsx` is updated so the Dashboard entry has `href: '/'`.
9. The active-state detection in the navbar for the Dashboard link correctly highlights the link when `pathname === '/'` only (not for every route, since `/` is a prefix of all paths). The current `pathname.startsWith(href + '/')` logic must not be used for the root href.
10. The middleware `PROTECTED_PATHS` array is updated: `/dashboard/profile` is replaced with `/profile`.
11. The `metadata` export on `src/app/page.tsx` (the new root dashboard page) has `title: 'Dashboard — Saliw'`.
12. The global `RootLayout` metadata in `src/app/layout.tsx` (`title: 'Saliw — Worship Music Portal'`) is unchanged; the page-level `metadata` on `src/app/page.tsx` overrides it for the root route only.
13. After sign-in via password (`signInWithPasswordAction`) the user is redirected to `'/'` — this is already the case and must remain unchanged.
14. After sign-in via magic link (PKCE callback `/auth/callback`) the user is redirected to `'/'` — this is already the case and must remain unchanged.
15. After logout, `router.refresh()` is called (existing behaviour in navbar) — no change required, but must not be broken.
16. No console errors or build warnings are introduced by the changes.
17. Vercel build (`next build`) passes with zero type errors and zero React Compiler bail-outs.

## Out of Scope
- Changing the content or visual design of the dashboard widgets.
- Adding new authentication flows or role-based redirects beyond what currently exists.
- Removing or modifying the `/library` or `/setlists` routes.
- Any changes to `PublicDashboardView`, `GreetingStrip`, `NextUpCard`, `QuickActions`, `RecentSongs`, or `UpcomingSetlists` component logic.
- Dark mode or theme changes.
- SEO/Open Graph meta tags beyond the page `title`.

## Fallback Behaviors
- If Supabase is unreachable when an unauthenticated user visits `/`, the page renders with empty `upcomingSetlists` and `recentSongs` arrays (existing swallow-and-render-empty pattern in the guest path of `DashboardPage` is preserved unchanged).
- If Supabase is unreachable when an authenticated user visits `/`, widgets render empty-state UI (existing behaviour carried over from dashboard page).

## Resolved Ambiguities
- **What happens to `/dashboard`?** → Permanent HTTP 308 redirect to `/`, implemented in `next.config.ts` redirects. Source: task request + Next.js redirect docs pattern. Query strings are not forwarded (no query params are meaningful on the dashboard landing).
- **What happens to `/dashboard/profile`?** → Moves to `/profile` with a 308 redirect from `/dashboard/profile`. Resolved from directory structure: the profile sub-route is the only sub-route under `/dashboard`, and the task states `/dashboard` should no longer exist.
- **Does the root layout shell need updating?** → Yes. The current `src/app/layout.tsx` has no padding/card shell — that wrapper lives in `src/app/dashboard/layout.tsx`. Moving dashboard to root requires either a root-segment layout (e.g. a new `(dashboard)` route group) or inlining the wrapper directly in `src/app/page.tsx`. Resolved from codebase: the simplest approach that avoids affecting other routes is to inline the Card+padding wrapper inside the new `src/app/page.tsx` return value (matching what `dashboard/layout.tsx` currently does), since all other top-level routes (`/library`, `/setlists`, `/login`) manage their own layout independently.
- **Active-state logic for `href: '/'`** → The current `pathname.startsWith(href + '/')` guard would match every route when `href` is `'/'`. The check must be changed to `pathname === '/'` (exact match only) for the Dashboard nav entry. Resolved from reading the navbar `isActive` logic.
- **Is any post-login redirect currently pointing to `/dashboard`?** → No. Both `signInWithPasswordAction` and the PKCE callback already redirect to `'/'`. No change needed on auth actions. Resolved from reading `src/app/actions/authActions.ts` and `src/app/auth/callback/route.ts`.
- **MEMORY.md relevance** → BUG-001 (lazy useState) and BUG-002 (React Compiler useCallback deps) are unrelated to routing changes. No known prior failure mode applies to this task.
