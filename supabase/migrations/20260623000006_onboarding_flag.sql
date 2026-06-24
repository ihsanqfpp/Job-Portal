
-- Add onboarding_completed to profiles so new users are directed to role
-- selection before landing on any feature page.
--
-- Design decision: each user holds exactly ONE role chosen at onboarding.
-- completeOnboarding() server function enforces this by replacing any existing
-- role before inserting the chosen one.
--
-- Backfill: users who already have a role in user_roles are considered
-- onboarded; their flag is set to true so they are not forced through
-- the onboarding screen on next login.

ALTER TABLE public.profiles
  ADD COLUMN onboarding_completed boolean NOT NULL DEFAULT false;

UPDATE public.profiles
  SET onboarding_completed = true
  WHERE id IN (SELECT DISTINCT user_id FROM public.user_roles);

-- Allow authenticated users to read their own onboarding_completed field.
-- The existing "profiles_own" SELECT policy covers this — no additional grant.
