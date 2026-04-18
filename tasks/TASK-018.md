# TASK-018 — Stage-Ready Setlist Viewer

- **Tier:** 2
- **Date Created:** 2026-04-18
- **Status:** In Progress

---

## Feature Summary

Build a long-scrolling, stage-ready setlist viewer at `src/app/setlists/[id]/page.tsx`. A Server Component fetches the setlist and all its songs in a single join query (reusing the existing `getSetlistWithSongs` action). Each song is rendered as a named `<section>` with a full chord sheet. A sticky Service Navigator (desktop sidebar, mobile top bar) lists song titles and uses IntersectionObserver to highlight the currently visible song. Each song section includes a per-song transpose control initialized to the setlist's stored `performance_key`. A "Sync to Setlist" button — visible only to the authenticated setlist leader — calls `updatePerformanceDetails` to persist the current transpose state back to the `setlist_songs` row, with a brief success icon and explicit inline error state on failure.

---

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

---

## Out of Scope

- Creating, editing, or deleting setlists or songs from this page.
- Drag-and-drop reordering of songs within the viewer.
- Realtime sync (WebSocket/Broadcast) — the "Sync" button is a point-in-time Server Action, not a live subscription.
- Pagination or lazy loading of songs — all songs are fetched and rendered in a single pass.
- Sharing or publishing the setlist (is_public flag management).
- Any UI for adding songs to the setlist from this viewer.
- Mobile-specific print/export functionality.
- The `singer` field display — it is stored in `setlist_songs.singer` but rendering/editing it is not part of this task.

---

## Relevant Files

| File | Purpose |
|------|---------|
| `src/app/setlists/[id]/page.tsx` | **NEW** — Server Component page to create; primary deliverable |
| `src/components/client/ServiceNavigator.tsx` | **NEW** — Sticky navigator with IntersectionObserver scroll-spy |
| `src/components/client/SetlistSongSection.tsx` | **NEW** — Per-song wrapper; owns Sync button state and `useTranspose` access |
| `src/app/actions/setlistActions.ts` | **MODIFY** — Add `getSetlistById` Server Action (or inline query in page); `getSetlistWithSongs` (line 311) and `updatePerformanceDetails` (line 250) already exist |
| `src/components/SongViewer/ChordSheetClient.tsx` | Existing interactive chord sheet; reused as-is; props: `{ processedLines: ProcessedLine[], originalKey: string }` |
| `src/hooks/useTranspose.ts` | Existing hook; exposes `displayKey`, `setTargetKey(key)`, semitone offset |
| `src/hooks/useFontSize.ts` | Used inside `ChordSheetClient`; must use lazy `useState` initializer — do not modify |
| `src/utils/musicLogic.ts` | `preProcessChords(content)` must be called server-side per song |
| `src/services/supabase/server.ts` | `async createClient()` — use for all server-side Supabase access |
| `src/types/supabase.ts` | `DbSetlist` (`leader_id` field), `DbSetlistSong` (`id, setlist_id, song_id, order_index, performance_key, singer`) |
| `src/types/Setlist.ts` | Frontend `Setlist` type; ownership field is `leader_id: string` |
| `src/app/library/[id]/page.tsx` | Gold standard pattern: auth guard, SSR chord pre-processing, client island |
| `src/app/setlists/page.tsx` | Auth redirect pattern to replicate (lines 10–17); anti-pattern source — do not copy inline styles |
| `src/styles/globals.css` | Brand CSS variables; chord sheet classes (`.chord-display`, `.chord-item`, `.chord-row`) |
| `src/components/server/card.tsx` | Reusable server `Card` component with padding variants |

---

## Technical Schema

### Endpoint Contract Table

