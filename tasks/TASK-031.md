# TASK-031 — Phase 2 DB Schema Wiring (Types + Server Actions)

- **Tier:** 1
- **Date Created:** 2026-04-26
- **Status:** In Progress

---

## Feature Summary

Wire the application to the Phase 2 database schema by updating TypeScript types and Server Actions only — no new UI. This covers: adding `worship_leader_id` to setlist types, removing `singer` from `setlist_songs` types and all action payloads, adding `DbMusician` / `DbSetlistMusician` DB types, creating a new `Musician` frontend type and `SetlistLineupEntry` type, creating a full CRUD `musicianActions.ts` file, and extending `setlistActions.ts` with worship-leader and lineup management actions. The goal is a clean `tsc --noEmit` and `npm run build` with zero remaining references to `setlist_songs.singer` in `src/`.

---

## Acceptance Criteria

1. `npx tsc --noEmit` exits with code 0 after all changes.
2. `npm run build` succeeds with no errors.
3. The app boots and existing setlist viewer and edit pages render without runtime errors.
4. `DbSetlist` in `src/types/supabase.ts` includes `worship_leader_id: string | null`.
5. `DbSetlistSong` in `src/types/supabase.ts` no longer contains `singer` field or its comment.
6. `src/types/supabase.ts` exports `DbMusician` and `DbSetlistMusician` with the exact shapes specified.
7. `src/types/Setlist.ts` exports `Setlist` with `worship_leader_id: string | null` and a doc comment distinguishing it from `leader_id`.
8. `src/types/Musician.ts` exists and exports `Musician` and `SetlistLineupEntry` with the exact shapes specified.
9. `src/app/actions/musicianActions.ts` exists and exports `listMusicians`, `getMusicianById`, `createMusician`, `updateMusician`, `deleteMusician`, each returning `{ data: T | null; error: string | null }`.
10. `listMusicians` fetches all musicians ordered by `name` ascending.
11. `getMusicianById` returns the musician row or a not-found error (PGRST116 mapped to user-facing message).
12. `createMusician` sets `created_by` to `auth.uid()` and maps error code `42501` to a permission message.
13. `updateMusician` accepts `{ id, name?, notes? }` and builds the payload conditionally so omitted fields are not sent; if both `name` and `notes` are undefined, returns `{ data: null, error: 'No fields to update.' }`.
14. `deleteMusician` accepts `{ id }` and relies on FK `ON DELETE SET NULL / CASCADE` in the DB.
15. `getSetlistById` selects and returns `worship_leader_id` in its return type.
16. `addSongToSetlist` insert payload does not include `singer`.
17. `updatePerformanceDetails` signature is `{ id: string; setlist_id: string; performance_key?: string }` — `singer` parameter and all `singer` branches are removed.
18. The "no fields to update" guard in `updatePerformanceDetails` checks only `performance_key === undefined`.
19. `getSetlistWithSongs` select string and return type do not include `singer`.
20. `updateSetlist` accepts optional `worship_leader_id?: string | null`; omitting it preserves the existing value; passing `null` clears it; passing a string sets it.
21. `cloneSetlist` does not map `singer` in the songs array; it copies `worship_leader_id` into the new setlist row; after inserting songs it bulk-copies `setlist_musicians` rows (select `musician_id, instrument` from source → insert with new `setlist_id`); rollback deletes the cloned setlist header on lineup-insert failure (cascading to cloned songs via FK).
22. `setlistActions.ts` exports `setSetlistWorshipLeader({ setlist_id, worship_leader_id })` as a wrapper around `updateSetlist`.
23. `setlistActions.ts` exports `addSetlistMusician({ setlist_id, musician_id, instrument })` that trims `instrument`, inserts into `setlist_musicians`, and maps error `23505` to "That musician is already assigned to that instrument."
24. `setlistActions.ts` exports `removeSetlistMusician({ id, setlist_id })` that deletes from `setlist_musicians` scoped by both `id` and `setlist_id`.
25. `setlistActions.ts` exports `getSetlistLineup({ setlist_id })` that selects `id, musician_id, instrument, musicians(id, name)` ordered by `instrument` then musician `name`.
26. A `grep -r "setlist_songs\.singer\|\.singer" src/` finds zero references in any file that operates on the `setlist_songs` table (references in `songs`-table code and `Song.ts` are untouched — they concern `public.songs.singer` which is out of scope).
27. All pre-existing setlist flows (view, edit, reorder, clone, delete, add/remove song, key change) continue to work end-to-end.

---

## Out of Scope

- Any new UI screens: `/musicians` page, setlist edit "People" section, viewer header worship-leader display — all Phase 3+.
- `songs.singer` column on `public.songs` — must remain untouched in `songActions.ts`, `SongEditorClient.tsx`, `NewSongFormClient.tsx`, and `Song.ts`.
- Supabase migration files — Phase 1 migration is assumed already applied.
- RLS policy changes — assume DB policies for `musicians` and `setlist_musicians` are already in place.
- UI for displaying or editing lineup on the setlist viewer/editor.

---

## Relevant Files

