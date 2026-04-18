-- Migration: Add singer column to public.setlist_songs
-- Nullable; no default. Existing rows receive NULL. No backfill required.
ALTER TABLE public.setlist_songs ADD COLUMN IF NOT EXISTS singer TEXT;
