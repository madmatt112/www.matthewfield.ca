import { expect, test, type Page } from "@playwright/test";

// Task 41 (blog-enhanced): mechanically verify Req 5.5 — the reading-progress
// bar (Task 18.5) honours `prefers-reduced-motion: reduce`. The component
// renders `.reading-progress-fill` whose width-transition duration is wired
// to the CSS variable `--reading-progress-transition`. The variable resolves
// to `100ms ease-out` by default and is swapped to `0ms` under the
// `@media (prefers-reduced-motion: reduce)` block in
// `src/styles/blog/reading-progress.css`.
//
// We verify the swap from both ends:
//   1. WITH `emulateMedia({ reducedMotion: 'reduce' })` — computed
//      `transition-duration` AND `animation-duration` must be zero.
//   2. WITHOUT the emulation — at least one of those durations must be
//      non-zero, so a future "always-zero" regression (e.g. someone hard-
//      coding `transition: none`) cannot silently pass the reduced-motion
//      assertion.
//
// Assertions read `window.getComputedStyle(el)` — never inline styles —
// per Task 41 restrictions.

const PATH = "/blog/fixture-toc";
const FILL_SELECTOR = ".reading-progress-fill";

function parseDurationSeconds(value: string): number {
  // computed values are normalised to either `Xs` or `Xms` (or a
  // comma-separated list when multiple transition/animation entries
  // are declared). We take the MAX across the list: if any individual
  // entry is non-zero, the element animates.
  return value
    .split(",")
    .map((piece) => piece.trim())
    .map((piece) => {
      if (piece.endsWith("ms")) return Number.parseFloat(piece) / 1000;
      if (piece.endsWith("s")) return Number.parseFloat(piece);
      return 0;
    })
    .reduce((max, n) => (n > max ? n : max), 0);
}

async function readMotionDurations(
  page: Page,
  selector: string,
): Promise<{ transitionSeconds: number; animationSeconds: number }> {
  const fill = page.locator(selector);
  await expect(fill).toBeVisible();
  const raw = await fill.evaluate((el) => {
    const cs = window.getComputedStyle(el);
    return {
      transitionDuration: cs.transitionDuration,
      animationDuration: cs.animationDuration,
    };
  });
  return {
    transitionSeconds: parseDurationSeconds(raw.transitionDuration),
    animationSeconds: parseDurationSeconds(raw.animationDuration),
  };
}

async function scrollHalfway(page: Page): Promise<void> {
  await page.evaluate(() => {
    const article = document.querySelector("article");
    if (!article) throw new Error("no <article> on page");
    const rect = article.getBoundingClientRect();
    // Scroll so the viewport sits ~halfway down the article. The progress
    // bar's fill width updates on scroll; we just need a non-degenerate
    // layout state for computed-style queries to be meaningful.
    window.scrollTo({ top: window.scrollY + rect.top + rect.height / 2, behavior: "auto" });
  });
  // Give the rAF-throttled scroll listener a beat to paint.
  await page.waitForTimeout(50);
}

test.describe("blog reading-progress bar — prefers-reduced-motion (Req 5.5)", () => {
  test("with reducedMotion=reduce: computed transition + animation durations are zero", async ({
    page,
  }) => {
    // emulateMedia BEFORE navigation so the media-query matches at first paint
    // (matches the convention pinned in contact-reduced-motion.test.ts).
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(PATH);
    await scrollHalfway(page);

    const { transitionSeconds, animationSeconds } = await readMotionDurations(
      page,
      FILL_SELECTOR,
    );

    expect(transitionSeconds).toBe(0);
    expect(animationSeconds).toBe(0);
  });

  test("without emulation: at least one of transition/animation is non-zero (catches always-zero regressions)", async ({
    page,
  }) => {
    // Explicitly emulate `no-preference` rather than relying on the default,
    // which Chromium has historically treated as `reduce` on some headless
    // setups. This ensures we exercise the unprefixed branch of the CSS.
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(PATH);
    await scrollHalfway(page);

    const { transitionSeconds, animationSeconds } = await readMotionDurations(
      page,
      FILL_SELECTOR,
    );

    // At least one must be non-zero. The default CSS sets
    // `--reading-progress-transition: 100ms ease-out` → transitionSeconds === 0.1.
    expect(transitionSeconds > 0 || animationSeconds > 0).toBe(true);
  });
});
