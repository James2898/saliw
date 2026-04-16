-- Helper function: returns true if the current user has the music_director role.
-- Stored in public.profiles.role (not in the JWT).
-- Used by INSERT/UPDATE/DELETE policies on the songs table.
CREATE OR REPLACE FUNCTION public.is_music_director()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'music_director'
  );
$$;

-- Create the songs table
CREATE TABLE IF NOT EXISTS public.songs (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text        NOT NULL,
  artist       text        NOT NULL,
  original_key text        NOT NULL,
  content      text        NOT NULL,
  created_by   uuid        REFERENCES auth.users (id) ON DELETE SET NULL
);

-- Enable Row Level Security
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;

-- SELECT: all authenticated users may read songs
DROP POLICY IF EXISTS "songs_select_authenticated" ON public.songs;
CREATE POLICY "songs_select_authenticated"
  ON public.songs
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- INSERT: only music_directors may create songs
DROP POLICY IF EXISTS "songs_insert_music_director" ON public.songs;
CREATE POLICY "songs_insert_music_director"
  ON public.songs
  FOR INSERT
  WITH CHECK (public.is_music_director());

-- UPDATE: only music_directors may update songs
DROP POLICY IF EXISTS "songs_update_music_director" ON public.songs;
CREATE POLICY "songs_update_music_director"
  ON public.songs
  FOR UPDATE
  USING (public.is_music_director())
  WITH CHECK (public.is_music_director());

-- DELETE: only music_directors may delete songs
DROP POLICY IF EXISTS "songs_delete_music_director" ON public.songs;
CREATE POLICY "songs_delete_music_director"
  ON public.songs
  FOR DELETE
  USING (public.is_music_director());
