# Technical Schema — Saliw V2: Real-time Multi-Device Stage Sync

## Server Action Contract Table

| UI Action | Server Action / Operation | File | RLS Role | Status | Gap Strategy |
|---|---|---|---|---|---|
| Follow Leader enable: Initial State Check | `getSetlistWithSongs()` | `src/app/actions/setlistActions.ts` | `public` / `authenticated` | EXISTS | N/A (EXISTS) |
| Director Key Stepper tap (debounced 400ms auto-persist) | `updatePerformanceDetails()` | `src/app/actions/setlistActions.ts` | `leader_id = auth.uid()` | EXISTS | N/A (EXISTS) |

## Realtime Multiplexed Channel Contract Table (`setlist_sync:${setlistId}`)

| Event / Operation | Channel Topic | Event Name / Type | Direction | Status | Gap Strategy |
|---|---|---|---|---|---|
| Channel Subscription & Session Binding | `setlist_sync:${setlistId}` | `channel.subscribe()` | Bidirectional (Leader & Follower) | EXISTS | N/A (EXISTS in `useSetlistSync.ts`; extend config with presence key) |
| Stage Device Presence Tracking | `setlist_sync:${setlistId}` | `presence` (`sync`, `join`, `leave`) | Bidirectional | MISSING | Net-new: add `channel.track()` and presence event listeners; display device count badge; fallback to 1 device if tracking fails |
| Song Navigation Broadcast | `setlist_sync:${setlistId}` | `SONG_CHANGE` | Director -> Followers | EXISTS | N/A (EXISTS in `realtimeEvents.ts` & `useSetlistSync.ts`) |
| Key Transposition Broadcast | `setlist_sync:${setlistId}` | `KEY_CHANGE` | Director -> Followers | EXISTS | N/A (EXISTS in `realtimeEvents.ts` & `useSetlistSync.ts`; sent only after DB persist) |
| Section Jump Navigation Broadcast | `setlist_sync:${setlistId}` | `SECTION_CHANGE` | Director -> Followers | MISSING | Net-new: add `SECTION_CHANGE` to `realtimeEvents.ts`; scroll follower to section DOM id; fallback to song root if section missing |
| Teleprompter Auto-Scroll Sync | `setlist_sync:${setlistId}` | `SCROLL_SYNC` | Director -> Followers | MISSING | Net-new: add `SCROLL_SYNC` to `realtimeEvents.ts`; sync speed and play state to `useAutoScroll`; followers keep manual control if sync disabled |
| Stage Channel Unsubscribe & Untrack | `setlist_sync:${setlistId}` | `channel.untrack()` + `removeChannel()` | Bidirectional | EXISTS | N/A (EXISTS in `useSetlistSync.ts`; add `channel.untrack()` before removal) |

## Summary

- Total Operations: 9
- Server Actions: 2 (EXISTS: 2, MISSING: 0)
- Realtime Infrastructure Operations: 7 (EXISTS: 4, MISSING: 3)
- All-MISSING escalation: No — 100% of required backend persistence operations (State Check read + key persist write) EXIST. All 3 MISSING items are ephemeral Realtime broadcast/presence extensions with defined graceful degradation fallbacks.
- Single Multiplexed Topic Requirement: All stage sync logic (Broadcast + Presence) MUST share the single channel topic `setlist_sync:${setlistId}` via `channelRef`. Never instantiate separate channels for presence and broadcast.
- DB Migrations Required: None — Stage session presence, active song index, section jumps, and teleprompter scroll positions are ephemeral client/realtime states.
