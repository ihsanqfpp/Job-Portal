import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireQuota } from "@/lib/api/quota-middleware";
import { logger } from "@/lib/logger";
import { LLMMatchingProvider } from "@/lib/matching-provider";
import { z } from "zod";

const RankSchema = z.object({
  matches: z
    .array(
      z.object({
        id: z.string().max(80),
        score: z.number().int().min(0).max(100),
        rationale: z.string().max(200),
        explanation: z.string().max(800),
        skill_match_score: z.number().int().min(0).max(100),
        experience_fit_score: z.number().int().min(0).max(100),
        ats_compatibility_score: z.number().int().min(0).max(100),
      }),
    )
    .max(20),
});

export const matchJobsForUser = createServerFn({ method: "POST" })
  .middleware([requireQuota("job_matches")])
  .handler(async ({ context }) => {
    const startTime = Date.now();
    logger.info(
      { userId: context.userId, type: "matchJobsForUser_start" },
      "Starting job matching pipeline",
    );
    // Latest resume version
    const { data: v } = await context.supabase
      .from("resume_versions")
      .select("id, summary, detected_skills, parsed_text")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!v) throw new Error("Upload a resume first to enable AI matching.");

    // Candidate pool — mix of internal + external jobs (recent)
    const [{ data: internal }, { data: external }] = await Promise.all([
      context.supabase
        .from("jobs")
        .select("id,title,description,location,type,skills_required,companies(name)")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(40),
      context.supabase
        .from("external_jobs")
        .select("id,title,description,location,job_type,skills,company")
        .order("posted_at", { ascending: false })
        .limit(40),
    ]);

    type Candidate = {
      id: string;
      kind: "internal" | "external";
      title: string;
      company: string;
      location: string | null;
      type: string | null;
      skills: string[];
      excerpt: string;
    };
    const candidates: Candidate[] = [
      ...(internal ?? []).map((j) => ({
        id: `i:${j.id}`,
        kind: "internal" as const,
        title: j.title,
        company: j.companies?.name ?? "—",
        location: j.location,
        type: j.type,
        skills: j.skills_required ?? [],
        excerpt: (j.description ?? "").slice(0, 400),
      })),
      ...(external ?? []).map((j) => ({
        id: `e:${j.id}`,
        kind: "external" as const,
        title: j.title,
        company: j.company,
        location: j.location,
        type: j.job_type,
        skills: j.skills ?? [],
        excerpt: (j.description ?? "").slice(0, 400),
      })),
    ];

    if (candidates.length === 0) {
      logger.info(
        { userId: context.userId, type: "matchJobsForUser_empty" },
        "No candidate jobs found",
      );
      return { matches: [] };
    }

    // Phase 5: Pre-filter optimization based on skills
    const candidateSkillsLower = v.detected_skills?.map((s) => s.toLowerCase()) ?? [];

    // Score candidates purely on heuristic intersection first
    const heuristicallyScored = candidates.map((c) => {
      const jobSkillsLower = c.skills.map((s) => s.toLowerCase());
      const intersection = jobSkillsLower.filter((s) => candidateSkillsLower.includes(s)).length;
      return { ...c, heuristicScore: intersection };
    });

    // Take top 15 matches to reduce LLM tokens drastically
    heuristicallyScored.sort((a, b) => b.heuristicScore - a.heuristicScore);
    const topCandidates = heuristicallyScored.slice(0, 15);

    logger.info(
      {
        userId: context.userId,
        candidatesFound: candidates.length,
        topCandidates: topCandidates.length,
        type: "matchJobsForUser_prefiltered",
      },
      "Pre-filtered candidates for LLM",
    );

    const provider = new LLMMatchingProvider();
    const ranked = await provider.rankJobs(
      {
        skills: v.detected_skills ?? [],
        summary: v.summary ?? "",
        resume_excerpt: (v.parsed_text ?? "").slice(0, 2500),
      },
      topCandidates,
    );

    // Persist to job_matches
    await context.supabase.from("job_matches").delete().eq("user_id", context.userId);
    if (ranked.length > 0) {
      const { error: insertError } = await context.supabase.from("job_matches").insert(
        ranked.map((m) => {
          const [kind, id] = m.id.split(":");
          const rationaleData = {
            rationale: m.rationale,
            explanation: m.explanation,
            skill_match_score: m.skill_match_score,
            experience_fit_score: m.experience_fit_score,
            ats_compatibility_score: m.ats_compatibility_score,
          };
          return {
            user_id: context.userId,
            job_id: kind === "i" ? id : null,
            external_job_id: kind === "e" ? id : null,
            score: m.score,
            rationale: JSON.stringify(rationaleData),
          };
        }),
      );
      if (insertError) {
        logger.error({
          userId: context.userId,
          error: insertError.message,
          type: "matchJobsForUser_db_failure",
        });
        throw new Error(insertError.message);
      }
    }

    await context.incrementQuota();

    const executionTimeMs = Date.now() - startTime;
    logger.info(
      {
        userId: context.userId,
        type: "matchJobsForUser_success",
        executionTimeMs,
        matchesCount: ranked.length,
      },
      "Job matching completed successfully",
    );

    // Return enriched
    const byId = new Map(candidates.map((c) => [c.id, c]));
    return {
      matches: ranked
        .map((m) => ({ ...m, job: byId.get(m.id) }))
        .filter((m) => m.job)
        .sort((a, b) => b.score - a.score),
    };
  });

export const getCachedMatches = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("job_matches")
      .select("score, rationale, job_id, external_job_id")
      .eq("user_id", context.userId)
      .order("score", { ascending: false })
      .limit(20);
    if (!data || data.length === 0) return { matches: [] };

    const internalIds = data.map((r) => r.job_id).filter((x): x is string => !!x);
    const externalIds = data.map((r) => r.external_job_id).filter((x): x is string => !!x);

    const [{ data: jobs }, { data: external }] = await Promise.all([
      internalIds.length
        ? context.supabase
            .from("jobs")
            .select(
              "id,title,location,type,salary_min,salary_max,salary_currency,companies(name,logo_url)",
            )
            .in("id", internalIds)
        : Promise.resolve({ data: [] as never[] }),
      externalIds.length
        ? context.supabase
            .from("external_jobs")
            .select("id,title,location,job_type,company,company_logo,url,salary")
            .in("id", externalIds)
        : Promise.resolve({ data: [] as never[] }),
    ]);

    const internalMap = new Map((jobs ?? []).map((j) => [j.id, j]));
    const externalMap = new Map((external ?? []).map((j) => [j.id, j]));

    return {
      matches: data
        .map((r) => {
          const parsedRationale =
            (typeof r.rationale === "string" ? JSON.parse(r.rationale || "{}") : r.rationale) || {};

          const matchDetails = {
            score: r.score,
            rationale: parsedRationale.rationale || "",
            explanation: parsedRationale.explanation || "",
            skill_match_score: parsedRationale.skill_match_score || r.score,
            experience_fit_score: parsedRationale.experience_fit_score || r.score,
            ats_compatibility_score: parsedRationale.ats_compatibility_score || r.score,
          };

          if (r.job_id && internalMap.has(r.job_id)) {
            return { kind: "internal" as const, ...matchDetails, job: internalMap.get(r.job_id)! };
          }
          if (r.external_job_id && externalMap.has(r.external_job_id)) {
            return {
              kind: "external" as const,
              ...matchDetails,
              job: externalMap.get(r.external_job_id)!,
            };
          }
          return null;
        })
        .filter((x): x is NonNullable<typeof x> => !!x),
    };
  });
