# Endpoint Contracts — Collaborative Realtime Sync (TASK-021)

---

## `getSetlistWithSongs()` — EXISTS (State Check)

- **Type:** Next.js Server Action
- **File:** `src/app/actions/setlistActions.ts`
- **Caller context:** `useSetlistSync` hook (Follow Leader enable path), client-side import
- **Input:**
  ```ts
  { setlist_id: string }
  ```
- **Success Response:**
  ```ts
  {
    data: Array<{
      id: string              // junctionId
      song_id: string
      order_index: number
      performance_key: string
      singer: string | null
      songs: {
        id: string; title: string; artist: string
        original_key: string; content: string
      }
    }> | null
    error: null
  }
  ```
- **Error Response:**
  ```ts
  { data: null; error: string }
  ```
- **RLS:** `setlist_songs_select_public_or_authenticated` — passes for any authenticated follower.
- **Tables:** `setlist_songs` SELECT with `songs` JOIN.
- **Error States:**
  | Condition | UI Behavior |
  |---|---|
  | `error !== null` | Show "Unable to sync current state." (`text-xs text-red-500`); proceed to subscribe anyway; `overrideKeys` map is empty |
  | Empty array (no songs) | Valid; snapshot is empty Map; Follow Leader activates |
- **Gap Strategy:** N/A — EXISTS.

---

## `updatePerformanceDetails()` — EXISTS (Go Live auto-persist)

- **Type:** Next.js Server Action
- **File:** `src/app/actions/setlistActions.ts`
- **Caller context:** `useSetlistSync` hook (Director Go Live path), called after 400ms debounce elapses
- **Input:**
  ```ts
  {
    id: string          // setlist_songs.id (junctionId)
    setlist_id: string
    performance_key: string
    // singer omitted — never touched by Go Live path
  }
  ```
- **Success Response:**
  ```ts
  { data: DbSetlistSong; error: null }
  ```
- **Error Response:**
  ```ts
  { data: null; error: string }
  ```
- **RLS:** `setlist_songs_update_leader` — passes only when `setlists.leader_id = auth.uid()`. Always passes for the Director.
- **Tables:** `setlist_songs` UPDATE on `performance_key`.
- **RF-1 Sequence Guard:** Each debounced call captures a per-`junctionId` monotonic counter. On resolve, skip broadcast if a later sequence has already resolved.
- **RF-5 Stale Closure Guard:** `displayKey` is read from `latestKeyRef.current` (a `useRef`) inside the debounced callback, not from closure scope.
- **On Success:** Broadcast `KEY_CHANGE` event fires. Per-song area → D-5 (Check + "Synced", auto-clears 2s).
- **On Failure:** Broadcast suppressed. Per-song area → D-6 (red error string). Local chord display not rolled back.
- **Error States:**
  | Condition | Code | UI Behavior |
  |---|---|---|
  | RLS violation | `42501` | D-6: "You do not have permission to modify this setlist." |
  | Record not found | `PGRST116` | D-6: "Setlist song entry not found." |
  | Invalid key (unreachable) | custom | D-6: "Invalid performance key. Must be one of: …" |
  | Server error | — | D-6: "Unable to update performance details. Please try again." |
- **Gap Strategy:** N/A — EXISTS.

---

## Supabase Broadcast Channel — MISSING (net-new)

- **Type:** Supabase Realtime Broadcast (not a Server Action)
- **File:** `src/hooks/useSetlistSync.ts` (new)
- **Channel name:** `setlist_sync:${setlistId}`
- **Config:** `{ broadcast: { self: false } }`
- **Client:** `createClient()` from `src/services/supabase/client.ts`
- **Subscribe callback states:**
  | `status` value | Behavior |
  |---|---|
  | `'SUBSCRIBED'` | Director → D-3 (LIVE badge); Follower → F-3 (Synced dot) |
  | `'CHANNEL_ERROR'` | Director → D-1 + `liveError = 'Unable to start live session. Please try again.'` |
  | `'CLOSED'` | Follower → `followSyncStatus = 'lost'`; "Lost connection." hint shown |
