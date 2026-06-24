
-- Extend saved_jobs so seekers can bookmark external Remotive jobs as well as
-- internal ones.  Design rule: exactly one of (job_id, external_job_id) must be
-- non-null (XOR enforced by CHECK).
--
-- External job redirect policy: users who apply to an external job are sent to
-- the source URL (Remotive).  No application row is written to the applications
-- table for external jobs.

-- 1. Drop the old NOT NULL + UNIQUE that assumed job_id is always present.
ALTER TABLE public.saved_jobs
  ALTER COLUMN job_id DROP NOT NULL;

-- Update saved_at ordering bug: the column is saved_at, not created_at.
-- No schema change needed; this is a code-level note fixed in seeker.saved-jobs.tsx.

-- 2. Add the external_job_id column with a cascade FK.
ALTER TABLE public.saved_jobs
  ADD COLUMN external_job_id uuid REFERENCES public.external_jobs(id) ON DELETE CASCADE;

-- 3. Enforce XOR: exactly one of job_id / external_job_id must be set.
ALTER TABLE public.saved_jobs
  ADD CONSTRAINT saved_jobs_one_source_xor
    CHECK (
      (job_id IS NOT NULL)::int + (external_job_id IS NOT NULL)::int = 1
    );

-- 4. Replace the old UNIQUE(user_id, job_id) with two partial unique indexes
--    so each user can save a given internal OR external job only once.
ALTER TABLE public.saved_jobs
  DROP CONSTRAINT IF EXISTS saved_jobs_user_id_job_id_key;

CREATE UNIQUE INDEX saved_jobs_user_internal_idx
  ON public.saved_jobs(user_id, job_id)
  WHERE job_id IS NOT NULL;

CREATE UNIQUE INDEX saved_jobs_user_external_idx
  ON public.saved_jobs(user_id, external_job_id)
  WHERE external_job_id IS NOT NULL;

-- 5. Grant the new column to authenticated (inherits table-level INSERT/SELECT grants).
-- No additional GRANT needed — existing table grants cover it.

-- 6. RLS: The existing "saved_jobs_own" policy covers all rows regardless of which
-- column is populated, so no policy change is needed.
