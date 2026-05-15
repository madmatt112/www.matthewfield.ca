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

test.describe("contact form reduced-motion compliance", () => {
  let testId: string;

  test.beforeEach(async ({ page }) => {
    testId = randomUUID();
    // emulateMedia BEFORE navigation — Playwright will not re-emit
    // match-media events to a page that has already loaded.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript((id) => {
      (window as unknown as { __TEST_ID: string }).__TEST_ID = id;
    }, testId);
    await resetMockBucket(testId);
  });

  test("submits without smooth-scroll and without animating the status region", async ({
    page,
  }) => {
    await page.goto("/contact");

    await page.getByLabel("Name", { exact: true }).fill("Reduced Motion Tester");
    await page.getByLabel("Email", { exact: true }).fill("rm@example.com");
    await page
      .getByLabel("Message", { exact: true })
      .fill("Reduced-motion submission with at least ten characters.");

    await page.getByRole("button", { name: "Send" }).click();

    const successHeading = page.getByRole("heading", {
      name: "Thanks — your message is on its way.",
    });
    await expect(successHeading).toBeVisible();

    // Smooth-scroll assertion: capture the heading's viewport top now and
    // again 50ms later. With reduced-motion, the scrollIntoView call uses
    // behavior:'auto' (instant) — any change beyond sub-pixel jitter means
    // a smooth-scroll animation is still in flight.
    const top1 = await successHeading.evaluate((el) => el.getBoundingClientRect().top);
    await page.waitForTimeout(50);
    const top2 = await successHeading.evaluate((el) => el.getBoundingClientRect().top);
    expect(Math.abs(top2 - top1)).toBeLessThan(1);

    // Animation-name assertion: the role=status success region must not
    // have a CSS animation. The literal expected value is 'none' — an
    // empty string is NOT acceptable (different computed-style semantics).
    const statusRegion = page.locator("main").locator('[role="status"]').first();
    await expect(statusRegion).toBeVisible();
    const animationName = await statusRegion.evaluate(
      (el) => window.getComputedStyle(el).animationName,
    );
    expect(animationName).toBe("none");
  });
});
