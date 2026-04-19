# Technical Schema — Collaborative Realtime Sync (TASK-021)

## Server Action Contract Table

| UI Action | Server Action / Operation | File | RLS Role | Status | Gap Strategy |
|---|---|---|---|---|---|
| Follow Leader enable: State Check | `getSetlistWithSongs()` | `src/app/actions/setlistActions.ts` | public / authenticated | EXISTS | N/A |
| Key stepper tap while Go Live (debounced 400ms auto-persist) | `updatePerformanceDetails()` | `src/app/actions/setlistActions.ts` | `leader_id = auth.uid()` | EXISTS | N/A |
| Go Live: subscribe to Broadcast channel | `supabase.channel().subscribe()` | `src/hooks/useSetlistSync.ts` (new) | No RLS — client-side `isLeader` guard | MISSING (net-new) | New hook; disable button until hook shipped |
| Director: broadcast `SONG_CHANGE` | `channel.send()` | `src/hooks/useSetlistSync.ts` (new) | No RLS | MISSING (net-new) | Fire-and-forget; silent on send failure |
| Director: broadcast `KEY_CHANGE` | `channel.send()` (after Server Action success) | `src/hooks/useSetlistSync.ts` (new) | No RLS | MISSING (net-new) | Only fires after `updatePerformanceDetails` succeeds |
| Follower: receive `SONG_CHANGE` | Realtime listener → `scrollIntoView` | `src/hooks/useSetlistSync.ts` (new) | No RLS | MISSING (net-new) | Silent skip if element not found |
| Follower: receive `KEY_CHANGE` | Realtime listener → `overrideKeys` Map update | `src/hooks/useSetlistSync.ts` (new) | No RLS | MISSING (net-new) | Silent skip if `junctionId` not in rendered set |
| Unsubscribe (toggle off / unmount) | `supabase.removeChannel(channel)` | `src/hooks/useSetlistSync.ts` (new) | No RLS | MISSING (net-new) | Called in `useEffect` cleanup |

## Summary

- Total operations: 8
- EXISTS (Server Actions, verified in codebase): 2
- MISSING (net-new Realtime infrastructure): 6
- All-MISSING escalation: No — the 2 critical data operations (State Check read + key persist write) both EXIST. The 6 MISSING items are new Realtime wiring with no Server Action gaps.
- DB migrations required: None — `setlists.is_live` and `setlists.active_song_id` are CONFIRMED NOT NEEDED. Go Live and active song state are ephemeral client state only.
- RLS gap (RF-4): Broadcast authority gap accepted and documented. No server-side enforcement possible for Supabase Broadcast. Client-side `isLeader` guard only.