| File | Purpose |
|------|---------|
| `src/types/supabase.ts` | Edit — add `DbMusician`, `DbSetlistMusician`, update `DbSetlist` (add `worship_leader_id`), remove `singer` from `DbSetlistSong` |
| `src/types/Setlist.ts` | Edit — add `worship_leader_id: string \| null` to the `Setlist` frontend type with distinguishing doc comment |
| `src/types/Musician.ts` | NEW — create file exporting `Musician` and `SetlistLineupEntry` types |
| `src/app/actions/setlistActions.ts` | Edit — update 6 existing actions + add 4 new actions |
| `src/app/actions/musicianActions.ts` | NEW — create file with 5 CRUD actions |
| `src/app/actions/songActions.ts` | Reference only — DO NOT edit; contains `songs.singer` which is out of scope |
| `src/services/supabase/server.ts` | Reference — source for `createClient()` import pattern |

---

## Technical Schema

N/A — no API contract required for this task.

---

## Planning Artifacts

| Artifact | Path | Description |
|----------|------|-------------|
| Feature Specification | `tasks/TASK-031/spec.md` | Acceptance criteria + scope |
| Research Notes | `tasks/TASK-031/research.md` | Open questions (none remaining) |

---

## Implementation Notes

- Read `docs/coding-guidelines.md` before writing any code.
- Read `docs/tech-stack.md` before choosing any library or package.
- Read `docs/structure.md` before creating any new file or directory.
- **Canonical Server Action pattern:** `async function foo(input): Promise<{ data: T | null; error: string | null }>`. Auth guard first, then Supabase call, then error code switch, then return. All actions must have try/catch — never allow a rejected Promise to propagate silently.
- **`createMusician`:** Obtain `created_by` via `(await supabase.auth.getUser()).data.user?.id`. Do not pass it from the caller.
- **`getSetlistLineup`:** Use PostgREST relational select syntax: `select('id, musician_id, instrument, musicians(id, name)')`. The foreign table name is `musicians` (plural, per Supabase convention). Order by `instrument` then musician `name`.
- **`cloneSetlist` rollback:** On lineup-insert failure, delete the cloned setlist header row. The FK cascade will delete cloned songs automatically. Do not leave partial data in the DB.
- **`updateMusician` guard:** If both `name` and `notes` are `undefined`, return `{ data: null, error: 'No fields to update.' }` immediately — consistent with `updatePerformanceDetails` pattern.
- **`singer` removal scope:** Only `setlist_songs.singer` is removed. The `songs.singer` column in `public.songs` must not be touched. Before committing, verify `grep -r "setlist_songs\.singer\|\.singer" src/` returns zero hits in any file that touches the `setlist_songs` table.
- **Three callers of `updatePerformanceDetails`** — `SetlistSongSection.tsx`, `SetlistBuilderClient.tsx`, `useSetlistSync.ts` — already pass only `{ id, setlist_id, performance_key }`. No changes to those files are required.
- **RLS enforcement:** All mutating Server Actions rely on Supabase RLS for `music_director` role enforcement. Do not add inline role checks in application code.
- **Error messages for 42501:** Return `'You do not have permission to perform this action.'` — consistent with existing pattern.
- **Error messages for PGRST116:** Return a user-facing not-found message consistent with existing `getMusicianById` and similar action patterns.
- Read `MEMORY.md` sections for BUG-002 (React Compiler `useCallback` property-path deps) if any hooks are touched, and BUG-004 (dark mode variants) if any UI components are touched — neither should apply to this purely back-end task.

---

## Amendments (from Context Bundle)

> _No amendments required. All anti-patterns identified in the context bundle (singer references in out-of-scope files, the three callers of `updatePerformanceDetails`) are already covered by the acceptance criteria above._

---

## Resolution

- **Completed:** 2026-04-26
- **Branch:** feature/TASK-031-musician-types-and-actions
- **Base branch:** develop
- **Files changed:**
  - `src/types/supabase.ts` — added `worship_leader_id` to `DbSetlist`, removed `singer` from `DbSetlistSong`, added `DbMusician` and `DbSetlistMusician`
  - `src/types/Setlist.ts` — added `worship_leader_id: string | null` with doc comment to `Setlist`
  - `src/types/Musician.ts` — new file exporting `Musician` and `SetlistLineupEntry` types
  - `src/app/actions/musicianActions.ts` — new file with `listMusicians`, `getMusicianById`, `createMusician`, `updateMusician`, `deleteMusician`
  - `src/app/actions/setlistActions.ts` — removed `singer` from `getSetlistWithSongs` select + return type; updated `updateSetlist` to accept optional `worship_leader_id`; updated `cloneSetlist` to copy `worship_leader_id`, drop `singer`, and bulk-copy lineup with rollback; added `setSetlistWorshipLeader`, `addSetlistMusician`, `removeSetlistMusician`, `getSetlistLineup`; imported `DbSetlistMusician` and `SetlistLineupEntry`
- **Notes:** `npx tsc --noEmit` passes with 0 errors. `grep -n "singer" setlistActions.ts` returns zero hits. All pre-existing callers of `updatePerformanceDetails` (`SetlistSongSection.tsx`, `SetlistBuilderClient.tsx`, `useSetlistSync.ts`) already passed only `{ id, setlist_id, performance_key }` — no changes to those files were required. The `songs.singer` column in `public.songs` was not touched.
- **Fix (AC 22):** `name` and `date` made optional in `updateSetlist`; all-undefined guard added; `setSetlistWorshipLeader` rewritten as a one-line wrapper delegating to `updateSetlist`. Existing callers that pass both `name` and `date` continue to work.
- **Fix (AC 25):** `getSetlistLineup` now chains a second `.order('name', { referencedTable: 'musicians', ascending: true })` after the primary instrument sort.
