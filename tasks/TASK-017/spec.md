# Spec — Setlist Junction Logic and Server Actions

## Feature Summary

Implement four missing Server Actions in `src/app/actions/setlistActions.ts` that operate on the `setlist_songs` junction table: `removeSongFromSetlist`, `updateSetlistSongOrder` (renamed from the partial `reorderSetlist` stub that already exists), `updatePerformanceDetails`, and a corrected `addSongToSetlist` that computes `order_index` server-side. A supporting join query helper for fetching a complete setlist with all song metadata is also in scope. The table and RLS policies already exist in `supabase/migrations/20260415000003_create_setlist_songs_table.sql`; no new migration is required. The task also adds `singer: string | null` to `DbSetlistSong` to match the schema described in the handoff (the column is present in the task description but absent from the current type).

## Acceptance Criteria

1. `addSongToSetlist` accepts `{ setlist_id: string; song_id: string }` — the caller does not supply `order_index`; the action fetches `MAX(order_index)` from `setlist_songs` for the given `setlist_id` and inserts with `order_index = max + 1` (or `0` when the setlist is empty).
2. `addSongToSetlist` fetches `original_key` from `songs` and stores it as the initial `performance_key`; if the song row is not found the action returns `{ data: null, error: 'Song not found.' }`.
3. `addSongToSetlist` validates that `original_key` is a member of the `NOTES` array exported from `src/utils/musicLogic.ts` before inserting; if the stored key is not in `NOTES` the action returns `{ data: null, error: 'Song has an invalid original key.' }`.
4. `removeSongFromSetlist` accepts `{ id: string }` (the `setlist_songs` PK) and deletes exactly that row.
5. After deletion, `removeSongFromSetlist` fetches all remaining rows for the same `setlist_id` ordered by the current `order_index` ascending and reassigns sequential indices starting from `0` using the existing sequential-upsert loop pattern (same approach as `reorderSetlist`).
6. The re-index loop in `removeSongFromSetlist` uses `eq('setlist_id', ...)` scoping on every update, consistent with the existing `reorderSetlist` implementation, so RLS applies correctly per row.
7. If any update in the re-index loop fails, `removeSongFromSetlist` returns `{ data: null, error: 'Unable to reorder setlist after removal. Please try again.' }`.
8. `updateSetlistSongOrder` (the renamed/replaced version of the existing `reorderSetlist` stub) accepts `{ setlist_id: string; updates: { id: string; order_index: number }[] }` and performs a sequential update loop — one `supabase.from('setlist_songs').update(...).eq('id', ...).eq('setlist_id', ...)` call per row — returning `{ data: DbSetlistSong[]; error: null }` on full success.
9. `updateSetlistSongOrder` validates that `updates` is non-empty before querying; empty input returns `{ data: null, error: 'No updates provided.' }`.
10. `updatePerformanceDetails` accepts `{ id: string; performance_key: string; singer?: string }` and updates only those fields on the matching `setlist_songs` row.
11. `updatePerformanceDetails` validates `performance_key` against the `NOTES` array from `src/utils/musicLogic.ts` before any database write; invalid key returns `{ data: null, error: 'Invalid performance key. Must be one of: ' + NOTES.join(', ') }`.
12. `updatePerformanceDetails` allows `singer` to be omitted (field is optional); when omitted, the existing `singer` value in the database is preserved (do not overwrite with `null`).
13. `updatePerformanceDetails` allows `singer` to be explicitly passed as `null` to clear the field.
14. All four actions call `supabase.auth.getUser()` at the start and return `{ data: null, error: 'Unauthorized' }` if no user session exists.
15. All four actions are wrapped in `try/catch` and return `{ data: null, error: 'An unexpected error occurred. Please try again.' }` from the catch block.
16. All four actions return `{ data: null, error: 'You do not have permission to modify this setlist.' }` when Supabase returns error code `42501` (RLS rejection).
17. `DbSetlistSong` in `src/types/supabase.ts` is extended with `singer: string | null` to reflect the actual column.
18. A `getSetlistWithSongs` query helper (Server Action or exported async function in the same file) fetches a setlist row joined with all its `setlist_songs` rows and each song's `id`, `title`, `artist`, `original_key`, and `singer` columns in a single Supabase query using `.select('*, setlist_songs(*, songs(id, title, artist, original_key, singer))')` — no N+1 pattern.
19. `getSetlistWithSongs` accepts `{ setlist_id: string }` and returns the joined data or an error string in the standard `{ data, error }` shape.
20. All return values across all actions conform to `{ success?: boolean, data?: any, error?: string }` — specifically `{ data: T | null, error: string | null }` (consistent with existing action signatures in the file).
21. No Supabase RPC or Postgres function is introduced; all operations use the Supabase JS client chained query API.
22. The existing `reorderSetlist` export is either removed or aliased to `updateSetlistSongOrder` to avoid a duplicate export; the preferred approach is to rename the function and keep the same export name `updateSetlistSongOrder`.

