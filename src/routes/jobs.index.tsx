import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Search, MapPin, SlidersHorizontal, X, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/auth-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { JobCard } from "@/components/jobs/JobCard";
import { EmptyState } from "@/components/common/EmptyState";
import { computeMatch } from "@/lib/match";
import { cn } from "@/lib/utils";

type Search = {
  q?: string;
  location?: string;
  category?: string;
  types?: string;
  levels?: string;
  sort?: string;
  smin?: number;
  smax?: number;
};

export const Route = createFileRoute("/jobs/")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    q: (s.q as string) || "",
    location: (s.location as string) || "",
    category: (s.category as string) || "",
    types: (s.types as string) || "",
    levels: (s.levels as string) || "",
    sort: (s.sort as string) || "newest",
    smin: typeof s.smin === "number" ? s.smin : Number(s.smin) || 0,
    smax: typeof s.smax === "number" ? s.smax : Number(s.smax) || 300000,
  }),
  head: () => ({
    meta: [
      { title: "Browse Jobs — Hireway" },
      { name: "description", content: "Search and filter jobs by category, location, type, and salary." },
      { property: "og:title", content: "Browse Jobs — Hireway" },
      { property: "og:description", content: "Search and filter jobs by category, location, type, and salary." },
      { property: "og:url", content: "/jobs" },
    ],
  }),
  component: JobsPage,
});

const TYPES  = ["full-time", "part-time", "remote", "hybrid", "contract", "internship"] as const;
const LEVELS = ["entry", "junior", "mid", "senior", "lead"] as const;
const SALARY_MAX = 300_000;

function useDebounced<T>(v: T, ms = 280) {
  const [d, setD] = useState(v);
  useEffect(() => {
    const id = setTimeout(() => setD(v), ms);
    return () => clearTimeout(id);
  }, [v, ms]);
  return d;
}

function typeLabel(t: string) {
  const m: Record<string, string> = {
    "full-time": "Full-time", "part-time": "Part-time",
    remote: "Remote", hybrid: "Hybrid",
    contract: "Contract", internship: "Internship",
  };
  return m[t] ?? t;
}

/** Active-filter chip — shows a dismissible pill for each applied filter. */
function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/8 px-2.5 py-0.5 text-xs font-medium text-primary">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label} filter`}
        className="ml-0.5 rounded-full hover:bg-primary/15 p-0.5"
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </span>
  );
}

