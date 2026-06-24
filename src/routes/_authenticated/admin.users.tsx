import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAdminUsers } from "@/lib/api/admin.functions";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { initials, timeAgo } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: AdminUsers,
});

function AdminUsers() {
  const [q, setQ] = useState("");
  const fetchUsers = useServerFn(listAdminUsers);

  const users = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => fetchUsers(),
  });

  const filtered = (users.data?.users ?? []).filter(
    (u) =>
      !q ||
      u.email?.toLowerCase().includes(q.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Users</h1>
      <Input
        className="max-w-sm mb-4"
        placeholder="Search by name or email"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {users.isLoading ? (
        <Skeleton className="h-64" />
      ) : users.isError ? (
        <p className="text-destructive text-sm">
          {(users.error as Error).message ?? "Failed to load users"}
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((u) => (
            <Card key={u.id} className="p-4 flex items-center gap-3">
              <Avatar>
                <AvatarImage src={u.avatar_url ?? undefined} />
                <AvatarFallback>{initials(u.full_name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{u.full_name || "—"}</p>
                <p className="text-xs text-muted-foreground">
                  {u.email} · {u.location ?? "—"} · joined {timeAgo(u.created_at)}
                </p>
              </div>
              <div className="flex gap-1">
                {u.roles.map((r) => (
                  <Badge key={r} variant="secondary" className="capitalize">
                    {r}
                  </Badge>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
