import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

function getMockBaseUrl(): string {
  const base = process.env.RESEND_BASE_URL;
  if (!base) {
    throw new Error("RESEND_BASE_URL is not set — run via scripts/run-e2e.mjs (pnpm test:e2e)");
  }
  return base;
}

async function resetMockBucket(testId: string): Promise<void> {
  const base = getMockBaseUrl();
  const res = await fetch(`${base}/__reset?testId=${encodeURIComponent(testId)}`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(`mock /__reset failed: ${res.status}`);
}

const PAGES: Array<{ path: "/profile" | "/contact" }> = [
  { path: "/profile" },
  { path: "/contact" },
];

test.describe("contact form validation-error UX (parameterized)", () => {
  let testId: string;

  test.beforeEach(async ({ page }) => {
    testId = randomUUID();
    await page.addInitScript((id) => {
      (window as unknown as { __TEST_ID: string }).__TEST_ID = id;
    }, testId);
    await resetMockBucket(testId);
  });

  for (const { path } of PAGES) {
    test(`${path} surfaces accessible per-field errors and preserves input`, async ({ page }) => {
      await page.goto(path);

      const form = page.locator("form");
      await expect(form).toBeVisible();

      // Invalid: empty name (min 1), malformed email, too-short message (min 10).
      const nameInput = page.getByLabel("Name", { exact: true });
      const emailInput = page.getByLabel("Email", { exact: true });
      const messageInput = page.getByLabel("Message", { exact: true });

      const badEmail = "not-an-email";
      const shortMessage = "too short";

      await emailInput.fill(badEmail);
      await messageInput.fill(shortMessage);

      await page.getByRole("button", { name: "Send" }).click();

      // Top-level role="alert" validation summary renders with the error copy.
      const summary = page.getByRole("alert").filter({ hasText: "check the fields below" });
      await expect(summary).toBeVisible();

      // Per-field error spans are wired via aria-describedby on each input. Wait
      // for the wiring to land (the validation-error state is set after the
      // 400 round-trip), then assert each input points at a non-empty error span.
      await expect(nameInput).toHaveAttribute("aria-describedby", /.+/);

      for (const input of [nameInput, emailInput, messageInput]) {
        await expect(input).toHaveAttribute("aria-invalid", "true");
        const describedBy = await input.getAttribute("aria-describedby");
        expect(describedBy, "input should be linked to an error element").toBeTruthy();
        const errorSpan = page.locator(`#${describedBy}`);
        await expect(errorSpan).toBeVisible();
        await expect(errorSpan).not.toHaveText("");
      }

      // Focus moves to the FIRST invalid field (name) after the failed submit.
      await expect(nameInput).toBeFocused();

      // Field values are preserved across the failed submit.
      await expect(emailInput).toHaveValue(badEmail);
      await expect(messageInput).toHaveValue(shortMessage);
    });
  }
});
