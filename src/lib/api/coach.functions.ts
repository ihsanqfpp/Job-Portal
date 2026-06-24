import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireQuota } from "@/lib/api/quota-middleware";
import { requireRateLimit } from "@/lib/api/rate-limit-middleware";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { callChat, sandboxContent, INJECTION_GUARD } from "@/lib/ai-provider.server";

export const listCoachThreads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("coach_threads")
      .select("id, title, updated_at")
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false });
    return { threads: data ?? [] };
  });

export const createCoachThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ title: z.string().max(120).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("coach_threads")
      .insert({ user_id: context.userId, title: data.title ?? "New conversation" })
      .select("id, title, updated_at")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const renameCoachThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), title: z.string().min(1).max(120) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("coach_threads")
      .update({ title: data.title })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteCoachThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("coach_threads")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export interface SerializableMessage {
  id: string;
  role: "user" | "assistant" | "system" | "data";
  parts: any[];
}

export const getCoachThreadMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ threadId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // RLS makes sure we only get our own
    const { data: msgs } = await context.supabase
      .from("coach_messages")
      .select("id, role, parts, created_at")
      .eq("thread_id", data.threadId)
      .eq("user_id", context.userId)
      .order("created_at", { ascending: true });

    const messages: SerializableMessage[] = (msgs ?? []).map((m) => ({
      id: m.id,
      role: m.role as SerializableMessage["role"],
      parts: (m.parts as any) ?? [],
    }));
    return { messages };
  });

// ── sendCoachMessage ──────────────────────────────────────────────────────────
// Replaces the client-side fetch() that exposed LOVABLE_API_KEY in the bundle.
// All DB reads (resume context, prior messages) happen server-side here.

const CAREER_MODES_LABELS: Record<string, string> = {
  "interview-prep": "Interview Preparation",
  "resume-fix": "Resume Improvement",
  roadmap: "Career Roadmap Planning",
  "job-search": "Job Search Strategy",
};

const SendInput = z.object({
  threadId: z.string().uuid(),
  message: z.string().min(1).max(4000),
  careerMode: z.enum(["interview-prep", "resume-fix", "roadmap", "job-search"]),
});

export const sendCoachMessage = createServerFn({ method: "POST" })
  .middleware([
    requireRateLimit({ bucket: "ai:coach", maxCount: 20, windowSecs: 60 }),
    requireSupabaseAuth,
    requireQuota("coach_messages"),
  ])
  .inputValidator((d: unknown) => SendInput.parse(d))
  .handler(async ({ data, context }) => {
    const startTime = Date.now();
    logger.info(
      { userId: context.userId, threadId: data.threadId, type: "sendCoachMessage_start" },
      "Coach message received",
    );

    // Verify the thread belongs to the user
    const { data: thread } = await context.supabase
      .from("coach_threads")
      .select("id")
      .eq("id", data.threadId)
      .eq("user_id", context.userId)
      .single();
    if (!thread) throw new Error("Thread not found");

    // Fetch resume context server-side (never trust the client to supply it)
    const { data: resume } = await context.supabase
      .from("resume_versions")
      .select("detected_skills, parsed_text, summary")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: matches } = await context.supabase
      .from("job_matches")
      .select("score")
      .eq("user_id", context.userId)
      .order("score", { ascending: false })
      .limit(3);

    const resumeSkills = resume?.detected_skills?.join(", ") ?? "None detected yet";
    const matchSummary =
      matches && matches.length > 0
        ? matches.map((m: any) => `${m.score}% match`).join(", ")
        : "No matches yet";

    // Fetch prior messages for conversation continuity (last 10)
    const { data: priorMsgs } = await context.supabase
      .from("coach_messages")
      .select("role, parts")
      .eq("thread_id", data.threadId)
      .eq("user_id", context.userId)
      .order("created_at", { ascending: true })
      .limit(10);

    const history: { role: "user" | "assistant"; content: string }[] = (priorMsgs ?? [])
      .filter((m: any) => m.role === "user" || m.role === "assistant")
      .map((m: any) => ({
        role: m.role as "user" | "assistant",
        content: m.parts?.[0]?.text ?? "",
      }));

    // ── Prompt injection mitigation ───────────────────────────────────────────
    // Resume text is untrusted user content — it lives in the system prompt only
    // as structured metadata (skills list, short summary). The raw parsed_text
    // is NOT embedded in the system prompt.  INJECTION_GUARD is included so the
    // model ignores any instructions that might appear in the user's message.
    const modeName = CAREER_MODES_LABELS[data.careerMode] ?? data.careerMode;
    const systemPrompt =
      `You are a helpful AI Career Coach specialising in ${modeName}. ` +
      `Be specific, encouraging, and actionable. ` +
      `Candidate's detected skills: ${resumeSkills}. ` +
      `Top job match scores: ${matchSummary}. ` +
      (resume?.summary ? `Candidate summary: ${resume.summary.slice(0, 300)}. ` : "") +
      INJECTION_GUARD;

    // Append the new user message to history for the LLM call
    const messagesForLLM: { role: "user" | "assistant"; content: string }[] = [
      ...history,
      { role: "user", content: sandboxContent("user_message", data.message) },
    ];

    // Save user message to DB before calling LLM
    const { data: userRow, error: userErr } = await context.supabase
      .from("coach_messages")
      .insert({
        thread_id: data.threadId,
        user_id: context.userId,
        role: "user",
        parts: [{ type: "text", text: data.message }],
      })
      .select("id")
      .single();
    if (userErr) throw new Error(userErr.message);

    // Call LLM (server-side — API key never reaches the client)
    const answer = await callChat(systemPrompt, messagesForLLM);
    const responseText =
      answer || "I'm having trouble responding right now. Please try again in a moment.";

    // Save assistant response
    const { data: assistantRow, error: assistantErr } = await context.supabase
      .from("coach_messages")
      .insert({
        thread_id: data.threadId,
        user_id: context.userId,
        role: "assistant",
        parts: [{ type: "text", text: responseText }],
      })
      .select("id")
      .single();
    if (assistantErr) throw new Error(assistantErr.message);

    // Touch the thread updated_at so the sidebar shows recent activity first
    await context.supabase
      .from("coach_threads")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", data.threadId);

    await context.incrementQuota();

    logger.info(
      {
        userId: context.userId,
        threadId: data.threadId,
        type: "sendCoachMessage_success",
        executionTimeMs: Date.now() - startTime,
      },
      "Coach message handled",
    );

    return {
      userMessageId: userRow.id,
      assistantMessageId: assistantRow.id,
      assistantText: responseText,
    };
  });
