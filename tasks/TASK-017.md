# TASK-017 — Setlist Songs Junction Actions

- **Tier:** 2
- **Date Created:** 2026-04-18
- **Status:** In Progress
- **Branch:** `feature/TASK-017-setlist-songs-junction`
- **Base Branch:** `develop`

---

## Feature Summary

Implement four missing or corrected Server Actions in `src/app/actions/setlistActions.ts` that operate on the `setlist_songs` junction table: a corrected `addSongToSetlist` (server-side `order_index` computation), a new `removeSongFromSetlist` (delete + re-index), `updateSetlistSongOrder` (renamed from the existing `reorderSetlist` stub), `updatePerformanceDetails` (new — updates `performance_key` and optional `singer`), and `getSetlistWithSongs` (new join query helper). A companion migration adds the missing `singer` column to `setlist_songs`. The `DbSetlistSong` type in `src/types/supabase.ts` must be extended with `singer: string | null` to match. No UI components are in scope.

---

## What Already Exists vs. What Is Net-New

| Item | Status | Action Required |
|------|--------|----------------|
| `addSongToSetlist` | EXISTS — behavioral gap | Fix: remove `order_index` from input, compute server-side |
| `reorderSetlist` | EXISTS — wrong export name | Rename to `updateSetlistSongOrder`; no logic change |
| `removeSongFromSetlist` | MISSING | Implement from scratch |
| `updatePerformanceDetails` | MISSING | Implement from scratch |
| `getSetlistWithSongs` | MISSING | Implement from scratch |
| `setlist_songs` table + RLS | EXISTS | No changes |
| `setlist_songs.singer` column | MISSING | Add via new migration |
| `DbSetlistSong.singer` field | MISSING | Add `singer: string | null` to type |

---

## Acceptance Criteria

1. `addSongToSetlist` accepts `{ setlist_id: string; song_id: string }` — the caller does not supply `order_index`; the action fetches `MAX(order_index)` from `setlist_songs` for the given `setlist_id` and inserts with `order_index = max + 1` (or `0` when the setlist is empty).
2. `addSongToSetlist` fetches `original_key` from `songs` and stores it as the initial `performance_key`; if the song row is not found the action returns `{ data: null, error: 'Song not found.' }`.
3. `addSongToSetlist` validates that `original_key` is a member of the `NOTES` array exported from `src/utils/musicLogic.ts` before inserting; if the stored key is not in `NOTES` the action returns `{ data: null, error: 'Song has an invalid original key.' }`.
4. `removeSongFromSetlist` accepts `{ id: string; setlist_id: string }` where `id` is the `setlist_songs` PK and `setlist_id` is used for RLS scoping and post-delete re-indexing.
5. After deletion, `removeSongFromSetlist` fetches all remaining rows for the same `setlist_id` ordered by the current `order_index` ascending and reassigns sequential indices starting from `0` using the existing sequential-upsert loop pattern (same approach as `reorderSetlist`).
6. The re-index loop in `removeSongFromSetlist` uses `.eq('setlist_id', ...)` scoping on every update, consistent with the existing `reorderSetlist` implementation, so RLS applies correctly per row.
7. If any update in the re-index loop fails, `removeSongFromSetlist` returns `{ data: null, error: 'Unable to reorder setlist after removal. Please try again.' }`.
8. `updateSetlistSongOrder` (the renamed/replaced version of the existing `reorderSetlist` stub) accepts `{ setlist_id: string; updates: { id: string; order_index: number }[] }` and performs a sequential update loop — one `supabase.from('setlist_songs').update(...).eq('id', ...).eq('setlist_id', ...)` call per row — returning `{ data: DbSetlistSong[]; error: null }` on full success.
9. `updateSetlistSongOrder` validates that `updates` is non-empty before querying; empty input returns `{ data: null, error: 'No updates provided.' }`.
10. `updatePerformanceDetails` accepts `{ id: string; setlist_id: string; performance_key?: string; singer?: string | null }` — at least one of `performance_key` or `singer` must be present; if neither is supplied return `{ data: null, error: 'No fields to update.' }`.
11. `updatePerformanceDetails` validates `performance_key` against the `NOTES` array from `src/utils/musicLogic.ts` if `performance_key` is provided; invalid key returns `{ data: null, error: 'Invalid performance key. Must be one of: ' + NOTES.join(', ') }`.
12. `updatePerformanceDetails` allows `singer` to be omitted (field is optional); when omitted, the existing `singer` value in the database is preserved (do not overwrite with `null`).
13. `updatePerformanceDetails` allows `singer` to be explicitly passed as `null` to clear the field.
14. All four actions call `supabase.auth.getUser()` at the start and return `{ data: null, error: 'Unauthorized' }` if no user session exists.
15. All four actions are wrapped in `try/catch` and return `{ data: null, error: 'An unexpected error occurred. Please try again.' }` from the catch block.
16. All four actions return `{ data: null, error: 'You do not have permission to modify this setlist.' }` when Supabase returns error code `42501` (RLS rejection).
17. `DbSetlistSong` in `src/types/supabase.ts` is extended with `singer: string | null` to reflect the actual column.
18. `getSetlistWithSongs` accepts `{ setlist_id: string }` and fetches in a single join query from `setlist_songs` with embedded `songs(id, title, artist, original_key, content)` columns, ordered by `order_index` ascending — no N+1 pattern.
19. `getSetlistWithSongs` accepts `{ setlist_id: string }` and returns the joined data or an error string in the standard `{ data: T[] | null; error: string | null }` shape; an empty array `[]` is a valid success response.
20. All return values across all actions conform to `{ data: T | null; error: string | null }` (consistent with existing action signatures in the file).
21. No Supabase RPC or Postgres function is introduced; all operations use the Supabase JS client chained query API.
22. The existing `reorderSetlist` export is renamed to `updateSetlistSongOrder`; no duplicate export remains. Search the codebase for all `reorderSetlist` import sites and update them to `updateSetlistSongOrder`.