| UI Action | Method | Server Action / Query | Status | Gap Strategy |
|-----------|--------|-----------------------|--------|--------------|
| Page load — fetch setlist header (`name`, `date`, `leader_id`) | Supabase query | No named action — `setlists` table direct query | **MISSING** | Add inline query in Server Component OR add `getSetlistById({ id })` to `setlistActions.ts` |
| Page load — fetch all songs | Server Action | `getSetlistWithSongs({ setlist_id })` in `setlistActions.ts` line 311 | EXISTS | N/A |
| Redirect unauthenticated users | Server-side auth | `supabase.auth.getUser()` via `createClient()` | EXISTS | N/A |
| Check if user is setlist leader | Prop comparison | `user.id === setlist.leader_id` (server-computed, prop-drilled) | EXISTS (pattern) | N/A |
| Navigator: click → scroll to section | CLIENT-ONLY | `element.scrollIntoView({ behavior: 'smooth' })` | CLIENT-ONLY | N/A |
| IntersectionObserver: highlight active song | CLIENT-ONLY | Browser API | CLIENT-ONLY | N/A |
| Chord sheet initializes at `performance_key` | Props-only | `performance_key` passed as `originalKey` prop | EXISTS (pattern) | N/A |
| "Sync to Setlist": persist current key | Server Action | `updatePerformanceDetails({ id, setlist_id, performance_key })` in `setlistActions.ts` line 250 | EXISTS | N/A |

### Setlist Header Query (MISSING — must be implemented)

```ts
const { data: setlist, error: setlistError } = await supabase
  .from('setlists')
  .select('id, name, date, leader_id, is_public')
  .eq('id', params.id)
  .single()
```

- Error code `PGRST116` (row not found): render full-page error card "Unable to load setlist. Please try again."
- Fallback: if `leader_id` cannot be determined, default `isLeader` to `false` — Sync button hidden for all users.

### `getSetlistWithSongs` Response Shape

```ts
// src/app/actions/setlistActions.ts line 311
// Input:
{ setlist_id: string }

// Success output:
{
  data: Array<{
    id: string             // setlist_songs.id — use as junction_id and section ID suffix
    song_id: string
    order_index: number    // sort ascending
    performance_key: string // pass as `originalKey` prop to ChordSheetClient
    singer: string | null
    songs: {
      id: string
      title: string
      artist: string
      original_key: string
      content: string      // pass through preProcessChords() server-side
    }
  }> | null
  error: string | null
}
```

### `updatePerformanceDetails` Signature

```ts
// src/app/actions/setlistActions.ts line 250
async function updatePerformanceDetails(
  input: { id: string; setlist_id: string; performance_key?: string; singer?: string | null }
): Promise<{ data: DbSetlistSong | null; error: string | null }>

// Call site (Sync button):
updatePerformanceDetails({
  id: junction_id,         // setlist_songs.id
  setlist_id: setlist_id,  // parent setlist UUID (required for RLS scoping)
  performance_key: displayKey
})
```

Error codes from this action:
| Code | `error` value | UI Behavior |
|------|---------------|-------------|
| `42501` | `'You do not have permission to modify this setlist.'` | Inline error adjacent to Sync button |
| `PGRST116` | `'Setlist song entry not found.'` | Inline error adjacent to Sync button |
| Unexpected | `'Unable to update performance details. Please try again.'` | Inline error adjacent to Sync button |

### `ChordSheetClient` Props Interface (existing — do not change)

```ts
interface ChordSheetClientProps {
  processedLines: ProcessedLine[]  // computed server-side via preProcessChords()
  originalKey: string              // pass performance_key here (not songs.original_key)
}
```

### RLS Verification

| Operation | Table | Policy | Covers TASK-018? |
|-----------|-------|--------|-----------------|
| SELECT setlists (header fetch) | `setlists` | `setlists_select_authenticated` | YES — any authenticated user |
| SELECT setlist_songs + songs join | `setlist_songs` | `setlist_songs_select_authenticated` | YES — any authenticated user |
| UPDATE setlist_songs (Sync button) | `setlist_songs` | `setlist_songs_update_leader` — only `setlists.leader_id = auth.uid()` | YES — non-leader gets `42501` handled by inline error |

### Recommended Component Architecture

| Component | Type | Location |
|-----------|------|----------|
| `setlists/[id]/page.tsx` | Server Component | `src/app/setlists/[id]/page.tsx` |
| `ServiceNavigator` | Client Component | `src/components/client/ServiceNavigator.tsx` |
| `SetlistSongSection` | Client Component | `src/components/client/SetlistSongSection.tsx` |
| `ChordSheetClient` (reuse) | Client Component | `src/components/SongViewer/ChordSheetClient.tsx` |

---

## Planning Artifacts

