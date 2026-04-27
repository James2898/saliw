# Spec — Musicians Table & Setlist Musicians Migration

## Feature Summary

Write two Supabase migration files that introduce a reusable musician roster (`public.musicians`) and link it to setlists via a junction table (`public.setlist_musicians`). Migration 1 creates the `musicians` table with full RLS (authenticated read, music_director write) and an `updated_at` trigger. Migration 2 adds a `worship_leader_id` FK column to `public.setlists`, creates the `setlist_musicians` junction table with the same RLS pattern and trigger, and drops the deprecated `singer` column from `public.setlist_songs`. A mandatory pre-flight query must be run and its results reviewed before migration 2 executes, to avoid silent data loss of any non-null `singer` values.

## Acceptance Criteria

### Migration 1 — `20260426000001_create_musicians_table.sql`

1. File is created at `supabase/migrations/20260426000001_create_musicians_table.sql`.
2. `CREATE TABLE IF NOT EXISTS public.musicians` defines columns exactly: `id uuid PK DEFAULT gen_random_uuid()`, `name text NOT NULL CHECK (length(trim(name)) > 0)`, `notes text NULL`, `created_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL`, `created_at timestamptz NOT NULL DEFAULT now()`, `updated_at timestamptz NOT NULL DEFAULT now()`.
3. `CREATE INDEX IF NOT EXISTS musicians_name_idx ON public.musicians (lower(name))` is present.
4. `ALTER TABLE public.musicians ENABLE ROW LEVEL SECURITY` is present.
5. All four policies are created with `DROP POLICY IF EXISTS` before each `CREATE POLICY` for idempotency:
   - `musicians_select_authenticated` FOR SELECT USING `auth.role() = 'authenticated'`
   - `musicians_insert_music_director` FOR INSERT WITH CHECK `public.is_music_director()`
   - `musicians_update_music_director` FOR UPDATE USING `public.is_music_director()` WITH CHECK `public.is_music_director()`
   - `musicians_delete_music_director` FOR DELETE USING `public.is_music_director()`
6. A `DROP TRIGGER IF EXISTS musicians_set_updated_at ON public.musicians` precedes `CREATE TRIGGER musicians_set_updated_at BEFORE UPDATE ON public.musicians FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()`, consistent with the idempotency pattern used in `20260424000002_add_timestamps_to_songs_and_setlists.sql`.
7. The migration does not redefine `public.is_music_director()` or `public.set_updated_at()` — both already exist.

### Migration 2 — `20260426000002_setlist_musicians_and_worship_leader.sql`

8. File is created at `supabase/migrations/20260426000002_setlist_musicians_and_worship_leader.sql`.
9. A header comment states: "setlists.leader_id is the auth-user owner; setlists.worship_leader_id is the musician roster row. Intentionally distinct."
10. `ALTER TABLE public.setlists ADD COLUMN IF NOT EXISTS worship_leader_id uuid NULL REFERENCES public.musicians(id) ON DELETE SET NULL` is present.
11. `CREATE INDEX IF NOT EXISTS setlists_worship_leader_id_idx ON public.setlists (worship_leader_id)` is present.
12. `CREATE TABLE IF NOT EXISTS public.setlist_musicians` defines columns exactly: `id uuid PK DEFAULT gen_random_uuid()`, `setlist_id uuid NOT NULL REFERENCES public.setlists(id) ON DELETE CASCADE`, `musician_id uuid NOT NULL REFERENCES public.musicians(id) ON DELETE CASCADE`, `instrument text NOT NULL CHECK (length(trim(instrument)) > 0)`, `created_at timestamptz NOT NULL DEFAULT now()`, `updated_at timestamptz NOT NULL DEFAULT now()`.
13. The case-insensitive uniqueness of `(setlist_id, musician_id, instrument)` is enforced via `CREATE UNIQUE INDEX IF NOT EXISTS setlist_musicians_unique_instrument_idx ON public.setlist_musicians (setlist_id, musician_id, lower(instrument))` — **not** as an inline `UNIQUE` table constraint, because PostgreSQL does not allow expression columns in inline `UNIQUE` clauses within `CREATE TABLE`.
14. `CREATE INDEX IF NOT EXISTS setlist_musicians_setlist_id_idx ON public.setlist_musicians (setlist_id)` is present.
15. `CREATE INDEX IF NOT EXISTS setlist_musicians_musician_id_idx ON public.setlist_musicians (musician_id)` is present.
16. `ALTER TABLE public.setlist_musicians ENABLE ROW LEVEL SECURITY` is present.
17. All four policies are created with `DROP POLICY IF EXISTS` before each `CREATE POLICY`:
    - `setlist_musicians_select_authenticated` FOR SELECT USING `auth.role() = 'authenticated'`
    - `setlist_musicians_insert_music_director` FOR INSERT WITH CHECK `public.is_music_director()`
    - `setlist_musicians_update_music_director` FOR UPDATE USING `public.is_music_director()` WITH CHECK `public.is_music_director()`
    - `setlist_musicians_delete_music_director` FOR DELETE USING `public.is_music_director()`
