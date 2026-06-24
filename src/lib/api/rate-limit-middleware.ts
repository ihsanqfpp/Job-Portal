import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

export interface RateLimitOptions {
  /** Logical bucket name, e.g. "ai:coach" or "share:report". */
  bucket: string;
  /** Maximum requests allowed per window. */
  maxCount: number;
  /** Window duration in seconds. */
  windowSecs: number;
}

/**
 * IP-based rate limiting backed by the `rate_limit_buckets` table.
 *
 * Uses the service-role client (via dynamic import of client.server.ts) to
 * bypass RLS on `rate_limit_buckets` — the table denies all user/anon access.
 *
 * IP extraction precedence (Cloudflare Workers → reverse proxy → fallback):
 *   cf-connecting-ip  → set by Cloudflare; most reliable in Workers
 *   x-forwarded-for   → set by other reverse proxies; first address used
 *   "unknown"         → failsafe so the server never crashes; still tracked
 *
 * Throws a structured 429-like Error when the limit is exceeded so TanStack
 * Start's error middleware can surface it to the caller.
 */
export const requireRateLimit = (opts: RateLimitOptions) =>
  createMiddleware({ type: "function" }).server(async ({ next }) => {
    const request = getRequest();
    const ip = extractIp(request);

    // Dynamic import keeps service-role key out of the client bundle.
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const { data: allowed, error } = await supabaseAdmin.rpc(
      "check_and_increment_rate_limit",
      {
        p_bucket: opts.bucket,
        p_key: ip,
        p_max_count: opts.maxCount,
        p_window_secs: opts.windowSecs,
      },
    );

    if (error) {
      // Fail open: if the DB is unreachable we don't block legitimate traffic.
      // Log the error but let the request through.
      console.error(
        `[rate-limit] DB error for bucket=${opts.bucket} ip=${ip}:`,
        error.message,
      );
      return next();
    }

    if (!allowed) {
      throw new Error(
        `RATE_LIMIT_EXCEEDED: Too many requests for ${opts.bucket}. ` +
          `Limit is ${opts.maxCount} per ${opts.windowSecs}s. Please slow down.`,
      );
    }

    return next();
  });

function extractIp(request: ReturnType<typeof getRequest> | null): string {
  if (!request?.headers) return "unknown";
  return (
    request.headers.get("cf-connecting-ip") ??
    (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
    "unknown"
  );
}
