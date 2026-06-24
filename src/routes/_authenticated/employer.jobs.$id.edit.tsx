import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { JobForm } from "@/components/jobs/JobForm";
import { Skeleton } from "@/components/ui/skeleton";
import type { JobInput } from "@/lib/validations";

export const Route = createFileRoute("/_authenticated/employer/jobs/$id/edit")({
  component: EditJob,
});

function EditJob() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const job = useQuery({
    queryKey: ["job-edit", id],
    queryFn: async () => (await supabase.from("jobs").select("*").eq("id", id).single()).data,
  });

  const update = useMutation({
    mutationFn: async (v: JobInput) => {
      const { error } = await supabase
        .from("jobs")
        .update({
          ...v,
          expires_at: new Date(v.expires_at).toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Job updated");
      navigate({ to: "/employer/jobs" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (job.isLoading)
    return (
      <div className="container mx-auto p-6 max-w-3xl">
        <Skeleton className="h-96" />
      </div>
    );
  if (!job.data) return <div className="container mx-auto p-6">Not found</div>;
  const j = job.data;

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">Edit job</h1>
      <JobForm
        submitLabel="Save changes"
        busy={update.isPending}
        initial={{
          title: j.title,
          description: j.description,
          location: j.location,
          type: j.type,
          category: j.category,
          experience_level: j.experience_level,
          salary_min: j.salary_min,
          salary_max: j.salary_max,
          salary_currency: j.salary_currency,
          skills_required: j.skills_required ?? [],
          expires_at: new Date(j.expires_at).toISOString().slice(0, 10),
        }}
        onSubmit={(v) => update.mutate(v)}
      />
    </div>
  );
}
