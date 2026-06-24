## What's changing

The current app is a two-sided job board. We keep that working but make the **AI seeker SaaS** the hero product. After login, seekers land on a real dashboard (not the marketing site), with Resume Analyzer, Job Matching, Coach, and Tracker as the primary surfaces. Employer/Admin stay reachable via the user menu for users with those roles.

## 1 · Information architecture

**Public**
- `/` — landing (rewritten: "Beat the ATS. Land interviews faster.")
- `/pricing` — Free / Pro / Premium, visual only, "Coming soon" CTAs
- `/about`
- `/auth`, `/reset-password`

**Authenticated seeker app** (under `_authenticated/app/*`)
- `/app` — Dashboard hub: ATS score card, latest analysis, top matches, recent activity
- `/app/resume` — Upload + analyze + version history + downloadable PDF
- `/app/jobs` — Job matcher (semantic ranking)
- `/app/saved` — Saved + tracker (Applied / Interview / Offer / Rejected)
- `/app/coach` — Threaded Career AI Coach
- `/app/coach/$threadId`
- `/app/profile`
- `/app/reports/$shareId` — public shareable ATS report (read-only)

Existing `/seeker/*`, `/employer/*`, `/admin/*` routes stay; the navbar shows an "Open dashboard" button that routes by role.

## 2 · Database additions

```text
resume_versions       id, user_id, file_url, parsed_text, ats_score,
                      missing_keywords[], skill_gaps[],
                      readiness_score, summary, created_at
resume_rewrites       id, version_id, rewritten_bullets jsonb,
                      improved_summary, created_at
job_matches           id, user_id, job_id, score, rationale, created_at
                      (cache for ranked results)
applications          add: stage enum(saved|applied|interview|offer|rejected),
                      add: notes text     (extends existing row)
coach_threads         id, user_id, title, updated_at
coach_messages        id, thread_id, role, parts jsonb, created_at
activity_log          id, user_id, kind, payload jsonb, created_at
shared_reports        id, version_id, slug unique, expires_at
external_jobs         id, source, source_id unique, title, company,
                      location, url, description, posted_at, fetched_at
                      (Remotive cache, RLS: public read)
```

All RLS scoped to `auth.uid()`. Service-role grants for the Remotive fetcher.

## 3 · AI server functions

`src/lib/api/ai.functions.ts` grows to cover:

| Fn | Model | Returns |
|---|---|---|
| `analyzeResume` | `google/gemini-3-flash-preview` + `Output.object` | `{ ats_score, readiness_score, missing_keywords[], skill_gaps[], summary, suggestions[] }` |
| `rewriteResume` | same | `{ improved_summary, bullets: [{ original, improved }] }` |
| `matchJobsForUser` | embedding-free heuristic + LLM tie-break (top 50 → rerank 20) | persisted `job_matches` |
| `coachReply` (streaming) | `streamText` | UIMessage stream |
| `generateShareableSummary` | one-shot | markdown for public report |

All call the Lovable AI Gateway helper at `src/lib/ai-gateway.server.ts`.

## 4 · Remotive job feed

- Server route `src/routes/api/public/jobs.refresh.ts` POSTs to Remotive (`https://remotive.com/api/remote-jobs`), upserts into `external_jobs`. Hardcoded shared secret header to keep it abuse-free.
- `src/lib/api/jobs.functions.ts` server fn returns `external_jobs` merged with internal `jobs`. Matcher works against this union.
- Initial seed runs once from the dashboard ("Refresh feed" button) so the demo always has live data.

## 5 · Career AI Coach (threaded)

- Streaming route at `src/routes/api/chat.ts` using AI SDK `streamText`, system prompt includes the user's latest resume analysis + skills as context.
- `src/routes/_authenticated/app/coach.$threadId.tsx` with AI Elements (`Conversation`, `Message`, `MessageResponse`, `PromptInput`, `Shimmer`). Sidebar with thread list + "New chat".
- Messages persisted to `coach_messages` in `onFinish`. Auth scoped via `requireSupabaseAuth`.

I'll install AI Elements: `bun x ai-elements@latest add conversation message prompt-input shimmer`.

## 6 · UI/UX direction

- Dark mode default (toggle stays), animated radial gradient on dashboard hero, glassmorphic cards using `bg-card/60 backdrop-blur-xl border-white/5`.
- Framer Motion page transitions on `/app/*` (`bun add framer-motion`).
- Skeletons everywhere AI is loading; toasts for AI errors (429/402 surfaced clearly).
- New `<AppShell>` with left sidebar (Dashboard, Resume, Jobs, Saved, Coach, Profile) + top bar (search, theme, user menu).
- New brand mark for Coach (not Sparkles) — generate a small geometric logo asset.

## 7 · Portfolio polish

- Resume version history list with diff view (original vs improved).
- "Download optimized PDF" — client-side `@react-pdf/renderer`.
- Shareable report: `/app/reports/$shareId` reads from `shared_reports` (public RLS), renders without auth, OG tags include the user's ATS score.
- Activity timeline on dashboard reads from `activity_log` (uploaded resume, applied to job, etc.).
- "Improve again" button reruns `rewriteResume` against the latest version.

## 8 · What stays the same

- Employer dashboard, admin tools, job posting, application inbox — untouched, just demoted in nav.
- Existing seeder, Google auth, profile management, role gating.

## Technical notes

- New deps: `framer-motion`, `@react-pdf/renderer`, AI Elements components.
- Server fns live in `src/lib/api/*.functions.ts`; helpers in `*.server.ts`. AI helper reads `LOVABLE_API_KEY` inside handler only.
- Migration order: tables → grants → RLS → policies → triggers, all in one migration call.
- Public report route is a top-level public route (not under `_authenticated/`) for shareability + OG tags.
- Auth-gated coach chat lives under `_authenticated/app/`, integration-managed layout handles the gate.

## Execution order

1. Migration (new tables + RLS + grants).
2. Install deps + AI Elements.
3. AI gateway helper + server fns (`analyze`, `rewrite`, `match`, `coach`, `share`).
4. Remotive fetcher + jobs union fn.
5. `<AppShell>` + new routes under `/app/*`.
6. Landing + pricing + about rewrites.
7. Coach streaming route + threaded UI.
8. PDF export, shareable report, activity timeline.
9. Visual polish pass (gradient, motion, glass cards, brand mark).

Reply "go" to start, or tell me what to adjust.