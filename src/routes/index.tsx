import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Search,
  MapPin,
  Briefcase,
  Users,
  Building2,
  Code,
  Palette,
  TrendingUp,
  DollarSign,
  Megaphone,
  HeartPulse,
  Truck,
  ArrowRight,
  Star,
} from "lucide-react";
import { motion } from "motion/react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { JobCard } from "@/components/jobs/JobCard";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hireway — Find your next role" },
      { name: "description", content: "Search thousands of jobs from top companies. Apply in one click." },
      { property: "og:title", content: "Hireway — Find your next role" },
      { property: "og:description", content: "Search thousands of jobs from top companies. Apply in one click." },
      { property: "og:url", content: "/" },
      { name: "twitter:title", content: "Hireway — Find your next role" },
      { name: "twitter:description", content: "Search thousands of jobs from top companies. Apply in one click." },
    ],
  }),
  component: Home,
});

const CATEGORY_TILES: { slug: string; label: string; Icon: typeof Code; color: string }[] = [
  { slug: "engineering",       label: "Engineering",       Icon: Code,       color: "text-blue-500 bg-blue-500/10" },
  { slug: "design",            label: "Design",            Icon: Palette,    color: "text-purple-500 bg-purple-500/10" },
  { slug: "data-analytics",    label: "Data & Analytics",  Icon: TrendingUp, color: "text-emerald-500 bg-emerald-500/10" },
  { slug: "finance",           label: "Finance",           Icon: DollarSign, color: "text-amber-500 bg-amber-500/10" },
  { slug: "marketing",         label: "Marketing",         Icon: Megaphone,  color: "text-rose-500 bg-rose-500/10" },
  { slug: "sales",             label: "Sales",             Icon: Briefcase,  color: "text-orange-500 bg-orange-500/10" },
  { slug: "customer-support",  label: "Customer Support",  Icon: HeartPulse, color: "text-pink-500 bg-pink-500/10" },
  { slug: "operations",        label: "Operations",        Icon: Truck,      color: "text-teal-500 bg-teal-500/10" },
];

const POPULAR_SEARCHES = [
  "React Developer",
  "Product Manager",
  "Data Scientist",
  "UX Designer",
  "DevOps Engineer",
  "Marketing Manager",
];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.35, ease: "easeOut" },
  }),
};

