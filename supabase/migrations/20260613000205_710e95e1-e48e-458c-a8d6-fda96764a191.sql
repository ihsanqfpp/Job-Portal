
-- Harden function search paths
ALTER FUNCTION public.set_updated_at() SET search_path = public;
ALTER FUNCTION public.validate_job_expiry() SET search_path = public;

-- Revoke public/anon execute on internal trigger / definer functions
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_job_expiry() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_category_count() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.get_my_role() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;

-- ============ STORAGE POLICIES ============
-- avatars: anyone can read, owner can write to <uid>/...
CREATE POLICY "avatars_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "avatars_owner_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "avatars_owner_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "avatars_owner_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- logos: anyone can read, owner can write to <uid>/...
CREATE POLICY "logos_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'logos');
CREATE POLICY "logos_owner_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'logos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "logos_owner_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'logos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "logos_owner_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'logos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- resumes: owner read/write; employers can read resumes attached to their job applications
CREATE POLICY "resumes_owner_all" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "resumes_employer_read" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'resumes'
    AND EXISTS (
      SELECT 1 FROM public.applications a
      JOIN public.jobs j ON j.id = a.job_id
      WHERE j.posted_by = auth.uid()
        AND a.resume_url LIKE '%' || storage.objects.name || '%'
    )
  );
CREATE POLICY "resumes_admin_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'resumes' AND public.has_role(auth.uid(),'admin'));
