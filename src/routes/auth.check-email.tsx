import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mail, ArrowLeft, RefreshCw } from "lucide-react";
import { toast } from "sonner";

type Search = {
  email?: string;
};

export const Route = createFileRoute("/auth/check-email")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    email: (s.email as string) || undefined,
  }),
  component: AuthCheckEmailPage,
});

function AuthCheckEmailPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const email = search.email || "";

  const [countdown, setCountdown] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  async function handleResend() {
    if (!email) {
      toast.error("No email address provided.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
      toast.success("Verification link resent to your email.");
      setCountdown(60);
    } catch (err: any) {
      toast.error(err.message || "Failed to resend verification email.");
    } finally {
      setBusy(false);
    }
  }

  function handleChangeEmail() {
    navigate({ to: "/auth", search: { mode: "register", email } });
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <Card className="mx-auto max-w-md p-8 text-center space-y-6">
        <div className="flex justify-center">
          <div className="bg-primary/5 p-4 rounded-full text-primary">
            <Mail className="h-12 w-12" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Check Your Email</h1>
          <p className="text-sm text-muted-foreground leading-normal">
            We have sent a verification link to <span className="font-semibold text-foreground break-all">{email || "your inbox"}</span>.
          </p>
          <p className="text-xs text-muted-foreground leading-normal">
            Click the link in the email to confirm your account and get started.
          </p>
        </div>

        <div className="space-y-3 pt-4 border-t border-muted/20">
          <Button
            onClick={handleResend}
            disabled={busy || countdown > 0}
            className="w-full h-10 shadow-sm flex items-center justify-center gap-2"
          >
            <RefreshCw className={busy ? "animate-spin h-4 w-4" : "h-4 w-4"} />
            {countdown > 0 ? `Resend Email (${countdown}s)` : "Resend Verification Email"}
          </Button>

          <Button
            onClick={handleChangeEmail}
            variant="outline"
            className="w-full h-10 flex items-center justify-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Change Email / Back to Signup
          </Button>
        </div>
      </Card>
    </div>
  );
}
