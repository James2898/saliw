# TASK-021 — Collaborative Realtime Sync: Go Live & Follow Leader

- **Tier:** 2
- **Date Created:** 2026-04-19
- **Status:** In Progress

---

## Feature Summary

Add collaborative realtime synchronization to the Setlist Viewer (`src/app/setlists/[id]`). The setlist `leader_id` user (the Director) can activate a "Go Live" mode from the `ServiceNavigator` bar. While live, every key change the Director makes to any song is debounced at 400ms per song, persisted to `setlist_songs.performance_key` via the existing `updatePerformanceDetails` Server Action, and then broadcast over a Supabase Broadcast channel scoped to the setlist (`setlist_sync:${setlistId}`). When the Director's active song changes, a navigation broadcast is also sent immediately. Non-leader authenticated users see a "Follow Leader" toggle in the `ServiceNavigator` bar; enabling it performs an immediate State Check (re-fetching all current `performance_key` values from the DB) and then subscribes to incoming `SONG_CHANGE` and `KEY_CHANGE` events, updating the follower's chord view non-disruptively. Font size and chord-visibility preferences remain user-specific and are never overridden by sync events.

---

## Acceptance Criteria

### AC-Group 1: Go Live Toggle

1. The "Go Live" button is rendered in the `ServiceNavigator` component exclusively when `isLeader === true`. It is absent from the DOM (not hidden via CSS) when `isLeader === false`.
2. `ServiceNavigator` must be updated to accept `isLeader: boolean`, `setlistId: string`, `isAuthenticated: boolean`, and a `sync` object prop from the parent `SetlistViewerPage`. No server-side data fetching is added to `ServiceNavigator`.
3. On click, the Go Live button transitions to state D-2: spinner (`Loader2`) + label "Starting…" while the Supabase channel subscription is being established.
4. On successful channel subscription (`channel.subscribe()` callback with status `'SUBSCRIBED'`), the button transitions to state D-3: `bg-red-600 text-white animate-pulse` badge, label "LIVE", `aria-pressed="true"`.
5. On channel subscription failure, the button reverts to D-1 and an inline error message "Unable to start live session. Please try again." is shown in the navigator bar using `text-xs text-red-500` styling. The error clears on the next Go Live attempt.
6. The Supabase channel is created with `config: { broadcast: { self: false } }` so the Director does not receive their own broadcast events.
7. When Go Live is active and `activeSongId` in `ServiceNavigator` changes (driven by the existing `IntersectionObserver`), a `SONG_CHANGE` event is broadcast immediately (no debounce, no Server Action) with payload `{ junctionId: string }`. This is fire-and-forget.
8. When Go Live is deactivated (Director taps the LIVE badge), the channel is removed via `supabase.removeChannel(channel)` and no further broadcasts fire. The button returns to state D-1.
9. On component unmount (page navigation away), any active channel is removed via the `useEffect` cleanup function.
10. The Go Live toggle is never disabled during an in-flight Server Action — the Director can stop broadcasting at any time regardless of pending key saves.

### AC-Group 2: Key Change Auto-Persist and Broadcast

11. When Go Live is active, every invocation of `increment`, `decrement`, or `setTargetKey` within a `SetlistSongSection`'s `ChordSheetClient` triggers a debounced persist-and-broadcast sequence. The debounce interval is **400ms** — the timer resets on each new invocation within the window. The Director's local chord display updates immediately (optimistic).
12. The debounce timer is per-song (per `junctionId`). Rapid tapping on Song A does not delay or reset the debounce timer for Song B.
13. During the 400ms debounce window (state D-4), the per-song sync area in `SetlistSongSection` shows "Saving…" with a `Loader2` spinner.
14. After the debounce window elapses, `updatePerformanceDetails` is called with `{ id: junctionId, setlist_id, performance_key: currentKey }` where `currentKey` is read from `latestKeyRef.current` (not from a stale closure — see RF-5).
15. On a successful Server Action response (`{ error: null }`), a `KEY_CHANGE` broadcast event fires with payload `{ junctionId: string; performanceKey: string }`, and the per-song sync area transitions to state D-5 (Check icon + "Synced", auto-clears after 2 seconds).
16. On a failed Server Action response (`{ error: string }`), the broadcast does NOT fire. The per-song area transitions to state D-6 (red error text). The Director's local chord display remains at the attempted key (no rollback). The LIVE badge remains active.
17. When Go Live is inactive, `increment`/`decrement`/`setTargetKey` work exactly as they do today. The existing explicit "Sync to Setlist" button is not removed.
18. `ChordSheetClient` accepts a new `onKeyChangeLive?: (key: string) => void` prop that fires alongside `onKeyChange` inside the same `useEffect`. `SetlistSongSection` uses it to hand the latest `displayKey` to `useSetlistSync` for the debounced persist-and-broadcast sequence.

