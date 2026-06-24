import { createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sendQuotaWarningEmail } from "../email";
import { logger } from "../logger";

export type QuotaKey = "ats_analyses" | "resume_rewrites" | "job_matches" | "coach_messages";

/**
 * Quota enforcement middleware.
 *
 * The previous implementation used an in-memory rate-limit Map and a
 * read-check-then-write increment. Both are broken on Cloudflare Workers:
 *
 *  1. In-memory Maps are per-isolate; each request may land in a fresh
 *     isolate, so the Map is always empty and rate limiting never fires.
 *
 *  2. read-then-write is a TOCTOU race: two concurrent requests can both
 *     read "used < limit" and both proceed, allowing double-spending.
 *
 * Fix:
 *  - Soft pre-check (optimistic read) to fail fast and avoid calling the LLM
 *    when the user is clearly over quota. NOT the authoritative gate.
 *  - Authoritative gate: `context.incrementQuota()` is called AFTER the LLM
 *    operation succeeds and calls `atomic_check_increment_quota` (migration
 *    20260623000007). That PostgreSQL function uses SELECT…FOR UPDATE inside
 *    a single transaction, making check-and-increment serialized and atomic.
 *
 * limit = 0 means "unlimited plan" — no quota is enforced.
 */
export const requireQuota = (quotaKey: QuotaKey) =>
  createMiddleware({ type: "function" })
    .middleware([requireSupabaseAuth])
    .server(async ({ next, context }) => {
      const { supabase, userId } = context;

      const { data: profile } = await supabase
        .from("profiles")
        .select("ai_requests_used, ai_requests_limit, current_period_end")
        .eq("id", userId)
        .single();

      if (!profile) throw new Error("Profile not found.");

      // Billing period reset — clear counters when the period has expired.
      if (profile.current_period_end && new Date(profile.current_period_end) < new Date()) {
        await supabase
          .from("profiles")
          .update({
            ai_requests_used: {
              ats_analyses: 0,
              resume_rewrites: 0,
              job_matches: 0,
              coach_messages: 0,
            },
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(
              Date.now() + 30 * 24 * 60 * 60 * 1000,
            ).toISOString(),
          })
          .eq("id", userId);
        // Re-fetch so usedMap is fresh after reset.
      }

      const usedMap = (profile.ai_requests_used as Record<string, number>) ?? {};
      const limitMap = (profile.ai_requests_limit as Record<string, number>) ?? {};
      const used = usedMap[quotaKey] ?? 0;
      const limit = limitMap[quotaKey] ?? 0; // 0 = unlimited

      // Soft pre-check: reject obviously-exceeded quotas before calling the LLM.
      // This is NOT atomic — it's just a fast path. The real gate is incrementQuota.
      if (limit > 0 && used >= limit) {
        throw new Error(
          `QUOTA_EXCEEDED: You have used all ${limit} ${quotaKey.replace(/_/g, " ")} ` +
            `for this billing period. Please upgrade your plan.`,
        );
      }

      // Send warning email when one request is left.
      if (limit > 0 && limit - used === 1) {
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user?.email) await sendQuotaWarningEmail(user.email, quotaKey);
        } catch (e) {
          logger.error({ error: e }, "Failed to send quota warning email");
        }
      }

      return next({
        context: {
          ...context,
          /**
           * Call this AFTER the LLM operation succeeds.
           * Uses `atomic_check_increment_quota` (migration 20260623000007) which
           * runs a SELECT…FOR UPDATE inside a single PG transaction — concurrent
           * calls serialize correctly and can never both exceed the limit.
           */
          incrementQuota: async () => {
            if (limit === 0) return; // unlimited plan — nothing to track
            try {
              await supabase.rpc("atomic_check_increment_quota", {
                p_user_id: userId,
                p_quota_key: quotaKey,
                p_limit: limit,
              });
            } catch (err: any) {
              // Surface a user-friendly message when the atomic check rejects.
              if (err?.message?.includes("quota_exceeded")) {
                throw new Error(
                  `QUOTA_EXCEEDED: Quota for ${quotaKey.replace(/_/g, " ")} ` +
                    `was reached by a concurrent request.`,
                );
              }
              throw err;
            }
          },
        },
      });
    });
