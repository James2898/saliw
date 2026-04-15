# TASK-008 — Strict Auth Wall and Middleware Guard

- **Tier:** 2
- **Date Created:** 2026-04-15
- **Status:** In Progress

---

## Feature Summary

This task implements a full authentication wall for the Saliw Music Portal. All three protected routes — `/dashboard`, `/library`, and `/setlists` — must redirect unauthenticated users to `/login` before any content is rendered. Protection is implemented in two layers: (1) Next.js middleware (`src/middleware.ts`) intercepts unauthenticated requests at the edge and redirects before page rendering, and (2) each protected `page.tsx` performs a server-side session check with an immediate `redirect('/login')` as defense-in-depth. The `/login` page and all static assets remain accessible without authentication. No new RLS migrations are required — existing policies already enforce `auth.role() = 'authenticated'` for SELECT on all protected tables.

---

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
10. The `/login` page (`src/app/(auth)/login/page.tsx`) must NOT be modified — its existing reverse guard remains correct as-is.
11. No `useAuth` hook is created or modified — `src/hooks/` is empty and remains so for this task.
12. All protected pages must continue to use Server Components (no `'use client'` directive added).
13. The middleware must use `createServerClient` from `@supabase/ssr` (already in use) — no additional Supabase client packages are introduced.
14. After implementation, an unauthenticated browser request to `/dashboard`, `/library`, or `/setlists` must result in a redirect response to `/login`.
15. After implementation, an authenticated browser request to `/dashboard`, `/library`, or `/setlists` must render the page content without redirect.

---

## Out of Scope

- Creating or modifying a `useAuth` hook
- Protecting the root `/` route
- Adding RBAC (role-based access control) beyond session authentication in this task
- Updating RLS migration files (policies already correct)
- Protecting `/api/*` routes (no such routes exist in this project currently)
- Any UI changes beyond removing the "Browse as guest" fallback text
- Modifying the login form or auth flow logic
- Adding loading states or skeleton screens during auth redirect

---

## Relevant Files

| File | Purpose |
|------|---------|
| `src/middleware.ts` | Primary file to update — add redirect logic after session refresh |
| `src/app/dashboard/page.tsx` | Add `createClient` import + `getUser` + `redirect('/login')` guard |
| `src/app/library/page.tsx` | Add `redirect('/login')` on null user; remove "Browse as guest" fallback |
| `src/app/setlists/page.tsx` | Add `redirect('/login')` on null user; remove "Browse as guest" fallback |
| `src/app/(auth)/login/page.tsx` | Reference pattern only — DO NOT MODIFY |
| `src/services/supabase/server.ts` | Source of `createClient()` for all server-side session checks |
| `supabase/migrations/20260415000001_create_songs_table.sql` | Confirms songs SELECT RLS policy already requires authenticated role |
| `supabase/migrations/20260415000002_create_setlists_table.sql` | Confirms setlists SELECT RLS policy already requires authenticated role |

---

## Technical Schema

### Auth Gate Contract Table

| Gate | File | Infrastructure | Status | Gap Strategy |
|------|------|----------------|--------|--------------|
| Middleware route guard | `src/middleware.ts` | `@supabase/ssr` createServerClient — EXISTS | MISSING — redirect logic absent | Add redirect block after existing getUser() call |
| Dashboard page auth check | `src/app/dashboard/page.tsx` | `@/services/supabase/server` — EXISTS | MISSING — no auth check at all | Add createClient import + getUser + redirect |
| Library page auth check | `src/app/library/page.tsx` | `@/services/supabase/server` — EXISTS | MISSING — getUser called but no redirect | Add redirect('/login') on null user; remove guest fallback |
| Setlists page auth check | `src/app/setlists/page.tsx` | `@/services/supabase/server` — EXISTS | MISSING — getUser called but no redirect | Add redirect('/login') on null user; remove guest fallback |
| Login reverse guard | `src/app/(auth)/login/page.tsx` | EXISTS | EXISTS — no change needed | N/A |

### Middleware Redirect Logic (exact implementation)

The existing cookie handling code in `src/middleware.ts` must be preserved exactly. Add the following block after the existing `await supabase.auth.getUser()` call:

```typescript
const { data: { user } } = await supabase.auth.getUser()

const pathname = request.nextUrl.pathname
const protectedPaths = ['/dashboard', '/library', '/setlists']
const isProtected = protectedPaths.some(
  (p) => pathname === p || pathname.startsWith(p + '/')
)

if (!user && isProtected) {
  return NextResponse.redirect(new URL('/login', request.url))
}
```

The `config.matcher` already excludes `_next/static`, `_next/image`, `favicon.ico`, and static asset extensions. The `isProtected` check ensures `/login` is never matched (it is not in `protectedPaths`), preventing redirect loops.

