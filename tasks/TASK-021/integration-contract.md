# Integration Contract — Collaborative Realtime Sync (TASK-021)

> Produced by `@integration-contract`. No code is written here. This document locks the exact
> technical agreement between the Frontend and Backend before implementation begins.

---

## 1. Server Action Contract Table

| UI Action | Server Action | File | RLS Role | Status | Gap Strategy |
|---|---|---|---|---|---|
| Follow Leader enable: State Check | `getSetlistWithSongs()` | `src/app/actions/setlistActions.ts` | public / authenticated | EXISTS | N/A |
| Key stepper tap while Go Live (debounced 400ms) | `updatePerformanceDetails()` | `src/app/actions/setlistActions.ts` | `leader_id = auth.uid()` (via RLS) | EXISTS | N/A |
| Go Live subscribe | Supabase Broadcast channel subscribe | client-side only (`createBrowserClient`) | No RLS — client-side `isLeader` guard only (RF-4) | MISSING (net-new) | Disable "Go Live" button, show "Live sync unavailable." if `@supabase/ssr` is not importable; this path is unreachable in practice because the SDK is already a project dependency |
| Director: broadcast `SONG_CHANGE` | `channel.send()` Broadcast | `src/hooks/useSetlistSync.ts` (new) | No RLS — client-side `isLeader` guard | MISSING (net-new) | N/A — fire-and-forget; Director's own navigation is unaffected if send fails |
| Director: broadcast `KEY_CHANGE` | `channel.send()` Broadcast | `src/hooks/useSetlistSync.ts` (new) | No RLS — client-side `isLeader` guard | MISSING (net-new) | Send only fires after `updatePerformanceDetails` succeeds; if `channel.send()` throws, log to console, do not surface to user |
| Follower: receive `SONG_CHANGE` | Realtime Broadcast listener | `src/hooks/useSetlistSync.ts` (new) | No RLS | MISSING (net-new) | If element not found: silent skip |
| Follower: receive `KEY_CHANGE` | Realtime Broadcast listener | `src/hooks/useSetlistSync.ts` (new) | No RLS | MISSING (net-new) | If `junctionId` not in rendered set: silent skip |
| Go Live / Follow Leader unsubscribe | `supabase.removeChannel(channel)` | `src/hooks/useSetlistSync.ts` (new) | No RLS | MISSING (net-new) | Cleanup called in `useEffect` return; no UI error state needed |

**Summary:**
- Total operations: 8
- EXISTS (Server Actions): 2
- MISSING (net-new Realtime infrastructure): 6
- All-MISSING escalation trigger: No — 2 of 8 are EXISTS; the 6 MISSING items are purely new Realtime wiring with no Server Action gaps. The two critical data operations (State Check + persist) both EXIST.

---

## 2. Server Action Detail Blocks

### 2a. State Check on Follow Leader Enable — EXISTS

- **Action:** `getSetlistWithSongs()` in `src/app/actions/setlistActions.ts`
- **Caller:** `useSetlistSync` hook, client-side import of Server Action, called when follower enables Follow Leader toggle.
- **Input Type:**
  ```ts
  { setlist_id: string }
  ```
- **Return Type:**
  ```ts
  {
    data: Array<{
      id: string            // junctionId (setlist_songs.id)
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
    }> | null
    error: string | null
  }
  ```
- **RLS Role Required:** `public / authenticated` — current policy is `setlist_songs_select_public_or_authenticated` (added in migration `20260418000002_allow_public_read_setlists.sql`). Any authenticated user, or unauthenticated user for public setlists, may read. Followers are authenticated per AC-19, so this always passes.
- **Supabase Tables Affected:** `setlist_songs` (SELECT with join to `songs`)
- **How result is used:** The returned array is iterated to build the `Map<junctionId, performanceKey>` State Check snapshot in `useSetlistSync`. This snapshot is the revert target when Follow Leader is disabled (AC-26, OQ-5 Option A).
- **Error States:**

  | Condition | `useSetlistSync` behavior | UI Behavior |
  |---|---|---|
  | `error !== null` | Set `followError = 'Unable to sync current state.'`; proceed to subscribe anyway (AC-25) | Inline hint `text-xs text-red-500` below Follow Leader button; `overrideKeys` map is empty; future broadcasts still populate it |
  | `data === null` (empty setlist) | Treat as valid empty snapshot; proceed to subscribe | No error shown; Follow Leader activates normally |
  | Server Action throws (network) | Caught in `try/catch` inside `useSetlistSync`; same as error path above | Same as error path above |

