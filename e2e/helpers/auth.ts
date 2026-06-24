import type { Page } from "@playwright/test";

export const TEST_SEEKER = {
  email: process.env.E2E_SEEKER_EMAIL ?? "",
  password: process.env.E2E_SEEKER_PASSWORD ?? "",
};

export const TEST_EMPLOYER = {
  email: process.env.E2E_EMPLOYER_EMAIL ?? "",
  password: process.env.E2E_EMPLOYER_PASSWORD ?? "",
};

/** Returns true when required credentials are absent — use to skip tests. */
export function missingCredentials(
  creds: { email: string; password: string } = TEST_SEEKER,
): boolean {
  return !creds.email || !creds.password;
}

/**
 * Log in via the /auth page and wait for the redirect to complete.
 * This is the real Supabase email+password flow; no mocking.
 */
export async function loginAs(
  page: Page,
  creds: { email: string; password: string },
): Promise<void> {
  await page.goto("/auth");

  // Ensure we're on the Sign in tab, not Register.
  const signInTab = page.getByRole("tab", { name: /sign in/i });
  if (await signInTab.isVisible()) await signInTab.click();

  await page.getByLabel(/email/i).fill(creds.email);
  await page.getByLabel(/password/i).fill(creds.password);
  await page.getByRole("button", { name: /sign in/i }).click();

  // Wait until we leave /auth (redirect to /dashboard, /employer, or /onboarding).
  await page.waitForURL(
    (url) => !url.pathname.startsWith("/auth"),
    { timeout: 20_000 },
  );
}

/** Navigate to /auth and sign out if already logged in. */
export async function ensureLoggedOut(page: Page): Promise<void> {
  await page.goto("/");
  const logoutBtn = page.getByRole("button", { name: /log out|sign out/i });
  if (await logoutBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await logoutBtn.click();
    await page.waitForURL("/auth", { timeout: 10_000 });
  }
}
