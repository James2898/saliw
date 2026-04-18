-- Migration: Add singer column to public.songs
-- Column is nullable with no default; existing rows get NULL and no backfill is required.

ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS singer text;
