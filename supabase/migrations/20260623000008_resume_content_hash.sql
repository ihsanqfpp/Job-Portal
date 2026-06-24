
-- Add content_hash to resume_versions so identical resume text re-uses a cached
-- analysis rather than spending an LLM call.  The hash is SHA-256 of the first
-- 60 000 chars of the parsed text, computed server-side by the application.
--
-- Intentionally non-UNIQUE at the DB level (same content may be uploaded by
-- different users as different file versions); the app queries on (user_id,
-- content_hash) to find the user's own cached result.

ALTER TABLE public.resume_versions
  ADD COLUMN content_hash text;

CREATE INDEX resume_versions_user_hash_idx
  ON public.resume_versions(user_id, content_hash)
  WHERE content_hash IS NOT NULL;