- **Gap Strategy:** New hook to be created. Go Live and Follow Leader buttons are absent from DOM until `useSetlistSync` is implemented and wired.

---

## `SONG_CHANGE` Broadcast — MISSING (net-new)

- **Type:** Supabase Broadcast send / receive
- **File:** `src/hooks/useSetlistSync.ts` (new)
- **Direction:** Director → all Followers subscribed to `setlist_sync:${setlistId}`
- **Trigger:** `activeSongId` changes in ServiceNavigator while `isLive === true`. No debounce.
- **Send payload:**
  ```ts
  { type: 'broadcast', event: 'SONG_CHANGE', payload: { junctionId: string } }
  ```
- **Receive handler:** `scrollIntoView({ behavior: 'smooth', block: 'start' })` on `#song-${junctionId}`.
- **Failure modes:** Element not found → silent skip. `channel.send()` throws → console.error only; no user-facing error.
- **Gap Strategy:** Fire-and-forget. Director navigation is unaffected by send failure.

---

## `KEY_CHANGE` Broadcast — MISSING (net-new)

- **Type:** Supabase Broadcast send / receive
- **File:** `src/hooks/useSetlistSync.ts` (new)
- **Direction:** Director → all Followers subscribed to `setlist_sync:${setlistId}`
- **Trigger:** `updatePerformanceDetails()` resolves with `{ error: null }`.
- **Send payload:**
  ```ts
  { type: 'broadcast', event: 'KEY_CHANGE', payload: { junctionId: string; performanceKey: string } }
  ```
  `performanceKey` is the DB-confirmed value, not the optimistic local value.
- **Receive handler:**
  - If `junctionId` not in rendered songs: silent ignore.
  - Else: `setOverrideKeys(prev => new Map(prev).set(junctionId, performanceKey))`.
  - Updated `overrideKeys` flows to `ChordSheetClient.externalKey` → `setTargetKey(externalKey)` (with RF-2 guard: only if `externalKey !== displayKey`).
- **Gap Strategy:** Only fires after Server Action success. Dropped sends (network) are not retried; the next key save will send the latest value.

---

## Channel Unsubscribe — MISSING (net-new)

- **Type:** Supabase Realtime client call
- **File:** `src/hooks/useSetlistSync.ts` (new)
- **Triggers:**
  1. Director taps LIVE badge to stop Go Live (explicit toggle-off)
  2. Follower taps active Follow Leader toggle (explicit toggle-off)
  3. `useEffect` cleanup on component unmount (page navigation away)
- **Call:** `supabase.removeChannel(channelRef.current)`
- **Post-unsubscribe state:**
  - Director: `isLive = false`, `channelRef.current = null`
  - Follower: `isFollowing = false`, `overrideKeys` reverted to State Check snapshot (or empty if snapshot was not available), `followSyncStatus = 'idle'`
- **Gap Strategy:** Called in `useEffect` cleanup; no user-visible gap possible.

---

## New Files Required

| File | Type | Purpose |
|---|---|---|
| `src/hooks/useSetlistSync.ts` | New hook | All Realtime logic: subscribe, unsubscribe, send, receive, debounce, sequence guard |
| `src/utils/realtimeEvents.ts` | New constants | `REALTIME_EVENTS.SONG_CHANGE` and `REALTIME_EVENTS.KEY_CHANGE` string constants |

## Existing Files Modified

| File | Change |
|---|---|
| `src/components/SongViewer/ChordSheetClient.tsx` | Add `externalKey?` and `onKeyChangeLive?` props |
| `src/components/client/SetlistSongSection.tsx` | Add `overrideKey?` and `onKeyChangeLive?` props; wire to ChordSheetClient |
| `src/components/client/ServiceNavigator.tsx` | Add `isLeader`, `setlistId`, `isAuthenticated`, `sync` props; render Go Live / Follow Leader controls |
| `src/app/setlists/[id]/page.tsx` | Pass new props; instantiate `useSetlistSync` in a wrapper client component |
