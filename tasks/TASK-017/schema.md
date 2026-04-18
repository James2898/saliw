# Technical Schema — Setlist Song Management (TASK-017)

## Endpoint Contract Table

| UI Action | Method | Path (Server Action) | Status | Gap Strategy |
|-----------|--------|----------------------|--------|--------------|
| Add song to setlist | mutation | `addSongToSetlist` | EXISTS | N/A |
| Remove song from setlist | mutation | `removeSongFromSetlist` | MISSING | Implement in same changeset |
| Reorder songs in setlist | mutation | `updateSetlistSongOrder` (rename from `reorderSetlist`) | EXISTS (rename needed) | N/A |
| Update performance key / singer | mutation | `updatePerformanceDetails` | MISSING | Implement in same changeset |
| Fetch setlist with songs | query | `getSetlistWithSongs` | MISSING | Implement in same changeset |

## Schema Resource Status

| Resource | Status | Notes |
|----------|--------|-------|
| `setlist_songs` table | EXISTS | Migration `20260415000003` confirmed |
| `setlist_songs.singer` column | MISSING | Not in migration `20260415000003`; needs new migration |
| `setlist_songs` RLS INSERT policy | EXISTS | `setlist_songs_insert_leader` confirmed |
| `setlist_songs` RLS UPDATE policy | EXISTS | `setlist_songs_update_leader` confirmed |
| `setlist_songs` RLS DELETE policy | EXISTS | `setlist_songs_delete_leader` confirmed |
| `setlists.leader_id` column | EXISTS | Migration `20260415000002` confirmed |
| `songs.original_key` column | EXISTS | Migration `20260415000001` confirmed |
| `songs.singer` column | EXISTS | Migration `20260417000001` confirmed |

## Migration Needed

File: `supabase/migrations/20260418000001_add_singer_to_setlist_songs.sql`

```sql
-- Migration: Add singer column to public.setlist_songs
-- Nullable; no default. Existing rows receive NULL. No backfill required.
ALTER TABLE public.setlist_songs ADD COLUMN IF NOT EXISTS singer TEXT;
```

## Type Update Needed

In `/Users/adish/projects/saliw/src/types/supabase.ts`, `DbSetlistSong` must be updated:

```typescript
export type DbSetlistSong = {
  id: string
  setlist_id: string
  song_id: string
  order_index: number
  performance_key: string
  singer: string | null   // ADD THIS — requires migration above
}
```

## Summary

- Total operations: 5
- EXISTS (no change): 1 (`addSongToSetlist`)
- EXISTS (rename only): 1 (`reorderSetlist` → `updateSetlistSongOrder`)
- MISSING (implement): 3 (`removeSongFromSetlist`, `updatePerformanceDetails`, `getSetlistWithSongs`)
- Schema resource MISSING: 1 (`setlist_songs.singer` column — resolved by migration in same changeset)
- All-MISSING escalation: No (only 60% of operations are missing, but all are resolvable within this changeset with no external blocker; the `singer` column gap is handled by a new migration, not by disabling UI)
