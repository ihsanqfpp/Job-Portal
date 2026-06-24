
-- Atomic quota check-and-increment.
--
-- The previous quota implementation used a read-check-then-write pattern which
-- has a TOCTOU race: two concurrent requests can both read "used < limit" and
-- both proceed. This function runs inside a single transaction with a row-level
-- lock (SELECT ... FOR UPDATE) so the check and increment are serialized.
--
-- Called by the server-side quota middleware AFTER the LLM call succeeds.
-- Raises SQLSTATE P0001 with message starting "quota_exceeded:" if the limit
-- would be breached, so the caller can surface a user-friendly error.

CREATE OR REPLACE FUNCTION public.atomic_check_increment_quota(
  p_user_id   uuid,
  p_quota_key text,
  p_limit     int   -- 0 = unlimited (skip enforcement)
)
RETURNS int           -- returns the new used count
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_used_map  jsonb;
  v_used      int;
  v_new_count int;
BEGIN
  -- Lock this profile row for the duration of the transaction so concurrent
  -- calls to this function serialize correctly.
  SELECT ai_requests_used
    INTO v_used_map
    FROM public.profiles
   WHERE id = p_user_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile not found for user %', p_user_id;
  END IF;

  v_used_map  := COALESCE(v_used_map, '{}'::jsonb);
  v_used      := COALESCE((v_used_map ->> p_quota_key)::int, 0);

  -- p_limit = 0 → unlimited plan, always pass through.
  IF p_limit > 0 AND v_used >= p_limit THEN
    RAISE EXCEPTION 'quota_exceeded: % used=% limit=%', p_quota_key, v_used, p_limit
      USING ERRCODE = 'P0001';
  END IF;

  v_new_count := v_used + 1;
  v_used_map  := jsonb_set(v_used_map, ARRAY[p_quota_key], to_jsonb(v_new_count));

  UPDATE public.profiles
     SET ai_requests_used = v_used_map
   WHERE id = p_user_id;

  RETURN v_new_count;
END;
$$;

-- Only authenticated users (via service-role middleware) and service_role may call this.
REVOKE EXECUTE ON FUNCTION public.atomic_check_increment_quota(uuid, text, int)
  FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.atomic_check_increment_quota(uuid, text, int)
  TO authenticated, service_role;
