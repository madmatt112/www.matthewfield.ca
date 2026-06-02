import { expect, test } from "@playwright/test";

// CSP header is applied via next.config.ts headers() for all routes except
// /playground and /playground/* (negative-lookahead regex). These tests guard
// against silent regressions if next.config.ts is refactored.
//
// The opt-out is asserted on the stable index (/playground), a same-page item
// landing (/playground/scribble-pad), and a nested embed (/playground/starfield/embed)
// so a future regex refactor that re-narrows the lookahead is caught on the deep paths.

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

  const PLAYGROUND_PATHS = [
    "/playground",
    "/playground/scribble-pad",
    "/playground/starfield/embed",
  ];

  for (const path of PLAYGROUND_PATHS) {
    test(`playground route ${path} does not serve a CSP header`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response).not.toBeNull();
      expect(response?.ok()).toBe(true);

      const headers = response?.headers() ?? {};
      // No CSP (route-scoped opt-out, Req 10.5) and no X-Frame-Options, so the
      // same-origin embed iframe loads without a framing error (Req 9.2).
      expect(headers["content-security-policy"]).toBeUndefined();
      expect(headers["x-frame-options"]).toBeUndefined();
    });
  }
});
