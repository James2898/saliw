-- Create the setlists table
CREATE TABLE IF NOT EXISTS public.setlists (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL,
  date       timestamptz NOT NULL,
  leader_id  uuid        REFERENCES auth.users (id) ON DELETE CASCADE,
  is_public  boolean     NOT NULL DEFAULT false
);

-- Enable Row Level Security
ALTER TABLE public.setlists ENABLE ROW LEVEL SECURITY;

-- SELECT: all authenticated users may read setlists
CREATE POLICY "setlists_select_authenticated"
  ON public.setlists
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- INSERT: any authenticated user may create a setlist (leader_id is set to auth.uid() in the action)
CREATE POLICY "setlists_insert_authenticated"
  ON public.setlists
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND leader_id = auth.uid());

-- UPDATE: only the setlist leader may update
CREATE POLICY "setlists_update_leader"
  ON public.setlists
  FOR UPDATE
  USING (leader_id = auth.uid())
  WITH CHECK (leader_id = auth.uid());

-- DELETE: only the setlist leader may delete
CREATE POLICY "setlists_delete_leader"
  ON public.setlists
  FOR DELETE
  USING (leader_id = auth.uid());
