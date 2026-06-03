import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

function getMockBaseUrl(): string {
  const base = process.env.RESEND_BASE_URL;
  if (!base) {
    throw new Error("RESEND_BASE_URL is not set — run via scripts/run-e2e.mjs (pnpm test:e2e)");
  }
  return base;
}

type MockCall = { testId: string; body: Record<string, unknown> };

async function fetchMockState(testId: string): Promise<{ calls: MockCall[] }> {
  const base = getMockBaseUrl();
  const res = await fetch(`${base}/__state?testId=${encodeURIComponent(testId)}`);
  if (!res.ok) throw new Error(`mock /__state failed: ${res.status}`);
  return (await res.json()) as { calls: MockCall[] };
}

async function resetMockBucket(testId: string): Promise<void> {
  const base = getMockBaseUrl();
  const res = await fetch(`${base}/__reset?testId=${encodeURIComponent(testId)}`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(`mock /__reset failed: ${res.status}`);
}

test.describe("contact form submit mechanism", () => {
  let testId: string;

  test.beforeEach(async ({ page }) => {
    testId = randomUUID();
    await page.addInitScript((id) => {
      (window as unknown as { __TEST_ID: string }).__TEST_ID = id;
    }, testId);
    await resetMockBucket(testId);
  });

  test("Enter-key from a text field submits exactly one email (Req 4.5)", async ({ page }) => {
    await page.goto("/contact");

    const name = page.getByLabel("Name", { exact: true });
    await name.fill("Test Human");
    await page.getByLabel("Email", { exact: true }).fill("tester@example.com");
    await page
      .getByLabel("Message", { exact: true })
      .fill("Enter-key submission should send exactly one email message.");

    // Submit via Enter from within a text field, not by clicking the button.
    await name.focus();
    await name.press("Enter");

    await expect(
      page.getByRole("heading", { name: "Thanks — your message is on its way." }),
    ).toBeVisible();

    // Exactly one POST: Enter submits, and the inFlightRef latch prevents a double-fire.
    const state = await fetchMockState(testId);
    expect(state.calls).toHaveLength(1);
  });

  test("submit goes through the JS fetch pipeline, not a native navigation (Req 4.9)", async ({
    page,
  }) => {
    await page.goto("/contact");

    // A native form submit would navigate the frame; a JS fetch submit will not.
    let navigatedAfterSubmit = false;
    let submitStarted = false;
    page.on("framenavigated", (frame) => {
      if (submitStarted && frame === page.mainFrame()) navigatedAfterSubmit = true;
    });

    // The <form> must have no action attribute — a native submit would otherwise post/navigate.
    const action = await page.locator("form").getAttribute("action");
    expect(action).toBeNull();

    await page.getByLabel("Name", { exact: true }).fill("Test Human");
    await page.getByLabel("Email", { exact: true }).fill("tester@example.com");
    await page
      .getByLabel("Message", { exact: true })
      .fill("This submission must go through fetch, not a native form navigation.");

    submitStarted = true;
    await page.getByRole("button", { name: "Send" }).click();

    await expect(
      page.getByRole("heading", { name: "Thanks — your message is on its way." }),
    ).toBeVisible();

    expect(navigatedAfterSubmit).toBe(false);

    const state = await fetchMockState(testId);
    expect(state.calls).toHaveLength(1);
  });
});
