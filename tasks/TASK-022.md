# TASK-022 — SetlistBuilder — Drag-and-Drop Setlist Composition UI

- **Tier:** 2
- **Date Created:** 2026-04-23
- **Status:** In Progress

---

## Feature Summary

The SetlistBuilder is a music-director-only orchestration interface mounted at `src/app/setlists/[id]/edit/page.tsx`. It lets a Music Director compose a setlist by searching the song library, adding or removing songs, and reordering them via drag-and-drop. All mutations (add, remove, reorder) are applied immediately to the database via existing Server Actions — there is no local queue. A "Save Order" button is shown only when the local song sequence differs from the last-persisted sequence, allowing the Music Director to commit drag-and-drop reordering in one batch call to `updateSetlistSongOrder`. Non-directors are redirected to the read-only viewer (`/setlists/[id]`). The interface follows the Artisan Palette and WCAG AA contrast rules established in the codebase.

---

## Acceptance Criteria

### Route & Access

1. The edit route exists at `src/app/setlists/[id]/edit/page.tsx` as an async Server Component.
2. If the current user is not authenticated, the page redirects to `/login` using `redirect()` from `next/navigation`.
3. If the current user is authenticated but does not have `role = 'music_director'` in the `profiles` table, the page redirects to `/setlists/[id]` (the read-only viewer).
4. If the current user is a Music Director but is not the `leader_id` of this setlist, they are still granted access (consistent with the existing viewer pattern: `isLeader = isMusicDirector`).
5. If `getSetlistById` returns an error or null, the page renders an inline error card (identical pattern to the viewer's error fallback) and does not render the builder.

### Component Tree

6. The Server Component (`edit/page.tsx`) performs all data fetching: auth check, role check, `getSetlistById`, `getSetlistWithSongs`, and a new `getAllSongs` Server Action. It passes pre-fetched data as props to `SetlistBuilderClient`.
7. `SetlistBuilderClient` (`src/components/client/SetlistBuilder/SetlistBuilderClient.tsx`) is a `'use client'` component that owns all interactive state: local song order, dirty state, search query, error state, and drag-and-drop.
8. `SetlistBuilderClient` renders two panels:
   - **Setlist Panel** (left or top on mobile): current songs in order, each row with drag handle, title, original key badge, and Remove button.
   - **Library Panel** (right or bottom on mobile): search input + filtered song list with Add button per row.
9. The component tree within `SetlistBuilderClient` is:
   - `SetlistBuilderClient` (state owner)
     - `SetlistPanel` (receives `songs`, `isDragging`, drag props, `onRemove`, `isSaving`)
       - `SortableSongRow` (one per song — wraps `@dnd-kit/sortable` `useSortable`)
     - `LibraryPanel` (receives `allSongs`, `setlistSongIds`, `searchQuery`, `onSearchChange`, `onAdd`, `isAdding`)
10. All components in `src/components/client/SetlistBuilder/` are Client Components marked `'use client'` at the file level.

### Song Library Pre-fetch

11. A new Server Action `getAllSongs` is added to `src/app/actions/songActions.ts`. It fetches all rows from the `songs` table selecting `id, title, artist, original_key, content` ordered by `title ASC`. It uses `createClient()` (server Supabase client) and returns `{ data: DbSong[] | null; error: string | null }`. No pagination — the full library is fetched once at page load.
12. The Server Component passes the full song library array as the `allSongs` prop to `SetlistBuilderClient`.
13. The Library Panel performs client-side filtering only — no additional network requests on search.

### Search

14. The search input filters the library by `title` (case-insensitive substring match) AND `artist` (case-insensitive substring match). A song appears if the query matches either field.
15. Search state is a plain `string` React state variable in `SetlistBuilderClient`, not a URL query param — the edit page URL does not change on search.
16. Searching an empty string shows all songs in the library.

### Add Song Flow

17. When a Music Director clicks Add on a library row, `addSongToSetlist({ setlist_id, song_id })` is called immediately via `startTransition(async () => { ... })`.
18. While the Server Action is in-flight (`isPending` from `useTransition`), the Add button for that specific song row shows a loading indicator and is disabled. Other Add buttons remain enabled.
19. On success, the returned `DbSetlistSong` row is appended to the local `songs` state in `SetlistBuilderClient`. The setlist panel updates without a full page reload.
20. On failure, an inline error banner is shown. The local state is not mutated.
21. A song already present in the setlist (its `song_id` is in the current local song list) has its Add button disabled with `aria-disabled="true"` and visually indicates it is already added (e.g., a checkmark icon or "Added" text).

### Remove Song Flow

22. When a Music Director clicks Remove on a setlist song row, `removeSongFromSetlist({ id: junctionId, setlist_id })` is called immediately via `startTransition(async () => { ... })`.
23. While the Server Action is in-flight, the Remove button for that specific row shows a loading indicator and is disabled.
24. On success, the row is removed from local `songs` state. The server action re-indexes remaining rows server-side; the client updates local `order_index` values to match the new sequential 0-based order.
25. On failure, an inline error banner is shown. The local state is not mutated.

### Dirty State and Save Order

26. Dirty state is defined as: the current local song sequence (ordered array of junction `id` values) differs from the last-persisted sequence. The last-persisted sequence is initialised from the server-fetched `getSetlistWithSongs` data and updated after every successful `updateSetlistSongOrder` call.
27. Add and Remove operations do NOT set dirty state — they are immediately persisted. Only drag-and-drop reordering sets dirty.
28. Dirty state comparison uses junction row `id` values (not `song_id`) as the ordered array, because `id` is the stable `setlist_songs` PK that `updateSetlistSongOrder` requires.
29. The "Save Order" button is rendered only when `isDirty === true`. It is positioned at the bottom of the Setlist Panel, not in a floating toolbar.
30. When "Save Order" is clicked, `updateSetlistSongOrder({ setlist_id, updates: songs.map((s, i) => ({ id: s.junctionId, order_index: i })) })` is called via `startTransition`.
31. On success: `isDirty` is set to `false`, `lastPersistedOrder` is updated to the current sequence.
32. On failure: `isDirty` remains `true`, an error banner is shown, local order is not rolled back (the user can retry).
33. The "Save Order" button is disabled and shows a loading indicator while the save is in progress (`isSaving` from `useTransition`).

### Error Display

34. All errors (add, remove, save-order, initial load failures) are displayed as an inline error banner inside `SetlistBuilderClient`. The banner: `role="alert"`, `bg-brand-cream`, `border border-brand-brown/30`, `text-brand-brown` text (never `text-brand-tan` on cream per WCAG AA), rounded corners, dismissible via an X button that clears `errorMessage` state.
35. Only one error is displayed at a time. A new error overwrites the previous one.
36. No toast library is introduced. The error banner is a plain `div` driven by a `string | null` React state variable (`errorMessage`).

### Drag-and-Drop Reorder

37. `@dnd-kit/core` and `@dnd-kit/sortable` are installed (`npm install @dnd-kit/core @dnd-kit/sortable`). No other DnD library is used.
38. The Setlist Panel uses `DndContext` + `SortableContext` (vertical list strategy) from `@dnd-kit`. Each `SortableSongRow` uses `useSortable` from `@dnd-kit/sortable`.
39. The active drag item renders with a `border border-[--brand-tan]` and `shadow-lg` style to satisfy the Artisan spec for active drag state.
40. On `onDragEnd`, the local `songs` array is reordered using `arrayMove` from `@dnd-kit/sortable`. `isDirty` is set to `true` if the new order differs from the last-persisted order.
41. If the drag ends with the item in the same position (no change), `isDirty` is not set.

### Empty States

42. **Setlist has no songs yet:** The Setlist Panel renders a placeholder area with `bg-brand-cream` background, `border border-dashed border-brand-brown` border, `text-brand-brown` text reading "No songs yet. Add songs from the library." The placeholder has `role="status"` and `aria-live="polite"`.
43. **Library search returns no results:** The Library Panel renders a plain `text-brand-brown` message: "No songs match your search." No dashed border is used here — this is a filter result state, not a structural empty state.
44. **Library itself is empty (songs table has zero rows):** The Library Panel renders "No songs in the library yet." with `text-brand-brown`.

### Artisan Styling and WCAG AA

45. All text on `--brand-cream` backgrounds uses `text-brand-brown` or `text-brand-espresso`. `text-brand-tan` is never used on a cream background.
46. The page background is `bg-brand-cream dark:bg-brand-darker`. Cards/panels use the `.main-card` CSS class (via the `Card` server component) for light/dark depth.
47. Drag handles are rendered as a `GripVertical` Lucide icon in `text-brand-brown/50`, not styled with brand-tan.
48. The original key badge on each setlist row uses `bg-[var(--brand-tan-alpha)] text-brand-espresso` (not `text-brand-tan` on cream).

### State Initialisation Safety

49. The local `songs` state is initialised with a lazy initializer: `useState<SortableSong[]>(() => initialSongs)` where `initialSongs` is the prop value at mount time. It is never seeded synchronously inside a `useEffect` (per MEMORY.md warning).
50. `lastPersistedOrder` state is initialised with a lazy initializer: `useState<string[]>(() => initialSongs.map(s => s.junctionId))`.

### Performance Key Display

51. The SetlistBuilder does NOT display or allow editing of `performance_key`. The original key (`original_key`) is displayed as a read-only badge on each setlist row for identification. Performance key management remains in the read-only viewer (`SetlistSongSection`).

### Navigation

52. A "Back to Setlist" link at the top of the page navigates to `/setlists/[id]` (read-only viewer). This uses a Next.js `<Link>` with the same Artisan chevron pattern as the existing viewer.
53. The page `<title>` is "Edit Setlist — [setlist name] — Saliw".

---

## Out of Scope

- Performance key editing in the builder (handled by the existing viewer and `updatePerformanceDetails`).
- Singer assignment in the builder.
- Setlist metadata editing (name, date, is_public) — not part of this task.
- Pagination of the song library panel — full pre-fetch is used.
- Realtime sync (`useSetlistSync`) is not wired into the builder — the builder is an edit interface, not a live performance tool.
- Creating a new setlist from the builder — creation is handled by `NewSetlistButton`.
- Public/private toggle for the setlist.
- Bulk add or CSV import of songs.
- Undo/redo for drag-and-drop operations.
- Mobile drag-and-drop (touch sensors are out of scope for the initial implementation — pointer/mouse sensors only).

---

## Relevant Files

| File | Purpose |
|------|---------|
| `src/app/setlists/[id]/edit/page.tsx` | New async Server Component — create this file; handles auth, role check, data fetching, passes props to SetlistBuilderClient |
| `src/components/client/SetlistBuilder/SetlistBuilderClient.tsx` | New 'use client' orchestrator — create this file; owns all interactive state |
| `src/components/client/SetlistBuilder/SetlistPanel.tsx` | New 'use client' — DndContext + SortableContext wrapper, renders SortableSongRow list |
| `src/components/client/SetlistBuilder/SortableSongRow.tsx` | New 'use client' — individual draggable row using useSortable |
| `src/components/client/SetlistBuilder/LibraryPanel.tsx` | New 'use client' — stateless library panel with search input and Add buttons |
| `src/components/client/SetlistBuilder/ErrorBanner.tsx` | New 'use client' — dismissible inline error banner with role="alert" |
| `src/app/actions/songActions.ts` | Existing — add new `getAllSongs` export alongside createSong/updateSong/deleteSong |
| `src/app/actions/setlistActions.ts` | Existing — contains addSongToSetlist, removeSongFromSetlist, updateSetlistSongOrder (read only) |
| `src/app/setlists/[id]/page.tsx` | Existing viewer — reference for Server Component auth/role pattern to replicate |
| `src/components/client/SetlistViewerClient.tsx` | Existing viewer client — reference for state initialisation pattern |
| `src/components/server/card.tsx` | Existing Card component — use for panel containers |
| `src/services/supabase/server.ts` | Existing — provides createClient() for Server Action context |

---

## Technical Schema

### Endpoint Contract Table

| UI Action | Method | Supabase Table | Server Action | Status | Gap Strategy |
|-----------|--------|----------------|---------------|--------|--------------|
| Page load — song library | SELECT | `songs` | `getAllSongs` | MISSING | Disable "Add" panel; show "Song library unavailable. Please try again." |
| Page load — setlist + songs | SELECT | `setlist_songs` + `setlists` | `getSetlistWithSongs`, `getSetlistById` | EXISTS | Show error banner; block edit UI |
| Add song to setlist | INSERT | `setlist_songs` | `addSongToSetlist` | EXISTS | Disable Add button; show inline error |
| Remove song from setlist | DELETE | `setlist_songs` | `removeSongFromSetlist` | EXISTS | Disable Remove button; show inline error |
| Reorder (batch Save Order) | UPDATE | `setlist_songs` | `updateSetlistSongOrder` | EXISTS | Disable Save Order button; show inline error |

**Summary:** 5 total operations — 4 EXISTS, 1 MISSING. All-MISSING escalation does not apply (1/5 = 20%).

### getAllSongs — TypeScript Signature (must be created)

```typescript
// File: src/app/actions/songActions.ts
// Add alongside createSong / updateSong / deleteSong

'use server'

/**
 * Fetches all songs in the library for display in the SetlistBuilder Add panel.
 * READ-ONLY. No authentication required (songs_select_public RLS policy).
 */
export async function getAllSongs(): Promise<{
  data: Array<{
    id: string
    title: string
    artist: string
    original_key: string
    content: string
  }> | null
  error: string | null
}>
```

Implementation notes for `getAllSongs`:
- SELECT columns: `id, title, artist, original_key, content` (omit `created_by`, `singer`)
- ORDER BY: `title ASC`
- Use `createClient()` from `@/services/supabase/server`
- No `auth.getUser()` check needed — `songs_select_public` RLS policy uses `USING(true)` (migration `20260418000003`)
- No `.limit()` — full library pre-fetch for the builder

### addSongToSetlist — Existing (reference)

```typescript
addSongToSetlist({ setlist_id: string; song_id: string })
// → { data: DbSetlistSong | null; error: string | null }
// Side effects: order_index computed server-side, performance_key seeded from songs.original_key
```

Error codes: PGRST116 (song not found), 42501 (not setlist leader), network/throw.

### removeSongFromSetlist — Existing (reference)

```typescript
removeSongFromSetlist({ id: string; setlist_id: string })
// id = setlist_songs.id (junction PK)
// → { data: { id: string } | null; error: string | null }
// Side effect: remaining rows re-indexed sequentially (server-side)
```

Error codes: count === 0 (row not found), 42501 (not setlist leader), network/throw.

### updateSetlistSongOrder — Existing (reference)

```typescript
updateSetlistSongOrder({
  setlist_id: string
  updates: Array<{ id: string; order_index: number }>
  // id = setlist_songs.id (junction PK)
})
// → { data: DbSetlistSong[] | null; error: string | null }
// Implementation: sequential UPDATE loop — N round-trips; acceptable for setlists < 30 songs
```

Error codes: empty updates array guard, 42501 (not setlist leader), network/throw.

### getSetlistWithSongs — Return shape (reference)

```typescript
// getSetlistWithSongs return rows:
{
  id: string           // setlist_songs.id (junction PK) — use as junctionId in SortableSong
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
}
```

### RLS Security Note (for validator)

The `setlist_songs` mutation policies gate on `leader_id = auth.uid()` but do NOT gate on `is_music_director()`. Combined with `setlists_insert_authenticated` allowing any authenticated user to create a setlist, a non-music-director user could theoretically create a setlist and then add/remove songs. This is a pre-existing architectural gap — flag to `@validator-agent` but do not address in this task.

---

## State Shape Reference

```typescript
interface SortableSong {
  junctionId: string       // setlist_songs.id — used as DnD id and for reorder updates
  songId: string
  title: string
  artist: string
  originalKey: string      // display only, never edited here
  orderIndex: number       // current local position
}

// State in SetlistBuilderClient
const [songs, setSongs] = useState<SortableSong[]>(() => initialSongs)
const [lastPersistedOrder, setLastPersistedOrder] = useState<string[]>(
  () => initialSongs.map(s => s.junctionId)
)
const isDirty = songs.map(s => s.junctionId).join(',') !== lastPersistedOrder.join(',')
const [error, setError] = useState<string | null>(null)
const [addingId, setAddingId] = useState<string | null>(null)    // song_id being added
const [removingId, setRemovingId] = useState<string | null>(null) // junctionId being removed
const [isSaving, setIsSaving] = useState(false)
```

---

## Fallback Behaviors

- `getAllSongs` returns an error: Library Panel renders "Unable to load song library. Please try again." with `text-brand-brown`. No Add buttons rendered. Not a silent failure.
- `addSongToSetlist` returns `error: 'You do not have permission...'` (RLS 42501): Error banner shows "You do not have permission to modify this setlist." Add button re-enables.
- `removeSongFromSetlist` returns an error: Error banner shows the server error string. Row is not removed from local state.
- `updateSetlistSongOrder` returns an error: Error banner shows "Unable to save order. Please try again." Save Order button re-enables; `isDirty` remains true.
- User navigates to `/setlists/[id]/edit` unauthenticated: redirected to `/login`.
- User navigates to `/setlists/[id]/edit` as non-director: redirected to `/setlists/[id]`.

---

## Planning Artifacts

| Artifact | Path | Description |
|----------|------|-------------|
| Feature Specification | `tasks/TASK-022/spec.md` | Acceptance criteria + scope |
| Technical Schema | `tasks/TASK-022/schema.md` | Endpoint contract table |
| Endpoint Contracts | `tasks/TASK-022/contracts/endpoints.md` | Full contract detail with error codes and RLS notes |
| Research Notes | `tasks/TASK-022/research.md` | Open questions (all resolved) |

---

## Implementation Notes

- Read `docs/coding-guidelines.md` before writing any code.
- Read `docs/tech-stack.md` before choosing any library or package.
- Read `docs/structure.md` before creating any new file or directory.
- Base branch is `develop`. Feature branch is `feature/TASK-022-setlist-builder`.
- Install `@dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities` via npm before implementing drag-and-drop. Do not use `react-beautiful-dnd` — it is incompatible with React 18/19 Strict Mode.
- All Supabase calls in Client Components are prohibited. Mutations must go through Server Actions only.
- Never use the Supabase service role key (`SUPABASE_SERVICE_ROLE_KEY`) in any Server Action or client-accessible code.
- Use `@supabase/ssr` for server-side session access (not the browser client).
- TypeScript strict mode is active — no implicit `any`. Run `npx tsc --noEmit` before marking work complete.
- Use `PointerSensor` only for drag-and-drop sensors (`useSensor(PointerSensor)`). No touch sensor.
- All lazy state initialisers must use the `useState(() => ...)` form — never seed state inside `useEffect`. See MEMORY.md section "useFontSize setState-in-effect bug" for context on why this causes Vercel build failures in Next.js 15.
- The `Card` server component from `src/components/server/card` provides the `.main-card` CSS class for panel containers — use it instead of inline card styling.
- `text-brand-tan` on `bg-brand-cream` is a WCAG AA failure — never combine them. Use `text-brand-brown` or `text-brand-espresso` on cream backgrounds.
- The `GripVertical` icon (Lucide) is the drag handle — style with `text-brand-brown/50`.
- The original key badge style: `bg-[var(--brand-tan-alpha)] text-brand-espresso text-xs font-medium px-2 py-0.5 rounded`.
- Active drag overlay style: `border border-[var(--brand-tan)] shadow-lg shadow-[var(--brand-tan)]/20`.
- The `isDirty` flag is a computed value from state comparison, not a separate state variable — derive it inline: `const isDirty = songs.map(s => s.junctionId).join(',') !== lastPersistedOrder.join(',')`.
- Add and Remove operations must reset `lastPersistedOrder` on success to reflect the new persisted sequence (preventing false dirty state after add/remove).
- The `removeSongFromSetlist` action re-indexes remaining rows server-side. The client does not need to re-index locally — re-derive `orderIndex` from the songs array index after removing the entry.
- Reference the existing `src/app/setlists/[id]/page.tsx` for the Server Component auth/role pattern (the `isMusicDirector`/`isLeader` check).
- Reference `src/components/client/SetlistViewerClient.tsx` for the state initialisation and transition patterns.
- Read MEMORY.md section: "useFontSize setState-in-effect bug" before writing any useState/useEffect code.

---

## Amendments (from Context Bundle)

> _No `context.md` artifact was produced for this task. No amendments required._

---

## Resolution

- **Completed:** 2026-04-23
- **Branch:** feature/TASK-022-setlist-builder
- **Base branch:** develop
- **Files changed:**
  - `src/app/actions/songActions.ts` — added `getAllSongs` export (full song library pre-fetch)
  - `src/app/setlists/[id]/edit/page.tsx` — new async Server Component; auth/role redirect, parallel data fetch, maps rows to SortableSong[]/SongLibraryItem[], renders SetlistBuilderClient
  - `src/components/client/SetlistBuilder/SetlistBuilderClient.tsx` — main 'use client' orchestrator; all state (lazy initialisers), handleAdd/Remove/Reorder/Save, two-column layout
  - `src/components/client/SetlistBuilder/SetlistPanel.tsx` — DndContext + SortableContext (PointerSensor), empty state, Save Order button shown only when isDirty
  - `src/components/client/SetlistBuilder/SortableSongRow.tsx` — individual draggable row with GripVertical handle, key badge, Remove button
  - `src/components/client/SetlistBuilder/LibraryPanel.tsx` — stateless; controlled search input, client-side filtering, Add buttons with added/loading states, all empty/error states
  - `src/components/client/SetlistBuilder/ErrorBanner.tsx` — dismissible inline error with role="alert"
  - `package.json` + `package-lock.json` — added @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities
- **Notes:**
  - The `generateMetadata` function calls `getSetlistById` independently (before the main page fetch). This is a minor extra round-trip but follows Next.js conventions and is acceptable.
  - The page passes `libraryError` as a prop to `SetlistBuilderClient` so the library panel can display the fallback message without a runtime crash — the Library Panel is rendered with error state rather than undefined songs.
  - The RLS gap noted in the Technical Schema (non-director can add songs if they created the setlist) is pre-existing and has not been addressed per task scope.
  - `npx tsc --noEmit` passes with zero errors.
