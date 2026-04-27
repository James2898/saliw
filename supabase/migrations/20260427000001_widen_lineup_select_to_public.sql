-- Migration: Widen SELECT policies on musicians and setlist_musicians to public read.
-- Previously these tables were restricted to authenticated users only, which silently
-- hid the worship leader and lineup from unauthenticated visitors to the setlist viewer.
-- INSERT / UPDATE / DELETE policies are unchanged.

-- ── musicians: replace authenticated-only SELECT with public read ──────────────
-- Intentional: musicians are a public roster; only id and name are projected by the app.

DROP POLICY IF EXISTS "musicians_select_authenticated" ON public.musicians;
CREATE POLICY "musicians_select_public"
  ON public.musicians FOR SELECT
  TO public
  USING (true);

-- ── setlist_musicians: scope SELECT to setlists that are public or accessed by authenticated users ──────

DROP POLICY IF EXISTS "setlist_musicians_select_authenticated" ON public.setlist_musicians;
CREATE POLICY "setlist_musicians_select_public"
  ON public.setlist_musicians FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.setlists
      WHERE setlists.id = setlist_musicians.setlist_id
        AND (setlists.is_public = true OR auth.role() = 'authenticated')
    )
  );
