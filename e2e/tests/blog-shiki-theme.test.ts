import { expect, test } from "@playwright/test";

import { THEME_STORAGE_KEY } from "../../src/components/layout/theme-provider";

// Verifies explicit user-toggle beats prefers-color-scheme for the Shiki
// cascade (Req 9.2, 13.7). next-themes writes localStorage[THEME_STORAGE_KEY],
// and the `.light` / `.dark` class on <html> overrides the @media (prefers-
// color-scheme: dark) :not(.light):not(.dark) guard in globals.css.
//
// Expected token hexes (Shiki published theme JSON):
//   github-light plaintext = #24292e -> rgb(36, 41, 46)
//   github-dark plaintext  = #e1e4e8 -> rgb(225, 228, 232)

const PATH = "/blog/fixture-code";
const COLOR_SELECTOR = "[data-rehype-pretty-code-figure] pre code span";

function parseRgb(value: string): [number, number, number] | null {
  const m = value.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

function rgbsContain(colors: string[], target: [number, number, number]): boolean {
  return colors.some((c) => {
    const parsed = parseRgb(c);
    return (
      parsed !== null &&
      parsed[0] === target[0] &&
      parsed[1] === target[1] &&
      parsed[2] === target[2]
    );
  });
}

async function setStoredTheme(page: import("@playwright/test").Page, value: "light" | "dark") {
  await page.addInitScript(
    ({ key, val }) => {
      localStorage.setItem(key, val);
    },
    { key: THEME_STORAGE_KEY, val: value },
  );
}

async function readCodeBlockColors(page: import("@playwright/test").Page) {
  return page.evaluate((selector) => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(selector));
    return nodes.map((el) => window.getComputedStyle(el).color);
  }, COLOR_SELECTOR);
}

test.describe("blog Shiki explicit-override theme (toggle beats system)", () => {
  test("dark system + stored 'light' resolves to github-light plaintext", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await setStoredTheme(page, "light");

    await page.goto(PATH);
    await expect(page.locator("html")).not.toHaveClass(/\bdark\b/);
    await expect(page.locator(COLOR_SELECTOR).first()).toBeVisible();

    const colors = await readCodeBlockColors(page);
    expect(colors.length).toBeGreaterThan(0);
    expect(rgbsContain(colors, [36, 41, 46])).toBe(true);
  });

  test("light system + stored 'dark' resolves to github-dark plaintext", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await setStoredTheme(page, "dark");

    await page.goto(PATH);
    await expect(page.locator("html")).toHaveClass(/\bdark\b/);
    await expect(page.locator(COLOR_SELECTOR).first()).toBeVisible();

    const colors = await readCodeBlockColors(page);
    expect(colors.length).toBeGreaterThan(0);
    expect(rgbsContain(colors, [225, 228, 232])).toBe(true);
  });
});

// Code-block-wrapper structural assertions (Task 35 v3/v4 pin): the rehype-
// copy-button transform wraps every <pre> in a `<div class="code-block-wrapper"
// data-code-block="">` and appends a `<button data-copy-button>` sibling. This
// must hold in BOTH themes, and the wrapper must NOT carry the deprecated
// `data-code-language` attribute (v3 contract).
test.describe("blog code-block wrapper structure (theme parity)", () => {
  for (const theme of ["light", "dark"] as const) {
    test(`code-block-wrapper renders with copy button in ${theme} theme`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme });
      await setStoredTheme(page, theme);

      await page.goto(PATH);

      const wrapper = page.locator(".code-block-wrapper").first();
      await expect(wrapper).toBeVisible();
      await expect(wrapper).toHaveAttribute("data-code-block", "");
      // v3 contract: the wrapper must NOT carry data-code-language.
      const hasLangAttr = await wrapper.evaluate((el) =>
        el.hasAttribute("data-code-language"),
      );
      expect(hasLangAttr).toBe(false);

      const copyButton = wrapper.locator("button[data-copy-button]").first();
      await expect(copyButton).toBeVisible();
    });
  }
});
