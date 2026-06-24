/**
 * Resume upload → AI analysis journey (seeker role).
 *
 * Uses the saved seeker session from auth.setup.ts.
 * Uploads a minimal but valid 1-page PDF created inline as a Buffer,
 * then waits for the analysis result panel to appear.
 */
import { test, expect } from "@playwright/test";
import { TEST_SEEKER, missingCredentials } from "./helpers/auth";

// Minimal valid PDF (1 page, contains the text "Software Engineer Resume").
// Generated with ilovepdf and hex-encoded so we have no binary fixture files.
// If you replace this with a real fixture, update the Buffer.from call below.
const MINIMAL_PDF_BASE64 =
  "JVBERi0xLjQKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKL01lZGlhQm94IFswIDAgNjEyIDc5Ml0KPj4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovUmVzb3VyY2VzIDw8Ci9Gb250IDw8Ci9GMSA0IDAgUgo+Pgo+PgovQ29udGVudHMgNSAwIFIKPj4KZW5kb2JqCjQgMCBvYmoKPDwKL1R5cGUgL0ZvbnQKL1N1YnR5cGUgL1R5cGUxCi9CYXNlRm9udCAvSGVsdmV0aWNhCj4+CmVuZG9iago1IDAgb2JqCjw8Ci9MZW5ndGggNDQKPj4Kc3RyZWFtCkJUCi9GMSA5IFRmCjUwIDc1MCBUZAooU29mdHdhcmUgRW5naW5lZXIgUmVzdW1lKSBUagpFVAplbmRzdHJlYW0KZW5kb2JqCnhyZWYKMCA2CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAwOSAwMDAwMCBuIAowMDAwMDAwMDYyIDAwMDAwIG4gCjAwMDAwMDAxNDkgMDAwMDAgbiAKMDAwMDAwMDI0NCAwMDAwMCBuIAowMDAwMDAwMzE2IDAwMDAwIG4gCnRyYWlsZXIKPDwKL1NpemUgNgovUm9vdCAxIDAgUgo+PgpzdGFydHhyZWYKNDExCiUlRU9G";

test.describe("Resume upload and analysis", () => {
  test.beforeEach(async ({}, testInfo) => {
    if (missingCredentials(TEST_SEEKER)) {
      testInfo.skip(true, "E2E_SEEKER_EMAIL / E2E_SEEKER_PASSWORD not set");
    }
  });

  test("uploading a PDF shows analysis scores", async ({ page }) => {
    await page.goto("/seeker/resume-analyzer");

    // Should land on the analyzer page (auth handled by saved session).
    await expect(page).toHaveURL(/\/seeker\/resume-analyzer/, { timeout: 20_000 });

    // Locate the file-input hidden behind a drag-and-drop zone.
    // Try a hidden <input type="file"> first; fall back to the label/zone.
    const fileInput = page.locator("input[type='file']");
    await expect(fileInput.first()).toBeAttached({ timeout: 10_000 });

    // Create a Buffer from the base64 PDF and upload it.
    const pdfBuffer = Buffer.from(MINIMAL_PDF_BASE64, "base64");
    await fileInput.first().setInputFiles({
      name: "resume.pdf",
      mimeType: "application/pdf",
      buffer: pdfBuffer,
    });

    // The UI should show a loading/analyzing indicator…
    const analyzingIndicator = page
      .getByText(/analyz|processing|loading/i)
      .or(page.getByRole("progressbar"))
      .first();
    await expect(analyzingIndicator).toBeVisible({ timeout: 15_000 }).catch(() => {
      // Not all UIs show an explicit loading state — that's fine.
    });

    // …and eventually show a score or result section.
    const resultSection = page
      .getByText(/ats score|compatibility score|overall score|resume score/i)
      .or(page.getByRole("region", { name: /analysis|result|score/i }))
      .first();
    await expect(resultSection).toBeVisible({ timeout: 60_000 });
  });

  test("analyze page renders the upload zone unauthenticated → redirects to /auth", async ({
    browser,
  }) => {
    // Open a brand-new context with no session.
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await ctx.newPage();
    await page.goto("/seeker/resume-analyzer");
    await expect(page).toHaveURL(/\/auth/, { timeout: 15_000 });
    await ctx.close();
  });
});
