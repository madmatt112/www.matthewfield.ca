import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { THEME_STORAGE_KEY } from "../../src/components/layout/theme-provider";

// Playground E2E capstone (Task 16). Runs against the prod `pnpm start`
// build (Webpack) via e2e/playwright.config.ts so @layer ordering +
// CSS-Module hashing match production. Select by data-testid only — never
// hashed class (Req 10.3). iframe sizing is a RATIO assertion (F7), not an
// absolute box, because an `aspect-ratio` + `w-full` iframe derives its
// height from the test-viewport width.

const THEMES: Array<"light" | "dark"> = ["light", "dark"];

// COPIED (non-exported in sibling suites) — setupTheme / assertTheme / AXE_TAGS.
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

async function setupTheme(
  page: import("@playwright/test").Page,
  theme: "light" | "dark",
) {
  if (theme === "dark") {
    await page.addInitScript(
      ({ key, value }) => {
        localStorage.setItem(key, value);
      },
      { key: THEME_STORAGE_KEY, value: "dark" },
    );
  }
}

async function assertTheme(
  page: import("@playwright/test").Page,
  theme: "light" | "dark",
) {
  if (theme === "dark") {
    await expect(page.locator("html")).toHaveClass(/\bdark\b/);
  } else {
    await expect(page.locator("html")).not.toHaveClass(/\bdark\b/);
  }
}

// Stable sample slugs (hardcoded — the E2E does not import the manifest).
const SAME_PAGE_SLUG = "scribble-pad";
const IFRAME_SLUG = "starfield";

test.describe("playground E2E (parameterized by theme)", () => {
  for (const theme of THEMES) {
    test(`gallery → same-page sample renders inside the container (${theme})`, async ({
      page,
    }) => {
      await setupTheme(page, theme);
      await page.goto("/playground");
      await assertTheme(page, theme);

      // Click the gallery card linking to the same-page sample.
      await page.locator(`a[href="/playground/${SAME_PAGE_SLUG}"]`).click();
      await page.waitForURL(`**/playground/${SAME_PAGE_SLUG}`);

      // The same-page item content renders inside the reset boundary.
      const container = page.getByTestId("playground-container");
      await expect(container).toBeVisible();
      // The migrated isolation hooks live inside the container.
      await expect(container.getByTestId("sample-leak-probe")).toBeVisible();
    });

    test(`gallery → iframe sample loads with the expected 16:10 ratio (${theme})`, async ({
      page,
    }) => {
      await setupTheme(page, theme);
      await page.goto("/playground");
      await assertTheme(page, theme);

      await page.locator(`a[href="/playground/${IFRAME_SLUG}"]`).click();
      await page.waitForURL(`**/playground/${IFRAME_SLUG}`);

      const iframe = page.locator("iframe");
      await expect(iframe).toBeVisible();

      // The embed document loaded — its single <h1> is reachable through the frame.
      const embed = page.frameLocator("iframe");
      await expect(embed.locator("h1")).toHaveCount(1);

      const box = await iframe.boundingBox();
      expect(box).not.toBeNull();
      // RATIO assertion (F7): width spans the column (> 0) AND
      // height ≈ width × 10/16 within tolerance. NOT an absolute px box.
      expect(box!.width).toBeGreaterThan(0);
      const expectedHeight = (box!.width * 10) / 16;
      expect(box!.height).toBeGreaterThan(0);
      expect(Math.abs(box!.height - expectedHeight)).toBeLessThanOrEqual(2);
    });
  }

  // 404 behavior (Req 3.2, 4.5). Theme-independent.
  test("unknown slug 404s", async ({ page }) => {
    const response = await page.goto("/playground/does-not-exist");
    expect(response?.status()).toBe(404);
  });

  test("a same-page slug's /embed 404s", async ({ page }) => {
    const response = await page.goto(`/playground/${SAME_PAGE_SLUG}/embed`);
    expect(response?.status()).toBe(404);
  });

  // Embed a11y (Req 4.6): the embed document has a <title> and a single <h1>.
  test("starfield embed document has a title and a single h1", async ({ page }) => {
    await page.goto(`/playground/${IFRAME_SLUG}/embed`);
    await expect(page).toHaveTitle(/starfield/i);
    await expect(page.locator("h1")).toHaveCount(1);
  });
});

// Console / page-error cleanliness. Attach console (error-level only) +
// pageerror listeners; assert no errors on the gallery + both landing pages.
// No Pagefind carve-out — the search dialog is never opened here.
test.describe("playground console / page-error cleanliness", () => {
  const PATHS = [
    "/playground",
    `/playground/${SAME_PAGE_SLUG}`,
    `/playground/${IFRAME_SLUG}`,
  ];

  for (const theme of THEMES) {
    for (const path of PATHS) {
      test(`${path} is console/page-error clean (${theme})`, async ({ page }) => {
        const errors: string[] = [];
        page.on("console", (msg) => {
          if (msg.type() === "error") errors.push(msg.text());
        });
        page.on("pageerror", (err) => {
          errors.push(err.message);
        });

        await setupTheme(page, theme);
        await page.goto(path);
        await assertTheme(page, theme);
        await page.waitForLoadState("networkidle");

        expect(errors).toEqual([]);
      });
    }
  }
});

// Axe/WCAG pass (NFR Accessibility, blocking). Same AxeBuilder().withTags()
// pattern as blog-axe.test.ts. Run on the gallery and the iframe LANDING
// (themed, indexable, real-content pages) in each theme. The same-page item
// SURFACE is EXEMPT (the toy intentionally subverts conventions); the gallery
// + iframe-landing chrome are NOT exempt.
test.describe("playground axe-core a11y", () => {
  const AXE_PATHS = ["/playground", `/playground/${IFRAME_SLUG}`];

  for (const path of AXE_PATHS) {
    for (const theme of THEMES) {
      test(`${path} is axe-clean in ${theme} theme`, async ({ page }) => {
        await setupTheme(page, theme);
        await page.goto(path);
        await assertTheme(page, theme);

        const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
        expect(results.violations).toEqual([]);
      });
    }
  }
});
