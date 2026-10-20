# Endpoint Contracts — Saliw V2: Real-time Multi-Device Stage Sync

---

## 1. Server Action Contracts

### `getSetlistWithSongs()` — EXISTS (State Check)

- **Type:** Next.js Server Action
- **File:** `src/app/actions/setlistActions.ts`
- **Caller Context:** `useSetlistSync` hook (Follow Leader path in `toggleFollow`). Invoked before or during channel subscription to establish the baseline snapshot of confirmed song keys.
- **Input Payload:**
  ```ts
  {
    setlist_id: string; // UUID of target setlist
  }
  ```
- **Success Response (2xx / resolved):**
  ```ts
  {
    data: Array<{
      id: string;              // setlist_songs PK (junctionId)
      song_id: string;         // songs table PK
      order_index: number;     // 0-indexed position
      performance_key: string; // Stored musical key (e.g., "G", "C#")
      songs: {
        id: string;
        title: string;
        artist: string;
        original_key: string;
        content: string;
        youtube_url: string | null;
      };
    }> | null;
    error: null;
  }
  ```
- **Error Response:**
  ```ts
  {
    data: null;
    error: string; // e.g. "Unable to load setlist. Please try again."
  }
  ```
- **RLS Policy:** `setlist_songs_select_authenticated` and public read policies allow any user (leader, musician, or viewer) to fetch songs for public or team setlists.
- **Supabase Tables Affected:** `setlist_songs` (SELECT) JOIN `songs` (SELECT).
- **Error States:**
  | Condition | Meaning / Code | UI Behavior |
  |-----------|----------------|-------------|
  | Network / DB query failure | `error !== null` | Display non-blocking error badge: `followError = "Unable to sync current state."`. Follower continues to subscribe to channel so live broadcasts can still be received. |
  | Empty setlist | `data = []` | Valid state. State Check snapshot is an empty `Map`. Follow Leader activates smoothly. |
- **Gap Strategy:** N/A (EXISTS).

---

### `updatePerformanceDetails()` — EXISTS (Director Key Auto-Persist)

- **Type:** Next.js Server Action
- **File:** `src/app/actions/setlistActions.ts`
- **Caller Context:** `useSetlistSync` hook (Director path in `notifyKeyChange`). Fired after a 400ms debounce interval when the Director transposes a song.
- **Input Payload:**
  ```ts
  {
    id: string;              // setlist_songs.id (junctionId)
    setlist_id: string;      // setlists.id for RLS scoping
    performance_key?: string; // Valid musical key from canonical NOTES array
  }
  ```
- **Success Response (2xx / resolved):**
  ```ts
  {
    data: {
      id: string;
      setlist_id: string;
      song_id: string;
      order_index: number;
      performance_key: string;
    };
    error: null;
  }
  ```
- **Error Response:**
  ```ts
  {
    data: null;
    error: string;
  }
  ```
- **RLS Policy:** `setlist_songs_update_leader` — strictly enforced on Postgres. Only authenticated user matching `setlists.leader_id = auth.uid()` may execute.
- **Supabase Tables Affected:** `setlist_songs` (UPDATE on `performance_key`).
- **Concurrency & Stale Response Guards:**
  - **RF-1 Monotonic Sequence Counter (`sequenceRef`):** Tracked per `junctionId`. Incremented on every key change. If a subsequent debounce window resolves first, older Server Action responses are silently discarded.
  - **RF-5 Stale Closure Guard (`latestKeyRef`):** The debounced closure reads the target key from `latestKeyRef.current.get(junctionId)`, guaranteeing the latest value is persisted even under rapid taps.
  - **Broadcast Trigger:** Only when `error === null` does the Director broadcast `KEY_CHANGE` with the DB-confirmed `performance_key`.
- **Error States:**
  | Condition | Meaning / Code | UI Behavior |
  |-----------|----------------|-------------|
  | RLS Permission denied | `42501` | Per-song badge switches to error: `"You do not have permission to modify this setlist."`. Broadcast is suppressed. |
  | Record not found | `PGRST116` | Per-song badge switches to error: `"Setlist song entry not found."`. Broadcast is suppressed. |
  | Invalid key | Custom check | Per-song badge switches to error: `"Invalid performance key."`. Broadcast is suppressed. |
  | General server error | `500` / Other | Per-song badge switches to error: `"Unable to update performance details. Please try again."`. Broadcast is suppressed. |
