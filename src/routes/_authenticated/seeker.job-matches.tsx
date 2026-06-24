import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FeatureErrorBoundary } from "@/components/ui/FeatureErrorBoundary";
import { Progress } from "@/components/ui/progress";
import {
  Sparkles,
  Briefcase,
  MapPin,
  DollarSign,
  Upload,
  ExternalLink,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { getCachedMatches, matchJobsForUser } from "@/lib/api/match.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/seeker/job-matches")({
  component: JobMatchesPage,
  errorComponent: () => (
    <FeatureErrorBoundary fallback={null}>
      <div />
    </FeatureErrorBoundary>
  ),
  pendingComponent: () => (
    <div className="container mx-auto p-8 animate-pulse flex flex-col gap-6">
      <div className="h-10 w-64 bg-muted rounded"></div>
      <div className="h-6 w-96 bg-muted rounded"></div>
      <div className="flex flex-col gap-6 mt-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-48 rounded-xl bg-muted/20 border"></div>
        ))}
      </div>
    </div>
  ),
});

function JobMatchesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const getCachedMatchesFn = useServerFn(getCachedMatches);
  const matchJobsFn = useServerFn(matchJobsForUser);

  // Check if user has an uploaded / parsed resume.
  const hasResume = useQuery({
    queryKey: ["has-resume", user?.id],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("resume_versions")
        .select("id")
        .eq("user_id", user!.id)
        .limit(1)
        .maybeSingle();
      return !!data;
    },
  });

  const jobMatches = useQuery({
    queryKey: ["job-matches", user?.id],
    enabled: !!user && hasResume.data === true,
    queryFn: () => getCachedMatchesFn(),
  });

  const runMatch = useMutation({
    mutationFn: () => matchJobsFn(),
    onSuccess: () => {
      toast.success("Matches updated");
      qc.invalidateQueries({ queryKey: ["job-matches", user?.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveJob = useMutation({
    mutationFn: async ({
      jobId,
      externalJobId,
    }: {
      jobId?: string;
      externalJobId?: string;
    }) => {
      const payload = jobId
        ? { user_id: user!.id, job_id: jobId }
        : { user_id: user!.id, external_job_id: externalJobId! };
      const { error } = await supabase.from("saved_jobs").insert(payload);
      if (error) {
        if (error.code === "23505") throw new Error("Already saved");
        throw error;
      }
    },
    onSuccess: () => toast.success("Job saved"),
    onError: (e: Error) => toast.error(e.message),
  });

  // ── No resume: prompt upload ─────────────────────────────────────────────
  if (!hasResume.isLoading && hasResume.data === false) {
    return (
      <FeatureErrorBoundary>
        <div className="container mx-auto px-6 py-8 space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">AI Job Matches</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Discover handpicked roles matched against your resume.
            </p>
          </div>
          <Card className="p-10 text-center space-y-4 border-dashed border-2">
            <Upload className="h-12 w-12 text-muted-foreground mx-auto" />
            <h3 className="font-semibold text-lg">Upload your resume first</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              AI matching requires a parsed resume. Upload yours in the Resume
              Analyzer and come back here to see your top matches.
            </p>
            <Button asChild>
              <Link to="/seeker/resume-analyzer">Go to Resume Analyzer</Link>
            </Button>
          </Card>
        </div>
      </FeatureErrorBoundary>
    );
  }

  const matches = jobMatches.data?.matches ?? [];
  const isLoading = hasResume.isLoading || jobMatches.isLoading;

  return (
    <FeatureErrorBoundary>
      <div className="container mx-auto px-6 py-8 space-y-8 animate-fade-in">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">AI Job Matches</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Discover handpicked roles matched against your resume and career history.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => runMatch.mutate()}
            disabled={runMatch.isPending}
          >
            {runMatch.isPending ? (
              <>
                <Sparkles className="mr-2 h-4 w-4 animate-spin" /> Matching…
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" /> Refresh matches
              </>
            )}
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <div className="h-32 bg-muted/50 rounded-lg animate-pulse" />
            <div className="h-32 bg-muted/50 rounded-lg animate-pulse" />
          </div>
        ) : matches.length === 0 ? (
          <Card className="p-8 text-center bg-card/40 border border-muted/50 space-y-4">
            <Briefcase className="h-12 w-12 text-muted-foreground mx-auto" />
            <h3 className="font-semibold text-lg">No matches yet</h3>
            <p className="text-sm text-muted-foreground">
              Click "Refresh matches" to run AI matching against your resume.
            </p>
            <Button onClick={() => runMatch.mutate()} disabled={runMatch.isPending}>
              {runMatch.isPending ? "Running…" : "Run AI matching"}
            </Button>
          </Card>
        ) : (
          <div className="grid gap-6">
            {matches.map((match: any, index: number) => {
              const job = match.job;
              if (!job) return null;

              const companyName =
                match.kind === "internal" ? job.companies?.name : job.company;
              const jobType = match.kind === "internal" ? job.type : job.job_type;
              const salary =
                match.kind === "internal" && job.salary_min
                  ? `${job.salary_currency || "$"}${job.salary_min.toLocaleString()} – ${job.salary_max?.toLocaleString() || ""}`
                  : match.kind === "external"
                    ? job.salary
                    : null;

              return (
                <Card
                  key={job.id || index}
                  className="overflow-hidden bg-card/40 backdrop-blur-md border border-muted/50 hover:border-primary/30 transition-all duration-300"
                >
                  <div className="p-6 flex flex-col md:flex-row gap-6">
                    {/* Left: Job details */}
                    <div className="flex-1 space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-bold text-lg hover:text-primary transition-colors">
                            {job.title}
                          </h3>
                          <p className="text-sm font-medium text-muted-foreground">
                            {companyName || "Remote Company"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {match.kind === "external" && (
                            <Badge variant="secondary" className="text-[10px] uppercase">
                              External
                            </Badge>
                          )}
                          <Badge variant="outline" className="capitalize">
                            {jobType || "Full-time"}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" /> {job.location || "Remote"}
                        </span>
                        {salary && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3.5 w-3.5" /> {salary}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {job.description}
                      </p>
                    </div>

                    {/* Right: AI score panel */}
                    <div className="w-full md:w-80 flex flex-col justify-between border-t md:border-t-0 md:border-l border-muted/50 pt-4 md:pt-0 md:pl-6">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-medium text-muted-foreground flex items-center gap-1">
                            <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" /> Match
                            Score
                          </span>
                          <span className="font-bold text-primary text-sm">
                            {match.score || 0}%
                          </span>
                        </div>
                        <Progress value={match.score || 0} className="h-2 bg-primary/20" />

                        <div className="grid grid-cols-3 gap-2 mt-2">
                          {[
                            ["Skills", match.skill_match_score],
                            ["Experience", match.experience_fit_score],
                            ["ATS Fit", match.ats_compatibility_score],
                          ].map(([label, val]) => (
                            <div
                              key={label}
                              className="flex flex-col items-center p-2 bg-muted/30 rounded-md"
                            >
                              <span className="text-[9px] uppercase text-muted-foreground font-medium text-center">
                                {label}
                              </span>
                              <span className="text-xs font-bold">{val}%</span>
                            </div>
                          ))}
                        </div>

                        {match.explanation && (
                          <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/10">
                            <span className="text-[10px] uppercase font-bold text-primary tracking-wider block mb-1">
                              Why this matches you:
                            </span>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                              {match.explanation}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() =>
                            saveJob.mutate(
                              match.kind === "external"
                                ? { externalJobId: job.id }
                                : { jobId: job.id },
                            )
                          }
                          disabled={saveJob.isPending}
                        >
                          Save
                        </Button>
                        {match.kind === "external" ? (
                          <Button
                            size="sm"
                            className="flex-1 bg-primary hover:bg-primary/95 text-xs"
                            onClick={() => window.open(job.url, "_blank")}
                          >
                            Apply <ExternalLink className="ml-1 h-3 w-3" />
                          </Button>
                        ) : (
                          <Button size="sm" className="flex-1 bg-primary hover:bg-primary/95 text-xs" asChild>
                            <Link to="/jobs/$id" params={{ id: job.id }}>
                              Apply Now
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </FeatureErrorBoundary>
  );
}
