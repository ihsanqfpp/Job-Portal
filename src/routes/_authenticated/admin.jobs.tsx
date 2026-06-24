import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { timeAgo } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/jobs")({
  component: AdminJobs,
});

function AdminJobs() {
  const qc = useQueryClient();
  const jobs = useQuery({
    queryKey: ["admin-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("id,title,status,views,location,type,created_at,companies(name)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
  const del = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("jobs").delete().eq("id", id);
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["admin-jobs"] });
    },
  });
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">All jobs</h1>
      {jobs.isLoading ? (
        <Skeleton className="h-64" />
      ) : (
        <div className="space-y-2">
          {jobs.data!.map((j) => (
            <Card key={j.id} className="p-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <Link
                  to="/jobs/$id"
                  params={{ id: j.id }}
                  className="font-medium hover:text-primary"
                >
                  {j.title}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {(j.companies as { name: string } | null)?.name} · {j.location} · {j.type} ·{" "}
                  {timeAgo(j.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={j.status === "open" ? "default" : "secondary"}
                  className="capitalize"
                >
                  {j.status}
                </Badge>
                <span className="text-xs text-muted-foreground">{j.views} views</span>
                <Button size="sm" variant="ghost" onClick={() => del.mutate(j.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