## Out of Scope

- Writing new Supabase migration SQL — the `setlist_songs` table and all RLS policies already exist.
- Adding a `singer` column to `setlist_songs` via migration — the column is described in the task schema but is absent from the existing migration file (`20260415000003_create_setlist_songs_table.sql`). A migration to add `singer text` nullable to `setlist_songs` IS in scope only if codebase inspection confirms the column is truly absent from the live schema; this determination is delegated to `@integration-contract`.
- UI components for displaying or editing setlist songs — Server Actions only.
- Atomic multi-statement transactions via Postgres RPC — sequential client-side loops are the approved pattern per existing codebase evidence.
- Role-based guard in the Server Action layer for `music_director` — RLS on `setlist_songs` gates on `setlists.leader_id = auth.uid()` (not on `music_director` role); the existing pattern for setlist mutations is leader-ownership, not music-director role. This is consistent with `createSetlist` and `reorderSetlist` which only check for an authenticated user.
- Any change to `setlistActions.ts` outside the four named actions and the join helper.

## Fallback Behaviors

- No UI actions are in scope for this task. All fallback behaviors are expressed as error return values from Server Actions (see Acceptance Criteria items 14–16).

## Resolved Ambiguities

- **Re-indexing atomicity** → Sequential client-side upsert loop is acceptable, consistent with the existing `reorderSetlist` implementation which already uses the same pattern. An RPC is not required. Source: `src/app/actions/setlistActions.ts` lines 107–149.
- **`updateSetlistSongOrder` atomicity** → Same resolution as above. Sequential upsert loop per row. No RPC required. Source: existing `reorderSetlist` implementation.
- **`performance_key` valid values** → The 12-note `NOTES` array exported from `src/utils/musicLogic.ts`: `["C","C#","D","D#","E","F","F#","G","G#","A","Bb","B"]`. No standalone `isValidKey` function exists; validation must inline `NOTES.includes(key)`, identical to the pattern in `songActions.ts` line 38. Source: `src/utils/musicLogic.ts` and `src/app/actions/songActions.ts`.
- **`singer` field type** → Free-text, nullable, no max-length constraint enforced at the application layer. The `singer` column on `songs` is `text` with no constraint; the same convention applies to `setlist_songs.singer`. Source: `supabase/migrations/20260417000001_add_singer_default_key_to_songs.sql` and `src/types/supabase.ts`.
- **RLS enforcement location** → RLS only. Server Actions do not re-check the `music_director` role; setlist mutations use leader-ownership RLS (`setlists.leader_id = auth.uid()`). Defense in depth is limited to the `auth.getUser()` session check (already present in all existing setlist actions). Source: `supabase/migrations/20260415000003_create_setlist_songs_table.sql` and `src/app/actions/setlistActions.ts`.
- **Migration scope** → Out of scope for Server Actions. The `setlist_songs` table and policies already exist. The `singer` column on `setlist_songs` is specified in the task description but absent from the migration file — this gap is flagged for `@integration-contract` to confirm and handle.
- **Join query columns** → From `songs`: `id`, `title`, `artist`, `original_key`, `singer`. From `setlist_songs`: all columns (`*`). From `setlists`: all columns (`*`). The Supabase nested select pattern `.select('*, setlist_songs(*, songs(id, title, artist, original_key, singer))')` satisfies the N+1-safe requirement. Source: `src/types/Song.ts`, `src/types/Setlist.ts`, `docs/coding-guidelines.md`.
- **`order_index` caller responsibility** → Removed from caller API. `addSongToSetlist` computes `MAX(order_index) + 1` server-side. The existing stub accepted `order_index` as a caller parameter, which is a client-trust risk. Source: task description specifying "Append to end: max(order_index) + 1".
- **`singer` column on `setlist_songs` in migration** → The existing migration (`20260415000003`) does not include a `singer` column. The task description's schema includes it. Adding the column requires a new migration. This is flagged as a gap for `@integration-contract`; the Server Action layer should treat the column as present and include it in inserts/updates once the migration is confirmed.

## Open Questions

- None. All questions resolved from codebase context. The chain may proceed.
