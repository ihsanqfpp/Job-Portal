import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const SubmitInput = z.object({
  jobId: z.string().uuid(),
  resumeUrl: z.string().url(),
  coverLetter: z.string().max(5000).optional(),
});

// Server-side insert ensures applicant_id is always the authenticated user,
// not whatever the client sends. RLS also enforces this, but defense-in-depth.
export const submitApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SubmitInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: isSeeker } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "seeker",
    });
    if (!isSeeker) throw new Error("Only job seekers can apply");

    const { error } = await context.supabase.from("applications").insert({
      job_id: data.jobId,
      applicant_id: context.userId,
      resume_url: data.resumeUrl,
      cover_letter: data.coverLetter ?? null,
    });

    if (error) {
      if (error.code === "23505") throw new Error("You have already applied to this job");
      throw new Error(error.message);
    }
    return { ok: true };
  });
