# TASK-015 — Add Singer and Default Key Fields to Song Forms

- **Tier:** 2
- **Date Created:** 2026-04-17
- **Status:** In Progress

---

## Feature Summary

The `public.songs` table is missing two columns — `singer` (free-text, the vocalist associated with a song) and `default_key` (the canonical performance key for the song, drawn from the standard 12-note chromatic scale). Neither column exists in the database yet, so this task covers the full vertical slice: a new Supabase migration, type updates, Server Action changes, the edit page query, and UI additions in both the edit form (`SongEditorClient`) and the create form (`NewSongFormClient`). Both fields are optional and nullable so that existing songs require no backfill and the forms can be submitted without values.

---

## Acceptance Criteria

1. A new Supabase migration file (`supabase/migrations/20260417000001_add_singer_default_key_to_songs.sql`) adds `singer text` (nullable) and `default_key text` (nullable) columns to `public.songs` via `ALTER TABLE`.
2. `DbSong` in `src/types/supabase.ts` includes `singer: string | null` and `default_key: string | null`.
3. `Song` in `src/types/Song.ts` includes `singer?: string` and `defaultKey?: string`.
4. The `createSong` Server Action in `src/app/actions/songActions.ts` accepts `singer` and `default_key` in its input type and persists both to Supabase.
5. The `updateSong` Server Action in `src/app/actions/songActions.ts` accepts `singer` and `default_key` in its input type and persists both using the existing undefined-filter pattern (fields absent from the payload are not overwritten).
6. The `.select()` string in both Server Actions is updated to include `singer` and `default_key`.
7. The `.select()` string on line 68 of `src/app/library/[id]/edit/page.tsx` is updated to include `singer` and `default_key`; the `songData` → `Song` mapping in the same file maps `db.singer` → `singer` and `db.default_key` → `defaultKey`.
8. `SongEditorClient` renders a Singer text input (label "Singer") and a Default Key select (label "Default Key"), both pre-populated from the existing song's data.
9. `NewSongFormClient` renders a Singer text input (label "Singer") and a Default Key select (label "Default Key").
10. The Default Key select options are the `NOTES` array imported from `@/utils/musicLogic` — the same 12 chromatic notes used for Original Key — plus a leading blank/empty option representing "none selected".
11. All new form controls use the `inputBaseClass` and `labelClass` constants already defined in `NewSongFormClient.tsx` for consistent Artisan palette styling.
12. Submitting the create form with no singer or default_key selected persists `null` / empty string gracefully — no validation error is thrown for these optional fields.
13. Submitting the edit form with singer and/or default_key values pre-populated saves the updated values correctly.

---

## Out of Scope

- Making `singer` or `default_key` required fields — they are permanently optional/nullable in this task
- Displaying singer or default_key on the public song detail view or setlist viewer
- Filtering or sorting the song library by singer or default_key
- Any changes to transposition logic or `performanceKey` handling
- RLS policy changes — existing policies already cover the `songs` table; new columns inherit them

---

## Relevant Files

| File | Purpose |
|------|---------|
| `supabase/migrations/20260417000001_add_singer_default_key_to_songs.sql` | New migration — adds `singer` and `default_key` columns to `public.songs` |
| `src/types/supabase.ts` | `DbSong` type — add `singer: string \| null` and `default_key: string \| null` |
| `src/types/Song.ts` | Frontend `Song` type — add `singer?: string` and `defaultKey?: string` |
| `src/app/actions/songActions.ts` | `createSong` and `updateSong` Server Actions — extend input types and `.select()` string |
| `src/app/library/[id]/edit/page.tsx` | Edit page Server Component — update `.select()` string (line 68) and `songData` mapping |
| `src/components/client/SongEditorClient.tsx` | Edit form client component — add Singer input and Default Key select |
| `src/components/client/NewSongFormClient.tsx` | Create form client component — add Singer input and Default Key select; source of `inputBaseClass` and `labelClass` constants |
| `src/utils/musicLogic.ts` | Reference — exports `NOTES` array (12 chromatic notes) to populate the Default Key select |

---

## Technical Schema

### Migration

```sql
ALTER TABLE public.songs
  ADD COLUMN singer text,
  ADD COLUMN default_key text;
```

Both columns are nullable with no default, so existing rows get `NULL` and no backfill is required.

### Type Changes

**`src/types/supabase.ts` — `DbSong`**

Add to the existing interface:
```ts
singer: string | null;
default_key: string | null;
```

**`src/types/Song.ts` — `Song`**

Add to the existing interface:
```ts
singer?: string;
defaultKey?: string;
```

### Server Action Input Extension

Both `createSong` and `updateSong` must accept:
```ts
singer?: string;
default_key?: string;
```

The `updateSong` action already filters out `undefined` fields before building the Supabase update payload; apply the same pattern to these two new fields.

