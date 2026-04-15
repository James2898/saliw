# TASK-007 — Backend Infrastructure (Songs, Setlists, Server Actions)

- **Tier:** 2
- **Date Created:** 2026-04-15
- **Status:** In Progress

---

## Feature Summary

This task implements the complete backend data layer for the Saliw Music Portal. It creates three PostgreSQL tables (`songs`, `setlists`, `setlist_songs`) via SQL migration files with Row Level Security policies, seven Next.js Server Actions for song and setlist management, a new `src/types/supabase.ts` type file, and updated `Song.ts` / `Setlist.ts` types aligned with the new schema. No frontend UI pages or React components are created. The goal is to establish a secure, role-gated, RLS-enforced data foundation that future UI features can build on.

---

## Acceptance Criteria

1. A migration file `supabase/migrations/20260415000001_create_songs_table.sql` exists and creates the `songs` table with columns: `id` (uuid, PK, default `gen_random_uuid()`), `title` (text, NOT NULL), `artist` (text, NOT NULL), `original_key` (text, NOT NULL), `content` (text, NOT NULL), `created_by` (uuid, FK to `auth.users(id)`, ON DELETE SET NULL).
2. The `songs` table has RLS enabled and a SELECT policy allowing all authenticated users (`auth.role() = 'authenticated'`).
3. The `songs` table has INSERT, UPDATE, and DELETE policies restricted to users whose `profiles.role = 'music_director'`, enforced via a Postgres helper function `is_music_director()` that subqueries `public.profiles`.
4. A migration file `supabase/migrations/20260415000002_create_setlists_table.sql` exists and creates the `setlists` table with columns: `id` (uuid, PK, default `gen_random_uuid()`), `name` (text, NOT NULL), `date` (timestamptz, NOT NULL), `leader_id` (uuid, FK to `auth.users(id)`, ON DELETE CASCADE), `is_public` (boolean, NOT NULL, default `false`).
5. The `setlists` table has RLS enabled and a SELECT policy allowing all authenticated users.
6. The `setlists` table has UPDATE and DELETE policies restricted to the row's `leader_id` matching `auth.uid()`.
7. A migration file `supabase/migrations/20260415000003_create_setlist_songs_table.sql` exists and creates the `setlist_songs` junction table with columns: `id` (uuid, PK, default `gen_random_uuid()`), `setlist_id` (uuid, FK to `setlists(id)`, ON DELETE CASCADE), `song_id` (uuid, FK to `songs(id)`, ON DELETE CASCADE), `order_index` (integer, NOT NULL), `performance_key` (text, NOT NULL).
8. The `setlist_songs` table has RLS enabled. SELECT policy: authenticated users may SELECT if the parent setlist exists (join to `setlists`). INSERT, UPDATE, DELETE policies: only the `leader_id` of the associated setlist (subquery to `setlists`) may modify entries.
9. `src/app/actions/songActions.ts` exists with `'use server'` directive and exports `createSong`, `updateSong`, `deleteSong`.
10. `createSong` accepts `{ title: string, artist: string, original_key: string, content: string }`, validates that `content` contains at least one chord match using `chordRegex` from `src/utils/musicLogic.ts`, inserts into `songs` with `created_by` set to the authenticated user's `id`, and returns `{ data: DbSong | null, error: string | null }`.
11. `updateSong` accepts `{ id: string, title?: string, artist?: string, original_key?: string, content?: string }`, validates `content` with `chordRegex` if `content` is provided, updates the matching `songs` row, and returns `{ data: DbSong | null, error: string | null }`.
12. `deleteSong` accepts `{ id: string }`, deletes the matching `songs` row, and returns `{ data: { id: string } | null, error: string | null }`.
13. `src/app/actions/setlistActions.ts` exists with `'use server'` directive and exports `createSetlist`, `addSongToSetlist`, `reorderSetlist`, `deleteSetlist`.
14. `createSetlist` accepts `{ name: string, date: string, is_public?: boolean }`, inserts into `setlists` with `leader_id` set to `auth.uid()`, `is_public` defaulting to `false`, and returns `{ data: DbSetlist | null, error: string | null }`.
15. `addSongToSetlist` accepts `{ setlist_id: string, song_id: string, order_index: number }`, fetches the song's `original_key`, inserts into `setlist_songs` with `performance_key = original_key`, and returns `{ data: DbSetlistSong | null, error: string | null }`.
16. `reorderSetlist` accepts `{ setlist_id: string, updates: Array<{ id: string, order_index: number }> }` where `id` is the `setlist_songs.id`, and performs bulk update of `order_index`, returning `{ data: DbSetlistSong[] | null, error: string | null }`.
17. `deleteSetlist` accepts `{ id: string }`, deletes the matching `setlists` row (cascade removes `setlist_songs`), and returns `{ data: { id: string } | null, error: string | null }`.
18. Every Server Action uses `createClient()` from `@/services/supabase/server`. No action uses `SUPABASE_SERVICE_ROLE_KEY`.
19. Every Server Action wraps its body in a `try/catch` and returns `{ data: null, error: 'An unexpected error occurred. Please try again.' }` on unhandled exceptions.
20. Every Server Action calls `supabase.auth.getUser()` and returns `{ data: null, error: 'Unauthorized' }` if no authenticated user is found.
21. `src/types/supabase.ts` is created and exports: `DbSong`, `DbSetlist`, `DbSetlistSong` types matching the exact database column names and types.
22. `src/types/Song.ts` is updated: `id: string` (uuid), `original_key: string` (replaces `key: string`), retaining `title`, `artist`, `content`.
23. `src/types/Setlist.ts` is updated: `id: string`, `leader_id: string` (replaces `leader: string`), `name: string`, `date: string`, `is_public: boolean`; removes embedded `songs: Song[]`.
24. No `SUPABASE_SERVICE_ROLE_KEY` appears in any changed file.
25. All new files follow naming conventions per `docs/coding-guidelines.md`: `camelCase` for functions, `PascalCase` for types, `snake_case` for DB column references.

