import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pencil, Trash2, Users, Plus, Briefcase, Eye, Pause, Play } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { EmptyState } from "@/components/common/EmptyState";
import { formatSalary, timeAgo } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/employer/")({
  component: EmployerHome,
});

type JobDraft = {
  title: string;
  description: string;
  location: string;
  type: "full-time" | "remote" | "hybrid" | "part-time" | "contract" | "internship";
  category: string;
  experience_level: "entry" | "junior" | "mid" | "senior" | "lead";
  salary_min: number | null;
  salary_max: number | null;
};

const INITIAL_DRAFT: JobDraft = {
  title: "",
  description: "",
  location: "",
  type: "full-time",
  category: "engineering",
  experience_level: "mid",
  salary_min: null,
  salary_max: null,
};

function EmployerHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [postOpen, setPostOpen] = useState(false);

  const company = useQuery({
    queryKey: ["my-company", user?.id],
    enabled: !!user,
    queryFn: async () =>
      (await supabase.from("companies").select("*").eq("owner_id", user!.id).maybeSingle()).data,
  });

  const jobs = useQuery({
    queryKey: ["employer-jobs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("jobs")
        .select(
          "id,title,status,views,created_at,expires_at,location,type,salary_min,salary_max,salary_currency,applications(count)",
        )
        .eq("posted_by", user!.id)
        .order("created_at", { ascending: false });
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

  if (company.isLoading)
    return (
      <div className="container mx-auto p-6">
        <Skeleton className="h-96 w-full" />
      </div>
    );
  const c = company.data;

  if (!c)
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
  if (!c.is_approved) {
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

  const d = jobs.data ?? [];
  const totalViews = d.reduce((s, j) => s + (j.views ?? 0), 0);
  const openJobs = d.filter((j) => j.status === "open").length;
  const totalApps = d.reduce(
    (s, j) => s + ((j.applications as unknown as { count: number }[])?.[0]?.count ?? 0),
    0,
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Welcome, {c.name}</h1>
          <p className="text-sm text-muted-foreground">Manage your listings and applicants.</p>
        </div>
        <Button onClick={() => setPostOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Post a new job
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          { label: "Open jobs", value: openJobs, icon: Briefcase },
          { label: "Total views", value: totalViews, icon: Eye },
          { label: "Total applicants", value: totalApps, icon: Users },
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
        <h2 className="font-semibold mb-4">My listings</h2>
        {jobs.isLoading ? (
          <Skeleton className="h-32" />
        ) : d.length === 0 ? (
          <EmptyState
            title="No jobs posted yet"
            description="Create your first listing."
            action={
              <Button onClick={() => setPostOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Post a job
              </Button>
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Applicants</TableHead>
                <TableHead className="text-right">Posted</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {d.map((j) => {
                const count = (j.applications as unknown as { count: number }[])?.[0]?.count ?? 0;
                return (
                  <TableRow key={j.id}>
                    <TableCell>
                      <Link
                        to="/jobs/$id"
                        params={{ id: j.id }}
                        className="font-medium hover:text-primary"
                      >
                        {j.title}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {j.location} · {j.type}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={j.status === "open" ? "default" : "secondary"}
                        className="capitalize"
                      >
                        {j.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        to="/employer/jobs/$id/applicants"
                        params={{ id: j.id }}
                        className="hover:text-primary"
                      >
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" /> {count}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-xs">
                      {timeAgo(j.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button size="icon" variant="ghost" asChild title="Edit">
                          <Link to="/employer/jobs/$id/edit" params={{ id: j.id }}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          title={j.status === "open" ? "Pause" : "Reopen"}
                          onClick={() =>
                            toggleStatus.mutate({
                              id: j.id,
                              status: j.status === "open" ? "closed" : "open",
                            })
                          }
                        >
                          {j.status === "open" ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" title="Delete">
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
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <PostJobWizard
        open={postOpen}
        onOpenChange={setPostOpen}
        companyId={c.id}
        onPosted={(id) => {
          setPostOpen(false);
          qc.invalidateQueries({ queryKey: ["employer-jobs", user?.id] });
          navigate({ to: "/jobs/$id", params: { id } });
        }}
      />
    </div>
  );
}

function PostJobWizard({
  open,
  onOpenChange,
  companyId,
  onPosted,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  companyId: string;
  onPosted: (id: string) => void;
}) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<JobDraft>(INITIAL_DRAFT);
  const [busy, setBusy] = useState(false);

  function reset() {
    setStep(1);
    setDraft(INITIAL_DRAFT);
  }

  async function publish() {
    setBusy(true);
    try {
      const { data, error } = await supabase
        .from("jobs")
        .insert({
          ...draft,
          company_id: companyId,
          posted_by: user!.id,
          salary_currency: "USD",
          skills_required: [],
          expires_at: new Date(Date.now() + 60 * 86400000).toISOString(),
        } as never)
        .select("id")
        .single();
      if (error) throw error;
      toast.success("Job published!");
      onPosted(data!.id);
      reset();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const canNext = () => {
    if (step === 1) return draft.title.trim().length >= 3 && draft.location.trim().length > 0;
    if (step === 2) return draft.description.trim().length >= 20;
    if (step === 3) return true;
    return true;
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Post a new job — step {step} of 4</DialogTitle>
        </DialogHeader>

        <div className="flex gap-1 mb-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded ${i <= step ? "bg-primary" : "bg-muted"}`}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-3">
            <div>
              <Label>Job title</Label>
              <Input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="e.g. Senior Frontend Engineer"
              />
            </div>
            <div>
              <Label>Location</Label>
              <Input
                value={draft.location}
                onChange={(e) => setDraft({ ...draft, location: e.target.value })}
                placeholder="Remote, London, etc."
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select
                value={draft.category}
                onValueChange={(v) => setDraft({ ...draft, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "engineering",
                    "design",
                    "marketing",
                    "sales",
                    "finance",
                    "operations",
                    "data-analytics",
                    "product",
                    "customer-support",
                    "human-resources",
                  ].map((c) => (
                    <SelectItem key={c} value={c} className="capitalize">
                      {c.replace("-", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <Label>Description</Label>
            <Textarea
              rows={10}
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="Describe the role, what the team does, and what success looks like…"
            />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Job type</Label>
                <Select
                  value={draft.type}
                  onValueChange={(v) => setDraft({ ...draft, type: v as JobDraft["type"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["full-time", "part-time", "remote", "hybrid", "contract", "internship"].map(
                      (t) => (
                        <SelectItem key={t} value={t} className="capitalize">
                          {t}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Experience</Label>
                <Select
                  value={draft.experience_level}
                  onValueChange={(v) =>
                    setDraft({ ...draft, experience_level: v as JobDraft["experience_level"] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["entry", "junior", "mid", "senior", "lead"].map((t) => (
                      <SelectItem key={t} value={t} className="capitalize">
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Min salary (USD)</Label>
                <Input
                  type="number"
                  value={draft.salary_min ?? ""}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      salary_min: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                />
              </div>
              <div>
                <Label>Max salary (USD)</Label>
                <Input
                  type="number"
                  value={draft.salary_max ?? ""}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      salary_max: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                />
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3 text-sm">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Title</div>
              <div className="font-semibold text-base">{draft.title}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="capitalize">
                {draft.type}
              </Badge>
              <Badge variant="outline" className="capitalize">
                {draft.experience_level}
              </Badge>
              <Badge variant="outline" className="capitalize">
                {draft.category.replace("-", " ")}
              </Badge>
              <Badge>{draft.location}</Badge>
            </div>
            <div className="font-medium">
              {formatSalary(draft.salary_min, draft.salary_max, "USD")}
            </div>
            <div className="whitespace-pre-wrap text-muted-foreground border-t pt-3">
              {draft.description}
            </div>
          </div>
        )}

        <DialogFooter className="flex justify-between sm:justify-between">
          <div>
            {step > 1 && (
              <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>
                Back
              </Button>
            )}
          </div>
          <div>
            {step < 4 ? (
              <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext()}>
                Next
              </Button>
            ) : (
              <Button onClick={publish} disabled={busy}>
                {busy ? "Publishing…" : "Publish"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
