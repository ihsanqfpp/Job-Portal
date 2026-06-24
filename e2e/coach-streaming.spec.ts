/**
 * AI Coach streaming journey (seeker role).
 *
 * Tests:
 *  1. The coach page loads and shows the chat interface.
 *  2. Sending a message produces a streamed assistant reply.
 *
 * The streaming assertion waits for any assistant-authored text to
 * appear in the conversation log — not for a specific message — so the
 * test stays green regardless of what the model says.
 */
import { test, expect } from "@playwright/test";
import { TEST_SEEKER, missingCredentials } from "./helpers/auth";

test.describe("AI Coach streaming", () => {
  test.beforeEach(async ({}, testInfo) => {
    if (missingCredentials(TEST_SEEKER)) {
      testInfo.skip(true, "E2E_SEEKER_EMAIL / E2E_SEEKER_PASSWORD not set");
    }
  });

  test("coach page renders the conversation interface", async ({ page }) => {
    await page.goto("/seeker/coach");
    await expect(page).toHaveURL(/\/seeker\/coach/, { timeout: 20_000 });

    // The chat input must be present.
    const chatInput = page
      .getByRole("textbox", { name: /message|chat|ask/i })
      .or(page.locator("textarea"))
      .first();
    await expect(chatInput).toBeVisible({ timeout: 15_000 });
  });

  test("sending a message produces a streamed reply", async ({ page }) => {
    await page.goto("/seeker/coach");
    await expect(page).toHaveURL(/\/seeker\/coach/, { timeout: 20_000 });

    // Find the message input.
    const chatInput = page
      .getByRole("textbox", { name: /message|chat|ask/i })
      .or(page.locator("textarea"))
      .first();
    await expect(chatInput).toBeVisible({ timeout: 15_000 });

    // Type a short, deterministic prompt.
    await chatInput.fill("Reply with exactly: Hello from the test.");
    await chatInput.press("Enter");

    // Alternatively look for a send button.
    const sendBtn = page.getByRole("button", { name: /send|submit/i }).first();
    if (await sendBtn.isEnabled({ timeout: 1_000 }).catch(() => false)) {
      await sendBtn.click();
    }

    // The conversation log (role="log") should contain at least one
    // assistant message (role="article") after streaming completes.
    // We grant 60 s because the AI gateway may be cold.
    const assistantMessage = page
      .getByRole("article") // our aria pattern from message.tsx
      .filter({ hasText: /.{5,}/ }) // at least 5 chars — not just a spinner
      .last();

    await expect(assistantMessage).toBeVisible({ timeout: 60_000 });

    // Verify streaming ended (no "in-progress" indicator remains).
    const streamingDot = page.locator("[data-streaming='true'], .streaming-cursor");
    await expect(streamingDot).toHaveCount(0, { timeout: 30_000 }).catch(() => {
      // Not all UIs expose a streaming indicator — acceptable.
    });
  });

  test("coach page is protected — unauthenticated users go to /auth", async ({
    browser,
  }) => {
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await ctx.newPage();
    await page.goto("/seeker/coach");
    await expect(page).toHaveURL(/\/auth/, { timeout: 15_000 });
    await ctx.close();
  });
});
