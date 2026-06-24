import { defineConfig, devices } from "@playwright/test";

/**
 * E2E test configuration.
 *
 * Required environment variables (copy .env.e2e.example → .env.e2e):
 *   PLAYWRIGHT_BASE_URL   – app URL (default: http://localhost:3000)
 *   E2E_SEEKER_EMAIL      – pre-created seeker test account email
 *   E2E_SEEKER_PASSWORD   – seeker test account password
 *   E2E_EMPLOYER_EMAIL    – pre-created employer test account email
 *   E2E_EMPLOYER_PASSWORD – employer test account password
 *
 * Run locally:   npx playwright test
 * Run with UI:   npx playwright test --ui
 * Run headed:    npx playwright test --headed
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "html",

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    video: "on-first-retry",
    screenshot: "only-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [
    // Auth setup runs first and saves session state for other tests.
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/seeker.json",
      },
      dependencies: ["setup"],
      testIgnore: /auth\.setup\.ts/,
    },
  ],

  // Start dev server automatically when not in CI.
  webServer: process.env.CI
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
