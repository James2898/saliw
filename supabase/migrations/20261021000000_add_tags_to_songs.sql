-- Migration: 20261021000000_add_tags_to_songs.sql
-- Description: Add tags column to public.songs for vibe & genre categorization (Epic 2 prerequisite)

-- 1. Add tags column: text[] NOT NULL DEFAULT '{}'::text[]
ALTER TABLE public.songs
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}'::text[];

-- 2. GIN index for efficient array containment filtering (tags @> ARRAY['joyful'])
CREATE INDEX IF NOT EXISTS idx_songs_tags ON public.songs USING gin (tags);

-- 3. RLS policy verification:
-- Existing policies on public.songs:
--   - "songs_select_public" (FOR SELECT USING (true)) allows public read access to all columns, including tags.
--   - "songs_insert_music_director" (FOR INSERT WITH CHECK (public.is_music_director())) allows directors to set tags.
--   - "songs_update_music_director" (FOR UPDATE USING (public.is_music_director()) WITH CHECK (public.is_music_director())) allows directors to update tags.
-- No additional RLS policies are needed.
