# Context Bundle — Collaborative Realtime Sync ('Go Live' & 'Catch Up')

## Relevant Files

| File | Why It's Relevant |
|------|------------------|
| `/Users/adish/projects/saliw/src/app/setlists/[id]/page.tsx` | SetlistViewer Server Component — fetches setlist + songs, computes `isLeader`, passes `performanceKey` down |
| `/Users/adish/projects/saliw/src/components/client/SetlistSongSection.tsx` | Per-song client island — holds `currentKey` state, calls `updatePerformanceDetails`, renders Sync button |
| `/Users/adish/projects/saliw/src/components/SongViewer/ChordSheetClient.tsx` | Chord sheet client island — owns `useTranspose`, lifts `displayKey` via `onKeyChange` callback |
| `/Users/adish/projects/saliw/src/hooks/useTranspose.ts` | Transposition state hook — `semitoneOffset`, `displayKey`, `setTargetKey`, `reset` |
| `/Users/adish/projects/saliw/src/hooks/useFontSize.ts` | Font size hook — pattern for SSR-safe lazy `useState` initializer (MEMORY.md bug applies here) |
| `/Users/adish/projects/saliw/src/app/actions/setlistActions.ts` | All setlist Server Actions — `updatePerformanceDetails`, `getSetlistWithSongs`, `getSetlistById` |
| `/Users/adish/projects/saliw/src/services/supabase/client.ts` | Browser Supabase client — `createBrowserClient` from `@supabase/ssr`; required for Realtime subscriptions |
| `/Users/adish/projects/saliw/src/services/supabase/server.ts` | Server Supabase client — `createServerClient` from `@supabase/ssr`; used in all Server Actions |
| `/Users/adish/projects/saliw/src/components/client/ServiceNavigator.tsx` | IntersectionObserver pattern — `activeSongId` state, cleanup on unmount, active-item toggle styling |
| `/Users/adish/projects/saliw/src/components/client/navbar.tsx` | Auth state subscription pattern — `supabase.auth.onAuthStateChange`, `subscription.unsubscribe()` cleanup |
| `/Users/adish/projects/saliw/src/types/supabase.ts` | DB types — `DbSetlist`, `DbSetlistSong` (note: no `active_song_id` or `is_live` columns exist yet) |
| `/Users/adish/projects/saliw/supabase/migrations/20260415000002_create_setlists_table.sql` | `setlists` table schema + RLS — no `active_song_id` or `is_live` column; new migration required |
| `/Users/adish/projects/saliw/supabase/migrations/20260415000003_create_setlist_songs_table.sql` | `setlist_songs` schema + RLS — current leader-only UPDATE policy (relevant for Catch Up writes) |
| `/Users/adish/projects/saliw/supabase/migrations/20260418000002_allow_public_read_setlists.sql` | Public read policy — `is_public = true OR authenticated`; Realtime SELECT for followers must match |
| `/Users/adish/projects/saliw/src/styles/globals.css` | Artisan CSS tokens, toggle/badge CSS, dark mode variant declaration |
| `/Users/adish/projects/saliw/docs/coding-guidelines.md` | Artisan Palette hex values, Tailwind v4 conventions, RLS/SSR rules |

---

## Reuse Candidates

- `/Users/adish/projects/saliw/src/services/supabase/client.ts` — `createClient()` from `@supabase/ssr` is the correct client for Realtime subscriptions in `'use client'` components. Import and call inside a `useEffect` (same pattern as navbar auth subscription).
- `/Users/adish/projects/saliw/src/components/client/ServiceNavigator.tsx` — IntersectionObserver with `useEffect` cleanup on unmount is the established pattern for ephemeral client subscriptions. Apply the same `return () => { channel.unsubscribe() }` idiom for Supabase Realtime channels.
- `/Users/adish/projects/saliw/src/hooks/useTranspose.ts` — `setTargetKey(key: string)` method can be called programmatically to snap a follower's chord sheet to the leader's broadcast `performance_key` in the Catch Up flow.
- `/Users/adish/projects/saliw/src/components/client/SetlistSongSection.tsx` — `handleSync` / `useTransition` pattern for leader-side Server Action calls. The same optimistic pattern applies for leader broadcasting `active_song_id` and `performance_key` updates.
- `/Users/adish/projects/saliw/src/app/actions/setlistActions.ts` — `updatePerformanceDetails()` already writes `performance_key` to `setlist_songs`. Extend or call from a new `goLiveAction` / `updateActiveSongAction` rather than writing a new query from scratch.
- Active-item toggle styling in `ServiceNavigator.tsx` — `bg-brand-tan text-brand-espresso font-semibold` (active) vs `text-brand-cream hover:bg-brand-espresso/60` (inactive). Reuse this pattern for "Go Live" status badge active/inactive states.
- `SetlistSongSection.tsx` button pattern — `useTransition` + `isPending` + `syncSuccess` + `syncError` tri-state feedback. Reuse for "Go Live" / "Stop Live" button state management.

