import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "seeker" | "employer" | "admin";

type AuthState = {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  /** null while the initial load is in progress; true/false once resolved */
  onboardingCompleted: boolean | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadRole(uid: string | undefined) {
    if (!uid) {
      setRole(null);
      setOnboardingCompleted(null);
      return;
    }
    const [{ data: roles }, { data: profile }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", uid),
      supabase.from("profiles").select("onboarding_completed").eq("id", uid).maybeSingle(),
    ]);
    if (!roles || roles.length === 0) {
      setRole(null);
    } else {
      const rank = { admin: 0, employer: 1, seeker: 2 } as const;
      const best = [...roles].sort((a, b) => rank[a.role as AppRole] - rank[b.role as AppRole])[0];
      setRole(best.role as AppRole);
    }
    setOnboardingCompleted(profile?.onboarding_completed ?? false);
  }

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setTimeout(() => loadRole(s?.user?.id), 0);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      loadRole(data.session?.user?.id).finally(() => setLoading(false));
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    setRole(null);
  }
  async function refreshRole() {
    await loadRole(session?.user?.id);
  }

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user ?? null, role, onboardingCompleted, loading, signOut, refreshRole }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
