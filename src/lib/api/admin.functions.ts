import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ── shared admin guard ──────────────────────────────────────────────────────
// Re-verifies the caller's role server-side via RPC so we never trust a
// client-supplied role claim.  All admin functions below use this helper.
async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("Forbidden");
}

// ── bootstrapAdmin ───────────────────────────────────────────────────────────
// Promotes the authenticated caller to admin ONLY when no admin exists yet.
// This is an intentional "first-user bootstrap" mechanism for fresh deployments.
// Once any admin row exists the function permanently returns an error, so it
// cannot be exploited on an established deployment.
export const bootstrapAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("user_id", { count: "exact", head: true })
      .eq("role", "admin");

    if ((count ?? 0) > 0) {
      throw new Error("Admin already exists. Ask an existing admin to grant you the role.");
    }

    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: context.userId, role: "admin" });
    if (error) throw new Error(error.message);

    return { ok: true };
  });

// ── seedDemoData ─────────────────────────────────────────────────────────────
// Admin-only. Populates demo companies + jobs when the DB is empty.
export const seedDemoData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    return runSeed(context.userId);
  });

// ── getAdminStats ─────────────────────────────────────────────────────────────
// Returns platform-wide counts visible on the admin dashboard.
// Uses supabaseAdmin so the service-role key never leaves the server.
export const getAdminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [companies, jobs, apps, profiles, pending] = await Promise.all([
      supabaseAdmin.from("companies").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("jobs").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("applications").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("companies")
        .select("id", { count: "exact", head: true })
        .eq("is_approved", false),
    ]);

    return {
      companies: companies.count ?? 0,
      jobs: jobs.count ?? 0,
      apps: apps.count ?? 0,
      users: profiles.count ?? 0,
      pending: pending.count ?? 0,
    };
  });

// ── listAdminUsers ────────────────────────────────────────────────────────────
// Returns all user profiles joined with their roles.
// Uses supabaseAdmin so the query runs with service-role key server-side only;
// the service-role key is never exposed in client-bundled code.
export const listAdminUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id,full_name,email,avatar_url,created_at,location")
        .order("created_at", { ascending: false })
        .limit(200),
      supabaseAdmin.from("user_roles").select("user_id,role"),
    ]);

    const byUser = new Map<string, string[]>();
    (roles ?? []).forEach((r) => {
      const arr = byUser.get(r.user_id) ?? [];
      arr.push(r.role);
      byUser.set(r.user_id, arr);
    });

    return {
      users: (profiles ?? []).map((p) => ({ ...p, roles: byUser.get(p.id) ?? [] })),
    };
  });

// ── listAdminJobs ─────────────────────────────────────────────────────────────
// Returns all jobs regardless of status for admin moderation.
export const listAdminJobs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data } = await supabaseAdmin
      .from("jobs")
      .select(
        "id,title,status,created_at,expires_at,posted_by,companies(name,is_approved)",
      )
      .order("created_at", { ascending: false })
      .limit(200);

    return { jobs: data ?? [] };
  });

// ── listAdminCompanies ────────────────────────────────────────────────────────
// Returns all companies including unapproved ones.
export const listAdminCompanies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data } = await supabaseAdmin
      .from("companies")
      .select("id,name,industry,size,is_approved,created_at,owner_id,logo_url")
      .order("created_at", { ascending: false })
      .limit(200);

    return { companies: data ?? [] };
  });