- **Gap Strategy:** N/A (EXISTS).

---

## 2. Ephemeral Realtime Multiplexed Channel Contracts

**Multiplexing Invariant:** All Broadcast and Presence features MUST share a single channel per setlist: `setlist_sync:${setlistId}`. Creating separate channels for broadcast and presence is strictly prohibited to avoid connection leaks, duplicate subscriptions, and Strict Mode desync.

---

### Channel Subscription & Lifecycle — EXISTS

- **Type:** Supabase Realtime Client Subscription
- **Module:** `src/hooks/useSetlistSync.ts` via `src/services/supabase/client.ts` (`getRealtimeClient()`)
- **Topic Name:** `setlist_sync:${setlistId}`
- **Subscription Config:**
  ```ts
  const channel = supabase.channel(`setlist_sync:${setlistId}`, {
    config: {
      broadcast: { self: false },
      presence: { key: clientSessionId }, // crypto.randomUUID()
    },
  });
  ```
- **Lifecycle Events & States:**
  | Status Callback | Role | UI Behavior |
  |-----------------|------|-------------|
  | `"SUBSCRIBED"` | Director | `isLiveConnecting = false`, `isLive = true`. Track presence as Director. |
  | `"SUBSCRIBED"` | Follower | `isFollowing = true`, `followSyncStatus = "synced"`. Track presence as Follower. |
  | `"CHANNEL_ERROR"` | Director | `isLiveConnecting = false`, `isLive = false`, `liveError = "Unable to start live session. Please try again."`. Remove channel. |
  | `"CHANNEL_ERROR"` | Follower | `followSyncStatus = "lost"`. Show "Lost connection" badge. Channel attempts reconnect. |
  | `"CLOSED"` | Either | Reset state to idle/disconnected. |
- **Gap Strategy:** N/A (EXISTS — extend subscription config to include presence key).

---

### Stage Device Presence Tracking — MISSING (Net-New)

- **Type:** Supabase Realtime Presence
- **Module:** `src/hooks/useSetlistSync.ts`
- **Channel Topic:** `setlist_sync:${setlistId}`
- **Tracking Payload Interface:**
  ```ts
  export interface StagePresenceState {
    sessionId: string;             // Client session UUID
    userId: string | null;         // auth.uid() or null for guest
    displayName: string;          // User full name, musician name, or "Musician (Tablet)"
    role: "director" | "follower"; // Session authority
    deviceType: "desktop" | "tablet" | "mobile";
    joinedAt: string;             // ISO-8601 string
  }
  ```
- **Presence Methods:**
  - **Track:** `await channel.track(presencePayload)` called immediately upon receiving `SUBSCRIBED`.
  - **Untrack:** `await channel.untrack()` called prior to removing channel or on toggle-off.
  - **Listeners:**
    ```ts
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<StagePresenceState>();
        // Aggregate connected stage devices and identify active director
      })
      .on("presence", { event: "join" }, ({ key, newPresences }) => {
        // Increment device count or notify band
      })
      .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
        // Decrement device count; if Director left, update directorOnline = false
      });
    ```
- **Exposed Reactive Hook State:**
  ```ts
  connectedDevices: StagePresenceState[];
  connectedDeviceCount: number;
  isDirectorOnline: boolean;
  ```
- **UI Behavior:**
  - ServiceNavigator shows active stage counter pill: e.g. `"● 4 devices on stage"`.
  - If `isDirectorOnline === false` while follower is connected, follower shows amber indicator: `"Director offline — waiting..."`.
- **Gap Strategy (MISSING):**
  - Implement presence tracking in `useSetlistSync.ts`.
  - Default fallback: If presence tracking fails or is disabled, UI hides the device counter pill and assumes local connection only. Follower operation remains unblocked.

---

### `SONG_CHANGE` Broadcast — EXISTS

