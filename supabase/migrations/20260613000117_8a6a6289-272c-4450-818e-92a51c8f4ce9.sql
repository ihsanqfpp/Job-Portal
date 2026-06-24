
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('seeker','employer','admin');
CREATE TYPE public.company_size AS ENUM ('1-10','11-50','51-200','201-500','500+');
CREATE TYPE public.job_type AS ENUM ('full-time','part-time','remote','hybrid','contract','internship');
CREATE TYPE public.experience_level AS ENUM ('entry','junior','mid','senior','lead');
CREATE TYPE public.job_status AS ENUM ('open','closed','expired');
CREATE TYPE public.application_status AS ENUM ('pending','reviewed','hired','rejected');

-- ============ HELPER: updated_at ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text UNIQUE NOT NULL,
  avatar_url text,
  bio text,
  skills text[] NOT NULL DEFAULT '{}',
  resume_url text,
  resume_filename text,
  location text,
  website text,
  is_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_read_all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_insert_self" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ USER ROLES (security-critical, separate table) ============
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_read_own" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.app_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.user_roles WHERE user_id = auth.uid() ORDER BY
    CASE role WHEN 'admin' THEN 1 WHEN 'employer' THEN 2 ELSE 3 END LIMIT 1
$$;

-- Admin can read user_roles
CREATE POLICY "user_roles_admin_all" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ AUTO-CREATE PROFILE ON SIGNUP ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _role public.app_role;
  _full_name text;
BEGIN
  _full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1));
  _role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'seeker'::public.app_role);
  -- admins must be assigned manually; never via signup
  IF _role = 'admin' THEN _role := 'seeker'; END IF;

  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, _full_name)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ COMPANIES ============
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  logo_url text,
  website text,
  industry text,
  size public.company_size,
  description text,
  is_approved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT SELECT ON public.companies TO anon;
GRANT ALL ON public.companies TO service_role;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "companies_read_approved" ON public.companies FOR SELECT USING (is_approved = true);
CREATE POLICY "companies_read_own" ON public.companies FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "companies_admin_read" ON public.companies FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "companies_insert_own" ON public.companies FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid() AND public.has_role(auth.uid(),'employer'));
CREATE POLICY "companies_update_own" ON public.companies FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid() AND is_approved = (SELECT is_approved FROM public.companies WHERE id = companies.id));
CREATE POLICY "companies_admin_update" ON public.companies FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "companies_admin_delete" ON public.companies FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ CATEGORIES ============
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL,
  icon text,
  job_count integer NOT NULL DEFAULT 0
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories_read_all" ON public.categories FOR SELECT USING (true);
CREATE POLICY "categories_admin_write" ON public.categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ JOBS ============
CREATE TABLE public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  posted_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  location text NOT NULL,
  type public.job_type NOT NULL,
  category text NOT NULL,
  experience_level public.experience_level NOT NULL,
  salary_min integer,
  salary_max integer,
  salary_currency text NOT NULL DEFAULT 'USD',
  skills_required text[] NOT NULL DEFAULT '{}',
  status public.job_status NOT NULL DEFAULT 'open',
  expires_at timestamptz NOT NULL,
  views integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT SELECT ON public.jobs TO anon;
