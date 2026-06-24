import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { initials } from "@/lib/format";

export const Route = createFileRoute("/companies/")({
  head: () => ({
    meta: [
      { title: "Companies — Hireway" },
      { name: "description", content: "Browse companies hiring on Hireway." },
      { property: "og:title", content: "Companies — Hireway" },
      { property: "og:description", content: "Browse top companies hiring on Hireway. Find your next employer." },
      { property: "og:url", content: "/companies" },
      { name: "twitter:title", content: "Companies — Hireway" },
      { name: "twitter:description", content: "Browse top companies hiring on Hireway. Find your next employer." },
    ],
  }),
  component: CompaniesPage,
});

function CompaniesPage() {
  const data = useQuery({
    queryKey: ["companies-public"],
    queryFn: async () => {
      const [companies, jobs] = await Promise.all([
        supabase
          .from("companies")
          .select("id,name,logo_url,industry,size,description")
          .eq("is_approved", true)
          .order("name"),
        supabase
          .from("jobs")
          .select("company_id")
          .eq("status", "open")
          .gt("expires_at", new Date().toISOString()),
      ]);
      const counts = new Map<string, number>();
      (jobs.data ?? []).forEach((j) =>
        counts.set(j.company_id, (counts.get(j.company_id) ?? 0) + 1),
      );
      return (companies.data ?? []).map((c) => ({ ...c, openCount: counts.get(c.id) ?? 0 }));
    },
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold">Companies hiring</h1>
      <p className="text-muted-foreground mt-1">Discover teams building the future.</p>
      {data.isLoading ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : (data.data ?? []).length === 0 ? (
        <EmptyState title="No companies yet" description="Check back soon." />
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.data!.map((c) => (
            <Link
              key={c.id}
              to="/companies/$companyId"
              params={{ companyId: c.id }}
              className="block group"
            >
              <Card className="p-5 h-full transition hover:border-primary/40 hover:shadow-md">
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12 rounded-lg">
                    <AvatarImage src={c.logo_url ?? undefined} />
                    <AvatarFallback className="rounded-lg bg-accent text-accent-foreground">
                      {initials(c.name) || <Building2 className="h-5 w-5" />}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold group-hover:text-primary truncate">{c.name}</h3>
                    <p className="text-xs text-muted-foreground truncate">{c.industry ?? "—"}</p>
                  </div>
                </div>
                {c.description && (
                  <p className="mt-3 text-sm text-muted-foreground line-clamp-3">{c.description}</p>
                )}
                <div className="mt-3 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{c.openCount}</span> open role
                  {c.openCount === 1 ? "" : "s"}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
