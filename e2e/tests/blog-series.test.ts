import { expect, test } from "@playwright/test";

// Build 1 axis (drafts reachable via BLOG_INCLUDE_DRAFTS=1). Asserts the
// SeriesNavigator (Task 18.4) on /blog/fixture-series-1 lists both series
// members in seriesOrder and marks the current entry with
// aria-current="page".
//
// Requirements: 2.5, 6.1.

const PATH = "/blog/fixture-series-1";

test.describe("blog series-navigator — Build 1 axis (fixture-series-1)", () => {
  test("renders both members; current is marked aria-current=page", async ({
    page,
  }) => {
    await page.goto(PATH);

    const nav = page.locator('nav[aria-label="Series navigation"]');
    await expect(nav).toBeVisible();
    await expect(nav.locator(".series-navigator-title")).toHaveText(
      "Fixture Series",
    );

    const items = nav.locator("ol > li");
    await expect(items).toHaveCount(2);

    // seriesOrder asc → fixture-series-1 leads, fixture-series-2 follows.
    const first = items.nth(0);
    const second = items.nth(1);

    // Current post: rendered as <span aria-current="page">, NOT an anchor.
    const currentSpan = first.locator('span[aria-current="page"]');
    await expect(currentSpan).toHaveText("Fixture: fixture-series-1");
    await expect(first.locator("a")).toHaveCount(0);

    // Sibling post: rendered as a link to /blog/fixture-series-2.
    await expect(second.locator("a")).toHaveAttribute(
      "href",
      "/blog/fixture-series-2",
    );
    await expect(second.locator("a")).toHaveText("Fixture: fixture-series-2");
  });
});
