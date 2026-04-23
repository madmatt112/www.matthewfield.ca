import { expect, test } from "@playwright/test";

// next-themes is configured in src/app/layout.tsx with attribute="class",
// defaultTheme="system", enableSystem. Selected theme persists in
// localStorage under the default key "theme". Each Playwright test gets a
// fresh browser context, so localStorage is isolated between tests.

test.describe("theme toggle — light system preference", () => {
  test.use({ colorScheme: "light" });

  test("initial render resolves to light when system prefers light", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).not.toHaveClass(/\bdark\b/);
  });

  test("selecting Dark applies the dark class and persists across reload", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Toggle theme" }).click();
    await page.getByRole("menuitem", { name: "Dark" }).click();
    await expect(page.locator("html")).toHaveClass(/\bdark\b/);

    await page.reload();
    await expect(page.locator("html")).toHaveClass(/\bdark\b/);
  });

  test("selecting Light removes the dark class", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Toggle theme" }).click();
    await page.getByRole("menuitem", { name: "Dark" }).click();
    await expect(page.locator("html")).toHaveClass(/\bdark\b/);

    await page.getByRole("button", { name: "Toggle theme" }).click();
    await page.getByRole("menuitem", { name: "Light" }).click();
    await expect(page.locator("html")).not.toHaveClass(/\bdark\b/);
  });
});

test.describe("theme toggle — dark system preference", () => {
  test.use({ colorScheme: "dark" });

  test("initial render resolves to dark when system prefers dark", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveClass(/\bdark\b/);
  });

  test("selecting System follows dark system preference", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Toggle theme" }).click();
    await page.getByRole("menuitem", { name: "Light" }).click();
    await expect(page.locator("html")).not.toHaveClass(/\bdark\b/);

    await page.getByRole("button", { name: "Toggle theme" }).click();
    await page.getByRole("menuitem", { name: "System" }).click();
    await expect(page.locator("html")).toHaveClass(/\bdark\b/);
  });
});
