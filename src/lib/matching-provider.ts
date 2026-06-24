import { z } from "zod";
import {
  callStructured,
  sandboxContent,
  INJECTION_GUARD,
} from "@/lib/ai-provider.server";

export const RankSchema = z.object({
  ranked: z.array(
    z.object({
      id: z.string(),
      score: z.number().min(0).max(100),
      rationale: z.string().max(200),
      explanation: z.string().max(400),
      skill_match_score: z.number().min(0).max(100),
      experience_fit_score: z.number().min(0).max(100),
      ats_compatibility_score: z.number().min(0).max(100),
    }),
  ),
});

const RANK_FALLBACK: z.infer<typeof RankSchema> = { ranked: [] };

export interface MatchCandidate {
  id: string;
  title: string;
  company: string;
  location: string | null;
  type: string | null;
  skills: string[];
  excerpt: string;
  heuristicScore?: number;
}

export interface CandidateContext {
  skills: string[];
  summary: string;
  resume_excerpt: string;
}

export interface IMatchingProvider {
  rankJobs(
    candidate: CandidateContext,
    jobs: MatchCandidate[],
  ): Promise<z.infer<typeof RankSchema>["ranked"]>;
}

export class LLMMatchingProvider implements IMatchingProvider {
  async rankJobs(candidate: CandidateContext, jobs: MatchCandidate[]) {
    // Sanitise job excerpts to avoid excessive prompt size
    const jobPayload = jobs.map((c) => ({
      id: c.id,
      title: c.title,
      company: c.company,
      location: c.location,
      type: c.type,
      skills: c.skills,
      excerpt: c.excerpt.slice(0, 800),
    }));

    // ── Prompt injection mitigation ───────────────────────────────────────────
    // resume_excerpt and each job excerpt are user-/employer-supplied text and
    // must live in the user message inside sandboxContent delimiters.
    // The candidate's skills/summary are derived from a prior validated LLM call
    // and are therefore trusted enough for the system message, but we keep them
    // in the user message as well to preserve the separation of concerns.
    const candidateSandbox = sandboxContent(
      "candidate",
      JSON.stringify({
        skills: candidate.skills,
        summary: candidate.summary,
        resume_excerpt: candidate.resume_excerpt.slice(0, 1500),
      }),
    );

    const jobsSandbox = sandboxContent("jobs", JSON.stringify(jobPayload));

    const result = await callStructured(
      RankSchema,
      [
        {
          role: "system",
          content:
            "You are a job-match engine. Given a candidate inside <candidate> tags and a list " +
            "of jobs inside <jobs> tags, return every job ranked 0–100 for fitness. " +
            "Use the EXACT id provided for each job. " +
            "For each job return: score, rationale (one short sentence), explanation (1-2 sentences " +
            "on why the job fits), skill_match_score, experience_fit_score, ats_compatibility_score. " +
            "Do NOT drop any jobs from the response. " +
            INJECTION_GUARD,
        },
        {
          role: "user",
          content: candidateSandbox + "\n\n" + jobsSandbox,
        },
      ],
      RANK_FALLBACK,
    );

    return result.ranked;
  }
}

export class VectorMatchingProvider implements IMatchingProvider {
  async rankJobs(_candidate: CandidateContext, _jobs: MatchCandidate[]) {
    // STUB: pgvector / Pinecone integration
    return [];
  }
}