| Artifact | Path | Description |
|----------|------|-------------|
| Feature Specification | `tasks/TASK-018/spec.md` | Acceptance criteria + scope |
| Context Bundle | `tasks/TASK-018/context.md` | Reusable components + patterns |
| Research Notes | `tasks/TASK-018/research.md` | Open questions + decisions |
| Technical Schema | `tasks/TASK-018/schema.md` | Endpoint contract table (Tier 2) |
| Endpoint Contracts | `tasks/TASK-018/contracts/endpoints.md` | Full contract detail (Tier 2) |

---

## Implementation Notes

- Read `docs/coding-guidelines.md` before writing any code.
- Read `docs/tech-stack.md` before choosing any library or package.
- Read `docs/structure.md` before creating any new file or directory.

### Base Branch and Feature Branch

- Base branch: `develop`
- Feature branch: `feature/TASK-018-setlist-viewer`

### Files to Create

1. `src/app/setlists/[id]/page.tsx` — Server Component; the dynamic route directory does not exist yet and must be created.
2. `src/components/client/ServiceNavigator.tsx` — Sticky navigator Client Component.
3. `src/components/client/SetlistSongSection.tsx` — Per-song wrapper Client Component with Sync button.

### Files to Modify

1. `src/app/actions/setlistActions.ts` — Add a `getSetlistById({ id: string })` Server Action (or add an inline query in the page). The function must return `{ data: { id, name, date, leader_id, is_public } | null, error: string | null }`.

### Ordered Implementation Steps

1. **Create the feature branch** from `develop`:
   ```
   git checkout develop && git pull && git checkout -b feature/TASK-018-setlist-viewer
   ```

2. **Add `getSetlistById` to `setlistActions.ts`** (or write the inline query directly in step 4):
   - Input: `{ id: string }`
   - Query: `supabase.from('setlists').select('id, name, date, leader_id, is_public').eq('id', id).single()`
   - Return: `{ data: { id, name, date, leader_id, is_public } | null, error: string | null }`
   - On `PGRST116`: return `{ data: null, error: 'Unable to load setlist. Please try again.' }`

3. **Create `src/app/setlists/[id]/` directory** and add `page.tsx` as a Server Component:
   - Add `export const dynamic = 'force-dynamic'` at file top.
   - Import `createClient` from `@/services/supabase/server`.
   - Import `getSetlistWithSongs`, `getSetlistById` (or inline query) from `@/app/actions/setlistActions`.
   - Import `preProcessChords` from `@/utils/musicLogic`.
   - **Auth guard first** (before any data fetch): call `supabase.auth.getUser()`. If `user` is null, call `redirect('/login')`.
   - Fetch setlist header: call `getSetlistById({ id: params.id })`. On error, render full-page error card.
   - Fetch songs: call `getSetlistWithSongs({ setlist_id: params.id })`. On error, render full-page error card.
   - Compute `isLeader = user.id === setlist.leader_id`.
   - Sort songs by `order_index` ascending.
   - For each song, call `preProcessChords(song.songs.content)` to produce `processedLines`.
   - Render page layout: setlist name + date header, `<ServiceNavigator>` with song titles, then one `<SetlistSongSection>` per song.
   - Pass to `ServiceNavigator`: array of `{ junctionId: string, title: string }` (one per song, in order).
   - Pass to each `SetlistSongSection`: `junctionId`, `setlistId`, `title`, `artist`, `processedLines`, `performanceKey`, `isLeader`.
   - Empty state: if songs array is empty after fetch, render header + "No songs in this setlist yet."

4. **Create `src/components/client/ServiceNavigator.tsx`**:
   - Mark `'use client'` at top.
   - Props: `songs: Array<{ junctionId: string, title: string }>`.
   - Layout: sticky sidebar on `lg:` (Tailwind `lg:fixed lg:inset-y-0 lg:w-64`); sticky top bar on `< lg` (`sticky top-0`).
   - Background: `--brand-espresso` (use `bg-[var(--brand-espresso)]` or equivalent Tailwind v4 class).
   - Render each song title as a `<button>` that calls `document.getElementById('song-' + junctionId)?.scrollIntoView({ behavior: 'smooth' })`.
   - Track `activeSongId` state (junctionId of the most-visible section).
   - In a `useEffect`, create an `IntersectionObserver` that observes all `section[id^="song-"]` elements. In the callback, track the entry with the highest `intersectionRatio`; on tie, prefer lower DOM order (which corresponds to lower `order_index`). Call `setActiveSongId(winningJunctionId)`.
   - **Return the observer's `disconnect()` call from the `useEffect` cleanup function** — this is required by AC-9 and prevents memory leaks.
   - Active navigator item: highlight with `--brand-tan` background when `song.junctionId === activeSongId`.
   - Do NOT import or call Supabase anywhere in this file.

