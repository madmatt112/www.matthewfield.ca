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

const PAGES: Array<"/profile" | "/contact"> = ["/profile", "/contact"];

test.describe("contact CSP smoke", () => {
  let testId: string;

  test.beforeEach(async ({ page }) => {
    testId = randomUUID();
    // Register CSP violation listener and __TEST_ID BEFORE any other script.
    await page.addInitScript((id) => {
      (window as unknown as { __TEST_ID: string }).__TEST_ID = id;
      (window as unknown as { __cspViolations: SecurityPolicyViolationEvent[] }).__cspViolations =
        [];
      document.addEventListener("securitypolicyviolation", (event) => {
        (
          window as unknown as { __cspViolations: SecurityPolicyViolationEvent[] }
        ).__cspViolations.push(event);
      });
    }, testId);
    await resetMockBucket(testId);
  });

  for (const path of PAGES) {
    test(`${path} fires no CSP violations during decode + submit`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") {
          consoleErrors.push(msg.text());
        }
      });

      await page.goto(path);

      // Trigger runtime decode of <ObfuscatedEmail /> — clicking inserts the
      // literal email into the DOM via react-obfuscate's onClick handler.
      const obfuscatedEmail = page.getByLabel("Reveal Matthew's email address");
      await expect(obfuscatedEmail).toBeVisible();
      await obfuscatedEmail.click();

      // Fill and submit the form.
      await page.getByLabel("Name", { exact: true }).fill("CSP Tester");
      await page.getByLabel("Email", { exact: true }).fill("csp@example.com");
      await page
        .getByLabel("Message", { exact: true })
        .fill("CSP smoke test submission with at least ten characters.");
      await page.getByRole("button", { name: "Send" }).click();

      await expect(
        page.getByRole("heading", { name: "Thanks — your message is on its way." }),
      ).toBeVisible();

      const violations = await page.evaluate(
        () =>
          (
            window as unknown as {
              __cspViolations: SecurityPolicyViolationEvent[];
            }
          ).__cspViolations.length,
      );
      expect(violations).toBe(0);

      const cspBlockedErrors = consoleErrors.filter((line) =>
        /blocked by csp|content security policy/i.test(line),
      );
      expect(cspBlockedErrors).toEqual([]);
    });
  }
});

test.describe("form-action 'self' header", () => {
  for (const path of PAGES) {
    test(`${path} response includes form-action 'self' directive`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response).not.toBeNull();
      const csp = response!.headers()["content-security-policy"];
      expect(csp).toBeDefined();
      expect(csp).toContain("form-action 'self'");
    });
  }
});