### AC-Group 3: Follow Leader Toggle

19. The "Follow Leader" button is rendered in the `ServiceNavigator` component exclusively when `isLeader === false` AND the current user is authenticated (`isAuthenticated === true`). It is absent from the DOM for unauthenticated visitors and for the Director.
20. On click, the Follow Leader button transitions to state F-2: button disabled, inline "Syncing…" with `Loader2`.
21. The State Check calls `getSetlistWithSongs({ setlist_id: setlistId })` via a client-side import of the Server Action (Server Actions are callable from Client Components). The call fetches the current `performance_key` for every song in the setlist.
22. On a successful State Check, the fetched `performance_key` values are stored in a `Map<junctionId, performanceKey>` in `useSetlistSync` state as the State Check snapshot — used as the revert target on Follow Leader disable.
23. After the State Check (success or failure), the Supabase channel subscribes to `SONG_CHANGE` and `KEY_CHANGE` broadcast events. The Follow Leader button transitions to state F-3.
24. The "Synced" indicator in state F-3 is a small green dot: `w-2 h-2 rounded-full bg-green-500` rendered inline next to the Follow Leader button label.
25. If the State Check fails, the Follow Leader toggle remains active (subscription still proceeds) and the inline hint "Unable to sync current state." is shown in `text-xs text-red-500`. The State Check snapshot map is empty; incoming broadcasts will still populate `overrideKeys` going forward.
26. When Follow Leader is disabled, the channel is removed via `supabase.removeChannel(channel)`, and each song's `externalKey` prop in `ChordSheetClient` is set to the State Check snapshot value for that `junctionId` (or `undefined` if the snapshot was empty). Follow Leader returns to state F-1.
27. After revert, the "Synced" dot is removed from the DOM.

### AC-Group 4: Incoming Broadcast Handling (Follower)

28. On receiving a `SONG_CHANGE` broadcast with payload `{ junctionId }`, `useSetlistSync` calls `document.getElementById('song-${junctionId}')?.scrollIntoView({ behavior: 'smooth', block: 'start' })`. If the element is not found, the call is silently skipped with no error.
29. On receiving a `KEY_CHANGE` broadcast with payload `{ junctionId, performanceKey }`, `useSetlistSync` updates a reactive `Map<junctionId, performanceKey>` state (`overrideKeys`) that flows down as `overrideKey` prop to `SetlistSongSection`, which passes it as `externalKey` to `ChordSheetClient`.
30. `ChordSheetClient` accepts a new optional prop `externalKey?: string`. A `useEffect` runs: `if (externalKey !== undefined && externalKey !== displayKey) { setTargetKey(externalKey) }`. This effect must NOT fire on initial mount when `externalKey === originalKey` to avoid a redundant DOM chord mutation (RF-2 guard).
31. `KEY_CHANGE` events for a `junctionId` not present in the follower's rendered setlist are silently ignored.
32. While Follow Leader is active, the follower's own key stepper controls remain interactive. A local manual key change overrides `externalKey` for that song until the next incoming `KEY_CHANGE` for the same `junctionId`.

### AC-Group 5: `useSetlistSync` Hook

33. A new hook `src/hooks/useSetlistSync.ts` is created with the following signature:
    ```ts
    useSetlistSync(params: {
      setlistId: string
      isLeader: boolean
      songs: Array<{ junctionId: string; performanceKey: string }>
    }): UseSetlistSyncReturn
    ```
34. `UseSetlistSyncReturn` exposes:
    - `isLive: boolean`
    - `isLiveConnecting: boolean`
    - `liveError: string | null`
    - `toggleLive: () => void`
    - `isFollowing: boolean`
    - `isStateChecking: boolean`
    - `followError: string | null`
    - `followSyncStatus: 'synced' | 'lost' | 'idle'`
    - `toggleFollow: () => void`
    - `overrideKeys: Map<string, string>`
    - `broadcastSongChange: (junctionId: string) => void`
    - `broadcastKeyChange: (junctionId: string, performanceKey: string) => void`
