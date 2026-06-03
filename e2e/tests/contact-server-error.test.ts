import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

import { siteConfig } from "../../src/config/site";

function getMockBaseUrl(): string {
  const base = process.env.RESEND_BASE_URL;
  if (!base) {
    throw new Error("RESEND_BASE_URL is not set — run via scripts/run-e2e.mjs (pnpm test:e2e)");
  }
  return base;
}

type MockCall = {
  testId: string;
  body: Record<string, unknown>;
};

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

async function forceMockMode(testId: string, status: number | "timeout"): Promise<void> {
  const base = getMockBaseUrl();
  const res = await fetch(`${base}/__mode?testId=${encodeURIComponent(testId)}&status=${status}`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(`mock /__mode failed: ${res.status}`);
}

test.describe("contact form server-error recovery", () => {
  let testId: string;

  test.beforeEach(async ({ page }) => {
    testId = randomUUID();
    await page.addInitScript((id) => {
      (window as unknown as { __TEST_ID: string }).__TEST_ID = id;
    }, testId);
    await resetMockBucket(testId);
  });

  test("502 shows the recovery region, preserves fields, and does not auto-retry", async ({
    page,
  }) => {
    // The route collapses any upstream Resend 4xx/5xx (including upstream 502 AND
    // upstream 503) to a client-facing 502, so forcing 502 here exercises the same
    // client path that a forced upstream 503 would.
    await forceMockMode(testId, 502);
    await page.goto("/contact");

    const name = "Test Human";
    const email = "tester@example.com";
    const message = "This is a valid end-to-end submission that should hit a forced 502.";

    await page.getByLabel("Name", { exact: true }).fill(name);
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Message", { exact: true }).fill(message);

    await page.getByRole("button", { name: "Send" }).click();

    // Recovery region rendered and focused.
    const region = page.locator('[role="status"]');
    await expect(region).toBeVisible();
    await expect(region).toBeFocused();
    await expect(region.getByText("The mail service is unhappy")).toBeVisible();

    // Try again button + inline LinkedIn CTA.
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
    const linkedin = page.getByRole("link", { name: "Or reach out on LinkedIn" });
    await expect(linkedin).toBeVisible();
    await expect(linkedin).toHaveAttribute("href", siteConfig.links.linkedin);

    // No auto-retry: exactly one POST recorded.
    const state = await fetchMockState(testId);
    expect(state.calls).toHaveLength(1);

    // Field values preserved: clicking "Try again" returns to the populated form.
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByLabel("Name", { exact: true })).toHaveValue(name);
    await expect(page.getByLabel("Email", { exact: true })).toHaveValue(email);
    await expect(page.getByLabel("Message", { exact: true })).toHaveValue(message);
  });

  test("503 reflects the Retry-After value in the recovery copy", async ({ page }) => {
    // The client only ever sees a 503 (with Retry-After) when the upstream Resend
    // call times out: the mock hangs (status=timeout), the route aborts at ~9s and
    // returns 503 + `Retry-After: 60`. Allow for the route's timeout window.
    test.setTimeout(30_000);
    // Timeout mode hangs the upstream call so the route's ~9s server abort
    // (mail.ts TIMEOUT_MS) fires before the form's ~12s client abort
    // (contact-form.tsx SUBMIT_TIMEOUT_MS), producing the genuine client 503 +
    // Retry-After. A forced upstream 503 would surface as a client 502
    // (ResendError->502), so timeout mode is required here.
    await forceMockMode(testId, "timeout");
    await page.goto("/contact");

    const name = "Test Human";
    const email = "tester@example.com";
    const message = "This is a valid end-to-end submission that should hit a forced 503.";

    await page.getByLabel("Name", { exact: true }).fill(name);
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Message", { exact: true }).fill(message);

    await page.getByRole("button", { name: "Send" }).click();

    const region = page.locator('[role="status"]');
    await expect(region).toBeVisible({ timeout: 15_000 });
    await expect(region).toBeFocused();
    await expect(region.getByText("Sending timed out")).toBeVisible();

    // Retry-After: 60 from the route reflected in the copy.
    await expect(region.getByText(/Try again in about 60 seconds\./)).toBeVisible();

    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
    const linkedin = page.getByRole("link", { name: "Or reach out on LinkedIn" });
    await expect(linkedin).toBeVisible();
    await expect(linkedin).toHaveAttribute("href", siteConfig.links.linkedin);

    // No auto-retry: exactly one POST recorded.
    const state = await fetchMockState(testId);
    expect(state.calls).toHaveLength(1);

    // Field values preserved.
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByLabel("Name", { exact: true })).toHaveValue(name);
    await expect(page.getByLabel("Email", { exact: true })).toHaveValue(email);
    await expect(page.getByLabel("Message", { exact: true })).toHaveValue(message);
  });
});
