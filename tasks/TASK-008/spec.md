# Spec — Strict Auth Wall and Middleware Guard

## Feature Summary

This task implements a full authentication wall for the Saliw Music Portal. All three protected routes — `/dashboard`, `/library`, and `/setlists` — must redirect unauthenticated users to `/login` before any content is rendered. Protection is implemented in two layers: (1) Next.js middleware (`src/middleware.ts`) intercepts unauthenticated requests at the edge and redirects before page rendering, and (2) each protected `page.tsx` performs a server-side session check with an immediate `redirect('/login')` as defense-in-depth. The `/login` page and all static assets remain accessible without authentication.

## Acceptance Criteria

1. `src/middleware.ts` calls `supabase.auth.getUser()` and, if no authenticated user is returned, redirects to `/login` for requests matching `/dashboard`, `/library`, or `/setlists` (and any sub-paths).
2. The middleware redirect must not create a redirect loop: `/login`, `/_next/*`, `/api/*`, and static file extensions (`.svg`, `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.ico`) must be excluded from the auth gate.
3. The middleware `config.matcher` regex must be updated to reflect the protected paths explicitly, or the redirect logic must check the pathname before redirecting.
4. `src/app/dashboard/page.tsx` must call `createClient()` from `@/services/supabase/server`, call `supabase.auth.getUser()`, and call `redirect('/login')` if `user` is null.
5. `src/app/library/page.tsx` must call `redirect('/login')` if `supabase.auth.getUser()` returns a null user. The existing "Browse as guest" fallback text must be removed.
6. `src/app/setlists/page.tsx` must call `redirect('/login')` if `supabase.auth.getUser()` returns a null user. The existing "Browse as guest" fallback text must be removed.
7. The `redirect` import in all protected pages must come from `'next/navigation'`.
8. The `createClient` import in all protected pages must come from `'@/services/supabase/server'` — never from `@/services/supabase/client`.
9. No new RLS migrations are required — existing policies already enforce `auth.role() = 'authenticated'` for SELECT on `songs`, `setlists`, and `setlist_songs`. This criterion confirms no migration file is created.
10. The `/login` page (`src/app/(auth)/login/page.tsx`) must NOT be modified — its existing reverse guard (redirecting authenticated users away) remains correct as-is.
11. No `useAuth` hook is created or modified — `src/hooks/` is empty and remains so for this task.
12. All protected pages must continue to use Server Components (no `'use client'` directive added).
13. The middleware must use `createServerClient` from `@supabase/ssr` (already in use) — no additional Supabase client packages are introduced.
14. After implementation, an unauthenticated browser request to `/dashboard`, `/library`, or `/setlists` must result in a redirect response to `/login` (HTTP 307 or equivalent Next.js redirect).
15. After implementation, an authenticated browser request to `/dashboard`, `/library`, or `/setlists` must render the page content without redirect.

## Out of Scope

- Creating or modifying a `useAuth` hook
- Protecting the root `/` route
- Adding RBAC (role-based access control) beyond session authentication in this task
- Updating RLS migration files (policies already correct)
- Protecting `/api/*` routes (no such routes exist in this project currently)
- Any UI changes beyond removing the "Browse as guest" fallback text
- Modifying the login form or auth flow logic
- Adding loading states or skeleton screens during auth redirect

## Fallback Behaviors

- **Unauthenticated request to protected route:** Middleware redirects to `/login` immediately. Page-level check provides defense-in-depth. No partial content is rendered.
- **Authenticated user on `/login`:** Existing reverse guard in `src/app/(auth)/login/page.tsx` redirects to `/`. No change needed.

## Resolved Ambiguities

- **Middleware file location** → `src/middleware.ts` (not project root). Confirmed from directory listing.
- **Does a useAuth hook exist?** → No. `src/hooks/` is empty. No hook changes required.
- **Do RLS policies need updating?** → No. All four migration files already enforce `auth.role() = 'authenticated'` for SELECT on songs, setlists, and setlist_songs.
- **What is the login route URL?** → `/login`. The `(auth)` route group does not affect the URL. Confirmed from `src/app/(auth)/login/page.tsx`.
- **Should `dashboard/page.tsx` add a server-side check?** → Yes. Task description requires page-level validation as defense-in-depth, even though middleware handles the primary redirect.
- **Is `/api/auth` exclusion needed in middleware?** → No. The project uses cookie-based Supabase SSR auth, not OAuth callback routes. No `/api/auth` path exists. Existing matcher exclusions are sufficient.
- **Should the middleware comment "Do NOT add auth-gating logic here" be respected?** → No. That comment was a placeholder from the session-refresh-only implementation. The task explicitly requires adding redirect logic. The comment must be updated to reflect the new behavior.
