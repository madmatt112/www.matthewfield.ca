import { expect, test } from "@playwright/test";

// Per-component preview smoke for <TableOfContents /> (Task 18.6).
// The preview route is gated on BLOG_INCLUDE_DRAFTS=1; the webServer
// in e2e/playwright.config.ts inherits the parent shell env, so CI sets
// BLOG_INCLUDE_DRAFTS=1 on the Playwright job (see .github/workflows/ci.yml).
// Locally: BLOG_INCLUDE_DRAFTS=1 pnpm test:e2e.

const PATH = "/blog/component-preview/table-of-contents";
const NAV_SELECTOR = "nav.table-of-contents";
const MULTI_WRAPPER = '[data-testid="toc-multi"]';
const SINGLE_WRAPPER = '[data-testid="toc-single"]';
const DEPTH2_SELECTOR = `${NAV_SELECTOR} li.toc-entry[data-depth="2"]`;
const DEPTH3_SELECTOR = `${NAV_SELECTOR} li.toc-entry[data-depth="3"]`;
const LINK_SELECTOR = `${NAV_SELECTOR} a.toc-link`;

test.describe("component preview: table-of-contents", () => {
  test("nav renders with aria-label + indented depth-3 entries; 1-entry case renders nothing; theme parity", async ({
    page,
  }) => {
    // Light theme.
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto(PATH);

    // Multi-entry fixture: nav is present + has the required aria-label.
    const multi = page.locator(MULTI_WRAPPER);
    const nav = multi.locator(NAV_SELECTOR);
    await expect(nav).toBeVisible();
    await expect(nav).toHaveAttribute("aria-label", "On this page");
    await expect(nav).toHaveAttribute("data-pagefind-ignore", "all");

    // Single-entry fixture: TableOfContents must render nothing (Req 7.9).
    const single = page.locator(SINGLE_WRAPPER);
    await expect(single.locator(NAV_SELECTOR)).toHaveCount(0);

    // Indentation: depth-3 entries' computed margin-left must exceed depth-2.
    const depth2Left = await page
      .locator(DEPTH2_SELECTOR)
      .first()
      .evaluate((el) => parseFloat(window.getComputedStyle(el).marginLeft));
    const depth3Left = await page
      .locator(DEPTH3_SELECTOR)
      .first()
      .evaluate((el) => parseFloat(window.getComputedStyle(el).marginLeft));
    expect(depth3Left).toBeGreaterThan(depth2Left);

    const lightColor = await page
      .locator(LINK_SELECTOR)
      .first()
      .evaluate((el) => window.getComputedStyle(el).color);

    // Dark theme.
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto(PATH);
    await expect(nav).toBeVisible();

    const darkColor = await page
      .locator(LINK_SELECTOR)
      .first()
      .evaluate((el) => window.getComputedStyle(el).color);

    // Theme-parity proof: computed link color must differ.
    expect(lightColor).not.toBe(darkColor);
  });
});
