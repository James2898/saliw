# Endpoint Contracts — Stage-Ready Setlist Viewer

---

## 1. Page Load: Fetch All Songs — EXISTS

- **Type:** Next.js Server Action (`'use server'`)
- **Function:** `getSetlistWithSongs(input: { setlist_id: string })`
- **File:** `src/app/actions/setlistActions.ts` (line 311)
- **Request Payload:**
  ```ts
  { setlist_id: string }  // UUID of the setlist
  ```
- **Success Response:**
  ```ts
  {
    data: Array<{
      id: string             // setlist_songs.id (junction PK — used as junction_id)
      song_id: string        // songs.id
      order_index: number    // ascending sort order
      performance_key: string // key to initialize ChordSheetClient with
      singer: string | null
      songs: {
        id: string
        title: string
        artist: string
        original_key: string
        content: string      // raw chord/lyric content; must pass through preProcessChords server-side
      }
    }> | null
    error: string | null
  }
  ```
- **Error Response:**
  | Condition | `error` value | UI Behavior |
  |-----------|---------------|-------------|
  | User not authenticated | `'Unauthorized'` | Redirect to `/login` (handled before this call) |
  | Supabase query failure | `'Unable to load setlist. Please try again.'` | Render full-page error card with this message |
  | Empty array (no songs) | `error: null`, `data: []` | Render empty state: "No songs in this setlist yet." |
- **RLS Policy:** `setlist_songs_select_authenticated` — any authenticated user with an active session may read. Verified in `supabase/migrations/20260415000003_create_setlist_songs_table.sql`.
- **Gap Strategy:** N/A — EXISTS.

---

## 2. Page Load: Fetch Setlist Header — MISSING

- **Type:** Inline Supabase query in Server Component (no named Server Action exists)
- **Required fields:** `id`, `name`, `date`, `leader_id`, `is_public`
- **Equivalent query:**
  ```ts
  const { data: setlist, error } = await supabase
    .from('setlists')
    .select('id, name, date, leader_id, is_public')
    .eq('id', setlist_id)
    .single()
  ```
- **Success Response:**
  ```ts
  {
    id: string
    name: string
    date: string          // timestamptz stored as string
    leader_id: string     // UUID — compared against user.id to gate Sync button
    is_public: boolean
  }
  ```
- **Error Response:**
  | Condition | Supabase error code | UI Behavior |
  |-----------|---------------------|-------------|
  | Row not found (invalid ID) | `PGRST116` | Render full-page error card: "Unable to load setlist. Please try again." |
  | Auth / RLS block | `42501` | Redirect to `/login` (auth check runs first) |
  | Network / unexpected | other | Render full-page error card |
