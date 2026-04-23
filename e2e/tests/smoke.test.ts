import { expect, test } from "@playwright/test";

test("home page loads with title and visible heading", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/matthew-field\.ca/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});
