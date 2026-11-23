-- Migration: 20261116000000_create_ai_daily_quotas_table.sql
-- Description: Creates ai_daily_quotas table and RPC functions for rate-limiting AI picks.

-- 1. Create the ai_daily_quotas table
CREATE TABLE IF NOT EXISTS public.ai_daily_quotas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  usage_date date NOT NULL DEFAULT CURRENT_DATE,
  requests_count integer NOT NULL DEFAULT 0 CHECK (requests_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_daily_quotas_user_date_key UNIQUE (user_id, usage_date)
);

-- 2. Performance indexes
CREATE INDEX IF NOT EXISTS ai_daily_quotas_user_id_idx ON public.ai_daily_quotas (user_id);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.ai_daily_quotas ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Authenticated users can read only their own daily quota records
CREATE POLICY "ai_daily_quotas_select_own"
  ON public.ai_daily_quotas
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Direct client updates/deletes are revoked to prevent quota tampering;
-- all mutations execute through the security definer RPC below.
REVOKE INSERT, UPDATE, DELETE ON public.ai_daily_quotas FROM authenticated;
REVOKE ALL ON public.ai_daily_quotas FROM anon;

-- 5. Read Quota RPC (guarantees DB-consistent CURRENT_DATE)
CREATE OR REPLACE FUNCTION public.get_ai_daily_quota()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN 0;
  END IF;

  SELECT requests_count INTO v_count
  FROM public.ai_daily_quotas
  WHERE user_id = auth.uid() AND usage_date = CURRENT_DATE;

  RETURN COALESCE(v_count, 0);
END;
$$;

-- 6. Atomic Quota Increment RPC
CREATE OR REPLACE FUNCTION public.increment_ai_daily_quota()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_new_count integer;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.ai_daily_quotas (user_id, usage_date, requests_count, updated_at)
  VALUES (v_user_id, CURRENT_DATE, 1, now())
  ON CONFLICT (user_id, usage_date)
  DO UPDATE SET
    requests_count = public.ai_daily_quotas.requests_count + 1,
    updated_at = now()
  RETURNING requests_count INTO v_new_count;

  RETURN v_new_count;
END;
$$;

-- 7. Permissions on RPC functions
GRANT EXECUTE ON FUNCTION public.get_ai_daily_quota() TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_ai_daily_quota() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_ai_daily_quota() FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_ai_daily_quota() FROM anon;
