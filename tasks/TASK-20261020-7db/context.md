## Context Bundle — Saliw V2: Real-time Multi-Device Stage Sync

### Relevant Files
| File | Why It's Relevant |
|------|------------------|
| `src/hooks/useSetlistSync.ts` | Central hook managing Supabase Realtime channel subscription, broadcast events (`SONG_CHANGE`, `KEY_CHANGE`), debounce timing, monotonic sequence counters, state snapshots, and cleanup. Core candidate for adding Presence (`channel.track`, `presenceState`, join/leave events) and extended broadcast events. |
| `src/utils/realtimeEvents.ts` | Shared constants and payload interfaces for Realtime broadcast events. Must be extended for V2 events (e.g. scroll sync, section jumps, presence sync). |
| `src/services/supabase/client.ts` | Provides `getRealtimeClient()` module singleton for client-side Supabase Realtime connections surviving React Strict Mode remounts. |
| `src/hooks/useAutoScroll.ts` | Teleprompter-style full-page auto-scroll hook with delta-based rAF accumulator; reusable for stage-synced auto-scroll control. |
| `src/components/SongViewer/ChordSheetClient.tsx` | Interactive chord sheet with live transposition via DOM mutation on `.chord-item`; consumes `externalKey` from sync without triggering React hydration mismatches. |
| `src/components/client/ServiceNavigator.tsx` | Sticky song navigation bar with `IntersectionObserver` reporting the active song; contains smooth-scroll settle detector. |
| `src/components/client/GoLiveButton.tsx` | Director UI toggle initiating live broadcast session; contains accessible `ConfirmDialog` and connecting/live states. |
| `src/components/client/FollowLeaderButton.tsx` | Follower UI toggle with initial State Check snapshot, sync status indicator ("synced" green dot, "lost" indicator), and `ConfirmDialog`. |
| `src/app/setlists/[id]/SetlistViewerClient.tsx` | Root client orchestrator component that instantiates `useSetlistSync`, binds shared `useAutoScroll`, and wires sync state down to child components. |
| `src/components/client/SetlistSongSection.tsx` | Per-song wrapper displaying sync status (saving/synced/error), handling debounce key changes, and memoizing `ChordSheetClient`. |
| `src/components/client/SectionNavDeck.tsx` | Jump deck for song sections (Verse, Chorus, Bridge); candidate for section-level sync. |
| `MEMORY.md` | Known bug prevention patterns: React Compiler dependency arrays (BUG-002), forward references (BUG-007), lazy initializers (BUG-001), SSR mount guards (BUG-020). |

### Reuse Candidates
- `src/services/supabase/client.ts` (`getRealtimeClient`) — Use directly for channel instantiation (`supabase.channel(...)`). Ensures a single client instance survives React Strict Mode remounts.
- `src/utils/realtimeEvents.ts` (`REALTIME_EVENTS`) — Extend with new event types (e.g. `SCROLL_SYNC`, `SECTION_CHANGE`, presence events) and payload interfaces, keeping all event names centralized.
- `src/hooks/useSetlistSync.ts` — Extend the existing channel lifecycle to include Supabase Presence tracking (`channel.track(...)`, `channel.on('presence', ...)`). Reuse monotonic sequence counters (`sequenceRef`), ref mirroring (`validJunctionIdsRef`, `latestKeyRef`), and per-song debounce handling.
- `src/hooks/useAutoScroll.ts` — Reuse delta rAF math, speed levels (1–5), and pause/resume logic when synchronizing teleprompter scroll state between leader and followers.
- `src/components/client/GoLiveButton.tsx` / `FollowLeaderButton.tsx` (`ConfirmDialog`) — Reuse accessible modal pattern (focus trap, backdrop dismiss, Escape key listener).
- `src/components/client/ServiceNavigator.tsx` (`startSettleDetector`) — Reuse rAF scroll stability detector to ensure smooth scrolling finishes before re-enabling scroll listeners or broadcasting settled positions.