---

## Out of Scope

- No frontend UI pages, React components, or form elements
- No Realtime subscriptions or WebSocket logic
- No transposition UI or chord sheet rendering
- No pagination for list queries
- No search/filter logic for songs or setlists
- No changes to `authActions.ts` or `profileActions.ts`
- No changes to the existing profiles migration or profiles RLS policies
- No `Singer.ts` or `View.ts` type changes
- No version bump in `CHANGELOG.md` (handled by `@release-manager`)

---

## Relevant Files

| File | Purpose |
|------|---------|
| `src/app/actions/authActions.ts` | Template: Server Action pattern, error return shape |
| `src/app/actions/profileActions.ts` | Template: session retrieval (`supabase.auth.getUser()`), mutation pattern |
| `src/services/supabase/server.ts` | Must import `createClient()` from here in all new actions |
| `src/services/supabase/client.ts` | Must NOT be imported in any Server Action |
| `src/types/Song.ts` | Update in place to match new schema |
| `src/types/Setlist.ts` | Update in place to match new schema |
| `src/utils/musicLogic.ts` | Import `chordRegex` for content validation in songActions.ts |
| `supabase/migrations/20260415000000_create_profiles_table.sql` | Reference: RLS policy pattern, `is_music_director()` helper needed |
| `docs/coding-guidelines.md` | Naming conventions, RLS security rules |
| `docs/tech-stack.md` | Stack confirmation |
| `docs/structure.md` | File placement rules |

### Files to Create

| File | Purpose |
|------|---------|
| `supabase/migrations/20260415000001_create_songs_table.sql` | songs table + RLS + `is_music_director()` helper |
| `supabase/migrations/20260415000002_create_setlists_table.sql` | setlists table + RLS |
| `supabase/migrations/20260415000003_create_setlist_songs_table.sql` | setlist_songs junction table + RLS |
| `src/app/actions/songActions.ts` | createSong, updateSong, deleteSong |
| `src/app/actions/setlistActions.ts` | createSetlist, addSongToSetlist, reorderSetlist, deleteSetlist |
| `src/types/supabase.ts` | DbSong, DbSetlist, DbSetlistSong types |

---

## Technical Schema

### Server Action Contract Table

| UI Action | Server Action | File | RLS Role | Status |
|-----------|--------------|------|----------|--------|
| Create song | `createSong()` | `src/app/actions/songActions.ts` | `music_director` | To be created |
| Update song | `updateSong()` | `src/app/actions/songActions.ts` | `music_director` | To be created |
| Delete song | `deleteSong()` | `src/app/actions/songActions.ts` | `music_director` | To be created |
| Create setlist | `createSetlist()` | `src/app/actions/setlistActions.ts` | authenticated | To be created |
| Add song to setlist | `addSongToSetlist()` | `src/app/actions/setlistActions.ts` | leader_id match | To be created |
| Reorder setlist | `reorderSetlist()` | `src/app/actions/setlistActions.ts` | leader_id match | To be created |
| Delete setlist | `deleteSetlist()` | `src/app/actions/setlistActions.ts` | leader_id match | To be created |

### Key Contract Details

**createSong()** — Input: `{ title, artist, original_key, content }` — Output: `{ data: DbSong | null, error: string | null }` — Validates `content` via `chordRegex` before DB insert. `created_by` = `auth.uid()`.

**updateSong()** — Input: `{ id, title?, artist?, original_key?, content? }` — Output: `{ data: DbSong | null, error: string | null }` — Validates `content` via `chordRegex` if provided.

**deleteSong()** — Input: `{ id }` — Output: `{ data: { id: string } | null, error: string | null }`.

**createSetlist()** — Input: `{ name, date, is_public? }` — Output: `{ data: DbSetlist | null, error: string | null }` — `leader_id` = `auth.uid()`, `is_public` defaults to `false`.

**addSongToSetlist()** — Input: `{ setlist_id, song_id, order_index }` — Output: `{ data: DbSetlistSong | null, error: string | null }` — Fetches `songs.original_key`, sets `performance_key = original_key`.

