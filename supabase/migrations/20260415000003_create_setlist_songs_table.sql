-- Create the setlist_songs junction table
CREATE TABLE IF NOT EXISTS public.setlist_songs (
  id              uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  setlist_id      uuid    NOT NULL REFERENCES public.setlists (id) ON DELETE CASCADE,
  song_id         uuid    NOT NULL REFERENCES public.songs (id) ON DELETE CASCADE,
  order_index     integer NOT NULL,
  performance_key text    NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.setlist_songs ENABLE ROW LEVEL SECURITY;

-- SELECT: authenticated users may read setlist_songs if the parent setlist is accessible
CREATE POLICY "setlist_songs_select_authenticated"
  ON public.setlist_songs
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.setlists
      WHERE setlists.id = setlist_songs.setlist_id
    )
  );

-- INSERT: only the leader of the associated setlist may add songs
CREATE POLICY "setlist_songs_insert_leader"
  ON public.setlist_songs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.setlists
      WHERE setlists.id = setlist_songs.setlist_id
        AND setlists.leader_id = auth.uid()
    )
  );

-- UPDATE: only the leader of the associated setlist may update entries (e.g., reorder)
CREATE POLICY "setlist_songs_update_leader"
  ON public.setlist_songs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.setlists
      WHERE setlists.id = setlist_songs.setlist_id
        AND setlists.leader_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.setlists
      WHERE setlists.id = setlist_songs.setlist_id
        AND setlists.leader_id = auth.uid()
    )
  );

-- DELETE: only the leader of the associated setlist may remove entries
CREATE POLICY "setlist_songs_delete_leader"
  ON public.setlist_songs
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.setlists
      WHERE setlists.id = setlist_songs.setlist_id
        AND setlists.leader_id = auth.uid()
    )
  );