- **Type:** Supabase Realtime Broadcast
- **Constants:** `REALTIME_EVENTS.SONG_CHANGE = "SONG_CHANGE"` in `src/utils/realtimeEvents.ts`
- **Direction:** Director -> Followers
- **Trigger:** Director active song changes in viewport (via `IntersectionObserver` in `ServiceNavigator` or direct song click).
- **Payload Shape:**
  ```ts
  export interface SongChangePayload {
    junctionId: string; // setlist_songs.id
  }
  ```
- **Send Call:**
  ```ts
  channel.send({
    type: "broadcast",
    event: REALTIME_EVENTS.SONG_CHANGE,
    payload: { junctionId },
  });
  ```
- **Receive Handler:**
  - Guard: Check if `junctionId` is in `validJunctionIdsRef.current`. If not, silent skip.
  - Action: Smooth scroll viewport to `#song-${junctionId}` (`scrollIntoView({ behavior: "smooth", block: "start" })`).
- **Error States:**
  - Element not present in DOM: Silent skip.
  - Send network drop: Silent; fire-and-forget.
- **Gap Strategy:** N/A (EXISTS).

---

### `KEY_CHANGE` Broadcast — EXISTS

- **Type:** Supabase Realtime Broadcast
- **Constants:** `REALTIME_EVENTS.KEY_CHANGE = "KEY_CHANGE"` in `src/utils/realtimeEvents.ts`
- **Direction:** Director -> Followers
- **Trigger:** `updatePerformanceDetails()` Server Action resolves with `{ error: null }`.
- **Payload Shape:**
  ```ts
  export interface KeyChangePayload {
    junctionId: string;
    performanceKey: string; // Confirmed DB key (never unconfirmed optimistic key)
  }
  ```
- **Send Call:**
  ```ts
  channel.send({
    type: "broadcast",
    event: REALTIME_EVENTS.KEY_CHANGE,
    payload: { junctionId, performanceKey },
  });
  ```
- **Receive Handler:**
  - Guard: Check if `junctionId` is in `validJunctionIdsRef.current`. If not, silent skip.
  - Action: Update `overrideKeys` Map (`prev.set(junctionId, performanceKey)`).
  - Reactive propagation: Feeds `ChordSheetClient.externalKey` which mutates `.chord-item` innerText via DOM mutation without React SSR hydration mismatches.
- **Error States:**
  - Send network drop: Not retried; the next transposition will broadcast the confirmed key.
- **Gap Strategy:** N/A (EXISTS).

---

### `SECTION_CHANGE` Broadcast — MISSING (Net-New)

- **Type:** Supabase Realtime Broadcast
- **Constants:** Add `SECTION_CHANGE: "SECTION_CHANGE"` to `REALTIME_EVENTS` in `src/utils/realtimeEvents.ts`
- **Direction:** Director -> Followers
- **Trigger:** Director taps a section badge in `SectionNavDeck` (e.g. `[Verse 1]`, `[Chorus]`, `[Bridge]`, `[Outro]`) to lead the band into a specific song section.
- **Payload Shape:**
  ```ts
  export interface SectionChangePayload {
    junctionId: string;   // setlist_songs.id
    sectionId: string;    // e.g. "section-{junctionId}-{lineIndex}"
    sectionLabel: string; // e.g. "CH", "BR", "V1"
  }
  ```
- **Send Call:**
  ```ts
  channel.send({
    type: "broadcast",
    event: REALTIME_EVENTS.SECTION_CHANGE,
    payload: { junctionId, sectionId, sectionLabel },
  });
  ```
- **Receive Handler:**
  - Guard: Check if `junctionId` exists in setlist.
  - Target Lookup: Locate DOM element by ID (`document.getElementById(sectionId)`).
  - Action: If found, scroll smoothly to section with `block: "center"`. If section element is not found, fallback to scrolling to the song container (`#song-${junctionId}`).
  - Active Section Indicator: Temporarily highlight section badge in follower `SectionNavDeck` for 1500ms.