5. **Create `src/components/client/SetlistSongSection.tsx`**:
   - Mark `'use client'` at top.
   - Props: `{ junctionId: string, setlistId: string, title: string, artist: string, processedLines: ProcessedLine[], performanceKey: string, isLeader: boolean }`.
   - Render `<section id={'song-' + junctionId}>` as the root element.
   - Render song title and artist as a header within the section.
   - **Architectural decision for `displayKey` access:** `ChordSheetClient` owns `useTranspose` internally and does not expose `displayKey` to the parent. Choose one of:
     - **(Recommended — option a):** Add optional `onKeyChange?: (key: string) => void` prop to `ChordSheetClient`. When `useTranspose`'s `displayKey` changes, call `onKeyChange(displayKey)`. `SetlistSongSection` tracks the current key in its own state via this callback. This is the least invasive change.
     - **(Option b):** `SetlistSongSection` owns `useTranspose(performanceKey)` directly. It reads `displayKey` for the Sync call and passes computed props into a slimmer chord display. This avoids modifying `ChordSheetClient` but requires more refactoring.
   - Wrap `<ChordSheetClient>` in `React.memo` (wrap at the call site, not inside the component file). Pass `originalKey={performanceKey}` and `processedLines={processedLines}`.
   - Sync button (rendered only when `isLeader === true`):
     - Default icon: Lucide `RefreshCw`.
     - Disabled + loading state while in-flight (use `useTransition` or local `isPending` state).
     - On click: call `updatePerformanceDetails({ id: junctionId, setlist_id: setlistId, performance_key: displayKey })`.
     - On success (`error === null`): switch icon to Lucide `Check` for 2 seconds via `setTimeout`, then revert to `RefreshCw`. Clear any error state.
     - On failure (`error !== null`): render inline error string adjacent to button (e.g., `<p>{error}</p>`). Do not auto-dismiss.
   - Do NOT import or call Supabase anywhere in this file.

6. **Styling — Artisan palette compliance**:
   - Navigator background: `--brand-espresso` (`#2d1f1b`).
   - Active navigator item highlight: `--brand-tan` (`#bc8e5c`).
   - Do NOT use `--brand-tan` as text color on `--brand-cream` background — contrast is below WCAG AA.
   - Use Tailwind utility classes for all layout and spacing. Do NOT use inline `style` props (see Anti-Patterns).
   - Chord sheet classes from `globals.css`: `.chord-display`, `.chord-item`, `.chord-row`, `.section-title`, `.chords-hidden` — use as-is, do not redefine.

7. **Verify `preProcessChords` is called only in the Server Component** — confirm no `preProcessChords` import exists in any `'use client'` file.

8. **Verify no Supabase import in any Client Component** — `ServiceNavigator.tsx` and `SetlistSongSection.tsx` must import from `@/app/actions/` (Server Actions) only, not from `@/services/supabase/`.

### Fallback Behaviors

| Condition | Behavior |
|-----------|----------|
| `getSetlistWithSongs` returns error | Render full-page error card: "Unable to load setlist. Please try again." No navigator shown. No crash. |
| `getSetlistWithSongs` returns empty array | Render setlist name header + "No songs in this setlist yet." Navigator renders with no items. |
| Setlist header fetch fails (`PGRST116` or other) | Render full-page error card. Default `isLeader` to `false`. |
| Profile/leader check fails | Default `isLeader` to `false` — Sync button hidden. Degrade gracefully per `src/app/library/[id]/page.tsx` pattern. |
| `updatePerformanceDetails` returns error | Show inline error adjacent to Sync button. Button returns to `RefreshCw` icon. No silent failure. |
| Sync button clicked while in-flight | Button disabled; no second request issued. |

### Patterns to Follow

