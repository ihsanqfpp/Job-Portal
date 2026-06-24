import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

type RemotiveJob = {
  id: number;
  url: string;
  title: string;
  company_name: string;
  company_logo: string | null;
  category: string;
  job_type: string;
  publication_date: string;
  candidate_required_location: string;
  salary: string;
  description: string;
};

const REMOTIVE_CATEGORIES = [
  "software-dev",
  "design",
  "marketing",
  "sales",
  "finance-legal",
  "product",
];

// Creates a read-only anon client for public data — no service-role key needed.
function createAnonClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase environment variables");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
  });
}

// Refresh external jobs from Remotive. Admin-only: triggers an external fetch and
// writes to external_jobs via supabaseAdmin. Throttled to once per 6 hours unless forced.
export const refreshExternalJobs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ force: z.boolean().optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    // Verify caller is admin before hitting the external API or writing to DB.
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden: admin role required");

    if (!data.force) {
      const { data: latest } = await context.supabase
        .from("external_jobs")
        .select("fetched_at")
        .order("fetched_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (latest && Date.now() - new Date(latest.fetched_at).getTime() < 6 * 3600_000) {
        const { count } = await context.supabase
          .from("external_jobs")
          .select("id", { count: "exact", head: true });
        return { inserted: 0, total: count ?? 0, throttled: true };
      }
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let inserted = 0;
    for (const cat of REMOTIVE_CATEGORIES) {
      const res = await fetch(`https://remotive.com/api/remote-jobs?category=${cat}&limit=20`);
      if (!res.ok) continue;
      const json = (await res.json()) as { jobs: RemotiveJob[] };
      const rows = (json.jobs ?? []).map((j) => ({
        source: "remotive",
        source_id: String(j.id),
        title: j.title,
        company: j.company_name,
        company_logo: j.company_logo,
        location: j.candidate_required_location || "Remote",
        job_type: j.job_type,
        category: cat,
        url: j.url,
        description: (j.description ?? "").replace(/<[^>]+>/g, "").slice(0, 4000),
        salary: j.salary || null,
        skills: [] as string[],
        posted_at: j.publication_date,
        fetched_at: new Date().toISOString(),
      }));
      if (rows.length === 0) continue;
      const { error, count } = await supabaseAdmin
        .from("external_jobs")
        .upsert(rows, { onConflict: "source,source_id", count: "exact" });
      if (!error) inserted += count ?? rows.length;
    }

    const { count: total } = await context.supabase
      .from("external_jobs")
      .select("id", { count: "exact", head: true });
    return { inserted, total: total ?? 0, throttled: false };
  });

// Unified feed for the jobs page. Uses the anon client so the service-role key
// is never used for data that is publicly readable by RLS policy anyway.
export const listJobFeed = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        q: z.string().max(200).optional(),
        limit: z.number().int().min(1).max(60).optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const db = createAnonClient();
    const limit = data.limit ?? 30;
    const q = (data.q ?? "").trim();

    let internalQ = db
      .from("jobs")
      .select(
        "id,title,location,type,salary_min,salary_max,salary_currency,created_at,companies(name,logo_url)",
      )
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(limit);
    let externalQ = db
      .from("external_jobs")
      .select("id,title,company,company_logo,location,job_type,url,salary,posted_at")
      .order("posted_at", { ascending: false })
      .limit(limit);
    if (q) {
      internalQ = internalQ.ilike("title", `%${q}%`);
      externalQ = externalQ.ilike("title", `%${q}%`);
    }
    const [{ data: internal }, { data: external }] = await Promise.all([internalQ, externalQ]);
    return { internal: internal ?? [], external: external ?? [] };
  });
