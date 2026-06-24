import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  loginSchema,
  registerSchema,
  type LoginInput,
  type RegisterInput,
} from "@/lib/validations";

type Search = { mode?: "login" | "register"; role?: "seeker" | "employer"; redirect?: string; email?: string };

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    mode: (s.mode as "login" | "register") === "register" ? "register" : "login",
    role: (s.role as "seeker" | "employer") === "employer" ? "employer" : "seeker",
    redirect: (s.redirect as string) || undefined,
    email: (s.email as string) || undefined,
  }),
  component: AuthPage,
});

function targetFor(role: string | null, redirect?: string) {
  if (redirect) return redirect;
  if (role === "employer") return "/employer";
  if (role === "admin") return "/admin/dashboard";
  return "/dashboard";
}

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

function AuthPage() {
  const { mode, role: initialRole, redirect, email: prefilledEmail } = Route.useSearch();
  const { user, role, loading, refreshRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      if (role !== null) {
        navigate({ to: targetFor(role, redirect), replace: true });
      }
    }
  }, [user, role, loading, redirect, navigate]);

  async function continueWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo:
          window.location.origin +
          "/auth/callback" +
          (redirect ? `?redirect=${encodeURIComponent(redirect)}` : ""),
      },
    });
    if (error) {
      toast.error(error.message ?? "Google sign-in failed");
    }
  }

  if (user && role === null && !loading) {
    return <RoleOnboarding user={user} onSuccess={refreshRole} />;
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <Card className="mx-auto max-w-md p-8">
        <Link to="/" className="block text-center mb-6 font-semibold text-lg">
          TalentFlow
        </Link>

        <Button variant="outline" className="w-full" onClick={continueWithGoogle}>
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#EA4335"
              d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1 0-3.4 2.7-6.1 6-6.1 1.9 0 3.2.8 3.9 1.5l2.6-2.5C16.9 3.6 14.7 2.6 12 2.6 6.8 2.6 2.6 6.8 2.6 12s4.2 9.4 9.4 9.4c5.4 0 9-3.8 9-9.2 0-.6-.1-1.1-.2-1.6H12z"
            />
          </svg>
          Continue with Google
        </Button>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <Tabs defaultValue={mode}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Sign in</TabsTrigger>
            <TabsTrigger value="register">Create account</TabsTrigger>
          </TabsList>
          <TabsContent value="login" className="mt-6">
            <LoginForm
              prefilledEmail={prefilledEmail}
              onSuccess={async () => {
                await refreshRole();
              }}
            />
          </TabsContent>
          <TabsContent value="register" className="mt-6">
            <RegisterForm
              initialRole={initialRole ?? "seeker"}
              prefilledEmail={prefilledEmail}
              onSuccess={async (email) => {
                navigate({ to: "/auth/check-email", search: { email } });
              }}
            />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}

function RoleOnboarding({ user, onSuccess }: { user: any; onSuccess: () => void }) {
  const [selectedRole, setSelectedRole] = useState<"seeker" | "employer">("seeker");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      const { error: roleErr } = await supabase.from("user_roles").insert({
        user_id: user.id,
        role: selectedRole,
      });
      if (roleErr) throw roleErr;

      await supabase.from("profiles").update({ full_name: user.user_metadata?.full_name || "" }).eq("id", user.id);

      toast.success("Role configured successfully!");
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to set role");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <Card className="mx-auto max-w-md p-8 space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Welcome to TalentFlow</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Please select your account type to continue.
          </p>
        </div>
        <div className="space-y-4">
          <div>
            <Label>I am a</Label>
            <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as "seeker" | "employer")}>
              <SelectTrigger className="w-full mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="seeker">Job Seeker</SelectItem>
                <SelectItem value="employer">Employer (Hiring)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={submit} className="w-full" disabled={busy}>
            {busy ? "Saving..." : "Continue"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function LoginForm({ onSuccess, prefilledEmail }: { onSuccess: () => void; prefilledEmail?: string }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: prefilledEmail || "", password: "" },
  });
  const [forgot, setForgot] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  async function onSubmit(v: LoginInput) {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: v.email,
        password: v.password,
      });
      if (error) {
        if (error.message.toLowerCase().includes("invalid") || error.message.toLowerCase().includes("credentials"))
          toast.error("Invalid email or password");
        else toast.error(error.message);
        return;
      }
      toast.success("Welcome back!");
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to sign in");
    }
  }

  if (forgot) return <ForgotForm onBack={() => setForgot(false)} />;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" autoComplete="email" {...register("email")} />
        {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
      </div>
      <div>
        <div className="flex justify-between">
          <Label htmlFor="password">Password</Label>
          <button
            type="button"
            onClick={() => setForgot(true)}
            className="text-xs text-primary hover:underline"
          >
            Forgot?
          </button>
        </div>
        <div className="relative mt-1">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            className="pr-10"
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Toggle password visibility"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password && (
          <p className="text-xs text-destructive mt-1">{errors.password.message}</p>
        )}
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="remember"
          checked={rememberMe}
          onCheckedChange={(checked) => setRememberMe(!!checked)}
        />
        <Label htmlFor="remember" className="text-xs font-normal text-muted-foreground cursor-pointer select-none">
          Remember me
        </Label>
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