// ── approveCompany ────────────────────────────────────────────────────────────
// Flips is_approved on a company. Calls the existing SECURITY DEFINER RPC so
// approval logic lives in a single auditable place.
export const approveCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }: any) => {
    await assertAdmin(context);
    const companyId = (data as { companyId: string }).companyId;
    if (!companyId) throw new Error("companyId required");
    const { error } = await context.supabase.rpc("approve_company", {
      _company_id: companyId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ── seed helpers (internal) ───────────────────────────────────────────────────

type Template = {
  title: string;
  category: string;
  type: "full-time" | "remote" | "hybrid";
  level: "entry" | "junior" | "mid" | "senior" | "lead";
  min: number;
  max: number;
  skills: string[];
  desc: string;
  reqs: string[];
};

const COMPANIES = [
  {
    name: "Northwind Labs",
    industry: "Software",
    size: "51-200",
    bio: "We build developer tooling that helps teams ship faster, with a strong emphasis on craft, ergonomics and reliability.",
    culture: ["Remote-friendly", "Engineering-led", "Async-first"],
  },
  {
    name: "Verdant Health",
    industry: "Healthcare",
    size: "201-500",
    bio: "Modern primary care backed by data — improving outcomes for millions of patients across North America.",
    culture: ["Mission-driven", "Hybrid", "Fast-growing"],
  },
  {
    name: "Lumen Studio",
    industry: "Design",
    size: "11-50",
    bio: "A small, senior product design studio working with high-growth startups on brand, product and identity.",
    culture: ["Boutique", "In-person + remote", "Craft-obsessed"],
  },
  {
    name: "Helix Finance",
    industry: "Fintech",
    size: "201-500",
    bio: "Infrastructure for the next generation of consumer banks. Trusted by 40+ regulated institutions.",
    culture: ["High-trust", "Hybrid", "Equity-heavy"],
  },
  {
    name: "Atlas Logistics",
    industry: "Supply Chain",
    size: "500+",
    bio: "Modernising freight and last-mile delivery across the EU with software-defined operations.",
    culture: ["Operations-heavy", "On-site", "Global"],
  },
  {
    name: "Quill & Co.",
    industry: "Media",
    size: "51-200",
    bio: "Independent digital publisher reaching 12M+ monthly readers across business and culture.",
    culture: ["Editorial-led", "Remote-friendly", "Creative"],
  },
  {
    name: "Cumulus AI",
    industry: "AI / ML",
    size: "11-50",
    bio: "Building production-grade retrieval and reasoning infrastructure for enterprise teams.",
    culture: ["Research-driven", "Remote-first", "High-bar"],
  },
  {
    name: "Bright Spark Energy",
    industry: "Climate Tech",
    size: "51-200",
    bio: "Software platform helping utilities forecast and balance grid load as renewables come online.",
    culture: ["Climate-positive", "Hybrid", "Mission-driven"],
  },
] as const;

const TEMPLATES: Template[] = [
  {
    title: "Senior Frontend Engineer",
    category: "engineering",
    type: "full-time",
    level: "senior",
    min: 140000,
    max: 190000,
    skills: ["React", "TypeScript", "Tailwind"],
    desc: "Own the frontend stack of our flagship product. You'll collaborate closely with design and product to ship polished, fast experiences to millions of users.\n\nWe care about typography, motion, and accessibility — not just functionality. Code is reviewed for taste as well as correctness.\n\nThis role reports to our Head of Engineering and works async across three timezones.",
    reqs: [
      "5+ years building production React apps",
      "Strong TypeScript and modern CSS skills",
      "Experience with state management and data fetching at scale",
      "Deep care for performance and accessibility",
      "Comfortable owning features end-to-end",
    ],
  },
  {
    title: "Backend Engineer (Node.js)",
    category: "engineering",
    type: "remote",
    level: "mid",
    min: 110000,
    max: 150000,
    skills: ["Node.js", "PostgreSQL", "AWS"],
    desc: "Design APIs, data models and background jobs that power our core product. You'll work with a small, senior team and have a high degree of autonomy.\n\nOur stack is Node, Postgres, Redis and AWS. We deploy multiple times a day.\n\nWe value clear writing, async communication and pragmatic technical decisions.",
    reqs: [
      "3+ years building Node.js services in production",
      "Strong SQL and data-modelling fundamentals",
      "Experience with queue-based async workflows",
      "Comfort writing tests and operational tooling",
      "Strong written English",
    ],
  },
  {
    title: "Staff Platform Engineer",
    category: "engineering",
    type: "hybrid",
    level: "lead",
    min: 180000,
    max: 240000,
    skills: ["Kubernetes", "Go", "Terraform"],
    desc: "Lead the design of our internal developer platform — from CI/CD to observability to runtime infrastructure.\n\nYou'll set the technical direction, mentor a team of four, and partner with product engineering on developer experience.\n\nThis role is hybrid, 2 days a week in our London office.",
    reqs: [
      "8+ years of infrastructure or platform engineering experience",
      "Deep Kubernetes and IaC expertise",
      "Track record of leading cross-team technical initiatives",
      "Strong written communication and design-doc craft",
      "Production experience with Go or Rust",
    ],
  },
  {
    title: "Mobile Engineer (iOS)",
    category: "engineering",
    type: "remote",
    level: "mid",
    min: 120000,
    max: 160000,
    skills: ["Swift", "SwiftUI", "Combine"],
    desc: "Build the next version of our iOS app, used daily by hundreds of thousands of customers.\n\nYou'll work end-to-end on features, from spec through release.\n\nWe ship weekly and care a lot about polish.",
    reqs: [
      "3+ years shipping production iOS apps",
      "Strong SwiftUI and Combine skills",
      "Experience with offline-first data sync",
      "Eye for animation and interaction detail",
      "Familiarity with App Store release operations",
    ],
  },
  {
    title: "Data Engineer",
    category: "data-analytics",
    type: "remote",
    level: "mid",
    min: 115000,
    max: 155000,
    skills: ["Python", "dbt", "Snowflake"],
    desc: "Build and maintain the data pipelines that power our analytics, ML and reporting surfaces.\n\nYou'll partner with analysts and ML engineers across the company.\n\nOur warehouse is Snowflake; our transformation layer is dbt.",
    reqs: [
      "3+ years building data pipelines in production",
      "Strong Python and SQL skills",
      "Hands-on experience with dbt",
      "Familiarity with data quality and observability tooling",
      "Comfortable owning data contracts with downstream consumers",
    ],
  },
  {
    title: "Engineering Manager",
    category: "engineering",
    type: "full-time",
    level: "lead",
    min: 170000,
    max: 220000,
    skills: ["Leadership", "Mentorship", "Hiring"],
    desc: "Lead a team of 6 engineers building our payments platform.\n\nYou'll own delivery, hiring, growth and technical direction in collaboration with our staff engineers.\n\nWe expect EMs to remain technically credible — you'll spend ~20% of your time in code.",
    reqs: [
      "3+ years managing engineers in a high-growth environment",
      "Track record of growing senior ICs into staff roles",
      "Strong product-engineering partnership instincts",
      "Excellent written communication",
      "Background as a senior IC",
    ],
  },
  {
    title: "Site Reliability Engineer",
    category: "engineering",
    type: "remote",
    level: "senior",
    min: 145000,
    max: 195000,
    skills: ["Kubernetes", "Observability", "Linux"],
    desc: "Own the reliability of our production platform — from on-call rotations to capacity planning to incident response.\n\nYou'll partner with product teams on SLOs and reliability roadmaps.\n\nWe value blameless culture and meaningful automation.",
    reqs: [
      "5+ years of SRE or production engineering experience",
      "Deep Linux and networking fundamentals",
      "Production Kubernetes operations experience",
      "Strong incident-response instincts",
      "Comfort writing production-grade Go or Python",
    ],
  },
  {
    title: "Junior Full-stack Engineer",
    category: "engineering",
    type: "hybrid",
    level: "junior",
    min: 75000,
    max: 95000,
    skills: ["React", "Node.js", "PostgreSQL"],
    desc: "Join a senior engineering team building modern web applications. We pair extensively and you'll grow quickly.\n\nYou'll start by owning small features, with mentorship and code review on everything you ship.\n\nHybrid — 2 days a week in our Berlin office.",
    reqs: [
      "1-2 years of professional engineering experience",
      "Comfortable with JavaScript/TypeScript",
      "Familiarity with SQL databases",
      "Strong written communication",
      "Curious and eager to learn",
    ],
  },
  {
    title: "Senior Product Designer",
    category: "design",
    type: "hybrid",
    level: "senior",
    min: 130000,
    max: 170000,
    skills: ["Figma", "Prototyping", "Design Systems"],
    desc: "Own end-to-end design for one of our two core product surfaces. You'll work closely with product and engineering, and report to our Head of Design.\n\nWe expect strong systems thinking and a high bar for craft.\n\nHybrid in NYC, 3 days a week in-office.",
    reqs: [
      "5+ years of product design experience",
      "Strong portfolio across web and mobile",
      "Experience contributing to a design system",
      "Excellent communication and storytelling",
      "Comfort facilitating workshops and reviews",
    ],
  },
  {
    title: "Brand Designer",
    category: "design",
    type: "remote",
    level: "mid",
    min: 90000,
    max: 120000,
    skills: ["Figma", "Illustration", "Typography"],
    desc: "Shape the visual identity of our brand across product, marketing and editorial surfaces.\n\nYou'll work with a small, senior team of designers and writers.\n\nWe're looking for taste, range and a strong point of view.",
    reqs: [
      "3+ years of brand or visual design experience",
      "Strong portfolio with identity systems",
      "Confidence with type, color and layout",
      "Comfortable presenting work to non-designers",
      "Ability to move fast without losing craft",
    ],
  },
  {
    title: "Design Lead",
    category: "design",
    type: "full-time",
    level: "lead",
    min: 160000,
    max: 210000,
    skills: ["Leadership", "Design Systems", "Strategy"],
    desc: "Lead a team of four designers across product and brand. You'll set the bar for craft and partner with our CPO on roadmap and direction.\n\nThis is a senior IC + manager role — you'll spend 60% of your time in management.",
    reqs: [
      "7+ years of product design experience, 2+ managing",
      "Strong portfolio across consumer and B2B work",
      "Track record of growing designers",
      "Excellent written and verbal communication",
      "Comfort in ambiguous strategic conversations",
    ],
  },
  {
    title: "UX Researcher",
    category: "design",
    type: "remote",
    level: "mid",
    min: 95000,
    max: 130000,
    skills: ["User Research", "Interviews", "Synthesis"],
    desc: "Run generative and evaluative research across our product surfaces.\n\nYou'll partner closely with designers, PMs and engineers and play a key role in product strategy.",
    reqs: [
      "3+ years of applied UX research experience",
      "Strong qualitative methods (interviews, diary studies)",
      "Comfortable running quantitative surveys",
      "Strong written synthesis and storytelling",
      "Track record of shipping research that changes product decisions",
    ],
  },
  {
    title: "Head of Growth",
    category: "marketing",
    type: "full-time",
    level: "lead",
    min: 160000,
    max: 220000,
    skills: ["SEO", "Performance Marketing", "Analytics"],
    desc: "Own growth strategy across acquisition, activation and retention. You'll lead a small team of marketers and partner with product on growth loops.",
    reqs: [
      "7+ years of growth marketing experience, ideally in B2B SaaS",
      "Track record of building scalable acquisition channels",
      "Strong analytical and experimentation fundamentals",
      "Experience managing high-performing marketers",
      "Excellent written communication",
    ],
  },
  {
    title: "Content Marketing Manager",
    category: "marketing",
    type: "remote",
    level: "mid",
    min: 85000,
    max: 115000,
    skills: ["SEO", "Editorial", "Writing"],
    desc: "Own our content engine: long-form articles, customer stories, and our newsletter.\n\nYou'll work with editors, designers and SEO specialists, and report into our Head of Marketing.",
    reqs: [
      "3+ years of content marketing experience in B2B",
      "Strong writer and editor",
      "Hands-on experience with SEO content strategy",
      "Track record of driving measurable inbound demand",
      "Excellent project management",
    ],
  },
  {
    title: "Marketing Operations Lead",
    category: "marketing",
    type: "hybrid",
    level: "senior",
    min: 110000,
    max: 150000,
    skills: ["HubSpot", "Salesforce", "Analytics"],
    desc: "Own our marketing tech stack and reporting. You'll partner with revenue ops, sales and demand gen to make our funnel observable and trustworthy.",
    reqs: [
      "5+ years of marketing operations experience",
      "Deep HubSpot or Marketo expertise",
      "Strong SQL skills",
      "Track record of building scalable lead-routing systems",
      "Comfort presenting reporting to leadership",
    ],
  },
  {
    title: "Account Executive (EMEA)",
    category: "sales",
    type: "remote",
    level: "mid",
    min: 95000,
    max: 140000,
    skills: ["B2B Sales", "Negotiation", "Discovery"],
    desc: "Own the EMEA mid-market segment, working with a 50/50 inbound/outbound pipeline. You'll partner with SDRs, SEs and customer success.\n\nOTE 180-220k.",
    reqs: [
      "3-5 years of B2B SaaS closing experience",
      "Strong discovery and qualification skills",
      "Track record of hitting quota in a quota-carrying role",
      "Excellent written communication",
      "Comfort selling to technical buyers",
    ],
  },
  {
    title: "Sales Engineer",
    category: "sales",
    type: "remote",
    level: "senior",
    min: 140000,
    max: 190000,
    skills: ["Presales", "APIs", "Technical Demos"],
    desc: "Partner with our enterprise sales team on technical discovery, demos, and POCs. You'll be the technical bridge between prospects and our product and engineering teams.",
    reqs: [
      "5+ years in a presales or solutions-engineering role",
      "Strong technical background — comfortable in API docs and code samples",
      "Excellent presentation skills",
      "Track record of unblocking complex enterprise deals",
      "Familiarity with security, compliance and procurement processes",
    ],
  },
  {
    title: "Sales Development Representative",
    category: "sales",
    type: "hybrid",
    level: "entry",
    min: 55000,
    max: 80000,
    skills: ["Outbound", "Prospecting", "CRM"],
    desc: "Generate qualified pipeline for our account executives through outbound prospecting and inbound triage.\n\nThis is a fantastic launchpad role with a clear path into closing within 18 months.",
    reqs: [
      "6-18 months of SDR or BDR experience",
      "Strong written and verbal communication",
      "Track record of consistently hitting activity targets",
      "Comfortable with cold outbound",
      "Coachable and metrics-driven",
    ],
  },
  {
    title: "FP&A Manager",
    category: "finance",
    type: "hybrid",
    level: "senior",
    min: 130000,
    max: 170000,
    skills: ["Modeling", "Forecasting", "SQL"],
    desc: "Own our FP&A function — from board reporting to operating planning to scenario modelling.\n\nYou'll partner with the CEO and CFO directly.",
    reqs: [
      "5+ years of FP&A experience, ideally in a software business",
      "Strong modelling and forecasting craft",
      "Comfortable presenting to executives and board",
      "Working SQL skills",
      "Excellent written communication",
    ],
  },
  {
    title: "Senior Accountant",
    category: "finance",
    type: "remote",
    level: "mid",
    min: 90000,
    max: 120000,
    skills: ["GAAP", "NetSuite", "Close Process"],
    desc: "Own monthly close, audit prep and revenue recognition.\n\nYou'll work in a small, senior finance team reporting into the Controller.",
    reqs: [
      "4+ years of senior accountant or controller-track experience",
      "Strong US GAAP fundamentals",
      "NetSuite experience",
      "Track record of clean audits",
      "Excellent attention to detail",
    ],
  },
];

function logoFor(name: string) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D8ABC&color=fff&size=128&bold=true`;
}

async function runSeed(callerId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { count: existing } = await supabaseAdmin
    .from("jobs")
    .select("id", { count: "exact", head: true });
  if ((existing ?? 0) > 0) return { jobs: existing ?? 0, companies: 0, message: "Already seeded" };

  const ownerIds: string[] = [];
  for (let i = 0; i < COMPANIES.length; i++) {
    const co = COMPANIES[i];
    const email = `employer${i + 1}@hireway-demo.com`;
    let uid: string | undefined;
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: "DemoPass1234!",
      email_confirm: true,
      user_metadata: { full_name: `${co.name} Hiring`, role: "employer" },
    });
    if (error && !error.message.toLowerCase().includes("already")) throw new Error(error.message);
    uid = created?.user?.id;
    if (!uid) {
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
      uid = list?.users.find((u) => u.email === email)?.id;
    }
    if (!uid) continue;
    ownerIds.push(uid);
    await supabaseAdmin.from("companies").insert({
      owner_id: uid,
      name: co.name,
      industry: co.industry,
      size: co.size as never,
      description: co.bio,
      logo_url: logoFor(co.name),
      is_approved: true,
    });
  }

  const { data: companiesRows } = await supabaseAdmin
    .from("companies")
    .select("id, name, owner_id")
    .in("owner_id", ownerIds);
  const byName = new Map((companiesRows ?? []).map((c) => [c.name, c]));

  const locations = [
    "Remote", "New York", "San Francisco", "London",
    "Berlin", "Toronto", "Amsterdam", "Austin",
  ];
  let inserted = 0;
  for (let i = 0; i < TEMPLATES.length; i++) {
    const t = TEMPLATES[i];
    const co = byName.get(COMPANIES[i % COMPANIES.length].name);
    if (!co) continue;
    const fullDesc = `${t.desc}\n\nWhat we're looking for:\n${t.reqs.map((r) => `• ${r}`).join("\n")}`;
    const { error } = await supabaseAdmin.from("jobs").insert({
      company_id: co.id,
      posted_by: co.owner_id,
      title: t.title,
      description: fullDesc,
      location: locations[i % locations.length],
      type: t.type as never,
      category: t.category,
      experience_level: t.level as never,
      salary_min: t.min,
      salary_max: t.max,
      salary_currency: "USD",
      skills_required: t.skills,
      status: "open",
      expires_at: new Date(Date.now() + 60 * 86400000).toISOString(),
      created_at: new Date(Date.now() - (i * 36 + 8) * 3600 * 1000).toISOString(),
    } as never);
    if (!error) inserted++;
  }

  if (callerId) {
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("user_id", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) === 0) {
      await supabaseAdmin.from("user_roles").insert({ user_id: callerId, role: "admin" });
    }
  }

  return { jobs: inserted, companies: ownerIds.length };
}
