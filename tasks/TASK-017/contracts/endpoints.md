# Endpoint Contracts — Setlist Song Management (TASK-017)

This is the authoritative source for @task-logger and @fullstack-developer.
All operations are Next.js Server Actions in `src/app/actions/setlistActions.ts`.
Return type convention for all actions: `{ data: T | null; error: string | null }`.

---

## 1. addSongToSetlist — EXISTS

- **File:** `src/app/actions/setlistActions.ts`
- **Status:** Implemented. No changes required to the function body.
  One gap: the current implementation accepts `order_index` from the caller. The requirements specify server-side `MAX(order_index)+1` computation. This is a behavioral gap — the caller should not supply `order_index`.

### Current signature (caller supplies order_index — GAP)
```typescript
input: { setlist_id: string; song_id: string; order_index: number }
```

### Required signature (server computes order_index)
```typescript
input: { setlist_id: string; song_id: string }
```

### Supabase queries required
1. `SELECT MAX(order_index) FROM setlist_songs WHERE setlist_id = input.setlist_id`
2. `SELECT original_key FROM songs WHERE id = input.song_id`
3. `INSERT INTO setlist_songs (setlist_id, song_id, order_index, performance_key) VALUES (...)`

### Success Response
```typescript
{ data: DbSetlistSong; error: null }
// DbSetlistSong.order_index = MAX(order_index) + 1, or 0 if table is empty
// DbSetlistSong.performance_key = songs.original_key
// DbSetlistSong.singer = null (column added by migration)
```

### Error Responses
| Condition | Return value |
|-----------|-------------|
| Not authenticated | `{ data: null, error: 'Unauthorized' }` |
| Song not found | `{ data: null, error: 'Song not found.' }` |
| RLS violation (code 42501) | `{ data: null, error: 'You do not have permission to modify this setlist.' }` |
| Other DB error | `{ data: null, error: 'Unable to add song to setlist. Please try again.' }` |
| Unexpected exception | `{ data: null, error: 'An unexpected error occurred. Please try again.' }` |

### Key constraint
`performance_key` must be a value present in the `NOTES` array from `src/utils/musicLogic.ts`:
`["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "Bb", "B"]`.
`original_key` is already validated at song creation, so no re-validation needed here.

---

## 2. removeSongFromSetlist — MISSING

- **File:** `src/app/actions/setlistActions.ts` (add new export)

### Input
```typescript
input: { id: string; setlist_id: string }
// id: setlist_songs.id (the junction table PK, not song_id)
// setlist_id: used for RLS scope and re-indexing
```

### Supabase queries required
1. `DELETE FROM setlist_songs WHERE id = input.id AND setlist_id = input.setlist_id`
2. `SELECT id FROM setlist_songs WHERE setlist_id = input.setlist_id ORDER BY order_index ASC`
3. Sequential UPDATE loop: for each remaining row in order, `UPDATE setlist_songs SET order_index = i WHERE id = row.id AND setlist_id = input.setlist_id`

### Success Response
```typescript
{ data: { id: string }; error: null }
// id: the deleted setlist_songs.id
```

### Error Responses
| Condition | Return value |
|-----------|-------------|
| Not authenticated | `{ data: null, error: 'Unauthorized' }` |
| RLS violation (code 42501) | `{ data: null, error: 'You do not have permission to modify this setlist.' }` |
| Row not found (0 rows affected) | `{ data: null, error: 'Song entry not found in setlist.' }` |
| Re-index failure | `{ data: null, error: 'Unable to reorder setlist after removal. Please try again.' }` |
| Unexpected exception | `{ data: null, error: 'An unexpected error occurred. Please try again.' }` |

### Notes
- The re-indexing loop after deletion must use the same sequential pattern as `reorderSetlist` (iterate in `order_index ASC` order, assign 0-based integer indices).
- Both DELETE and re-index operations are covered by existing RLS policies (`setlist_songs_delete_leader`, `setlist_songs_update_leader`).

---

## 3. updateSetlistSongOrder — EXISTS (rename from `reorderSetlist`)

- **File:** `src/app/actions/setlistActions.ts`
- **Status:** Logic is fully implemented under the name `reorderSetlist`. The export name must be changed to `updateSetlistSongOrder`. No logic changes are required.

### Input (unchanged)
```typescript
input: {
  setlist_id: string
  updates: Array<{ id: string; order_index: number }>
}
// id: setlist_songs.id (junction table PK)
// order_index: the new 0-based position
```

### Supabase queries (unchanged)
Sequential loop: `UPDATE setlist_songs SET order_index = update.order_index WHERE id = update.id AND setlist_id = input.setlist_id`

### Success Response
```typescript
{ data: DbSetlistSong[]; error: null }
// Array of all updated rows, in the order the updates were applied
```

### Error Responses
| Condition | Return value |
|-----------|-------------|
| Not authenticated | `{ data: null, error: 'Unauthorized' }` |
| Empty updates array | `{ data: null, error: 'No updates provided.' }` |
| RLS violation (code 42501) | `{ data: null, error: 'You do not have permission to modify this setlist.' }` |
| DB error on any row | `{ data: null, error: 'Unable to reorder setlist. Please try again.' }` |
| Unexpected exception | `{ data: null, error: 'An unexpected error occurred. Please try again.' }` |