---

## Out of Scope

- UI components for displaying or editing setlist songs — Server Actions only.
- Atomic multi-statement transactions via Postgres RPC — sequential client-side loops are the approved pattern.
- Role-based `music_director` guard in the Server Action layer — RLS on `setlist_songs` gates on `setlists.leader_id = auth.uid()` (leader-ownership, not role). Server Actions only add the `auth.getUser()` session check.
- Any change to `setlistActions.ts` outside the five named actions.
- Any migration beyond `20260418000001_add_singer_to_setlist_songs.sql`.

---

## Relevant Files

| File | Purpose |
|------|---------|
| `src/app/actions/setlistActions.ts` | Primary implementation target — all five actions live here |
| `src/types/supabase.ts` | `DbSetlistSong` type needs `singer: string | null` added |
| `src/utils/musicLogic.ts` | Exports `NOTES: readonly string[]` used for key validation |
| `supabase/migrations/20260415000003_create_setlist_songs_table.sql` | Existing table + RLS — read for policy names and column list |
| `supabase/migrations/20260418000001_add_singer_to_setlist_songs.sql` | CREATE — new migration for the `singer` column |
| `src/services/supabase/server.ts` | Async cookie-based Supabase client — import as `createClient` |
| `src/app/actions/songActions.ts` | Reference for the key-validation pattern (`NOTES.includes(key)`) |

---

## Technical Schema

### Migration to Create

**Path:** `supabase/migrations/20260418000001_add_singer_to_setlist_songs.sql`

```sql
-- Migration: Add singer column to public.setlist_songs
-- Nullable; no default. Existing rows receive NULL. No backfill required.
ALTER TABLE public.setlist_songs ADD COLUMN IF NOT EXISTS singer TEXT;
```

### Type Update

**File:** `src/types/supabase.ts` — extend `DbSetlistSong`:

```typescript
export type DbSetlistSong = {
  id: string
  setlist_id: string
  song_id: string
  order_index: number
  performance_key: string
  singer: string | null   // ADD — requires migration above
}
```

### Operation Contracts

#### addSongToSetlist

**Input:** `{ setlist_id: string; song_id: string }`

Supabase queries (in order):
1. `SELECT MAX(order_index) FROM setlist_songs WHERE setlist_id = input.setlist_id` — derive `nextIndex = (max ?? -1) + 1`
2. `SELECT original_key FROM songs WHERE id = input.song_id .single()` — error `PGRST116` or `!song` → `'Song not found.'`
3. Validate `NOTES.includes(song.original_key)` → else `'Song has an invalid original key.'`
4. `INSERT INTO setlist_songs (setlist_id, song_id, order_index, performance_key, singer)` with `singer = null`

**Success:** `{ data: DbSetlistSong; error: null }`

**Error responses:**

