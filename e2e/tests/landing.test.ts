import { expect, test } from "@playwright/test";

import { siteConfig } from "../../src/config/site";

// The landing page is a lead paragraph, a "Recent work" stream, a path index of
// the site's sections, and one contact CTA. Assertions scope by region so the
// index links are not confused with the duplicate header-nav links pointing at
// the same hrefs.

test.describe("landing page", () => {
  test("leads with the intro rather than a section list", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1, name: siteConfig.name })).toBeVisible();
    await expect(page.getByText(siteConfig.intro)).toBeVisible();
  });

  test("shows recent work", async ({ page }) => {
    await page.goto("/");
    const recent = page.getByRole("region", { name: "Recent work" });

    await expect(recent).toBeVisible();
    // Three items, each a link to the post/project/contribution it names. The
    // section deliberately has no "see all" link — the index below covers that.
    await expect(recent.getByRole("listitem")).toHaveCount(3);
    await expect(recent.getByRole("link")).toHaveCount(3);
  });

  test("renders one index row per configured entry", async ({ page }) => {
    await page.goto("/");
    const index = page.getByRole("region", { name: "Index" });

    // Derived from the config rather than hardcoded, so adding or unlisting a
    // section (e.g. Playground) does not require editing this assertion.
    await expect(index.getByRole("link")).toHaveCount(siteConfig.homeIndex.length);
    for (const entry of siteConfig.homeIndex) {
      await expect(index.getByRole("link", { name: new RegExp(`/${entry.label}`) })).toBeVisible();
    }
  });

  test("offers a single contact CTA", async ({ page }) => {
    await page.goto("/");
    const contact = page.getByRole("region", { name: "Get in touch" });

    await expect(contact.getByRole("link", { name: "Get in touch" })).toBeVisible();
  });

  for (const entry of siteConfig.homeIndex) {
    test(`clicking /${entry.label} navigates to ${entry.href}`, async ({ page }) => {
      await page.goto("/");
      const index = page.getByRole("region", { name: "Index" });

      await index.getByRole("link", { name: new RegExp(`/${entry.label}`) }).click();

      await expect(page).toHaveURL(entry.href);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    });
  }
});