### Patterns to Follow
- **Module Singleton Realtime Client**: See `src/services/supabase/client.ts:17-26` — Instantiate Supabase browser client once at module level via `getRealtimeClient()` to prevent channel drops during Strict Mode double-mounts.
- **Monotonic Sequence Counter & Stale Ref Guard**: See `src/hooks/useSetlistSync.ts:100-109, 307-333` — Guard async/debounced operations with ref-backed sequence numbers (`sequenceRef`) and latest-value refs (`latestKeyRef`) to discard superseded responses.
- **Ref Mirroring for Subscription Handlers**: See `src/hooks/useSetlistSync.ts:125-127, 493-495` — Mirror reactive state into refs (`validJunctionIdsRef`, `onActiveSongChangeRef`) so channel event callbacks always read fresh state without reconnecting the channel on re-renders.
- **Non-Destructive Snapshot & Revert**: See `src/hooks/useSetlistSync.ts:408-417, 385-388` — Capture baseline state prior to subscribing to leader broadcasts (`stateCheckSnapshot`) and restore on unsubscribe so user customizations are preserved.
- **DOM Mutation for Chord Transposition**: See `src/components/SongViewer/ChordSheetClient.tsx:261-275` — Mutate `.chord-item` innerText directly via container ref instead of re-rendering JSX tree to guarantee zero SSR hydration mismatches.
- **React Compiler Whole-Object Dependencies**: See `src/components/client/GoLiveButton.tsx:197-212` — In Next.js 15 with React Compiler, pass whole object dependencies (e.g. `[sync]`) rather than property paths (`[sync.toggleLive]`) to satisfy compiler memoization rules (BUG-002).
- **Helper Function Declaration Order**: See `src/hooks/useAutoScroll.ts:138-208` — Declare all helper functions and rAF callbacks prior to the `useEffect` hooks that call them (BUG-007).

### Anti-Patterns Flagged
- `src/components/client/AlphabetFilter.tsx` line 93–96: Allocating arrays or object literals inline within component render body when passed to memoized children. Hoist static references to module scope or wrap in `useMemo` (BUG-019).
- `src/hooks/useFontSize.ts` (historical): Calling `setState` inside `useEffect` on mount to read `localStorage`. Always use lazy initializer `useState(() => readValue())` (BUG-001).
- `src/components/client/AutoScrollToolbar.tsx` (historical): Using `useState(() => typeof window !== "undefined")` as a mount guard causing SSR hydration mismatch. Always use `useState(false)` + `useEffect(() => setMounted(true), [])` (BUG-020).
- Multiple Supabase Channels: Never subscribe separate channels for Broadcast and Presence on the same setlist. Multiplex all sync logic on a single channel `setlist_sync:${setlistId}` held in a stable `channelRef`.

### MEMORY.md Notes
- **BUG-001 (UI State)**: Never initialize React state from `localStorage` / `sessionStorage` via `useEffect` + `setState`. Always use lazy initializer: `useState(() => readValue())`.
- **BUG-002 (Architecture / React Compiler)**: Never use object property paths in `useCallback` / `useMemo` dependency arrays (e.g. `[sync.toggleLive]`). Always depend on the whole parent object `[sync]` or a destructured primitive.
- **BUG-005 (Dark Mode)**: Every Artisan Tailwind named utility (`text-brand-*`, `bg-brand-*`, `border-brand-*`) must be explicitly paired with a `dark:` variant because they do not auto-switch with CSS variables.
- **BUG-006 (Tailwind v4 parsing)**: Never write Tailwind arbitrary-value wildcards (e.g. `bg-[var(--brand-*)]`) in comments or markdown as Tailwind scans and tries to compile them as real CSS classes.
- **BUG-007 (React Compiler declaration order)**: Declare helper functions and callbacks before any hook (`useEffect`, `useCallback`, `useMemo`) that references them. JavaScript hoisting is rejected by the React Compiler at build time.
- **BUG-018 (PostgREST date parsing)**: Supabase `timestamptz` returns full ISO 8601 strings; never split on `"-"`. Use `new Date(isoString)` and extract UTC parts (`getUTCFullYear`, `getUTCMonth`, `getUTCDate`).
- **BUG-019 (Architecture / Props & Memo)**: Optional prop overriding hook state: call hook unconditionally and coalesce (`prop ?? hookVal`). Do not allocate arrays/objects inline in render body if passed to memoized children (hoist to module scope or `useMemo`).
- **BUG-020 (SSR Hydration Guard)**: Never use `useState(() => typeof window !== "undefined")` as a mount guard in client components. Always use `useState(false)` + `useEffect(() => setMounted(true), [])`.
