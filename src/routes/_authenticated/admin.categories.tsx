import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin/categories")({
  component: AdminCategories,
});

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function AdminCategories() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const cats = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => (await supabase.from("categories").select("*").order("name")).data ?? [],
  });
  const add = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Name required");
      const { error } = await supabase
        .from("categories")
        .insert({ name: name.trim(), slug: slugify(name) });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Category added");
      setName("");
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("categories").delete().eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-categories"] }),
  });
  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Categories</h1>
      <Card className="p-4 mb-4 flex gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New category name"
        />
        <Button onClick={() => add.mutate()} disabled={add.isPending}>
          Add
        </Button>
      </Card>
      {cats.isLoading ? (
        <Skeleton className="h-64" />
      ) : (
        <div className="space-y-2">
          {cats.data!.map((c) => (
            <Card key={c.id} className="p-3 flex items-center justify-between">
              <div>
                <p className="font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground">
                  /{c.slug} · {c.job_count} jobs
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => del.mutate(c.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
