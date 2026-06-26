import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Search = {
  code?: string;
  error?: string;
  error_code?: string;
  error_description?: string;
  redirect?: string;
};

export const Route = createFileRoute("/auth/callback")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    code: (s.code as string) || undefined,
    error: (s.error as string) || undefined,
    error_code: (s.error_code as string) || undefined,
    error_description: (s.error_description as string) || undefined,
    redirect: (s.redirect as string) || undefined,
  }),
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    function succeed() {
      if (!active) return;
      active = false; // seal the door so any pending exchangeCodeForSession error never calls setErrorMsg
      if (timeoutId) clearTimeout(timeoutId);
      navigate({ to: "/auth/verified", search: { redirect: search.redirect }, replace: true });
    }

    // Subscribe BEFORE any async work so we never miss SIGNED_IN.
    // This handles both implicit-flow hash tokens (async Supabase init) and
    // the post-PKCE-exchange event.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "SIGNED_IN" && session) {
        subscription.unsubscribe();
        succeed();
      }
    });

    async function handleCallback() {
      // OAuth provider returned an error (e.g. user cancelled, misconfig)
      if (search.error || search.error_description) {
        subscription.unsubscribe();
        if (active) {
          setErrorMsg(
            search.error_description ||
            search.error ||
            "Google sign-in was cancelled or failed. Please try again.",
          );
        }
        return;
      }

      // PKCE flow — exchange the code Supabase appended to the redirect URL.
      if (search.code) {
        const { error } = await supabase.auth.exchangeCodeForSession(search.code);
        if (error) {
          subscription.unsubscribe();
          if (active) setErrorMsg(error.message || "Failed to complete sign-in. Please try again.");
          return;
        }
        // Success: onAuthStateChange fires SIGNED_IN → succeed() is called there.
        return;
      }

      // Implicit / hash flow — Supabase client processes the URL hash asynchronously
      // during _initialize(). Check immediately first (sync case), otherwise the
      // onAuthStateChange subscription above will catch it.
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        subscription.unsubscribe();
        succeed();
        return;
      }

      // No session yet — wait for onAuthStateChange (async hash processing).
      // Safety net: time out after 15 seconds.
      timeoutId = setTimeout(() => {
        if (!active) return;
        subscription.unsubscribe();
        setErrorMsg("Sign-in timed out. Please go back and try again.");
      }, 15000);
    }

    handleCallback();

    return () => {
      active = false;
      subscription.unsubscribe();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []); // run once on mount — search params are stable

  if (errorMsg) {
    return (
      <div className="container mx-auto px-4 py-16">
        <Card className="mx-auto max-w-md p-8 text-center space-y-4">
          <h1 className="text-xl font-bold text-destructive">Sign-in Failed</h1>
          <p className="text-sm text-muted-foreground">{errorMsg}</p>
          <Button onClick={() => navigate({ to: "/auth" })} className="w-full">
            Back to Sign In
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <Card className="mx-auto max-w-md p-8 text-center space-y-4">
        <h1 className="text-xl font-bold animate-pulse">Completing sign-in…</h1>
        <p className="text-sm text-muted-foreground font-medium">Please wait while we verify your account.</p>
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </Card>
    </div>
  );
}
