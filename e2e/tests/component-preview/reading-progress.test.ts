import { expect, test } from "@playwright/test";

// Per-component preview smoke for <ReadingProgress /> (Task 18.5).
// The preview route is gated on BLOG_INCLUDE_DRAFTS=1; the webServer
// in e2e/playwright.config.ts inherits the parent shell env, so CI sets
// BLOG_INCLUDE_DRAFTS=1 on the Playwright job (see .github/workflows/ci.yml).
// Locally: BLOG_INCLUDE_DRAFTS=1 pnpm test:e2e.

const PATH = "/blog/component-preview/reading-progress";
const BAR_SELECTOR = "div.reading-progress";
const FILL_SELECTOR = `${BAR_SELECTOR} > .reading-progress-fill`;

test.describe("component preview: reading-progress", () => {
  test("bar grows on scroll; role=presentation (not progressbar); theme parity", async ({
    page,
  }) => {
    // Light theme.
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto(PATH);

    const bar = page.locator(BAR_SELECTOR);
    await expect(bar).toBeVisible();

    // Req 5.7: role="presentation" (NOT "progressbar").
    await expect(bar).toHaveAttribute("role", "presentation");
    const role = await bar.getAttribute("role");
    expect(role).not.toBe("progressbar");

    const fill = page.locator(FILL_SELECTOR);

    // Scroll roughly halfway through the article fixture.
    await page.evaluate(() => {
      window.scrollTo(0, document.documentElement.scrollHeight / 2);
    });
    // Let the RAF tick + width transition settle.
    await page.waitForTimeout(200);

    const { fillWidth, parentWidth } = await fill.evaluate((el) => {
      const parent = el.parentElement as HTMLElement;
      return {
        fillWidth: el.getBoundingClientRect().width,
        parentWidth: parent.getBoundingClientRect().width,
      };
    });

    // Width must be > 0% and < 100% halfway through the scroll.
    expect(fillWidth).toBeGreaterThan(0);
    expect(fillWidth).toBeLessThan(parentWidth);

    const lightColor = await fill.evaluate(
      (el) => window.getComputedStyle(el).backgroundColor,
    );

    // Dark theme.
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto(PATH);
    await expect(bar).toBeVisible();

    const darkColor = await fill.evaluate(
      (el) => window.getComputedStyle(el).backgroundColor,
    );

    // Theme-parity proof: computed fill color must differ.
    expect(lightColor).not.toBe(darkColor);
  });
});
