import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Skeleton } from "@/components/ui/skeleton";
import { AppShell } from "@/components/layout/AppShell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: AuthLayout,
});

function AuthLayout() {
  const { user, loading, onboardingCompleted } = useAuth();
  const navigate = useNavigate();
  const { location } = useRouterState();

  // Redirect to /auth if session lost.
  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", replace: true });
  }, [user, loading, navigate]);

  // Redirect to onboarding until role is chosen, except when already there.
  useEffect(() => {
    if (
      !loading &&
      user &&
      onboardingCompleted === false &&
      !location.pathname.startsWith("/onboarding")
    ) {
      navigate({ to: "/onboarding", replace: true });
    }
  }, [loading, user, onboardingCompleted, location.pathname, navigate]);

  // Show skeleton while auth state or onboarding flag is still resolving,
  // and also while we're about to redirect to onboarding — prevents a single-frame
  // flash of protected AppShell content before the navigation fires.
  const pendingOnboarding =
    user &&
    onboardingCompleted === false &&
    !location.pathname.startsWith("/onboarding");

  if (loading || (user && onboardingCompleted === null) || pendingOnboarding)
    return (
      <div className="container mx-auto px-4 py-10">
        <Skeleton className="h-64 w-full" />
      </div>
    );

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
