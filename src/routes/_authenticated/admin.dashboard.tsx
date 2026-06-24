import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, Building2, Briefcase, FileText, ShieldAlert } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useServerFn } from "@tanstack/react-start";
import { bootstrapAdmin, seedDemoData, getAdminStats } from "@/lib/api/admin.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/dashboard")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { role, refreshRole } = useAuth();
  const claim = useServerFn(bootstrapAdmin);
  const seed = useServerFn(seedDemoData);
  const fetchStats = useServerFn(getAdminStats);

  const stats = useQuery({
    queryKey: ["admin-stats"],
    enabled: role === "admin",
    // Stats are fetched through a server function that re-verifies the admin
    // role server-side before querying with the service-role key.
    queryFn: () => fetchStats(),
  });

  if (role !== "admin") {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Card className="p-8 text-center space-y-4">
          <ShieldAlert className="h-10 w-10 mx-auto text-muted-foreground" />
          <h2 className="text-lg font-semibold">Admin access required</h2>
          <p className="text-sm text-muted-foreground">
            If no admin exists yet, you can claim admin rights for this account.
          </p>
          <Button
            onClick={async () => {
              try {
                await claim();
                await refreshRole();
                toast.success("You are now admin");
              } catch (e) {
                toast.error((e as Error).message);
              }
            }}
          >
            Claim admin
          </Button>
        </Card>
      </div>
    );
  }

  if (stats.isLoading)
    return (
      <div className="container mx-auto p-6">
        <Skeleton className="h-96 w-full" />
      </div>
    );

  if (stats.isError)
    return (
      <div className="container mx-auto p-6">
        <p className="text-destructive text-sm">
          {(stats.error as Error).message ?? "Failed to load stats"}
        </p>
      </div>
    );

  const s = stats.data!;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Admin dashboard</h1>
        <Button
          variant="outline"
          onClick={async () => {
            try {
              const r = await seed();
              toast.success(`Seeded ${r.jobs} jobs across ${r.companies} companies`);
            } catch (e) {
              toast.error((e as Error).message);
            }
          }}
        >
          Seed demo data
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {[
          { label: "Users", value: s.users, icon: Users, to: "/admin/users" },
          { label: "Companies", value: s.companies, icon: Building2, to: "/admin/employers" },
          { label: "Jobs", value: s.jobs, icon: Briefcase, to: "/admin/jobs" },
          { label: "Applications", value: s.apps, icon: FileText, to: "/admin/jobs" },
          { label: "Pending approvals", value: s.pending, icon: ShieldAlert, to: "/admin/employers" },
        ].map((st) => (
          <Link key={st.label} to={st.to}>
            <Card className="p-4 hover:border-primary/40 transition">
              <st.icon className="h-5 w-5 text-primary/60 mb-2" />
              <p className="text-xs text-muted-foreground">{st.label}</p>
              <p className="text-2xl font-bold">{st.value}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
