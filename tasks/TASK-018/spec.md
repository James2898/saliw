# Spec — Stage-Ready Setlist Viewer

## Feature Summary

Build a long-scrolling, stage-ready setlist viewer at `src/app/setlists/[id]/page.tsx`. A Server Component fetches the setlist and all its songs in a single join query (reusing the existing `getSetlistWithSongs` action). Each song is rendered as a named `<section>` with a full chord sheet. A sticky Service Navigator (desktop sidebar, mobile top bar) lists song titles and uses IntersectionObserver to highlight the currently visible song. Each song section includes a per-song transpose control initialized to the setlist's stored `performance_key`. A "Sync to Setlist" button — visible only to the authenticated setlist leader — calls `updatePerformanceDetails` to persist the current transpose state back to the `setlist_songs` row, with a brief success icon and explicit inline error state on failure.

## Acceptance Criteria

1. `src/app/setlists/[id]/page.tsx` is a Server Component (no `'use client'` at file top) that calls `getSetlistWithSongs({ setlist_id: id })` once to fetch all data; no N+1 queries are issued.
2. Unauthenticated requests are redirected to `/login` before any data fetch is attempted.
3. If `getSetlistWithSongs` returns an error or the setlist ID does not resolve to any rows, the page renders a user-facing error card ("Unable to load setlist. Please try again.") without crashing.
4. If the setlist has zero songs, the page renders a user-facing empty state ("No songs in this setlist yet.") rather than a blank layout.
5. Each song in the fetched results is rendered as `<section id="song-{junction_id}">` where `junction_id` is the `setlist_songs.id` UUID, in ascending `order_index` order.
6. The Service Navigator renders the title of each song as a clickable item; clicking any item calls `element.scrollIntoView({ behavior: 'smooth' })` on the corresponding section.
7. The Service Navigator is a sticky Client Component: on viewport widths >= 1024px (lg breakpoint) it appears as a fixed sidebar; on widths < 1024px it appears as a sticky top bar.
8. An IntersectionObserver monitors all `section[id^="song-"]` elements; the navigator item corresponding to the most-visible section is highlighted with `--brand-tan` background.
9. The IntersectionObserver instance is disconnected in the Client Component's cleanup function (i.e., returned from `useEffect`) to prevent memory leaks on unmount.
10. Each song section renders a `ChordSheetClient` (or equivalent) initialized with the song's `performance_key` from `setlist_songs` (not the song's `original_key`) as the initial transpose target.
11. Each song's `ChordSheetClient` is wrapped in `React.memo` to prevent re-renders triggered by IntersectionObserver state changes in the navigator.
12. A "Sync to Setlist" button is rendered inside each song section's controls. It is visible only when the currently authenticated user's `id` equals the setlist's `leader_id`; all other users see no button and no placeholder space.
13. Clicking "Sync to Setlist" captures the current `displayKey` from the `useTranspose` hook and calls `updatePerformanceDetails({ id: junction_id, setlist_id: setlist_id, performance_key: displayKey })` as a Server Action.
14. On success, the sync button's icon switches to a Lucide `Check` icon for 2 seconds, then reverts to the sync icon (Lucide `RefreshCw` or equivalent); no page reload or router refresh is required.
15. On error, an inline error message is displayed adjacent to the sync button (e.g., "Unable to sync. Please try again."); the error does not silently fail and does not block the rest of the page.
16. The sync button is disabled (and shows a loading/spinner state) while a sync request is in-flight to prevent double submission.
17. The Service Navigator uses `--brand-espresso` (or `bg-brand-espresso`) as its background color and `--brand-tan` highlight on the active item, per Artisan palette requirements.
18. All text on Artisan palette backgrounds meets WCAG AA contrast ratio; specifically, `--brand-tan` text is not used on `--brand-cream` backgrounds.
19. `preProcessChords` from `src/utils/musicLogic.ts` is called server-side (in the Server Component) for each song's `content` before passing `processedLines` to the Client chord sheet, preventing SSR hydration mismatches.
20. The page uses `export const dynamic = 'force-dynamic'` (or equivalent) since setlist data is user-specific and must not be statically cached.
21. All `'use client'` components (`ServiceNavigator`, per-song sync controls) are placed in `src/components/client/` per the project's directory convention.
22. No Supabase client is imported or called from any Client Component; all data reads happen in the Server Component and are passed as props.

## Out of Scope

