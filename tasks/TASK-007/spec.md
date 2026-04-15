# Spec — Backend Infrastructure (Songs, Setlists, Server Actions)

## Feature Summary

This task implements the complete backend data layer for the Saliw Music Portal. It creates three PostgreSQL tables (`songs`, `setlists`, `setlist_songs`) via SQL migration files with Row Level Security policies, seven Next.js Server Actions for song and setlist management, an updated TypeScript type file (`src/types/supabase.ts`), and updated `Song.ts` / `Setlist.ts` types to align with the new schema. No frontend UI pages or React components are created. The goal is to establish a secure, role-gated, RLS-enforced data foundation that future UI features can build on.

## Acceptance Criteria

1. A migration file `supabase/migrations/20260415000001_create_songs_table.sql` exists and creates the `songs` table with columns: `id` (uuid, PK, default `gen_random_uuid()`), `title` (text, NOT NULL), `artist` (text, NOT NULL), `original_key` (text, NOT NULL), `content` (text, NOT NULL), `created_by` (uuid, FK to `auth.users(id)`, ON DELETE SET NULL).
2. The `songs` table has RLS enabled and a SELECT policy allowing all authenticated users (`auth.role() = 'authenticated'`).
3. The `songs` table has INSERT, UPDATE, and DELETE policies restricted to users whose `profiles.role = 'music_director'`, enforced via a Postgres helper function `is_music_director()` that subqueries `public.profiles`.
4. A migration file `supabase/migrations/20260415000002_create_setlists_table.sql` exists and creates the `setlists` table with columns: `id` (uuid, PK, default `gen_random_uuid()`), `name` (text, NOT NULL), `date` (timestamptz, NOT NULL), `leader_id` (uuid, FK to `auth.users(id)`, ON DELETE CASCADE), `is_public` (boolean, NOT NULL, default `false`).
5. The `setlists` table has RLS enabled and a SELECT policy allowing all authenticated users.
6. The `setlists` table has UPDATE and DELETE policies restricted to the row's `leader_id` matching `auth.uid()`.
7. A migration file `supabase/migrations/20260415000003_create_setlist_songs_table.sql` exists and creates the `setlist_songs` junction table with columns: `id` (uuid, PK, default `gen_random_uuid()`), `setlist_id` (uuid, FK to `setlists(id)`, ON DELETE CASCADE), `song_id` (uuid, FK to `songs(id)`, ON DELETE CASCADE), `order_index` (integer, NOT NULL), `performance_key` (text, NOT NULL).
8. The `setlist_songs` table has RLS enabled. SELECT policy: authenticated users may SELECT if the parent setlist exists (join to `setlists` confirms the row is accessible). INSERT, UPDATE, DELETE policies: only the `leader_id` of the associated setlist (subquery to `setlists`) may modify entries.
9. `src/app/actions/songActions.ts` exists with `'use server'` directive and exports `createSong`, `updateSong`, `deleteSong`.
10. `createSong` accepts `{ title: string, artist: string, original_key: string, content: string }`, validates that `content` contains at least one chord match using `chordRegex` from `src/utils/musicLogic.ts`, inserts into `songs` with `created_by` set to the authenticated user's `id`, and returns `{ data: Song | null, error: string | null }`.
11. `updateSong` accepts `{ id: string, title?: string, artist?: string, original_key?: string, content?: string }`, validates `content` with `chordRegex` if `content` is provided, updates the matching `songs` row, and returns `{ data: Song | null, error: string | null }`. RLS enforces the music_director restriction at the database layer.
12. `deleteSong` accepts `{ id: string }`, deletes the matching `songs` row, and returns `{ data: { id: string } | null, error: string | null }`. RLS enforces the music_director restriction at the database layer.
13. `src/app/actions/setlistActions.ts` exists with `'use server'` directive and exports `createSetlist`, `addSongToSetlist`, `reorderSetlist`, `deleteSetlist`.
14. `createSetlist` accepts `{ name: string, date: string, is_public?: boolean }`, inserts into `setlists` with `leader_id` set to the authenticated user's `id`, `is_public` defaulting to `false`, and returns `{ data: Setlist | null, error: string | null }`.
15. `addSongToSetlist` accepts `{ setlist_id: string, song_id: string, order_index: number }`, fetches the song's `original_key`, inserts into `setlist_songs` with `performance_key` set to `original_key`, and returns `{ data: SetlistSong | null, error: string | null }`. RLS enforces that only the setlist's `leader_id` may insert.
16. `reorderSetlist` accepts `{ setlist_id: string, updates: Array<{ id: string, order_index: number }> }` where `id` is the `setlist_songs.id` (junction table row id), and performs a bulk update of `order_index` for all specified rows, returning `{ data: SetlistSong[] | null, error: string | null }`. RLS enforces that only the setlist's `leader_id` may update.
17. `deleteSetlist` accepts `{ id: string }`, deletes the matching `setlists` row (cascade removes `setlist_songs` entries), and returns `{ data: { id: string } | null, error: string | null }`. RLS enforces that only `leader_id` matching `auth.uid()` may delete.
18. Every Server Action uses `createClient()` from `@/services/supabase/server` (never the browser client). No action uses `SUPABASE_SERVICE_ROLE_KEY`.
19. Every Server Action wraps its body in a `try/catch` and returns `{ data: null, error: 'An unexpected error occurred. Please try again.' }` on unhandled exceptions — no rejected Promises propagate silently.
20. Every Server Action calls `supabase.auth.getUser()` and returns `{ data: null, error: 'Unauthorized' }` if no authenticated user is found, before any database mutation.
21. `src/types/supabase.ts` is created and exports: `DbSong`, `DbSetlist`, `DbSetlistSong` types matching the exact database column names and types.
22. `src/types/Song.ts` is updated to export a `Song` type matching the new schema (`id: string` for uuid, `original_key: string` instead of `key: string`, retaining `title`, `artist`, `content`).
23. `src/types/Setlist.ts` is updated to export a `Setlist` type matching the new schema (`id: string`, `leader_id: string` instead of `leader: string`, `date: string`, `name: string`, `is_public: boolean`; removes the embedded `songs: Song[]` array — junction table handles relationships).
24. No `SUPABASE_SERVICE_ROLE_KEY` appears anywhere in the changed files.
25. All new files follow the `camelCase` naming for functions, `PascalCase` for types, and `snake_case` for database column references, per `docs/coding-guidelines.md`.

