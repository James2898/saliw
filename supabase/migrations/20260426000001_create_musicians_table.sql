-- Migration: Create public.musicians table
-- Introduces a reusable musician roster for the worship portal.
-- public.is_music_director() and public.set_updated_at() already exist — not redefined here.

CREATE TABLE IF NOT EXISTS public.musicians (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL CHECK (length(trim(name)) > 0),
  notes      text        NULL,
  created_by uuid        NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS musicians_name_idx ON public.musicians (lower(name));

-- ── Row Level Security ─────────────────────────────────────────────────────────

ALTER TABLE public.musicians ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "musicians_select_authenticated" ON public.musicians;
CREATE POLICY "musicians_select_authenticated"
  ON public.musicians FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "musicians_insert_music_director" ON public.musicians;
CREATE POLICY "musicians_insert_music_director"
  ON public.musicians FOR INSERT
  WITH CHECK (public.is_music_director());

DROP POLICY IF EXISTS "musicians_update_music_director" ON public.musicians;
CREATE POLICY "musicians_update_music_director"
  ON public.musicians FOR UPDATE
  USING (public.is_music_director())
  WITH CHECK (public.is_music_director());

DROP POLICY IF EXISTS "musicians_delete_music_director" ON public.musicians;
CREATE POLICY "musicians_delete_music_director"
  ON public.musicians FOR DELETE
  USING (public.is_music_director());

-- ── updated_at trigger ─────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS musicians_set_updated_at ON public.musicians;
CREATE TRIGGER musicians_set_updated_at
  BEFORE UPDATE ON public.musicians
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
