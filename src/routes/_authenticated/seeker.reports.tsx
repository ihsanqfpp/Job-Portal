import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Share2, ExternalLink, Copy, Check, FileBarChart, Loader2, Trash2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { createShareReport, revokeShareReport } from "@/lib/api/resume.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/seeker/reports")({
  component: ReportsPage,
});

function ReportsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selectedVersionId, setSelectedVersionId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const createShareFn = useServerFn(createShareReport);
  const revokeShareFn = useServerFn(revokeShareReport);

  // Fetch resume versions
  const resumeVersions = useQuery({
    queryKey: ["resume-versions", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("resume_versions")
        .select("id, filename, created_at, ats_score")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  // Fetch shared reports
  const sharedReports = useQuery({
    queryKey: ["shared-reports", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("shared_reports")
        .select(
          `
          id,
          slug,
          display_name,
          created_at,
          resume_versions (
            filename,
            ats_score
          )
        `,
        )
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      await revokeShareFn({ data: { id } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shared-reports", user?.id] });
      toast.success("Link revoked — it is no longer publicly accessible.");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to revoke link");
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      return await createShareFn({
        data: {
          versionId: selectedVersionId,
          displayName: displayName || undefined,
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shared-reports", user?.id] });
      setDisplayName("");
      setSelectedVersionId("");
      toast.success("Public report generated successfully!");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create public share link");
    },
  });

  const copyToClipboard = (slug: string) => {
    const link = `${window.location.origin}/reports/${slug}`;
    navigator.clipboard.writeText(link);
    setCopiedSlug(slug);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  return (
    <div className="container mx-auto px-6 py-8 space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
          Shareable ATS Reports
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Generate secure, shareable web links showcasing your ATS score and skill gaps.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Generate Report Card */}
        <Card className="md:col-span-1 bg-card/40 backdrop-blur-md border border-muted/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Generate Share Link</CardTitle>
            <CardDescription>Publish your resume report to the web.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Select Resume Version</label>
              <select
                value={selectedVersionId}
                onChange={(e) => setSelectedVersionId(e.target.value)}
                className="w-full p-2 rounded-md border bg-background text-sm"
              >
                <option value="">-- Choose Resume --</option>
                {resumeVersions.data?.map((version) => (
                  <option key={version.id} value={version.id}>
                    {version.filename} (Score: {version.ats_score}%)
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Display Name (Optional)</label>
              <Input
                placeholder="e.g. John Doe - Senior Dev"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>

            <Button
              className="w-full bg-primary hover:bg-primary/95 text-xs font-medium py-2 shadow-md shadow-primary/10 gap-2"
              onClick={() => createMutation.mutate()}
              disabled={!selectedVersionId || createMutation.isPending}
            >
              {createMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Share2 className="h-3.5 w-3.5" />
              )}
              Generate Public Link
            </Button>
          </CardContent>
        </Card>

        {/* Shared Links List */}
        <Card className="md:col-span-2 bg-card/40 backdrop-blur-md border border-muted/50 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileBarChart className="h-4 w-4 text-primary" /> Active Shared Links
            </CardTitle>
            <CardDescription>Your public report pages currently live on the web.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {sharedReports.isLoading ? (
              <div className="space-y-3">
                <div className="h-16 bg-muted/30 rounded-lg animate-pulse" />
                <div className="h-16 bg-muted/30 rounded-lg animate-pulse" />
              </div>
            ) : sharedReports.data?.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-muted rounded-lg text-sm text-muted-foreground">
                You haven't generated any public share links yet.
              </div>
            ) : (
              <div className="space-y-3">
                {sharedReports.data?.map((report: any) => {
                  const version = report.resume_versions;
                  return (
                    <div
                      key={report.id}
                      className="p-4 rounded-lg border border-muted/50 bg-muted/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-primary/20 transition-all duration-200"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-foreground">
                            {report.display_name || "Anonymous Seeker"}
                          </span>
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0.5 scale-90">
                            ATS: {version?.ats_score || 0}%
                          </Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate max-w-[280px]">
                          File: {version?.filename || "No Resume File"}
                        </p>
                      </div>

                      <div className="flex gap-2 w-full sm:w-auto">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 sm:flex-initial text-[11px] gap-1 h-8 px-2.5"
                          onClick={() => copyToClipboard(report.slug)}
                        >
                          {copiedSlug === report.slug ? (
                            <Check className="h-3.5 w-3.5 text-green-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                          Copy Link
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-1 sm:flex-initial text-[11px] gap-1 h-8 px-2.5 hover:text-primary"
                          asChild
                        >
                          <a
                            href={`${window.location.origin}/reports/${report.slug}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            View
                          </a>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-1 sm:flex-initial text-[11px] gap-1 h-8 px-2.5 hover:text-destructive text-muted-foreground"
                          disabled={revokeMutation.isPending}
                          onClick={() => revokeMutation.mutate(report.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Revoke
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
