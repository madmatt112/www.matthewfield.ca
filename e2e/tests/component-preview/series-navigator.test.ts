import { expect, test } from "@playwright/test";

// Per-component preview smoke for <SeriesNavigator /> (Task 18.2).
// The preview route is gated on BLOG_INCLUDE_DRAFTS=1; the webServer
// in e2e/playwright.config.ts inherits the parent shell env, so CI sets
// BLOG_INCLUDE_DRAFTS=1 on the Playwright job (see .github/workflows/ci.yml).
// Locally: BLOG_INCLUDE_DRAFTS=1 pnpm test:e2e.

const PATH = "/blog/component-preview/series-navigator";
const NAV_SELECTOR = "nav.series-navigator";
const CURRENT_SELECTOR = `${NAV_SELECTOR} [aria-current="page"]`;
const LINK_SELECTOR = `${NAV_SELECTOR} a`;

test.describe("component preview: series-navigator", () => {
  test("renders fixture nav with aria-current on middle item; theme-parity differs", async ({
    page,
  }) => {
    // Light theme.
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto(PATH);

    const nav = page.locator(NAV_SELECTOR);
    await expect(nav).toBeVisible();

    // Middle item rendered as aria-current="page".
    const current = page.locator(CURRENT_SELECTOR);
    await expect(current).toHaveCount(1);
    await expect(current).toContainText("Part 2");

    // The other two items render as <a> links.
    const links = page.locator(LINK_SELECTOR);
    await expect(links).toHaveCount(2);
    await expect(links.nth(0)).toContainText("Part 1");
    await expect(links.nth(1)).toContainText("Part 3");

    const lightColor = await current.evaluate(
      (el) => window.getComputedStyle(el).color,
    );

    // Dark theme.
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto(PATH);
    await expect(nav).toBeVisible();

    const darkColor = await current.evaluate(
      (el) => window.getComputedStyle(el).color,
    );

    // Theme-parity proof: computed color must differ.
    expect(lightColor).not.toBe(darkColor);
  });
});
