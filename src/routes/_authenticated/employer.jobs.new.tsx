import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { JobForm } from "@/components/jobs/JobForm";
import type { JobInput } from "@/lib/validations";

export const Route = createFileRoute("/_authenticated/employer/jobs/new")({
  component: NewJob,
});

function NewJob() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const company = useQuery({
    queryKey: ["my-company", user?.id],
    enabled: !!user,
    queryFn: async () =>
      (
        await supabase
          .from("companies")
          .select("id,is_approved")
          .eq("owner_id", user!.id)
          .maybeSingle()
      ).data,
  });

  const create = useMutation({
    mutationFn: async (v: JobInput) => {
      if (!company.data?.is_approved)
        throw new Error("Your company must be approved before posting jobs");
      const { error, data } = await supabase
        .from("jobs")
        .insert({
          ...v,
          company_id: company.data.id,
          posted_by: user!.id,
          expires_at: new Date(v.expires_at).toISOString(),
        })
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => {
      toast.success("Job posted");
      navigate({ to: "/jobs/$id", params: { id: d.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">Post a new job</h1>
      {!company.data ? (
        <Card className="p-6 space-y-2">
          <p>You need a company profile before you can post jobs.</p>
          <Link
            to="/employer/company"
            className="inline-block text-sm font-medium text-primary underline underline-offset-4"
          >
            Create your company profile →
          </Link>
        </Card>
      ) : !company.data.is_approved ? (
        <Card className="p-6">
          <p>Your company is pending approval. You'll be able to post jobs once approved.</p>
        </Card>
      ) : (
        <JobForm
          submitLabel="Publish job"
          onSubmit={(v) => create.mutate(v)}
          busy={create.isPending}
        />
      )}
    </div>
  );
}
