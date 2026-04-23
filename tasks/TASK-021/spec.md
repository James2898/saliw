# Spec — Collaborative Realtime Sync: Go Live & Catch Up Logic

## Feature Summary

Add collaborative realtime synchronization to the Setlist Viewer (`src/app/setlists/[id]`). The setlist `leader_id` user (the Director) can activate a "Go Live" mode from the `ServiceNavigator` bar. While live, every key change the Director makes to any song is debounced (400ms), persisted to `setlist_songs.performance_key` via the existing `updatePerformanceDetails` Server Action, and then broadcast over a Supabase Broadcast channel scoped to the setlist (`setlist_sync:${setlistId}`). When the Director's active song changes, a navigation broadcast is also sent. Non-leader authenticated users see a "Follow Leader" toggle in the `ServiceNavigator` bar; enabling it performs an immediate State Check (re-fetching all current `performance_key` values from the DB) and then subscribes to incoming `SONG_CHANGE` and `KEY_CHANGE` events, updating the follower's chord view non-disruptively. Font size and chord-visibility preferences remain user-specific and are never overridden by sync events.

---

## Scope Boundaries

### In Scope

- "Go Live" toggle in the `ServiceNavigator` bar, visible only when `isLeader === true`.
- Supabase Broadcast channel `setlist_sync:${setlistId}` for `SONG_CHANGE` and `KEY_CHANGE` events.
- Debounced (400ms) auto-persist-and-broadcast on every key stepper tap or dropdown selection while Go Live is active.
- "Follow Leader" toggle in the `ServiceNavigator` bar, visible only when `isLeader === false` AND user is authenticated.
- State Check (DB re-fetch of `performance_key` for all songs) on Follow Leader enable.
- `externalKey` prop added to `ChordSheetClient` to allow key injection from Follow Leader mode.
- New `useSetlistSync` custom hook encapsulating all Realtime subscribe/unsubscribe/send logic.
- New `src/utils/realtimeEvents.ts` constants file for event type strings.
- `bg-red-600 text-white` styling for the LIVE badge.
- Verification or creation of `src/services/supabase/client.ts` (already exists — confirmed).
- `ServiceNavigator` updated to accept and render Go Live and Follow Leader controls alongside its existing song list.

### Out of Scope

- Supabase Presence (connected-user tracking) — Broadcast only.
- Persisting Go Live or Follow Leader toggle state to the database.
- Broadcasting setlist reorder, song add, or song remove events.
- Push notifications or out-of-browser alerts.
- Director seeing a follower count.
- Backend RLS enforcement on Broadcast channel authorization.
- Guest (unauthenticated) user Follow Leader capability.
- Per-song Follow Leader toggles — the toggle is setlist-level only.
- Debounce interval configurability — 400ms is fixed.
- Multi-leader conflict resolution (impossible by schema: `setlists.leader_id` is a single UUID FK).

---

## User Stories

### Director (isLeader === true)

- As the Director, I want to toggle "Go Live" in the navigator bar so I can start broadcasting my song navigation and key changes to all followers in the room.
- As the Director, I want a persistent red "LIVE" badge visible while I am broadcasting, so I always know I am actively sending changes.
- As the Director, I want my key changes to auto-persist and broadcast without pressing a separate "Sync" button, so the rehearsal flow is uninterrupted.
- As the Director, I want the system to debounce rapid semitone taps so I do not flood followers with intermediate keys while stepping.
- As the Director, I want to stop broadcasting at any time by toggling Go Live off, so followers stop receiving my changes.
- As the Director, I want my font size and chord-visibility preferences to remain personal regardless of the sync state.

### Musician / Follower (isLeader === false, authenticated)

- As a musician, I want a "Follow Leader" toggle in the navigator bar so I can opt into real-time sync with the Director.
- As a musician who joins late, I want an automatic State Check when I enable Follow Leader so my keys instantly match what the Director has set, even before any new broadcasts arrive.
- As a musician, I want incoming `SONG_CHANGE` events to smoothly scroll me to the Director's active song without a page reload.
- As a musician, I want incoming `KEY_CHANGE` events to update the displayed chords for the affected song immediately.
- As a musician, I want my font size and chord-visibility preferences to be unaffected by Follow Leader mode.
- As a musician, I want a "Synced" indicator while Follow Leader is active so I know the connection is live.
- As a musician, I want to disable Follow Leader at any time and have my keys settle at the last DB-persisted values.

