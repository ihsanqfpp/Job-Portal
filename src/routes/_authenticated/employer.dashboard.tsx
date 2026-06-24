import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Briefcase, Eye, Users, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/EmptyState";

export const Route = createFileRoute("/_authenticated/employer/dashboard")({
  component: EmployerDashboard,
});

function EmployerDashboard() {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ["employer-dashboard", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [company, jobs] = await Promise.all([
        supabase.from("companies").select("*").eq("owner_id", user!.id).maybeSingle(),
        supabase
          .from("jobs")
          .select("id,title,views,status,created_at")
          .eq("posted_by", user!.id)
          .order("created_at", { ascending: false }),
      ]);
      const jobIds = (jobs.data ?? []).map((j) => j.id);
      const apps = jobIds.length
        ? await supabase.from("applications").select("id,job_id,status").in("job_id", jobIds)
        : { data: [] as { id: string; job_id: string; status: string }[] };
      return { company: company.data, jobs: jobs.data ?? [], apps: apps.data ?? [] };
    },
  });

  if (q.isLoading)
    return (
      <div className="container mx-auto p-6">
        <Skeleton className="h-96 w-full" />
      </div>
    );
  const d = q.data!;

  if (!d.company) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <EmptyState
          title="Set up your company"
          description="Create a company profile to start posting jobs."
          actionLabel="Create company"
          actionHref="/employer/company"
        />
      </div>
    );
  }
  if (!d.company.is_approved) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Card className="p-8 text-center">
          <h2 className="text-lg font-semibold">Pending admin approval</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Your company is being reviewed. You'll be able to post jobs once approved.
          </p>
        </Card>
      </div>
    );
  }

  const totalViews = d.jobs.reduce((s, j) => s + (j.views ?? 0), 0);
  const openJobs = d.jobs.filter((j) => j.status === "open").length;
  const pendingApps = d.apps.filter((a) => a.status === "pending").length;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Welcome, {d.company.name}</h1>
          <p className="text-sm text-muted-foreground">Hire smarter with Hireway</p>
        </div>
        <Button asChild>
          <Link to="/employer/jobs/new">
            <Plus className="mr-2 h-4 w-4" /> Post a job
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          { label: "Open jobs", value: openJobs, icon: Briefcase },
          { label: "Total views", value: totalViews, icon: Eye },
          { label: "Pending applicants", value: pendingApps, icon: Users },
        ].map((s) => (
          <Card key={s.label} className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="text-3xl font-bold mt-1">{s.value}</p>
              </div>
              <s.icon className="h-8 w-8 text-primary/40" />
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Recent jobs</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/employer/jobs">View all</Link>
          </Button>
        </div>
        {d.jobs.length === 0 ? (
          <EmptyState
            title="No jobs posted yet"
            description="Create your first listing."
            actionLabel="Post a job"
            actionHref="/employer/jobs/new"
          />
        ) : (
          <div className="space-y-2">
            {d.jobs.slice(0, 5).map((j) => {
              const count = d.apps.filter((a) => a.job_id === j.id).length;
              return (
                <Link
                  key={j.id}
                  to="/employer/jobs/$id/applicants"
                  params={{ id: j.id }}
                  className="flex items-center justify-between p-3 rounded-md hover:bg-muted transition"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{j.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {j.status} · {j.views} views
                    </p>
                  </div>
                  <span className="text-sm font-medium">{count} applicants</span>
                </Link>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
