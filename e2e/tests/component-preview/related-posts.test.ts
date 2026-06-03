import { expect, test } from "@playwright/test";

// Per-component preview smoke for <RelatedPosts /> (Task 18.3).
// The preview route is gated on BLOG_INCLUDE_DRAFTS=1; the webServer
// in e2e/playwright.config.ts inherits the parent shell env, so CI sets
// BLOG_INCLUDE_DRAFTS=1 on the Playwright job (see .github/workflows/ci.yml).
// Locally: BLOG_INCLUDE_DRAFTS=1 pnpm test:e2e.

const PATH = "/blog/component-preview/related-posts";
const ASIDE_SELECTOR = "aside.related-posts";
const HEADING_SELECTOR = `${ASIDE_SELECTOR} #related-heading`;
const CARD_TITLE_SELECTOR = `${ASIDE_SELECTOR} .related-card-title`;

test.describe("component preview: related-posts", () => {
  test("renders aside with 3 fixture cards; pagefind-ignore present; theme-parity differs", async ({
    page,
  }) => {
    // Light theme.
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto(PATH);

    const aside = page.locator(ASIDE_SELECTOR);
    await expect(aside).toBeVisible();

    // Spec contract: data-pagefind-ignore="all" + aria-labelledby="related-heading".
    await expect(aside).toHaveAttribute("data-pagefind-ignore", "all");
    await expect(aside).toHaveAttribute("aria-labelledby", "related-heading");

    // Heading id matches.
    await expect(page.locator(HEADING_SELECTOR)).toBeVisible();

    // Three fixture cards.
    const titles = page.locator(CARD_TITLE_SELECTOR);
    await expect(titles).toHaveCount(3);
    await expect(titles.nth(0)).toContainText("Fixture Related Post 1");
    await expect(titles.nth(1)).toContainText("Fixture Related Post 2");
    await expect(titles.nth(2)).toContainText("Fixture Related Post 3");

    const lightColor = await titles.nth(0).evaluate((el) => window.getComputedStyle(el).color);

    // Dark theme.
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto(PATH);
    await expect(aside).toBeVisible();

    const darkColor = await titles.nth(0).evaluate((el) => window.getComputedStyle(el).color);

    // Theme-parity proof: computed color must differ.
    expect(lightColor).not.toBe(darkColor);
  });
});