---

## Interaction States

The following states are distinct and must each have a defined visual representation:

### Director States

| State ID | State Name | Trigger | Visual |
|---|---|---|---|
| D-1 | Go Live: Off | Default on page load | "Go Live" outline button in `ServiceNavigator`, no badge |
| D-2 | Go Live: Connecting | Director taps "Go Live" | Button shows spinner (`Loader2`) + label "Starting…" |
| D-3 | Go Live: Active | Subscription confirmed | Pulsing `bg-red-600 text-white` badge with "LIVE" label; button aria-pressed=true |
| D-4 | Go Live: Active + Key Pending | Director taps stepper; debounce running | Per-song Sync button area shows "Saving…" with `Loader2` spinner |
| D-5 | Go Live: Active + Key Saved | Server Action resolved successfully | Broadcast fires; per-song area shows brief "Synced" with `Check` icon (2s) |
| D-6 | Go Live: Active + Key Save Failed | Server Action returned error | Per-song area shows red error text; broadcast does NOT fire; LIVE badge remains |
| D-7 | Go Live: Stopping | Director taps LIVE badge to stop | Button shows spinner briefly |
| D-8 | Go Live: Connection Error | Supabase subscription fails | Go Live reverts to Off (D-1); inline error "Unable to start live session. Please try again." in navigator bar |

### Follower States

| State ID | State Name | Trigger | Visual |
|---|---|---|---|
| F-1 | Follow Leader: Off | Default on page load | "Follow Leader" outline button in `ServiceNavigator` |
| F-2 | Follow Leader: State Check | Follower enables toggle | Button disabled; inline hint "Syncing…" with `Loader2` |
| F-3 | Follow Leader: Synced | State Check complete + subscription active | Toggle active style; green "Synced" dot or chip adjacent to button |
| F-4 | Follow Leader: Receiving Song Change | `SONG_CHANGE` event arrives | Smooth scroll begins; no additional indicator (scroll is implicit feedback) |
| F-5 | Follow Leader: Receiving Key Change | `KEY_CHANGE` event arrives | Chord display updates instantly; no separate indicator |
| F-6 | Follow Leader: State Check Failed | `getSetlistWithSongs` call fails | Toggle remains active; inline hint "Unable to sync current state." replaces "Syncing…" |
| F-7 | Follow Leader: Connection Lost | Realtime subscription drops | "Synced" indicator replaced by "Lost connection." hint text |
| F-8 | Follow Leader: Off (after disable) | Follower disables toggle | Keys revert to State Check snapshot values; scroll position unchanged; back to F-1 |

---

## Acceptance Criteria

### AC-Group 1: Go Live Toggle

1. The "Go Live" button is rendered in the `ServiceNavigator` component exclusively when `isLeader === true`. It is absent from the DOM (not hidden via CSS) when `isLeader === false`.
2. `ServiceNavigator` must be updated to accept `isLeader: boolean`, `setlistId: string`, and a `user` identifier (or the Go Live/Follow Leader control must be hoisted into a new wrapper client component that receives these props from `SetlistViewerPage`). No server-side data fetching is added to `ServiceNavigator`.
3. On click, the Go Live button transitions to state D-2 (spinner + "Starting…") while the Supabase channel subscription is being established.
4. On successful channel subscription (`channel.subscribe()` callback with status `'SUBSCRIBED'`), the button transitions to state D-3: `bg-red-600 text-white`, label "LIVE", `aria-pressed="true"`, and a CSS `animate-pulse` class applied.
5. On channel subscription failure, the button reverts to D-1 and an inline error message "Unable to start live session. Please try again." is shown in the navigator bar using `text-xs text-red-500` styling. The error clears on next Go Live attempt.
6. The Supabase channel is created with `config: { broadcast: { self: false } }` so the Director does not receive their own `SONG_CHANGE` or `KEY_CHANGE` events.
7. When Go Live is active and the `activeSongId` in `ServiceNavigator` changes (driven by the existing `IntersectionObserver`), a `SONG_CHANGE` event is broadcast immediately (no debounce) with payload `{ junctionId: string }`. This broadcast is fire-and-forget — no Server Action is called for song navigation.
8. When Go Live is deactivated (Director taps the LIVE badge), the channel is removed via `supabase.removeChannel(channel)` and no further broadcasts fire. The button returns to state D-1.
9. On component unmount (page navigation away), any active channel is removed via the `useEffect` cleanup function.
10. The Go Live toggle is never disabled during an in-flight Server Action — the Director can stop broadcasting at any time regardless of pending key saves.

