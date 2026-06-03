import { expect, test } from "@playwright/test";

import { THEME_STORAGE_KEY } from "../../../src/components/layout/theme-provider";

// Per-component preview smoke for the `.pagefind-ui` theme-parity slice
// (Task 18.9). The override slice rebinds @pagefind/default-ui's internal
// `--pagefind-ui-*` CSS variables onto the site's shadcn/ui tokens so the
// search dialog inherits site theme parity in both light and dark.
//
// This smoke is preview-route only — it does NOT exercise the real
// dialog (that is Task 31's concern). It mounts a static stub element
// tree shaped like the package's emitted DOM and asserts the override
// flows through to computed `color` + `background-color` on both the
// `.pagefind-ui` root and a `.pagefind-ui__result-link` descendant in
// both color schemes.
//
// The preview route is gated on BLOG_INCLUDE_DRAFTS=1; the webServer in
// e2e/playwright.config.ts inherits the parent shell env, so CI sets
// BLOG_INCLUDE_DRAFTS=1 on the Playwright job (see .github/workflows/ci.yml).
// Locally: BLOG_INCLUDE_DRAFTS=1 pnpm test:e2e.

const PATH = "/blog/component-preview/pagefind-ui";
const ROOT_SELECTOR = ".pagefind-ui";
const RESULT_LINK_SELECTOR = ".pagefind-ui .pagefind-ui__result-link";
const SEARCH_INPUT_SELECTOR = ".pagefind-ui .pagefind-ui__search-input";

type Colors = { color: string; backgroundColor: string };

test.describe("component preview: pagefind-ui", () => {
  test("rebinds @pagefind/default-ui variables onto site theme tokens; light + dark parity", async ({
    page,
  }) => {
    // Light theme — emulate prefers-color-scheme AND clear localStorage so
    // next-themes (defaultTheme="system", enableSystem) follows the media
    // query rather than a stale stored preference from a prior test.
    await page.emulateMedia({ colorScheme: "light" });
    await page.addInitScript((key) => {
      try {
        window.localStorage.removeItem(key);
      } catch {
        /* localStorage may be unavailable; theme falls back to media query. */
      }
    }, THEME_STORAGE_KEY);
    await page.goto(PATH);
    await expect(page.locator("html")).not.toHaveClass(/\bdark\b/);

    const root = page.locator(ROOT_SELECTOR);
    await expect(root).toBeVisible();

    const link = page.locator(RESULT_LINK_SELECTOR);
    await expect(link).toBeVisible();

    const input = page.locator(SEARCH_INPUT_SELECTOR);
    await expect(input).toBeVisible();

    // The slice rebinds --pagefind-ui-text on the .pagefind-ui root.
    // Confirm the override is wired (not the package's hardcoded #393939
    // fallback) by reading the custom-property value through the cascade.
    const tokensLight = await root.evaluate((el) => {
      const cs = window.getComputedStyle(el);
      return {
        text: cs.getPropertyValue("--pagefind-ui-text").trim(),
        background: cs.getPropertyValue("--pagefind-ui-background").trim(),
        border: cs.getPropertyValue("--pagefind-ui-border").trim(),
        primary: cs.getPropertyValue("--pagefind-ui-primary").trim(),
      };
    });
    // Non-empty values prove the slice cascaded — defaults from the
    // package's `:root` are hex strings; ours resolve to oklch(…) from
    // tokens.css. Either way, presence (not absence) is the contract.
    expect(tokensLight.text).not.toBe("");
    expect(tokensLight.background).not.toBe("");
    expect(tokensLight.border).not.toBe("");
    expect(tokensLight.primary).not.toBe("");
    // Override must replace the package's hardcoded light hex defaults.
    expect(tokensLight.text).not.toBe("#393939");
    expect(tokensLight.background).not.toBe("#ffffff");
    expect(tokensLight.border).not.toBe("#eeeeee");

    // Sample-element computed colors in light theme.
    const linkLight: Colors = await link.evaluate((el) => {
      const cs = window.getComputedStyle(el);
      return { color: cs.color, backgroundColor: cs.backgroundColor };
    });
    const inputLight: Colors = await input.evaluate((el) => {
      const cs = window.getComputedStyle(el);
      return { color: cs.color, backgroundColor: cs.backgroundColor };
    });
    // Sanity: actually-computed (non-empty) values.
    expect(linkLight.color).not.toBe("");
    expect(inputLight.backgroundColor).not.toBe("");

    // Dark theme — explicitly stamp localStorage with "dark" BEFORE the
    // page script runs. next-themes resolves storage > prefers-color-scheme,
    // so this guarantees the .dark class lands on <html> regardless of the
    // (possibly stale) emulated media query.
    await page.emulateMedia({ colorScheme: "dark" });
    await page.addInitScript(
      ({ key, value }) => {
        try {
          window.localStorage.setItem(key, value);
        } catch {
          /* localStorage may be unavailable; theme falls back to media query. */
        }
      },
      { key: THEME_STORAGE_KEY, value: "dark" },
    );
    await page.goto(PATH);
    await expect(page.locator(ROOT_SELECTOR)).toBeVisible();
    await expect(page.locator("html")).toHaveClass(/\bdark\b/);

    const linkDark: Colors = await page.locator(RESULT_LINK_SELECTOR).evaluate((el) => {
      const cs = window.getComputedStyle(el);
      return { color: cs.color, backgroundColor: cs.backgroundColor };
    });

    // Re-read the rebound CSS variables under the dark cascade. The
    // package's own selectors apply background-color via these variables
    // at runtime; in the static preview stub there is no
    // `@pagefind/default-ui` CSS loaded, so the computed `background-color`
    // on the input element stays `rgba(0,0,0,0)` (transparent) regardless
    // of the rebind. Asserting the variable VALUES flip is the right
    // contract for the slice — confirming that the package's selectors
    // would consume different values in the two color schemes.
    const tokensDark = await page.locator(ROOT_SELECTOR).evaluate((el) => {
      const cs = window.getComputedStyle(el);
      return {
        text: cs.getPropertyValue("--pagefind-ui-text").trim(),
        background: cs.getPropertyValue("--pagefind-ui-background").trim(),
        border: cs.getPropertyValue("--pagefind-ui-border").trim(),
        primary: cs.getPropertyValue("--pagefind-ui-primary").trim(),
      };
    });

    // Theme-parity proof: the rebound `--pagefind-ui-text` and
    // `--pagefind-ui-background` must differ between light and dark
    // because they pull from `--foreground` / `--background`, which flip
    // under the `.dark` class. The link's resolved `color` already
    // confirms the cascade on a real element; the variable comparison
    // covers `background` (which has no host rule in the stub).
    expect(linkLight.color).not.toBe(linkDark.color);
    expect(tokensLight.background).not.toBe(tokensDark.background);
    expect(tokensLight.text).not.toBe(tokensDark.text);
  });
});
