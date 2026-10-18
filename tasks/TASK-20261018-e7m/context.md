# Context Bundle — Edit Songs Modal on Setlist Detail Page

- **Task ID:** `TASK-20261018-e7m`
- **Date:** 2026-10-18

---

## 1. Reusable Components & Types

- **`src/components/client/SetlistBuilder/SetlistPanel.tsx`**
  - Renders the `@dnd-kit/core` + `@dnd-kit/sortable` drag-and-drop list of `SortableSongRow` items.
  - Props: `songs: SortableSong[]`, `onReorder: (newSongs: SortableSong[]) => void`, `onRemove: (songId: string) => void`, `onKeyChange: (songId: string, key: string) => void`, `isDirty: boolean`, `onSave: () => void`, `isSaving: boolean`.
  - Passing `isDirty={false}` suppresses the inline "Save" button inside `SetlistPanel`, allowing `AppendSongsModal` to reuse `SetlistPanel` directly without a Save button.
- **`src/components/client/SetlistBuilder/SortableSongRow.tsx`**
  - Individual draggable song row with `GripVertical` drag handle, title/artist, `originalKey` badge, `performanceKey` `<select>` (`NOTES` from `@/utils/musicLogic`), and `"Remove"` button.
- **`src/components/client/SetlistBuilder/LibraryPanel.tsx`**
  - Searchable song library panel with client-side title/artist filtering, `"Add"` / `"Added"` button state, and per-song loading spinner via `addingId: string | null`.
- **`src/components/client/SetlistBuilder/ErrorBanner.tsx`**
  - Dismissible `role="alert"` error banner used across `SetlistBuilderClient`.
- **`SortableSong` & `SongLibraryItem` (`src/components/client/SetlistBuilder/SetlistBuilderClient.tsx`)**
  - `SortableSong`: `{ junctionId: string | null; songId: string; title: string; artist: string; originalKey: string; performanceKey: string; orderIndex: number }`.

---

## 2. Server Actions (`src/app/actions/setlistActions.ts` & `src/app/actions/songActions.ts`)

- `addSongToSetlist({ setlist_id, song_id })`: Inserts a new row into `setlist_songs` at `MAX(order_index) + 1` with `performance_key = song.original_key`, returning `{ data: DbSetlistSong | null, error: string | null }`.
- `removeSongFromSetlist({ id, setlist_id })`: Deletes the `setlist_songs` row by `id` (junction PK) and sequentially re-indexes remaining rows (`0, 1, 2, ...`).
- `updateSetlistSongOrder({ setlist_id, updates })`: Reorders `setlist_songs` via `reorder_setlist_songs` RPC (with sequential fallback) using `updates: Array<{ id: string; order_index: number }>`.
- `updatePerformanceDetails({ id, setlist_id, performance_key })`: Updates `performance_key` on a `setlist_songs` row by `id` (junction PK).
- `getAllSongs()`: Fetches all `SongSummary[]` items from the song library.

---

## 3. Relevant Lessons from `MEMORY.md`

- **BUG-001:** Never initialize React state via `useEffect` + `setState`; use lazy initializers (`useState(() => ...)`).
- **BUG-002:** Never use object property paths in `useCallback` / `useMemo` dependency arrays.
- **BUG-005:** Every named Artisan Tailwind utility (`text-brand-espresso`, `text-brand-brown`, `bg-brand-cream`, `border-brand-brown`) must have an explicit `dark:` pair (`dark:text-brand-cream`, `dark:text-brand-tan`, `dark:bg-brand-espresso`, `dark:border-brand-tan`).
- **BUG-006:** Never write wildcard asterisk Tailwind class patterns in comments or `.md` files.
- **BUG-007:** Always declare helper functions before any hooks (`useEffect`, `useCallback`, `useMemo`) that reference them.
- **BUG-019:** Never allocate arrays, Sets, or objects inline in a render body when passed as props; hoist static defaults to module scope or wrap dynamic derivations in `useMemo`.