function Home() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [loc, setLoc] = useState("");

  const stats = useQuery({
    queryKey: ["home", "stats"],
    queryFn: async () => {
      const [jobs, companies] = await Promise.all([
        supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("companies").select("id", { count: "exact", head: true }).eq("is_approved", true),
      ]);
      return { jobs: jobs.count ?? 0, companies: companies.count ?? 0, placed: 1240 };
    },
  });

  const categoryCounts = useQuery({
    queryKey: ["home", "categoryCounts"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("slug,job_count");
      const m = new Map<string, number>();
      (data ?? []).forEach((c) => m.set(c.slug, c.job_count ?? 0));
      return m;
    },
    staleTime: 60_000,
  });

  const featured = useQuery({
    queryKey: ["home", "featured"],
    queryFn: async () => {
      const { data } = await supabase
        .from("jobs")
        .select(
          "id,title,description,location,type,experience_level,salary_min,salary_max,salary_currency,created_at,companies(name,logo_url)",
        )
        .eq("status", "open")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(6);
      return data ?? [];
    },
  });

  function search(e: React.FormEvent) {
    e.preventDefault();
    navigate({ to: "/jobs", search: { q, location: loc } as never });
  }

  const statItems = [
    { label: "Open jobs",       value: stats.data?.jobs?.toLocaleString(),    icon: Briefcase },
    { label: "Companies hiring", value: stats.data?.companies?.toLocaleString(), icon: Building2 },
    { label: "People placed",   value: stats.data?.placed?.toLocaleString(),  icon: Users },
  ];

  return (
    <div className="page-fade">
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b bg-background">
        {/* Gradient mesh background */}
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% -10%, oklch(0.7 0.18 259 / 0.10) 0%, transparent 70%), " +
              "radial-gradient(ellipse 50% 40% at 85% 60%, oklch(0.65 0.18 300 / 0.06) 0%, transparent 60%)",
          }}
        />

        <div className="container mx-auto px-4 pb-16 pt-20 md:pb-24 md:pt-28 text-center">
          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Badge variant="info" className="mb-6 px-3 py-1 text-xs font-medium rounded-full">
              <Star className="mr-1.5 h-3 w-3" />
              Trusted by 500+ companies worldwide
            </Badge>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="mx-auto max-w-4xl text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl"
          >
            Find work that{" "}
            <span className="text-primary">moves you forward</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.12 }}
            className="mx-auto mt-5 max-w-xl text-base text-muted-foreground md:text-lg"
          >
            Thousands of opportunities from the world's best companies.
            One profile, smart matching, one-click apply.
          </motion.p>

          {/* Search bar */}
          <motion.form
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.38, delay: 0.18 }}
            onSubmit={search}
            className="mx-auto mt-8 flex w-full max-w-2xl flex-col gap-2 rounded-2xl border bg-card p-2 shadow-md md:flex-row"
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Job title, skill, or company"
                className="border-0 pl-9 shadow-none focus-visible:ring-0 bg-transparent"
              />
            </div>
            <div className="relative w-full md:max-w-47.5">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={loc}
                onChange={(e) => setLoc(e.target.value)}
                placeholder="Location"
                className="border-0 pl-9 shadow-none focus-visible:ring-0 bg-transparent"
              />
            </div>
            <Button type="submit" size="lg" className="w-full md:w-auto px-7 rounded-xl">
              Search jobs
            </Button>
          </motion.form>

          {/* Popular search chips */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.28, duration: 0.3 }}
            className="mt-5 flex flex-wrap items-center justify-center gap-2"
          >
            <span className="text-xs text-muted-foreground">Popular:</span>
            {POPULAR_SEARCHES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => navigate({ to: "/jobs", search: { q: s } as never })}
                className="rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
              >
                {s}
              </button>
            ))}
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32, duration: 0.35 }}
            className="mx-auto mt-14 grid max-w-lg grid-cols-3 gap-4 sm:gap-8"
          >
            {statItems.map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <div className="text-2xl font-extrabold tabular-nums md:text-3xl">
                  {value ?? (
                    <Skeleton className="h-8 w-16 mx-auto" />
                  )}
                </div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Categories ────────────────────────────────────────────────────── */}
      <section className="container mx-auto px-4 py-16">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Explore by category</h2>
            <p className="mt-1 text-sm text-muted-foreground">Find roles in your field</p>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/jobs">
              View all <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4">
          {CATEGORY_TILES.map(({ slug, label, Icon, color }, i) => (
            <motion.div
              key={slug}
              custom={i}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
            >
              <Link
                to="/jobs"
                search={{ category: slug } as never}
                className="group flex items-start gap-3 rounded-xl border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-sm"
              >
                <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-lg transition-colors group-hover:opacity-90", color)}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 pt-0.5">
                  <div className="text-sm font-semibold truncate leading-snug">{label}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {categoryCounts.data?.get(slug) ?? 0} open
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Featured jobs ─────────────────────────────────────────────────── */}
      <section className="border-t bg-surface-0">
        <div className="container mx-auto px-4 py-16">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold">Latest opportunities</h2>
              <p className="mt-1 text-sm text-muted-foreground">Fresh roles posted this week</p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/jobs">
                View all <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>

          {featured.isLoading ? (
            <div className="grid gap-3 md:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-36 rounded-xl" />
              ))}
            </div>
          ) : (featured.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No jobs yet — check back soon.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {(featured.data ?? []).map((j, i) => (
                <motion.div
                  key={j.id}
                  custom={i}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-30px" }}
                >
                  <JobCard job={j as never} />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Trust strip ───────────────────────────────────────────────────── */}
      <section className="border-t border-b">
        <div className="container mx-auto px-4 py-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-6">
            Trusted by teams at leading companies
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 opacity-50">
            {["Stripe", "Vercel", "Linear", "Notion", "Figma", "Loom"].map((name) => (
              <span key={name} className="text-base font-bold text-foreground/60">{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Employer CTA ──────────────────────────────────────────────────── */}
      <section className="container mx-auto px-4 py-16">
        <div className="relative overflow-hidden rounded-2xl bg-primary px-8 py-12 md:px-14 md:py-16 text-center">
          {/* Background decorations */}
          <div
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              background:
                "radial-gradient(circle at 20% 50%, oklch(0.99 0 0 / 0.15) 0%, transparent 50%)," +
                "radial-gradient(circle at 80% 20%, oklch(0.99 0 0 / 0.10) 0%, transparent 40%)",
            }}
          />
          <h2 className="relative text-2xl font-extrabold text-primary-foreground md:text-3xl">
            Ready to hire great talent?
          </h2>
          <p className="relative mx-auto mt-3 max-w-md text-primary-foreground/80">
            Post your role to thousands of qualified candidates. Set up in under 60 seconds.
          </p>
          <div className="relative mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild size="lg" variant="secondary" className="font-semibold px-8">
              <Link to="/auth" search={{ mode: "register", role: "employer" } as never}>
                Post a job free
              </Link>
            </Button>
            <Button asChild size="lg" variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/10 border border-primary-foreground/30">
              <Link to="/companies">Browse companies</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