35. The hook uses a single `useRef` to hold the Supabase channel instance — no re-creation on re-renders.
36. All `useEffect` hooks inside `useSetlistSync` have complete dependency arrays. No missing-dependency lint suppressions are permitted.

### AC-Group 6: Constants and Infrastructure

37. A new file `src/utils/realtimeEvents.ts` is created containing:
    ```ts
    export const REALTIME_EVENTS = {
      SONG_CHANGE: 'SONG_CHANGE',
      KEY_CHANGE: 'KEY_CHANGE',
    } as const
    ```
    Both the Director (sender) and the Follower (receiver) import from this file. No inline event name string literals are permitted elsewhere.
38. The Supabase browser client is imported from the existing `src/services/supabase/client.ts` (`createClient()` / `createBrowserClient`). No new client factory is needed.
39. All new files follow project naming conventions: `kebab-case` for file names, `PascalCase` for types/interfaces, `camelCase` for variables and functions.
40. No Supabase client calls are made in Server Components for this feature. All Realtime logic runs exclusively in Client Components and hooks.

### AC-Group 7: Artisan UI Compliance

41. The LIVE badge uses `bg-red-600 text-white animate-pulse` Tailwind classes. `animate-pulse` is applied to the badge element only — not the entire navigator bar — to avoid distracting layout animation for followers.
42. The Follow Leader toggle in its active state (F-3) uses the existing `toggleActiveClass` pattern from `ChordSheetClient` (`bg-brand-brown text-brand-cream border-brand-brown dark:bg-brand-tan dark:text-brand-espresso dark:border-brand-tan`) for visual consistency.
43. The "Synced" green dot (`bg-green-500`) is the only element that uses an off-palette color for the follower indicator. All other new UI elements use Artisan Palette tokens.
44. All new interactive elements have `focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan focus-visible:ring-offset-1` focus rings matching the existing pattern.
45. Error and hint text use `text-xs` sizing with `text-red-500` (errors) or `text-brand-brown dark:text-brand-tan` (neutral hints).
46. `bg-red-600` with `text-white` passes WCAG AA at 5.9:1 contrast ratio. No new low-contrast pairs are introduced.

---

## Out of Scope

- Supabase Presence (connected-user tracking) — Broadcast only.
- Persisting Go Live or Follow Leader toggle state to the database. No new DB migrations.
- Broadcasting setlist reorder, song add, or song remove events.
- Director seeing a follower count.
- Backend RLS enforcement on the Broadcast channel (RF-4 — accepted risk, documented in Technical Schema).
- Guest (unauthenticated) user Follow Leader capability.
- Per-song Follow Leader toggles — the toggle is setlist-level only.
- Debounce interval configurability — 400ms is fixed.
- Multi-leader conflict resolution.
- Push notifications or out-of-browser alerts.
- Handling Supabase Realtime mid-session disconnects beyond exposing `followSyncStatus: 'lost'` state (Supabase client auto-reconnect behavior applies).

---

## Relevant Files

| File | Purpose |
|------|---------|
| `src/app/setlists/[id]/page.tsx` | SetlistViewer Server Component — fetches setlist + songs, computes `isLeader = user.id === setlist.leader_id`, passes props down; must instantiate `useSetlistSync` via a wrapper Client Component and pass the `sync` object to `ServiceNavigator` and `overrideKey`/`onKeyChangeLive` to each `SetlistSongSection` |
| `src/components/client/ServiceNavigator.tsx` | Receives new `isLeader`, `setlistId`, `isAuthenticated`, `sync` props; renders Go Live (Director only) and Follow Leader (authenticated non-leader only) controls; reports `activeSongId` changes to `sync.onActiveSongChange` |
| `src/components/client/SetlistSongSection.tsx` | Receives new `overrideKey?: string` and `onKeyChangeLive?: (junctionId, key) => void` props; passes `overrideKey` to `ChordSheetClient` as `externalKey`; wires `onKeyChangeLive` for Go Live debounced persist |
| `src/components/SongViewer/ChordSheetClient.tsx` | Receives new `externalKey?: string` and `onKeyChangeLive?: (key) => void` props; adds RF-2-guarded `useEffect` for `externalKey`; calls `onKeyChangeLive` alongside `onKeyChange` |
| `src/hooks/useTranspose.ts` | Provides `setTargetKey(key)` — the method called by `ChordSheetClient`'s `externalKey` effect |
| `src/app/actions/setlistActions.ts` | Contains `getSetlistWithSongs` (State Check) and `updatePerformanceDetails` (key persist) — both EXIST, used as-is |
| `src/services/supabase/client.ts` | Browser Supabase client (`createBrowserClient`) — the only client to use for Realtime subscriptions |
| `src/types/supabase.ts` | DB types — no changes required (no new DB columns for this task) |
| `src/hooks/useSetlistSync.ts` | NEW — all Realtime subscribe/unsubscribe/send/receive logic, sequence guards, stale-closure guards, State Check snapshot |
| `src/utils/realtimeEvents.ts` | NEW — `REALTIME_EVENTS` constants shared between Director and Follower paths |

