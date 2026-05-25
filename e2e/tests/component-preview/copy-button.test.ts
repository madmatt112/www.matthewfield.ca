import { expect, test } from "@playwright/test";

// Per-component preview smoke for <CopyButton /> (Task 18.7).
// The preview route is gated on BLOG_INCLUDE_DRAFTS=1; the webServer
// in e2e/playwright.config.ts inherits the parent shell env, so CI sets
// BLOG_INCLUDE_DRAFTS=1 on the Playwright job (see .github/workflows/ci.yml).
// Locally: BLOG_INCLUDE_DRAFTS=1 pnpm test:e2e.

const PATH = "/blog/component-preview/copy-button";
const BUTTON_SELECTOR = "[data-copy-button]";
const STATUS_SELECTOR = "#copy-status";
const EXPECTED_SOURCE = 'console.log("hello");\n';

test.describe("component preview: copy-button", () => {
  test("hydrates [data-copy-button]; click copies decoded source; announces status; theme parity", async ({
    page,
    context,
    browserName,
  }) => {
    // Grant clipboard permissions (Chromium-only — the project runs only
    // a chromium project per e2e/playwright.config.ts).
    if (browserName === "chromium") {
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    }

    // Light theme.
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto(PATH);

    const button = page.locator(BUTTON_SELECTOR);
    await expect(button).toBeVisible();

    // Touch target >= 44x44 CSS px.
    const box = await button.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);

    // Hydrator sets data-copy-state="idle" on mount.
    await expect(button).toHaveAttribute("data-copy-state", "idle");

    await button.click();

    // After click, state flips to "copied" (sync after the await chain).
    await expect(button).toHaveAttribute("data-copy-state", "copied");
    await expect(button).toHaveAttribute(
      "aria-label",
      "Code copied to clipboard",
    );

    // Clipboard round-trip: navigator.clipboard.readText() must return
    // the decoded source the rehype plugin would have encoded.
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    expect(clip).toBe(EXPECTED_SOURCE);

    // Status announcement landed in the #copy-status aria-live region.
    await expect(page.locator(STATUS_SELECTOR)).toHaveText("Code copied");

    const lightColor = await button.evaluate(
      (el) => window.getComputedStyle(el).color,
    );

    // Dark theme.
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto(PATH);
    await expect(page.locator(BUTTON_SELECTOR)).toBeVisible();

    const darkColor = await page
      .locator(BUTTON_SELECTOR)
      .evaluate((el) => window.getComputedStyle(el).color);

    // Theme-parity proof: computed color must differ.
    expect(lightColor).not.toBe(darkColor);
  });
});
