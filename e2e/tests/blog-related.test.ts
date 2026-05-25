import { expect, test } from "@playwright/test";

// Build 1 axis (drafts reachable via BLOG_INCLUDE_DRAFTS=1). Asserts the
// RelatedPosts rail (Task 18.3) renders on /blog/fixture-related-a with
// fixture-related-b as the top related card. The pair shares the
// `related-test` tag and `related-fixture` category — under 3:1 weighting
// that yields the deterministic score-4 match documented in the fixtures.
//
// Requirements: 4.5, 6.1.

const PATH = "/blog/fixture-related-a";

test.describe("blog related-posts rail — Build 1 axis (fixture-related-a)", () => {
  test("renders related rail with fixture-related-b as the top card", async ({
    page,
  }) => {
    await page.goto(PATH);

    const rail = page.locator('aside[aria-labelledby="related-heading"]');
    await expect(rail).toBeVisible();
    await expect(rail.locator("#related-heading")).toHaveText("Related posts");

    const firstCard = rail.locator(".related-posts-list > li").first();
    await expect(firstCard.locator("a")).toHaveAttribute(
      "href",
      "/blog/fixture-related-b",
    );
    await expect(firstCard.locator(".related-card-title")).toHaveText(
      "Fixture: fixture-related-b",
    );
  });
});
