-- Backfill profile rows for users created via Google OAuth (or any other
-- provider) BEFORE the handle_new_user trigger was in place.
--
-- onboarding_completed is set to TRUE for users who already have a role in
-- user_roles (they completed onboarding) and FALSE for brand-new users.

INSERT INTO public.profiles (id, email, full_name, onboarding_completed)
SELECT
  u.id,
  u.email,
  COALESCE(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    split_part(u.email, '@', 1)
  ),
  EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id)
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;

-- Harden complete_onboarding: use UPSERT instead of UPDATE so users whose
-- profile was never auto-created still get one when they finish onboarding.
CREATE OR REPLACE FUNCTION public.complete_onboarding(_role public.app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _role NOT IN ('seeker'::public.app_role, 'employer'::public.app_role) THEN
    RAISE EXCEPTION 'invalid role: must be seeker or employer';
  END IF;

  DELETE FROM public.user_roles WHERE user_id = auth.uid();

  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), _role)
  ON CONFLICT DO NOTHING;

  -- UPSERT: creates profile if missing, otherwise just flips the flag.
  INSERT INTO public.profiles (id, email, full_name, onboarding_completed)
  VALUES (
    auth.uid(),
    COALESCE(auth.email(), ''),
    COALESCE(
      auth.jwt() -> 'user_metadata' ->> 'full_name',
      auth.jwt() -> 'user_metadata' ->> 'name',
      split_part(COALESCE(auth.email(), ''), '@', 1)
    ),
    true
  )
  ON CONFLICT (id) DO UPDATE SET onboarding_completed = true;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_onboarding(public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_onboarding(public.app_role) TO authenticated;
