import { expect, test } from "@playwright/test";

import { siteConfig } from "../../src/config/site";

// Tailwind's lg breakpoint is 1024px — DesktopNav shows at >=1024, MobileNav
// hamburger shows at <1024. We use 375x667 (iPhone SE) to exercise a
// phone-sized viewport representative of the target audience.
const MOBILE_VIEWPORT = { width: 375, height: 667 };

// Every nav target now renders real content (the "under construction"
// placeholder shell has been fully replaced by the profile, projects,
// contributions, blog, resources, and playground specs), so there are no
// placeholder routes left to assert.

test.describe("desktop navigation", () => {
  for (const item of siteConfig.navItems) {
    test(`clicking ${item.label} navigates to ${item.href}`, async ({ page }) => {
      await page.goto("/");

      const nav = page.getByRole("navigation", { name: "Primary" });
      await nav.getByRole("link", { name: item.label }).click();

      await expect(page).toHaveURL(item.href);
      if (item.href === "/profile") {
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      } else {
        await expect(page.getByRole("heading", { level: 1, name: item.label })).toBeVisible();
      }
    });
  }
});

test.describe("live nav pages", () => {
  for (const href of ["/contributions", "/resources"] as const) {
    test(`${href} renders real content (no placeholder copy)`, async ({ page }) => {
      await page.goto(href);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.getByText("This section is under construction.")).toHaveCount(0);
    });
  }

  test("/playground renders the playground gallery (no site chrome)", async ({ page }) => {
    await page.goto("/playground");
    await expect(page.getByRole("heading", { level: 1, name: "Playground" })).toBeVisible();
    await expect(page.getByText("This section is under construction.")).toHaveCount(0);
    // Playground route group has no header — site nav should not be present.
    await expect(page.getByRole("navigation", { name: "Primary" })).toHaveCount(0);
  });
});

test.describe("404 page", () => {
  test("nonexistent route renders custom 404", async ({ page }) => {
    const response = await page.goto("/this-route-does-not-exist");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Return home" })).toBeVisible();
  });
});

test.describe("mobile navigation", () => {
  test.use({ viewport: MOBILE_VIEWPORT });

  test("hamburger button is visible and desktop nav is hidden", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Open menu" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Primary" })).toBeHidden();
  });

  test("opening the menu reveals all nav links", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Open menu" }).click();

    const mobileNav = page.getByRole("navigation", { name: "Mobile" });
    await expect(mobileNav).toBeVisible();
    for (const item of siteConfig.navItems) {
      await expect(mobileNav.getByRole("link", { name: item.label })).toBeVisible();
    }
  });

  test("selecting a link navigates and closes the menu", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Open menu" }).click();

    const mobileNav = page.getByRole("navigation", { name: "Mobile" });
    await mobileNav.getByRole("link", { name: "Projects" }).click();

    await expect(page).toHaveURL("/projects");
    await expect(page.getByRole("navigation", { name: "Mobile" })).toBeHidden();
  });
});
