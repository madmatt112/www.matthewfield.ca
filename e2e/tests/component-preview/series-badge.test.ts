import { expect, test } from "@playwright/test";

// Per-component preview smoke for <SeriesBadge /> (Task 18.1).
// The preview route is gated on BLOG_INCLUDE_DRAFTS=1; the webServer
// in e2e/playwright.config.ts inherits the parent shell env, so CI sets
// BLOG_INCLUDE_DRAFTS=1 on the Playwright job (see .github/workflows/ci.yml).
// Locally: BLOG_INCLUDE_DRAFTS=1 pnpm test:e2e.

const PATH = "/blog/component-preview/series-badge";
const BADGE_SELECTOR = ".series-badge";

test.describe("component preview: series-badge", () => {
  test("renders fixture text and color differs between light and dark themes", async ({ page }) => {
    // Light theme.
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto(PATH);

    const badge = page.locator(BADGE_SELECTOR);
    await expect(badge).toBeVisible();
    await expect(badge).toContainText("Fixture Series");
    await expect(badge).toContainText("Part 1 of 3");

    const lightColor = await badge.evaluate((el) => window.getComputedStyle(el).color);

    // Dark theme.
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto(PATH);
    await expect(badge).toBeVisible();

    const darkColor = await badge.evaluate((el) => window.getComputedStyle(el).color);

    // Theme-parity proof: computed color must differ.
    expect(lightColor).not.toBe(darkColor);
  });
});