---

## Technical Schema

### Server Action Contract Table

| UI Action | Server Action / Operation | File | RLS Role | Status | Gap Strategy |
|---|---|---|---|---|---|
| Follow Leader enable: State Check | `getSetlistWithSongs()` | `src/app/actions/setlistActions.ts` | public / authenticated | EXISTS | N/A |
| Key stepper tap while Go Live (debounced 400ms) | `updatePerformanceDetails()` | `src/app/actions/setlistActions.ts` | `leader_id = auth.uid()` (via RLS) | EXISTS | N/A |
| Go Live: subscribe to Broadcast channel | `supabase.channel().subscribe()` | `src/hooks/useSetlistSync.ts` (new) | No RLS — client-side `isLeader` guard only (RF-4) | MISSING (net-new) | Disable button until hook shipped; unreachable in practice since SDK is already a project dependency |
| Director: broadcast `SONG_CHANGE` | `channel.send()` Broadcast | `src/hooks/useSetlistSync.ts` (new) | No RLS — client-side `isLeader` guard | MISSING (net-new) | Fire-and-forget; silent on send failure |
| Director: broadcast `KEY_CHANGE` | `channel.send()` (after Server Action success) | `src/hooks/useSetlistSync.ts` (new) | No RLS — client-side `isLeader` guard | MISSING (net-new) | Only fires after `updatePerformanceDetails` succeeds; if `channel.send()` throws, log to console only |
| Follower: receive `SONG_CHANGE` | Realtime listener → `scrollIntoView` | `src/hooks/useSetlistSync.ts` (new) | No RLS | MISSING (net-new) | Silent skip if element not found |
| Follower: receive `KEY_CHANGE` | Realtime listener → `overrideKeys` Map update | `src/hooks/useSetlistSync.ts` (new) | No RLS | MISSING (net-new) | Silent skip if `junctionId` not in rendered set |
| Unsubscribe (toggle-off / unmount) | `supabase.removeChannel(channel)` | `src/hooks/useSetlistSync.ts` (new) | No RLS | MISSING (net-new) | Called in `useEffect` cleanup |

**Summary:** 8 total operations. 2 EXISTS (critical data ops). 6 MISSING (all net-new Realtime wiring — no Server Action gaps). All-MISSING escalation does not apply. No DB migrations required.

---

### Realtime Channel Contract

**Channel name:** `setlist_sync:${setlistId}`

**Channel config:**
```ts
const channel = supabase.channel(`setlist_sync:${setlistId}`, {
  config: { broadcast: { self: false } },
})
```

**Subscription pattern:**
```ts
channel
  .on('broadcast', { event: REALTIME_EVENTS.SONG_CHANGE }, handleSongChange)
  .on('broadcast', { event: REALTIME_EVENTS.KEY_CHANGE }, handleKeyChange)
  .subscribe((status) => {
    if (status === 'SUBSCRIBED') { /* transition to D-3 / F-3 */ }
    else if (status === 'CHANNEL_ERROR') { /* revert to D-1 with liveError */ }
    else if (status === 'CLOSED') { /* followSyncStatus = 'lost' */ }
  })
```

**Cleanup:**
```ts
supabase.removeChannel(channel)
```

---

### Broadcast Event Shapes

#### `SONG_CHANGE` — Director → Followers

```ts
// src/utils/realtimeEvents.ts
export const REALTIME_EVENTS = {
  SONG_CHANGE: 'SONG_CHANGE',
  KEY_CHANGE: 'KEY_CHANGE',
} as const

export interface SongChangePayload {
  junctionId: string   // setlist_songs.id of the song now active in the Director's viewport
}

// Send shape:
{ type: 'broadcast', event: REALTIME_EVENTS.SONG_CHANGE, payload: { junctionId: string } }
```

**Trigger:** `activeSongId` changes in `ServiceNavigator` while `isLive === true`. No debounce. Fire-and-forget.

