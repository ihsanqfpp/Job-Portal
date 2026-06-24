import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SkillTagInput } from "@/components/common/SkillTagInput";
import { jobSchema, type JobFormInput, type JobInput } from "@/lib/validations";

const TYPES = ["full-time", "part-time", "remote", "hybrid", "contract", "internship"] as const;
const LEVELS = ["entry", "junior", "mid", "senior", "lead"] as const;

export function JobForm({
  initial,
  submitLabel,
  onSubmit,
  busy,
}: {
  initial?: Partial<JobInput>;
  submitLabel: string;
  onSubmit: (v: JobInput) => void;
  busy?: boolean;
}) {
  const [skills, setSkills] = useState<string[]>(initial?.skills_required ?? []);

  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await supabase.from("categories").select("*").order("name")).data ?? [],
    staleTime: 5 * 60 * 1000,
  });

  const form = useForm<JobFormInput>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      title: "",
      description: "",
      location: "",
      type: "full-time",
      category: "",
      experience_level: "mid",
      salary_min: null,
      salary_max: null,
      salary_currency: "USD",
      expires_at: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      ...initial,
    },
  });

  useEffect(() => {
    if (initial?.skills_required) setSkills(initial.skills_required);
  }, []);

  return (
    <Card className="p-6">
      <form
        onSubmit={form.handleSubmit((v) => onSubmit({ ...v, skills_required: skills }))}
        className="space-y-4"
      >
        <div>
          <Label>Job title</Label>
          <Input {...form.register("title")} />
          {form.formState.errors.title && (
            <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
          )}
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>Location</Label>
            <Input {...form.register("location")} placeholder="Remote, NYC, etc." />
          </div>
          <div>
            <Label>Category</Label>
            <Select
              value={form.watch("category")}
              onValueChange={(v) => form.setValue("category", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {(categories.data ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.slug}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.category && (
              <p className="text-xs text-destructive">{form.formState.errors.category.message}</p>
            )}
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>Job type</Label>
            <Select
              value={form.watch("type")}
              onValueChange={(v) => form.setValue("type", v as JobInput["type"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => (
                  <SelectItem key={t} value={t} className="capitalize">
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Experience level</Label>
            <Select
              value={form.watch("experience_level")}
              onValueChange={(v) =>
                form.setValue("experience_level", v as JobInput["experience_level"])
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEVELS.map((l) => (
                  <SelectItem key={l} value={l} className="capitalize">
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <Label>Min salary</Label>
            <Input
              type="number"
              {...form.register("salary_min", { setValueAs: (v) => (v === "" ? null : Number(v)) })}
            />
          </div>
          <div>
            <Label>Max salary</Label>
            <Input
              type="number"
              {...form.register("salary_max", { setValueAs: (v) => (v === "" ? null : Number(v)) })}
            />
            {form.formState.errors.salary_max && (
              <p className="text-xs text-destructive">{form.formState.errors.salary_max.message}</p>
            )}
          </div>
          <div>
            <Label>Currency</Label>
            <Input {...form.register("salary_currency")} defaultValue="USD" />
          </div>
        </div>
        <div>
          <Label>Description</Label>
          <Textarea
            rows={8}
            {...form.register("description")}
            placeholder="Describe the role, responsibilities, requirements…"
          />
          {form.formState.errors.description && (
            <p className="text-xs text-destructive">{form.formState.errors.description.message}</p>
          )}
        </div>
        <div>
          <Label>Required skills</Label>
          <SkillTagInput value={skills} onChange={setSkills} />
        </div>
        <div>
          <Label>Expires on</Label>
          <Input type="date" {...form.register("expires_at")} />
          {form.formState.errors.expires_at && (
            <p className="text-xs text-destructive">{form.formState.errors.expires_at.message}</p>
          )}
        </div>
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : submitLabel}
        </Button>
      </form>
    </Card>
  );
}
