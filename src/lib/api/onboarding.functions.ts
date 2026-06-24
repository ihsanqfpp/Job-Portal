import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// Only seeker and employer are self-assignable. Admin is granted by an existing
// admin only. This function enforces single-role: it deletes all existing roles
// for the user before inserting the chosen one.
const OnboardingInput = z.object({
  role: z.enum(["seeker", "employer"]),
});

export const completeOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => OnboardingInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Replace any role the trigger may have pre-assigned.
    await supabaseAdmin.from("user_roles").delete().eq("user_id", context.userId);

    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: context.userId, role: data.role });
    if (roleErr) throw new Error(roleErr.message);

    const { error: profileErr } = await supabaseAdmin
      .from("profiles")
      .update({ onboarding_completed: true })
      .eq("id", context.userId);
    if (profileErr) throw new Error(profileErr.message);

    return { role: data.role };
  });