- Creating, editing, or deleting setlists or songs from this page.
- Drag-and-drop reordering of songs within the viewer.
- Realtime sync (WebSocket/Broadcast) — the "Sync" button is a point-in-time Server Action, not a live subscription.
- Pagination or lazy loading of songs — all songs are fetched and rendered in a single pass.
- Sharing or publishing the setlist (is_public flag management).
- Any UI for adding songs to the setlist from this viewer.
- Mobile-specific print/export functionality.
- The `singer` field display — it is stored in `setlist_songs.singer` but rendering/editing it is not part of this task.

## Fallback Behaviors

- **getSetlistWithSongs returns error:** Render a full-page error card with message "Unable to load setlist. Please try again." No navigator is shown. No crash.
- **getSetlistWithSongs returns empty array:** Render the setlist name header with an empty state message: "No songs in this setlist yet." The navigator renders with no items.
- **Profile fetch fails (cannot determine leader):** Default `isLeader` to `false` — the Sync button is hidden. Degraded gracefully, consistent with the pattern in `src/app/library/[id]/page.tsx`.
- **updatePerformanceDetails Server Action returns error:** Display an inline error string adjacent to the sync button. The button returns to its default (unsynced) icon state. No silent failure.
- **Sync button clicked while in-flight:** Button is disabled; no second request is issued.

## Resolved Ambiguities

- **Which Server Action to use for data fetch** → `getSetlistWithSongs` from `src/app/actions/setlistActions.ts` (implemented in TASK-017, returns `{ id, song_id, order_index, performance_key, singer, songs: { id, title, artist, original_key, content } }[]`). Source: `tasks/TASK-017.md` and `src/app/actions/setlistActions.ts`.
- **Initial transpose key for each song** → `performance_key` from `setlist_songs` (not `original_key` from `songs`). The `useTranspose` hook accepts `originalKey` as the key it initializes from; for the setlist viewer, `performance_key` is passed as this prop so the sheet opens at the setlist's stored key. Source: feature description section 3; `src/hooks/useTranspose.ts`.
- **Who is the "owner" of the setlist** → `setlists.leader_id` (not `owner_id`). The setlist must be fetched separately or the join must include `setlist.leader_id` so the page can compare it to `user.id`. Source: `src/types/supabase.ts` (`DbSetlist.leader_id`), `tasks/TASK-017.md` anti-patterns.
- **Setlist header data (name, date)** → The Server Component must also fetch `setlists` row for the given `id` to get `name`, `date`, and `leader_id`. `getSetlistWithSongs` returns `setlist_songs` rows only, not the parent setlist row. A second query (`.from('setlists').select('id, name, date, leader_id').eq('id', id).single()`) is required. Source: `src/app/actions/setlistActions.ts` — `getSetlistWithSongs` does not return `setlists` fields.
- **IntersectionObserver "most visible" logic** → Track the junction_id with the highest `intersectionRatio` among all observed entries. On tie, prefer the entry with the lower `order_index` (topmost on screen). Source: standard IntersectionObserver API behavior; resolved from project description.
- **Sync icon choice** → Use Lucide `RefreshCw` as the default sync icon and Lucide `Check` for the 2-second success state. Both icons are available via the locked `lucide-react` package. Source: feature description; `docs/tech-stack.md` (Icons: Lucide React, Locked).
- **Breakpoint for desktop vs. mobile navigator** → lg breakpoint (1024px), consistent with Tailwind CSS v4 and standard Next.js/Tailwind usage in this project. Source: feature description ("Desktop: sticky sidebar, Mobile: sticky top bar"); resolved to Tailwind `lg:` prefix.
- **`ChordSheetClient` re-use vs. new component** → Reuse the existing `ChordSheetClient` at `src/components/SongViewer/ChordSheetClient.tsx` rather than duplicating. Pass `originalKey={performance_key}` so it initializes at the setlist key. The "Sync" button is an additive wrapper around it, not baked inside `ChordSheetClient` itself (to preserve its existing API). Source: `src/components/SongViewer/ChordSheetClient.tsx`.
- **RLS for setlists SELECT** → `setlists_select_authenticated` policy allows any authenticated user to read all setlists. No additional RLS gap for reading the setlist header. Source: `supabase/migrations/20260415000002_create_setlists_table.sql`.
- **MEMORY.md check** → `MEMORY.md` records one past bug: `useFontSize setState-in-effect bug` (synchronous setState inside `useEffect`). The IntersectionObserver callback must not call React state setters synchronously inside the observer callback in a way that could cause the same pattern. Resolution: use `setState` inside the observer callback (which runs outside React's render cycle) — this is the standard pattern and is safe; the bug was specifically about calling setState during the render phase, not in async callbacks. The new `useEffect` in the Service Navigator must follow the lazy initializer pattern for any initial state derived from DOM measurements.
