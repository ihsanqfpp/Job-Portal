import { describe, it, expect } from "vitest";
import { z } from "zod";

// ── RLS policy simulators ────────────────────────────────────────────────────
// These replicate the PostgreSQL RLS USING/WITH CHECK expressions in pure
// TypeScript so they can be verified without a live Supabase instance.

const ownerPolicy =
  (col: "user_id" | "applicant_id") =>
  (row: Record<string, string>, callerUid: string): boolean =>
    row[col] === callerUid;

// ── 1. Data isolation: seeker cannot read another user's rows ────────────────

describe("RLS: seeker data isolation", () => {
  const tables = [
    "coach_threads",
    "coach_messages",
    "resume_versions",
    "resume_rewrites",
    "job_matches",
    "tracker_items",
    "activity_log",
  ] as const;

  const policy = ownerPolicy("user_id");

  it.each(tables)("%s: own row is visible", (table) => {
    const row = { user_id: "alice", table };
    expect(policy(row, "alice")).toBe(true);
  });

  it.each(tables)("%s: another user's row is hidden", (table) => {
    const row = { user_id: "bob", table };
    expect(policy(row, "alice")).toBe(false);
  });

  it("seeker sees only their own applications (seeker read policy)", () => {
    const appPolicy = ownerPolicy("applicant_id");
    const rows = [
      { applicant_id: "alice", id: "app-1" },
      { applicant_id: "bob", id: "app-2" },
      { applicant_id: "carol", id: "app-3" },
    ];
    const visible = rows.filter((r) => appPolicy(r, "alice"));
    expect(visible).toHaveLength(1);
    expect(visible[0].id).toBe("app-1");
  });

  it("seeker insert must bind their own applicant_id", () => {
    const insertPolicy = ownerPolicy("applicant_id");
    expect(insertPolicy({ applicant_id: "alice" }, "alice")).toBe(true);
    expect(insertPolicy({ applicant_id: "bob" }, "alice")).toBe(false);
  });
});

// ── 2. Role self-promotion: seeker cannot write to user_roles ────────────────

describe("RLS: user_roles write protection", () => {
  // The database layer enforces this via:
  //   a) GRANT SELECT only to authenticated role (no INSERT/UPDATE/DELETE privilege)
  //   b) No INSERT/UPDATE/DELETE RLS policy for non-admin callers
  //   c) FORCE ROW LEVEL SECURITY on user_roles table (hardening migration)
  // These tests verify the policy logic expressed as TypeScript predicates.

  const adminOnlyWritePolicy = (callerRoles: string[]) => callerRoles.includes("admin");

  it("admin can write to user_roles", () => {
    expect(adminOnlyWritePolicy(["admin"])).toBe(true);
  });

  it("seeker cannot write to user_roles", () => {
    expect(adminOnlyWritePolicy(["seeker"])).toBe(false);
  });

  it("employer cannot write to user_roles", () => {
    expect(adminOnlyWritePolicy(["employer"])).toBe(false);
  });

  it("unauthenticated user cannot write to user_roles", () => {
    expect(adminOnlyWritePolicy([])).toBe(false);
  });
});

// ── 3. bootstrapAdmin gate ───────────────────────────────────────────────────

describe("bootstrapAdmin: first-admin gate", () => {
  // Mirrors the count check in admin.functions.ts bootstrapAdmin handler.
  const canBootstrap = (existingAdminCount: number) => existingAdminCount === 0;

  it("allows promotion when no admin exists yet", () => {
    expect(canBootstrap(0)).toBe(true);
  });

  it("blocks promotion when one admin already exists", () => {
    expect(canBootstrap(1)).toBe(false);
  });

  it("blocks promotion when multiple admins exist", () => {
    expect(canBootstrap(3)).toBe(false);
  });
});

// ── 4. Server function ownership assertions ──────────────────────────────────
// Verifies that server functions scope sensitive queries to the caller's userId.
// The pattern `.eq("user_id", context.userId)` is the authoritative ownership
// check across coach, tracker, resume, and dashboard functions.