- **Gap Strategy:** N/A — EXISTS.

---

### 2b. Debounced Key Auto-Persist while Go Live — EXISTS

- **Action:** `updatePerformanceDetails()` in `src/app/actions/setlistActions.ts`
- **Caller:** `useSetlistSync` hook (Director path), called after 400ms debounce window elapses since last stepper tap.
- **Input Type:**
  ```ts
  {
    id: string          // junctionId (setlist_songs.id)
    setlist_id: string
    performance_key: string   // current displayKey from useTranspose, read via useRef (RF-5)
  }
  ```
- **Return Type:**
  ```ts
  { data: DbSetlistSong | null; error: string | null }
  ```
  Where `DbSetlistSong` is:
  ```ts
  {
    id: string
    setlist_id: string
    song_id: string
    order_index: number
    performance_key: string
    singer: string | null
  }
  ```
- **RLS Role Required:** `setlist_songs_update_leader` policy — UPDATE only permitted when `setlists.leader_id = auth.uid()`. Director is always the `leader_id` owner; this always passes.
- **Supabase Tables Affected:** `setlist_songs` (UPDATE on `performance_key`)
- **Sequence Guard (RF-1):** `useSetlistSync` must maintain a per-`junctionId` monotonically increasing sequence counter (`Map<junctionId, number>`). When the debounced callback fires, it captures the current counter value. On Server Action resolution, it checks that its captured counter equals the current counter; if not (a newer call has already resolved), it skips the broadcast. This prevents out-of-order resolves from broadcasting a stale key.
- **Stale Closure Guard (RF-5):** The debounced callback must read `displayKey` from a `useRef` (e.g., `latestKeyRef.current`), not from closure scope. `SetlistSongSection` writes to this ref via the `onKeyChangeLive` callback (AC-18) on every `displayKey` change.
- **On Success:** `{ error: null }` → broadcast `KEY_CHANGE` event (Section 3). Per-song sync area transitions to state D-5.
- **On Failure:** `{ error: string }` → do NOT broadcast. Per-song sync area transitions to state D-6 (error string displayed). Director's local chord display is NOT rolled back (optimistic, per AC-16).
- **Error States:**

  | Condition | Return | UI Behavior |
  |---|---|---|
  | Unauthorized (RLS, `42501`) | `{ data: null, error: 'You do not have permission to modify this setlist.' }` | Per-song D-6: red error text. Broadcast suppressed. LIVE badge stays active. |
  | Record not found (`PGRST116`) | `{ data: null, error: 'Setlist song entry not found.' }` | Per-song D-6: red error text. Broadcast suppressed. |
  | Invalid `performance_key` (not in NOTES) | `{ data: null, error: 'Invalid performance key. Must be one of: ...' }` | Per-song D-6: red error text. Broadcast suppressed. This path is unreachable in practice since `displayKey` is always derived from `NOTES`. |
  | Server error | `{ data: null, error: 'Unable to update performance details. Please try again.' }` | Per-song D-6: red error text. Broadcast suppressed. |

- **Gap Strategy:** N/A — EXISTS.

---

## 3. Realtime Channel Contract

### 3a. Channel Specification

| Property | Value |
|---|---|
| Channel name | `setlist_sync:${setlistId}` |
| Channel type | Supabase Broadcast |
| Supabase client | `createClient()` from `src/services/supabase/client.ts` (existing `createBrowserClient`) |
| Self-receive | `false` — Director does not receive their own events |
| Persistence | None — Broadcast is ephemeral. Channel state does not survive page reload. |
| DB columns required | None — Go Live and Follow Leader states are purely ephemeral client state. No new DB columns are needed. |

**Channel config object:**
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
// In useEffect cleanup and on explicit toggle-off:
supabase.removeChannel(channel)
```

---

### 3b. Broadcast Event Shapes

#### `SONG_CHANGE` — Director → Followers

```ts
// src/utils/realtimeEvents.ts (new file)
export const REALTIME_EVENTS = {
  SONG_CHANGE: 'SONG_CHANGE',
  KEY_CHANGE: 'KEY_CHANGE',
} as const

// Event payload interface (define in useSetlistSync.ts or a shared types file)
export interface SongChangePayload {
  junctionId: string   // setlist_songs.id of the song now active in Director's viewport
}