---

## Patterns to Follow

- **Server Action mutation pattern:** See `/Users/adish/projects/saliw/src/app/actions/setlistActions.ts` — every action: (1) creates server client, (2) gets user, (3) validates inputs, (4) calls Supabase, (5) maps error codes to user-facing strings. No silent swallowing.
- **Role check pattern (music_director):** See `/Users/adish/projects/saliw/src/app/setlists/page.tsx` lines 49–62 — role is fetched from `profiles` table via `profile?.role === 'music_director'`. There is no `useAuth` hook; role is resolved server-side and passed as a prop (`isLeader`, `isMusicDirector`). New Realtime components must receive `isLeader` as a prop from the Server Component parent, not fetch role client-side.
- **Supabase client in Client Components:** See `/Users/adish/projects/saliw/src/components/client/navbar.tsx` lines 68–98 — `createClient()` called inside `useEffect`, subscription stored and cleaned up via `subscription.unsubscribe()`. This is the canonical pattern for any Realtime subscription.
- **Artisan toggle active/inactive:** See `ChordSheetClient.tsx` — `toggleActiveClass` / `toggleInactiveClass` string constants defined at module scope to avoid per-render allocations. Follow this for Go Live toggle.
- **Tailwind v4 class composition:** Arrays of class strings joined with `.join(' ')` — never template literals with conditionals. See `SetlistSongSection.tsx` button className array.
- **`useTransition` for async Server Actions:** See `SetlistSongSection.tsx` lines 45–70 — `isPending`, `syncSuccess`, `syncError` state trio with `startTransition(async () => { ... })`. Reuse exactly for leader Go Live action calls.
- **DB type extension pattern:** See `supabase/migrations/20260418000001_add_singer_to_setlist_songs.sql` + `DbSetlistSong` in `types/supabase.ts` — new columns are added via a new migration file and the type is updated manually. Follow for `active_song_id`/`is_live` additions.

---

## Anti-Patterns Flagged

- `/Users/adish/projects/saliw/src/app/setlists/[id]/page.tsx` line 86: `isLeader` is computed as `user.id === setlist.leader_id` — this is **not** a `music_director` role check. The setlist leader can be any authenticated user. Do not conflate `isLeader` with `isMusicDirector` in the Go Live implementation; the Go Live control is for the setlist leader specifically (not music_director role in general).
- `/Users/adish/projects/saliw/src/components/client/navbar.tsx` line 79: Direct `.from("profiles").select("full_name")` Supabase call inside a Client Component's `useEffect` — the coding guidelines (line 99) flag this as a violation: "Client Components must not call Supabase directly unless using Realtime subscriptions." The navbar pre-dates this rule. Do not replicate this pattern; pass role as a prop from the Server Component instead.
- No `useAuth` hook exists in this codebase. Do not create one that calls Supabase client-side for role resolution — the established pattern is server-side role fetch passed as prop.

---

## Schema Gaps (MISSING columns — new migrations required)

- `setlists` table: **NO** `is_live` (boolean) column. Required for Go Live state.
- `setlists` table: **NO** `active_song_id` (uuid, FK to `setlist_songs.id`) column. Required for broadcasting current song to followers.
- Supabase Realtime: **NO** existing channel or subscription anywhere in the codebase. This is a net-new capability.
- `DbSetlist` type in `src/types/supabase.ts`: Must be extended with `is_live: boolean` and `active_song_id: string | null` after migrations.

---

## Existing Realtime Subscription Patterns

**None.** Grep for `supabase.channel`, `.subscribe()`, `RealtimeChannel`, and `REALTIME` returned zero matches across all source files. This feature introduces the first Supabase Realtime usage in the project.

The closest analog is the auth state subscription in `navbar.tsx` (lines 68–98) using `supabase.auth.onAuthStateChange` — the cleanup idiom (`subscription.unsubscribe()`) translates directly to `channel.unsubscribe()` for Realtime channels.

---

## Highest TASK-NNN

**TASK-020** is the highest existing task number. The next task should be assigned **TASK-021**.

---

## MEMORY.md Notes

- Project-level `/Users/adish/projects/saliw/MEMORY.md` does **not exist** (file not found).
- Global MEMORY.md (auto-memory) records one relevant bug: **`useFontSize` setState-in-effect bug** — Vercel build error caused by synchronous `setState` inside `useEffect`; fixed with lazy `useState` initializer. This is directly relevant: any new hook that initializes from an async Realtime payload (e.g., seeding `activeSongId` or `currentKey` from the leader's broadcast on mount) must use a lazy initializer or set state only inside an effect — never synchronously during render.
