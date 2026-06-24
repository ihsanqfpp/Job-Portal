import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
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
  const { refreshRole } = useAuth();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function handleCallback() {
      if (search.error || search.error_description) {
        if (active) {
          setErrorMsg(search.error_description || search.error || "Authentication error occurred.");
        }
        return;
      }

      if (search.code) {
        try {
          const { error } = await supabase.auth.exchangeCodeForSession(search.code);
          if (error) throw error;

          await refreshRole();

          if (active) {
            navigate({ to: "/auth/verified", search: { redirect: search.redirect } });
          }
        } catch (err: any) {
          if (active) {
            setErrorMsg(err.message || "Failed to exchange authorization code.");
          }
        }
      } else {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          if (active) {
            navigate({ to: "/auth/verified", search: { redirect: search.redirect } });
          }
        } else {
          if (active) {
            setErrorMsg("No authorization code or session found.");
          }
        }
      }
    }

    handleCallback();

    return () => {
      active = false;
    };
  }, [search.code, search.error, search.error_description, search.redirect, navigate, refreshRole]);

  if (errorMsg) {
    return (
      <div className="container mx-auto px-4 py-16">
        <Card className="mx-auto max-w-md p-8 text-center space-y-4">
          <h1 className="text-xl font-bold text-destructive">Verification Failed</h1>
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
        <h1 className="text-xl font-bold animate-pulse">Verifying Account...</h1>
        <p className="text-sm text-muted-foreground font-medium">Confirming credentials, please wait.</p>
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </Card>
    </div>
  );
}
