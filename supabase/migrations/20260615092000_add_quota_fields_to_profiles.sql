-- Add billing and quota fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN plan text NOT NULL DEFAULT 'free',
  ADD COLUMN ai_requests_used jsonb NOT NULL DEFAULT '{"ats_analyses": 0, "resume_rewrites": 0, "job_matches": 0, "coach_messages": 0}'::jsonb,
  ADD COLUMN ai_requests_limit jsonb NOT NULL DEFAULT '{"ats_analyses": 5, "resume_rewrites": 3, "job_matches": 10, "coach_messages": 50}'::jsonb,
  ADD COLUMN current_period_start timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN current_period_end timestamptz NOT NULL DEFAULT (now() + interval '30 days');