| Condition | Return |
|-----------|--------|
| No session | `{ data: null, error: 'Unauthorized' }` |
| Song not found | `{ data: null, error: 'Song not found.' }` |
| Invalid original_key | `{ data: null, error: 'Song has an invalid original key.' }` |
| RLS violation (`42501`) | `{ data: null, error: 'You do not have permission to modify this setlist.' }` |
| Other DB error | `{ data: null, error: 'Unable to add song to setlist. Please try again.' }` |
| Unexpected exception | `{ data: null, error: 'An unexpected error occurred. Please try again.' }` |

---

#### removeSongFromSetlist

**Input:** `{ id: string; setlist_id: string }`

Supabase queries (in order):
1. `DELETE FROM setlist_songs WHERE id = input.id AND setlist_id = input.setlist_id` — check `count === 0` → `'Song entry not found in setlist.'`
2. `SELECT id FROM setlist_songs WHERE setlist_id = input.setlist_id ORDER BY order_index ASC`
3. Sequential UPDATE loop: for each remaining row at index `i`, `.update({ order_index: i }).eq('id', row.id).eq('setlist_id', input.setlist_id)` — failure returns `'Unable to reorder setlist after removal. Please try again.'`

**Success:** `{ data: { id: string }; error: null }` — `id` is the deleted `setlist_songs.id`

**Error responses:**

| Condition | Return |
|-----------|--------|
| No session | `{ data: null, error: 'Unauthorized' }` |
| RLS violation (`42501`) | `{ data: null, error: 'You do not have permission to modify this setlist.' }` |
| Row not found (0 deleted) | `{ data: null, error: 'Song entry not found in setlist.' }` |
| Re-index loop failure | `{ data: null, error: 'Unable to reorder setlist after removal. Please try again.' }` |
| Unexpected exception | `{ data: null, error: 'An unexpected error occurred. Please try again.' }` |

---

#### updateSetlistSongOrder (renamed from reorderSetlist)

**Input:** `{ setlist_id: string; updates: Array<{ id: string; order_index: number }> }`

- Guard: `updates.length === 0` → `{ data: null, error: 'No updates provided.' }`
- Sequential UPDATE loop: `.update({ order_index }).eq('id', update.id).eq('setlist_id', input.setlist_id).select().single()` per row

**Success:** `{ data: DbSetlistSong[]; error: null }` — array of all updated rows

**Error responses:**

| Condition | Return |
|-----------|--------|
| No session | `{ data: null, error: 'Unauthorized' }` |
| Empty updates | `{ data: null, error: 'No updates provided.' }` |
| RLS violation (`42501`) | `{ data: null, error: 'You do not have permission to modify this setlist.' }` |
| DB error on any row | `{ data: null, error: 'Unable to reorder setlist. Please try again.' }` |
| Unexpected exception | `{ data: null, error: 'An unexpected error occurred. Please try again.' }` |

---

#### updatePerformanceDetails

**Input:** `{ id: string; setlist_id: string; performance_key?: string; singer?: string | null }`

- Guard: neither `performance_key` nor `singer` in payload → `{ data: null, error: 'No fields to update.' }`
- If `performance_key` provided: validate `NOTES.includes(performance_key)` → else `{ data: null, error: 'Invalid performance key. Must be one of: ' + NOTES.join(', ') }`
- Build update payload conditionally: include only fields that are present in the input object (use `'singer' in input` to distinguish omitted from `null`)
- `.update(payload).eq('id', input.id).eq('setlist_id', input.setlist_id).select().single()`

**Success:** `{ data: DbSetlistSong; error: null }` — full updated row

**Error responses:**

| Condition | Return |
|-----------|--------|
| No session | `{ data: null, error: 'Unauthorized' }` |
| No fields supplied | `{ data: null, error: 'No fields to update.' }` |
| Invalid `performance_key` | `{ data: null, error: 'Invalid performance key. Must be one of: ' + NOTES.join(', ') }` |
| RLS violation (`42501`) | `{ data: null, error: 'You do not have permission to modify this setlist.' }` |
| Row not found (`PGRST116`) | `{ data: null, error: 'Setlist song entry not found.' }` |
| Other DB error | `{ data: null, error: 'Unable to update performance details. Please try again.' }` |
| Unexpected exception | `{ data: null, error: 'An unexpected error occurred. Please try again.' }` |

---

#### getSetlistWithSongs

**Input:** `{ setlist_id: string }`

Supabase query (single join — no N+1):

```typescript
const { data, error } = await supabase
  .from('setlist_songs')
  .select('id, song_id, order_index, performance_key, singer, songs(id, title, artist, original_key, content)')
  .eq('setlist_id', input.setlist_id)
  .order('order_index', { ascending: true })
```

**Success shape:**