### `.select()` String

Wherever `public.songs` columns are selected, append `singer, default_key`. Example final string:

```ts
.select('id, title, artist, original_key, content, created_by, singer, default_key')
```

### `songData` Mapping (edit page)

```ts
singer: db.singer ?? undefined,
defaultKey: db.default_key ?? undefined,
```

### Default Key Select Options

```tsx
import { NOTES } from '@/utils/musicLogic';

<select ...>
  <option value="">— select key —</option>
  {NOTES.map((note) => (
    <option key={note} value={note}>{note}</option>
  ))}
</select>
```

---

## Planning Artifacts

No upstream artifact files exist under `tasks/TASK-015/` — this task file is the sole planning artifact.

---

## Implementation Notes

- Read `docs/coding-guidelines.md` before writing any code.
- Read `docs/tech-stack.md` before choosing any library or package.
- Read `docs/structure.md` before creating any new file or directory.
- **Branch:** Stay on `feature/TASK-013-new-song-entry-stage-controls` — do not create a new branch; the caller confirmed this branch is the correct working branch for this task.
- **Migration filename:** Use `20260417000001_add_singer_default_key_to_songs.sql` exactly. If the `supabase/migrations/` directory already contains a file with this timestamp, increment the sequence suffix to avoid collision.
- **`inputBaseClass` / `labelClass`:** These constants are already defined in `NewSongFormClient.tsx`. Import or replicate them in `SongEditorClient.tsx` — do not hardcode Tailwind classes inline for the new controls.
- **NOTES array:** The `NOTES` export from `@/utils/musicLogic` is the single source of truth for the chromatic scale. Do not hardcode note names in either form component.
- **Blank option:** The Default Key select must include a leading blank option (value `""` or `undefined`) so that a song with no default key renders the select in its empty/unset state rather than defaulting to `C`.
- **Artisan palette:** All new form controls must match existing Artisan styling (Cream/Tan/Brown/Espresso). Use `inputBaseClass` and `labelClass` — do not introduce new color classes.
- **RLS:** No RLS changes are needed. The existing `music_director` role policy on `public.songs` covers all columns, including newly added ones.
- **Null-to-undefined coercion:** Supabase returns `null` for missing nullable columns. The `Song` frontend type uses `| undefined` (optional), not `| null`. Always coerce `db.singer ?? undefined` and `db.default_key ?? undefined` when mapping from `DbSong` to `Song`.
- **MEMORY.md:** Read the global `bug_usefonsize_setState_in_effect.md` entry before implementing any client-side state in the form components to avoid the known Vercel `setState-in-effect` build error pattern.

---

## Resolution

- **Completed:** 2026-04-18
- **Branch:** `feature/TASK-015-singer-default-key`
- **Base branch:** `develop`
- **Files changed:**
  - `supabase/migrations/20260417000001_add_singer_default_key_to_songs.sql` — new migration; adds `singer text` and `default_key text` (nullable) to `public.songs`
  - `src/types/supabase.ts` — added `singer: string | null` and `default_key: string | null` to `DbSong`
  - `src/types/Song.ts` — added `singer?: string` and `defaultKey?: string` to `Song`
  - `src/app/actions/songActions.ts` — extended `createSong` and `updateSong` input types with `singer?` and `default_key?`; updated `.select()` strings in both actions; `createSong` maps `undefined` → `null` for Supabase insert
  - `src/app/library/[id]/edit/page.tsx` — updated `.select()` to include `singer, default_key`; maps `db.singer ?? undefined` and `db.default_key ?? undefined` to `Song` object
  - `src/components/client/SongEditorClient.tsx` — (original) added `inputBaseClass`/`labelClass` constants; added Singer text input and Default Key select (NOTES + blank option) above toolbar; lazy `useState` initializers from `song.singer` and `song.defaultKey`; both fields passed to `updateSong`. (bug fix 2026-04-18) added `savedSinger` and `savedDefaultKey` baselines (lazy initializers); extended `isDirty` to also compare singer/defaultKey against their baselines; reset `savedSinger` and `savedDefaultKey` alongside `savedBaseline` on successful save.
  - `src/components/client/NewSongFormClient.tsx` — added Singer text input and Default Key select (NOTES + blank option) after Artist and before Original Key fields; both passed to `createSong`
- **Notes:** Bug fix on 2026-04-18 (commit 3cf81fa) targeted two issues: (1) `isDirty` was only comparing chord content, so changing singer or defaultKey never enabled the Save button; fixed by extending `isDirty` to cover all three fields. (2) After a successful save, singer/defaultKey baselines were not being reset, so the dirty indicator would persist incorrectly; fixed by calling `setSavedSinger(singer)` and `setSavedDefaultKey(defaultKey)` in the success branch. All state uses lazy `useState` initializers — no `useEffect` setState pattern introduced.
