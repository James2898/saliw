# Technical Schema — Backend Infrastructure (Songs, Setlists, Server Actions)

## Server Action Contract Table

This project uses Next.js Server Actions + Supabase SSR, not REST endpoints. All contracts are Server Action based per `docs/api-discovery.md`.

| UI Action | Server Action | File | RLS Role | Status | Gap Strategy |
|-----------|--------------|------|----------|--------|--------------|
| Create song | `createSong()` | `src/app/actions/songActions.ts` | `music_director` | MISSING (to be created) | N/A — backend only |
| Update song | `updateSong()` | `src/app/actions/songActions.ts` | `music_director` | MISSING (to be created) | N/A — backend only |
| Delete song | `deleteSong()` | `src/app/actions/songActions.ts` | `music_director` | MISSING (to be created) | N/A — backend only |
| Create setlist | `createSetlist()` | `src/app/actions/setlistActions.ts` | authenticated | MISSING (to be created) | N/A — backend only |
| Add song to setlist | `addSongToSetlist()` | `src/app/actions/setlistActions.ts` | leader_id match | MISSING (to be created) | N/A — backend only |
| Reorder setlist | `reorderSetlist()` | `src/app/actions/setlistActions.ts` | leader_id match | MISSING (to be created) | N/A — backend only |
| Delete setlist | `deleteSetlist()` | `src/app/actions/setlistActions.ts` | leader_id match | MISSING (to be created) | N/A — backend only |
| `songs` DB table | SQL migration | `supabase/migrations/20260415000001_create_songs_table.sql` | RLS | MISSING (to be created) | N/A — migration |
| `setlists` DB table | SQL migration | `supabase/migrations/20260415000002_create_setlists_table.sql` | RLS | MISSING (to be created) | N/A — migration |
| `setlist_songs` DB table | SQL migration | `supabase/migrations/20260415000003_create_setlist_songs_table.sql` | RLS | MISSING (to be created) | N/A — migration |

## Summary

- Total actions: 7 Server Actions + 3 SQL migrations
- EXISTS: 0 (none of the new actions or tables exist yet)
- MISSING (to be created in this task): 10
- All-MISSING escalation: No — this task IS the implementation of all missing items. This is a greenfield backend task, not a gap against an existing backend. All items are MISSING because they have not been written yet; the task explicitly creates them.

## Note on Gap Strategy

Because this is a backend-only task with no UI, the standard "disable UI control + show hint" gap strategy does not apply. All MISSING items are created by this task. There are no residual gaps after implementation.
