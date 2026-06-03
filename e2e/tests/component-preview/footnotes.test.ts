import { expect, test } from "@playwright/test";

// Per-component preview smoke for footnotes CSS slice (Task 18.8).
// The preview route is gated on BLOG_INCLUDE_DRAFTS=1; the webServer
// in e2e/playwright.config.ts inherits the parent shell env, so CI sets
// BLOG_INCLUDE_DRAFTS=1 on the Playwright job (see .github/workflows/ci.yml).
// Locally: BLOG_INCLUDE_DRAFTS=1 pnpm test:e2e.

const PATH = "/blog/component-preview/footnotes";
const SECTION_SELECTOR = "section[data-footnotes]";
const LIST_SELECTOR = `${SECTION_SELECTOR} ol`;
const BACKREF_SELECTOR = `${SECTION_SELECTOR} a[data-footnote-backref]`;

test.describe("component preview: footnotes", () => {
  test("renders section with separator, numbered list, back-references; theme parity", async ({
    page,
  }) => {
    // Light theme.
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto(PATH);

    const section = page.locator(SECTION_SELECTOR);
    await expect(section).toBeVisible();

    // Visible separator: computed border-top must be > 0 width and non-transparent.
    const borderTop = await section.evaluate((el) => {
      const cs = window.getComputedStyle(el);
      return {
        width: cs.borderTopWidth,
        style: cs.borderTopStyle,
        color: cs.borderTopColor,
      };
    });
    expect(parseFloat(borderTop.width)).toBeGreaterThan(0);
    expect(borderTop.style).not.toBe("none");
    expect(borderTop.color).not.toBe("rgba(0, 0, 0, 0)");

    // Numbered list (<ol>) present with three items.
    const list = page.locator(LIST_SELECTOR);
    await expect(list).toBeVisible();
    await expect(list.locator("> li")).toHaveCount(3);

    // Back-reference links present and have aria-labels.
    const backrefs = page.locator(BACKREF_SELECTOR);
    await expect(backrefs).toHaveCount(3);
    await expect(backrefs.first()).toHaveAttribute("aria-label", "Back to reference 1");

    const lightColor = await backrefs.first().evaluate((el) => window.getComputedStyle(el).color);

    // Dark theme.
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto(PATH);
    await expect(page.locator(SECTION_SELECTOR)).toBeVisible();

    const darkColor = await page
      .locator(BACKREF_SELECTOR)
      .first()
      .evaluate((el) => window.getComputedStyle(el).color);

    // Theme-parity proof: computed color must differ.
    expect(lightColor).not.toBe(darkColor);
  });
});
