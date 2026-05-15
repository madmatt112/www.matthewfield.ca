import { expect, test } from "@playwright/test";

import { siteConfig } from "../../src/config/site";

// Tailwind's lg breakpoint is 1024px — DesktopNav shows at >=1024, MobileNav
// hamburger shows at <1024. We use 375x667 (iPhone SE) to exercise a
// phone-sized viewport representative of the target audience.
const MOBILE_VIEWPORT = { width: 375, height: 667 };

// /profile is no longer a placeholder — replaced by the professional-profile
// spec (its h1 is the Velite-sourced headline, not the nav label). All other
// nav targets still render the placeholder shell with `name === item.label`.
const navItemsWithLabelH1 = siteConfig.navItems.filter((item) => item.href !== "/profile");

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

test.describe("placeholder pages", () => {
  const placeholderRoutes = navItemsWithLabelH1.filter((item) => item.href !== "/playground");

  for (const item of placeholderRoutes) {
    test(`${item.href} renders placeholder with "under construction" text`, async ({ page }) => {
      await page.goto(item.href);
      await expect(page.getByRole("heading", { level: 1, name: item.label })).toBeVisible();
      await expect(page.getByText("This section is under construction.")).toBeVisible();
    });
  }

  test("/playground renders playground placeholder (no site chrome)", async ({ page }) => {
    await page.goto("/playground");
    await expect(page.getByRole("heading", { level: 1, name: "Playground" })).toBeVisible();
    await expect(page.getByText("This section is under construction.")).toBeVisible();
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
