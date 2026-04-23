-- Migration: replace leader_id-based mutation policies with music_director role check
--
-- Previously, UPDATE/DELETE on setlists and INSERT/UPDATE/DELETE on setlist_songs
-- required auth.uid() = leader_id. This locked out other music directors.
-- New rule: any user with role = 'music_director' in public.profiles may mutate
-- any setlist or its songs.

-- ── Helper function ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_music_director()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'music_director'
  );
$$;

-- ── setlists ───────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "setlists_update_leader" ON public.setlists;
DROP POLICY IF EXISTS "setlists_delete_leader" ON public.setlists;
DROP POLICY IF EXISTS "setlists_insert_authenticated" ON public.setlists;

CREATE POLICY "setlists_insert_music_director"
  ON public.setlists
  FOR INSERT
  WITH CHECK (public.is_music_director());

CREATE POLICY "setlists_update_music_director"
  ON public.setlists
  FOR UPDATE
  USING (public.is_music_director())
  WITH CHECK (public.is_music_director());

CREATE POLICY "setlists_delete_music_director"
  ON public.setlists
  FOR DELETE
  USING (public.is_music_director());

-- ── setlist_songs ──────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "setlist_songs_insert_leader" ON public.setlist_songs;
DROP POLICY IF EXISTS "setlist_songs_update_leader" ON public.setlist_songs;
DROP POLICY IF EXISTS "setlist_songs_delete_leader" ON public.setlist_songs;

CREATE POLICY "setlist_songs_insert_music_director"
  ON public.setlist_songs
  FOR INSERT
  WITH CHECK (public.is_music_director());

CREATE POLICY "setlist_songs_update_music_director"
  ON public.setlist_songs
  FOR UPDATE
  USING (public.is_music_director())
  WITH CHECK (public.is_music_director());

CREATE POLICY "setlist_songs_delete_music_director"
  ON public.setlist_songs
  FOR DELETE
  USING (public.is_music_director());
