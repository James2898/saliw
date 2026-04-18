# Research — Setlist Junction Logic and Server Actions

## Open Questions

- **Re-indexing atomicity** → Resolved from context: The existing `reorderSetlist` in `src/app/actions/setlistActions.ts` already uses a sequential client-side loop with no RPC. The same pattern is acceptable for post-delete re-indexing.
- **`updateSetlistSongOrder` atomicity** → Resolved from context: Same as above. Sequential upsert loop is the established pattern. No RPC or Postgres function exists in this codebase.
- **`performance_key` valid values and validation function** → Resolved from context: Valid values are the `NOTES` array in `src/utils/musicLogic.ts`. No exported `isValidKey` helper exists; `songActions.ts` uses `(NOTES as readonly string[]).includes(key)` inline. The same pattern must be used.
- **`singer` field constraints** → Resolved from context: Free-text `text` column, nullable, no max-length. Consistent with `songs.singer` column in `supabase/migrations/20260417000001_add_singer_default_key_to_songs.sql`.
- **RLS enforcement location** → Resolved from context: RLS-only for role enforcement. Setlist mutations use leader-ownership policies (`setlists.leader_id = auth.uid()`), not `music_director` role. The task description's reference to `music_director` role does not match the actual migration RLS policies. Server Actions only add a session check (`auth.getUser()`).
- **Migration scope** → Resolved from context: Table and policies exist. No new migration needed for the four Server Actions. Gap: `singer` column is missing from `setlist_songs` migration; flagged for `@integration-contract`.
- **Join query shape** → Resolved from context: Columns from `songs` needed are `id`, `title`, `artist`, `original_key`, `singer`. Use Supabase nested select: `.select('*, setlist_songs(*, songs(id, title, artist, original_key, singer))')`.
