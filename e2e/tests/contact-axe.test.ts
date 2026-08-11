import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { THEME_STORAGE_KEY } from "../../src/components/layout/theme-provider";

const PAGES: Array<"/profile" | "/contact" | "/contributions"> = [
  "/profile",
  "/contact",
  "/contributions",
];
const THEMES: Array<"light" | "dark"> = ["light", "dark"];
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

test.describe("profile + contact + contributions axe-core a11y (parameterized by page and theme)", () => {
  for (const path of PAGES) {
    for (const theme of THEMES) {
      test(`${path} is axe-clean in ${theme} theme`, async ({ page }) => {
        if (theme === "dark") {
          await page.addInitScript(
            ({ key, value }) => {
              localStorage.setItem(key, value);
            },
            { key: THEME_STORAGE_KEY, value: "dark" },
          );
        }

        await page.goto(path);

        if (theme === "dark") {
          await expect(page.locator("html")).toHaveClass(/\bdark\b/);
        } else {
          await expect(page.locator("html")).not.toHaveClass(/\bdark\b/);
        }

        const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
        expect(results.violations).toEqual([]);
      });
    }
  }
});
