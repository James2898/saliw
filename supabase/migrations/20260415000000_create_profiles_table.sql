-- Create the profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id        uuid        PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email     text        NOT NULL UNIQUE,
  full_name text,
  role      text        NOT NULL DEFAULT 'music_director'
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- SELECT: each user can read only their own row
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- UPDATE: each user can update only their own row
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Column-level defense in depth:
-- Prevent role and email from being updated even via a direct Supabase call.
-- Grant UPDATE only on full_name to the authenticated role.
REVOKE UPDATE (role, email) ON public.profiles FROM authenticated;
-- If REVOKE granularity is not supported in your Supabase tier, use the alternative below.
-- Alternative (grant-only pattern):
--   REVOKE ALL ON public.profiles FROM authenticated;
--   GRANT SELECT ON public.profiles TO authenticated;
--   GRANT UPDATE (full_name) ON public.profiles TO authenticated;
