import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// Only seeker and employer are self-assignable. Admin is granted by an existing
// admin only. The complete_onboarding() SECURITY DEFINER function in Postgres
// enforces this constraint and performs all writes scoped to auth.uid() —
// no service-role key is required.
const OnboardingInput = z.object({
  role: z.enum(["seeker", "employer"]),
});

export const completeOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => OnboardingInput.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("complete_onboarding", {
      _role: data.role,
    });
    if (error) throw new Error(error.message);
    return { role: data.role };
  });
