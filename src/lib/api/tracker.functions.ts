import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const STAGES = ["saved", "applied", "screening", "interview", "offer", "rejected"] as const;

export const listTracker = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("tracker_items")
      .select("*")
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false });
    return { items: data ?? [] };
  });

const AddInput = z.object({
  title: z.string().min(1).max(200),
  company: z.string().max(200).optional(),
  url: z.string().max(2048).optional(),
  internal_job_id: z.string().uuid().optional(),
  external_job_id: z.string().uuid().optional(),
  stage: z.enum(STAGES).optional(),
  notes: z.string().max(2000).optional(),
});

export const addTracker = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => AddInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("tracker_items")
      .insert({
        user_id: context.userId,
        title: data.title,
        company: data.company ?? null,
        url: data.url ?? null,
        internal_job_id: data.internal_job_id ?? null,
        external_job_id: data.external_job_id ?? null,
        stage: data.stage ?? "saved",
        notes: data.notes ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await context.supabase.from("activity_log").insert({
      user_id: context.userId,
      kind: "tracker_added",
      payload: { id: row.id, title: data.title, stage: data.stage ?? "saved" },
    });
    return row;
  });

const UpdateInput = z.object({
  id: z.string().uuid(),
  stage: z.enum(STAGES).optional(),
  notes: z.string().max(2000).optional(),
});

export const updateTracker = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UpdateInput.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("tracker_items")
      .update({ stage: data.stage, notes: data.notes })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteTracker = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("tracker_items")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
