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
  body: {
    from?: string;
    to?: string;
    reply_to?: string;
    subject?: string;
    text?: string;
    html?: string;
  };
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

const PAGES: Array<{ path: "/profile" | "/contact"; sourceToken: "profile" | "contact" }> = [
  { path: "/profile", sourceToken: "profile" },
  { path: "/contact", sourceToken: "contact" },
];

test.describe("contact form happy path (parameterized)", () => {
  let testId: string;

  test.beforeEach(async ({ page }) => {
    testId = randomUUID();
    await page.addInitScript((id) => {
      (window as unknown as { __TEST_ID: string }).__TEST_ID = id;
    }, testId);
    await resetMockBucket(testId);
  });

  for (const { path, sourceToken } of PAGES) {
    test(`${path} submits successfully and records the email at the mock`, async ({ page }) => {
      await page.goto(path);

      const form = page.locator("form");
      await expect(form).toBeVisible();

      const name = "Test Human";
      const email = "tester@example.com";
      const message = "This is an end-to-end submission with at least ten characters.";

      await page.getByLabel("Name", { exact: true }).fill(name);
      await page.getByLabel("Email", { exact: true }).fill(email);
      await page.getByLabel("Message", { exact: true }).fill(message);

      const customEventPromise = page.evaluate(
        () =>
          new Promise<boolean>((resolve) => {
            document.addEventListener("contact_submit_success", () => resolve(true), {
              once: true,
            });
          }),
      );

      await page.getByRole("button", { name: "Send" }).click();

      const successHeading = page.getByRole("heading", {
        name: "Thanks — your message is on its way.",
      });
      await expect(successHeading).toBeVisible();
      await expect(successHeading).toBeFocused();

      const statusInMain = page.locator("main").locator('[role="status"]');
      expect(await statusInMain.count()).toBeGreaterThanOrEqual(1);

      const eventFired = await Promise.race([
        customEventPromise,
        new Promise<false>((resolve) => setTimeout(() => resolve(false), 2_000)),
      ]);
      expect(eventFired).toBe(true);

      const state = await fetchMockState(testId);
      expect(state.calls).toHaveLength(1);
      const call = state.calls[0]!;
      expect(call.body.subject).toBe(`Contact form submission from ${sourceToken}`);
      expect(call.body.text).toContain(sourceToken);
      expect(call.body.text).toContain(name);
      expect(call.body.text).toContain(email);
      expect(call.body.text).toContain(message);
      expect(call.body.reply_to).toBe(email);
      expect(call.body.html).toBeUndefined();
    });
  }

  test("/profile exposes an absolute https canonical link", async ({ page }) => {
    await page.goto("/profile");
    const href = await page.locator('link[rel="canonical"]').getAttribute("href");
    expect(href).not.toBeNull();
    expect(href!).toMatch(/^https:\/\/www\.matthewfield\.ca\//);
  });
});

test.describe("contact form SSR-leak guard", () => {
  for (const { path } of PAGES) {
    test(`${path} server-rendered HTML does not contain the literal email`, async ({ page }) => {
      await page.goto(path);
      const html = await page.content();
      expect(html).not.toContain(siteConfig.links.email);
    });
  }
});

test.describe("contact form double-submit latch", () => {
  let testId: string;

  test.beforeEach(async ({ page }) => {
    testId = randomUUID();
    await page.addInitScript((id) => {
      (window as unknown as { __TEST_ID: string }).__TEST_ID = id;
    }, testId);
    await resetMockBucket(testId);
  });

  test("rapid double submit records exactly one email", async ({ page }) => {
    await page.goto("/contact");

    await page.getByLabel("Name", { exact: true }).fill("Test Human");
    await page.getByLabel("Email", { exact: true }).fill("tester@example.com");
    await page
      .getByLabel("Message", { exact: true })
      .fill("Rapid double-submit should only send a single email message.");

    const button = page.getByRole("button", { name: "Send" });
    await button.click({ clickCount: 2, delay: 0 });

    await expect(
      page.getByRole("heading", { name: "Thanks — your message is on its way." }),
    ).toBeVisible();

    const state = await fetchMockState(testId);
    expect(state.calls).toHaveLength(1);
  });
});

test.describe("contact form honeypot", () => {
  let testId: string;

  test.beforeEach(async ({ page }) => {
    testId = randomUUID();
    await page.addInitScript((id) => {
      (window as unknown as { __TEST_ID: string }).__TEST_ID = id;
    }, testId);
    await resetMockBucket(testId);
  });

  test("populated url_secondary returns success UI but records zero emails", async ({ page }) => {
    await page.goto("/contact");

    await page.getByLabel("Name", { exact: true }).fill("Bot Pretender");
    await page.getByLabel("Email", { exact: true }).fill("bot@example.com");
    await page
      .getByLabel("Message", { exact: true })
      .fill("Honeypot path — this must be silently dropped by the API.");

    await page.evaluate(() => {
      const el = document.querySelector<HTMLInputElement>('input[name="url_secondary"]');
      if (el) el.value = "bot";
    });

    await page.getByRole("button", { name: "Send" }).click();

    await expect(
      page.getByRole("heading", { name: "Thanks — your message is on its way." }),
    ).toBeVisible();

    const state = await fetchMockState(testId);
    expect(state.calls).toHaveLength(0);
  });
});
