# Research — Strict Auth Wall and Middleware Guard

## Open Questions

- None. All ambiguities resolved from project context (existing middleware, route structure, migration files, and login page).

## Resolved From Context

- **Middleware location:** `src/middleware.ts` — confirmed from directory listing, not project root.
- **Login URL:** `/login` — `(auth)` route group is transparent to URL routing.
- **useAuth hook existence:** Does not exist. `src/hooks/` directory is empty.
- **RLS SELECT policies:** Already use `auth.role() = 'authenticated'` across all four tables. No migration needed.
- **No `/api/auth` route:** The project has no OAuth callback or Next-Auth routes. Middleware exclusion for `/api/auth` is not required.
- **`createClient` source:** Always `@/services/supabase/server` for Server Components. Confirmed from `src/services/supabase/server.ts`.
- **Middleware comment override:** The "Do NOT add auth-gating logic here" comment was provisional. The task explicitly overrides it.
