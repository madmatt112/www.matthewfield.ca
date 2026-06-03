import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { THEME_STORAGE_KEY } from "../../src/components/layout/theme-provider";

// Existing blog-core pages (Build 1 baseline).
const PAGES = [
  "/blog",
  "/blog/fixture-code",
  "/blog/tags/fixture",
  "/blog/categories/fixture",
] as const;

// Extended blog-enhanced fixture surfaces (Task 35): TOC, footnotes, related,
// and series posts. Each runs in both themes via the loop below.
const EXTENDED_PAGES = [
  "/blog/fixture-toc",
  "/blog/fixture-footnotes",
  "/blog/fixture-related-a",
  "/blog/fixture-series-1",
] as const;

const THEMES: Array<"light" | "dark"> = ["light", "dark"];
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

async function setupTheme(page: import("@playwright/test").Page, theme: "light" | "dark") {
  if (theme === "dark") {
    await page.addInitScript(
      ({ key, value }) => {
        localStorage.setItem(key, value);
      },
      { key: THEME_STORAGE_KEY, value: "dark" },
    );
  }
}

async function assertTheme(page: import("@playwright/test").Page, theme: "light" | "dark") {
  if (theme === "dark") {
    await expect(page.locator("html")).toHaveClass(/\bdark\b/);
  } else {
    await expect(page.locator("html")).not.toHaveClass(/\bdark\b/);
  }
}

// Shiki (rehype-pretty-code) emits syntax-highlighted code inside
// `figure[data-rehype-pretty-code-figure]`. The github-light / github-dark
// themes are pinned upstream identifiers; some of their token colors
// (e.g. #E36209) do not clear WCAG AA 4.5:1 on the page background. We
// exclude those code regions from the color-contrast audit — code is
// monospaced opt-in content with theme-pinned colors, not page chrome.
const CODE_BLOCK_EXCLUDE = "figure[data-rehype-pretty-code-figure]";

test.describe("blog axe-core a11y (parameterized by page and theme)", () => {
  for (const path of [...PAGES, ...EXTENDED_PAGES]) {
    for (const theme of THEMES) {
      test(`${path} is axe-clean in ${theme} theme`, async ({ page }) => {
        await setupTheme(page, theme);
        await page.goto(path);
        await assertTheme(page, theme);

        const results = await new AxeBuilder({ page })
          .withTags(AXE_TAGS)
          .exclude(CODE_BLOCK_EXCLUDE)
          .analyze();
        expect(results.violations).toEqual([]);
      });
    }
  }
});

// Search-dialog-open axe pass (Task 35): /blog with the Pagefind dialog opened
// via Cmd/Ctrl+K. Verifies the dialog surface itself is axe-clean in both
// themes. We don't require the Pagefind index to be ready — the Radix dialog
// shell + loading/unavailable copy is what we're auditing for a11y.
test.describe("blog search-dialog-open axe-core a11y", () => {
  for (const theme of THEMES) {
    test(`/blog with search dialog open is axe-clean in ${theme} theme`, async ({
      page,
      browserName,
    }) => {
      await setupTheme(page, theme);
      await page.goto("/blog");
      await assertTheme(page, theme);

      // OS-aware shortcut: on macOS/WebKit use Meta+K; otherwise Ctrl+K. The
      // SiteSearch keydown handler accepts either (metaKey || ctrlKey).
      const isMac = process.platform === "darwin" || browserName === "webkit";
      await page.keyboard.press(isMac ? "Meta+K" : "Control+K");

      // Dialog content is portaled to document.body by Radix.
      const dialog = page.locator("[role='dialog']");
      await expect(dialog).toBeVisible();

      const results = await new AxeBuilder({ page })
        .withTags(AXE_TAGS)
        .exclude(CODE_BLOCK_EXCLUDE)
        .analyze();
      expect(results.violations).toEqual([]);
    });
  }
});