// Send shape (channel.send argument):
{
  type: 'broadcast',
  event: REALTIME_EVENTS.SONG_CHANGE,
  payload: { junctionId: string }
}
```

**Trigger:** `activeSongId` changes in `ServiceNavigator` while `isLive === true`. No debounce. Fire-and-forget.

**Follower handler behavior:**
- Extract `payload.junctionId`.
- Call `document.getElementById(`song-${payload.junctionId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })`.
- If element is null: silently skip.
- If `junctionId` is not in the rendered songs list: silently skip.

---

#### `KEY_CHANGE` — Director → Followers

```ts
export interface KeyChangePayload {
  junctionId: string       // setlist_songs.id
  performanceKey: string   // the key that was successfully persisted to the DB
}

// Send shape:
{
  type: 'broadcast',
  event: REALTIME_EVENTS.KEY_CHANGE,
  payload: { junctionId: string; performanceKey: string }
}
```

**Trigger:** `updatePerformanceDetails()` resolves with `{ error: null }`. The `performanceKey` in the payload is the same value sent to (and confirmed by) the Server Action — not the intermediate optimistic value.

**Follower handler behavior:**
- Extract `payload.junctionId` and `payload.performanceKey`.
- If `junctionId` is not in the currently rendered songs: silently ignore.
- Update `overrideKeys` Map: `setOverrideKeys(prev => new Map(prev).set(junctionId, performanceKey))`.
- The updated map flows down: `useSetlistSync` → `SetlistViewerPage` (or wrapper) → `SetlistSongSection` (`overrideKey` prop) → `ChordSheetClient` (`externalKey` prop) → `useEffect` calls `setTargetKey(externalKey)`.

---

## 4. New Prop Contracts

### 4a. `ChordSheetClient` — new `externalKey` prop

**File:** `src/components/SongViewer/ChordSheetClient.tsx`

**Updated interface:**
```ts
interface ChordSheetClientProps {
  processedLines: ProcessedLine[]
  originalKey: string
  /** Optional callback fired whenever the displayed (transposed) key changes. */
  onKeyChange?: (key: string) => void
  /**
   * NEW — Optional key injected by Follow Leader mode.
   * When defined and different from the current displayKey, triggers setTargetKey().
   * RF-2 guard: effect must NOT call setTargetKey when externalKey === displayKey
   * to avoid a redundant DOM chord mutation pass.
   */
  externalKey?: string
  /**
   * NEW — Optional callback fired on every key change for Go Live auto-persist.
   * Called alongside onKeyChange in the same useEffect. Only fires when provided.
   * Used by SetlistSongSection to hand the latest displayKey to useSetlistSync
   * for the debounced persist-and-broadcast sequence (AC-18, RF-5).
   */
  onKeyChangeLive?: (key: string) => void
}
```

**New `useEffect` inside `ChordSheetClient`:**
```ts
// RF-2 guard: only call setTargetKey if externalKey is defined AND differs from current displayKey
useEffect(() => {
  if (externalKey !== undefined && externalKey !== displayKey) {
    setTargetKey(externalKey)
  }
}, [externalKey])  // displayKey intentionally omitted — only react to external injection
```

**Existing `onKeyChange` effect — updated to also call `onKeyChangeLive`:**
```ts
useEffect(() => {
  onKeyChange?.(displayKey)
  onKeyChangeLive?.(displayKey)
}, [displayKey, onKeyChange, onKeyChangeLive])
```

---

### 4b. `SetlistSongSection` — new props

**File:** `src/components/client/SetlistSongSection.tsx`

**Updated interface:**
```ts
interface SetlistSongSectionProps {
  junctionId: string
  setlistId: string
  title: string
  artist: string
  processedLines: ProcessedLine[]
  performanceKey: string
  isLeader: boolean
  /** NEW — Key override from Follow Leader mode. Passed through to ChordSheetClient as externalKey. */
  overrideKey?: string
  /** NEW — Callback to notify useSetlistSync of every key change for debounced Go Live persist. */
  onKeyChangeLive?: (junctionId: string, key: string) => void
}
```

**Wire-through inside render:**
```tsx
<MemoChordSheetClient
  processedLines={processedLines}
  originalKey={performanceKey}
  onKeyChange={isLeader ? handleKeyChange : undefined}
  externalKey={overrideKey}
  onKeyChangeLive={onKeyChangeLive ? (key) => onKeyChangeLive(junctionId, key) : undefined}
/>
```

**Existing "Sync to Setlist" button behavior:** Unchanged. When Go Live is active, the per-song sync area is repurposed to show D-4/D-5/D-6 states driven by `useSetlistSync`. The explicit button remains in the DOM but is visually superseded by the auto-persist feedback. No removal needed.

---

### 4c. `ServiceNavigator` — new props

**File:** `src/components/client/ServiceNavigator.tsx`

**Updated interface:**
```ts
interface ServiceNavigatorProps {
  songs: NavigatorSong[]
  /** NEW — Whether the current user is the setlist leader. Controls Go Live button visibility. */
  isLeader: boolean
  /** NEW — Setlist UUID. Passed to useSetlistSync for channel naming. */
  setlistId: string
  /** NEW — Whether the current user is authenticated (non-null). Controls Follow Leader visibility. */
  isAuthenticated: boolean
  /** NEW — Slice of useSetlistSync return needed by the navigator bar UI. */
  sync: {
    // Director controls
    isLive: boolean
    isLiveConnecting: boolean
    liveError: string | null
    toggleLive: () => void
    // Follower controls
    isFollowing: boolean
    isStateChecking: boolean
    followError: string | null
    followSyncStatus: 'synced' | 'lost' | 'idle'
    toggleFollow: () => void
    // Active song reporting (for SONG_CHANGE broadcast)
    onActiveSongChange: (junctionId: string) => void
  }
}
```

**`activeSongId` change reporting:** The existing `setActiveSongId` call in the `IntersectionObserver` callback must also call `sync.onActiveSongChange(winningId)` when `isLive` is true. The `onActiveSongChange` function in `useSetlistSync` calls `broadcastSongChange(junctionId)`.

**RF-3 stability note:** The `sync` prop object must be a stable reference from the parent. The parent must pass individual memoized callbacks, or `useSetlistSync` must return a stable `sync` object via `useMemo`. The `IntersectionObserver` `useEffect` depends on `[songs]` — adding `sync.onActiveSongChange` to its dependency array would cause the observer to reconnect on every render. The implementation must pass `sync.onActiveSongChange` via a `useRef` inside `ServiceNavigator` to avoid this.

---

### 4d. `useSetlistSync` Hook — full signature

**File:** `src/hooks/useSetlistSync.ts` (new)

**Input:**
```ts
interface UseSetlistSyncParams {
  setlistId: string
  isLeader: boolean
  songs: Array<{ junctionId: string; performanceKey: string }>
}
```

**Return (`UseSetlistSyncReturn`):**
```ts
interface UseSetlistSyncReturn {
  // Director
  isLive: boolean
  isLiveConnecting: boolean
  liveError: string | null
  toggleLive: () => void

  // Follower
  isFollowing: boolean
  isStateChecking: boolean
  followError: string | null
  followSyncStatus: 'synced' | 'lost' | 'idle'
  toggleFollow: () => void

  // Shared — key overrides for follower mode (junctionId → performanceKey)
  overrideKeys: Map<string, string>

  // Director outbound broadcast helpers (called by ServiceNavigator and SetlistSongSection)
  broadcastSongChange: (junctionId: string) => void
  broadcastKeyChange: (junctionId: string, performanceKey: string) => void
}
```

**Internal state and refs required:**
```ts
// Channel instance — held in ref to avoid re-creation on re-renders (AC-35)
const channelRef = useRef<ReturnType<SupabaseClient['channel']> | null>(null)

// Per-song sequence counters for RF-1 out-of-order resolve guard
const sequenceRef = useRef<Map<string, number>>(new Map())

// Per-song latest displayKey refs for RF-5 stale closure guard
// Written by onKeyChangeLive callback, read by debounced Server Action call
const latestKeyRef = useRef<Map<string, string>>(new Map())

// State Check snapshot — revert target on Follow Leader disable
const [stateCheckSnapshot, setStateCheckSnapshot] = useState<Map<string, string>>(new Map())

// overrideKeys — reactive, flows to ChordSheetClient.externalKey
const [overrideKeys, setOverrideKeys] = useState<Map<string, string>>(new Map())
```

**Supabase client instantiation:** Call `createClient()` from `src/services/supabase/client.ts` once at hook initialization (in a `useMemo` or at hook body top level — not inside a `useEffect`, to avoid the client being recreated on every render).

---

## 5. Migration Requirements

### Decision: No new DB columns are required for TASK-021.

**Rationale:**

The Feature Specification (Section: Out of Scope) explicitly states: "Persisting Go Live or Follow Leader toggle state to the database." The spec's Resolved Ambiguities section confirms: "`active_song_id` is ephemeral. No DB column exists. Song position catch-up is not possible from DB."

Therefore:
- `setlists.is_live` — **NOT NEEDED.** Go Live state is ephemeral client state in `useSetlistSync.isLive`. It resets on page reload by design.
- `setlists.active_song_id` — **NOT NEEDED.** Active song position is broadcast-only (`SONG_CHANGE`). It is never persisted. The State Check re-fetch (`getSetlistWithSongs`) does not return or use an active song position.

The `@codebase-explorer` context bundle flagged these as potential gaps, but the Feature Specification's out-of-scope declarations and the spec author's explicit resolution (Resolved Ambiguities section) confirm they are intentionally absent.

**No new migration files are required for TASK-021.**

---

## 6. RLS Gap Documentation — RF-4 Broadcast Authority Gap

**Risk:** Supabase Broadcast channels have no server-side authorization layer. Any authenticated user who can construct or discover the channel name `setlist_sync:${setlistId}` can call `channel.send()` with `SONG_CHANGE` or `KEY_CHANGE` payloads, bypassing the `isLeader` client-side guard.

**Accepted boundary:** The client-side `isLeader` guard (`user.id === setlist.leader_id`, evaluated in `SetlistViewerPage` and passed as a prop) prevents the Go Live button from rendering for non-leaders, so the `channel.send()` path is never exposed through the Saliw UI to unauthorized users.

**What this means in practice:**
- A malicious authenticated user with browser DevTools could manually call `channel.send()` to inject spurious `KEY_CHANGE` or `SONG_CHANGE` events to all active followers of a setlist they do not own.
- The Supabase PostgREST / RLS system does not intercept Broadcast traffic — it is a WebSocket message bus, not a database operation.
- Followers receiving a spoofed `KEY_CHANGE` would see their chord display update to the injected key. This is a denial-of-rehearsal attack vector.

**Mitigation status:** Out of scope for this task per the Feature Specification. Documented here for the security audit record. A future mitigation path would be a Supabase Edge Function acting as a Broadcast relay that verifies `leader_id` before forwarding events, but this is not in scope for TASK-021.

**Gap Strategy:** Disable "channel.send()" calls at the UI level via `isLeader` prop gating. No UI hint needed for followers — the gap is transparent to them. The integration contract notes this as an accepted risk.

---

## 7. Gap-Handling Strategies Summary

| Gap | Type | Strategy |
|---|---|---|
| Supabase Broadcast infrastructure | Net-new (not an API gap) | Implemented as new `useSetlistSync` hook. No existing endpoint to fall back to. |
| `useSetlistSync.ts` hook | MISSING (new file) | Disable Go Live and Follow Leader buttons until hook is implemented. Buttons absent from DOM for unauthenticated users regardless. |
| `src/utils/realtimeEvents.ts` | MISSING (new file) | No fallback needed — constants file. Build will fail without it if hook imports it. |
| `ChordSheetClient.externalKey` prop | MISSING (new prop on existing component) | `ChordSheetClient` renders normally without the prop; existing behavior unchanged if prop is absent. |
| `ServiceNavigator` new props | MISSING (prop additions to existing component) | TypeScript will enforce prop presence at compile time. Existing song nav renders unaffected if new props are not yet wired. |
| `setlists.is_live` DB column | CONFIRMED NOT NEEDED | No gap; no migration required. |
| `setlists.active_song_id` DB column | CONFIRMED NOT NEEDED | No gap; no migration required. |
| Broadcast authority enforcement (RF-4) | Accepted risk, out of scope | Client-side `isLeader` guard only. Documented above. |

---

## 8. Files Affected by This Contract

### Existing files to be modified:
- `src/components/SongViewer/ChordSheetClient.tsx` — add `externalKey?` and `onKeyChangeLive?` props
- `src/components/client/SetlistSongSection.tsx` — add `overrideKey?` and `onKeyChangeLive?` props; wire to `ChordSheetClient`
- `src/components/client/ServiceNavigator.tsx` — add `isLeader`, `setlistId`, `isAuthenticated`, `sync` props; render Go Live and Follow Leader controls
- `src/app/setlists/[id]/page.tsx` — pass new props to `ServiceNavigator` and `SetlistSongSection`; instantiate `useSetlistSync` in a new wrapper client component

### New files to be created:
- `src/hooks/useSetlistSync.ts` — all Realtime subscribe/unsubscribe/send/receive logic
- `src/utils/realtimeEvents.ts` — `REALTIME_EVENTS` constants

### No changes to:
- `src/app/actions/setlistActions.ts` — both required Server Actions exist and are used as-is
- `src/types/supabase.ts` — no new DB columns; no type changes needed
- `src/services/supabase/client.ts` — existing `createBrowserClient` factory is correct
- `src/hooks/useTranspose.ts` — no changes; `setTargetKey` is already public in its return type
- Any migration files — no new DB columns required
