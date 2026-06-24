import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getSeekerDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: latestResume }, { data: activity }, { data: tracker }, { data: profile }] =
      await Promise.all([
        context.supabase
          .from("resume_versions")
          .select(
            "id, ats_score, readiness_score, summary, missing_keywords, skill_gaps, suggestions, created_at, filename",
          )
          .eq("user_id", context.userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        context.supabase
          .from("activity_log")
          .select("id, kind, payload, created_at")
          .eq("user_id", context.userId)
          .order("created_at", { ascending: false })
          .limit(8),
        context.supabase.from("tracker_items").select("stage").eq("user_id", context.userId),
        context.supabase
          .from("profiles")
          .select("full_name, avatar_url, skills, location, bio")
          .eq("id", context.userId)
          .maybeSingle(),
      ]);

    const stageCounts = { saved: 0, applied: 0, interview: 0, offer: 0, rejected: 0 };
    (tracker ?? []).forEach((t) => {
      const stage = (t.stage as keyof typeof stageCounts) ?? "saved";
      if (stage in stageCounts) stageCounts[stage]++;
    });

    return {
      latestResume,
      activity: activity ?? [],
      stageCounts,
      profile,
    };
  });
