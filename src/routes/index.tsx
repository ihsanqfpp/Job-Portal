import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
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
  ChevronLeft,
  ChevronRight,
  Star,
  CheckCircle2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { JobCard } from "@/components/jobs/JobCard";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionHeading } from "@/components/common/SectionHeading";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hireway — Find your next role" },
      {
        name: "description",
        content:
          "Search thousands of jobs from top companies. Apply in one click.",
      },
      { property: "og:title", content: "Hireway — Find your next role" },
      {
        property: "og:description",
        content: "Search thousands of jobs from top companies. Apply in one click.",
      },
      { property: "og:url", content: "/" },
    ],
  }),
  component: Home,
});

/* ── Static data ─────────────────────────────────────────────────────── */

const SLIDES = [
  {
    bg: "linear-gradient(135deg, #0f1d22 0%, #2b3940 65%, #1a3040 100%)",
    headline: "Find The Perfect Job\nThat You Deserved",
    sub: "Thousands of opportunities from the world's best companies. One profile, smart matching, one-click apply.",
    cta1: { label: "Browse Jobs", to: "/jobs" },
    cta2: { label: "Post A Job", to: "/auth" },
  },
  {
    bg: "linear-gradient(135deg, #0a1628 0%, #172533 50%, #2b3940 100%)",
    headline: "Find The Best Role\nThat Fits Your Skills",
    sub: "Upload your resume, let AI analyze your profile, and discover roles matched precisely to your experience.",
    cta1: { label: "Explore Now", to: "/jobs" },
    cta2: { label: "View Companies", to: "/companies" },
  },
];

const CATEGORIES = [
  { slug: "engineering",      label: "Engineering",       Icon: Code,       color: "text-blue-500 bg-blue-500/10" },
  { slug: "design",           label: "Design",            Icon: Palette,    color: "text-purple-500 bg-purple-500/10" },
  { slug: "data-analytics",   label: "Data & Analytics",  Icon: TrendingUp, color: "text-emerald-500 bg-emerald-500/10" },
  { slug: "finance",          label: "Finance",           Icon: DollarSign, color: "text-amber-500 bg-amber-500/10" },
  { slug: "marketing",        label: "Marketing",         Icon: Megaphone,  color: "text-rose-500 bg-rose-500/10" },
  { slug: "sales",            label: "Sales",             Icon: Briefcase,  color: "text-orange-500 bg-orange-500/10" },
  { slug: "customer-support", label: "Customer Support",  Icon: HeartPulse, color: "text-pink-500 bg-pink-500/10" },
  { slug: "operations",       label: "Operations",        Icon: Truck,      color: "text-teal-500 bg-teal-500/10" },
];

const TESTIMONIALS = [
  {
    id: 1,
    name: "Sarah Johnson",
    role: "Software Engineer",
    text: "Found my dream job in just 2 weeks! The AI matching was incredibly accurate and saved me hours of searching.",
  },
  {
    id: 2,
    name: "Michael Chen",
    role: "Product Manager",
    text: "Hireway's smart matching helped me discover roles I wouldn't have found on my own. Landed at my dream startup.",
  },
  {
    id: 3,
    name: "Emma Davis",
    role: "UX Designer",
    text: "The AI resume analyzer gave me insights that completely transformed my application strategy. Highly recommended!",
  },
  {
    id: 4,
    name: "David Wilson",
    role: "Data Scientist",
    text: "Applied to 5 companies and got 3 interviews within a week. Best job search platform I've ever used.",
  },
];

const FEATURES = [
  "Smart AI-powered job matching for your profile",
  "One-click apply with your saved resume",
  "Real-time application tracking dashboard",
];

/* ── Carousel ────────────────────────────────────────────────────────── */

