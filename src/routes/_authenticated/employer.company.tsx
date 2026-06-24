import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { FileUploadField } from "@/components/common/FileUploadField";
import { companySchema, type CompanyInput } from "@/lib/validations";
import { initials } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/employer/company")({
  component: EmployerCompany,
});

function EmployerCompany() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const company = useQuery({
    queryKey: ["my-company", user?.id],
    enabled: !!user,
    queryFn: async () =>
      (await supabase.from("companies").select("*").eq("owner_id", user!.id).maybeSingle()).data,
  });

  const form = useForm<CompanyInput>({
    resolver: zodResolver(companySchema),
    defaultValues: { name: "", website: "", industry: "", size: "1-10", description: "" },
  });

  useEffect(() => {
    if (company.data) {
      form.reset({
        name: company.data.name,
        website: company.data.website ?? "",
        industry: company.data.industry ?? "",
        size: (company.data.size ?? "1-10") as CompanyInput["size"],
        description: company.data.description ?? "",
      });
    }
  }, [company.data]);

  const save = useMutation({
    mutationFn: async (v: CompanyInput) => {
      if (company.data) {
        const { error } = await supabase
          .from("companies")
          .update({
            name: v.name,
            website: v.website || null,
            industry: v.industry || null,
            size: v.size,
            description: v.description || null,
          })
          .eq("id", company.data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("companies").insert({
          owner_id: user!.id,
          name: v.name,
          website: v.website || null,
          industry: v.industry || null,
          size: v.size,
          description: v.description || null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["my-company", user?.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function uploadLogo(file: File) {
    if (!company.data) {
      toast.error("Save the company first");
      return;
    }
    setUploading(true);
    try {
      const path = `${user!.id}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("logos").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: signed } = await supabase.storage
        .from("logos")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      await supabase
        .from("companies")
        .update({ logo_url: signed?.signedUrl ?? null })
        .eq("id", company.data.id);
      toast.success("Logo uploaded");
      qc.invalidateQueries({ queryKey: ["my-company", user?.id] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  if (company.isLoading)
    return (
      <div className="container mx-auto p-6">
        <Skeleton className="h-96" />
      </div>
    );

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Company profile</h1>
        {company.data && (
          <Badge variant={company.data.is_approved ? "default" : "secondary"}>
            {company.data.is_approved ? "Approved" : "Pending approval"}
          </Badge>
        )}
      </div>
      <Card className="p-6">
        {company.data && (
          <div className="flex items-center gap-4 mb-6">
            <Avatar className="h-20 w-20 rounded-xl">
              <AvatarImage src={company.data.logo_url ?? undefined} />
              <AvatarFallback className="rounded-xl">{initials(company.data.name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <FileUploadField
                accept="image/*"
                maxMB={2}
                currentName={company.data.logo_url ? "Current logo" : null}
                onFile={uploadLogo}
                uploading={uploading}
                label="Upload logo"
              />
            </div>
          </div>
        )}
        <form onSubmit={form.handleSubmit((v) => save.mutate(v))} className="space-y-4">
          <div>
            <Label>Company name</Label>
            <Input {...form.register("name")} />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Website</Label>
              <Input {...form.register("website")} placeholder="https://" />
            </div>
            <div>
              <Label>Industry</Label>
              <Input {...form.register("industry")} />
            </div>
          </div>
          <div>
            <Label>Size</Label>
            <Select
              value={form.watch("size")}
              onValueChange={(v) => form.setValue("size", v as CompanyInput["size"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["1-10", "11-50", "51-200", "201-500", "500+"].map((s) => (
                  <SelectItem key={s} value={s}>
                    {s} employees
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>About the company</Label>
            <Textarea rows={5} {...form.register("description")} />
          </div>
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? "Saving…" : company.data ? "Save" : "Create company"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
