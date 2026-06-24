
-- Seed the categories table with the 8 slugs used by the home page tiles and
-- the job-post templates. The update_category_count() trigger increments
-- job_count on INSERT/DELETE into jobs, so the rows must exist first.
-- Use ON CONFLICT DO NOTHING so re-running the migration is idempotent.

INSERT INTO public.categories (name, slug, icon, job_count) VALUES
  ('Engineering',       'engineering',       'code',           0),
  ('Design',            'design',            'palette',        0),
  ('Data & Analytics',  'data-analytics',    'trending-up',    0),
  ('Finance',           'finance',           'dollar-sign',    0),
  ('Marketing',         'marketing',         'megaphone',      0),
  ('Sales',             'sales',             'briefcase',      0),
  ('Customer Support',  'customer-support',  'heart-pulse',    0),
  ('Operations',        'operations',        'truck',          0)
ON CONFLICT (slug) DO NOTHING;
