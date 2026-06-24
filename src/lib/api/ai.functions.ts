import { createServerFn } from "@tanstack/react-start";
import { requireQuota } from "@/lib/api/quota-middleware";
import { callStructured, sandboxContent, INJECTION_GUARD } from "@/lib/ai-provider.server";
// requireSupabaseAuth is pulled in transitively through requireQuota's middleware chain.
import { logger } from "@/lib/logger";
import { z } from "zod";

const Input = z.object({ text: z.string().min(20).max(60000) });

const SkillsSchema = z.object({
  skills: z.array(z.string().max(80)).max(10),
});

const SKILLS_FALLBACK: z.infer<typeof SkillsSchema> = { skills: [] };

/**
 * Extract the top-10 skills from resume text.
 *
 * Prompt injection mitigation:
 *  - Resume text is wrapped in <resume> delimiters (sandboxContent).
 *  - The system message carries the INJECTION_GUARD instruction.
 *  - Untrusted text NEVER appears in the system message.
 */
export const extractResumeSkills = createServerFn({ method: "POST" })
  .middleware([requireQuota("ats_analyses")])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const startTime = Date.now();
    logger.info(
      { userId: context.userId, type: "extractResumeSkills_start" },
      "Starting resume skill extraction",
    );

    const result = await callStructured(
      SkillsSchema,
      [
        {
          role: "system",
          content:
            "Extract the top 10 technical and professional skills from the resume inside the " +
            "<resume> tags. Return a JSON object with a 'skills' array of short skill strings " +
            "(max 10 entries, max 80 chars each). " +
            INJECTION_GUARD,
        },
        {
          role: "user",
          content: sandboxContent("resume", data.text.slice(0, 50000)),
        },
      ],
      SKILLS_FALLBACK,
    );

    const skills = result.skills
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 10);

    const { error } = await context.supabase
      .from("profiles")
      .update({ skills })
      .eq("id", context.userId);
    if (error) {
      logger.error({
        userId: context.userId,
        error: error.message,
        type: "extractResumeSkills_db_failure",
      });
      throw new Error(error.message);
    }

    await context.incrementQuota();

    logger.info(
      {
        userId: context.userId,
        type: "extractResumeSkills_success",
        executionTimeMs: Date.now() - startTime,
        skillsCount: skills.length,
      },
      "Resume skills extracted",
    );

    return { skills };
  });
