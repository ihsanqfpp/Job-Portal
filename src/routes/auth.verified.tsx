import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

type Search = {
  redirect?: string;
};

export const Route = createFileRoute("/auth/verified")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    redirect: (s.redirect as string) || undefined,
  }),
  component: AuthVerifiedPage,
});

function AuthVerifiedPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { role, loading, onboardingCompleted } = useAuth();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (loading) return;
    setChecking(false);
  }, [loading, onboardingCompleted]);

  function dashboardFor(r: string | null, redirectTo?: string) {
    if (redirectTo) return redirectTo;
    if (r === "employer") return "/employer";
    if (r === "admin") return "/admin/dashboard";
    return "/dashboard";
  }

  function handleContinue() {
    if (onboardingCompleted === false) {
      navigate({ to: "/onboarding", replace: true });
    } else {
      navigate({ to: dashboardFor(role, search.redirect), replace: true });
    }
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <Card className="mx-auto max-w-md p-8 text-center space-y-6">
        <div className="flex justify-center">
          <CheckCircle className="h-16 w-16 text-emerald-500 animate-bounce" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Account Verified</h1>
          <p className="text-sm text-muted-foreground leading-normal">
            {onboardingCompleted === false
              ? "One last step — tell us how you'll use JobVerse."
              : "Your account is confirmed. Welcome back."}
          </p>
        </div>
        <Button
          onClick={handleContinue}
          className="w-full h-10 shadow-md shadow-primary/10"
          disabled={loading || checking}
        >
          {loading || checking
            ? "Loading…"
            : onboardingCompleted === false
              ? "Choose your role →"
              : "Go to dashboard"}
        </Button>
      </Card>
    </div>
  );
}
