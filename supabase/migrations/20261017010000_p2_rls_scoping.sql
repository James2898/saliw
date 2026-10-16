-- Migration: 20261017010000_p2_rls_scoping.sql
-- Description: Phase P2 RLS scoping & atomic reordering RPC
-- 1. Scope setlists, setlist_songs, and setlist_musicians SELECT policies so private setlists are visible only to owner (leader_id) or music_director
-- 2. Restrict public/anon access to musician notes and created_by via column-level security and public view
-- 3. Add atomic setlist reordering stored procedure (reorder_setlist_songs)

-- ── 1. Setlists SELECT Policy Scoping ──────────────────────────────────────────

DROP POLICY IF EXISTS "setlists_select_public_or_authenticated" ON public.setlists;
DROP POLICY IF EXISTS "setlists_select_scoped" ON public.setlists;

CREATE POLICY "setlists_select_scoped"
  ON public.setlists FOR SELECT
  USING (
    is_public = true
    OR leader_id = auth.uid()
    OR public.is_music_director()
  );

-- ── 2. Setlist Songs SELECT Policy Scoping ─────────────────────────────────────

DROP POLICY IF EXISTS "setlist_songs_select_public_or_authenticated" ON public.setlist_songs;
DROP POLICY IF EXISTS "setlist_songs_select_scoped" ON public.setlist_songs;

CREATE POLICY "setlist_songs_select_scoped"
  ON public.setlist_songs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.setlists
      WHERE setlists.id = setlist_songs.setlist_id
        AND (
          setlists.is_public = true
          OR setlists.leader_id = auth.uid()
          OR public.is_music_director()
        )
    )
  );

-- ── 3. Setlist Musicians SELECT Policy Scoping ─────────────────────────────────

DROP POLICY IF EXISTS "setlist_musicians_select_public" ON public.setlist_musicians;
DROP POLICY IF EXISTS "setlist_musicians_select_scoped" ON public.setlist_musicians;

CREATE POLICY "setlist_musicians_select_scoped"
  ON public.setlist_musicians FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.setlists
      WHERE setlists.id = setlist_musicians.setlist_id
        AND (
          setlists.is_public = true
          OR setlists.leader_id = auth.uid()
          OR public.is_music_director()
        )
    )
  );

-- ── 4. Musician Public Column-Level Protection & View ─────────────────────────

-- Restrict unauthenticated 'anon' role from reading notes and created_by
REVOKE SELECT ON public.musicians FROM anon;
GRANT SELECT (id, name) ON public.musicians TO anon;
GRANT SELECT ON public.musicians TO authenticated;

-- Provide public view for unauthenticated lineup queries
CREATE OR REPLACE VIEW public.public_musicians AS
  SELECT id, name FROM public.musicians;
GRANT SELECT ON public.public_musicians TO anon, authenticated;

-- ── 5. Atomic Setlist Song Reordering RPC ──────────────────────────────────────

CREATE OR REPLACE FUNCTION public.reorder_setlist_songs(
  p_setlist_id uuid,
  p_song_orders jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  item jsonb;
BEGIN
  IF NOT (
    EXISTS (
      SELECT 1 FROM public.setlists
      WHERE id = p_setlist_id AND (leader_id = auth.uid() OR public.is_music_director())
    )
  ) THEN
    RAISE EXCEPTION 'Unauthorized to reorder this setlist' USING ERRCODE = '42501';
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(p_song_orders)
  LOOP
    UPDATE public.setlist_songs
    SET order_index = (item->>'order_index')::integer
    WHERE id = (item->>'id')::uuid
      AND setlist_id = p_setlist_id;
  END LOOP;
END;
$$;
