
-- ============================================================
-- Storage bucket hardening
-- ============================================================
-- Explicitly configure all three buckets with the correct
-- visibility, MIME type allow-list, and file-size cap.
-- ON CONFLICT ensures idempotency against already-existing buckets.
--
-- resumes: PRIVATE — files must be served via signed URLs
-- avatars / logos: public (images have no PII, are user-facing branding)
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('resumes', 'resumes', false, 5242880,
   ARRAY[
     'application/pdf',
     'application/msword',
     'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
   ]),
  ('avatars', 'avatars', true,  2097152,
   ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('logos',   'logos',   true,  2097152,
   ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'])
ON CONFLICT (id) DO UPDATE
  SET public             = EXCLUDED.public,
      file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================
-- Fix the employer resume-read storage policy.
-- The old LIKE-based approach is slow and fragile; use a proper
-- parameterised EXISTS check instead.
-- ============================================================

DROP POLICY IF EXISTS "resumes_employer_read" ON storage.objects;

CREATE POLICY "resumes_employer_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'resumes'
    AND EXISTS (
      SELECT 1
      FROM public.applications a
      JOIN public.jobs j ON j.id = a.job_id
      WHERE j.posted_by = auth.uid()
        AND a.resume_url = storage.objects.name
    )
  );

-- ============================================================
-- Shared reports hardening
-- ============================================================

-- Soft-revocation: owner can disable a link without losing history.
ALTER TABLE public.shared_reports
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Guard against trivially guessable slugs (nanoid(16) = 16 chars).
ALTER TABLE public.shared_reports
  ADD CONSTRAINT shared_reports_slug_min_length
  CHECK (char_length(slug) >= 12);

-- Drop the permissive catch-all read policy and replace it with one
-- that enforces expiry and revocation.
DROP POLICY IF EXISTS "sr_public_read" ON public.shared_reports;

CREATE POLICY "sr_public_read" ON public.shared_reports
  FOR SELECT TO anon, authenticated
  USING (
    is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  );

-- Allow the owner to flip is_active (revoke) without a full delete.
DROP POLICY IF EXISTS "sr_owner_update" ON public.shared_reports;

CREATE POLICY "sr_owner_update" ON public.shared_reports
  FOR UPDATE TO authenticated
  USING  (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    -- Owners cannot change who the report belongs to or which version it
    -- points to; they may only update display_name, is_active, expires_at.
    AND user_id    = (SELECT user_id   FROM public.shared_reports WHERE id = shared_reports.id)
    AND version_id = (SELECT version_id FROM public.shared_reports WHERE id = shared_reports.id)
  );

-- ============================================================
-- Safe public report accessor
-- ============================================================
-- SECURITY DEFINER so it can JOIN resume_versions even when called
-- by anon (who has no direct SELECT grant on resume_versions).
--
-- Deliberately excludes parsed_text, user_id, and other PII fields.
-- Only returns the curated analysis fields the owner chose to share.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_public_report(p_slug text)
RETURNS TABLE (
  display_name     text,
  ats_score        integer,
  readiness_score  integer,
  summary          text,
  detected_skills  text[],
  missing_keywords text[],
  skill_gaps       text[],
  suggestions      jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If the slug is invalid / expired / revoked → return 0 rows (not an error),
  -- so the caller can distinguish "not found" from a server error.
  RETURN QUERY
  SELECT
    sr.display_name,
    rv.ats_score,
    rv.readiness_score,
    rv.summary,
    rv.detected_skills,
    rv.missing_keywords,
    rv.skill_gaps,
    rv.suggestions
  FROM public.shared_reports sr
  JOIN public.resume_versions rv ON rv.id = sr.version_id
  WHERE sr.slug      = p_slug
    AND sr.is_active = true
    AND (sr.expires_at IS NULL OR sr.expires_at > now());
END;
$$;

-- Anon users may call this RPC; SELECT on the underlying tables is NOT
-- required because SECURITY DEFINER bypasses their RLS.
GRANT EXECUTE ON FUNCTION public.get_public_report(text) TO anon, authenticated;

-- Prevent accidental public exposure of the raw function body.
REVOKE EXECUTE ON FUNCTION public.get_public_report(text) FROM public;
