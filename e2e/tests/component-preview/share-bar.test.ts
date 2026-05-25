import { expect, test } from "@playwright/test";

// Per-component preview smoke for <ShareBar /> + <CopyURLButton /> (Task 18.4).
// The preview route is gated on BLOG_INCLUDE_DRAFTS=1; the webServer
// in e2e/playwright.config.ts inherits the parent shell env, so CI sets
// BLOG_INCLUDE_DRAFTS=1 on the Playwright job (see .github/workflows/ci.yml).
// Locally: BLOG_INCLUDE_DRAFTS=1 pnpm test:e2e.

const PATH = "/blog/component-preview/share-bar";
const SECTION_SELECTOR = "section.share-bar";
const LINK_SELECTOR = `${SECTION_SELECTOR} a.share-bar-link`;
const BUTTON_SELECTOR = `${SECTION_SELECTOR} button.share-bar-copy`;

test.describe("component preview: share-bar", () => {
  test("renders three share anchors + copy button; touch targets >= 44x44; theme parity", async ({
    page,
  }) => {
    // Light theme.
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto(PATH);

    const section = page.locator(SECTION_SELECTOR);
    await expect(section).toBeVisible();
    await expect(section).toHaveAttribute("data-pagefind-ignore", "all");

    // Three external-share anchors (X, LinkedIn, mailto) + one CopyURLButton.
    const anchors = page.locator(LINK_SELECTOR);
    await expect(anchors).toHaveCount(3);
    await expect(anchors.nth(0)).toHaveAttribute("aria-label", /X|Twitter/);
    await expect(anchors.nth(1)).toHaveAttribute("aria-label", /LinkedIn/);
    await expect(anchors.nth(2)).toHaveAttribute("aria-label", /email/i);
    for (const i of [0, 1, 2]) {
      await expect(anchors.nth(i)).toHaveAttribute("target", "_blank");
      await expect(anchors.nth(i)).toHaveAttribute("rel", /noopener/);
      await expect(anchors.nth(i)).toHaveAttribute("rel", /nofollow/);
    }

    const button = page.locator(BUTTON_SELECTOR);
    await expect(button).toBeVisible();

    // Req 6.6: touch target >= 44x44 CSS px (Task 40 references this).
    const box = await button.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);

    const lightColor = await button.evaluate(
      (el) => window.getComputedStyle(el).color,
    );

    // Dark theme.
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto(PATH);
    await expect(section).toBeVisible();

    const darkColor = await button.evaluate(
      (el) => window.getComputedStyle(el).color,
    );

    // Theme-parity proof: computed color must differ.
    expect(lightColor).not.toBe(darkColor);
  });
});
