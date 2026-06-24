
-- Add proper FK constraints to job_matches so cascaded deletes are handled.
-- ON DELETE SET NULL: a deleted job makes the match stale but doesn't wipe the
-- match row itself (useful for audit/history). The matching logic must already
-- handle nullable job_id / external_job_id gracefully.

ALTER TABLE public.job_matches
  ADD CONSTRAINT job_matches_job_id_fkey
    FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE SET NULL;

ALTER TABLE public.job_matches
  ADD CONSTRAINT job_matches_external_job_id_fkey
    FOREIGN KEY (external_job_id) REFERENCES public.external_jobs(id) ON DELETE SET NULL;