### AC-Group 2: Key Change Auto-Persist and Broadcast

11. When Go Live is active, every invocation of `increment`, `decrement`, or `setTargetKey` within a `SetlistSongSection`'s `ChordSheetClient` triggers a debounced persist-and-broadcast sequence. The debounce interval is **400ms** — the timer resets on each new invocation within the window.
12. The debounce timer is per-song (per `junctionId`), not global. Rapid tapping on Song A does not delay or reset the debounce timer for Song B.
13. During the 400ms debounce window (state D-4), the per-song sync area in `SetlistSongSection` shows "Saving…" with a `Loader2` spinner. The Director's local chord display updates immediately (optimistic — the `useTranspose` state updates synchronously on each tap; only the persist-and-broadcast is debounced).
14. After the debounce window elapses, `updatePerformanceDetails` is called with the current `displayKey` from `useTranspose` as `performance_key`.
15. On a successful Server Action response, a `KEY_CHANGE` broadcast event fires with payload `{ junctionId: string; performanceKey: string }`, and the per-song sync area transitions to state D-5 (Check icon + "Synced", auto-clears after 2 seconds).
16. On a failed Server Action response, the broadcast does NOT fire. The per-song area transitions to state D-6 (red error text from `error` string returned by the action). The Director's local chord display remains at the attempted key (optimistic state is not rolled back — rolling back during a live session would be disruptive).
17. When Go Live is inactive, `increment`/`decrement`/`setTargetKey` work exactly as they do today — no debounce, no Server Action triggered automatically. The existing explicit "Sync to Setlist" button remains available to the Director when not in Go Live mode.
18. To wire up per-tap key change notifications from `ChordSheetClient` to the parent, `SetlistSongSection` passes a new `onKeyChangeLive` callback prop to `ChordSheetClient` (alongside the existing `onKeyChange`). `ChordSheetClient` calls `onKeyChangeLive(displayKey)` inside the same `useEffect` that fires `onKeyChange`, but only when the prop is provided. `SetlistSongSection` receives this callback and hands it to `useSetlistSync` to trigger the debounced persist-and-broadcast.

### AC-Group 3: Follow Leader Toggle

19. The "Follow Leader" button is rendered in the `ServiceNavigator` component exclusively when `isLeader === false` AND the current user is authenticated (`user !== null`). It is absent from the DOM for unauthenticated visitors and for the Director.
20. On click, the Follow Leader button transitions to state F-2: button disabled, inline "Syncing…" with `Loader2`.
21. The State Check calls `getSetlistWithSongs({ setlist_id: setlistId })` from the client. Because Server Actions are callable from Client Components, this call is made via a client-side import of the Server Action. The call fetches the current `performance_key` for every song in the setlist.
22. On a successful State Check, the fetched `performance_key` values are stored in a `Map<junctionId, performanceKey>` in the `useSetlistSync` hook state. This map is the "State Check snapshot" used for key revert on Follow Leader disable (OQ-5 answer: Option A).
23. After the State Check, the Supabase channel is subscribed with `channel.on('broadcast', { event: 'SONG_CHANGE' }, handler)` and `channel.on('broadcast', { event: 'KEY_CHANGE' }, handler)`. The Follow Leader button transitions to state F-3.
24. The "Synced" indicator in state F-3 is a small green dot (`w-2 h-2 rounded-full bg-green-500`) rendered inline next to the "Follow Leader" button label.
25. If the State Check fails, the Follow Leader toggle remains active (the subscription still proceeds) and the inline hint "Unable to sync current state." is shown in `text-xs text-red-500`. The State Check snapshot map is empty; incoming broadcasts will still update keys going forward.
26. When Follow Leader is disabled (Follower taps the active toggle), the channel is removed, and each song's `externalKey` prop in `ChordSheetClient` is set to the State Check snapshot value for that `junctionId` (or `undefined` if the snapshot was empty, which reverts to the SSR-rendered `performanceKey`). This revert is applied by updating the snapshot map in `useSetlistSync` state.
27. After revert, Follow Leader returns to state F-1 and the "Synced" indicator is removed from the DOM.

### AC-Group 4: Incoming Broadcast Handling (Follower)

