import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/common/EmptyState";
import { JobCard } from "@/components/jobs/JobCard";
import { FeatureErrorBoundary } from "@/components/ui/FeatureErrorBoundary";

export const Route = createFileRoute("/_authenticated/seeker/saved-jobs")({
  component: SavedJobs,
  errorComponent: () => (
    <FeatureErrorBoundary fallback={null}>
      <div />
    </FeatureErrorBoundary>
  ),
});

function SavedJobs() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const saved = useQuery({
    queryKey: ["saved-jobs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_jobs")
        .select(
          `id,
           saved_at,
           job_id,
           external_job_id,
           jobs(id,title,description,location,type,salary_min,salary_max,salary_currency,created_at,companies(name,logo_url)),
           external_jobs(id,title,company_name,location,job_type,url,salary)`,
        )
        .eq("user_id", user!.id)
        .order("saved_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const removeInternal = useMutation({
    mutationFn: async (jobId: string) => {
      const { error } = await supabase
        .from("saved_jobs")
        .delete()
        .eq("user_id", user!.id)
        .eq("job_id", jobId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Removed");
      qc.invalidateQueries({ queryKey: ["saved-jobs", user?.id] });
    },
  });

  const removeExternal = useMutation({
    mutationFn: async (externalJobId: string) => {
      const { error } = await supabase
        .from("saved_jobs")
        .delete()
        .eq("user_id", user!.id)
        .eq("external_job_id", externalJobId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Removed");
      qc.invalidateQueries({ queryKey: ["saved-jobs", user?.id] });
    },
  });

  return (
    <FeatureErrorBoundary>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-2xl font-bold mb-6">Saved jobs</h1>
        {saved.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : saved.data?.length === 0 ? (
          <EmptyState
            title="No saved jobs"
            description="Bookmark jobs to revisit them later."
            actionLabel="Browse jobs"
            actionHref="/jobs"
          />
        ) : (
          <div className="space-y-3">
            {saved.data!.map((s) => {
              if (s.jobs) {
                return (
                  <div key={s.id} className="relative">
                    <JobCard job={s.jobs as never} />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute right-3 top-3"
                      onClick={(e) => {
                        e.preventDefault();
                        removeInternal.mutate(s.job_id!);
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                );
              }

              if (s.external_jobs) {
                const ej = s.external_jobs;
                return (
                  <div key={s.id} className="relative">
                    <Card className="p-4 flex flex-col gap-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm line-clamp-1">{ej.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {ej.company_name}
                            {ej.location ? ` · ${ej.location}` : ""}
                          </p>
                        </div>
                        <Badge variant="secondary" className="shrink-0 text-xs">
                          External
                        </Badge>
                      </div>
                      {ej.salary && (
                        <p className="text-xs text-muted-foreground">{ej.salary}</p>
                      )}
                      <a
                        href={ej.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1 w-fit"
                      >
                        Apply on site <ExternalLink className="h-3 w-3" />
                      </a>
                    </Card>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute right-3 top-3"
                      onClick={(e) => {
                        e.preventDefault();
                        removeExternal.mutate(s.external_job_id!);
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                );
              }

              return null;
            })}
          </div>
        )}
      </div>
    </FeatureErrorBoundary>
  );
}
