import { expect, test } from "@playwright/test";

import { siteConfig } from "../../src/config/site";

// Hero cards render inside a <section aria-labelledby="sections-heading"> on
// the landing page, with an sr-only h2 "Sections". Scoping by the "Sections"
// region disambiguates hero-card links from the duplicate nav links that
// point to the same hrefs.

test.describe("landing page hero cards", () => {
  test("renders exactly 6 hero cards", async ({ page }) => {
    await page.goto("/");
    const sections = page.getByRole("region", { name: "Sections" });

    await expect(sections.getByRole("link")).toHaveCount(6);
    for (const card of siteConfig.heroCards) {
      await expect(sections.getByRole("link", { name: card.title })).toBeVisible();
    }
  });

  for (const card of siteConfig.heroCards) {
    test(`clicking ${card.title} navigates to ${card.href}`, async ({ page }) => {
      await page.goto("/");
      const sections = page.getByRole("region", { name: "Sections" });

      await sections.getByRole("link", { name: card.title }).click();

      await expect(page).toHaveURL(card.href);
      if (card.href === "/profile") {
        // /profile is no longer a placeholder — its h1 is the Velite-sourced
        // headline, not the hero card title.
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      } else {
        await expect(page.getByRole("heading", { level: 1, name: card.title })).toBeVisible();
      }
    });
  }
});
