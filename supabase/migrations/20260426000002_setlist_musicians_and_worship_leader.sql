-- Migration: Add worship_leader_id to setlists, create setlist_musicians junction table,
-- and drop the deprecated singer column from setlist_songs.
--
-- NOTE: setlists.leader_id is the auth-user owner; setlists.worship_leader_id is the musician roster row. Intentionally distinct.
--
-- PRE-FLIGHT QUERY (MUST be run and reviewed before executing this migration):
--   SELECT id, song_id, singer FROM public.setlist_songs WHERE singer IS NOT NULL;
--
-- Any rows returned by the pre-flight query represent singer data that will be
-- permanently deleted by the DROP COLUMN statement at the end of this migration.
-- If rows are returned, the operator must make a deliberate decision —
-- export the data, migrate it to setlist_musicians, or accept the loss —
-- before proceeding.

-- ── setlists: add worship_leader_id FK ────────────────────────────────────────

ALTER TABLE public.setlists
  ADD COLUMN IF NOT EXISTS worship_leader_id uuid NULL REFERENCES public.musicians(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS setlists_worship_leader_id_idx ON public.setlists (worship_leader_id);

-- ── setlist_musicians junction table ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.setlist_musicians (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  setlist_id  uuid        NOT NULL REFERENCES public.setlists(id) ON DELETE CASCADE,
  musician_id uuid        NOT NULL REFERENCES public.musicians(id) ON DELETE CASCADE,
  instrument  text        NOT NULL CHECK (length(trim(instrument)) > 0),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Case-insensitive uniqueness: one instrument entry per musician per setlist.
-- PostgreSQL does not allow expression columns in inline UNIQUE clauses within
-- CREATE TABLE, so this is enforced via a unique index instead.
CREATE UNIQUE INDEX IF NOT EXISTS setlist_musicians_unique_instrument_idx
  ON public.setlist_musicians (setlist_id, musician_id, lower(instrument));

CREATE INDEX IF NOT EXISTS setlist_musicians_setlist_id_idx ON public.setlist_musicians (setlist_id);
CREATE INDEX IF NOT EXISTS setlist_musicians_musician_id_idx ON public.setlist_musicians (musician_id);

-- ── Row Level Security ─────────────────────────────────────────────────────────

ALTER TABLE public.setlist_musicians ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "setlist_musicians_select_authenticated" ON public.setlist_musicians;
CREATE POLICY "setlist_musicians_select_authenticated"
  ON public.setlist_musicians FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "setlist_musicians_insert_music_director" ON public.setlist_musicians;
CREATE POLICY "setlist_musicians_insert_music_director"
  ON public.setlist_musicians FOR INSERT
  WITH CHECK (public.is_music_director());

DROP POLICY IF EXISTS "setlist_musicians_update_music_director" ON public.setlist_musicians;
CREATE POLICY "setlist_musicians_update_music_director"
  ON public.setlist_musicians FOR UPDATE
  USING (public.is_music_director())
  WITH CHECK (public.is_music_director());

DROP POLICY IF EXISTS "setlist_musicians_delete_music_director" ON public.setlist_musicians;
CREATE POLICY "setlist_musicians_delete_music_director"
  ON public.setlist_musicians FOR DELETE
  USING (public.is_music_director());

-- ── updated_at trigger ─────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS setlist_musicians_set_updated_at ON public.setlist_musicians;
CREATE TRIGGER setlist_musicians_set_updated_at
  BEFORE UPDATE ON public.setlist_musicians
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Drop deprecated singer column from setlist_songs ──────────────────────────
-- Placed last so all table/index/policy/trigger statements above are applied first.
-- Only setlist_songs.singer is dropped. public.songs.singer is NOT affected.

ALTER TABLE public.setlist_songs DROP COLUMN IF EXISTS singer;