GRANT ALL ON public.jobs TO service_role;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jobs_read_public" ON public.jobs FOR SELECT USING (status = 'open' AND expires_at > now());
CREATE POLICY "jobs_read_own" ON public.jobs FOR SELECT TO authenticated USING (posted_by = auth.uid());
CREATE POLICY "jobs_admin_read" ON public.jobs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "jobs_insert_employer" ON public.jobs FOR INSERT TO authenticated WITH CHECK (
  posted_by = auth.uid()
  AND public.has_role(auth.uid(),'employer')
  AND EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_id = auth.uid() AND c.is_approved = true)
);
CREATE POLICY "jobs_update_own" ON public.jobs FOR UPDATE TO authenticated USING (posted_by = auth.uid()) WITH CHECK (posted_by = auth.uid());
CREATE POLICY "jobs_admin_update" ON public.jobs FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "jobs_delete_own" ON public.jobs FOR DELETE TO authenticated USING (posted_by = auth.uid());
CREATE POLICY "jobs_admin_delete" ON public.jobs FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE INDEX jobs_status_expires_category_idx ON public.jobs(status, expires_at, category);
CREATE INDEX jobs_posted_by_status_idx ON public.jobs(posted_by, status);
CREATE INDEX jobs_search_idx ON public.jobs USING gin (to_tsvector('english', title || ' ' || description));
CREATE TRIGGER jobs_updated_at BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- expiry validation trigger (cannot use CHECK with now())
CREATE OR REPLACE FUNCTION public.validate_job_expiry()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.expires_at <= now() THEN
    RAISE EXCEPTION 'expires_at must be in the future';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER jobs_validate_expiry BEFORE INSERT ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.validate_job_expiry();

-- atomically increment job views
CREATE OR REPLACE FUNCTION public.increment_job_views(_job_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.jobs SET views = views + 1 WHERE id = _job_id;
$$;
GRANT EXECUTE ON FUNCTION public.increment_job_views(uuid) TO anon, authenticated;

-- category counting trigger
CREATE OR REPLACE FUNCTION public.update_category_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.categories SET job_count = job_count + 1 WHERE slug = NEW.category OR name = NEW.category;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.categories SET job_count = GREATEST(job_count - 1, 0) WHERE slug = OLD.category OR name = OLD.category;
  END IF;
  RETURN NULL;
END; $$;
CREATE TRIGGER jobs_count_categories AFTER INSERT OR DELETE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.update_category_count();

-- ============ APPLICATIONS ============
CREATE TABLE public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  applicant_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  resume_url text NOT NULL,
  cover_letter text,
  status public.application_status NOT NULL DEFAULT 'pending',
  applied_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(job_id, applicant_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.applications TO authenticated;
GRANT ALL ON public.applications TO service_role;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "applications_seeker_read_own" ON public.applications FOR SELECT TO authenticated USING (applicant_id = auth.uid());
CREATE POLICY "applications_employer_read_their_jobs" ON public.applications FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.posted_by = auth.uid())
);
CREATE POLICY "applications_admin_read" ON public.applications FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "applications_seeker_insert" ON public.applications FOR INSERT TO authenticated WITH CHECK (
  applicant_id = auth.uid() AND public.has_role(auth.uid(),'seeker')
);
CREATE POLICY "applications_seeker_delete_own" ON public.applications FOR DELETE TO authenticated USING (applicant_id = auth.uid());
CREATE POLICY "applications_employer_update_status" ON public.applications FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.posted_by = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.posted_by = auth.uid())
);
CREATE INDEX applications_job_status_idx ON public.applications(job_id, status);
CREATE INDEX applications_applicant_idx ON public.applications(applicant_id, applied_at DESC);

-- ============ SAVED JOBS ============
CREATE TABLE public.saved_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  saved_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, job_id)
);
GRANT SELECT, INSERT, DELETE ON public.saved_jobs TO authenticated;
GRANT ALL ON public.saved_jobs TO service_role;
ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "saved_jobs_own" ON public.saved_jobs FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX saved_jobs_user_idx ON public.saved_jobs(user_id);

-- ============ admin helper functions ============
CREATE OR REPLACE FUNCTION public.approve_company(_company_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.companies SET is_approved = true WHERE id = _company_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.approve_company(uuid) TO authenticated;

-- mark expired jobs (callable by cron or app)
CREATE OR REPLACE FUNCTION public.mark_expired_jobs()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.jobs SET status = 'expired' WHERE status = 'open' AND expires_at <= now();
$$;
GRANT EXECUTE ON FUNCTION public.mark_expired_jobs() TO authenticated, service_role;
