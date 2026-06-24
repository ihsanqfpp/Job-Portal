import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { timeAgo } from "@/lib/format";
import { FeatureErrorBoundary } from "@/components/ui/FeatureErrorBoundary";

export const Route = createFileRoute("/_authenticated/seeker/applications")({
  component: MyApplications,
  errorComponent: () => (
    <FeatureErrorBoundary fallback={null}>
      <div />
    </FeatureErrorBoundary>
  ),
});

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  reviewed: "default",
  hired: "default",
  rejected: "destructive",
};

function MyApplications() {
  const { user } = useAuth();
  const apps = useQuery({
    queryKey: ["my-applications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select(
          "id,applied_at,status,cover_letter,jobs(id,title,location,type,companies(name,logo_url))",
        )
        .eq("applicant_id", user!.id)
        .order("applied_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <FeatureErrorBoundary>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-2xl font-bold mb-6">My applications</h1>
        {apps.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : apps.data?.length === 0 ? (
          <EmptyState
            title="No applications yet"
            description="Browse jobs and apply to see them here."
            actionLabel="Browse jobs"
            actionHref="/jobs"
          />
        ) : (
          <div className="space-y-3">
            {apps.data!.map((a) => {
              const j = a.jobs as {
                id: string;
                title: string;
                location: string;
                type: string;
                companies: { name: string } | null;
              } | null;
              if (!j) return null;
              return (
                <Card key={a.id} className="p-4">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="min-w-0">
                      <Link
                        to="/jobs/$id"
                        params={{ id: j.id }}
                        className="font-semibold hover:text-primary"
                      >
                        {j.title}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {j.companies?.name} · {j.location}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Applied {timeAgo(a.applied_at)}
                      </p>
                    </div>
                    <Badge variant={statusVariant[a.status]} className="capitalize">
                      {a.status}
                    </Badge>
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