```typescript
{
  data: Array<{
    id: string
    song_id: string
    order_index: number
    performance_key: string
    singer: string | null
    songs: {
      id: string
      title: string
      artist: string
      original_key: string
      content: string
    }
  }>
  error: null
}
```

Empty array `[]` is a valid success (setlist exists but has no songs). No `auth.getUser()` session guard is required — `setlist_songs_select_authenticated` RLS allows any authenticated user to read; Supabase will return an empty array for unauthenticated callers rather than an error in this particular policy configuration, but adding the guard is acceptable for defensive consistency.

**Error responses:**

| Condition | Return |
|-----------|--------|
| No session | `{ data: null, error: 'Unauthorized' }` |
| DB error | `{ data: null, error: 'Unable to load setlist. Please try again.' }` |
| Unexpected exception | `{ data: null, error: 'An unexpected error occurred. Please try again.' }` |

---

## Implementation Order

Follow this sequence strictly:

1. **Migration first** — create `supabase/migrations/20260418000001_add_singer_to_setlist_songs.sql` with the SQL above and run it against your local Supabase instance (`supabase db push` or `supabase migration up`).
2. **Types** — add `singer: string | null` to `DbSetlistSong` in `src/types/supabase.ts`.
3. **Fix `addSongToSetlist`** — remove `order_index` from the input type, add `MAX(order_index)` query, add `NOTES` validation on `original_key`, include `singer: null` in the insert payload.
4. **Rename `reorderSetlist` → `updateSetlistSongOrder`** — change the function declaration name and the export. Search for all import sites of `reorderSetlist` in the project and update them.
5. **Add `removeSongFromSetlist`** — implement delete + SELECT remaining + sequential re-index loop.
6. **Add `updatePerformanceDetails`** — implement conditional payload build + `NOTES` validation + update.
7. **Add `getSetlistWithSongs`** — implement the single join query.

---

## Code Patterns to Follow

### Supabase client import

```typescript
import { createClient } from '@/services/supabase/server'
// Inside action:
const supabase = await createClient()
```

### Auth session check (required at the top of every action)

```typescript
const { data: { user } } = await supabase.auth.getUser()
if (!user) {
  return { data: null, error: 'Unauthorized' }
}
```

### Key validation pattern (from `src/app/actions/songActions.ts`)

```typescript
import { NOTES } from '@/utils/musicLogic'
// ...
if (!(NOTES as readonly string[]).includes(input.performance_key)) {
  return { data: null, error: 'Invalid performance key. Must be one of: ' + NOTES.join(', ') }
}
```

### RLS error handling pattern (from existing `setlistActions.ts`)

```typescript
if (error.code === '42501') {
  return { data: null, error: 'You do not have permission to modify this setlist.' }
}
```

### Try/catch wrapper (required on all actions)

```typescript
try {
  // ... action body
} catch {
  return { data: null, error: 'An unexpected error occurred. Please try again.' }
}
```

### Return type convention

```typescript
Promise<{ data: T | null; error: string | null }>
```

### Conditional update payload for singer field

```typescript
const payload: Record<string, unknown> = {}
if (input.performance_key !== undefined) payload.performance_key = input.performance_key
if ('singer' in input) payload.singer = input.singer
// 'singer' in input is true when singer is explicitly null; input.singer === undefined skips it
```

### MAX(order_index) for append

```typescript
const { data: maxRow } = await supabase
  .from('setlist_songs')
  .select('order_index')
  .eq('setlist_id', input.setlist_id)
  .order('order_index', { ascending: false })
  .limit(1)
  .single()
const nextIndex = maxRow ? maxRow.order_index + 1 : 0
```

Note: `.single()` will error if 0 rows exist — prefer `.maybeSingle()` or check for null data without treating it as an error when computing the next index for an empty setlist.

---

## Anti-Patterns to Avoid

- **Do not use `owner_id`** — the real column on `setlists` is `leader_id`. Never reference `owner_id`.
- **Do not use `Promise.all` for the update loop** — use sequential `for...of` to match the existing `reorderSetlist` pattern. Parallel writes can violate RLS order expectations.
- **Do not introduce Supabase RPC or Postgres functions** — all operations must use the Supabase JS client chained query API.
- **Do not pass `order_index` from the caller** to `addSongToSetlist` — compute it server-side only.
- **Do not leave `reorderSetlist` as a duplicate export** — rename it; do not alias it.
- **Do not use the service role key** (`SUPABASE_SERVICE_ROLE_KEY`) — use only the cookie-based client from `@/services/supabase/server`.
- **Do not call Supabase from Client Components** — all five actions are Server Actions (`'use server'` at the top of the file).
- **Do not use inline chord regex or custom key validation** — use `NOTES` from `src/utils/musicLogic.ts` exclusively.
- **Do not silently swallow DB errors** — every error path must return a descriptive string in the `error` field.

