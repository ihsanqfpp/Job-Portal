import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import {
  Sparkles,
  Upload,
  ArrowRight,
  Bot,
  Briefcase,
  History,
  TrendingUp,
  Award,
  ChevronRight,
  Plus,
  FileText,
  Activity,
  FileSearch,
  CheckCircle,
  Clock,
  LogOut,
  Heart,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useServerFn } from "@tanstack/react-start";
import { extractResumeSkills } from "@/lib/api/ai.functions";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/common/EmptyState";
import { JobCard, type JobCardData } from "@/components/jobs/JobCard";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: SeekerDashboard,
});

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  reviewed: "default",
  hired: "default",
  rejected: "destructive",
};

function calculateCompletion(p: any) {
  if (!p) return 0;
  let score = 0;
  if (p.full_name && p.full_name.trim().length > 0) score += 15;
  if (p.bio && p.bio.trim().length > 0) score += 15;
  if (p.location && p.location.trim().length > 0) score += 15;
  if (p.website && p.website.trim().length > 0) score += 15;
  if (p.avatar_url && p.avatar_url.trim().length > 0) score += 10;
  if (p.skills && p.skills.length > 0) score += 15;
  if (p.resume_url && p.resume_url.trim().length > 0) score += 15;
  return score;
}

function SeekerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const extractFn = useServerFn(extractResumeSkills);

  const profile = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () =>
      (await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle()).data,
  });

  const p = profile.data;

  const apps = useQuery({
    queryKey: ["my-applications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("applications")
        .select("id,applied_at,status,jobs(id,title,companies(name))")
        .eq("applicant_id", user!.id)
        .order("applied_at", { ascending: false });
      return data ?? [];
    },
  });

  const saved = useQuery({
    queryKey: ["saved-jobs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("saved_jobs")
        .select(
          "id,job_id,jobs(id,title,description,location,type,salary_min,salary_max,salary_currency,created_at,companies(name,logo_url))",
        )
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(3);
      return data ?? [];
    },
  });

  const recommended = useQuery({
    queryKey: ["recommended-jobs", user?.id, p?.skills],
    enabled: !!user && !!p?.skills?.length,
    queryFn: async () => {
      const { data } = await supabase
        .from("jobs")
        .select(
          "id,title,description,location,type,salary_min,salary_max,salary_currency,created_at,companies(name,logo_url)",
        )
        .overlaps("skills_required", p!.skills)
        .eq("status", "open")
        .limit(3);
      return data ?? [];
    },
  });

  const interviews = useQuery({
    queryKey: ["upcoming-interviews", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("tracker_items")
        .select("*")
        .eq("user_id", user!.id)
        .eq("stage", "interview")
        .order("updated_at", { ascending: false })
        .limit(3);
      return data ?? [];
    },
  });

  const latestResume = useQuery({
    queryKey: ["latest-resume", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("resume_versions")
        .select("id, ats_score, filename, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const avgMatchScore = useQuery({
    queryKey: ["avg-match-score", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("job_matches").select("score").eq("user_id", user!.id);
      if (!data || data.length === 0) return 0;
      const total = data.reduce((acc, curr) => acc + curr.score, 0);
      return Math.round(total / data.length);
    },
  });

  const activeCoachThread = useQuery({
    queryKey: ["latest-coach-thread", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("coach_threads")
        .select("id, title, updated_at")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const recentActivity = useQuery({
    queryKey: ["recent-activity", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("activity_log")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  const uploadResume = useMutation({
    mutationFn: async (file: File) => {
      const path = `${user!.id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage
        .from("resumes")
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage
        .from("resumes")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      await supabase
        .from("profiles")
        .update({ resume_url: signed?.signedUrl ?? null, resume_filename: file.name })
        .eq("id", user!.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile", user?.id] });
      qc.invalidateQueries({ queryKey: ["latest-resume", user?.id] });
    },
  });

  async function onResumeFile(file: File | null) {
    if (!file) return;
    setAnalyzing(true);
    try {
      await uploadResume.mutateAsync(file);

      if (file.type === "application/pdf") {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const pdfjs = await import("pdfjs-dist/build/pdf.mjs");
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const workerUrl = (await import("pdfjs-dist/build/pdf.worker.mjs?url")).default;
        pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
        const arrayBuf = await file.arrayBuffer();
        const doc = await pdfjs.getDocument({ data: arrayBuf }).promise;
        let text = "";
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const tc = await page.getTextContent();
          text +=
            tc.items.map((it: Record<string, unknown>) => ("str" in it ? it.str : "")).join(" ") +
            "\n";
        }
        if (text.trim().length < 20) {
          toast.error("Couldn't read text from this PDF. Try a different file.");
          return;
        }

        const { skills } = await extractFn({ data: { text } });
        toast.success(`Found ${skills.length} skills on your resume`);
        qc.invalidateQueries({ queryKey: ["profile", user?.id] });
        qc.invalidateQueries({ queryKey: ["my-skills", user?.id] });
      } else {
        toast.message("Uploaded. Upload a PDF to enable AI match scoring.");
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAnalyzing(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  if (profile.isLoading)
    return (
      <div className="container mx-auto p-6">
        <Skeleton className="h-96 w-full" />
      </div>
    );

  const completionPct = calculateCompletion(p);

  return (
    <div className="container mx-auto px-6 py-8 space-y-8 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Welcome back, {p?.full_name?.split(" ")[0] || "Seeker"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your centralized AI career control center. Explore matches, chat with your coach, and
            track goals.
          </p>
        </div>

        {/* Quick Actions Panel */}
        <div className="flex gap-2.5">
          <input
            ref={fileRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(e) => onResumeFile(e.target.files?.[0] ?? null)}
          />
          <Button
            onClick={() => fileRef.current?.click()}
            variant="outline"
            size="sm"
            className="h-9"
            disabled={analyzing}
          >
            <Upload className="mr-2 h-4 w-4" />
            {analyzing ? "Analyzing..." : "Upload Resume"}
          </Button>
          <Button
            onClick={() => navigate({ to: "/seeker/coach" })}
            size="sm"
            className="h-9 bg-primary hover:bg-primary/95 shadow-md shadow-primary/10"
          >
            <Bot className="mr-2 h-4 w-4" />
            Ask Coach
          </Button>
        </div>
      </div>

      {/* Dynamic Profile Completion Widget */}
      <Card className="bg-card/45 backdrop-blur-md border border-muted/50 hover:border-primary/20 transition-all duration-300 shadow-sm">
        <CardContent className="py-4 px-6 flex flex-col md:flex-row items-center gap-4 justify-between">
          <div className="space-y-1 w-full md:w-2/3">
            <div className="flex justify-between text-sm font-semibold mb-1">
              <span>Profile Completion</span>
              <span>{completionPct}%</span>
            </div>
            <Progress value={completionPct} className="h-2.5 bg-muted/40 w-full" />
            <p className="text-xs text-muted-foreground leading-normal mt-2">
              {completionPct < 100 
                ? "Add your skills, biography, and experience to unlock accurate AI job matching." 
                : "Your profile is completely configured! Sit back and let AI match the best roles for you."}
            </p>
          </div>
          <Button size="sm" variant="outline" asChild className="whitespace-nowrap mt-2 md:mt-0">
            <Link to="/seeker/profile">Complete Profile</Link>
          </Button>
        </CardContent>
      </Card>

      {/* Grid of control center cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Card 1: ATS Optimization Score Card */}
        <Card className="bg-card/45 backdrop-blur-md border border-muted/50 hover:border-primary/20 transition-all duration-300 shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <FileSearch className="h-4 w-4 text-primary" /> ATS Score
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold tracking-tight">
                {latestResume.data?.ats_score ?? "--"}
              </span>
              <span className="text-sm font-semibold text-muted-foreground">%</span>
            </div>
            <Progress value={latestResume.data?.ats_score ?? 0} className="h-2.5 bg-muted/40" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              {latestResume.data
                ? `Last updated: ${new Date(latestResume.data.created_at).toLocaleDateString()}`
                : "No resume analysis generated yet."}
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Average Job Match Percentage */}
        <Card className="bg-card/45 backdrop-blur-md border border-muted/50 hover:border-primary/20 transition-all duration-300 shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-500 animate-pulse" /> Avg Job Match
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold tracking-tight">
                {avgMatchScore.data ?? "--"}
              </span>
              <span className="text-sm font-semibold text-muted-foreground">%</span>
            </div>
            <Progress value={avgMatchScore.data ?? 0} className="h-2.5 bg-muted/40" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Calculated across your top aligned roles matched against your capabilities.
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Active Coach Session */}
        <Card className="bg-card/45 backdrop-blur-md border border-muted/50 hover:border-primary/20 transition-all duration-300 shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" /> Active Coach Session
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-foreground line-clamp-1">
                {activeCoachThread.data?.title ?? "No Active Session"}
              </h4>
              <p className="text-xs text-muted-foreground">
                {activeCoachThread.data
                  ? `Last message: ${new Date(activeCoachThread.data.updated_at).toLocaleDateString()}`
                  : "Start a conversation to get tailored guidance."}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={() => navigate({ to: "/seeker/coach" })}
            >
              Resume Coaching
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Columns: Applications, Saved Jobs & Recommendations */}
        <div className="md:col-span-2 space-y-6">
          {/* Applications list */}
          <Card className="bg-card/30 backdrop-blur-md border border-muted/50 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Active Pipeline Applications</CardTitle>
                <CardDescription>Track the progress of your submitted resumes.</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/seeker/applications">View all</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {apps.isLoading ? (
                <Skeleton className="h-32" />
              ) : (apps.data ?? []).length === 0 ? (
                <EmptyState
                  title="No applications yet"
                  description="Apply to jobs to see your progress here."
                  actionLabel="Browse jobs"
                  actionHref="/jobs"
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs font-semibold">Job Title</TableHead>
                      <TableHead className="text-xs font-semibold">Company</TableHead>
                      <TableHead className="text-xs font-semibold">Status</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Applied</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apps.data!.slice(0, 4).map((a) => {
                      const j = a.jobs as {
                        id: string;
                        title: string;
                        companies: { name: string } | null;
                      } | null;
                      if (!j) return null;
                      return (
                        <TableRow key={a.id} className="hover:bg-muted/10">
                          <TableCell className="text-xs font-medium">
                            <Link
                              to="/jobs/$id"
                              params={{ id: j.id }}
                              className="hover:text-primary"
                            >
                              {j.title}
                            </Link>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {j.companies?.name ?? "—"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={statusVariant[a.status]}
                              className="capitalize text-[10px] py-0.5 px-2"
                            >
                              {a.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-right text-muted-foreground">
                            {timeAgo(a.applied_at)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Recommended Jobs Widget */}
          <Card className="bg-card/30 backdrop-blur-md border border-muted/50 shadow-sm">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-500" /> Recommended Matches
                  </CardTitle>
                  <CardDescription>Roles matching your skillset and resume attributes.</CardDescription>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/jobs">Browse all</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {recommended.isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : !p?.skills?.length ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  Add skills in your profile to receive matching recommendations.
                </p>
              ) : (recommended.data ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  No matching jobs found. Try expanding your profile skills.
                </p>
              ) : (
                <div className="grid gap-4">
                  {recommended.data!.map((job) => (
                    <JobCard key={job.id} job={job as JobCardData} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Saved Jobs Widget */}
          <Card className="bg-card/30 backdrop-blur-md border border-muted/50 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Heart className="h-5 w-5 text-red-500 fill-red-500" /> Saved Jobs
                </CardTitle>
                <CardDescription>Keep track of jobs you are interested in.</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/seeker/saved-jobs">View saved</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {saved.isLoading ? (
                <Skeleton className="h-24" />
              ) : (saved.data ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  You haven't saved any positions yet.
                </p>
              ) : (
                <div className="grid gap-4">
                  {saved.data!.map((item) => {
                    const job = item.jobs as JobCardData;
                    if (!job) return null;
                    return <JobCard key={item.id} job={job} />;
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Upcoming Interviews & Recent Activity */}
        <div className="space-y-6">
          {/* Upcoming Interviews Widget */}
          <Card className="bg-card/30 backdrop-blur-md border border-muted/50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" /> Upcoming Interviews
              </CardTitle>
              <CardDescription>Scheduled screening stages and evaluations.</CardDescription>
            </CardHeader>
            <CardContent>
              {interviews.isLoading ? (
                <Skeleton className="h-20" />
              ) : (interviews.data ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  No upcoming interviews scheduled.
                </p>
              ) : (
                <div className="space-y-4">
                  {interviews.data!.map((item) => (
                    <div key={item.id} className="border-b last:border-0 pb-3 last:pb-0 space-y-1">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h4 className="font-semibold text-xs leading-normal">{item.title}</h4>
                          <p className="text-[10px] text-muted-foreground">{item.company}</p>
                        </div>
                        <Badge variant="secondary" className="capitalize text-[8px] py-0.5 px-1.5 whitespace-nowrap">
                          {item.stage}
                        </Badge>
                      </div>
                      {item.notes && (
                        <p className="text-[10px] text-muted-foreground italic leading-snug">
                          "{item.notes}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity Log */}
          <Card className="bg-card/30 backdrop-blur-md border border-muted/50 shadow-sm flex flex-col justify-between">
            <div>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" /> Recent Activity
                </CardTitle>
                <CardDescription>A real-time log of your career operations.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentActivity.isLoading ? (
                  <div className="space-y-3">
                    <div className="h-8 bg-muted/40 rounded-lg animate-pulse" />
                    <div className="h-8 bg-muted/40 rounded-lg animate-pulse" />
                  </div>
                ) : (recentActivity.data ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    No actions logged yet. Upload a resume or chat with the coach to begin.
                  </p>
                ) : (
                  <div className="relative border-l pl-4 ml-2 space-y-4 text-xs">
                    {recentActivity.data?.map((act: any) => (
                      <div key={act.id} className="relative">
                        <span className="absolute -left-[21px] top-1 bg-background border rounded-full h-3 w-3 flex items-center justify-center ring-4 ring-background">
                          <span className="h-1.5 w-1.5 bg-primary rounded-full" />
                        </span>
                        <div className="space-y-0.5">
                          <p className="font-semibold text-foreground capitalize">
                            {act.kind.replace("_", " ")}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(act.created_at).toLocaleDateString()} at{" "}
                            {new Date(act.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </div>
            <div className="p-6 pt-0 border-t border-muted/20">
              <Button
                onClick={() => navigate({ to: "/seeker/tracker" })}
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground hover:text-foreground mt-4"
              >
                Open Pipeline Tracker <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