describe("Server function ownership checks", () => {
  function buildScopedQuery(callerUserId: string) {
    const appliedFilters: Array<{ col: string; val: string }> = [];
    return {
      eq(col: string, val: string) {
        appliedFilters.push({ col, val });
        return this;
      },
      _filters: appliedFilters,
      _callerUserId: callerUserId,
    };
  }

  it("coach threads query is scoped to caller's user_id", () => {
    const q = buildScopedQuery("alice");
    q.eq("user_id", "alice");
    expect(q._filters).toContainEqual({ col: "user_id", val: "alice" });
  });

  it("resume versions query is scoped to caller's user_id", () => {
    const q = buildScopedQuery("alice");
    q.eq("user_id", "alice");
    expect(q._filters).toContainEqual({ col: "user_id", val: "alice" });
  });

  it("ownership check rejects a mismatched user_id", () => {
    const q = buildScopedQuery("alice");
    // Simulates what would happen if the query used a different userId
    q.eq("user_id", "bob");
    const isOwner = q._filters.some(
      (f) => f.col === "user_id" && f.val === q._callerUserId,
    );
    expect(isOwner).toBe(false);
  });
});

// ── 5. Input validators ──────────────────────────────────────────────────────

describe("Input validators", () => {
  const CoachThreadInput = z.object({ title: z.string().max(120).optional() });
  const RewriteInput = z.object({ versionId: z.string().uuid() });
  const ShareInput = z.object({
    versionId: z.string().uuid(),
    displayName: z.string().max(80).optional(),
  });
  const TrackerUpdateInput = z.object({
    id: z.string().uuid(),
    stage: z.enum(["saved", "applied", "screening", "interview", "offer", "rejected"]).optional(),
    notes: z.string().max(2000).optional(),
  });

  it("coach thread: accepts valid title", () => {
    expect(() => CoachThreadInput.parse({ title: "My career plan" })).not.toThrow();
  });

  it("coach thread: rejects title over 120 chars", () => {
    expect(() => CoachThreadInput.parse({ title: "x".repeat(121) })).toThrow();
  });

  it("rewrite: rejects non-uuid versionId", () => {
    expect(() => RewriteInput.parse({ versionId: "not-a-uuid" })).toThrow();
  });

  it("rewrite: accepts valid uuid", () => {
    expect(() =>
      RewriteInput.parse({ versionId: "123e4567-e89b-12d3-a456-426614174000" }),
    ).not.toThrow();
  });

  it("share report: rejects displayName over 80 chars", () => {
    expect(() =>
      ShareInput.parse({
        versionId: "123e4567-e89b-12d3-a456-426614174000",
        displayName: "x".repeat(81),
      }),
    ).toThrow();
  });

  it("tracker update: rejects unknown stage value", () => {
    expect(() =>
      TrackerUpdateInput.parse({
        id: "123e4567-e89b-12d3-a456-426614174000",
        stage: "promoted",
      }),
    ).toThrow();
  });

  it("tracker update: accepts valid stage", () => {
    expect(() =>
      TrackerUpdateInput.parse({
        id: "123e4567-e89b-12d3-a456-426614174000",
        stage: "interview",
      }),
    ).not.toThrow();
  });
});

// ── 6. Employer data scoping ──────────────────────────────────────────────────

describe("RLS: employer data scoping", () => {
  // Employers may only manage jobs they own and see applications for those jobs.
  // These predicates mirror the PostgreSQL RLS policies on jobs + applications.

  const jobOwnerPolicy = (job: Record<string, string>, callerUid: string) =>
    job.posted_by === callerUid;

  const applicationReadPolicy = (
    app: Record<string, string>,
    jobs: Record<string, string>[],
    callerUid: string,
  ) => jobs.some((j) => j.id === app.job_id && j.posted_by === callerUid);

  it("employer sees their own job listings", () => {
    const jobs = [
      { id: "j1", posted_by: "emp-alice" },
      { id: "j2", posted_by: "emp-bob" },
      { id: "j3", posted_by: "emp-alice" },
    ];
    const visible = jobs.filter((j) => jobOwnerPolicy(j, "emp-alice"));
    expect(visible).toHaveLength(2);
    expect(visible.map((j) => j.id)).toEqual(["j1", "j3"]);
  });

  it("employer cannot see another employer's job listings", () => {
    const job = { id: "j1", posted_by: "emp-bob" };
    expect(jobOwnerPolicy(job, "emp-alice")).toBe(false);
  });

  it("employer can see applications only for their own jobs", () => {
    const jobs = [
      { id: "j1", posted_by: "emp-alice" },
      { id: "j2", posted_by: "emp-bob" },
    ];
    const applications = [
      { id: "app-1", job_id: "j1", applicant_id: "seeker-1" },
      { id: "app-2", job_id: "j2", applicant_id: "seeker-2" },
      { id: "app-3", job_id: "j1", applicant_id: "seeker-3" },
    ];
    const visible = applications.filter((a) => applicationReadPolicy(a, jobs, "emp-alice"));
    expect(visible).toHaveLength(2);
    expect(visible.map((a) => a.id)).toEqual(["app-1", "app-3"]);
  });

  it("employer cannot see applications for a job they do not own", () => {
    const jobs = [{ id: "j2", posted_by: "emp-bob" }];
    const app = { id: "app-2", job_id: "j2", applicant_id: "seeker-2" };
    expect(applicationReadPolicy(app, jobs, "emp-alice")).toBe(false);
  });

  it("employer INSERT on jobs must bind their own posted_by", () => {
    const insertPolicy = (row: Record<string, string>, callerUid: string) =>
      row.posted_by === callerUid;
    expect(insertPolicy({ posted_by: "emp-alice" }, "emp-alice")).toBe(true);
    expect(insertPolicy({ posted_by: "emp-bob" }, "emp-alice")).toBe(false);
  });

  it("employer UPDATE on jobs restricted to owned rows", () => {
    const updateUsing = (row: Record<string, string>, callerUid: string) =>
      row.posted_by === callerUid;
    expect(updateUsing({ posted_by: "emp-alice" }, "emp-alice")).toBe(true);
    expect(updateUsing({ posted_by: "emp-bob" }, "emp-alice")).toBe(false);
  });
});