**Follower handler:**
```ts
document.getElementById(`song-${payload.junctionId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
// Silent skip if element is null or junctionId is not in the rendered set
```

---

#### `KEY_CHANGE` — Director → Followers

```ts
export interface KeyChangePayload {
  junctionId: string
  performanceKey: string   // the key confirmed by the DB (not the intermediate optimistic value)
}

// Send shape:
{ type: 'broadcast', event: REALTIME_EVENTS.KEY_CHANGE, payload: { junctionId: string; performanceKey: string } }
```

**Trigger:** `updatePerformanceDetails()` resolves with `{ error: null }`. Broadcast is suppressed on any error.

**Follower handler:**
```ts
setOverrideKeys(prev => new Map(prev).set(junctionId, performanceKey))
// Silent skip if junctionId is not in the currently rendered songs list
```

---

### New Prop Contracts

#### `ChordSheetClient` additions (`src/components/SongViewer/ChordSheetClient.tsx`)

```ts
interface ChordSheetClientProps {
  processedLines: ProcessedLine[]
  originalKey: string
  onKeyChange?: (key: string) => void
  /**
   * NEW — Optional key injected by Follow Leader mode.
   * RF-2 guard: effect must NOT call setTargetKey when externalKey === displayKey.
   */
  externalKey?: string
  /**
   * NEW — Optional callback for Go Live auto-persist.
   * Fired alongside onKeyChange in the same useEffect. Only when provided.
   */
  onKeyChangeLive?: (key: string) => void
}
```

New `useEffect` inside `ChordSheetClient`:
```ts
// RF-2 guard: only react to external injection, not initial mount
useEffect(() => {
  if (externalKey !== undefined && externalKey !== displayKey) {
    setTargetKey(externalKey)
  }
}, [externalKey])
```

Updated existing `onKeyChange` effect:
```ts
useEffect(() => {
  onKeyChange?.(displayKey)
  onKeyChangeLive?.(displayKey)
}, [displayKey, onKeyChange, onKeyChangeLive])
```

---

#### `SetlistSongSection` additions (`src/components/client/SetlistSongSection.tsx`)

```ts
interface SetlistSongSectionProps {
  junctionId: string
  setlistId: string
  title: string
  artist: string
  processedLines: ProcessedLine[]
  performanceKey: string
  isLeader: boolean
  /** NEW — Key override from Follow Leader mode. Passed to ChordSheetClient as externalKey. */
  overrideKey?: string
  /** NEW — Callback for every key change for debounced Go Live persist. */
  onKeyChangeLive?: (junctionId: string, key: string) => void
}
```

Wire-through inside render:
```tsx
<MemoChordSheetClient
  processedLines={processedLines}
  originalKey={performanceKey}
  onKeyChange={isLeader ? handleKeyChange : undefined}
  externalKey={overrideKey}
  onKeyChangeLive={onKeyChangeLive ? (key) => onKeyChangeLive(junctionId, key) : undefined}
/>
```

---

#### `ServiceNavigator` additions (`src/components/client/ServiceNavigator.tsx`)

```ts
interface ServiceNavigatorProps {
  songs: NavigatorSong[]
  isLeader: boolean
  setlistId: string
  isAuthenticated: boolean
  sync: {
    isLive: boolean
    isLiveConnecting: boolean
    liveError: string | null
    toggleLive: () => void
    isFollowing: boolean
    isStateChecking: boolean
    followError: string | null
    followSyncStatus: 'synced' | 'lost' | 'idle'
    toggleFollow: () => void
    onActiveSongChange: (junctionId: string) => void
  }
}
```

The `IntersectionObserver` callback must call `sync.onActiveSongChange(winningId)` when `isLive === true`. Pass `sync.onActiveSongChange` via a `useRef` inside `ServiceNavigator` to avoid reconnecting the observer on every render (RF-3).

---

#### `useSetlistSync` full signature (`src/hooks/useSetlistSync.ts`)

```ts
interface UseSetlistSyncParams {
  setlistId: string
  isLeader: boolean
  songs: Array<{ junctionId: string; performanceKey: string }>
}

interface UseSetlistSyncReturn {
  isLive: boolean
  isLiveConnecting: boolean
  liveError: string | null
  toggleLive: () => void
  isFollowing: boolean
  isStateChecking: boolean
  followError: string | null
  followSyncStatus: 'synced' | 'lost' | 'idle'
  toggleFollow: () => void
  overrideKeys: Map<string, string>
  broadcastSongChange: (junctionId: string) => void
  broadcastKeyChange: (junctionId: string, performanceKey: string) => void
}
```

Required internal state and refs:
```ts
const channelRef = useRef<ReturnType<SupabaseClient['channel']> | null>(null)
const sequenceRef = useRef<Map<string, number>>(new Map())   // RF-1: per-song monotonic counter
const latestKeyRef = useRef<Map<string, string>>(new Map())  // RF-5: stale closure guard
const [stateCheckSnapshot, setStateCheckSnapshot] = useState<Map<string, string>>(new Map())
const [overrideKeys, setOverrideKeys] = useState<Map<string, string>>(new Map())
```

---

### Server Action Detail: `getSetlistWithSongs` (State Check)

```ts
// Input
{ setlist_id: string }

// Return
{
  data: Array<{
    id: string            // junctionId
    song_id: string
    order_index: number
    performance_key: string
    singer: string | null
    songs: { id: string; title: string; artist: string; original_key: string; content: string }
  }> | null
  error: string | null
}
```

Error handling in `useSetlistSync`:

| Condition | Behavior | UI |
|---|---|---|
| `error !== null` | Set `followError = 'Unable to sync current state.'`; proceed to subscribe (AC-25) | `text-xs text-red-500` below Follow Leader button |
| `data === null` (empty setlist) | Treat as valid empty snapshot; proceed to subscribe | No error shown |
| Throws (network) | Caught in `try/catch`; same as error path | Same as error path |

---

### Server Action Detail: `updatePerformanceDetails` (Debounced Key Persist)

```ts
// Input
{ id: string; setlist_id: string; performance_key: string }

// Return
{ data: DbSetlistSong | null; error: string | null }
```

Error handling:

| Condition | UI Behavior |
|---|---|
| Unauthorized (RLS, `42501`) | Per-song D-6: "You do not have permission to modify this setlist." Broadcast suppressed. |
| Record not found (`PGRST116`) | Per-song D-6: "Setlist song entry not found." Broadcast suppressed. |
| Server error | Per-song D-6: "Unable to update performance details. Please try again." Broadcast suppressed. |

---

### RLS Gap — RF-4 (Accepted)

Supabase Broadcast has no server-side RLS. Any authenticated user who knows the channel name `setlist_sync:${setlistId}` can call `channel.send()` directly, injecting spurious `SONG_CHANGE` or `KEY_CHANGE` events to followers. The client-side `isLeader` prop guard prevents the Go Live button from rendering for non-leaders, blocking the `channel.send()` call path through the Saliw UI. Risk accepted per Feature Specification. Future mitigation path (out of scope): Supabase Edge Function Broadcast relay verifying `leader_id` before forwarding events.

---

## Planning Artifacts

| Artifact | Path | Description |
|----------|------|-------------|
| Feature Specification | `tasks/TASK-021/spec.md` | Acceptance criteria, interaction states, user stories, risk flags |
| Context Bundle | `tasks/TASK-021/context.md` | Reusable components, patterns, anti-patterns, schema gaps |
| Technical Schema | `tasks/TASK-021/schema.md` | Server Action contract table summary |
| Integration Contract | `tasks/TASK-021/integration-contract.md` | Full endpoint + prop + channel contract detail |
| Endpoint Contracts | `tasks/TASK-021/contracts/endpoints.md` | Detailed endpoint contracts |

---

## Implementation Notes

- Read `docs/coding-guidelines.md` before writing any code.
- Read `docs/tech-stack.md` before choosing any library or package.
- Read `docs/structure.md` before creating any new file or directory.
- **`isLeader` is NOT a `music_director` role check.** It is computed as `user.id === setlist.leader_id` in `src/app/setlists/[id]/page.tsx`. Go Live belongs to the setlist leader specifically. Do not conflate with `isMusicDirector`. The existing computation is correct — keep it.
- **No new DB migrations.** `setlists.is_live` and `setlists.active_song_id` are confirmed NOT needed. Go Live and active song state are ephemeral client state only.
- **No `useAuth` hook.** Do not create a hook that resolves role client-side. `isLeader` and `isAuthenticated` are resolved server-side in the Server Component and passed as props.
- **No direct `.from("profiles")` calls in Client Components.** Pass auth state as props from the Server Component. The navbar's direct Supabase call is a pre-existing violation — do not replicate it.
- **Suggested implementation order:**
  1. `src/utils/realtimeEvents.ts` — constants file first
  2. `src/hooks/useSetlistSync.ts` — hook with full signature (stubs for broadcast methods first, then full logic)
  3. `src/components/SongViewer/ChordSheetClient.tsx` — add `externalKey` and `onKeyChangeLive` props
  4. `src/components/client/SetlistSongSection.tsx` — add `overrideKey` and `onKeyChangeLive` props, wire debounced broadcast
  5. `src/components/client/ServiceNavigator.tsx` — add `isLeader`, `setlistId`, `isAuthenticated`, `sync` props; render controls
  6. `src/app/setlists/[id]/page.tsx` — create wrapper Client Component, instantiate `useSetlistSync`, pass `sync` and per-song override props
- **RF-1 (High — Persist-Then-Broadcast Race):** Each debounced call must carry a per-`junctionId` monotonically increasing sequence counter (stored in `sequenceRef`). On Server Action resolution, skip the broadcast if a later sequence has already resolved. Without this guard, rapid cross-debounce-window taps can broadcast a stale key.
- **RF-2 (Medium — `externalKey` useEffect guard):** The `useEffect` in `ChordSheetClient` watching `externalKey` must guard `if (externalKey !== undefined && externalKey !== displayKey)` before calling `setTargetKey`. Without this, every State Check triggers a full DOM chord re-mutation for every song even when nothing changed.
- **RF-3 (Medium — `ServiceNavigator` re-render stability):** State for Go Live / Follow Leader lives in `useSetlistSync` (external hook). Pass only stable references to `ServiceNavigator`. Pass `sync.onActiveSongChange` into `ServiceNavigator` via a `useRef` to prevent the `IntersectionObserver` from reconnecting on every render. See `MemoChordSheetClient` pattern in `SetlistSongSection` as the model for render discipline.
- **RF-5 (Medium — Stale closure in debounce):** The debounced callback must read `displayKey` from `latestKeyRef.current`, not from the closure captured at debounce-scheduling time. `SetlistSongSection` writes to this ref via the `onKeyChangeLive` callback on every `displayKey` change.
- **RF-6 (Low — SSR / Client Component boundary):** `setlistId` and `isLeader` must flow from the Server Component as props. Do not add new client-side Supabase data fetches inside `ServiceNavigator`.
- **Supabase client for Realtime:** Use `createClient()` from `src/services/supabase/client.ts` exclusively. Instantiate once at hook initialization level — not inside a `useEffect` — to avoid re-creating the client on every render. See navbar auth subscription pattern for cleanup idiom.
- **Tailwind v4 class composition:** Use arrays of class strings joined with `.join(' ')` — never template literals with conditionals. See `SetlistSongSection.tsx` button className array.
- **MEMORY.md:** Read the global MEMORY.md entry for the `useFontSize` setState-in-effect bug before implementing any hook that seeds state from an async source.

---

## Interaction States Reference

### Director States

| State ID | State Name | Trigger | Visual |
|---|---|---|---|
| D-1 | Go Live: Off | Default on page load | "Go Live" outline button, no badge |
| D-2 | Go Live: Connecting | Director taps "Go Live" | `Loader2` spinner + label "Starting…" |
| D-3 | Go Live: Active | Subscription confirmed (`SUBSCRIBED`) | `bg-red-600 text-white animate-pulse` badge, label "LIVE", `aria-pressed="true"` |
| D-4 | Go Live: Active + Key Pending | Stepper tapped; debounce running | Per-song sync area: `Loader2` + "Saving…" |
| D-5 | Go Live: Active + Key Saved | Server Action success | Per-song sync area: Check icon + "Synced" (auto-clears 2s) |
| D-6 | Go Live: Active + Key Save Failed | Server Action error | Per-song sync area: red error text; broadcast suppressed |
| D-7 | Go Live: Stopping | Director taps LIVE badge | Brief spinner |
| D-8 | Go Live: Connection Error | Subscription fails | Reverts to D-1; inline "Unable to start live session. Please try again." (`text-xs text-red-500`) |

### Follower States

| State ID | State Name | Trigger | Visual |
|---|---|---|---|
| F-1 | Follow Leader: Off | Default on page load | "Follow Leader" outline button |
| F-2 | Follow Leader: State Check | Follower enables toggle | Button disabled; `Loader2` + "Syncing…" |
| F-3 | Follow Leader: Synced | State Check complete + subscription active | Toggle active style; `w-2 h-2 rounded-full bg-green-500` dot inline |
| F-4 | Follow Leader: Receiving Song Change | `SONG_CHANGE` event arrives | Smooth scroll; no separate indicator |
| F-5 | Follow Leader: Receiving Key Change | `KEY_CHANGE` event arrives | Chord display updates instantly; no separate indicator |
| F-6 | Follow Leader: State Check Failed | `getSetlistWithSongs` fails | Toggle remains active; "Unable to sync current state." hint (`text-xs text-red-500`) |
| F-7 | Follow Leader: Connection Lost | Realtime subscription drops | "Synced" dot replaced by "Lost connection." (`text-xs text-brand-brown dark:text-brand-tan`) |
| F-8 | Follow Leader: Off (after disable) | Follower disables toggle | Keys revert to State Check snapshot; back to F-1 |

---

## Amendments (from Context Bundle)

> Added by `@task-logger` after reconciling `spec.md` against `context.md`. These criteria were not in the original spec but are required based on MEMORY.md notes found during codebase exploration.

- [AC] Any state inside `useSetlistSync` that is seeded from an async source (e.g., State Check snapshot, `overrideKeys`) must be initialized with an empty `Map()` — not with a value derived from the `songs` prop at hook initialization time. If initial state must reflect async data, set it only inside an effect, not synchronously during render. (Source: global MEMORY.md — `useFontSize` setState-in-effect bug; Vercel build error from synchronous `setState` inside `useEffect`; fixed with lazy `useState` initializer.)

---

## Resolution

- **Completed:** 2026-04-19
- **Branch:** `feature/TASK-021-realtime-sync`
- **Base branch:** `develop`
- **Files changed:**
  - `src/utils/realtimeEvents.ts` — NEW: `REALTIME_EVENTS` constants + `SongChangePayload` / `KeyChangePayload` interfaces (AC-37)
  - `src/hooks/useSetlistSync.ts` — NEW: full Go Live + Follow Leader hook with RF-1 monotonic sequence guard, RF-5 latestKeyRef stale-closure guard, per-song debounce timers, State Check snapshot, AC-9 unmount cleanup effect
  - `src/components/SongViewer/ChordSheetClient.tsx` — added `externalKey` and `onKeyChangeLive` props; RF-2-guarded useEffect for external key injection; `onKeyChangeLive` fired alongside `onKeyChange`
  - `src/components/client/SetlistSongSection.tsx` — added `overrideKey`, `onKeyChangeLive`, `liveSyncState` props; D-4/D-5/D-6 per-song sync status UI; wire-through to `MemoChordSheetClient`
  - `src/components/client/ServiceNavigator.tsx` — added `isLeader`, `setlistId`, `isAuthenticated`, `sync` props; Go Live button (D-1/D-2/D-3/D-8 states); Follow Leader button (F-1/F-2/F-3/F-6/F-7 states); RF-3 stable refs for IntersectionObserver
  - `src/app/setlists/[id]/page.tsx` — updated to import and render `SetlistViewerClient` wrapper, passes `isLeader` and `isAuthenticated` as props
  - `src/app/setlists/[id]/SetlistViewerClient.tsx` — NEW: Client Component wrapper that instantiates `useSetlistSync` and wires all realtime props to `ServiceNavigator` and `SetlistSongSection`
- **Notes:**
  - The previous agent stalled on `toggleFollow` — the issue was that `validJunctionIds` needed to be in the `useCallback` dependency array. This is correctly implemented: `validJunctionIds` is computed via `useMemo` from `songs`, and `toggleFollow`'s dependency array includes `validJunctionIds` (line 390). The handlers inside `toggleFollow` close over the correct `validJunctionIds` value at call time.
  - AC-9 unmount cleanup was missing from the previous implementation. A `useEffect` with cleanup returning `supabase.removeChannel(channelRef.current)` was added to handle page navigation away.
  - The `'use client'` directive at the top of `useSetlistSync.ts` is kept — while hooks don't technically require it, it makes the import boundary explicit and prevents accidental Server Component usage.
  - The RF-2 eslint-disable in `ChordSheetClient.tsx` is intentional per spec (deliberately omitting `displayKey` from the `externalKey` effect to prevent a feedback loop) — this is in the component file, not in `useSetlistSync.ts` where AC-36 applies.
  - `broadcastSongChange` is returned from the hook for completeness per the `UseSetlistSyncReturn` interface spec, though in practice `onActiveSongChange` (also returned) is used by `ServiceNavigator` for SONG_CHANGE broadcasts. Both are equivalent; `onActiveSongChange` adds the `isLive` guard.
