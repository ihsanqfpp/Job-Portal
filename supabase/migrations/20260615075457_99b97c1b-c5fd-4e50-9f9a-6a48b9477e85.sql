
-- Resume versions
CREATE TABLE public.resume_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_url text,
  filename text,
  parsed_text text NOT NULL,
  ats_score integer,
  readiness_score integer,
  missing_keywords text[] NOT NULL DEFAULT '{}',
  skill_gaps text[] NOT NULL DEFAULT '{}',
  detected_skills text[] NOT NULL DEFAULT '{}',
  summary text,
  suggestions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX resume_versions_user_idx ON public.resume_versions(user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resume_versions TO authenticated;
GRANT ALL ON public.resume_versions TO service_role;
ALTER TABLE public.resume_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rv_owner_all" ON public.resume_versions FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Resume rewrites
CREATE TABLE public.resume_rewrites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id uuid NOT NULL REFERENCES public.resume_versions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  improved_summary text,
  rewritten_bullets jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX resume_rewrites_user_idx ON public.resume_rewrites(user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resume_rewrites TO authenticated;
GRANT ALL ON public.resume_rewrites TO service_role;
ALTER TABLE public.resume_rewrites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rr_owner_all" ON public.resume_rewrites FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Job matches cache
CREATE TABLE public.job_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id uuid,
  external_job_id uuid,
  score integer NOT NULL,
  rationale text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX job_matches_user_idx ON public.job_matches(user_id, score DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_matches TO authenticated;
GRANT ALL ON public.job_matches TO service_role;
ALTER TABLE public.job_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jm_owner_all" ON public.job_matches FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Coach threads
CREATE TABLE public.coach_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'New conversation',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX coach_threads_user_idx ON public.coach_threads(user_id, updated_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_threads TO authenticated;
GRANT ALL ON public.coach_threads TO service_role;
ALTER TABLE public.coach_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ct_owner_all" ON public.coach_threads FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Coach messages
CREATE TABLE public.coach_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.coach_threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant','system')),
  parts jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX coach_messages_thread_idx ON public.coach_messages(thread_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_messages TO authenticated;
GRANT ALL ON public.coach_messages TO service_role;
ALTER TABLE public.coach_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cm_owner_all" ON public.coach_messages FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Activity log
CREATE TABLE public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX activity_log_user_idx ON public.activity_log(user_id, created_at DESC);
GRANT SELECT, INSERT ON public.activity_log TO authenticated;
GRANT ALL ON public.activity_log TO service_role;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "al_owner_read" ON public.activity_log FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "al_owner_insert" ON public.activity_log FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Shared reports (publicly readable)
CREATE TABLE public.shared_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  version_id uuid NOT NULL REFERENCES public.resume_versions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);
CREATE INDEX shared_reports_user_idx ON public.shared_reports(user_id);
GRANT SELECT ON public.shared_reports TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.shared_reports TO authenticated;
GRANT ALL ON public.shared_reports TO service_role;
ALTER TABLE public.shared_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sr_public_read" ON public.shared_reports FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "sr_owner_write" ON public.shared_reports FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "sr_owner_update" ON public.shared_reports FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "sr_owner_delete" ON public.shared_reports FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- External jobs (Remotive cache)
CREATE TABLE public.external_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  source_id text NOT NULL,
  title text NOT NULL,
  company text NOT NULL,
  company_logo text,
  location text,
  job_type text,
  category text,
  url text NOT NULL,
  description text,
  salary text,
  skills text[] NOT NULL DEFAULT '{}',
  posted_at timestamptz,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, source_id)
);
CREATE INDEX external_jobs_posted_idx ON public.external_jobs(posted_at DESC);
CREATE INDEX external_jobs_category_idx ON public.external_jobs(category);
GRANT SELECT ON public.external_jobs TO anon, authenticated;
GRANT ALL ON public.external_jobs TO service_role;
ALTER TABLE public.external_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "xj_public_read" ON public.external_jobs FOR SELECT TO anon, authenticated USING (true);

-- Tracker for arbitrary jobs (internal or external) — extends applications without breaking employer flow
CREATE TABLE public.tracker_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  internal_job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  external_job_id uuid REFERENCES public.external_jobs(id) ON DELETE SET NULL,
  title text NOT NULL,
  company text,
  url text,
  stage text NOT NULL DEFAULT 'saved' CHECK (stage IN ('saved','applied','interview','offer','rejected')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tracker_items_user_idx ON public.tracker_items(user_id, updated_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tracker_items TO authenticated;
GRANT ALL ON public.tracker_items TO service_role;
ALTER TABLE public.tracker_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ti_owner_all" ON public.tracker_items FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- updated_at triggers
CREATE TRIGGER trg_coach_threads_updated BEFORE UPDATE ON public.coach_threads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_tracker_items_updated BEFORE UPDATE ON public.tracker_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
