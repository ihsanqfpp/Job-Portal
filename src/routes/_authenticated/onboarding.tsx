import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Briefcase, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { completeOnboarding } from "@/lib/api/onboarding.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: OnboardingPage,
});

const ROLES = [
  {
    id: "seeker" as const,
    label: "Job Seeker",
    description: "Find jobs, track applications, and get AI-powered career coaching.",
    Icon: Search,
  },
  {
    id: "employer" as const,
    label: "Employer",
    description: "Post jobs, review applications, and find the right candidates.",
    Icon: Briefcase,
  },
] as const;

function OnboardingPage() {
  const navigate = useNavigate();
  const { user, refreshRole } = useAuth();
  const qc = useQueryClient();
  const completeOnboardingFn = useServerFn(completeOnboarding);
  const [selected, setSelected] = useState<"seeker" | "employer" | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleContinue() {
    if (!selected || busy) return;
    setBusy(true);
    try {
      await completeOnboardingFn({ data: { role: selected } });
      // Sync auth context so the onboarding guard in route.tsx clears.
      await refreshRole();
      // Bust the onboarding-check cache so AuthLayout stops redirecting here.
      qc.setQueryData(["profile-onboarding", user?.id], { onboarding_completed: true });
      navigate({ to: selected === "employer" ? "/employer" : "/dashboard", replace: true });
    } catch (e) {
      toast.error((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-lg space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Welcome to JobVerse</h1>
          <p className="text-muted-foreground text-sm">
            How would you like to use the platform?
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {ROLES.map(({ id, label, description, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setSelected(id)}
              className={`text-left rounded-xl border-2 p-6 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                selected === id
                  ? "border-primary bg-primary/5"
                  : "border-muted hover:border-primary/40 bg-card"
              }`}
            >
              <Icon
                className={`h-8 w-8 mb-3 ${selected === id ? "text-primary" : "text-muted-foreground"}`}
              />
              <p className="font-semibold">{label}</p>
              <p className="text-sm text-muted-foreground mt-1 leading-snug">{description}</p>
            </button>
          ))}
        </div>

        <Button
          className="w-full"
          disabled={!selected || busy}
          onClick={handleContinue}
        >
          {busy ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Setting up your account…
            </>
          ) : (
            "Continue"
          )}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Each account holds one role. Contact support to change it later.
        </p>
      </div>
    </div>
  );
}
