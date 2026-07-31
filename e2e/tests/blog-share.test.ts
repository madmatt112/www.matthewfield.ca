import { expect, test } from "@playwright/test";

import { siteConfig } from "../../src/config/site";

// Build 1 axis (drafts reachable via BLOG_INCLUDE_DRAFTS=1). Asserts the
// share-bar (Task 18.2) renders the three bot-friendly anchors with the
// correct attribute shape AND that the <CopyURLButton /> client island
// writes the post's ABSOLUTE URL to the clipboard.
//
// Requirements: 2.5, 4.5, 6.1, 6.2, 6.4, 6.5.

const SLUG = "fixture-code";
const PATH = `/blog/${SLUG}`;
const POST_URL = `${siteConfig.url}/blog/${SLUG}`;

test.describe("blog share-bar — Build 1 axis (fixture-code)", () => {
  test("X, LinkedIn, mailto anchors have correct target/rel/aria-label", async ({ page }) => {
    await page.goto(PATH);

    const shareSection = page.locator('section[aria-label="Share this post"]');
    await expect(shareSection).toBeVisible();

    const x = shareSection.locator('a[aria-label^="Share on X (Twitter)"]');
    await expect(x).toHaveAttribute("target", "_blank");
    await expect(x).toHaveAttribute("rel", "noopener nofollow");
    const xHref = await x.getAttribute("href");
    expect(xHref).toMatch(/^https:\/\/twitter\.com\/intent\/tweet\?/);
    expect(xHref).toContain(encodeURIComponent(POST_URL));

    const linkedin = shareSection.locator('a[aria-label^="Share on LinkedIn"]');
    await expect(linkedin).toHaveAttribute("target", "_blank");
    await expect(linkedin).toHaveAttribute("rel", "noopener nofollow");
    const linkedinHref = await linkedin.getAttribute("href");
    expect(linkedinHref).toMatch(/^https:\/\/www\.linkedin\.com\/sharing\/share-offsite\/\?/);
    expect(linkedinHref).toContain(encodeURIComponent(POST_URL));

    const mail = shareSection.locator('a[aria-label^="Share via email"]');
    await expect(mail).toHaveAttribute("target", "_blank");
    await expect(mail).toHaveAttribute("rel", "noopener nofollow");
    const mailHref = await mail.getAttribute("href");
    expect(mailHref).toMatch(/^mailto:\?/);
    expect(mailHref).toContain(encodeURIComponent(POST_URL));
  });

  test("Copy URL button writes the post's absolute URL to the clipboard", async ({
    page,
    context,
    browserName,
  }) => {
    // Grant clipboard permission (Chromium-only — the project runs only
    // a chromium project per e2e/playwright.config.ts).
    if (browserName === "chromium") {
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    }

    await page.goto(PATH);

    // Locate by a stable class — aria-label changes between idle / copied
    // states, so a label-based locator would intermittently fail to resolve
    // during the "copied" window.
    const button = page.locator("button.share-bar-copy");
    await expect(button).toBeVisible();
    await expect(button).toHaveAttribute("aria-label", "Copy link to this post");
    await expect(button).toHaveAttribute("data-copy-state", "idle");

    await button.click();

    await expect(button).toHaveAttribute("data-copy-state", "copied");
    await expect(button).toHaveAttribute("aria-label", "Link copied");

    const clip = await page.evaluate(() => navigator.clipboard.readText());
    expect(clip).toBe(POST_URL);
  });

  test("share-bar buttons meet 44×44 touch target", async ({ page }) => {
    await page.goto(PATH);

    const shareSection = page.locator('section[aria-label="Share this post"]');
    await expect(shareSection).toBeVisible();

    const selectors = [
      'a[aria-label^="Share on X (Twitter)"]',
      'a[aria-label^="Share on LinkedIn"]',
      'a[aria-label^="Share via email"]',
      'button[aria-label="Copy link to this post"]',
    ];

    for (const selector of selectors) {
      const target = shareSection.locator(selector);
      await expect(target).toBeVisible();
      const box = await target.boundingBox();
      expect(box, `boundingBox() returned null for ${selector}`).not.toBeNull();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
  });
});
