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
import { Skeleton } from "@/components/ui/skeleton";
import { SkillTagInput } from "@/components/common/SkillTagInput";
import { FileUploadField } from "@/components/common/FileUploadField";
import { profileSchema, type ProfileInput } from "@/lib/validations";
import { initials } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/seeker/profile")({
  component: SeekerProfile,
});

function SeekerProfile() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [skills, setSkills] = useState<string[]>([]);
  const [uploading, setUploading] = useState<"avatar" | "resume" | null>(null);

  const profile = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: { full_name: "", bio: "", location: "", website: "" },
  });

  useEffect(() => {
    if (profile.data) {
      form.reset({
        full_name: profile.data.full_name ?? "",
        bio: profile.data.bio ?? "",
        location: profile.data.location ?? "",
        website: profile.data.website ?? "",
      });
      setSkills(profile.data.skills ?? []);
    }
  }, [profile.data]);

  const save = useMutation({
    mutationFn: async (v: ProfileInput) => {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: v.full_name,
          bio: v.bio || null,
          location: v.location || null,
          website: v.website || null,
          skills,
        })
        .eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile saved");
      qc.invalidateQueries({ queryKey: ["profile", user?.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function uploadAvatar(file: File) {
    setUploading("avatar");
    try {
      const path = `${user!.id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage
        .from("avatars")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      await supabase
        .from("profiles")
        .update({ avatar_url: signed?.signedUrl ?? null })
        .eq("id", user!.id);
      toast.success("Avatar updated");
      qc.invalidateQueries({ queryKey: ["profile", user?.id] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(null);
    }
  }

  async function uploadResume(file: File) {
    setUploading("resume");
    try {
      const path = `${user!.id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage
        .from("resumes")
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage
        .from("resumes")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      await supabase
        .from("profiles")
        .update({ resume_url: signed?.signedUrl ?? null, resume_filename: file.name })
        .eq("id", user!.id);
      toast.success("Resume uploaded");
      qc.invalidateQueries({ queryKey: ["profile", user?.id] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(null);
    }
  }

  if (profile.isLoading)
    return (
      <div className="container mx-auto p-6">
        <Skeleton className="h-96 w-full" />
      </div>
    );
  const p = profile.data!;

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">My profile</h1>
      <Card className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <Avatar className="h-20 w-20">
            <AvatarImage src={p.avatar_url ?? undefined} />
            <AvatarFallback>{initials(p.full_name)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <FileUploadField
              accept="image/*"
              maxMB={2}
              currentName={p.avatar_url ? "Current photo" : null}
              onFile={uploadAvatar}
              uploading={uploading === "avatar"}
              label="Upload avatar"
              onClear={async () => {
                await supabase.from("profiles").update({ avatar_url: null }).eq("id", user!.id);
                qc.invalidateQueries({ queryKey: ["profile", user?.id] });
              }}
            />
          </div>
        </div>

        <form onSubmit={form.handleSubmit((v) => save.mutate(v))} className="space-y-4">
          <div>
            <Label>Full name</Label>
            <Input {...form.register("full_name")} />
            {form.formState.errors.full_name && (
              <p className="text-xs text-destructive">{form.formState.errors.full_name.message}</p>
            )}
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Location</Label>
              <Input {...form.register("location")} placeholder="City, Country" />
            </div>
            <div>
              <Label>Website</Label>
              <Input {...form.register("website")} placeholder="https://" />
              {form.formState.errors.website && (
                <p className="text-xs text-destructive">{form.formState.errors.website.message}</p>
              )}
            </div>
          </div>
          <div>
            <Label>Bio</Label>
            <Textarea
              rows={4}
              {...form.register("bio")}
              placeholder="A short intro about yourself"
            />
          </div>
          <div>
            <Label>Skills</Label>
            <SkillTagInput value={skills} onChange={setSkills} />
          </div>

          <div>
            <Label>Resume</Label>
            <FileUploadField
              accept=".pdf,.doc,.docx"
              maxMB={5}
              currentName={p.resume_filename}
              onFile={uploadResume}
              uploading={uploading === "resume"}
              label="Upload resume (PDF/DOC)"
              onClear={async () => {
                await supabase
                  .from("profiles")
                  .update({ resume_url: null, resume_filename: null })
                  .eq("id", user!.id);
                qc.invalidateQueries({ queryKey: ["profile", user?.id] });
              }}
            />
          </div>

          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
