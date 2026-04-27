# Endpoint Contracts — Worship Leader & Lineup on Setlist Pages

---

## Set / Clear Worship Leader — EXISTS

- **Action:** `setSetlistWorshipLeader()` in `src/app/actions/setlistActions.ts`
- **Delegates to:** `updateSetlist()` in the same file (thin wrapper — no independent DB call)
- **Input Type:**
  ```ts
  { setlist_id: string; worship_leader_id: string | null }
  ```
- **Return Type:**
  ```ts
  { data: { id: string } | null; error: string | null }
  ```
- **RLS Role Required:** `music_director` (setlists UPDATE policy)
- **Supabase Table(s) Affected:** `setlists` (column: `worship_leader_id`)
- **Error States:**
  | Condition | Supabase Code | error string returned | UI Behavior |
  |-----------|--------------|----------------------|-------------|
  | Not authenticated | — | `"Unauthorized"` | Show inline error; disable picker |
  | No permission (RLS) | `42501` | `"You do not have permission to modify this setlist."` | Show inline error toast |
  | General DB error | other | `"Unable to update setlist. Please try again."` | Show inline error toast |
  | Unexpected exception | — | `"An unexpected error occurred. Please try again."` | Show inline error toast |
- **Special UI note:** Passing `null` clears the worship leader. The picker must support a "None / Clear" option that passes `null`. On success, update local state from the returned `{ id }` confirmation — do NOT optimistically update before the action resolves.
- **Gap Strategy:** N/A

---

## Add Musician to Lineup — EXISTS

- **Action:** `addSetlistMusician()` in `src/app/actions/setlistActions.ts`
- **Input Type:**
  ```ts
  { setlist_id: string; musician_id: string; instrument: string }
  ```
  Note: `instrument` is trimmed server-side. Frontend should also trim before calling.
- **Return Type:**
  ```ts
  { data: DbSetlistMusician | null; error: string | null }
  ```
  where `DbSetlistMusician = { id: string; setlist_id: string; musician_id: string; instrument: string; created_at: string; updated_at: string }`
- **RLS Role Required:** `music_director` (setlist_musicians INSERT policy)
- **Supabase Table(s) Affected:** `setlist_musicians`
- **Error States:**
  | Condition | Supabase Code | error string returned | UI Behavior |
  |-----------|--------------|----------------------|-------------|
  | Not authenticated | — | `"Unauthorized"` | Show inline error; block submit |
  | Duplicate (same musician + instrument) | `23505` | `"That musician is already assigned to that instrument."` | Show inline validation message below the form field — NOT a toast. This is the one error string that is user-actionable and must surface distinctly |
  | No permission (RLS) | `42501` | `"You do not have permission to perform this action."` | Show inline error toast |
  | General DB error | other | `"Unable to add musician to setlist. Please try again."` | Show inline error toast |
  | Unexpected exception | — | `"An unexpected error occurred. Please try again."` | Show inline error toast |
- **Special UI note:** The `23505` duplicate error requires dedicated inline treatment (not a generic toast) because it is a user-correctable conflict. All other errors can be shown via toast. State update only on `data !== null`.
- **Gap Strategy:** N/A

---

## Remove Musician from Lineup — EXISTS

- **Action:** `removeSetlistMusician()` in `src/app/actions/setlistActions.ts`
- **Input Type:**
  ```ts
  { id: string; setlist_id: string }
  ```
  where `id` is the `setlist_musicians` table PK (i.e., `SetlistLineupEntry.id`), not `musician_id`.
- **Return Type:**
  ```ts
  { data: { id: string } | null; error: string | null }
  ```
- **RLS Role Required:** `music_director` (setlist_musicians DELETE policy)
- **Supabase Table(s) Affected:** `setlist_musicians`
- **Error States:**
  | Condition | Supabase Code | error string returned | UI Behavior |
  |-----------|--------------|----------------------|-------------|
  | Not authenticated | — | `"Unauthorized"` | Show inline error |
  | No permission (RLS) | `42501` | `"You do not have permission to perform this action."` | Show inline error toast |
  | General DB error | other | `"Unable to remove musician from setlist. Please try again."` | Show inline error toast |
  | Unexpected exception | — | `"An unexpected error occurred. Please try again."` | Show inline error toast |
- **Special UI note:** Note that the action does NOT return a 404-style error if the row is not found — Supabase DELETE on a missing row succeeds silently (count is not checked in this action, unlike `removeSongFromSetlist`). The UI should treat any `error === null` response as a successful removal regardless of whether the row existed.
- **Gap Strategy:** N/A

---

## Read Setlist Lineup — EXISTS

- **Action:** `getSetlistLineup()` in `src/app/actions/setlistActions.ts`
- **Input Type:**
  ```ts
  { setlist_id: string }
  ```
- **Return Type:**
  ```ts
  {
    data: Array<{
      id: string
      musician_id: string
      instrument: string
      musicians: { id: string; name: string }
    }> | null
    error: string | null
  }
  ```
  (typed as `SetlistLineupEntry[]` via `src/types/Musician.ts`)
- **RLS Role Required:** public read (authenticated users — same policy as setlist_songs)
- **Supabase Table(s) Affected:** `setlist_musicians` (join: `musicians`)
- **Order:** `instrument ASC`, then `musicians.name ASC`
- **Error States:**
  | Condition | error string returned | UI Behavior |
  |-----------|----------------------|-------------|
  | General DB error | `"Unable to load setlist lineup. Please try again."` | Pass `[]` to component; render empty lineup state |
  | Unexpected exception | `"An unexpected error occurred. Please try again."` | Pass `[]` to component; render empty lineup state |
- **Call sites:**
  - Edit page (`src/app/setlists/[id]/edit/page.tsx`): called in the parallel fetch block alongside `getSetlistWithSongs` and `getAllSongs`. On error, pass `[]` — do not block page render.
  - Viewer page (`src/app/setlists/[id]/page.tsx`): called in the parallel fetch block alongside `getSetlistWithSongs`. On error, pass `[]` — do not block page render.
- **Gap Strategy:** N/A

---

## Populate Worship Leader + Musician Picker — EXISTS

- **Action:** `listMusicians()` in `src/app/actions/musicianActions.ts`
- **Input Type:** none (no arguments)
- **Return Type:**
  ```ts
  { data: DbMusician[] | null; error: string | null }
  ```
  where `DbMusician = { id: string; name: string; notes: string | null; created_by: string | null; created_at: string; updated_at: string }`
- **Frontend projection:** Component receives `Musician[]` (`{ id, name, notes }`) — strip `created_by`, `created_at`, `updated_at` at the page level before passing as props.
- **Order:** `name ASC` (enforced server-side)
- **RLS Role Required:** public read (authenticated users)
- **Supabase Table(s) Affected:** `musicians` (read only)
- **Error States:**
  | Condition | error string returned | UI Behavior |
  |-----------|----------------------|-------------|
  | General DB error | `"Unable to load musicians. Please try again."` | Pass `[]`; worship leader picker and musician add form render with empty options; show a subtle "Could not load musicians" hint near the picker |
  | Unexpected exception | `"An unexpected error occurred. Please try again."` | Same as above |
- **Worship leader name resolution (viewer page):** The viewer page calls `listMusicians()` server-side once and holds the result. It resolves the worship leader name by doing an array lookup (`musicians.find(m => m.id === setlist.worship_leader_id)`) — no separate DB join and no extra round-trip. If `listMusicians` returns an error or `worship_leader_id` is not found in the array, render nothing (omit the worship leader display row rather than showing an error).
- **Gap Strategy:** N/A
