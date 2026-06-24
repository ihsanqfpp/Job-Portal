import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials, timeAgo } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/employers")({
  component: AdminEmployers,
});

function AdminEmployers() {
  const qc = useQueryClient();
  const cos = useQuery({
    queryKey: ["admin-companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*,profiles!companies_owner_id_fkey(full_name,email)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const setApproved = useMutation({
    mutationFn: async ({ id, approved }: { id: string; approved: boolean }) => {
      const { error } = await supabase
        .from("companies")
        .update({ is_approved: approved })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Updated");
      qc.invalidateQueries({ queryKey: ["admin-companies"] });
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("companies").delete().eq("id", id);
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["admin-companies"] });
    },
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Employers</h1>
      {cos.isLoading ? (
        <Skeleton className="h-64" />
      ) : (
        <div className="space-y-3">
          {cos.data!.map((c) => {
            const owner = c.profiles as { full_name: string; email: string } | null;
            return (
              <Card key={c.id} className="p-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <Avatar className="rounded-lg">
                    <AvatarImage src={c.logo_url ?? undefined} />
                    <AvatarFallback className="rounded-lg">{initials(c.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{c.name}</p>
                      <Badge variant={c.is_approved ? "default" : "secondary"}>
                        {c.is_approved ? "Approved" : "Pending"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {owner?.full_name} · {owner?.email} · {c.industry ?? "—"} ·{" "}
                      {timeAgo(c.created_at)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {c.is_approved ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setApproved.mutate({ id: c.id, approved: false })}
                      >
                        Revoke
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => setApproved.mutate({ id: c.id, approved: true })}
                      >
                        Approve
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => del.mutate(c.id)}>
                      Delete
                    </Button>
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