18. A `DROP TRIGGER IF EXISTS setlist_musicians_set_updated_at ON public.setlist_musicians` precedes the `CREATE TRIGGER setlist_musicians_set_updated_at BEFORE UPDATE ON public.setlist_musicians FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()`.
19. `ALTER TABLE public.setlist_songs DROP COLUMN IF EXISTS singer` is present and placed after all table/index/policy/trigger statements.

### Pre-flight Query (Mandatory Before Migration 2)

20. The pre-flight query `SELECT id, song_id, singer FROM setlist_songs WHERE singer IS NOT NULL;` is documented in the migration file header comment as a step that MUST be run and reviewed before executing this migration, with a note that any returned rows represent data that will be permanently deleted by the `DROP COLUMN` statement.
21. If the pre-flight query returns any rows, the operator must make a deliberate decision (export, migrate to `setlist_musicians`, or accept loss) before proceeding.

### General

22. Both migration files use the exact timestamp-prefixed filenames specified (`20260426000001_...`, `20260426000002_...`). No other files are created or modified.
23. No TypeScript types, Server Actions, or UI components are created in this task.
24. The `singer` column on `public.songs` (added in `20260417000001_add_singer_default_key_to_songs.sql`) is out of scope and is NOT dropped.

## Out of Scope

- TypeScript type generation or updates.
- Server Actions for creating/updating/deleting musicians or setlist_musicians.
- UI components for the musician roster or setlist assignment.
- Renaming `setlists.leader_id` or changing its existing FK or policies.
- Dropping the `singer` column from `public.songs` (only `public.setlist_songs.singer` is dropped).
- Any changes to existing migration files.

## Fallback Behaviors

N/A — this is a database-only migration task with no UI layer.

## Resolved Ambiguities

- **UNIQUE constraint with expression column** → PostgreSQL does not permit expression columns (e.g., `lower(instrument)`) inside an inline `UNIQUE (...)` clause within `CREATE TABLE`. The uniqueness constraint must be implemented as a separate `CREATE UNIQUE INDEX IF NOT EXISTS setlist_musicians_unique_instrument_idx ON public.setlist_musicians (setlist_id, musician_id, lower(instrument))`. The inline `UNIQUE (setlist_id, musician_id, lower(instrument))` clause in the original spec would cause a syntax/parse error in PostgreSQL. Resolved from PostgreSQL documentation and standard Supabase migration practice.
- **Trigger idempotency pattern** → The existing migration `20260424000002_add_timestamps_to_songs_and_setlists.sql` uses `DROP TRIGGER IF EXISTS ... CREATE TRIGGER` for idempotency. The same pattern is applied to both new triggers for consistency.
- **songs.singer vs setlist_songs.singer** → Two separate `singer` columns were added in migrations `20260417000001` (on `public.songs`) and `20260418000001` (on `public.setlist_songs`). Only `setlist_songs.singer` is in scope for removal. The `songs.singer` column is untouched.
- **Policy naming for setlist_musicians** → Policy names follow the existing project convention: `<table>_<action>_<role>` (e.g., `setlist_musicians_insert_music_director`), consistent with patterns in `20260424000001_rls_music_director_mutations.sql`.
