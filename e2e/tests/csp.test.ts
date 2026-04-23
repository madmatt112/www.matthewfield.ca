import { expect, test } from "@playwright/test";

// CSP header is applied via next.config.ts headers() for all routes except
// /playground and /playground/* (negative-lookahead regex). These tests guard
// against silent regressions if next.config.ts is refactored.
//
// Use the stable /playground index as the exclusion target — /playground/spike
// is a spike artifact that may be removed by spec 8.

const EXPECTED_CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-src 'self'",
  "connect-src 'self'",
];

test.describe("Content-Security-Policy headers", () => {
  test("content pages serve CSP header with expected directives", async ({ page }) => {
    const response = await page.goto("/");
    expect(response).not.toBeNull();

    const csp = response?.headers()["content-security-policy"];
    expect(csp).toBeDefined();

    for (const directive of EXPECTED_CSP_DIRECTIVES) {
      expect(csp).toContain(directive);
    }
  });

  test("playground routes do not serve a CSP header", async ({ page }) => {
    const response = await page.goto("/playground");
    expect(response).not.toBeNull();

    const csp = response?.headers()["content-security-policy"];
    expect(csp).toBeUndefined();
  });
});