function ForgotForm({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    toast.success("If an account exists, a reset link has been sent.");
  }
  return (
    <form onSubmit={send} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Enter your email and we'll send you a reset link.
      </p>
      <Input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
      />
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? "Sending…" : "Send reset link"}
      </Button>
      <Button type="button" variant="ghost" className="w-full" onClick={onBack}>
        Back
      </Button>
    </form>
  );
}

function RegisterForm({
  initialRole,
  onSuccess,
  prefilledEmail,
}: {
  initialRole: "seeker" | "employer";
  onSuccess: (email: string) => void;
  prefilledEmail?: string;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: initialRole,
      email: prefilledEmail || "",
      password: "",
      confirm_password: "",
      full_name: "",
      terms_accepted: false,
      privacy_accepted: false,
    },
  });
  const role = watch("role");
  const password = watch("password", "");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const strength = getPasswordStrength(password);

  async function onSubmit(v: RegisterInput) {
    try {
      const { error } = await supabase.auth.signUp({
        email: v.email,
        password: v.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: { role: v.role, full_name: v.full_name },
        },
      });
      if (error) {
        if (error.message.toLowerCase().includes("registered"))
          toast.error("Email already registered");
        else toast.error(error.message);
        return;
      }
      toast.success("Account created successfully!");
      onSuccess(v.email);
    } catch (err: any) {
      toast.error(err.message || "Failed to register account");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label>I am a</Label>
        <Select value={role} onValueChange={(v) => setValue("role", v as "seeker" | "employer")}>
          <SelectTrigger className="w-full mt-1.5">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="seeker">Job seeker</SelectItem>
            <SelectItem value="employer">Employer (hiring)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="full_name">Full name</Label>
        <Input id="full_name" {...register("full_name")} />
        {errors.full_name && (
          <p className="text-xs text-destructive mt-1">{errors.full_name.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" autoComplete="email" {...register("email")} />
        {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
      </div>
      <div>
        <Label htmlFor="reg-password">Password</Label>
        <div className="relative mt-1">
          <Input
            id="reg-password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            className="pr-10"
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Toggle password visibility"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {password && (
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
        {errors.password && (
          <p className="text-xs text-destructive mt-1">{errors.password.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="confirm_password">Confirm Password</Label>
        <div className="relative mt-1">
          <Input
            id="confirm_password"
            type={showConfirmPassword ? "text" : "password"}
            autoComplete="new-password"
            className="pr-10"
            {...register("confirm_password")}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Toggle confirm password visibility"
          >
            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.confirm_password && (
          <p className="text-xs text-destructive mt-1">{errors.confirm_password.message}</p>
        )}
      </div>

      <div className="space-y-2 pt-2 border-t border-muted/20">
        <div className="flex items-start space-x-2">
          <Controller
            control={control}
            name="terms_accepted"
            render={({ field }) => (
              <Checkbox
                id="terms_accepted"
                checked={field.value}
                onCheckedChange={field.onChange}
                className="mt-0.5"
              />
            )}
          />
          <Label htmlFor="terms_accepted" className="text-xs font-normal text-muted-foreground leading-normal cursor-pointer select-none">
            I agree to the{" "}
            <Link to="/" className="text-primary hover:underline">
              Terms of Service
            </Link>
          </Label>
        </div>
        {errors.terms_accepted && (
          <p className="text-xs text-destructive">{errors.terms_accepted.message}</p>
        )}

        <div className="flex items-start space-x-2">
          <Controller
            control={control}
            name="privacy_accepted"
            render={({ field }) => (
              <Checkbox
                id="privacy_accepted"
                checked={field.value}
                onCheckedChange={field.onChange}
                className="mt-0.5"
              />
            )}
          />
          <Label htmlFor="privacy_accepted" className="text-xs font-normal text-muted-foreground leading-normal cursor-pointer select-none">
            I agree to the{" "}
            <Link to="/" className="text-primary hover:underline">
              Privacy Policy
            </Link>
          </Label>
        </div>
        {errors.privacy_accepted && (
          <p className="text-xs text-destructive">{errors.privacy_accepted.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
