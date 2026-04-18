# Research — Stage-Ready Setlist Viewer

## Open Questions

- None.

## Resolved Questions Log

1. **Does `getSetlistWithSongs` return the parent setlist row (name, date, leader_id)?**
   → Resolved from context: No. It returns only `setlist_songs` rows with embedded `songs` data. A separate query to `setlists` is required for the page header and leader check. Source: `src/app/actions/setlistActions.ts` (getSetlistWithSongs implementation).

2. **Which transpose key initializes the chord sheet per song — `original_key` or `performance_key`?**
   → Resolved from feature description: `performance_key` from `setlist_songs`. The `useTranspose` hook's `originalKey` param must receive `performance_key` so the sheet opens at the setlist's intended key.

3. **Is `updatePerformanceDetails` already implemented and callable from this feature?**
   → Resolved from context: Yes. TASK-017 implemented it in `src/app/actions/setlistActions.ts`. It accepts `{ id, setlist_id, performance_key?, singer? }` and returns `{ data: DbSetlistSong | null, error: string | null }`. Source: `tasks/TASK-017.md`, `src/app/actions/setlistActions.ts`.

4. **Who is permitted to see the Sync button — any `music_director` or only the setlist leader?**
   → Resolved from feature description ("music_director who OWNS the setlist") combined with the DB schema: the gating condition is `user.id === setlist.leader_id`. RLS on `setlist_songs` UPDATE already enforces this at the DB layer; the UI gate is an additional display-only guard. Source: feature description section 3; `supabase/migrations/20260415000003_create_setlist_songs_table.sql`.

5. **What happens if the setlist does not exist at all (invalid UUID in the URL)?**
   → Resolved from context: `getSetlistWithSongs` returns `[]` (empty array, valid success) if the setlist_id has no matching rows due to RLS or non-existence. The setlist header query (`.single()`) will return `PGRST116`. The page should treat either case as "not found" and render the error card. Consistent with the pattern in `src/app/library/[id]/page.tsx`.

6. **Is there a known bug pattern relevant to this feature?**
   → Resolved from MEMORY.md: The `useFontSize setState-in-effect` bug (synchronous setState inside useEffect during render) is documented. The IntersectionObserver implementation must call setState inside the observer callback (which fires asynchronously outside React render), not synchronously during component render. This is the safe pattern and does not trigger the recorded bug.
