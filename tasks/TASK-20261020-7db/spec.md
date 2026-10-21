# Feature Specification — Saliw V2: Real-time Multi-Device Stage Sync

## Feature Summary
The Real-time Multi-Device Stage Sync feature enables band leaders and musicians to maintain synchronized views of chord sheets and setlists during live church services. Built on Supabase Realtime Broadcast and Presence, the feature allows a band leader to broadcast song navigation (`SONG_NAVIGATE`), live transposition (`TRANSPOSE_UPDATE`), and ratio-based autoscroll (`AUTOSCROLL_UPDATE`) with sub-200ms latency to all connected follower devices. Followers can safely override the leader's key with an explicit reset option, fall back seamlessly to offline solo mode upon disconnection, and view real-time stage presence counts ("Live: N devices connected"). The feature is strictly compliant with Next.js 15 / React 19 React Compiler constraints and the Artisan design system.

---

## Acceptance Criteria

1. **AC-1: Channel Lifecycle & Presence Tracking (`useStageSync`)**
   - Connects to Supabase Realtime channel `realtime:stage-room:${setlistId}` (or multiplexed `setlist_sync:${setlistId}`) with Broadcast and Presence enabled.
   - Tracks explicit connection lifecycle state: `'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING'`.
   - Tracks stage presence: broadcasts client identity (`{ deviceId: string, role: 'leader' | 'follower' | 'solo', joinedAt: number }`) and computes active stage count for display (e.g. "Live: 3 devices connected").
   - Subscription cleanup: On unmount or setlist change, immediately unsubscribes and removes channel via `supabase.removeChannel(channel)` to guarantee 0 zombie connections and 0 memory leaks.
   - SSR & Hydration Safety: Uses `useState(false)` + `useEffect(() => setMounted(true), [])` (per `MEMORY.md` BUG-020) to prevent hydration mismatches during client mount.

2. **AC-2: Leader Broadcast Coordination**
   - In `'leader'` mode, mutations trigger instant Supabase Realtime broadcasts without page reload:
     - Song navigation: `SONG_NAVIGATE` `{ songId: string, setlistIndex: number, timestamp: number }`.
     - Transposition offset: `TRANSPOSE_UPDATE` `{ songId: string, semitones: number, timestamp: number }`.
     - Autoscroll state: `AUTOSCROLL_UPDATE` `{ isScrolling: boolean, speedMultiplier: number, scrollPositionRatio: number, timestamp: number }`.
   - Broadcast events propagate to subscribers with sub-200ms latency under normal network conditions.
   - Monotonic sequencing: Every broadcast payload includes a millisecond `timestamp`. Follower discards incoming events with `timestamp <= lastProcessedTimestamp` to prevent out-of-order race conditions.

3. **AC-3: Follower Safety & Local Override**
   - In `'follower'` mode, client automatically adopts leader's broadcasts for song index, key transposition, and autoscroll.
   - Manual override protection: If follower manually transposes song while following, local state locks and a status badge appears: `"Overriding leader • [Reset to Leader]"`. Incoming `TRANSPOSE_UPDATE` events are ignored while in override.
   - Reset behavior: Clicking `[Reset to Leader]` clears override state and re-aligns follower immediately to leader's current broadcasted transposition.
   - Song navigation reset: When leader broadcasts `SONG_NAVIGATE`, follower transitions to the new song and resets local key override to match leader's key for that song.
   - Solo mode isolation: In `'solo'` mode (default), all local actions remain isolated; incoming broadcasts are ignored and no state is broadcast.

4. **AC-4: Ratio-Based Autoscroll Coordination**
   - Autoscroll synchronization uses normalized `scrollPositionRatio` (`scrollTop / (scrollHeight - clientHeight)` from `0.0` to `1.0`), ensuring identical view positions across phones, tablets, and desktops regardless of viewport height.
   - Follower smoothly applies incoming `isScrolling`, `speedMultiplier`, and synchronizes position if drift exceeds a 5% threshold without jumpy disruption.

5. **AC-5: StageSyncControls UI & WCAG Accessibility**
   - Renders a compact, touch-friendly status pill in setlist / chord sheet header showing current role, connection status indicator, and presence counter.
   - Role authorization: Only setlist owner or authenticated admin / `music_director` can switch to `'leader'` mode. Unauthenticated and non-owner users can only toggle `'follower'` or `'solo'`, with the leader option disabled and accompanied by an explanatory tooltip.
   - Touch targets: All pill toggles, buttons, and mode options have minimum dimensions of 44px x 44px for reliable live-performance stage handling.
   - Artisan Palette & Dark Mode: Uses brand tokens (`--brand-cream`, `--brand-tan`, `--brand-brown`, `--brand-espresso`, `--brand-darker`). Every Tailwind brand class has explicit `dark:` pairing per `MEMORY.md` BUG-005. Contrasts meet WCAG AA (no `--brand-tan` text on `--brand-cream`).

6. **AC-6: React 19 / Compiler Compliance & Verification Gates**
   - Dependency array hygiene: `useCallback` / `useMemo` hooks never reference object property paths (e.g. `[sync.toggleLive]` is forbidden per `MEMORY.md` BUG-002); dependencies must reference the whole parent object or destructured primitives.
   - Declaration order: All helper functions and callbacks are declared prior to hook references (per `MEMORY.md` BUG-007).
   - Automated tests: Vitest test suite covers `useStageSync` lifecycle (channel creation, unmount cleanup, broadcast dispatch, presence count calculation, and local override state machine).
   - Type check and build: `tsc --noEmit` and `next build` pass with 0 errors.

---

## Out of Scope
- Persistent chat, text messaging, or vocal cue transmission between musicians.
- Metronome audio sync, MIDI clock, or real-time WebRTC audio/video streaming.
- PostgreSQL database persistence of transient stage states (broadcasts are ephemeral in memory).
- Multi-leader concurrent arbitration (single leader per setlist channel).

---

## Fallback Behaviors
- **Supabase Realtime Disconnection / Network Drop:** State transitions to `'DISCONNECTED'` (or `'RECONNECTING'`). Chord viewer smoothly degrades to local Solo mode; follower controls remain fully operable. Visual pill shows offline icon with tooltip: "Stage sync disconnected. Operating in offline solo mode."
- **WebSocket Blocked by Firewall:** Hook detects connection failure, sets status to `'DISCONNECTED'`, and preserves local viewer interactivity without uncaught promise exceptions.
- **Unauthorized Follower attempting Leader Mode:** Leader option is disabled with hint: "Only setlist owner or music director can lead stage sync."
- **Out-of-Order Broadcast Packets:** Packets with `timestamp <= lastProcessedTimestamp` are discarded silently.

---

## Resolved Ambiguities
- **Role Permissions:** Pre-resolved — Any viewer can join as Follower; only setlist owner or authenticated admin can lead stage sync.
- **Data Persistence:** Pre-resolved — Ephemeral broadcast/presence only; zero PostgreSQL schema mutations.
- **Autoscroll Screen Size Variance:** Pre-resolved — Ratio-based scrolling (`scrollPositionRatio`) normalizes different screen sizes and orientations.
- **Dark Mode Styling Rules:** Resolved from `MEMORY.md` (BUG-005) & `docs/coding-guidelines.md` — Explicit `dark:` class pairing on all brand tokens; `--brand-darker` for dark mode background.
- **React Compiler Strict Rules:** Resolved from `MEMORY.md` (BUG-001, BUG-002, BUG-007, BUG-020) — Entire object dependencies in `useCallback`, safe hydration initializers, function ordering before hooks.