## Out of Scope

- No frontend UI pages, React components, or form elements
- No Realtime subscriptions or WebSocket logic
- No transposition UI or chord sheet rendering
- No pagination for list queries (future task)
- No search/filter logic for songs or setlists
- No `SUPABASE_SERVICE_ROLE_KEY` usage anywhere in the project
- No changes to `src/app/(auth)/` login/signup pages
- No changes to `src/app/actions/authActions.ts` or `profileActions.ts`
- No changes to the existing `profiles` migration or profiles RLS policies
- No `Singer.ts` or `View.ts` type changes

## Fallback Behaviors

This task is backend-only with no UI. There are no UI controls to disable. All gap-handling is at the Server Action layer:
- If `supabase.auth.getUser()` returns no user: return `{ data: null, error: 'Unauthorized' }` immediately.
- If RLS rejects a mutation (e.g., non-music_director tries to create a song): Supabase returns a PostgreSQL error; the action catches it and returns `{ data: null, error: 'You do not have permission to perform this action.' }`.
- If a song's content fails `chordRegex` validation: return `{ data: null, error: 'Song content must contain at least one valid chord.' }` without touching the database.

## Resolved Ambiguities

- **Type update strategy** → Update `Song.ts` and `Setlist.ts` in place to align with the new DB schema. No existing pages or components import these types (verified: `library/page.tsx` and `setlists/page.tsx` are placeholder pages that do not import type files). `src/types/supabase.ts` is created as an additional DB-layer type file exporting `DbSong`, `DbSetlist`, `DbSetlistSong`. Source: codebase scan of all files importing Song/Setlist types.
- **RLS role check implementation** → Use a Postgres helper function `is_music_director()` that subqueries `public.profiles WHERE id = auth.uid() AND role = 'music_director'`. The role is stored in `public.profiles.role` (confirmed by migration `20260415000000`), not in the JWT metadata. JWT claim checks (`auth.jwt() ->> 'role'`) will not work. Source: `supabase/migrations/20260415000000_create_profiles_table.sql`.
- **content validation scope** → Validation means: `content` is non-empty AND `chordRegex.test(content)` returns `true` (i.e., at least one chord is detectable). This is a format guard, not a structural parser. The `chordRegex` in `musicLogic.ts` is designed for chord detection in worship song content; empty content or prose-only content would return no match and be rejected. Source: `src/utils/musicLogic.ts` comments and `docs/coding-guidelines.md` Musical Integrity section.
- **reorderSetlist input shape** → Input is `Array<{ id: string, order_index: number }>` where `id` is the `setlist_songs.id` (the junction table's own PK). This allows precise per-row updates without needing to re-look up `song_id`. Source: task spec ("Update order_index for songs within a specific setlist") and junction table design (`setlist_songs.id` as PK).
- **Migration timestamp collision** → Use sequential seconds: `20260415000001`, `20260415000002`, `20260415000003`. This follows the existing convention of the first migration (`20260415000000`) and keeps timestamps sortable and unique. Source: `supabase/migrations/20260415000000_create_profiles_table.sql` naming pattern.
- **deleteSetlistAction MISSING status** → Was marked MISSING in `docs/api-discovery.md` but is now explicitly in scope per the task request. It is implemented as a standard Server Action. The `api-discovery.md` table entry for `deleteSetlistAction` should be updated to EXISTS after implementation. Source: task description and api-discovery.md.

## Open Questions (Blocking)

- None. All ambiguities resolved from codebase context.
