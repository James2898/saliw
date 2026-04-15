# Endpoint Contracts — Strict Auth Wall and Middleware Guard

> This task has no Server Action endpoints. All contracts below are auth gate contracts — session checks that gate page rendering or redirect to /login.

---

## Gate 1: Middleware Route Guard — MISSING (to implement)

- **File:** `src/middleware.ts`
- **Trigger:** Any HTTP request to `/dashboard`, `/library`, `/setlists`, or sub-paths thereof
- **Method:** `supabase.auth.getUser()` via `createServerClient` from `@supabase/ssr`
- **Check:** If `user` is null AND pathname matches a protected path → redirect to `/login`
- **Success (authenticated):** Pass through — return `supabaseResponse`
- **Error States:**

  | Condition | Behavior |
  |-----------|----------|
  | No session cookie | `getUser()` returns `{ data: { user: null } }` → redirect to `/login` |
  | Expired session | Same as no session — `getUser()` returns null user → redirect to `/login` |
  | Supabase unreachable | `getUser()` throws → middleware must not crash the app; treat as unauthenticated and redirect |
  | Request to `/login` | Not in `protectedPaths` — passes through, no redirect loop |
  | Request to `/_next/*` | Excluded by `config.matcher` — middleware never runs |

- **Gap Strategy:** Add redirect block after existing `getUser()` call. Preserve all existing cookie handling code.

---

## Gate 2: Dashboard Page Auth Check — MISSING (to implement)

- **File:** `src/app/dashboard/page.tsx`
- **Trigger:** Server Component render
- **Method:** `createClient()` from `@/services/supabase/server` → `supabase.auth.getUser()`
- **Check:** If `user` is null → `redirect('/login')`
- **Success:** Render dashboard content

---

## Gate 3: Library Page Auth Check — MISSING (partial — getUser exists but no redirect)

- **File:** `src/app/library/page.tsx`
- **Trigger:** Server Component render
- **Current state:** Calls `getUser()` but shows "Browse as guest" instead of redirecting
- **Required change:** Replace guest fallback with `redirect('/login')` on null user
- **Success:** Render library content with authenticated user context

---

## Gate 4: Setlists Page Auth Check — MISSING (partial — getUser exists but no redirect)

- **File:** `src/app/setlists/page.tsx`
- **Trigger:** Server Component render
- **Current state:** Calls `getUser()` but shows "Browse as guest" instead of redirecting
- **Required change:** Replace guest fallback with `redirect('/login')` on null user
- **Success:** Render setlists content with authenticated user context
