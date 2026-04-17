-- Migration: Add singer and default_key columns to public.songs
-- Both columns are nullable with no default; existing rows get NULL and no backfill is required.

ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS singer text;
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS default_key text;
