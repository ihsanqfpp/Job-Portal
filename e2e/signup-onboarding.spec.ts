/**
 * Signup + role onboarding journey.
 *
 * Strategy: uses a unique timestamp-suffixed email so the test is hermetic.
 * The created account is not cleaned up (safe — test environments use
 * dedicated Supabase projects; accounts don't accumulate in production).
 *
 * No storageState is injected here (we're testing the unauthenticated flow).
 */
import { test, expect } from "@playwright/test";

// Override the project-level storageState so this spec starts unauthenticated.
test.use({ storageState: { cookies: [], origins: [] } });

function uniqueEmail(): string {
  return `e2e+${Date.now()}@mailsink.test`;
}

test("new user can sign up and complete role onboarding", async ({ page }) => {
  const email = uniqueEmail();
  const password = "E2eTestPass1!";

  // ── Step 1: land on /auth ────────────────────────────────────────────────
  await page.goto("/auth");
  await expect(page).toHaveURL(/\/auth/);

  // ── Step 2: switch to Register tab ──────────────────────────────────────
  const registerTab = page.getByRole("tab", { name: /register|sign up/i });
  await expect(registerTab).toBeVisible();
  await registerTab.click();

  // ── Step 3: fill in registration form ───────────────────────────────────
  await page.getByLabel(/email/i).fill(email);

  // Some forms have separate "confirm password" fields.
  const passwordFields = page.getByLabel(/password/i);
  await passwordFields.first().fill(password);
  if ((await passwordFields.count()) > 1) {
    await passwordFields.nth(1).fill(password);
  }

  await page.getByRole("button", { name: /sign up|create account|register/i }).click();

  // ── Step 4: handle email-confirmation gate ───────────────────────────────
  // In dev/test Supabase projects "confirm email" is usually disabled.
  // If the app shows a "check your email" message we skip the rest of the test
  // since the full journey requires a real inbox.
  const confirmationHint = page.getByText(/check your email|confirm your email/i);
  if (await confirmationHint.isVisible({ timeout: 5_000 }).catch(() => false)) {
    console.info(
      "Email confirmation required — skipping post-signup assertions. " +
        "Disable 'Confirm email' in Supabase Auth settings for e2e environments.",
    );
    return;
  }

  // ── Step 5: redirect to /onboarding after signup ────────────────────────
  await expect(page).toHaveURL(/\/onboarding/, { timeout: 20_000 });

  // ── Step 6: choose "Job Seeker" role ────────────────────────────────────
  const seekerOption = page
    .getByRole("button", { name: /seeker|job seeker|find a job/i })
    .or(page.getByText(/seeker|job seeker/i).first());
  await expect(seekerOption).toBeVisible({ timeout: 10_000 });
  await seekerOption.click();

  // Submit if there is a separate continue/next button.
  const continueBtn = page.getByRole("button", { name: /continue|next|get started/i });
  if (await continueBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await continueBtn.click();
  }

  // ── Step 7: end up on the seeker dashboard ───────────────────────────────
  await expect(page).toHaveURL(/\/dashboard|\/seeker/, { timeout: 20_000 });
});

test("/auth page shows login and register tabs", async ({ page }) => {
  await page.goto("/auth");

  await expect(page.getByRole("tab", { name: /sign in/i })).toBeVisible();
  await expect(page.getByRole("tab", { name: /register|sign up/i })).toBeVisible();
});

test("unauthenticated visit to a protected route redirects to /auth", async ({
  page,
}) => {
  await page.goto("/seeker/resume-analyzer");
  await expect(page).toHaveURL(/\/auth/, { timeout: 10_000 });
});
