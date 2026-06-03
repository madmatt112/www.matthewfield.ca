import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { THEME_STORAGE_KEY } from "../../src/components/layout/theme-provider";

const SLASH_PAGES = ["/about", "/now", "/colophon", "/sitemap", "/slashes"] as const;

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

for (const theme of THEMES) {
  test.describe(`slash pages — ${theme} theme`, () => {
    for (const path of SLASH_PAGES) {
      test(`${path} renders correctly`, async ({ page }) => {
        const errors: string[] = [];
        page.on("console", (msg) => {
          if (msg.type() === "error") errors.push(msg.text());
        });
        page.on("pageerror", (err) => errors.push(err.message));

        await setupTheme(page, theme);
        const response = await page.goto(path);
        expect(response?.status()).toBe(200);

        await assertTheme(page, theme);

        // Every slash page must have an h1
        await expect(page.locator("h1").first()).toBeVisible();

        // Title must match site pattern
        await expect(page).toHaveTitle(/\| matthewfield\.ca$/);

        // No console errors
        expect(errors).toEqual([]);
      });
    }

    test(`/now has a <time> element`, async ({ page }) => {
      await setupTheme(page, theme);
      await page.goto("/now");
      await expect(page.locator("time").first()).toBeVisible();
    });

    test(`/colophon external links have rel containing "noopener"`, async ({ page }) => {
      await setupTheme(page, theme);
      await page.goto("/colophon");

      // Select anchors whose href starts with http or https and whose host
      // differs from the site host (excludes mailto and hostless hrefs).
      const siteHost = new URL(page.url()).host;
      const anchors = page.locator("a[href^='http']");
      const count = await anchors.count();

      for (let i = 0; i < count; i++) {
        const href = await anchors.nth(i).getAttribute("href");
        if (!href) continue;
        let parsedHost: string;
        try {
          parsedHost = new URL(href).host;
        } catch {
          continue;
        }
        if (parsedHost === siteHost) continue;

        const rel = await anchors.nth(i).getAttribute("rel");
        expect(rel, `Expected ${href} to have rel containing "noopener"`).toMatch(/\bnoopener\b/);
      }
    });

    test(`/sitemap static-section links all resolve`, async ({ page }) => {
      await setupTheme(page, theme);
      await page.goto("/sitemap");

      // Collect hrefs from Home section (/) + nav sections + slash pages sections
      // These are all internal relative hrefs (starting with /).
      const linkLocators = page.locator("article a[href^='/']");
      const count = await linkLocators.count();
      expect(count).toBeGreaterThan(0);

      const hrefs = new Set<string>();
      for (let i = 0; i < count; i++) {
        const href = await linkLocators.nth(i).getAttribute("href");
        if (href) hrefs.add(href);
      }

      for (const href of hrefs) {
        const response = await page.request.get(href);
        expect(response.ok(), `${href} returned ${response.status()}`).toBe(true);
      }
    });

    test(`/slashes all links resolve`, async ({ page }) => {
      await setupTheme(page, theme);
      await page.goto("/slashes");

      // Scope to <article> to pick up only the slash-page list links and
      // exclude footer externals (LinkedIn, GitHub) which block headless GETs.
      const linkLocators = page.locator("article a[href]");
      const count = await linkLocators.count();
      expect(count).toBeGreaterThan(0);

      const hrefs = new Set<string>();
      for (let i = 0; i < count; i++) {
        const href = await linkLocators.nth(i).getAttribute("href");
        if (href) hrefs.add(href);
      }

      for (const href of hrefs) {
        const response = await page.request.get(href);
        expect(response.ok(), `${href} returned ${response.status()}`).toBe(true);
      }
    });

    test.describe(`axe-core a11y`, () => {
      for (const path of SLASH_PAGES) {
        test(`${path} is axe-clean in ${theme} theme`, async ({ page }) => {
          await setupTheme(page, theme);
          await page.goto(path);
          await assertTheme(page, theme);

          const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
          expect(results.violations).toEqual([]);
        });
      }
    });
  });
}
