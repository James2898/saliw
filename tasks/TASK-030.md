# TASK-030 — Musicians Table & Setlist Musicians Migration

- **Tier:** 1
- **Date Created:** 2026-04-25
- **Status:** In Progress

---

## Feature Summary

Write two Supabase migration files that introduce a reusable musician roster (`public.musicians`) and link it to setlists via a junction table (`public.setlist_musicians`). Migration 1 creates the `musicians` table with full RLS (authenticated read, music_director write) and an `updated_at` trigger. Migration 2 adds a `worship_leader_id` FK column to `public.setlists`, creates the `setlist_musicians` junction table with the same RLS pattern and trigger, and drops the deprecated `singer` column from `public.setlist_songs`. A mandatory pre-flight query must be run and its results reviewed before migration 2 executes, to avoid silent data loss of any non-null `singer` values.

---

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
19. `ALTER TABLE public.setlist_songs DROP COLUMN IF EXISTS singer` is present and placed **after** all table/index/policy/trigger statements.

### Pre-flight Query (Mandatory Before Migration 2)

20. The pre-flight query `SELECT id, song_id, singer FROM setlist_songs WHERE singer IS NOT NULL;` is documented in the migration 2 file header comment as a step that MUST be run and reviewed before executing this migration, with a note that any returned rows represent data that will be permanently deleted by the `DROP COLUMN` statement.
21. If the pre-flight query returns any rows, the operator must make a deliberate decision (export, migrate to `setlist_musicians`, or accept loss) before proceeding.

### General

22. Both migration files use the exact timestamp-prefixed filenames specified (`20260426000001_...`, `20260426000002_...`). No other files are created or modified.
23. No TypeScript types, Server Actions, or UI components are created in this task.
24. The `singer` column on `public.songs` is out of scope and is NOT dropped — only `public.setlist_songs.singer` is removed.

---

## Out of Scope

- TypeScript type generation or updates
- Server Actions for creating/updating/deleting musicians or setlist_musicians
- UI components for the musician roster or setlist assignment
- Renaming `setlists.leader_id` or changing its existing FK or policies
- Dropping the `singer` column from `public.songs` (only `public.setlist_songs.singer` is dropped)
- Any changes to existing migration files

---

## Relevant Files

| File | Purpose |
|------|---------|
| `supabase/migrations/20260415000001_create_songs_table.sql` | Reference for four-policy RLS pattern (DROP POLICY IF EXISTS + CREATE POLICY for all four verbs) |
| `supabase/migrations/20260424000001_rls_music_director_mutations.sql` | Reference for latest `is_music_director()` definition and mutation policy naming convention |
| `supabase/migrations/20260424000002_add_timestamps_to_songs_and_setlists.sql` | Reference for `set_updated_at()` function and `DROP TRIGGER IF EXISTS` / `CREATE TRIGGER` idempotency pattern |
| `supabase/migrations/20260418000001_add_singer_to_setlist_songs.sql` | Confirms `singer` column exists on `public.setlist_songs` (the column to be dropped in migration 2) |
| `supabase/migrations/20260426000001_create_musicians_table.sql` | **Target file to create** — migration 1 |
| `supabase/migrations/20260426000002_setlist_musicians_and_worship_leader.sql` | **Target file to create** — migration 2 |

---

## Technical Schema

N/A — no API contract required for this task.

---

## Planning Artifacts

| Artifact | Path | Description |
|----------|------|-------------|
| Feature Specification | `tasks/TASK-030/spec.md` | Acceptance criteria + scope |
| Research Notes | `tasks/TASK-030/research.md` | Open questions + decisions (UNIQUE index resolution) |

---

## Implementation Notes

- Read `docs/coding-guidelines.md` before writing any code.
- Read `docs/tech-stack.md` before choosing any library or package.
- Read `docs/structure.md` before creating any new file or directory.
- `public.is_music_director()` and `public.set_updated_at()` already exist — do NOT redefine them in either migration file.
- Expression-based UNIQUE constraints must use `CREATE UNIQUE INDEX`, not an inline `UNIQUE (...)` clause in `CREATE TABLE`. PostgreSQL rejects expression columns (e.g., `lower(instrument)`) in inline `UNIQUE` — this would produce a parse error at migration time.
- RLS pattern: always `DROP POLICY IF EXISTS` immediately before each `CREATE POLICY` for full idempotency.
- Trigger pattern: always `DROP TRIGGER IF EXISTS <name> ON public.<table>` immediately before `CREATE TRIGGER`.
- Only `public.setlist_songs.singer` is dropped. The `singer` column on `public.songs` is untouched.
- Before executing migration 2, run the pre-flight query and record its output in the Resolution section below: `SELECT id, song_id, singer FROM setlist_songs WHERE singer IS NOT NULL;`

---

## Authoritative SQL Patterns

Copy these patterns exactly into the migration files.

### Four-policy RLS (substitute `<table>` and `<table_name>`)

```sql
ALTER TABLE public.<table> ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "<table>_select_authenticated" ON public.<table>;
CREATE POLICY "<table>_select_authenticated"
  ON public.<table> FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "<table>_insert_music_director" ON public.<table>;
CREATE POLICY "<table>_insert_music_director"
  ON public.<table> FOR INSERT
  WITH CHECK (public.is_music_director());

DROP POLICY IF EXISTS "<table>_update_music_director" ON public.<table>;
CREATE POLICY "<table>_update_music_director"
  ON public.<table> FOR UPDATE
  USING (public.is_music_director())
  WITH CHECK (public.is_music_director());

DROP POLICY IF EXISTS "<table>_delete_music_director" ON public.<table>;
CREATE POLICY "<table>_delete_music_director"
  ON public.<table> FOR DELETE
  USING (public.is_music_director());
```

### set_updated_at() trigger pattern

```sql
DROP TRIGGER IF EXISTS <table>_set_updated_at ON public.<table>;
CREATE TRIGGER <table>_set_updated_at
  BEFORE UPDATE ON public.<table>
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
```

---

## Resolution

- **Completed:** 2026-04-25
- **Branch:** develop (SQL migrations only — no TypeScript or UI changes; committed directly to develop per task instructions)
- **Base branch:** develop
- **Pre-flight query output:** The Supabase local container (`supabase_db_saliw`) was not running during implementation, so the pre-flight query could not be executed against a live database. The operator MUST run `SELECT id, song_id, singer FROM public.setlist_songs WHERE singer IS NOT NULL;` manually before applying migration 2. Any rows returned represent singer data that will be permanently deleted by the `DROP COLUMN` statement. The query is also documented in the migration 2 file header comment.
- **Files changed:**
  - `supabase/migrations/20260426000001_create_musicians_table.sql` — new migration: creates `public.musicians` table with RLS (four-policy pattern) and `set_updated_at` trigger
  - `supabase/migrations/20260426000002_setlist_musicians_and_worship_leader.sql` — new migration: adds `worship_leader_id` FK to `setlists`, creates `setlist_musicians` junction table with RLS and trigger, drops `setlist_songs.singer`
- **Notes:**
  - Neither migration redefines `public.is_music_director()` or `public.set_updated_at()` — both already exist.
  - The UNIQUE constraint on `(setlist_id, musician_id, lower(instrument))` uses `CREATE UNIQUE INDEX` (not an inline `UNIQUE` clause) because PostgreSQL does not allow expression columns in inline `UNIQUE` clauses within `CREATE TABLE`.
  - Only `public.setlist_songs.singer` is dropped. `public.songs.singer` is untouched.
  - No TypeScript types, Server Actions, or UI files were created or modified.
