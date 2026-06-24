import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, Users, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { timeAgo } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/employer/jobs/")({
  component: EmployerJobs,
});

function EmployerJobs() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const jobs = useQuery({
    queryKey: ["employer-jobs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("id,title,status,views,created_at,expires_at,location,type,applications(count)")
        .eq("posted_by", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("jobs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Job deleted");
      qc.invalidateQueries({ queryKey: ["employer-jobs", user?.id] });
    },
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "open" | "closed" }) => {
      await supabase.from("jobs").update({ status }).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employer-jobs", user?.id] }),
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My jobs</h1>
        <Button asChild>
          <Link to="/employer/jobs/new">
            <Plus className="mr-2 h-4 w-4" /> Post a job
          </Link>
        </Button>
      </div>
      {jobs.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : jobs.data?.length === 0 ? (
        <EmptyState
          title="No jobs yet"
          description="Create your first listing."
          actionLabel="Post a job"
          actionHref="/employer/jobs/new"
        />
      ) : (
        <div className="space-y-3">
          {jobs.data!.map((j) => {
            const count = (j.applications as unknown as { count: number }[])?.[0]?.count ?? 0;
            return (
              <Card key={j.id} className="p-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Link
                        to="/jobs/$id"
                        params={{ id: j.id }}
                        className="font-semibold hover:text-primary truncate"
                      >
                        {j.title}
                      </Link>
                      <Badge
                        variant={j.status === "open" ? "default" : "secondary"}
                        className="capitalize"
                      >
                        {j.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {j.location} · {j.type} · Posted {timeAgo(j.created_at)} · {j.views} views
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" asChild>
                      <Link to="/employer/jobs/$id/applicants" params={{ id: j.id }}>
                        <Users className="mr-1 h-4 w-4" /> {count}
                      </Link>
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link to="/employer/jobs/$id/edit" params={{ id: j.id }}>
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        toggleStatus.mutate({
                          id: j.id,
                          status: j.status === "open" ? "closed" : "open",
                        })
                      }
                    >
                      {j.status === "open" ? "Close" : "Reopen"}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this job?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Applicants will lose access. This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => remove.mutate(j.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