28. On receiving a `SONG_CHANGE` broadcast with payload `{ junctionId: string }`, `useSetlistSync` calls `document.getElementById('song-${junctionId}')?.scrollIntoView({ behavior: 'smooth', block: 'start' })`. If the element is not found, the call is silently skipped with no error.
29. On receiving a `KEY_CHANGE` broadcast with payload `{ junctionId: string; performanceKey: string }`, `useSetlistSync` updates a reactive `Map<junctionId, performanceKey>` state that is passed down to the relevant `SetlistSongSection` as an `overrideKey` prop, which in turn passes it to `ChordSheetClient` as `externalKey`.
30. `ChordSheetClient` accepts a new optional prop `externalKey?: string`. When `externalKey` changes and is defined, a `useEffect` calls `setTargetKey(externalKey)`. This effect must NOT run on initial mount if `externalKey === originalKey` to avoid a no-op `setTargetKey` call that would cause a redundant DOM chord mutation.
31. `KEY_CHANGE` events for a `junctionId` not present in the follower's rendered setlist are silently ignored. The `useSetlistSync` hook checks the map before applying the update.
32. While Follow Leader is active, the follower's own key stepper controls (`+1`, `-1`, key dropdown) in `ChordSheetClient` remain interactive and functional. A local manual key change by the follower overrides the `externalKey` for that song until the next `KEY_CHANGE` broadcast arrives for the same `junctionId` (at which point the broadcast value takes precedence again, because `externalKey` is the source of truth while Follow Leader is active).

### AC-Group 5: useSetlistSync Hook

33. A new hook `src/hooks/useSetlistSync.ts` is created. Its signature is:
    ```ts
    useSetlistSync(params: {
      setlistId: string
      isLeader: boolean
      songs: Array<{ junctionId: string; performanceKey: string }>
    }): UseSetlistSyncReturn
    ```
34. `UseSetlistSyncReturn` exposes:
    - `isLive: boolean` — Director Go Live state
    - `isLiveConnecting: boolean` — true during channel subscription
    - `liveError: string | null` — Go Live connection error
    - `toggleLive: () => void` — Director Go Live toggle handler
    - `isFollowing: boolean` — Follower Follow Leader state
    - `isStateChecking: boolean` — true during State Check fetch
    - `followError: string | null` — Follow Leader State Check error
    - `followSyncStatus: 'synced' | 'lost' | 'idle'` — connection health indicator
    - `toggleFollow: () => void` — Follower Follow Leader toggle handler
    - `overrideKeys: Map<string, string>` — current key overrides for followers (junctionId → performanceKey)
    - `broadcastSongChange: (junctionId: string) => void` — Director sends SONG_CHANGE
    - `broadcastKeyChange: (junctionId: string, performanceKey: string) => void` — Director sends KEY_CHANGE (called by debounced handler in SetlistSongSection)
35. The hook uses a single `useRef` to hold the Supabase channel instance to avoid re-creating it on re-renders.
36. All `useEffect` hooks inside `useSetlistSync` have complete dependency arrays. No missing-dependency lint suppressions are permitted.

### AC-Group 6: Constants and Infrastructure

37. A new file `src/utils/realtimeEvents.ts` is created containing:
    ```ts
    export const REALTIME_EVENTS = {
      SONG_CHANGE: 'SONG_CHANGE',
      KEY_CHANGE: 'KEY_CHANGE',
    } as const
    ```
    Both the sender (Director) and receiver (Follower) import from this file. No inline string literals for event names are permitted elsewhere.
38. The Supabase browser client is imported from the existing `src/services/supabase/client.ts` (confirmed to exist using `createBrowserClient`). No new client factory is needed.
39. All new files follow project naming conventions: `kebab-case` for file names, `PascalCase` for types/interfaces, `camelCase` for variables and functions.
40. No Supabase client calls are made in Server Components for this feature. All Realtime logic runs exclusively in Client Components and hooks.

### AC-Group 7: Artisan UI Compliance

41. The LIVE badge uses `bg-red-600 text-white` Tailwind classes. It must not use raw hex inline styles. The `animate-pulse` class is applied to the badge element (not the entire navigator bar) to avoid distracting the follower view with a pulsing layout.
42. The Follow Leader toggle in its active state (F-3) uses the existing `toggleActiveClass` pattern from `ChordSheetClient` (`bg-brand-brown text-brand-cream border-brand-brown dark:bg-brand-tan dark:text-brand-espresso dark:border-brand-tan`) for visual consistency.
43. The "Synced" green dot (`bg-green-500`) is the only element that uses an off-palette color for the follower indicator. All other new UI elements use the Artisan Palette tokens.
44. All new interactive elements have `focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-1` focus rings matching the existing pattern.
45. Error and hint text use `text-xs` sizing and `text-red-500` (errors) or `text-brand-brown dark:text-brand-tan` (neutral hints).
46. WCAG AA contrast must be verified for `bg-red-600` with `text-white` (ratio is 5.9:1 — passes AA). No new low-contrast pairs are introduced.