### Rename impact
Any caller of `reorderSetlist` must be updated to import `updateSetlistSongOrder` instead. Search for `reorderSetlist` across the codebase before renaming.

---

## 4. updatePerformanceDetails — MISSING

- **File:** `src/app/actions/setlistActions.ts` (add new export)

### Input
```typescript
input: {
  id: string              // setlist_songs.id (junction table PK)
  setlist_id: string      // for RLS scope
  performance_key?: string
  singer?: string | null
}
```

At least one of `performance_key` or `singer` must be provided (validate before DB call).

### Key validation (if performance_key is provided)
`performance_key` must be present in NOTES: `["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "Bb", "B"]`
Return `{ data: null, error: 'Invalid performance key.' }` if not.

### Supabase query
```
UPDATE setlist_songs
SET
  performance_key = COALESCE(input.performance_key, performance_key),
  singer = CASE WHEN 'singer' in input THEN input.singer ELSE singer END
WHERE id = input.id AND setlist_id = input.setlist_id
RETURNING *
```

Implementation note: build the update payload object conditionally in TypeScript, include only the fields that were passed by the caller.

### Success Response
```typescript
{ data: DbSetlistSong; error: null }
// Full updated row including singer: string | null
```

### Error Responses
| Condition | Return value |
|-----------|-------------|
| Not authenticated | `{ data: null, error: 'Unauthorized' }` |
| No fields to update | `{ data: null, error: 'No fields to update.' }` |
| Invalid performance_key | `{ data: null, error: 'Invalid performance key.' }` |
| RLS violation (code 42501) | `{ data: null, error: 'You do not have permission to modify this setlist.' }` |
| Row not found | `{ data: null, error: 'Setlist song entry not found.' }` |
| Other DB error | `{ data: null, error: 'Unable to update performance details. Please try again.' }` |
| Unexpected exception | `{ data: null, error: 'An unexpected error occurred. Please try again.' }` |

### Dependency
Requires the `singer` column migration (`20260418000001_add_singer_to_setlist_songs.sql`) to be applied before deployment.

---

## 5. getSetlistWithSongs — MISSING

- **File:** `src/app/actions/setlistActions.ts` (add new export) or a dedicated data-fetching file
- **Pattern:** Server Component data fetch — no `'use server'` directive needed if placed in a data file; if in setlistActions.ts it is already marked `'use server'`.

### Input
```typescript
input: { setlist_id: string }
```

### Supabase query (single join — no N+1)
```
SELECT
  setlist_songs.id,
  setlist_songs.song_id,
  setlist_songs.order_index,
  setlist_songs.performance_key,
  setlist_songs.singer,
  songs.title,
  songs.artist,
  songs.original_key,
  songs.content
FROM setlist_songs
JOIN songs ON songs.id = setlist_songs.song_id
WHERE setlist_songs.setlist_id = input.setlist_id
ORDER BY setlist_songs.order_index ASC
```

### Success Response
```typescript
{
  data: Array<{
    id: string              // setlist_songs.id
    song_id: string
    order_index: number
    performance_key: string
    singer: string | null
    title: string
    artist: string
    original_key: string
    content: string
  }>
  error: null
}
```

### Error Responses
| Condition | Return value |
|-----------|-------------|
| Not authenticated | `{ data: null, error: 'Unauthorized' }` |
| DB error | `{ data: null, error: 'Unable to load setlist. Please try again.' }` |
| Unexpected exception | `{ data: null, error: 'An unexpected error occurred. Please try again.' }` |

### Notes
- RLS `setlist_songs_select_authenticated` policy allows any authenticated user to read — no leader check on SELECT.
- The joined `songs` rows are also readable by all authenticated users per `songs_select_authenticated`.
- An empty array `[]` is a valid success response (setlist exists but has no songs).

---

## Schema Artifacts

### Migration file to create
**Path:** `supabase/migrations/20260418000001_add_singer_to_setlist_songs.sql`
```sql
-- Migration: Add singer column to public.setlist_songs
-- Nullable; no default. Existing rows receive NULL. No backfill required.
ALTER TABLE public.setlist_songs ADD COLUMN IF NOT EXISTS singer TEXT;
```

Filename date `20260418` matches today's date (2026-04-18) and is lexicographically after the latest existing migration (`20260417000001`).

### Type file update
**Path:** `src/types/supabase.ts` — `DbSetlistSong` type

Current:
```typescript
export type DbSetlistSong = {
  id: string
  setlist_id: string
  song_id: string
  order_index: number
  performance_key: string
}
```

Required:
```typescript
export type DbSetlistSong = {
  id: string
  setlist_id: string
  song_id: string
  order_index: number
  performance_key: string
  singer: string | null
}
```

---

## Gap-Handling Decision: singer column

The `singer` column is absent from the `setlist_songs` table. Because:
- The migration is a single additive `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` (no data migration, no breaking change)
- The column is nullable (no default required on existing rows)
- The RLS UPDATE policy already covers the column (policy grants UPDATE on the entire row, not per-column)

Decision: **No UI disabling is needed.** The migration is included in the same changeset as the feature implementation. The `singer` field is optional in the `updatePerformanceDetails` input payload, so if the migration is not yet applied in an environment, the DB will return an error that surfaces through the standard `error` return — the UI can display it without crashing.