**reorderSetlist()** — Input: `{ setlist_id, updates: Array<{ id: string, order_index: number }> }` — Output: `{ data: DbSetlistSong[] | null, error: string | null }` — `id` is the `setlist_songs.id` PK.

**deleteSetlist()** — Input: `{ id }` — Output: `{ data: { id: string } | null, error: string | null }` — CASCADE removes `setlist_songs`.

---

## Planning Artifacts

| Artifact | Path | Description |
|----------|------|-------------|
| Feature Specification | `tasks/TASK-007/spec.md` | Acceptance criteria + scope + resolved ambiguities |
| Context Bundle | `tasks/TASK-007/context.md` | Reusable patterns, anti-patterns flagged |
| Research Notes | `tasks/TASK-007/research.md` | Open questions + decisions (all resolved) |
| Technical Schema | `tasks/TASK-007/schema.md` | Server Action contract table |
| Endpoint Contracts | `tasks/TASK-007/contracts/endpoints.md` | Full per-action contract detail |

---

## Implementation Notes

- Read `docs/coding-guidelines.md` before writing any code.
- Read `docs/tech-stack.md` before choosing any library.
- Read `docs/structure.md` before creating any new file.
- **CRITICAL — RLS role check:** The `music_director` role is stored in `public.profiles.role`, NOT in the JWT. Do not use `auth.jwt() ->> 'role'`. Use a `is_music_director()` Postgres helper function that subqueries `public.profiles WHERE id = auth.uid() AND role = 'music_director'`. Define this function in the first songs migration (`20260415000001`) using `CREATE OR REPLACE FUNCTION`.
- **CRITICAL — No service role key:** All actions must use `createClient()` from `@/services/supabase/server` with the anon key. Never reference `SUPABASE_SERVICE_ROLE_KEY`.
- **CRITICAL — chordRegex import:** Import `chordRegex` from `@/utils/musicLogic` for content validation. Reset the regex lastIndex before each `.test()` call because `chordRegex` uses the `g` flag: `chordRegex.lastIndex = 0` before `chordRegex.test(content)`.
- **Type precedence:** `src/types/supabase.ts` exports `DbSong`, `DbSetlist`, `DbSetlistSong` (exact DB column names). `Song.ts` and `Setlist.ts` export the frontend-facing types with updated field names.
- **Migration naming:** Follow the existing timestamp convention. Files must be named exactly: `20260415000001_create_songs_table.sql`, `20260415000002_create_setlists_table.sql`, `20260415000003_create_setlist_songs_table.sql`.
- **Branch name:** Create feature branch from `develop` (confirmed current base branch): `feature/TASK-007-backend-infrastructure`.
- **Anti-pattern to avoid:** Do NOT import from `@/services/supabase/client` in any Server Action file — only `server.ts`.

---

## Resolution

- **Completed:** 2026-04-15
- **Branch:** feature/TASK-007-backend-infrastructure
- **Base branch:** develop
- **Files changed:**
  - `supabase/migrations/20260415000001_create_songs_table.sql` — created songs table, RLS policies, `is_music_director()` helper function
  - `supabase/migrations/20260415000002_create_setlists_table.sql` — created setlists table, RLS policies (authenticated SELECT, leader_id UPDATE/DELETE)
  - `supabase/migrations/20260415000003_create_setlist_songs_table.sql` — created setlist_songs junction table, RLS policies (authenticated SELECT via parent join, leader_id INSERT/UPDATE/DELETE via subquery)
  - `src/types/supabase.ts` — new file; exports DbSong, DbSetlist, DbSetlistSong
  - `src/types/Song.ts` — updated: id to string (uuid), key renamed to original_key
  - `src/types/Setlist.ts` — updated: id to string, leader renamed to leader_id, added is_public, removed embedded songs array
  - `src/app/actions/songActions.ts` — new file; exports createSong, updateSong, deleteSong
  - `src/app/actions/setlistActions.ts` — new file; exports createSetlist, addSongToSetlist, reorderSetlist, deleteSetlist
  - `tasks/TASK-007.md` — this file
  - `tasks/TASK-007/spec.md`, `tasks/TASK-007/context.md`, `tasks/TASK-007/research.md`, `tasks/TASK-007/schema.md`, `tasks/TASK-007/contracts/endpoints.md` — planning artifacts
- **Notes:**
  - `chordRegex` uses the global `g` flag; `lastIndex` is reset to 0 before each `.test()` call in `songActions.ts` to prevent stale state false negatives.
  - The `is_music_director()` Postgres function is defined with `SECURITY DEFINER` so it can read `public.profiles` regardless of the caller's RLS context.
  - `reorderSetlist` uses sequential individual UPDATEs per row rather than a batch upsert, to keep each operation scoped to `setlist_id` for clean RLS enforcement.
  - PostgreSQL error code `42501` is used to detect RLS rejections and return a user-friendly permission error instead of exposing DB internals.
  - No service role key is used anywhere. All mutations rely on RLS for authorization.
