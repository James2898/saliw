-- Allow public read access on setlists and setlist_songs
-- Drops authenticated-only SELECT policies and replaces them with policies
-- that permit reads when is_public = true OR the caller is authenticated.

-- setlists: replace authenticated-only SELECT policy
DROP POLICY IF EXISTS "setlists_select_authenticated" ON public.setlists;
CREATE POLICY "setlists_select_public_or_authenticated"
  ON public.setlists
  FOR SELECT
  USING (is_public = true OR auth.role() = 'authenticated');

-- setlist_songs: replace authenticated-only SELECT policy
DROP POLICY IF EXISTS "setlist_songs_select_authenticated" ON public.setlist_songs;
CREATE POLICY "setlist_songs_select_public_or_authenticated"
  ON public.setlist_songs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.setlists
      WHERE setlists.id = setlist_songs.setlist_id
        AND (setlists.is_public = true OR auth.role() = 'authenticated')
    )
  );
