# Context Bundle — Strict Auth Wall and Middleware Guard

## Relevant Files

| File | Why It's Relevant |
|------|-----------------|
| `src/middleware.ts` | Primary file to update — add auth redirect logic after session refresh |
| `src/app/(auth)/login/page.tsx` | Reference: correct pattern for `createClient` + `getUser` + `redirect`; must NOT be modified |
| `src/app/library/page.tsx` | Protected page — add redirect guard; remove "Browse as guest" fallback |
| `src/app/setlists/page.tsx` | Protected page — add redirect guard; remove "Browse as guest" fallback |
| `src/app/dashboard/page.tsx` | Protected page — add `createClient` import + `getUser` + `redirect` guard |
| `src/services/supabase/server.ts` | Source of `createClient()` for all server-side session checks |
| `supabase/migrations/20260415000001_create_songs_table.sql` | Confirms `auth.role() = 'authenticated'` SELECT policy already exists |
| `supabase/migrations/20260415000002_create_setlists_table.sql` | Confirms `auth.role() = 'authenticated'` SELECT policy already exists |

## Reuse Candidates

- `src/app/(auth)/login/page.tsx` — Exact pattern to replicate in protected pages:
  ```ts
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) { redirect('/') }
  ```
  Invert the condition for protected pages: `if (!user) { redirect('/login') }`

- `src/middleware.ts` — Existing `createServerClient` + cookie setup is correct and must be preserved. Only add the redirect block after `getUser()`.

## Patterns to Follow

- **Server-side session check:** See `src/app/(auth)/login/page.tsx` — `createClient()` + `supabase.auth.getUser()` + `redirect()` from `'next/navigation'`.
- **Middleware session refresh:** See `src/middleware.ts` — `createServerClient` with `getAll`/`setAll` cookie handlers. Pattern must be preserved exactly; only add redirect logic after the existing `getUser()` call.

## Anti-Patterns Flagged

- `src/app/library/page.tsx` line 41: Shows "Browse as guest" when `user` is null — this must be removed and replaced with a redirect.
- `src/app/setlists/page.tsx` line 41: Same pattern — must be removed and replaced with a redirect.
- `src/app/dashboard/page.tsx`: No `createClient` import at all — page renders without any auth check. Must add server-side session check.
- `src/middleware.ts` line 32: Comment says "Do NOT add auth-gating logic here" — this comment is provisional and must be updated when auth-gating is added.

## MEMORY.md Notes

- N/A — MEMORY.md does not exist yet in this project.
