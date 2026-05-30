-- Migration: Add youtube_url column to public.songs
-- Column is nullable text with no default; existing rows get NULL and no backfill is required.
-- RLS: The existing songs_update_music_director / songs_insert_music_director policies
-- (enforced via public.is_music_director()) already cover writes to all columns including
-- this new one — no additional policy changes needed.
-- The existing songs_select_public policy (USING(true)) covers reads — no policy change needed.

ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS youtube_url text;