---

## Planning Artifacts

| Artifact | Path | Description |
|----------|------|-------------|
| Feature Specification | `tasks/TASK-017/spec.md` | Acceptance criteria + scope |
| Research Notes | `tasks/TASK-017/research.md` | Resolved questions + decisions |
| Technical Schema | `tasks/TASK-017/schema.md` | Endpoint contract table |
| Endpoint Contracts | `tasks/TASK-017/contracts/endpoints.md` | Full contract detail |

---

## Implementation Notes

- Read `docs/coding-guidelines.md` before writing any code.
- Read `docs/tech-stack.md` before choosing any library or package.
- Read `docs/structure.md` before creating any new file or directory.
- The `'use server'` directive is already at the top of `src/app/actions/setlistActions.ts` — do not add it again.
- The migration filename `20260418000001` is lexicographically after the latest existing migration (`20260417000001`). Do not use a timestamp that would sort before existing migrations.
- `getSetlistWithSongs` may live in `setlistActions.ts` (already `'use server'`) or in a dedicated data-fetching module — either is acceptable per the integration contract. Prefer keeping it in the same file for cohesion.
- After renaming `reorderSetlist`, run a global search for `reorderSetlist` across the codebase before committing to find and update all import sites.

---

## Amendments (from Context Bundle)

> Added by `@task-logger` after reconciling `spec.md` against `contracts/endpoints.md`. These criteria were not in the original spec but are required based on the more detailed integration contract produced by `@integration-contract`.

- [AC] `removeSongFromSetlist` input must include `setlist_id: string` in addition to `id: string` — `setlist_id` is required for RLS-scoped DELETE (`WHERE id = ? AND setlist_id = ?`) and for the post-delete re-index SELECT. Source: `tasks/TASK-017/contracts/endpoints.md` section 2.
- [AC] `updatePerformanceDetails` input must include `setlist_id: string` for RLS-scoped UPDATE (`WHERE id = ? AND setlist_id = ?`). The spec listed only `{ id, performance_key, singer? }` but the contracts require `setlist_id` for the WHERE clause. Source: `tasks/TASK-017/contracts/endpoints.md` section 4.
- [AC] `updatePerformanceDetails` — `performance_key` is optional (not required). The action must validate it only when present. The spec listed it as required (`performance_key: string`) but the contracts define it as `performance_key?: string`. At least one of `performance_key` or `singer` must be supplied. Source: `tasks/TASK-017/contracts/endpoints.md` section 4.
- [AC] `getSetlistWithSongs` query must be `setlist_songs`-centric (not setlist-centric): `.from('setlist_songs').select('id, song_id, order_index, performance_key, singer, songs(id, title, artist, original_key, content)').eq('setlist_id', ...).order('order_index', ...)`. The spec described a setlist-centric join shape; the contracts specify the `setlist_songs`-centric form. Source: `tasks/TASK-017/contracts/endpoints.md` section 5.

---

## Resolution

- **Completed:** 2026-04-18
- **Branch:** `feature/TASK-017-setlist-songs-junction`
- **Base branch:** `develop`
- **Files changed:**
  - `supabase/migrations/20260418000001_add_singer_to_setlist_songs.sql` — new migration adding `singer TEXT` column to `setlist_songs`
  - `src/types/supabase.ts` — added `singer: string | null` to `DbSetlistSong`
  - `src/app/actions/setlistActions.ts` — fixed `addSongToSetlist` (server-side `order_index`, `NOTES` validation, `singer: null`); renamed `reorderSetlist` → `updateSetlistSongOrder`; added `removeSongFromSetlist`, `updatePerformanceDetails`, `getSetlistWithSongs`
- **Notes:**
  - No callers of `reorderSetlist` were found outside `setlistActions.ts` — no import sites to update.
  - `getSetlistWithSongs` casts via `unknown` because Supabase infers embedded join relations as arrays while the contract defines `songs` as a singular object (FK guarantees one song per junction row). This is intentional and documented inline.
  - `removeSongFromSetlist` uses `delete({ count: 'exact' })` to detect the 0-deleted case without an extra SELECT, keeping the action to two round-trips (delete + fetch remaining) before the re-index loop.
  - TypeScript (`npx tsc --noEmit`) passes cleanly with zero errors.
