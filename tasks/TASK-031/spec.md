# Spec — Phase 2 DB Schema Wiring (Types + Server Actions)

## Feature Summary

Wire the application to the Phase 2 database schema by updating TypeScript types and Server Actions only — no new UI. This covers: adding `worship_leader_id` to setlist types, removing `singer` from `setlist_songs` types and all action payloads, adding `DbMusician` / `DbSetlistMusician` DB types, creating a new `Musician` frontend type and `SetlistLineupEntry` type, creating a full CRUD `musicianActions.ts` file, and extending `setlistActions.ts` with worship-leader and lineup management actions. The goal is a clean `tsc --noEmit` and `npm run build` with zero remaining references to `setlist_songs.singer` in `src/`.

## Acceptance Criteria

1. `npx tsc --noEmit` exits with code 0 after all changes.
2. `npm run build` succeeds with no errors.
3. The app boots and existing setlist viewer and edit pages render without runtime errors.
4. `DbSetlist` in `src/types/supabase.ts` includes `worship_leader_id: string | null`.
5. `DbSetlistSong` in `src/types/supabase.ts` no longer contains `singer` field or its comment.
6. `src/types/supabase.ts` exports `DbMusician` and `DbSetlistMusician` with the exact shapes specified.
7. `src/types/Setlist.ts` exports `Setlist` with `worship_leader_id: string | null` and the doc comment distinguishing it from `leader_id`.
8. `src/types/Musician.ts` exists and exports `Musician` and `SetlistLineupEntry` with the exact shapes specified.
9. `src/app/actions/musicianActions.ts` exists and exports `listMusicians`, `getMusicianById`, `createMusician`, `updateMusician`, `deleteMusician`, each returning `{ data: T | null; error: string | null }`.
10. `listMusicians` fetches all musicians ordered by `name` ascending.
11. `getMusicianById` returns the musician row or a not-found error (PGRST116 mapped to user-facing message).
12. `createMusician` sets `created_by` to `auth.uid()` and maps error code `42501` to a permission message.
13. `updateMusician` accepts `{ id, name?, notes? }` and builds the payload conditionally so omitted fields are not sent.
14. `deleteMusician` accepts `{ id }` and relies on FK `ON DELETE SET NULL / CASCADE` in the DB.
15. `getSetlistById` selects and returns `worship_leader_id` in its return type.
16. `addSongToSetlist` insert payload does not include `singer`.
17. `updatePerformanceDetails` signature is `{ id: string; setlist_id: string; performance_key?: string }` — `singer` parameter and all `singer` branches are removed.
18. The "no fields to update" guard in `updatePerformanceDetails` checks only `performance_key === undefined`.
19. `getSetlistWithSongs` select string and return type do not include `singer`.
20. `updateSetlist` accepts optional `worship_leader_id?: string | null`; omitting it preserves the existing value; passing `null` clears it; passing a string sets it.
21. `cloneSetlist` does not map `singer` in the songs array; it copies `worship_leader_id` into the new setlist row; after inserting songs it bulk-copies `setlist_musicians` rows (select `musician_id, instrument` from source → insert with new `setlist_id`); rollback deletes the cloned setlist header on lineup-insert failure.
22. `setlistActions.ts` exports `setSetlistWorshipLeader({ setlist_id, worship_leader_id })` as a wrapper around `updateSetlist`.
23. `setlistActions.ts` exports `addSetlistMusician({ setlist_id, musician_id, instrument })` that trims `instrument`, inserts into `setlist_musicians`, and maps error `23505` to "That musician is already assigned to that instrument."
24. `setlistActions.ts` exports `removeSetlistMusician({ id, setlist_id })` that deletes from `setlist_musicians` scoped by both `id` and `setlist_id`.
25. `setlistActions.ts` exports `getSetlistLineup({ setlist_id })` that selects `id, musician_id, instrument, musicians(id, name)` ordered by `instrument` then musician `name`.
26. A `grep -r "setlist_songs\.singer\|\.singer" src/` finds zero references in any file that operates on the `setlist_songs` table (references in `songs`-table code and `Song.ts` are untouched — they concern `public.songs.singer` which is out of scope).
27. All pre-existing setlist flows (view, edit, reorder, clone, delete, add/remove song, key change) continue to work end-to-end.

## Out of Scope

- Any new UI screens: `/musicians` page, setlist edit "People" section, viewer header worship-leader display — all Phase 3+.
- `songs.singer` column on `public.songs` — must remain untouched in both the DB and in `songActions.ts`, `SongEditorClient.tsx`, `NewSongFormClient.tsx`, and `Song.ts`.
- Supabase migration files — Phase 1 migration is assumed already applied.
- RLS policy changes — assume DB policies for `musicians` and `setlist_musicians` are already in place.
- UI for displaying or editing lineup on the setlist viewer/editor.

## Fallback Behaviors

- No UI controls are being added in this task, so no fallback UI patterns are required.
- If any new Server Action fails an RLS check (42501), it returns `{ data: null, error: 'You do not have permission to perform this action.' }` — consistent with existing pattern.

## Resolved Ambiguities

- **Does `songs.singer` need to be removed?** → No. `songs.singer` belongs to `public.songs` and was NOT dropped by Phase 1 migration. Only `setlist_songs.singer` is removed. Source: task spec + PM decision.
- **What is the next available task number?** → TASK-031. The highest existing task directory is TASK-030. Source: `ls tasks/` output.
- **Do any callers of `updatePerformanceDetails` pass `singer`?** → No. All three call sites (`SetlistSongSection.tsx`, `SetlistBuilderClient.tsx`, `useSetlistSync.ts`) pass only `{ id, setlist_id, performance_key }`. The signature change is safe with no cascading caller edits required. Source: grep scan of `src/`.
- **Should `setSetlistWorshipLeader` be a standalone DB update or delegate to `updateSetlist`?** → Wrapper around `updateSetlist` per task spec. Source: task spec.
- **Return type of `cloneSetlist` lineup copy** → No change to the outer return type `{ data: { id: string } | null; error: string | null }`; lineup copy is an internal step with rollback on failure. Source: existing cloneSetlist pattern + task spec.
- **`updateMusician` — what if all optional fields are omitted?** → Apply the same "no fields to update" guard used in `updatePerformanceDetails`: return `{ data: null, error: 'No fields to update.' }` if both `name` and `notes` are undefined. Source: existing codebase convention.
- **Error code mapping for `getMusicianById` / `deleteMusician`?** → PGRST116 → not-found message; 42501 → permission message; consistent with existing action pattern. Source: `setlistActions.ts` existing patterns.