- **RLS Policy:** `setlists_select_authenticated` — any authenticated user may read all setlists. Verified in `supabase/migrations/20260415000002_create_setlists_table.sql`.
- **Gap Strategy:** This query must be added as either:
  - (a) An inline `supabase.from('setlists')` query directly in `src/app/setlists/[id]/page.tsx` (the Server Component), or
  - (b) A new named Server Action `getSetlistById({ id: string })` added to `src/app/actions/setlistActions.ts`.
  Option (a) is consistent with the pattern in `src/app/setlists/page.tsx`. Option (b) is preferred if the action needs to be reused elsewhere.
  Until resolved: the page cannot display name/date, and `isLeader` cannot be determined — the Sync button must be hidden for all users as a fallback (consistent with the spec's fallback: "Profile fetch fails → default `isLeader` to `false`").

---

## 3. Redirect Unauthenticated Users — EXISTS

- **Type:** Server-side auth check via `supabase.auth.getUser()`
- **Function:** `createClient()` from `src/services/supabase/server.ts`, then `supabase.auth.getUser()`
- **Pattern:** Identical to `src/app/setlists/page.tsx` (line 13–17) and `src/app/library/[id]/page.tsx`
- **Behavior:** If `user` is `null`, call `redirect('/login')` before any data fetch. This is a server-side redirect — no client round-trip.
- **Gap Strategy:** N/A — EXISTS pattern.

---

## 4. Leader Check (gate Sync button) — EXISTS (pattern, prop-drilled)

- **Type:** Client-side boolean comparison; no backend call
- **Source:** `setlists.leader_id` (from the MISSING header fetch) compared against `user.id` (from `supabase.auth.getUser()` in the Server Component)
- **Prop name (recommended):** `isLeader: boolean` — computed in the Server Component, passed down to the per-song Client Component wrapper
- **Ownership field:** `DbSetlist.leader_id` (confirmed in `src/types/supabase.ts` line 31, migration line 7)
- **Fallback:** If the header fetch fails and `leader_id` cannot be determined, `isLeader` defaults to `false` — Sync button hidden for all users.
- **Gap Strategy:** N/A — pattern exists; depends on resolving the MISSING header fetch (operation 2).

---

## 5. Service Navigator: Scroll to Section — CLIENT-ONLY

- **Type:** Browser API — `element.scrollIntoView({ behavior: 'smooth' })`
- **No backend call.** Section IDs follow the pattern `song-{junction_id}` where `junction_id` is `setlist_songs.id`.
- **Component placement:** `src/components/client/` per AC-21.
- **Gap Strategy:** N/A — CLIENT-ONLY.

---

## 6. IntersectionObserver: Highlight Active Song — CLIENT-ONLY

- **Type:** Browser API — `new IntersectionObserver(callback, options)`
- **No backend call.** Observes all `section[id^="song-"]` elements. Tracks highest `intersectionRatio`; on tie, prefers lower `order_index`.
- **Memory leak guard:** Observer must be disconnected in `useEffect` cleanup (returned cleanup function).
- **MEMORY.md note:** The existing bug log flags synchronous `setState` inside `useEffect` render phase. The IntersectionObserver callback runs outside React's render cycle — calling `setState` inside it is safe and is the standard pattern.
- **Gap Strategy:** N/A — CLIENT-ONLY.

---

## 7. Per-Song Chord Sheet Initializes at performance_key — EXISTS (pattern)

- **Type:** Props-only — no backend call at render time
- **How:** `performance_key` from `getSetlistWithSongs` response is passed as the `originalKey` prop to `ChordSheetClient`
- **ChordSheetClient signature (existing):**
  ```ts
  interface ChordSheetClientProps {
    processedLines: ProcessedLine[]  // must be computed server-side via preProcessChords()
    originalKey: string              // pass performance_key here, not songs.original_key
  }
  ```
- **File:** `src/components/SongViewer/ChordSheetClient.tsx` (line 36–39)
- **Wrapping requirement (AC-11):** Each song's `ChordSheetClient` must be wrapped in `React.memo` to prevent re-renders from navigator IntersectionObserver state changes.
- **Gap Strategy:** N/A — EXISTS.

---

## 8. "Sync to Setlist" Button: Persist displayKey — EXISTS

- **Type:** Next.js Server Action (`'use server'`)
- **Function:** `updatePerformanceDetails(input: { id: string; setlist_id: string; performance_key?: string; singer?: string | null })`
- **File:** `src/app/actions/setlistActions.ts` (line 250)
- **Exact signature:**
  ```ts
  async function updatePerformanceDetails(
    input: { id: string; setlist_id: string; performance_key?: string; singer?: string | null }
  ): Promise<{ data: DbSetlistSong | null; error: string | null }>
  ```
- **Call site (per AC-13):**
  ```ts
  updatePerformanceDetails({
    id: junction_id,          // setlist_songs.id
    setlist_id: setlist_id,   // parent setlist UUID (required for RLS scoping)
    performance_key: displayKey  // current value from useTranspose hook
  })
  ```
- **Validation:** `performance_key` is validated against the `NOTES` array server-side (line 268). Invalid keys return `error: 'Invalid performance key. Must be one of: ...'`.
- **Guard:** At least one of `performance_key` or `singer` must be present in payload (line 262). Omitting both returns `error: 'No fields to update.'` — this cannot happen at the Sync button call site since `performance_key` is always passed.
- **Success Response:**
  ```ts
  {
    data: DbSetlistSong  // full updated row: { id, setlist_id, song_id, order_index, performance_key, singer }
    error: null
  }
  ```
- **Error Response:**
  | Status / Code | `error` value | UI Behavior |
  |---------------|---------------|-------------|
  | `42501` (RLS block — not leader) | `'You do not have permission to modify this setlist.'` | Show inline error adjacent to Sync button; button returns to default icon |
  | `PGRST116` (row not found) | `'Setlist song entry not found.'` | Show inline error adjacent to Sync button |
  | Unexpected | `'Unable to update performance details. Please try again.'` | Show inline error adjacent to Sync button |
  | Invalid key | `'Invalid performance key. Must be one of: ...'` | Show inline error adjacent to Sync button |
- **RLS Policy:** `setlist_songs_update_leader` — only the `setlists.leader_id` matching `auth.uid()` may update. Verified in `supabase/migrations/20260415000003_create_setlist_songs_table.sql` (lines 37–54). The `setlist_id` parameter in the call scopes the `.eq('setlist_id', input.setlist_id)` clause, which is required for this RLS policy to resolve.
- **In-flight guard (AC-16):** Sync button must be disabled while the action is pending (use React `useTransition` or a local `isPending` state).
- **Success UX (AC-14):** On `{ data: ..., error: null }`, switch button icon to Lucide `Check` for 2 seconds via `setTimeout`, then revert to Lucide `RefreshCw`. No page reload.
- **Gap Strategy:** N/A — EXISTS.

---

## Type Gap Analysis

| Gap | Detail | Risk |
|-----|--------|------|
| `DbSetlist.date` is `string` in TypeScript but `timestamptz` in Postgres | Supabase JS client returns `timestamptz` as an ISO 8601 string — no conversion needed, but display formatting must handle this. | Low |
| `getSetlistWithSongs` return type casts `songs` relation via `as unknown as` | The Supabase JS client returns joined relations as arrays even for FK-guaranteed single rows. The `as unknown` cast is intentional (line 351). The runtime value is a single object, not an array, due to the FK constraint. | Low — documented in code comment |
| No named `getSetlistById` Server Action exists | The setlist header (`name`, `date`, `leader_id`) is required by the viewer page but not returned by `getSetlistWithSongs`. Must be added. | HIGH — blocks page header and Sync button gating |

---

## RLS Verification Summary

| Operation | Table | Policy | Covers TASK-018? |
|-----------|-------|--------|-----------------|
| SELECT setlists (header fetch) | `setlists` | `setlists_select_authenticated` | YES — any authenticated user |
| SELECT setlist_songs + songs join | `setlist_songs` | `setlist_songs_select_authenticated` | YES — any authenticated user |
| UPDATE setlist_songs (Sync button) | `setlist_songs` | `setlist_songs_update_leader` | YES — only leader; non-leader gets `42501` which the UI handles with inline error |

All required RLS policies are in place. No policy gaps for TASK-018 operations.

---

## Recommended Component Architecture

| Component | Type | Location | Reason |
|-----------|------|----------|--------|
| `src/app/setlists/[id]/page.tsx` | Server Component | `src/app/setlists/[id]/` | Fetches all data; calls `getSetlistWithSongs` and setlist header query; passes `isLeader` prop down |
| `ServiceNavigator` | Client Component (`'use client'`) | `src/components/client/ServiceNavigator.tsx` | Requires IntersectionObserver, scroll events, useState — all browser APIs |
| `SetlistSongSection` (or equivalent per-song wrapper) | Client Component (`'use client'`) | `src/components/client/SetlistSongSection.tsx` | Contains Sync button state (`isPending`, success/error, icon timer) and `useTranspose` access |
| `ChordSheetClient` (existing) | Client Component (`'use client'`) | `src/components/SongViewer/ChordSheetClient.tsx` | Reuse as-is; wrap in `React.memo` at the call site |
| Sync button logic | Part of `SetlistSongSection` | — | Must access `displayKey` from `useTranspose` — must be co-located with or a child of the component holding `useTranspose` state |

Key constraint: `ChordSheetClient` does not expose `displayKey` to its parent — the hook is internal. The Sync button must either (a) live inside `ChordSheetClient` as an optional rendered prop, or (b) `SetlistSongSection` must own `useTranspose` state directly and pass `semitoneOffset` / `processedLines` into a slimmer chord display component. Option (b) avoids modifying the existing `ChordSheetClient` API and is preferred per AC-spec note: "The 'Sync' button is an additive wrapper around it, not baked inside `ChordSheetClient` itself."

If option (b) is chosen: `SetlistSongSection` owns `useTranspose(performance_key)`, reads `displayKey` for the Sync call, and passes `processedLines` + `displayKey` (as `originalKey`) into a wrapped version of `ChordSheetClient`. This requires `ChordSheetClient` to accept an externally controlled key or `SetlistSongSection` to re-implement the chord sheet render. This is an architectural decision for `@fullstack-developer` to resolve — flagged here as a load-bearing ambiguity.
