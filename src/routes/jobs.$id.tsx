import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Bookmark, BookmarkCheck, MapPin, Share2, Building2, Clock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useServerFn } from "@tanstack/react-start";
import { submitApplication } from "@/lib/api/applications.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { JobCard } from "@/components/jobs/JobCard";
import { formatSalary, initials, timeAgo } from "@/lib/format";

export const Route = createFileRoute("/jobs/$id")({
  component: JobDetail,
});

function JobDetail() {
  const { id } = Route.useParams();
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [applyOpen, setApplyOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", coverLetter: "" });
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submitApplicationFn = useServerFn(submitApplication);

  useEffect(() => {
    supabase.rpc("increment_job_views", { _job_id: id });
  }, [id]);

  const job = useQuery({
    queryKey: ["job", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*, companies(*)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const similar = useQuery({
    queryKey: ["similar-jobs", id, job.data?.category],
    enabled: !!job.data?.category,
    queryFn: async () => {
      const { data } = await supabase
        .from("jobs")
        .select(
          "id,title,description,location,type,salary_min,salary_max,salary_currency,created_at,companies(name,logo_url)",
        )
        .eq("status", "open")
        .eq("category", job.data!.category)
        .neq("id", id)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(3);
      return data ?? [];
    },
  });

  const myApp = useQuery({
    queryKey: ["my-app", id, user?.id],
    enabled: !!user && role === "seeker",
    queryFn: async () => {
      const { data } = await supabase
        .from("applications")
        .select("id,status")
        .eq("job_id", id)
        .eq("applicant_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const profile = useQuery({
    queryKey: ["profile-apply", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name,email,resume_url,resume_filename")
        .eq("id", user!.id)
        .single();
      return data;
    },
  });

  useEffect(() => {
    if (profile.data)
      setForm((f) => ({
        ...f,
        name: profile.data!.full_name ?? "",
        email: profile.data!.email ?? "",
      }));
  }, [profile.data]);

  const saved = useQuery({
    queryKey: ["saved", id, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("saved_jobs")
        .select("id")
        .eq("user_id", user!.id)
        .eq("job_id", id)
        .maybeSingle();
      return !!data;
    },
  });

  const toggleSave = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in to save jobs");
      if (saved.data)
        await supabase.from("saved_jobs").delete().eq("user_id", user.id).eq("job_id", id);
      else await supabase.from("saved_jobs").insert({ user_id: user.id, job_id: id });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saved", id, user?.id] });
      toast.success(saved.data ? "Removed from saved" : "Saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function submitApply() {
    if (!user) return;
    setSubmitting(true);
    try {
      // File upload stays browser-side (binary can't go through a JSON RPC).
      let resumeUrl = profile.data?.resume_url ?? null;
      if (resumeFile) {
        const path = `${user.id}/${Date.now()}-${resumeFile.name}`;
        const { error: upErr } = await supabase.storage
          .from("resumes")
          .upload(path, resumeFile, { upsert: true });
        if (upErr) throw upErr;
        const { data: signed } = await supabase.storage
          .from("resumes")
          .createSignedUrl(path, 60 * 60 * 24 * 365);
        resumeUrl = signed?.signedUrl ?? null;
        await supabase
          .from("profiles")
          .update({ resume_url: resumeUrl, resume_filename: resumeFile.name })
          .eq("id", user.id);
      }
      if (!resumeUrl) {
        toast.error("Please attach a resume");
        return;
      }
      // DB insert goes through a server function so applicant_id is set
      // server-side from the verified JWT, not from the client.
      await submitApplicationFn({
        data: { jobId: id, resumeUrl, coverLetter: form.coverLetter || undefined },
      });
      toast.success("Application submitted!");
      setApplyOpen(false);
      setResumeFile(null);
      setForm((f) => ({ ...f, coverLetter: "" }));
      qc.invalidateQueries({ queryKey: ["my-app", id, user?.id] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (job.isLoading)
    return (
      <div className="container mx-auto px-4 py-10">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  if (!job.data)
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Job not found</h1>
        <Button asChild className="mt-4">
          <Link to="/jobs">Browse jobs</Link>
        </Button>
      </div>
    );

  const j = job.data;
  const c = j.companies as {
    id: string;
    name: string;
    logo_url: string | null;
    industry: string | null;
    size: string | null;
    description: string | null;
  } | null;
  const expired = new Date(j.expires_at).getTime() < Date.now() || j.status !== "open";

  function handleApplyClick() {
    if (!user) {
      navigate({ to: "/auth", search: { redirect: `/jobs/${id}` } as never });
      return;
    }
    if (role !== "seeker") {
      toast.error("Only job seekers can apply");
      return;
    }
    setApplyOpen(true);
  }

  function share() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    navigator.clipboard.writeText(url).then(() => toast.success("Link copied"));
  }

  // Parse requirements out of description if formatted with bullets
  const reqMatch = j.description.split(/What we're looking for:|Requirements:/i);
  const aboutText = reqMatch[0]?.trim() ?? j.description;
  const reqText = reqMatch[1]?.trim();
  const reqs = reqText
    ? reqText
        .split(/\n/)
        .map((l) => l.replace(/^[-•*\s]+/, "").trim())
        .filter(Boolean)
    : [];

  return (
    <div className="container mx-auto px-4 py-8">
      {expired && (
        <Card className="mb-4 p-4 bg-warning/10 border-warning/30">
          <p className="text-sm font-medium">This listing is no longer accepting applications.</p>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16 rounded-xl">
                <AvatarImage src={c?.logo_url ?? undefined} />
                <AvatarFallback className="rounded-xl bg-accent text-accent-foreground">
                  {initials(c?.name) || <Building2 className="h-6 w-6" />}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold">{j.title}</h1>
                {c && (
                  <Link
                    to="/companies/$companyId"
                    params={{ companyId: c.id }}
                    className="text-muted-foreground hover:text-primary"
                  >
                    {c.name}
                  </Link>
                )}
                <div className="mt-3 flex flex-wrap gap-2 text-sm">
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <MapPin className="h-4 w-4" /> {j.location}
                  </span>
                  <Badge className="bg-primary/15 text-primary hover:bg-primary/20 border-0">
                    {formatSalary(j.salary_min, j.salary_max, j.salary_currency)}
                  </Badge>
                  <Badge variant="secondary" className="capitalize">
                    {j.type}
                  </Badge>
                  <Badge variant="outline" className="capitalize">
                    {j.experience_level}
                  </Badge>
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-4 w-4" /> {timeAgo(j.created_at)}
                  </span>
                </div>
              </div>
            </div>

            <div className="my-6 h-px bg-border" />

            <h2 className="font-semibold mb-2">About the role</h2>
            <div className="whitespace-pre-wrap leading-relaxed text-sm">{aboutText}</div>

            {reqs.length > 0 && (
              <>
                <h2 className="mt-6 font-semibold mb-2">Requirements</h2>
                <ul className="space-y-1.5 text-sm">
                  {reqs.map((r, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {j.skills_required?.length > 0 && (
              <>
                <h2 className="mt-6 font-semibold mb-2">Required skills</h2>
                <div className="flex flex-wrap gap-1.5">
                  {j.skills_required.map((s: string) => (
                    <Badge key={s} variant="secondary">
                      {s}
                    </Badge>
                  ))}
                </div>
              </>
            )}

            <div className="mt-6 text-xs text-muted-foreground">
              {j.views} views · expires {new Date(j.expires_at).toLocaleDateString()}
            </div>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card className="p-5 space-y-3">
            <div className="text-lg font-semibold">
              {formatSalary(j.salary_min, j.salary_max, j.salary_currency)}
            </div>
            {expired ? (
              <Button disabled className="w-full">
                Closed
              </Button>
            ) : myApp.data ? (
              <Button disabled className="w-full capitalize">
                Applied · {myApp.data.status}
              </Button>
            ) : (
              <Button className="w-full" onClick={handleApplyClick}>
                Apply now
              </Button>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => (user ? toggleSave.mutate() : navigate({ to: "/auth" }))}
              >
                {saved.data ? (
                  <BookmarkCheck className="mr-2 h-4 w-4" />
                ) : (
                  <Bookmark className="mr-2 h-4 w-4" />
                )}
                {saved.data ? "Saved" : "Save job"}
              </Button>
              <Button variant="outline" className="flex-1" onClick={share}>
                <Share2 className="mr-2 h-4 w-4" /> Share
              </Button>
            </div>
          </Card>

          {c && (
            <Card className="p-5">
              <h3 className="font-semibold">About {c.name}</h3>
              {c.industry && (
                <p className="text-xs text-muted-foreground mt-1">
                  {c.industry} · {c.size}
                </p>
              )}
              {c.description && (
                <p className="text-sm mt-3 text-muted-foreground line-clamp-6">{c.description}</p>
              )}
              <Button variant="link" className="px-0 mt-2" asChild>
                <Link to="/companies/$companyId" params={{ companyId: c.id }}>
                  View company →
                </Link>
              </Button>
            </Card>
          )}
        </aside>
      </div>

      {/* Similar jobs */}
      {(similar.data ?? []).length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-bold mb-4">Similar jobs</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {similar.data!.map((s) => (
              <JobCard key={s.id} job={s as never} />
            ))}
          </div>
        </section>
      )}

      <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply to {j.title}</DialogTitle>
            <DialogDescription>Submit your application to {c?.name}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="apply-name">Full name</Label>
              <Input
                id="apply-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="apply-email">Email</Label>
              <Input
                id="apply-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="apply-resume">
                Resume{" "}
                {profile.data?.resume_filename && (
                  <span className="text-xs text-muted-foreground font-normal">
                    (current: {profile.data.resume_filename})
                  </span>
                )}
              </Label>
              <Input
                id="apply-resume"
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div>
              <Label htmlFor="apply-cl">Cover letter (optional)</Label>
              <Textarea
                id="apply-cl"
                rows={5}
                value={form.coverLetter}
                onChange={(e) => setForm({ ...form, coverLetter: e.target.value })}
                placeholder="Why are you a great fit?"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setApplyOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitApply} disabled={submitting}>
              {submitting ? "Submitting…" : "Submit application"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
