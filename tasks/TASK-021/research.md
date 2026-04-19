# Research — Collaborative Realtime Sync: Go Live & Catch Up Logic

## Open Questions

- None. All five blocking questions have been answered by the user and incorporated into the spec.

## Resolved From Context

- `isLeader` vs `music_director` for Go Live → Resolved from `src/app/setlists/[id]/page.tsx` and `supabase/migrations/20260415000000_create_profiles_table.sql`: `isLeader = user.id === setlist.leader_id` is the correct gate. All users default to `music_director` role, making role-based gating non-functional.
- `active_song_id` DB persistence → No `active_song_id` column exists in `setlists` or `setlist_songs`. Active song is ephemeral broadcast state only. State Check does not scroll the follower to the Director's current song — only future `SONG_CHANGE` broadcasts trigger scrolling.
- Broadcast channel RLS → Supabase Broadcast does not go through PostgreSQL RLS. Client-side `isLeader` guard only. Risk acknowledged (RF-4) and accepted per feature request constraints.
- `useTranspose` external override → `useTranspose` has no external key prop. `ChordSheetClient` extended with optional `externalKey?: string` prop. A `useEffect` calls `setTargetKey(externalKey)` when `externalKey` changes and is defined and differs from `displayKey`.
- Supabase browser client → `src/services/supabase/client.ts` confirmed to exist via `createBrowserClient` from `@supabase/ssr`. No new file needed.
- `junctionId` vs `song_id` for broadcast payload → Resolved from `ServiceNavigator.tsx` and `SetlistSongSection.tsx`: active song tracking uses `junctionId` (setlist_songs.id). Broadcast payload uses `junctionId` consistently.
- Singer column → `singer` column in `setlist_songs` is unrelated to this feature.
- `KEY_CHANGE` scope → Per-song events with `{ junctionId: string; performanceKey: string }` payload, not a global key state object.
- Debounce assessment (OQ-3 follow-up) → 400ms debounce is required and specified. Rapid semitone stepping (5–10 taps/second is realistic) would otherwise issue one Server Action per tap, creating out-of-order resolution risk (RF-1). 400ms collapses rapid sequences while remaining imperceptible for deliberate single taps. Debounce is per-song (per `junctionId`), not global.
- Stale closure risk in debounce (RF-5) → Documented. Implementation must read `displayKey` from a `useRef` inside the debounced callback, not from a closure variable.

## Resolved From User Answers

- OQ-1 LIVE badge color → `bg-red-600 text-white`. WCAG AA contrast 5.9:1 — passes.
- OQ-2 Follow Leader visibility → Gate on `!isLeader` (any authenticated non-leader). No role check.
- OQ-3 Key change broadcast trigger → Option A: auto per-tap with 400ms debounce per `junctionId`.
- OQ-4 Follow Leader toggle placement → Option A: `ServiceNavigator` bar, setlist-level single toggle.
- OQ-5 Follower key revert on disable → Option A: revert to State Check snapshot (`performance_key` values fetched when Follow Leader was first enabled).
