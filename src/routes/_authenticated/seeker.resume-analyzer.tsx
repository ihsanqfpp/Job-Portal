import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FileText, Sparkles, Download, History, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/auth-context";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { ResumePDFDocument } from "@/components/ui/ResumePDFDocument";
import { FeatureErrorBoundary } from "@/components/ui/FeatureErrorBoundary";
import { ResumeUploader } from "@/components/ResumeUploader";

export const Route = createFileRoute("/_authenticated/seeker/resume-analyzer")({
  component: ResumeAnalyzerPage,
  errorComponent: () => (
    <FeatureErrorBoundary fallback={null}>
      <div />
    </FeatureErrorBoundary>
  ),
});

function ResumeAnalyzerPage() {
  const { user } = useAuth();
  const [selectedVersion, setSelectedVersion] = useState<Tables<"resume_versions"> | null>(null);

  // Fetch resume versions
  const resumeVersions = useQuery({
    queryKey: ["resume-versions", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("resume_versions")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  // Fetch latest rewrites
  const rewrites = useQuery({
    queryKey: ["resume-rewrites", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("resume_rewrites")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const latestVersion = resumeVersions.data?.[0];
  const activeVersion = selectedVersion || latestVersion;
  const currentRewrite = rewrites.data?.find((r) => r.version_id === (activeVersion?.id ?? null));

  const analysisForPDF = {
    ats_score: (activeVersion?.ats_score ?? 0) as number,
    readiness_score: (activeVersion?.readiness_score ?? 0) as number,
    summary: (currentRewrite?.improved_summary || activeVersion?.summary || "") as string,
    detected_skills: (activeVersion?.detected_skills || []) as string[],
    missing_keywords: (activeVersion?.missing_keywords || []) as string[],
    suggestions: (activeVersion?.suggestions || []) as string[],
  };

  return (
    <FeatureErrorBoundary>
      <div className="container mx-auto px-6 py-8 space-y-8 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              Resume Analyzer
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Compare versions, view detailed ATS match scoring, and export optimized PDFs.
            </p>
          </div>
          <div className="flex gap-2">
            {activeVersion ? (
              <PDFDownloadLink
                document={<ResumePDFDocument analysis={analysisForPDF} />}
                fileName={`ATS-Report-${activeVersion.id.slice(0, 6)}.pdf`}
              >
                {/* @ts-ignore */}
                {({ loading }) => (
                  <Button variant="outline" className="gap-2" disabled={loading}>
                    <Download className="h-4 w-4" /> {loading ? "Preparing PDF..." : "Export PDF"}
                  </Button>
                )}
              </PDFDownloadLink>
            ) : (
              <Button variant="outline" className="gap-2" disabled>
                <Download className="h-4 w-4" /> Export PDF
              </Button>
            )}
            <Button className="gap-2 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/95">
              <Sparkles className="h-4 w-4" /> Rewrite with AI
            </Button>
          </div>
        </div>

        {/* Upload new resume */}
        <Card className="bg-card/40 backdrop-blur-md border border-muted/50 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-4 w-4 text-primary" /> Upload New Resume
            </CardTitle>
            <CardDescription>
              PDF only · max 5 MB · text is extracted and analysed automatically
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResumeUploader onSuccess={(versionId) => {
              resumeVersions.refetch();
            }} />
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Left Side: Version History List */}
          <Card className="md:col-span-1 bg-card/40 backdrop-blur-md border border-muted/50 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <History className="h-4 w-4 text-primary" /> Version History
              </CardTitle>
              <CardDescription>Select a resume version to analyze.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {resumeVersions.isLoading ? (
                <div className="space-y-2">
                  <div className="h-12 bg-muted/50 rounded-lg animate-pulse" />
                  <div className="h-12 bg-muted/50 rounded-lg animate-pulse" />
                </div>
              ) : resumeVersions.data?.length === 0 ? (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  No resume versions uploaded yet.
                </div>
              ) : (
                resumeVersions.data?.map((version, idx: number) => (
                  <div
                    key={version.id}
                    onClick={() => setSelectedVersion(version)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                      activeVersion?.id === version.id
                        ? "bg-primary/10 border-primary/40 text-primary"
                        : "bg-muted/10 border-muted hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-xs truncate max-w-[120px]">
                        {activeVersion?.filename || `Version ${resumeVersions.data!.length - idx}`}
                      </span>
                      <Badge
                        variant={idx === 0 ? "default" : "outline"}
                        className="text-[9px] scale-90"
                      >
                        {idx === 0 ? "Latest" : "Archived"}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(version.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Right Side: ATS Score & Comparison */}
          <div className="md:col-span-2 space-y-6">
            <Card className="bg-card/40 backdrop-blur-md border border-muted/50 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="h-4 w-4 text-purple-500 animate-pulse" /> ATS Compatibility
                  Score
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">ATS Optimization Score</span>
                  <span className="text-lg font-bold text-primary">
                    {activeVersion?.ats_score || 72}%
                  </span>
                </div>
                <Progress value={activeVersion?.ats_score || 72} className="h-3 bg-muted/50" />
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                  <div className="p-3 bg-muted/10 rounded-lg border border-muted/30 text-center">
                    <span className="text-[10px] text-muted-foreground block">
                      Keywords Matched
                    </span>
                    <span className="text-sm font-bold text-green-500">14 / 20</span>
                  </div>
                  <div className="p-3 bg-muted/10 rounded-lg border border-muted/30 text-center">
                    <span className="text-[10px] text-muted-foreground block">Format & Layout</span>
                    <span className="text-sm font-bold text-primary">Excellent</span>
                  </div>
                  <div className="p-3 bg-muted/10 rounded-lg border border-muted/30 text-center col-span-2 md:col-span-1">
                    <span className="text-[10px] text-muted-foreground block">
                      AI Recommendations
                    </span>
                    <span className="text-sm font-bold text-amber-500">3 Pending</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Side-by-Side Comparison Mock */}
            <Card className="bg-card/40 backdrop-blur-md border border-muted/50 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Original vs AI-Improved Comparison</CardTitle>
                <CardDescription>Review the recommended updates side-by-side.</CardDescription>
              </CardHeader>
              <CardContent>
                {currentRewrite ? (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-lg space-y-2">
                      <div className="flex items-center gap-1.5 text-xs text-red-400 font-semibold mb-1">
                        <span>Original Resume Content</span>
                      </div>
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                        {activeVersion?.parsed_text || "Original text goes here."}
                      </p>
                    </div>
                    <div className="p-4 bg-green-500/5 border border-green-500/10 rounded-lg space-y-2">
                      <div className="flex items-center gap-1.5 text-xs text-green-400 font-semibold mb-1">
                        <span>AI Rewritten Content</span>
                      </div>
                      <p className="text-xs text-foreground whitespace-pre-wrap">
                        {currentRewrite.improved_summary || "Rewritten text goes here."}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 border border-dashed border-muted rounded-lg">
                    <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No AI rewrite has been run for this version yet.
                    </p>
                    <Button size="sm" className="mt-4 gap-1.5">
                      Generate Rewrite <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </FeatureErrorBoundary>
  );
}