---

## Fallback Behaviors

- **Go Live: channel subscription fails** — Toggle reverts to D-1. Inline error "Unable to start live session. Please try again." shown in navigator bar (`text-xs text-red-500`). Chord sheet remains fully operational for local use. Error clears on next Go Live attempt.
- **Go Live: `updatePerformanceDetails` fails during debounced key save** — Broadcast does NOT fire. Per-song sync area shows the Server Action error string in red. Director's local chord display retains the optimistic key (no rollback). LIVE badge remains active; Go Live session continues.
- **Go Live: Supabase channel disconnects mid-session** — The Supabase JS client will attempt automatic reconnection. No additional UI state change is shown to the Director unless the reconnect fails within a reasonable timeout (Supabase default behavior applies). This case is out of scope for explicit UI handling in this task.
- **Follow Leader: State Check fetch fails** — Inline hint "Unable to sync current state." is shown. Subscription still proceeds. `overrideKeys` map is empty; future broadcasts will populate it. The follower is not left in a broken state.
- **Follow Leader: `SONG_CHANGE` for unknown junctionId** — `document.getElementById()` returns null; scroll is skipped silently. No error is thrown or shown.
- **Follow Leader: `KEY_CHANGE` for unknown junctionId** — Update is silently ignored. No error is thrown or shown.
- **Follow Leader: Realtime subscription drops** — `followSyncStatus` transitions to `'lost'`; the "Synced" dot is replaced by inline text "Lost connection." in `text-xs text-brand-brown dark:text-brand-tan`. The follower's current keys are preserved. Re-enabling the toggle (disable then enable) retries the full State Check + subscribe flow.
- **Director goes live but Follower has Follow Leader off** — No effect on the Follower's view. No notification is shown. Follow Leader is strictly opt-in.
- **Unauthenticated visitor** — Neither Go Live nor Follow Leader controls are rendered. The page remains fully functional as a read-only chord viewer (existing behavior unchanged).

---

## Risk Flags

### RF-1 — Persist-Then-Broadcast Race Condition (High)
When the Director taps a stepper rapidly (e.g., 5 quick taps within the debounce window), only a single Server Action fires after the 400ms window. However, if the Director taps across two debounce windows (e.g., tap → wait 450ms → tap again), two sequential Server Actions will be in flight within a short window. If the second resolves before the first (network jitter), the DB will be written in the wrong order and the broadcast will carry a stale `performanceKey`. Mitigation: each debounced call should carry a monotonically increasing local sequence number; on resolution, skip the broadcast if a later sequence has already resolved. This is a recommended implementation detail for `useSetlistSync`, not a post-hoc fix.

### RF-2 — `externalKey` useEffect and React Hydration (Medium)
Adding `externalKey` as a prop to `ChordSheetClient` and triggering `setTargetKey` in a `useEffect` introduces a new effect that runs after hydration. If `externalKey` is passed as the same value as `originalKey` on initial render (e.g., when the follower enables Follow Leader and the State Check returns the same key already displayed), the effect will call `setTargetKey` with `offset=0` — a no-op that still causes a DOM chord mutation pass. The implementation must guard: `if (externalKey !== undefined && externalKey !== displayKey) { setTargetKey(externalKey) }`. Without this guard, every State Check triggers a full DOM chord re-mutation for every song even when nothing changed.

### RF-3 — `ServiceNavigator` Re-render and IntersectionObserver Stability (Medium)
`ServiceNavigator` currently holds `IntersectionObserver` state. Adding Go Live and Follow Leader control state (and their event handlers) to the same component risks causing re-renders that disconnect and reconnect the IntersectionObserver, breaking the active song highlight. The Go Live/Follow Leader control state must live in `useSetlistSync` (external hook) and the state slices passed to `ServiceNavigator` must be stable references (via `useCallback`/`useMemo`). The existing `memo` pattern on `ChordSheetClient` (`MemoChordSheetClient` in `SetlistSongSection`) gives a model for this discipline.

