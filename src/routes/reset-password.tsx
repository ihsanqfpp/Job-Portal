import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

function getPasswordStrength(password: string) {
  if (!password) return { label: "None", percent: 0, color: "bg-muted", text: "text-muted-foreground" };
  let score = 0;
  if (password.length >= 8) score += 20;
  if (/[A-Z]/.test(password)) score += 20;
  if (/[a-z]/.test(password)) score += 20;
  if (/[0-9]/.test(password)) score += 20;
  if (/[^A-Za-z0-9]/.test(password)) score += 20;

  if (score <= 40) return { label: "Weak", percent: score, color: "bg-red-500", text: "text-red-500" };
  if (score <= 80) return { label: "Medium", percent: score, color: "bg-amber-500", text: "text-amber-500" };
  return { label: "Strong", percent: score, color: "bg-emerald-500", text: "text-emerald-500" };
}

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [pw, setPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  const strength = getPasswordStrength(pw);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (hash.includes("type=recovery") || hash.includes("access_token")) {
      setReady(true);
    } else {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) setReady(true);
      });
    }
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return toast.error("Password must be at least 8 characters");
    if (strength.label === "Weak") return toast.error("Please choose a stronger password");
    if (pw !== confirmPw) return toast.error("Passwords do not match");

    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated successfully. You are now signed in.");
    navigate({ to: "/" });
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <Card className="mx-auto max-w-md p-8">
        <h1 className="text-xl font-bold tracking-tight text-center mb-6">Reset Password</h1>
        {!ready ? (
          <p className="mt-4 text-sm text-muted-foreground text-center">
            This link is invalid or has expired. Please request a new reset link from the sign-in page.
          </p>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-4">
            <div>
              <Label htmlFor="pw">New password</Label>
              <div className="relative mt-1">
                <Input
                  id="pw"
                  type={showPw ? "text" : "password"}
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Toggle password visibility"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {pw && (
                <div className="space-y-1 mt-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground font-medium">Strength:</span>
                    <span className={cn("font-bold", strength.text)}>{strength.label}</span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn("h-full transition-all duration-300", strength.color)}
                      style={{ width: `${strength.percent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="confirm-pw">Confirm new password</Label>
              <div className="relative mt-1">
                <Input
                  id="confirm-pw"
                  type={showConfirmPw ? "text" : "password"}
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPw(!showConfirmPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Toggle confirm password visibility"
                >
                  {showConfirmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Updating…" : "Update password"}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
