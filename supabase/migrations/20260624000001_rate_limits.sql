-- Rate-limit buckets table.
-- Each row tracks how many requests a given key (IP, user-id, etc.)
-- has made within the current window for a named bucket.
create table if not exists public.rate_limit_buckets (
  bucket     text        not null,
  key        text        not null,
  count      integer     not null default 0,
  window_end timestamptz not null,
  primary key (bucket, key)
);

-- Only the service role (server functions) may read/write this table.
alter table public.rate_limit_buckets enable row level security;

-- No client-side access — service role bypasses RLS automatically.
-- (Explicit deny-all policies ensure accidental anon/user access is blocked.)
create policy "deny_all_anon"
  on public.rate_limit_buckets
  for all
  to anon
  using (false);

create policy "deny_all_authenticated"
  on public.rate_limit_buckets
  for all
  to authenticated
  using (false);

-- ── check_and_increment_rate_limit ───────────────────────────────────────────
--
-- Atomically increments the counter for (bucket, key) within the current
-- window and returns whether the caller is under the limit.
--
-- Parameters:
--   p_bucket      – logical bucket name, e.g. 'ai:coach', 'auth:login'
--   p_key         – rate-limit key, typically the client IP
--   p_max_count   – maximum requests allowed per window
--   p_window_secs – window duration in seconds
--
-- Returns true  → request is allowed (counter was incremented).
-- Returns false → limit exceeded; caller should return 429.
--
-- Security: SECURITY DEFINER so server functions can call it via the
-- anon/service-role key without exposing write access to the table.
create or replace function public.check_and_increment_rate_limit(
  p_bucket      text,
  p_key         text,
  p_max_count   integer,
  p_window_secs integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now        timestamptz := now();
  v_window_end timestamptz := v_now + (p_window_secs * interval '1 second');
  v_count      integer;
begin
  -- Upsert: create a fresh row when none exists, or when the previous window
  -- has expired.  Use ON CONFLICT to atomically reset expired windows.
  insert into public.rate_limit_buckets (bucket, key, count, window_end)
  values (p_bucket, p_key, 1, v_window_end)
  on conflict (bucket, key) do update
    set count      = case
                       when rate_limit_buckets.window_end < v_now
                       then 1                               -- window expired: reset
                       else rate_limit_buckets.count + 1   -- same window: increment
                     end,
        window_end = case
                       when rate_limit_buckets.window_end < v_now
                       then v_window_end
                       else rate_limit_buckets.window_end
                     end
  returning count into v_count;

  return v_count <= p_max_count;
end;
$$;

-- Tidy up stale rows periodically (best-effort; not critical for correctness).
create index if not exists idx_rate_limit_buckets_window_end
  on public.rate_limit_buckets (window_end);