### RLS Policy Verification

No migration required. All SELECT policies already enforce authenticated access:

| Table | SELECT Policy | Status |
|-------|--------------|--------|
| `songs` | `auth.role() = 'authenticated'` | EXISTS — correct |
| `setlists` | `auth.role() = 'authenticated'` | EXISTS — correct |
| `setlist_songs` | `auth.role() = 'authenticated'` + parent join | EXISTS — correct |
| `profiles` | `auth.uid() = id` | EXISTS — correct |

---

## Planning Artifacts

| Artifact | Path | Description |
|----------|------|-------------|
| Feature Specification | `tasks/TASK-008/spec.md` | Acceptance criteria + scope + resolved ambiguities |
| Context Bundle | `tasks/TASK-008/context.md` | Reusable patterns, anti-patterns flagged |
| Research Notes | `tasks/TASK-008/research.md` | Open questions + decisions (all resolved) |
| Technical Schema | `tasks/TASK-008/schema.md` | Auth gate contract table + RLS verification |
| Endpoint Contracts | `tasks/TASK-008/contracts/endpoints.md` | Full per-gate contract detail |

---

## Implementation Notes

- Read `docs/coding-guidelines.md` before writing any code.
- Read `docs/tech-stack.md` before choosing any library.
- Read `docs/structure.md` before creating any new file.
- **CRITICAL — Middleware cookie handling:** The `createServerClient` setup with `getAll`/`setAll` cookie handlers in `src/middleware.ts` must be preserved verbatim. Only add the redirect logic block after the existing `await supabase.auth.getUser()` call.
- **CRITICAL — Import source:** All `createClient()` calls in Server Components must import from `@/services/supabase/server`. Never use `@/services/supabase/client` in a Server Component or middleware.
- **CRITICAL — redirect import:** Use `redirect` from `'next/navigation'` in all page.tsx files.
- **CRITICAL — No middleware comment retained:** Update or remove the "Do NOT add auth-gating logic here" comment in `src/middleware.ts` — it no longer applies.
- **Defense-in-depth:** Middleware handles the primary redirect. Page-level `getUser()` + `redirect('/login')` is required in all three pages as secondary protection.
- **No new migrations:** Do not create any SQL migration files. RLS is already correct.
- **No new hooks:** Do not create any `useAuth` hook. `src/hooks/` remains empty.
- **Branch:** Create a new branch from `main`: `feature/TASK-008-auth-wall`
- **Anti-pattern to avoid:** Do NOT add `'use client'` to any protected page. These are Server Components.
- **Anti-pattern to avoid:** Do NOT use `supabase.auth.getSession()` — always use `supabase.auth.getUser()` for server-side validation (getUser validates the JWT with the Supabase server, getSession only reads the local cookie).

---

## Resolution

- **Completed:** 2026-04-15
- **Branch:** feature/TASK-008-auth-wall
- **Base branch:** main
- **Files changed:**
  - `src/middleware.ts` — added `PROTECTED_PATHS` constant; destructured `user` from `getUser()`; added `isProtected` pathname check; added `NextResponse.redirect` to `/login` for unauthenticated requests to protected paths; updated comment
  - `src/app/dashboard/page.tsx` — converted to `async` Server Component; added `redirect` import from `'next/navigation'`; added `createClient` import from `@/services/supabase/server`; added `getUser()` call with `redirect('/login')` guard
  - `src/app/library/page.tsx` — added `redirect` import from `'next/navigation'`; added `redirect('/login')` guard on null user; removed "Browse as guest" conditional fallback; replaced with `user.email` (user is guaranteed non-null past the guard)
  - `src/app/setlists/page.tsx` — same changes as library/page.tsx
  - `tasks/TASK-008.md` — this file
  - `tasks/TASK-008/spec.md` — feature specification
  - `tasks/TASK-008/context.md` — context bundle
  - `tasks/TASK-008/research.md` — research notes
  - `tasks/TASK-008/schema.md` — technical schema
  - `tasks/TASK-008/contracts/endpoints.md` — endpoint contracts
- **Notes:**
  - No RLS migrations were created — all four tables already enforce `auth.role() = 'authenticated'` for SELECT.
  - `getUser()` is used (not `getSession()`) in all server-side checks, which validates the JWT against Supabase servers rather than just reading the local cookie.
  - In `library/page.tsx` and `setlists/page.tsx`, `user.email` is rendered directly after the redirect guard, so TypeScript narrows `user` to non-null — no conditional expression needed.
  - The `PROTECTED_PATHS` array in middleware makes it trivial to add future protected routes without touching the redirect logic.
