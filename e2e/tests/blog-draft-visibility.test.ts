import { expect, test } from "@playwright/test";

const DRAFT_SLUG = "fixture-draft-do-not-publish";

test.describe("blog draft visibility", () => {
  test("draft post renders banner, [DRAFT] title, robots noindex, and is listed on index", async ({
    page,
  }) => {
    // (a) DraftBanner text visible on the draft post page.
    await page.goto(`/blog/${DRAFT_SLUG}`);
    await expect(page.getByText("DRAFT — not yet published")).toBeVisible();

    // (b) <title> starts with [DRAFT].
    const title = await page.title();
    expect(title.startsWith("[DRAFT]")).toBe(true);

    // (d) <meta name="robots" content="noindex, nofollow"> present in head.
    // Next 16 renders the directives comma-space separated.
    const robots = page.locator('head meta[name="robots"]');
    await expect(robots).toHaveAttribute("content", /^\s*noindex\s*,\s*nofollow\s*$/);

    // (c) Slug appears as a link on /blog index.
    await page.goto("/blog");
    const draftLink = page.locator(`a[href="/blog/${DRAFT_SLUG}"]`);
    await expect(draftLink.first()).toBeVisible();
  });
});
