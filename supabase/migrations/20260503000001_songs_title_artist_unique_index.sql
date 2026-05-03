-- Migration: Add a composite UNIQUE INDEX on (title, artist) for the songs table.
--
-- Purpose: Support `INSERT ... ON CONFLICT (title, artist) DO UPDATE` semantics used
-- by bulk import scripts (e.g., the English Hymnal seed in scripts/import-hymns.ts).
-- Without this index, Supabase upsert with `onConflict: 'title,artist'` cannot resolve
-- target rows.
--
-- RLS implications: NONE. This migration creates only a metadata-level constraint
-- index — no DML, no policy changes, no row visibility changes. The existing RLS
-- policies on public.songs (songs_select_authenticated, songs_insert_music_director,
-- songs_update_music_director, songs_delete_music_director, plus the public read
-- override added in 20260418000003_allow_public_read_songs.sql) remain untouched.
--
-- BUG-011 guard: explicitly verified that this index does not widen any access path
-- and does not require accompanying policy edits.

CREATE UNIQUE INDEX IF NOT EXISTS songs_title_artist_unique
  ON public.songs (title, artist);
