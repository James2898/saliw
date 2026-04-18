-- Allow unauthenticated (public) users to read songs.
-- Replaces the authenticated-only SELECT policy so the library page
-- is accessible without login.
DROP POLICY IF EXISTS "songs_select_authenticated" ON public.songs;
CREATE POLICY "songs_select_public"
  ON public.songs
  FOR SELECT
  USING (true);
