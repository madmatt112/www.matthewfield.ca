import { expect, test } from "@playwright/test";

// Verifies the Shiki dual-theme cascade works WITHOUT JavaScript:
// - JS-disabled context (no next-themes hydration, no .light/.dark class on <html>)
// - prefers-color-scheme drives `--shiki-active` via the @media query in globals.css
// - first code-token span on /blog/fixture-code resolves to the expected plaintext hex
//
// Expected hexes (Shiki published theme JSON):
//   github-light plaintext = #24292e -> rgb(36, 41, 46)
//   github-dark plaintext  = #e1e4e8 -> rgb(225, 228, 232)

const PATH = "/blog/fixture-code";

// First span inside the rehype-pretty-code figure that carries a plaintext color
// (i.e. matches the expected rgb). We pick by walking spans rather than
// asserting on the first one, because Shiki emits keyword/comment tokens with
// different colors — the plaintext color belongs to identifiers and literals.
const COLOR_SELECTOR = "[data-rehype-pretty-code-figure] pre code span";

function parseRgb(value: string): [number, number, number] | null {
  const m = value.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

async function readCodeBlockColors(page: import("@playwright/test").Page) {
  return page.evaluate((selector) => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(selector));
    return nodes.map((el) => window.getComputedStyle(el).color);
  }, COLOR_SELECTOR);
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

test.describe("blog code-block no-JS theme (system preference drives Shiki cascade)", () => {
  test.use({ javaScriptEnabled: false });

  test("dark system preference renders github-dark plaintext hex", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto(PATH);
    await expect(page.locator(COLOR_SELECTOR).first()).toBeVisible();

    const colors = await readCodeBlockColors(page);
    expect(colors.length).toBeGreaterThan(0);
    expect(rgbsContain(colors, [225, 228, 232])).toBe(true);
  });

  test("light system preference renders github-light plaintext hex", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto(PATH);
    await expect(page.locator(COLOR_SELECTOR).first()).toBeVisible();

    const colors = await readCodeBlockColors(page);
    expect(colors.length).toBeGreaterThan(0);
    expect(rgbsContain(colors, [36, 41, 46])).toBe(true);
  });
});

// Extended no-JS coverage (Task 35): verifies the bot-friendly / progressive-
// enhancement surfaces work under `javaScriptEnabled: false`.
//   - TOC anchors navigate to in-page `#hash` targets
//   - Footnote references navigate to definitions (and back)
//   - Share-bar anchors expose correct hrefs (X, LinkedIn, mailto)
//   - Copy URL button renders but is inert (no clipboard write)
//   - Reading-progress bar absent or empty (no JS = no scroll-driven width)
//   - Search trigger button is hidden by the <noscript> CSS rule
test.describe("blog surfaces under no-JS (TOC, footnotes, share, progress, search)", () => {
  test.use({ javaScriptEnabled: false });

  test("/blog/fixture-toc renders TOC and anchor click navigates to #hash", async ({ page }) => {
    await page.goto("/blog/fixture-toc");

    const toc = page.locator("nav[aria-label='On this page']");
    await expect(toc).toBeVisible();

    const firstLink = toc.locator("a.toc-link").first();
    const href = await firstLink.getAttribute("href");
    expect(href).toMatch(/^#.+/);

    await firstLink.click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
  });

  test("/blog/fixture-footnotes renders footnote refs that navigate to definitions", async ({
    page,
  }) => {
    await page.goto("/blog/fixture-footnotes");

    // GFM footnotes render as <sup><a href="#user-content-fn-1" id="user-content-fnref-1"> ...
    const firstRef = page.locator("a[href^='#user-content-fn-']").first();
    await expect(firstRef).toBeVisible();
    const targetHash = await firstRef.getAttribute("href");
    expect(targetHash).toMatch(/^#user-content-fn-\d+$/);

    await firstRef.click();
    await expect(page).toHaveURL(new RegExp(`${targetHash}$`));

    // Definitions section is present.
    await expect(page.locator("section.footnotes, [data-footnotes]").first()).toBeVisible();
  });

  test("/blog/fixture-code share-bar anchors carry correct hrefs", async ({ page }) => {
    await page.goto("/blog/fixture-code");

    const shareBar = page.locator("section[aria-label='Share this post']");
    await expect(shareBar).toBeVisible();

    const xLink = shareBar.locator("a[aria-label='Share on X (Twitter)']");
    const liLink = shareBar.locator("a[aria-label='Share on LinkedIn']");
    const mailLink = shareBar.locator("a[aria-label='Share via email']");

    await expect(xLink).toHaveAttribute("href", /^https:\/\/twitter\.com\/intent\/tweet\?/);
    await expect(liLink).toHaveAttribute(
      "href",
      /^https:\/\/www\.linkedin\.com\/sharing\/share-offsite\/\?/,
    );
    await expect(mailLink).toHaveAttribute("href", /^mailto:\?/);
  });

  test("/blog/fixture-code copy URL button renders but is inert without JS", async ({ page }) => {
    await page.goto("/blog/fixture-code");

    const copyBtn = page.locator(".share-bar-copy");
    await expect(copyBtn).toBeVisible();

    // Click should not throw, and (without JS) the clipboard cannot be written.
    // We can't read the clipboard under javaScriptEnabled:false, so the
    // assertion focuses on the button still being in the idle state.
    await copyBtn.click({ trial: false }).catch(() => {});
    await expect(copyBtn).toHaveAttribute("data-copy-state", "idle");
  });

  test("/blog/fixture-code reading-progress bar is absent or empty without JS", async ({
    page,
  }) => {
    await page.goto("/blog/fixture-code");

    const fill = page.locator(".reading-progress-fill");
    const count = await fill.count();
    if (count > 0) {
      // SSR-rendered shell allowed; the inline width should be 0% (no JS to set it).
      const style = await fill.getAttribute("style");
      expect(style ?? "").toMatch(/width:\s*0%/);
    }
  });

  test("/blog/fixture-code search trigger button is hidden by <noscript> CSS", async ({ page }) => {
    await page.goto("/blog/fixture-code");

    const trigger = page.locator("[data-search-trigger]");
    // Element may exist in DOM but the inline <noscript><style> sets display:none.
    await expect(trigger).toBeHidden();
  });
});
