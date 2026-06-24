import { test as setup, expect } from "@playwright/test";
import { TEST_SEEKER, missingCredentials } from "./helpers/auth";
import path from "path";

const SEEKER_AUTH_FILE = path.join(import.meta.dirname, ".auth", "seeker.json");

setup("authenticate as seeker", async ({ page }) => {
  if (missingCredentials(TEST_SEEKER)) {
    console.warn(
      "E2E_SEEKER_EMAIL / E2E_SEEKER_PASSWORD not set — skipping auth setup.",
    );
    // Write an empty state so dependent tests can still load (they'll fail
    // gracefully if the session is unauthenticated).
    await page.context().storageState({ path: SEEKER_AUTH_FILE });
    return;
  }

  await page.goto("/auth");

  // Select "Sign in" tab if the page has tabs.
  const signInTab = page.getByRole("tab", { name: /sign in/i });
  if (await signInTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await signInTab.click();
  }

  await page.getByLabel(/email/i).fill(TEST_SEEKER.email);
  await page.getByLabel(/password/i).fill(TEST_SEEKER.password);
  await page.getByRole("button", { name: /sign in/i }).click();

  // Wait for successful redirect away from /auth.
  await expect(page).not.toHaveURL(/\/auth/, { timeout: 20_000 });

  await page.context().storageState({ path: SEEKER_AUTH_FILE });
});
