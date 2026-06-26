-- Replaces the service-role approach for onboarding with a scoped
-- SECURITY DEFINER function callable by any authenticated user.
--
-- Security guarantees enforced inside the database, not the application:
--   • _role must be seeker or employer (no admin self-assignment)
--   • All writes are scoped to auth.uid() — users cannot touch other rows
--   • REVOKE ALL from PUBLIC; only authenticated role can EXECUTE
--
-- The application no longer needs SUPABASE_SERVICE_ROLE_KEY for onboarding.

CREATE OR REPLACE FUNCTION public.complete_onboarding(_role public.app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Prevent self-promotion to admin
  IF _role NOT IN ('seeker'::public.app_role, 'employer'::public.app_role) THEN
    RAISE EXCEPTION 'invalid role: must be seeker or employer';
  END IF;

  -- Replace any previously assigned role (trigger may have pre-seeded one)
  DELETE FROM public.user_roles WHERE user_id = auth.uid();

  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), _role)
  ON CONFLICT DO NOTHING;

  UPDATE public.profiles
  SET onboarding_completed = true
  WHERE id = auth.uid();
END;
$$;

-- Tight permission: revoke from PUBLIC (default), grant only to authenticated
REVOKE ALL ON FUNCTION public.complete_onboarding(public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_onboarding(public.app_role) TO authenticated;
