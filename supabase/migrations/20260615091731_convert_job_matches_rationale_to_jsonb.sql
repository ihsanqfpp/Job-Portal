-- Convert rationale from text to jsonb safely
ALTER TABLE public.job_matches
  ALTER COLUMN rationale TYPE jsonb
  USING rationale::jsonb;
