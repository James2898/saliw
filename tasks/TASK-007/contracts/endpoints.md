# Endpoint Contracts — Backend Infrastructure (Songs, Setlists, Server Actions)

## createSong() — MISSING (to be created)

- **Action:** `createSong()` in `src/app/actions/songActions.ts`
- **Input Type:**
  ```ts
  { title: string; artist: string; original_key: string; content: string }
  ```
- **Return Type:**
  ```ts
  { data: DbSong | null; error: string | null }
  ```
- **RLS Role Required:** `music_director` (enforced at DB layer via `is_music_director()` policy)
- **Supabase Table(s) Affected:** `songs`
- **Validation:** `content` must match `chordRegex` (at least one chord). `original_key` must be a valid note from the NOTES array (validated by RLS accepting any text — content-level validation in action).
- **Error States:**
  | Condition | Return |
  |-----------|--------|
  | No authenticated user | `{ data: null, error: 'Unauthorized' }` |
  | content fails chordRegex | `{ data: null, error: 'Song content must contain at least one valid chord.' }` |
  | RLS rejects (non-music_director) | `{ data: null, error: 'You do not have permission to perform this action.' }` |
  | Unexpected exception | `{ data: null, error: 'An unexpected error occurred. Please try again.' }` |
- **Gap Strategy:** N/A — created by this task.

---

## updateSong() — MISSING (to be created)

- **Action:** `updateSong()` in `src/app/actions/songActions.ts`
- **Input Type:**
  ```ts
  { id: string; title?: string; artist?: string; original_key?: string; content?: string }
  ```
- **Return Type:**
  ```ts
  { data: DbSong | null; error: string | null }
  ```
- **RLS Role Required:** `music_director` (enforced at DB layer)
- **Supabase Table(s) Affected:** `songs`
- **Validation:** If `content` is provided, must match `chordRegex`.
- **Error States:**
  | Condition | Return |
  |-----------|--------|
  | No authenticated user | `{ data: null, error: 'Unauthorized' }` |
  | content fails chordRegex | `{ data: null, error: 'Song content must contain at least one valid chord.' }` |
  | RLS rejects | `{ data: null, error: 'You do not have permission to perform this action.' }` |
  | Song not found | `{ data: null, error: 'Song not found.' }` |
  | Unexpected exception | `{ data: null, error: 'An unexpected error occurred. Please try again.' }` |
- **Gap Strategy:** N/A — created by this task.

---

## deleteSong() — MISSING (to be created)

- **Action:** `deleteSong()` in `src/app/actions/songActions.ts`
- **Input Type:**
  ```ts
  { id: string }
  ```
- **Return Type:**
  ```ts
  { data: { id: string } | null; error: string | null }
  ```
- **RLS Role Required:** `music_director` (enforced at DB layer)
- **Supabase Table(s) Affected:** `songs`
- **Error States:**
  | Condition | Return |
  |-----------|--------|
  | No authenticated user | `{ data: null, error: 'Unauthorized' }` |
  | RLS rejects | `{ data: null, error: 'You do not have permission to perform this action.' }` |
  | Unexpected exception | `{ data: null, error: 'An unexpected error occurred. Please try again.' }` |
- **Gap Strategy:** N/A — created by this task.

---

## createSetlist() — MISSING (to be created)

- **Action:** `createSetlist()` in `src/app/actions/setlistActions.ts`
- **Input Type:**
  ```ts
  { name: string; date: string; is_public?: boolean }
  ```
- **Return Type:**
  ```ts
  { data: DbSetlist | null; error: string | null }
  ```
- **RLS Role Required:** Any authenticated user (leader_id is set to auth.uid())
- **Supabase Table(s) Affected:** `setlists`
- **Error States:**
  | Condition | Return |
  |-----------|--------|
  | No authenticated user | `{ data: null, error: 'Unauthorized' }` |
  | Unexpected exception | `{ data: null, error: 'An unexpected error occurred. Please try again.' }` |
- **Gap Strategy:** N/A — created by this task.

---

## addSongToSetlist() — MISSING (to be created)

- **Action:** `addSongToSetlist()` in `src/app/actions/setlistActions.ts`
- **Input Type:**
  ```ts
  { setlist_id: string; song_id: string; order_index: number }
  ```
- **Return Type:**
  ```ts
  { data: DbSetlistSong | null; error: string | null }
  ```
- **RLS Role Required:** `leader_id` of the setlist must match `auth.uid()` (enforced by RLS on `setlist_songs`)
- **Supabase Table(s) Affected:** `songs` (read `original_key`), `setlist_songs` (insert)
- **Logic:** Fetch `songs.original_key` for `song_id`, then insert into `setlist_songs` with `performance_key = original_key`.
- **Error States:**
  | Condition | Return |
  |-----------|--------|
  | No authenticated user | `{ data: null, error: 'Unauthorized' }` |
  | Song not found | `{ data: null, error: 'Song not found.' }` |
  | RLS rejects (not leader) | `{ data: null, error: 'You do not have permission to modify this setlist.' }` |
  | Unexpected exception | `{ data: null, error: 'An unexpected error occurred. Please try again.' }` |
- **Gap Strategy:** N/A — created by this task.

---

## reorderSetlist() — MISSING (to be created)

- **Action:** `reorderSetlist()` in `src/app/actions/setlistActions.ts`
- **Input Type:**
  ```ts
  { setlist_id: string; updates: Array<{ id: string; order_index: number }> }
  ```
  where `id` is the `setlist_songs.id` (junction table row PK)
- **Return Type:**
  ```ts
  { data: DbSetlistSong[] | null; error: string | null }
  ```
- **RLS Role Required:** `leader_id` of the setlist must match `auth.uid()` (enforced by RLS on `setlist_songs`)
- **Supabase Table(s) Affected:** `setlist_songs` (bulk update)
- **Logic:** For each `{ id, order_index }` pair, issue an UPDATE on `setlist_songs` WHERE `id = <id>` AND `setlist_id = <setlist_id>`. Return the updated rows.
- **Error States:**
  | Condition | Return |
  |-----------|--------|
  | No authenticated user | `{ data: null, error: 'Unauthorized' }` |
  | Empty updates array | `{ data: null, error: 'No updates provided.' }` |
  | RLS rejects | `{ data: null, error: 'You do not have permission to modify this setlist.' }` |
  | Unexpected exception | `{ data: null, error: 'An unexpected error occurred. Please try again.' }` |
- **Gap Strategy:** N/A — created by this task.

---

## deleteSetlist() — MISSING (to be created) [was MISSING in api-discovery.md — now in scope]

- **Action:** `deleteSetlist()` in `src/app/actions/setlistActions.ts`
- **Input Type:**
  ```ts
  { id: string }
  ```
- **Return Type:**
  ```ts
  { data: { id: string } | null; error: string | null }
  ```
- **RLS Role Required:** `leader_id` must match `auth.uid()` (enforced at DB layer by RLS on `setlists`)
- **Supabase Table(s) Affected:** `setlists` (delete; CASCADE removes `setlist_songs` entries)
- **Error States:**
  | Condition | Return |
  |-----------|--------|
  | No authenticated user | `{ data: null, error: 'Unauthorized' }` |
  | RLS rejects (not leader) | `{ data: null, error: 'You do not have permission to delete this setlist.' }` |
  | Unexpected exception | `{ data: null, error: 'An unexpected error occurred. Please try again.' }` |
- **Gap Strategy:** N/A — created by this task.
