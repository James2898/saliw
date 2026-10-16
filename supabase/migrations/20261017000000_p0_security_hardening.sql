-- Migration: 20261017000000_p0_security_hardening.sql
-- Description: TASK-050 P0 Immediate Security Hardening
-- 1. Sets default role on public.profiles to 'member' (AC-4)
-- 2. Prevents tampering of role and email columns on public.profiles by non-service-role users (AC-5)

-- AC-4: Default role to 'member'
ALTER TABLE public.profiles
  ALTER COLUMN role SET DEFAULT 'member';

-- AC-5: Function and trigger to prevent role and email tampering
CREATE OR REPLACE FUNCTION public.prevent_profile_role_email_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF (NEW.role IS DISTINCT FROM OLD.role OR NEW.email IS DISTINCT FROM OLD.email)
     AND (auth.jwt() ->> 'role' IS DISTINCT FROM 'service_role')
     AND (current_user NOT IN ('postgres', 'supabase_admin')) THEN
    RAISE EXCEPTION 'Unauthorized: modifying role or email is not permitted'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_protect_profiles_role_email ON public.profiles;

CREATE TRIGGER tr_protect_profiles_role_email
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_role_email_tampering();
