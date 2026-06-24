import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { JobCard } from "@/components/jobs/JobCard";
import { initials } from "@/lib/format";

export const Route = createFileRoute("/companies/$companyId")({
  component: CompanyDetail,
});

// Derive a small culture-tag set from company size/industry as a heuristic.
function cultureTags(c: { size: string | null; industry: string | null }): string[] {
  const tags: string[] = [];
  if (!c.size) return ["Hiring now"];
  if (["1-10", "11-50"].includes(c.size)) tags.push("Small team");
  if (["51-200", "201-500"].includes(c.size)) tags.push("Fast-growing");
  if (c.size === "500+") tags.push("Enterprise");
  tags.push("Remote-friendly");
  if (c.industry?.toLowerCase().includes("tech") || c.industry?.toLowerCase().includes("software"))
    tags.push("Engineering-led");
  return tags;
}

function CompanyDetail() {
  const { companyId } = Route.useParams();

  const company = useQuery({
    queryKey: ["company", companyId],
    queryFn: async () =>
      (
        await supabase
          .from("companies")
          .select("*")
          .eq("id", companyId)
          .eq("is_approved", true)
          .maybeSingle()
      ).data,
  });

  const jobs = useQuery({
    queryKey: ["company-jobs", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("jobs")
        .select(
          "id,title,description,location,type,salary_min,salary_max,salary_currency,created_at,companies(name,logo_url)",
        )
        .eq("company_id", companyId)
        .eq("status", "open")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  if (company.isLoading)
    return (
      <div className="container mx-auto p-6">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  if (!company.data)
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Company not found</h1>
        <Button asChild className="mt-4">
          <Link to="/companies">Browse companies</Link>
        </Button>
      </div>
    );

  const c = company.data;
  const tags = cultureTags(c);

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="p-6">
        <div className="flex items-start gap-4 flex-wrap">
          <Avatar className="h-20 w-20 rounded-xl">
            <AvatarImage src={c.logo_url ?? undefined} />
            <AvatarFallback className="rounded-xl bg-accent text-accent-foreground">
              {initials(c.name) || <Building2 className="h-6 w-6" />}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold">{c.name}</h1>
            <p className="text-sm text-muted-foreground">{c.industry ?? "—"}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {c.size && (
                <Badge variant="outline" className="inline-flex items-center gap-1">
                  <Users className="h-3 w-3" /> {c.size} employees
                </Badge>
              )}
              {tags.map((t) => (
                <Badge key={t} variant="secondary">
                  {t}
                </Badge>
              ))}
            </div>
          </div>
        </div>
        {c.description && (
          <>
            <div className="my-6 h-px bg-border" />
            <h2 className="font-semibold mb-2">About {c.name}</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {c.description}
            </p>
          </>
        )}
      </Card>

      <section className="mt-8">
        <h2 className="text-xl font-bold mb-4">Open roles at {c.name}</h2>
        {jobs.isLoading ? (
          <Skeleton className="h-32" />
        ) : jobs.data!.length === 0 ? (
          <p className="text-muted-foreground text-sm">No open roles right now.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {jobs.data!.map((j) => (
              <JobCard key={j.id} job={j as never} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
