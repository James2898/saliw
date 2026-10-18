# Research Notes — Edit Songs Modal on Setlist Detail Page

- **Task ID:** `TASK-20261018-e7m`
- **Date:** 2026-10-18

---

## Decisions & Findings

1. **Direct Reuse of `SetlistPanel` and `LibraryPanel`:**
   - `SetlistPanel` accepts `isDirty: boolean`. When `isDirty={false}`, its footer `"Save"` button is not rendered, making it a drop-in fit for the auto-saving Edit Songs modal.
   - `LibraryPanel` already supports an `addingId: string | null` prop that renders an inline spinner inside the `"Add"` button while `addSongToSetlist` is in flight.
2. **Modal Layout & Width:**
   - Widening the dialog panel in `AppendSongsModal.tsx` from `w-[min(90vw,36rem)]` to `w-[min(95vw,64rem)]` with `max-h-[85vh]` allows the two-column layout (`flex flex-col gap-6 md:grid md:grid-cols-[1fr_360px] md:gap-8 md:items-start`) from `SetlistBuilderClient.tsx` to fit comfortably inside the modal on desktop (`lg+`).
3. **Auto-Save & Optimistic Rollback:**
   - Each mutation (`addSongToSetlist`, `removeSongFromSetlist`, `updateSetlistSongOrder`, `updatePerformanceDetails`) runs immediately on user interaction, updates `localSongs` in the modal, calls `router.refresh()` on success so `SetlistViewerClient` updates in the background, and restores the snapshot of `localSongs` with an `ErrorBanner` alert if the Server Action returns an error.
4. **Focus Management:**
   - Because `SortableSongRow` contains a `<select>` for `performanceKey`, the modal focus trap selector list must include `select:not([disabled])` alongside `button:not([disabled])` and `input:not([disabled])`.