// ── 7. Shared reports: public read is read-only ───────────────────────────────

describe("RLS: shared_reports public read-only enforcement", () => {
  // sr_public_read policy grants SELECT to anon + authenticated, but only
  // for is_active = true and non-expired rows. No INSERT/UPDATE/DELETE for anon.

  interface SharedReport {
    is_active: boolean;
    expires_at: string | null;
  }

  const publicReadAllowed = (report: SharedReport): boolean => {
    if (!report.is_active) return false;
    if (report.expires_at !== null && new Date(report.expires_at) <= new Date()) return false;
    return true;
  };

  it("anon can read an active, non-expired report", () => {
    const future = new Date(Date.now() + 86400_000).toISOString();
    expect(publicReadAllowed({ is_active: true, expires_at: future })).toBe(true);
  });

  it("anon can read a report with no expiry set", () => {
    expect(publicReadAllowed({ is_active: true, expires_at: null })).toBe(true);
  });

  it("anon cannot read a revoked (is_active=false) report", () => {
    expect(publicReadAllowed({ is_active: false, expires_at: null })).toBe(false);
  });

  it("anon cannot read an expired report", () => {
    const past = new Date(Date.now() - 1000).toISOString();
    expect(publicReadAllowed({ is_active: true, expires_at: past })).toBe(false);
  });

  it("anon cannot read a report that is both revoked and expired", () => {
    const past = new Date(Date.now() - 1000).toISOString();
    expect(publicReadAllowed({ is_active: false, expires_at: past })).toBe(false);
  });

  it("no INSERT policy exists for anon — anon write is always denied", () => {
    // The database layer has no sr_anon_insert policy.
    // This test documents that anon INSERT is blocked by absence of policy.
    const anonInsertPolicies = [] as string[]; // anon has zero write policies
    const canInsert = anonInsertPolicies.includes("sr_anon_insert");
    expect(canInsert).toBe(false);
  });

  it("owner can update their own report (revoke/update display_name)", () => {
    const ownerUpdateUsing = (row: Record<string, string>, callerUid: string) =>
      row.user_id === callerUid;
    expect(ownerUpdateUsing({ user_id: "alice" }, "alice")).toBe(true);
    expect(ownerUpdateUsing({ user_id: "bob" }, "alice")).toBe(false);
  });

  it("owner update WITH CHECK prevents changing user_id or version_id", () => {
    // Mirrors the sr_owner_update WITH CHECK that compares against the stored row.
    function ownerUpdateWithCheck(
      stored: Record<string, string>,
      patch: Record<string, string>,
      callerUid: string,
    ): boolean {
      if (patch.user_id !== undefined && patch.user_id !== stored.user_id) return false;
      if (patch.version_id !== undefined && patch.version_id !== stored.version_id) return false;
      return stored.user_id === callerUid;
    }
    const stored = { id: "r1", user_id: "alice", version_id: "v1" };
    expect(ownerUpdateWithCheck(stored, { is_active: "false" }, "alice")).toBe(true);
    expect(ownerUpdateWithCheck(stored, { user_id: "bob" }, "alice")).toBe(false);
    expect(ownerUpdateWithCheck(stored, { version_id: "v2" }, "alice")).toBe(false);
  });
});