function HeroCarousel() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [loc, setLoc] = useState("");

  useEffect(() => {
    if (paused) return;
    const id = setInterval(
      () => setCurrent((s) => (s + 1) % SLIDES.length),
      5500,
    );
    return () => clearInterval(id);
  }, [paused]);

  function prev() {
    setCurrent((s) => (s - 1 + SLIDES.length) % SLIDES.length);
  }
  function next() {
    setCurrent((s) => (s + 1) % SLIDES.length);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate({ to: "/jobs", search: { q, location: loc } as never });
  }

  const slide = SLIDES[current];

  return (
    <div
      className="relative min-h-150 overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Slide background */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          className="absolute inset-0"
          style={{ background: slide.bg }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
        />
      </AnimatePresence>

      {/* Decorative overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 1px,transparent 14px)",
        }}
      />

      {/* Content */}
      <div className="relative container mx-auto flex min-h-150 flex-col items-center justify-center px-4 py-24 text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            className="w-full max-w-3xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            {/* Heading with je-heading-accent block */}
            <div className="mx-auto mb-6 inline-block text-left je-heading-accent py-2">
              <h1 className="text-4xl font-extrabold leading-tight text-white md:text-5xl lg:text-6xl whitespace-pre-line">
                {slide.headline}
              </h1>
            </div>

            <p className="mx-auto mb-10 max-w-xl text-base text-white/70 md:text-lg">
              {slide.sub}
            </p>

            {/* Hero search */}
            <form
              onSubmit={handleSearch}
              className="mx-auto flex max-w-2xl flex-col gap-2 overflow-hidden rounded-[2px] bg-white p-2 shadow-xl sm:flex-row"
            >
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Job title, skill, or company"
                  className="border-0 bg-transparent pl-9 shadow-none focus-visible:ring-0"
                />
              </div>
              <div className="relative w-full sm:w-44">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={loc}
                  onChange={(e) => setLoc(e.target.value)}
                  placeholder="Location"
                  className="border-0 bg-transparent pl-9 shadow-none focus-visible:ring-0"
                />
              </div>
              <button
                type="submit"
                className="rounded-[2px] px-7 py-2.5 text-sm font-bold uppercase tracking-wider text-white transition-colors duration-300"
                style={{ backgroundColor: "#2b3940" }}
              >
                Search
              </button>
            </form>

            {/* CTAs */}
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to={slide.cta1.to}
                className="inline-flex items-center gap-2 rounded-[2px] bg-primary px-7 py-3 text-sm font-bold uppercase tracking-wider text-white transition-all duration-500 hover:bg-primary/85"
              >
                {slide.cta1.label}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to={slide.cta2.to}
                className="inline-flex items-center gap-2 rounded-[2px] border border-white/30 px-7 py-3 text-sm font-bold uppercase tracking-wider text-white transition-all duration-500 hover:border-primary hover:bg-primary"
              >
                {slide.cta2.label}
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Prev / Next arrows — stacked on right edge */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 md:right-8">
          <button
            onClick={prev}
            aria-label="Previous slide"
            className="flex h-10 w-10 items-center justify-center rounded-[2px] border border-white/30 text-white transition-all duration-300 hover:border-primary hover:bg-primary"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={next}
            aria-label="Next slide"
            className="flex h-10 w-10 items-center justify-center rounded-[2px] border border-white/30 text-white transition-all duration-300 hover:border-primary hover:bg-primary"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Dot indicators */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={cn(
                "h-2.5 w-2.5 rounded-[2px] transition-all duration-300",
                i === current ? "bg-primary w-6" : "bg-white/40",
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Testimonials carousel ───────────────────────────────────────────── */

function TestimonialsSection() {
  const [center, setCenter] = useState(1);
  const n = TESTIMONIALS.length;
  const prev = () => setCenter((c) => (c - 1 + n) % n);
  const next = () => setCenter((c) => (c + 1) % n);

  const visible = [-1, 0, 1].map(
    (offset) => TESTIMONIALS[(center + offset + n) % n],
  );

  return (
    <section className="portal-bg border-t border-b py-20">
      <div className="container mx-auto px-4">
        <SectionHeading
          eyebrow="Testimonials"
          center
          sub="What our job seekers say about us"
        >
          What They Say About Us
        </SectionHeading>

        {/* Cards */}
        <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
          {visible.map((t, idx) => {
            const isCenter = idx === 1;
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35 }}
                className={cn(
                  "rounded-[2px] p-7 transition-all duration-300",
                  isCenter
                    ? "bg-primary text-white shadow-xl"
                    : "bg-card je-card hidden md:block",
                )}
              >
                <p
                  className={cn(
                    "mb-6 text-sm leading-relaxed",
                    isCenter ? "text-white/90" : "text-muted-foreground",
                  )}
                >
                  "{t.text}"
                </p>
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold",
                      isCenter
                        ? "bg-white/20 text-white"
                        : "bg-primary/10 text-primary",
                    )}
                  >
                    {t.name[0]}
                  </div>
                  <div>
                    <p
                      className={cn(
                        "text-sm font-bold",
                        isCenter ? "text-white" : "text-foreground",
                      )}
                    >
                      {t.name}
                    </p>
                    <p
                      className={cn(
                        "text-xs",
                        isCenter ? "text-white/60" : "text-muted-foreground",
                      )}
                    >
                      {t.role}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Controls */}
        <div className="mt-8 flex items-center justify-center gap-4">
          <button
            onClick={prev}
            aria-label="Previous testimonial"
            className="flex h-9 w-9 items-center justify-center rounded-[2px] border border-border transition-colors hover:border-primary hover:text-primary"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* Square dot indicators */}
          <div className="flex items-center gap-1.5">
            {TESTIMONIALS.map((_, i) => (
              <button
                key={i}
                onClick={() => setCenter(i)}
                aria-label={`Go to testimonial ${i + 1}`}
                className={cn(
                  "h-2.5 w-2.5 rounded-[2px] transition-all duration-300",
                  i === center ? "bg-primary w-5" : "bg-border",
                )}
              />
            ))}
          </div>

          <button
            onClick={next}
            aria-label="Next testimonial"
            className="flex h-9 w-9 items-center justify-center rounded-[2px] border border-border transition-colors hover:border-primary hover:text-primary"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}

/* ── Home page ───────────────────────────────────────────────────────── */

function Home() {
  const [activeTab, setActiveTab] = useState<"all" | "full-time" | "part-time">("all");

  const stats = useQuery({
    queryKey: ["home", "stats"],
    queryFn: async () => {
      const [jobs, companies] = await Promise.all([
        supabase
          .from("jobs")
          .select("id", { count: "exact", head: true })
          .eq("status", "open"),
        supabase
          .from("companies")
          .select("id", { count: "exact", head: true })
          .eq("is_approved", true),
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
        .limit(8);
      return data ?? [];
    },
  });

  const filteredJobs = useMemo(() => {
    const jobs = featured.data ?? [];
    if (activeTab === "all") return jobs;
    return jobs.filter((j) => j.type === activeTab);
  }, [featured.data, activeTab]);

  const statItems = [
    { label: "Open Jobs", value: stats.data?.jobs?.toLocaleString(), Icon: Briefcase },
    { label: "Companies Hiring", value: stats.data?.companies?.toLocaleString(), Icon: Building2 },
    { label: "People Placed", value: stats.data?.placed?.toLocaleString(), Icon: Users },
  ];

  return (
    <div className="page-fade">
      {/* ── 1. Hero Carousel ─────────────────────────────────── */}
      <HeroCarousel />

      {/* ── 2. Stats strip on green band ─────────────────────── */}
      <div className="bg-primary py-10">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-3 gap-4 divide-x divide-white/20">
            {statItems.map(({ label, value, Icon }) => (
              <div key={label} className="flex flex-col items-center gap-1 text-center">
                <Icon className="mb-1 h-7 w-7 text-white/80" />
                <div className="text-2xl font-extrabold tabular-nums text-white md:text-3xl">
                  {value ?? <Skeleton className="mx-auto h-8 w-16 bg-white/20" />}
                </div>
                <div className="text-xs font-semibold uppercase tracking-wider text-white/70">
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 3. Explore by Category ───────────────────────────── */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
          {/* Left: heading */}
          <SectionHeading
            eyebrow="Explore Categories"
            sub="Find roles in your field and discover new opportunities."
          >
            Explore By Category
          </SectionHeading>

          {/* Right: CTA */}
          <div className="hidden lg:flex items-center justify-end">
            <Link
              to="/jobs"
              className="inline-flex items-center gap-2 rounded-[2px] border border-primary px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-primary transition-all duration-300 hover:bg-primary hover:text-white"
            >
              View All Jobs <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {CATEGORIES.map(({ slug, label, Icon, color }, i) => (
            <motion.div
              key={slug}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
            >
              <Link
                to="/jobs"
                search={{ category: slug } as never}
                className="group flex items-start gap-3 rounded-[2px] border border-border bg-card p-4 je-card"
              >
                <div
                  className={cn(
                    "grid h-12 w-12 shrink-0 place-items-center rounded-[2px] transition-opacity group-hover:opacity-80",
                    color,
                  )}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <div className="min-w-0 pt-0.5">
                  <div className="truncate text-sm font-bold text-foreground group-hover:text-primary transition-colors duration-300">
                    {label}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {categoryCounts.data?.get(slug) ?? 0} Vacancy
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="mt-6 flex justify-center lg:hidden">
          <Link
            to="/jobs"
            className="inline-flex items-center gap-2 rounded-[2px] bg-primary px-6 py-2.5 text-sm font-bold uppercase tracking-wider text-white transition-all duration-300 hover:bg-primary/85"
          >
            View All Jobs <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ── 4. About / Features ──────────────────────────────── */}
      <section className="border-t bg-surface-0">
        <div className="container mx-auto px-4 py-20">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            {/* Left: visual placeholder (2×2 grid of colored blocks) */}
            <div className="relative grid grid-cols-2 gap-3">
              {[
                { bg: "bg-primary/15", label: "AI Matching" },
                { bg: "bg-secondary/15", label: "Smart Apply" },
                { bg: "bg-warning/15", label: "Resume AI" },
                { bg: "bg-destructive/10", label: "Job Tracker" },
              ].map(({ bg, label }) => (
                <div
                  key={label}
                  className={cn(
                    "flex h-36 items-center justify-center rounded-[2px] border border-border text-sm font-semibold text-muted-foreground",
                    bg,
                  )}
                >
                  {label}
                </div>
              ))}
              {/* Decorative dot pattern */}
              <div
                className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 opacity-20"
                style={{
                  backgroundImage: "radial-gradient(circle, var(--primary) 1.5px, transparent 1.5px)",
                  backgroundSize: "12px 12px",
                }}
              />
            </div>

            {/* Right: heading + features + CTA */}
            <div>
              <SectionHeading
                eyebrow="About Hireway"
                sub="We combine AI technology with expert career guidance to help you land the perfect role faster."
              >
                We Help You Get The Best Job
              </SectionHeading>

              <ul className="mb-8 space-y-3">
                {FEATURES.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm text-foreground">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                to="/auth"
                className="inline-flex items-center gap-2 rounded-[2px] bg-primary px-7 py-3 text-sm font-bold uppercase tracking-wider text-white transition-all duration-500 hover:bg-primary/85"
              >
                Get Started <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. Job Listing with tabs ─────────────────────────── */}
      <section className="container mx-auto px-4 py-20">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading eyebrow="Latest Openings" className="mb-0">
            Job Listing
          </SectionHeading>

          {/* Tab row */}
          <div className="flex shrink-0 items-center gap-0 rounded-[2px] border border-border overflow-hidden">
            {(
              [
                { key: "all", label: "Featured" },
                { key: "full-time", label: "Full Time" },
                { key: "part-time", label: "Part Time" },
              ] as const
            ).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={cn(
                  "px-4 py-2 text-sm font-semibold transition-all duration-300",
                  activeTab === key
                    ? "bg-primary text-white"
                    : "text-muted-foreground hover:text-primary",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {featured.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-[2px]" />
            ))}
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="rounded-[2px] border border-border py-16 text-center text-muted-foreground">
            <Briefcase className="mx-auto mb-3 h-10 w-10 opacity-30" />
            <p>No jobs in this category yet.</p>
          </div>
        ) : (
          <motion.div
            className="space-y-3"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
          >
            <AnimatePresence>
              {filteredJobs.map((j) => (
                <motion.div
                  key={j.id}
                  variants={{
                    hidden: { opacity: 0, y: 10 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
                  }}
                >
                  <JobCard job={j as never} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Browse more */}
        <div className="mt-10 text-center">
          <Link
            to="/jobs"
            className="inline-flex items-center gap-2 rounded-[2px] border border-primary px-7 py-3 text-sm font-bold uppercase tracking-wider text-primary transition-all duration-300 hover:bg-primary hover:text-white"
          >
            Browse More Jobs <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ── 6. Testimonials ──────────────────────────────────── */}
      <TestimonialsSection />

      {/* ── 7. Trust strip ───────────────────────────────────── */}
      <section className="border-t">
        <div className="container mx-auto px-4 py-12 text-center">
          <p className="mb-6 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Trusted by teams at leading companies
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 opacity-40">
            {["Stripe", "Vercel", "Linear", "Notion", "Figma", "Loom"].map(
              (name) => (
                <span
                  key={name}
                  className="text-base font-extrabold text-foreground"
                >
                  {name}
                </span>
              ),
            )}
          </div>
        </div>
      </section>

      {/* ── 8. Employer CTA ──────────────────────────────────── */}
      <section className="container mx-auto px-4 pb-20">
        <div
          className="relative overflow-hidden rounded-[2px] px-8 py-14 text-center md:px-14"
          style={{
            background:
              "linear-gradient(135deg, #0f1d22 0%, #2b3940 60%, #1a3040 100%)",
          }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 1px,transparent 14px)",
            }}
          />
          <h2 className="relative text-2xl font-extrabold text-white md:text-3xl">
            Ready To Hire Great Talent?
          </h2>
          <p className="relative mx-auto mt-3 max-w-md text-white/65">
            Post your role to thousands of qualified candidates. Set up your
            employer profile in under 60 seconds.
          </p>
          <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/auth"
              search={{ mode: "register", role: "employer" } as never}
              className="inline-flex items-center gap-2 rounded-[2px] bg-primary px-8 py-3 text-sm font-bold uppercase tracking-wider text-white transition-all duration-500 hover:bg-primary/85"
            >
              Post A Job Free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/companies"
              className="inline-flex items-center gap-2 rounded-[2px] border border-white/30 px-8 py-3 text-sm font-bold uppercase tracking-wider text-white transition-all duration-500 hover:border-primary hover:bg-primary"
            >
              Browse Companies
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
