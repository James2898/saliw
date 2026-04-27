-- Migration: Widen SELECT policies on musicians and setlist_musicians to public read.
-- Previously these tables were restricted to authenticated users only, which silently
-- hid the worship leader and lineup from unauthenticated visitors to the setlist viewer.
-- INSERT / UPDATE / DELETE policies are unchanged.

-- ── musicians: replace authenticated-only SELECT with public read ──────────────

DROP POLICY IF EXISTS "musicians_select_authenticated" ON public.musicians;
CREATE POLICY "musicians_select_public"
  ON public.musicians FOR SELECT
  TO public
  USING (true);

-- ── setlist_musicians: replace authenticated-only SELECT with public read ──────

DROP POLICY IF EXISTS "setlist_musicians_select_authenticated" ON public.setlist_musicians;
CREATE POLICY "setlist_musicians_select_public"
  ON public.setlist_musicians FOR SELECT
  TO public
  USING (true);