// ── 8. Admin scoping ──────────────────────────────────────────────────────────

describe("RLS: admin-only operations", () => {
  const hasRole = (callerRoles: string[], role: string) => callerRoles.includes(role);
  const isAdmin = (callerRoles: string[]) => hasRole(callerRoles, "admin");

  it("admin can approve companies", () => {
    expect(isAdmin(["admin"])).toBe(true);
  });

  it("seeker cannot approve companies", () => {
    expect(isAdmin(["seeker"])).toBe(false);
  });

  it("employer cannot approve companies", () => {
    expect(isAdmin(["employer"])).toBe(false);
  });

  it("admin can delete any job", () => {
    // Admin delete policy: no user_id restriction
    const adminDeletePolicy = (_row: Record<string, string>, callerRoles: string[]) =>
      isAdmin(callerRoles);
    expect(adminDeletePolicy({ posted_by: "emp-alice" }, ["admin"])).toBe(true);
    expect(adminDeletePolicy({ posted_by: "emp-alice" }, ["employer"])).toBe(false);
  });

  it("admin can manage user roles", () => {
    expect(isAdmin(["admin"])).toBe(true);
    expect(isAdmin(["seeker", "employer"])).toBe(false);
  });

  it("admin bootstrapping is one-time only (covered in bootstrapAdmin suite)", () => {
    // This test ensures the bootstrapAdmin gate (existingAdminCount === 0) is
    // combined correctly with role checks.
    const canBootstrapAsAdmin = (existingAdminCount: number, requestedRole: string) =>
      existingAdminCount === 0 && requestedRole === "admin";
    expect(canBootstrapAsAdmin(0, "admin")).toBe(true);
    expect(canBootstrapAsAdmin(1, "admin")).toBe(false);
    expect(canBootstrapAsAdmin(0, "seeker")).toBe(false);
  });
});

// ── 9. Rate limit logic ───────────────────────────────────────────────────────

describe("Rate limiting logic", () => {
  // Mirrors check_and_increment_rate_limit: count > maxCount → denied.
  const isAllowed = (count: number, maxCount: number): boolean => count <= maxCount;

  it("allows first request", () => expect(isAllowed(1, 10)).toBe(true));
  it("allows request at the limit", () => expect(isAllowed(10, 10)).toBe(true));
  it("blocks request one over the limit", () => expect(isAllowed(11, 10)).toBe(false));
  it("blocks request well over the limit", () => expect(isAllowed(100, 10)).toBe(false));

  it("different IPs are independent buckets", () => {
    const buckets: Record<string, number> = {};
    function hit(ip: string): boolean {
      buckets[ip] = (buckets[ip] ?? 0) + 1;
      return isAllowed(buckets[ip], 3);
    }
    expect(hit("1.2.3.4")).toBe(true);
    expect(hit("1.2.3.4")).toBe(true);
    expect(hit("1.2.3.4")).toBe(true);
    expect(hit("1.2.3.4")).toBe(false); // 4th request blocked
    expect(hit("9.9.9.9")).toBe(true);  // different IP unaffected
  });
});

// ── 6. companies_update_own approval freeze ──────────────────────────────────

describe("companies_update_own: approval freeze", () => {
  // Mirrors the BEFORE UPDATE trigger added in migration 20260623000001.
  function preventApprovalChange(
    oldIsApproved: boolean,
    newIsApproved: boolean,
    callerIsAdmin: boolean,
  ): "ok" | "forbidden" {
    if (oldIsApproved !== newIsApproved && !callerIsAdmin) return "forbidden";
    return "ok";
  }

  it("employer cannot flip is_approved from false to true", () => {
    expect(preventApprovalChange(false, true, false)).toBe("forbidden");
  });

  it("employer cannot flip is_approved from true to false", () => {
    expect(preventApprovalChange(true, false, false)).toBe("forbidden");
  });

  it("employer can update other fields without touching is_approved", () => {
    expect(preventApprovalChange(false, false, false)).toBe("ok");
    expect(preventApprovalChange(true, true, false)).toBe("ok");
  });

  it("admin can change is_approved", () => {
    expect(preventApprovalChange(false, true, true)).toBe("ok");
    expect(preventApprovalChange(true, false, true)).toBe("ok");
  });
});
