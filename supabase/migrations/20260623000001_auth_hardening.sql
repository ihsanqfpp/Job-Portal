
-- ============ AUTH HARDENING ============

-- 1. Belt-and-suspenders: revoke write privileges on user_roles from authenticated.
--    The original migration granted only SELECT; this revision makes the intent
--    explicit and survives accidental future GRANT migrations.
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM authenticated;

-- 2. Enforce RLS even for the table owner (supabase_admin role).
--    service_role still bypasses RLS (intentional for server-side admin ops).
ALTER TABLE public.user_roles FORCE ROW LEVEL SECURITY;

-- 3. Fix companies_update_own: the original WITH CHECK used a self-referential
--    subquery to freeze is_approved. Replace with a BEFORE UPDATE trigger that
--    uses OLD.is_approved — unambiguous across all isolation levels.
DROP POLICY IF EXISTS "companies_update_own" ON public.companies;

CREATE POLICY "companies_update_own" ON public.companies
  FOR UPDATE TO authenticated
  USING  (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE OR REPLACE FUNCTION public.prevent_approval_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.is_approved IS DISTINCT FROM NEW.is_approved
    AND NOT public.has_role(auth.uid(), 'admin')
  THEN
    RAISE EXCEPTION 'forbidden: only admins can change is_approved';
  END IF;
  RETURN NEW;
END; $$;

REVOKE EXECUTE ON FUNCTION public.prevent_approval_change() FROM public, anon, authenticated;

CREATE TRIGGER companies_prevent_approval_change
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.prevent_approval_change();