- **Gap Strategy (MISSING):**
  - Add constant to `src/utils/realtimeEvents.ts`.
  - Add `broadcastSectionChange` and listener to `useSetlistSync.ts`.
  - If missing or unhandled by older client versions, falls back smoothly to standard song-level viewing.

---

### `SCROLL_SYNC` Broadcast — MISSING (Net-New)

- **Type:** Supabase Realtime Broadcast
- **Constants:** Add `SCROLL_SYNC: "SCROLL_SYNC"` to `REALTIME_EVENTS` in `src/utils/realtimeEvents.ts`
- **Direction:** Director -> Followers
- **Trigger:** Director toggles play/pause or changes speed level (1–5) in teleprompter auto-scroll (`useAutoScroll` / `AutoScrollToolbar`), or passes major scroll milestones (throttled at 100ms).
- **Payload Shape:**
  ```ts
  export interface ScrollSyncPayload {
    junctionId: string;        // Active song ID
    isAutoScrolling: boolean;  // Play/pause state
    speedLevel: number;        // Speed factor 1 to 5
    scrollPercentage: number;  // Relative scroll offset (0.0 to 1.0)
    timestamp: number;         // Timestamp for network latency calculation
  }
  ```
- **Send Call:**
  ```ts
  channel.send({
    type: "broadcast",
    event: REALTIME_EVENTS.SCROLL_SYNC,
    payload: { junctionId, isAutoScrolling, speedLevel, scrollPercentage, timestamp: Date.now() },
  });
  ```
- **Receive Handler:**
  - Guard: Follower must be in Follow Leader mode (`isFollowing === true`).
  - Shared `useAutoScroll` instance sync:
    - If Director paused: Follower calls `autoScroll.pause()`.
    - If Director playing: Follower updates speed (`autoScroll.setSpeed(speedLevel)`) and starts scrolling (`autoScroll.play()`).
    - Position correction: If Follower current scroll position deviates from Director by > 8%, smoothly align scroll position.
- **Gap Strategy (MISSING):**
  - Add constant to `src/utils/realtimeEvents.ts`.
  - Add throttled sender and listener to `useSetlistSync.ts`.
  - When disabled or missing, follower auto-scroll remains independently controllable via local toolbar.

---

### Channel Unsubscribe & Cleanup — EXISTS

- **Type:** Supabase Realtime Cleanup
- **Module:** `src/hooks/useSetlistSync.ts`
- **Triggers:**
  1. Director toggles Go Live off.
  2. Follower toggles Follow Leader off.
  3. Component unmounts (`useEffect` return function).
- **Execution Order:**
  ```ts
  // 1. Untrack stage presence
  if (channelRef.current) {
    channelRef.current.untrack();
    supabase.removeChannel(channelRef.current);
    channelRef.current = null;
  }
  // 2. Clear all debounce & status timers
  // 3. Follower reverts override keys to State Check snapshot
  ```
- **Post-Unsubscribe State:**
  - Director: `isLive = false`, `channelRef.current = null`, `connectedDevices = []`.
  - Follower: `isFollowing = false`, `followSyncStatus = "idle"`, `overrideKeys` restored to snapshot.
- **Gap Strategy:** N/A (EXISTS — add `channel.untrack()` prior to `supabase.removeChannel`).

---

## 3. Impacted & Extended Files Summary

| File | Type | Planned Modification |
|------|------|----------------------|
| `src/utils/realtimeEvents.ts` | Existing Types/Constants | Add `SECTION_CHANGE`, `SCROLL_SYNC`, and `StagePresenceState` interfaces |
| `src/hooks/useSetlistSync.ts` | Existing Hook | Add multiplexed Presence tracking, section jump broadcast/listener, teleprompter scroll broadcast/listener |
| `src/components/client/SectionNavDeck.tsx` | Existing Component | Wire section button clicks to `broadcastSectionChange` when Director is Live |
| `src/components/client/AutoScrollToolbar.tsx` | Existing Component | Wire speed/play toggle events to `broadcastScrollSync` |
| `src/app/actions/setlistActions.ts` | Existing Server Actions | Verified: `getSetlistWithSongs` and `updatePerformanceDetails` fully compatible with no schema migrations required |