### RF-4 — Supabase Broadcast Authority Gap (Low-Medium, Accepted)
Supabase Broadcast channels have no server-side authorization. Any authenticated user who knows the channel name (`setlist_sync:${setlistId}`) can send `SONG_CHANGE` or `KEY_CHANGE` events, including non-leader users. The client-side `isLeader` guard prevents the UI from calling `channel.send()`, but a determined user with browser dev tools can bypass this. This risk is accepted per the feature request's stated constraint. It is documented here and must be noted in the integration contract. No mitigation is in scope for this task.

### RF-5 — Debounce Closure Stale State (Medium)
The debounced function inside `SetlistSongSection` (or `useSetlistSync`) must capture the latest `displayKey` value at the time the debounce fires, not at the time the debounce was scheduled. If implemented naively with `useCallback` and a stale closure, the Server Action and broadcast may fire with an outdated key. The implementation must use a `useRef` to hold the latest `displayKey` value and read from the ref inside the debounced callback, not from the closure.

### RF-6 — SSR / Client Component Boundary (Low)
`SetlistViewerPage` is a Server Component that passes `isLeader` as a prop. The new `ServiceNavigator` (updated to host Go Live / Follow Leader controls) is already a `'use client'` component, so this boundary is not new. However, `setlistId` and `isLeader` must be passed as props from the Server Component — they cannot be fetched client-side inside `ServiceNavigator` without breaking the Server/Client split. This is already the established pattern (`navigatorSongs` prop is passed today). The developer must verify no new client-side Supabase data fetches are added to `ServiceNavigator` itself.

---

## Resolved Ambiguities

- **`isLeader` vs `music_director` role for Go Live gating** → Resolved from codebase: `isLeader = user?.id === setlist.leader_id`. All users default to `music_director` role in the migration, making role-based gating non-functional for this distinction. `leader_id` is the correct authority boundary.
- **Follow Leader visibility condition (OQ-2)** → Resolved by user: gate on `!isLeader` (any authenticated non-leader). No role check.
- **Key change broadcast trigger (OQ-3)** → Resolved by user: Option A — auto per-tap with 400ms debounce. Debounce is per-song (per `junctionId`). Sequence numbering recommended to prevent out-of-order resolve race (RF-1).
- **Follow Leader toggle placement (OQ-4)** → Resolved by user: Option A — `ServiceNavigator` bar, setlist-level single toggle.
- **Follower key revert on disable (OQ-5)** → Resolved by user: Option A — revert to State Check snapshot values (the `performance_key` values fetched when Follow Leader was first enabled, reflecting the Director's most recently saved keys at that point).
- **LIVE badge color (OQ-1)** → Resolved by user: `bg-red-600 text-white`. Contrast ratio 5.9:1 — passes WCAG AA.
- **`active_song_id` DB persistence** → `active_song_id` is ephemeral. No DB column exists. Song position catch-up is not possible from DB; follower's song position on State Check defaults to current scroll position (no programmatic scroll on State Check, only on incoming `SONG_CHANGE` broadcasts).
- **Broadcast channel RLS** → Supabase Broadcast does not traverse PostgreSQL RLS. Client-side `isLeader` guard only. Risk accepted and documented (RF-4).
- **Supabase browser client** → `src/services/supabase/client.ts` confirmed to exist using `createBrowserClient` from `@supabase/ssr`. No new file needed.
- **`junctionId` vs `song_id` in broadcast payloads** → `junctionId` (setlist_songs.id) used throughout, matching the existing `ServiceNavigator` and `SetlistSongSection` contracts. The term `active_song_id` in the feature request maps to `junctionId`.
- **`useTranspose` external override** → `ChordSheetClient` receives new optional `externalKey?: string` prop. A `useEffect` calls `setTargetKey(externalKey)` when `externalKey` changes and is defined and differs from `displayKey` (RF-2 guard).
- **`SONG_CHANGE` is not persisted** → Active song position is never written to the DB. Only `performance_key` changes go through a Server Action.
- **Existing "Sync to Setlist" button behavior** → Unchanged when Go Live is inactive. When Go Live is active, the debounced auto-persist takes over the same `updatePerformanceDetails` call. The explicit Sync button is not removed but becomes redundant during a live session — it may still be tapped but will not cause a double-broadcast (the debounce will have already fired by the time the user taps Sync manually after a key change).
