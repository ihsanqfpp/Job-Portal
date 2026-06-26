import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, Briefcase, CheckCircle2, Users, Zap, Shield } from "lucide-react";
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

export const Route = createFileRoute("/auth/")({
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

const FEATURES = [
  { icon: Users, text: "Join 50,000+ professionals finding their next role" },
  { icon: Zap, text: "AI-powered job matching tailored to your profile" },
  { icon: Shield, text: "Trusted by 2,000+ companies worldwide" },
];

export function BrandPanel() {
  return (
    <div
      className="hidden lg:flex lg:w-[45%] xl:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
      style={{ backgroundColor: "#2b3940" }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, transparent, transparent 40px, rgba(255,255,255,0.02) 40px, rgba(255,255,255,0.02) 80px)",
        }}
      />
      <div
        className="absolute top-0 right-0 w-48 h-48 opacity-10 rounded-bl-full"
        style={{ backgroundColor: "#00B074" }}
      />
      <div
        className="absolute bottom-0 left-0 w-32 h-32 opacity-10 rounded-tr-full"
        style={{ backgroundColor: "#00B074" }}
      />

      <div className="relative z-10">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-[2px] bg-primary">
            <Briefcase className="h-5 w-5 text-white" />
          </span>
          <span className="text-2xl font-extrabold text-white tracking-tight">Hireway</span>
        </Link>
      </div>

      <div className="relative z-10 space-y-8">
        <div>
          <h1 className="text-4xl xl:text-5xl font-extrabold text-white leading-tight mb-4">
            Your Career<br />
            <span style={{ color: "#00B074" }}>Starts Here.</span>
          </h1>
          <p className="text-white/60 text-base leading-relaxed max-w-sm">
            Discover thousands of job opportunities and connect with top employers — all in one place.
          </p>
        </div>

        <ul className="space-y-4">
          {FEATURES.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[2px] bg-primary/20">
                <Icon className="h-3.5 w-3.5" style={{ color: "#00B074" }} />
              </span>
              <span className="text-sm text-white/70 leading-snug">{text}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="relative z-10 border-l-4 border-primary pl-4">
        <p className="text-sm text-white/50 italic leading-relaxed">
          "Found my dream job in 2 weeks. The AI matching is incredibly accurate."
        </p>
        <p className="mt-2 text-xs font-semibold" style={{ color: "#00B074" }}>
          — Sarah K., Software Engineer
        </p>
      </div>
    </div>
  );
}

function AuthPage() {
  const { mode, role: initialRole, redirect, email: prefilledEmail } = Route.useSearch();
  const { user, role, loading, refreshRole } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"login" | "register">(mode ?? "login");

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
    <div className="min-h-screen flex">
      <BrandPanel />

      <div className="flex-1 flex flex-col items-center justify-center bg-white px-4 py-12 sm:px-8">
        <div className="lg:hidden mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-[2px] bg-primary">
              <Briefcase className="h-4 w-4 text-white" />
            </span>
            <span className="text-xl font-extrabold text-gray-900">Hireway</span>
          </Link>
        </div>

        <div className="w-full max-w-105">
          <div className="mb-8">
            <h2 className="text-2xl font-extrabold text-gray-900">
              {activeTab === "login" ? "Welcome back" : "Create your account"}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {activeTab === "login"
                ? "Sign in to continue to Hireway"
                : "Start your job search journey today"}
            </p>
          </div>

          <button
            type="button"
            onClick={continueWithGoogle}
            className="w-full flex items-center justify-center gap-3 rounded-[2px] border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:bg-gray-50 hover:border-gray-300 hover:shadow-md focus-visible:outline-2 focus-visible:outline-primary"
          >
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-100" />
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">or</span>
            <div className="h-px flex-1 bg-gray-100" />
          </div>

          <div className="mb-6 flex rounded-[2px] border border-gray-200 overflow-hidden">
            {(["login", "register"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex-1 py-2.5 text-sm font-semibold transition-colors duration-200",
                  activeTab === tab
                    ? "bg-primary text-white"
                    : "bg-white text-gray-500 hover:text-gray-800 hover:bg-gray-50",
                )}
              >
                {tab === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          {activeTab === "login" ? (
            <LoginForm
              prefilledEmail={prefilledEmail}
              onSuccess={async () => { await refreshRole(); }}
            />
          ) : (
            <RegisterForm
              initialRole={initialRole ?? "seeker"}
              prefilledEmail={prefilledEmail}
              onSuccess={async (email) => {
                navigate({ to: "/auth/check-email", search: { email } });
              }}
            />
          )}

          <p className="mt-6 text-center text-sm text-gray-500">
            {activeTab === "login" ? (
              <>
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => setActiveTab("register")}
                  className="font-semibold text-primary hover:underline"
                >
                  Sign up free
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setActiveTab("login")}
                  className="font-semibold text-primary hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      </div>
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
    <div className="min-h-screen flex">
      <BrandPanel />
      <div className="flex-1 flex flex-col items-center justify-center bg-white px-4 py-12 sm:px-8">
        <div className="w-full max-w-105">
          <div className="mb-8">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[2px] bg-primary/10">
              <CheckCircle2 className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900">One last step</h2>
            <p className="mt-1 text-sm text-gray-500">
              Tell us how you'll use Hireway so we can personalise your experience.
            </p>
          </div>

          <div className="space-y-5">
            <div>
              <Label className="text-sm font-semibold text-gray-700">I am a</Label>
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as "seeker" | "employer")}>
                <SelectTrigger className="w-full mt-1.5 rounded-[2px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="seeker">Job Seeker — looking for work</SelectItem>
                  <SelectItem value="employer">Employer — hiring talent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <button
              type="button"
              onClick={submit}
              disabled={busy}
              className="w-full rounded-[2px] bg-primary px-4 py-3 text-sm font-bold text-white transition-colors duration-200 hover:bg-primary/90 disabled:opacity-60"
            >
              {busy ? "Saving…" : "Continue to Hireway"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-red-500">{msg}</p>;
}

function PasswordToggle({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
      aria-label="Toggle password visibility"
    >
      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
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
      const { error } = await supabase.auth.signInWithPassword({ email: v.email, password: v.password });
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
        <Label htmlFor="login-email" className="text-sm font-semibold text-gray-700">Email</Label>
        <Input
          id="login-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          className="mt-1.5 rounded-[2px] border-gray-200 focus-visible:ring-primary"
          {...register("email")}
        />
        <FieldError msg={errors.email?.message} />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <Label htmlFor="login-password" className="text-sm font-semibold text-gray-700">Password</Label>
          <button
            type="button"
            onClick={() => setForgot(true)}
            className="text-xs font-medium text-primary hover:underline"
          >
            Forgot password?
          </button>
        </div>
        <div className="relative mt-1.5">
          <Input
            id="login-password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            className="pr-10 rounded-[2px] border-gray-200 focus-visible:ring-primary"
            {...register("password")}
          />
          <PasswordToggle show={showPassword} onToggle={() => setShowPassword(!showPassword)} />
        </div>
        <FieldError msg={errors.password?.message} />
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="remember"
          checked={rememberMe}
          onCheckedChange={(checked) => setRememberMe(!!checked)}
        />
        <Label htmlFor="remember" className="text-xs font-normal text-gray-500 cursor-pointer select-none">
          Keep me signed in
        </Label>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-[2px] bg-primary px-4 py-3 text-sm font-bold text-white transition-colors duration-200 hover:bg-primary/90 disabled:opacity-60"
      >
        {isSubmitting ? "Signing in…" : "Sign In"}
      </button>
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
      <div className="rounded-[2px] bg-blue-50 border border-blue-100 p-3">
        <p className="text-sm text-blue-700">
          Enter your email and we'll send you a link to reset your password.
        </p>
      </div>
      <div>
        <Label className="text-sm font-semibold text-gray-700">Email</Label>
        <Input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="mt-1.5 rounded-[2px] border-gray-200 focus-visible:ring-primary"
        />
      </div>
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-[2px] bg-primary px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-primary/90 disabled:opacity-60"
      >
        {busy ? "Sending…" : "Send Reset Link"}
      </button>
      <button
        type="button"
        onClick={onBack}
        className="w-full rounded-[2px] border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
      >
        Back to Sign In
      </button>
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

  const inputCls = "mt-1.5 rounded-[2px] border-gray-200 focus-visible:ring-primary";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label className="text-sm font-semibold text-gray-700">I am a</Label>
        <div className="mt-1.5 flex rounded-[2px] border border-gray-200 overflow-hidden">
          {(["seeker", "employer"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setValue("role", r)}
              className={cn(
                "flex-1 py-2.5 text-sm font-semibold transition-colors duration-150",
                role === r ? "bg-primary text-white" : "bg-white text-gray-500 hover:bg-gray-50",
              )}
            >
              {r === "seeker" ? "Job Seeker" : "Employer"}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="full_name" className="text-sm font-semibold text-gray-700">Full Name</Label>
        <Input id="full_name" placeholder="Jane Smith" className={inputCls} {...register("full_name")} />
        <FieldError msg={errors.full_name?.message} />
      </div>

      <div>
        <Label htmlFor="reg-email" className="text-sm font-semibold text-gray-700">Email</Label>
        <Input
          id="reg-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          className={inputCls}
          {...register("email")}
        />
        <FieldError msg={errors.email?.message} />
      </div>

      <div>
        <Label htmlFor="reg-password" className="text-sm font-semibold text-gray-700">Password</Label>
        <div className="relative mt-1.5">
          <Input
            id="reg-password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Min. 8 characters"
            className={cn("pr-10", inputCls)}
            {...register("password")}
          />
          <PasswordToggle show={showPassword} onToggle={() => setShowPassword(!showPassword)} />
        </div>
        {password && (
          <div className="mt-2 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Password strength</span>
              <span className={cn("font-bold", strength.text)}>{strength.label}</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
              <div
                className={cn("h-full transition-all duration-300 rounded-full", strength.color)}
                style={{ width: `${strength.percent}%` }}
              />
            </div>
          </div>
        )}
        <FieldError msg={errors.password?.message} />
      </div>

      <div>
        <Label htmlFor="confirm_password" className="text-sm font-semibold text-gray-700">Confirm Password</Label>
        <div className="relative mt-1.5">
          <Input
            id="confirm_password"
            type={showConfirmPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Repeat your password"
            className={cn("pr-10", inputCls)}
            {...register("confirm_password")}
          />
          <PasswordToggle show={showConfirmPassword} onToggle={() => setShowConfirmPassword(!showConfirmPassword)} />
        </div>
        <FieldError msg={errors.confirm_password?.message} />
      </div>

      <div className="space-y-2 pt-1 border-t border-gray-100">
        <div className="flex items-start gap-2.5">
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
          <Label htmlFor="terms_accepted" className="text-xs font-normal text-gray-500 leading-snug cursor-pointer select-none">
            I agree to the{" "}
            <Link to="/" className="text-primary hover:underline font-medium">Terms of Service</Link>
          </Label>
        </div>
        <FieldError msg={errors.terms_accepted?.message} />

        <div className="flex items-start gap-2.5">
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
          <Label htmlFor="privacy_accepted" className="text-xs font-normal text-gray-500 leading-snug cursor-pointer select-none">
            I agree to the{" "}
            <Link to="/" className="text-primary hover:underline font-medium">Privacy Policy</Link>
          </Label>
        </div>
        <FieldError msg={errors.privacy_accepted?.message} />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-[2px] bg-primary px-4 py-3 text-sm font-bold text-white transition-colors duration-200 hover:bg-primary/90 disabled:opacity-60"
      >
        {isSubmitting ? "Creating account…" : "Create Account"}
      </button>
    </form>
  );
}
