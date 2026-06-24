import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { initials, timeAgo } from "@/lib/format";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/employer/jobs/$id/applicants")({
  component: Applicants,
});

const STATUSES = ["pending", "reviewed", "hired", "rejected"] as const;

function Applicants() {
  const { id } = Route.useParams();
  const qc = useQueryClient();

  const job = useQuery({
    queryKey: ["job-applicants-head", id],
    queryFn: async () => (await supabase.from("jobs").select("title").eq("id", id).single()).data,
  });

  const apps = useQuery({
    queryKey: ["job-applicants", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select(
          "id,status,cover_letter,resume_url,applied_at,profiles(id,full_name,avatar_url,location,skills,bio,email)",
        )
        .eq("job_id", id)
        .order("applied_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ appId, status }: { appId: string; status: string }) => {
      const { error } = await supabase
        .from("applications")
        .update({ status: status as never })
        .eq("id", appId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status updated");
      qc.invalidateQueries({ queryKey: ["job-applicants", id] });
    },
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <Link to="/employer/jobs" className="text-sm text-muted-foreground hover:text-primary">
        ← Back to jobs
      </Link>
      <h1 className="text-2xl font-bold mt-2 mb-6">Applicants — {job.data?.title ?? "…"}</h1>
      {apps.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : apps.data?.length === 0 ? (
        <EmptyState
          title="No applicants yet"
          description="Share your job listing to attract candidates."
        />
      ) : (
        <div className="space-y-3">
          {apps.data!.map((a) => {
            const p = a.profiles as {
              id: string;
              full_name: string;
              avatar_url: string | null;
              location: string | null;
              skills: string[];
              bio: string | null;
              email: string;
            } | null;
            return (
              <Card key={a.id} className="p-4">
                <div className="flex items-start gap-4 flex-wrap">
                  <Avatar>
                    <AvatarImage src={p?.avatar_url ?? undefined} />
                    <AvatarFallback>{initials(p?.full_name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{p?.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p?.email} · {p?.location ?? "—"} · Applied {timeAgo(a.applied_at)}
                    </p>
                    {p?.skills && p.skills.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {p.skills.slice(0, 6).map((s) => (
                          <Badge key={s} variant="secondary" className="text-xs">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={a.status}
                      onValueChange={(v) => updateStatus.mutate({ appId: a.id, status: v })}
                    >
                      <SelectTrigger className="w-36 capitalize">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s} className="capitalize">
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button asChild size="sm" variant="outline">
                      <a href={a.resume_url} target="_blank" rel="noreferrer">
                        <ExternalLink className="mr-1 h-4 w-4" /> Resume
                      </a>
                    </Button>
                    {a.cover_letter && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="ghost">
                            Cover letter
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>{p?.full_name}'s cover letter</DialogTitle>
                          </DialogHeader>
                          <p className="whitespace-pre-wrap text-sm">{a.cover_letter}</p>
                        </DialogContent>
                      </Dialog>
                    )}
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