function JobsPage() {
  const params  = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { user, role } = useAuth();

  const [q,   setQ]   = useState(params.q ?? "");
  const [loc, setLoc] = useState(params.location ?? "");
  const [salary, setSalary] = useState<[number, number]>([
    params.smin ?? 0,
    params.smax ?? SALARY_MAX,
  ]);

  const dq     = useDebounced(q);
  const dloc   = useDebounced(loc);
  const dSalary = useDebounced(salary, 350);

  useEffect(() => {
    navigate({ search: (prev: Search) => ({ ...prev, smin: dSalary[0], smax: dSalary[1] }) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dSalary[0], dSalary[1]]);

  const selectedTypes  = useMemo(
    () => (params.types  ? params.types.split(",").filter(Boolean)  : []),
    [params.types],
  );
  const selectedLevels = useMemo(
    () => (params.levels ? params.levels.split(",").filter(Boolean) : []),
    [params.levels],
  );

  function toggleArr(curr: string[], v: string) {
    return curr.includes(v) ? curr.filter((x) => x !== v) : [...curr, v];
  }
  function updateSearch(patch: Partial<Search>) {
    navigate({ search: (prev: Search) => ({ ...prev, ...patch }) });
  }
  function clearAll() {
    setQ(""); setLoc(""); setSalary([0, SALARY_MAX]);
    navigate({
      search: { q: "", location: "", category: "", types: "", levels: "", sort: "newest", smin: 0, smax: SALARY_MAX },
    });
  }

  const hasActiveFilters =
    !!dq || !!dloc || !!params.category || selectedTypes.length > 0 ||
    selectedLevels.length > 0 || dSalary[0] > 0 || dSalary[1] < SALARY_MAX;

  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await supabase.from("categories").select("*").order("name")).data ?? [],
    staleTime: 5 * 60 * 1000,
  });

  const mySkills = useQuery({
    queryKey: ["my-skills", user?.id],
    enabled: !!user && role === "seeker",
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("skills").eq("id", user!.id).single();
      return (data?.skills as string[]) ?? [];
    },
  });

  const PAGE_SIZE = 20;
  const jobs = useInfiniteQuery({
    queryKey: [
      "jobs", dq, dloc, params.category,
      selectedTypes.join(","), selectedLevels.join(","),
      params.sort, dSalary[0], dSalary[1],
    ],
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      let qb = supabase
        .from("jobs")
        .select(
          "id,title,description,location,type,experience_level,salary_min,salary_max,salary_currency,created_at,category,skills_required,companies(name,logo_url)",
        )
        .eq("status", "open")
        .gt("expires_at", new Date().toISOString());

      if (dq)   qb = qb.or(`title.ilike.%${dq}%,description.ilike.%${dq}%`);
      if (dloc) qb = qb.ilike("location", `%${dloc}%`);
      if (params.category)       qb = qb.eq("category", params.category);
      if (selectedTypes.length)  qb = qb.in("type", selectedTypes as Database["public"]["Enums"]["job_type"][]);
      if (selectedLevels.length) qb = qb.in("experience_level", selectedLevels as Database["public"]["Enums"]["experience_level"][]);
      if (dSalary[0] > 0)         qb = qb.gte("salary_max", dSalary[0]);
      if (dSalary[1] < SALARY_MAX) qb = qb.lte("salary_min", dSalary[1]);

      switch (params.sort) {
        case "oldest":      qb = qb.order("created_at", { ascending: true }); break;
        case "salary_high": qb = qb.order("salary_max",  { ascending: false, nullsFirst: false }); break;
        case "salary_low":  qb = qb.order("salary_min",  { ascending: true,  nullsFirst: false }); break;
        default:            qb = qb.order("created_at",  { ascending: false });
      }

      const from = (pageParam as number) * PAGE_SIZE;
      const { data, error } = await qb.range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      return data ?? [];
    },
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < PAGE_SIZE ? undefined : allPages.length,
  });

  const allJobs = jobs.data?.pages.flat() ?? [];

  /* ── Sidebar filter panel (desktop + mobile sheet) ── */
  const FilterPanel = (
    <div className="space-y-6">
      {/* Category */}
      <div>
        <Label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Category
        </Label>
        <Select
          value={params.category || "all"}
          onValueChange={(v) => updateSearch({ category: v === "all" ? "" : v })}
        >
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {(categories.data ?? []).map((c) => (
              <SelectItem key={c.id} value={c.slug}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Salary */}
      <div>
        <Label className="mb-3 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Salary range
        </Label>
        <div className="mb-3 flex justify-between text-sm font-medium tabular-nums">
          <span>${(salary[0] / 1000).toFixed(0)}k</span>
          <span>
            {salary[1] >= SALARY_MAX ? `$${SALARY_MAX / 1000}k+` : `$${(salary[1] / 1000).toFixed(0)}k`}
          </span>
        </div>
        <Slider
          min={0} max={SALARY_MAX} step={5000}
          value={salary}
          onValueChange={(v) => setSalary([v[0], v[1]] as [number, number])}
        />
      </div>

      {/* Job type */}
      <div>
        <Label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Job type
        </Label>
        <div className="space-y-2">
          {TYPES.map((t) => (
            <div key={t} className="flex items-center gap-2">
              <Checkbox
                id={`t-${t}`}
                checked={selectedTypes.includes(t)}
                onCheckedChange={() =>
                  updateSearch({ types: toggleArr(selectedTypes, t).join(",") })
                }
              />
              <Label htmlFor={`t-${t}`} className="capitalize font-normal text-sm cursor-pointer">
                {typeLabel(t)}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Experience */}
      <div>
        <Label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Experience level
        </Label>
        <div className="space-y-2">
          {LEVELS.map((l) => (
            <div key={l} className="flex items-center gap-2">
              <Checkbox
                id={`l-${l}`}
                checked={selectedLevels.includes(l)}
                onCheckedChange={() =>
                  updateSearch({ levels: toggleArr(selectedLevels, l).join(",") })
                }
              />
              <Label htmlFor={`l-${l}`} className="capitalize font-normal text-sm cursor-pointer">
                {l}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <Button variant="outline" size="sm" className="w-full" onClick={clearAll}>
        Clear all filters
      </Button>
    </div>
  );

  return (
    <div className="portal-bg min-h-screen page-fade">
      {/* ── Sticky search + filter bar ─────────────────────────────────── */}
      <div className="sticky top-16 z-20 border-b bg-background/95 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-2 py-3">
            {/* Keyword */}
            <div className="relative flex-1 min-w-0">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => { setQ(e.target.value); updateSearch({ q: e.target.value }); }}
                placeholder="Title, skill, or company"
                className="pl-9 h-9"
              />
            </div>

            {/* Location */}
            <div className="relative hidden sm:block w-44">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={loc}
                onChange={(e) => { setLoc(e.target.value); updateSearch({ location: e.target.value }); }}
                placeholder="Location"
                className="pl-9 h-9"
              />
            </div>

            {/* Sort */}
            <Select value={params.sort ?? "newest"} onValueChange={(v) => updateSearch({ sort: v })}>
              <SelectTrigger className="h-9 w-36 hidden md:flex text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
                <SelectItem value="salary_high">Salary: high → low</SelectItem>
                <SelectItem value="salary_low">Salary: low → high</SelectItem>
              </SelectContent>
            </Select>

            {/* Mobile filter sheet */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="md:hidden h-9 gap-1.5">
                  <SlidersHorizontal className="h-4 w-4" />
                  Filters
                  {hasActiveFilters && (
                    <span className="h-2 w-2 rounded-full bg-primary" />
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 overflow-y-auto">
                <SheetHeader className="mb-6">
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                {FilterPanel}
              </SheetContent>
            </Sheet>
          </div>

          {/* Active filter chips */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 pb-3">
              {dq && (
                <FilterChip label={`"${dq}"`} onRemove={() => { setQ(""); updateSearch({ q: "" }); }} />
              )}
              {dloc && (
                <FilterChip label={dloc} onRemove={() => { setLoc(""); updateSearch({ location: "" }); }} />
              )}
              {params.category && (
                <FilterChip
                  label={(categories.data ?? []).find((c) => c.slug === params.category)?.name ?? params.category}
                  onRemove={() => updateSearch({ category: "" })}
                />
              )}
              {selectedTypes.map((t) => (
                <FilterChip
                  key={t} label={typeLabel(t)}
                  onRemove={() => updateSearch({ types: selectedTypes.filter((x) => x !== t).join(",") })}
                />
              ))}
              {selectedLevels.map((l) => (
                <FilterChip
                  key={l} label={l}
                  onRemove={() => updateSearch({ levels: selectedLevels.filter((x) => x !== l).join(",") })}
                />
              ))}
              {(dSalary[0] > 0 || dSalary[1] < SALARY_MAX) && (
                <FilterChip
                  label={`$${(dSalary[0] / 1000).toFixed(0)}k–$${dSalary[1] >= SALARY_MAX ? `${SALARY_MAX / 1000}k+` : `${(dSalary[1] / 1000).toFixed(0)}k`}`}
                  onRemove={() => { setSalary([0, SALARY_MAX]); navigate({ search: (p: Search) => ({ ...p, smin: 0, smax: SALARY_MAX }) }); }}
                />
              )}
              <button
                type="button"
                onClick={clearAll}
                className="text-xs text-muted-foreground underline-offset-2 hover:underline hover:text-foreground transition-colors"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Main content ───────────────────────────────────────────────── */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Desktop sidebar filters */}
          <aside className="hidden md:block w-56 shrink-0">
            <div className="sticky top-36 rounded-xl border bg-card p-5" style={{ boxShadow: "var(--shadow-card-val)" }}>
              {FilterPanel}
            </div>
          </aside>

          {/* Results */}
          <div className="flex-1 min-w-0">
            {/* Results header */}
            <div className="mb-4 flex items-center justify-between gap-2">
              {jobs.isLoading ? (
                <Skeleton className="h-4 w-24" />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {allJobs.length > 0
                    ? `${allJobs.length}${jobs.hasNextPage ? "+" : ""} result${allJobs.length === 1 ? "" : "s"}`
                    : "No results"}
                </p>
              )}
              {/* Mobile sort */}
              <Select
                value={params.sort ?? "newest"}
                onValueChange={(v) => updateSearch({ sort: v })}
              >
                <SelectTrigger className="h-8 w-36 md:hidden text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="oldest">Oldest</SelectItem>
                  <SelectItem value="salary_high">Salary ↓</SelectItem>
                  <SelectItem value="salary_low">Salary ↑</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Job list */}
            {jobs.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full rounded-xl" />
                ))}
              </div>
            ) : jobs.isError ? (
              <EmptyState title="Couldn't load jobs" description="Please refresh the page or try again." />
            ) : allJobs.length === 0 ? (
              <EmptyState
                title="No jobs match your search"
                description="Try removing some filters or broadening your keywords."
                actionLabel="Clear filters"
                actionHref="/jobs"
              />
            ) : (
              <motion.div
                className="space-y-3"
                initial="hidden"
                animate="visible"
                variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
              >
                <AnimatePresence>
                  {allJobs.map((j) => {
                    const score =
                      user && role === "seeker"
                        ? computeMatch(j.skills_required as string[] | null, mySkills.data)
                        : null;
                    return (
                      <motion.div
                        key={j.id}
                        variants={{
                          hidden: { opacity: 0, y: 8 },
                          visible: { opacity: 1, y: 0, transition: { duration: 0.22 } },
                        }}
                      >
                        <JobCard job={j as never} matchScore={score} />
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {jobs.hasNextPage && (
                  <div className="flex justify-center pt-4">
                    <Button
                      variant="outline"
                      onClick={() => jobs.fetchNextPage()}
                      disabled={jobs.isFetchingNextPage}
                      className="min-w-36"
                    >
                      {jobs.isFetchingNextPage ? "Loading…" : "Load more jobs"}
                    </Button>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
