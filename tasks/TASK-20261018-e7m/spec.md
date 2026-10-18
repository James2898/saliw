# Feature Specification — Edit Songs Modal on Setlist Detail Page

- **Task ID:** `TASK-20261018-e7m`
- **Tier:** 1
- **Date:** 2026-10-18

---

## Feature Summary

Replace the existing "Add Songs" trigger button and checkbox-based "Add Songs to Setlist" modal on the Setlist detail page with an "Edit Songs" trigger button and an "Edit Songs" modal that mirrors the song management experience on the Edit Setlist page. Inside the modal, authorized (`music_director`) users can view the setlist's current songs, reorder them via drag-and-drop, change performance keys, remove songs from the setlist, and search/add songs from the song library. Every add, remove, reorder, and key-change action saves automatically via Server Actions with optimistic UI updates and rollback on error, with no "Cancel" or "Save" footer buttons.

---

## Acceptance Criteria

1. **Trigger Button Label & Icon:** On the Setlist detail page (`AppendSongsButton.tsx`), the existing "Add Songs" button is updated to read `"Edit Songs"` (rendered uppercase as `"EDIT SONGS"` via existing tracking/uppercase styling, with updated `title="Edit Songs"` and `aria-label="Edit songs in setlist"`, preserving the existing pill styling and dark-mode variants).
2. **Role Gating:** The "EDIT SONGS" button and modal remain restricted to authorized users (`isLeader` / `music_director` role, matching existing visibility and RLS rules on `SetlistViewerClient.tsx`).
3. **Modal Header & Dismissal:** Clicking "EDIT SONGS" opens the modal titled `"Edit Songs"` with a close (`X`) button in the header. The modal can be dismissed via the `X` button, clicking the backdrop, or pressing `Escape`.
4. **No Footer Save/Cancel Buttons:** The modal does **not** render "Cancel" or "Save" footer buttons (nor the inline "Save" order button inside `SetlistPanel`, suppressed by passing `isDirty={false}`).
5. **Edit Setlist Song Management Parity:** The modal body replicates the song management UI and behavior from the Edit Setlist page by reusing `SetlistPanel` (`SortableSongRow`) and `LibraryPanel`, including:
   - Displaying the ordered list of songs currently in the setlist (with drag handle `GripVertical`, song title, artist, `originalKey` badge, `performanceKey` `<select>`, and `"Remove"` button).
   - Supporting `@dnd-kit` drag-and-drop reordering of the current songs in the setlist.
   - Providing the song search input and available library songs list via `LibraryPanel` to add songs to the setlist, marking already-in-setlist songs as `"Added"` (disabled) and showing a spinner for the song currently being added (`addingId`), plus showing empty states when the setlist has no songs or when a search query matches no library songs.
6. **Automatic Persistence (Auto-Save):**
   - **Add Song:** Clicking `"Add"` on a song in `LibraryPanel` calls `addSongToSetlist({ setlist_id, song_id })`, appends the created song row (with returned `junctionId: data.id`) to the modal's setlist songs state, and triggers `router.refresh()`.
   - **Remove Song:** Clicking `"Remove"` on a song in `SetlistPanel` optimistically removes it from local modal state (re-indexing `orderIndex`), calls `removeSongFromSetlist({ id: junctionId, setlist_id })`, rolls back on error, and triggers `router.refresh()`.
   - **Reorder Songs:** Dropping a song into a new position via drag-and-drop immediately updates local modal song order and calls `updateSetlistSongOrder({ setlist_id, updates })`, rolling back on error, and triggers `router.refresh()`. No database mutation is triggered if the song order did not change.
   - **Performance Key Change:** Changing a song's performance key `<select>` in `SortableSongRow` updates local modal state and calls `updatePerformanceDetails({ id: junctionId, setlist_id, performance_key })`, rolling back on error, and triggers `router.refresh()`.
7. **Setlist Detail Page Synchronization:** Any song added, removed, reordered, or key-changed inside the modal is reflected on the underlying Setlist detail page (`SetlistViewerClient.tsx` receives updated `songs` via `router.refresh()` and passes current `songs` mapped to `SortableSong[]` into `AppendSongsButton` → `AppendSongsModal`).
8. **Optimistic UI, Concurrency & Error Rollback:**
   - Mutations update modal UI immediately or show per-item loading state (`addingId`), and roll back to previous state on error while displaying a dismissible error banner (`ErrorBanner`) inside the modal.
9. **Design System, Dark Mode, Accessibility & React Compiler Compliance:**
   - Focus trap in `AppendSongsModal.tsx` includes `select:not([disabled])` alongside `button:not([disabled])` and `input:not([disabled])`.
   - All Artisan palette classes (`text-brand-espresso`, `text-brand-brown`, `bg-brand-cream`, `border-brand-brown`, etc.) in touched files include explicit `dark:` variants (per `MEMORY.md` BUG-005).
   - Helper functions in Client Components are declared before any hooks (`useEffect`, `useCallback`, `useMemo`) that reference them (per `MEMORY.md` BUG-007).
   - Hook dependency arrays reference whole objects or destructured primitives, never object property paths (per `MEMORY.md` BUG-002).
   - No wildcard asterisk class patterns appear in comments or strings (per `MEMORY.md` BUG-006).

---

## Out of Scope

- Editing setlist metadata (title, event date, worship leader) or team assignments inside this modal (those remain on the Edit Setlist page).
- Modifying database schema, RLS policies, or Server Action definitions in `src/app/actions/setlistActions.ts`.
- Changing the Edit Setlist page (`/setlists/[id]/edit`) behavior.