- **Auth guard pattern:** `src/app/setlists/page.tsx` lines 10–17 — `supabase.auth.getUser()`, if `!user` call `redirect('/login')`.
- **SSR chord pre-processing:** `src/app/library/[id]/page.tsx` line 112 — call `preProcessChords(song.content)` in the Server Component, pass `processedLines` as prop.
- **Tailwind class composition:** Use array join `[...classNames].join(' ')` — no `clsx`/`cn` utility is in use.
- **Dark mode:** Class-based via `.dark` ancestor. Variant: `dark:text-brand-cream`, `dark:bg-brand-espresso`.
- **`force-dynamic` export:** `export const dynamic = 'force-dynamic'` at page top — required for all auth-dependent routes.

### Supabase Client Usage

- Server Components and Server Actions: `import { createClient } from '@/services/supabase/server'` (async, `@supabase/ssr`)
- Client Components: no Supabase import at all — pass all data as props from the Server Component.
- Never use the browser client (`@/services/supabase/client`) in Server Components or Server Actions.

---

## Amendments (from Context Bundle)

> Added by `@task-logger` after reconciling `spec.md` against `context.md`. These criteria were not in the original spec but are required based on anti-patterns or MEMORY.md notes found during codebase exploration.

- **[AC-23] No inline style props in any new file.** `src/app/setlists/page.tsx` (lines 23–51) uses inline `style={{ }}` objects for layout and typography — this violates the CSS-first Tailwind v4 approach used everywhere else in the codebase. `src/app/setlists/[id]/page.tsx`, `ServiceNavigator.tsx`, and `SetlistSongSection.tsx` must use only Tailwind utility classes and CSS variables for all styling. Source: `tasks/TASK-018/context.md` → Anti-Patterns Flagged.

- **[AC-24] Any new React hook that reads from `localStorage` or DOM on initialization must use the lazy `useState` initializer pattern.** Pass the reader function reference — not its return value — to `useState`: `useState<T>(readStoredValue)` not `useState(readStoredValue())`. The existing `useFontSize` bug (Vercel build error from synchronous `setState` inside `useEffect` render phase) must not be regressed. This applies to any `useEffect` in `ServiceNavigator` that initializes state from a DOM measurement. Source: `tasks/TASK-018/context.md` → MEMORY.md Notes; global MEMORY.md entry `useFontSize setState-in-effect bug`.

---

## Resolution

- **Completed:** 2026-04-18
- **Branch:** `feature/TASK-018-setlist-viewer`
- **Base branch:** `develop`
- **Files changed:**
  - `src/app/setlists/[id]/page.tsx` — NEW: Server Component page; auth guard, setlist header + songs fetch, SSR chord pre-processing, leader check, passes all data as props to client islands
  - `src/components/client/ServiceNavigator.tsx` — NEW: Sticky navigator with IntersectionObserver scroll-spy; fixed sidebar on lg+, sticky top bar on mobile; Artisan espresso/tan palette; observer disconnected in cleanup
  - `src/components/client/SetlistSongSection.tsx` — NEW: Per-song section wrapper; owns Sync button state via useTransition; tracks displayKey via onKeyChange callback; ChordSheetClient wrapped in React.memo
  - `src/app/actions/setlistActions.ts` — MODIFIED: Added `getSetlistById({ id })` Server Action returning `{ data: { id, name, date, leader_id, is_public } | null, error: string | null }`
  - `src/components/SongViewer/ChordSheetClient.tsx` — MODIFIED: Added optional `onKeyChange?: (key: string) => void` prop; fires via useEffect whenever `displayKey` changes; backward-compatible (existing usages not affected)
- **Notes:**
  - `ChordSheetClient` modified with an optional `onKeyChange` callback (recommended Option a from the spec). This is backward-compatible — all existing usages without the prop are unaffected.
  - `SetlistSongSection` uses `useTransition` (not local `isPending` boolean) for the in-flight state, which integrates with React's concurrent model and prevents double submissions cleanly.
  - `onKeyChange` is only passed to `ChordSheetClient` when `isLeader === true`, so non-leader renders don't incur the setState overhead on every key change.
  - The `scroll-mt-16` class on each section ensures the sticky mobile top bar does not overlap the section heading when the navigator scrolls to it; `lg:scroll-mt-0` clears it on desktop where the sidebar is fixed.
  - TypeScript (`tsc --noEmit`) passes with zero errors after all changes.
