import { expect, test, type Page } from "@playwright/test";

/* CSS isolation spike — Playwright verification (task 13).
 *
 * Asserts the empirical behavior of the .playground-container isolation
 * boundary (task 10) plus the spike fixtures (tasks 11–12). All assertions
 * read computed styles via page.evaluate(() => getComputedStyle(...)) on
 * elements selected by data-testid.
 *
 * Tests run against the production build (`pnpm build && pnpm start`) via
 * playwright.config.ts → webServer. Dev-mode (Turbopack) verification is
 * documented in e2e/spike-summary.txt; the 2026-04-16 run showed the
 * same assertions pass against the Turbopack dev build, so the expected
 * values below hold for both bundlers.
 *
 * Color serialization: the production build runs oklch() values through
 * Lightning CSS, which emits two declarations per color — an RGB/hex
 * fallback for pre-lab() browsers and the modern lab() form (for example,
 * `color: #0a0a0a; color: lab(2.75381% 0 0);`). Chromium supports lab(),
 * so it uses the second declaration; CSSOM then serializes the computed
 * value — lab() values round-trip as lab() for custom properties but
 * collapse to sRGB (`rgb(...)`) when read off real color properties. The
 * lab() strings additionally differ between the two readout paths (the
 * custom-property form preserves the `%` suffix and may strip leading
 * zeros on near-zero channels, the real-property form does not). The
 * parsing helpers below normalize past both sources of drift so the
 * assertions survive Lightning CSS / Tailwind / Chromium version bumps.
 *
 * Token sync maintenance: the EXPECTED_* tuples below mirror
 * src/styles/tokens.css :root and src/styles/playground.css. When
 * shadcn/ui defaults change, regenerate tokens.css, update playground.css,
 * and update the tuples here in lockstep — there is no auto-sync. A
 * brand-new token added to tokens.css is not detected by these tests
 * until it is wired into an assertion explicitly. */

// `(playground)` is a Next.js route group — it doesn't add a URL segment,
// so the spike fixture is served at /spike, not /playground/spike.
const SPIKE_PATH = "/spike";

type LabChannels = readonly [number, number, number];
type RgbChannels = readonly [number, number, number];

// Light-mode lab() channel targets, derived from the oklch() values in
// src/styles/playground.css (@layer playground) and tokens.css :root.
// Numeric comparison with toBeCloseTo absorbs Lightning CSS serialization
// quirks (e.g. `-.0000149012` vs `-0.0000149012`, `lab(100%)` vs
// `lab(100)`) across toolchain versions.
const EXPECTED_BACKGROUND_LIGHT: LabChannels = [100, 0, 0];
const EXPECTED_FOREGROUND_LIGHT: LabChannels = [2.75381, 0, 0];
const EXPECTED_PRIMARY_LIGHT: LabChannels = [7.78201, 0, 0];
const EXPECTED_PRIMARY_FOREGROUND_LIGHT: LabChannels = [98.26, 0, 0];
const EXPECTED_TAILWIND_BLUE_500: LabChannels = [54.1736, 13.3369, -74.6839];

// `color: oklch(0.145 0 0)` declared in @layer playground cannot override
// the unlayered `all: initial` on the same element (see SPIKE FINDING
// below about layered-vs-unlayered cascade). Chromium's computed value
// for `color` on the container therefore ends up as the initial
// CanvasText keyword, which serializes to rgb(0, 0, 0) on the test's
// white canvas. The assertion still proves R11 AC5's dark-mode
// isolation: once .dark lands on <html>, if the host's dark tokens
// leaked through the container reset, `color` would flip to the dark
// --foreground instead of staying rgb(0, 0, 0).
const EXPECTED_CONTAINER_COLOR_RGB: RgbChannels = [0, 0, 0];

// --radius = 0.625rem = 10px. Root font-size is 16px in Chromium's
// defaults; the container re-declares font-size via @layer playground
// but that declaration is shadowed by `all: initial` — the computed rem
// base on descendants still falls back to the browser default of 16px,
// which is what resolves var(--radius) to 10px here.
const EXPECTED_RADIUS = "10px";

// SPIKE FINDING — layered typography re-declarations on .playground-container
// are defeated by the unlayered `all: initial` on the same rule block.
// Custom properties survive (CSS `all` excludes them by spec), but
// font-family / font-size / line-height / color / etc. revert to the
// browser initial. Task 14 (spike-results.md) records this and
// recommends a follow-up that either moves the typography
// re-establishment out of the layer or uses higher-specificity unlayered
// selectors so the re-declarations beat the reset. The assertions below
// encode this behavior via negation rather than pinning Chromium's
// initial-value serialization ("Times New Roman" on the current test
// image, Liberation Serif / DejaVu Serif on other distros). The
// negation form survives platform / Playwright-bundled-Chromium
// version bumps AND still fails loudly the moment the playground.css
// fix lands — the ui-sans-serif stack will start appearing in the
// computed value and the "not.toContain('ui-sans-serif')" assertion
// flips from passing to failing, forcing a test update.

// Strings that MUST NOT appear in any playground-descendant computed
// font-family. The host site declares Geist on <html> and Arial /
// Helvetica via Tailwind v4's preflight body rule; if the container
// reset were leaking, descendants would inherit one of these.
// Only "Geist" — the host's next/font-loaded family that cannot
// legitimately appear in the playground's own ui-sans-serif stack
// (which includes Arial / Helvetica Neue). Keeping the list narrow
// avoids false multi-failure noise when the typography fix lands.
const HOST_FONT_FAMILY_FRAGMENTS = ["Geist"] as const;
// String that MUST NOT YET appear in playground-descendant computed
// font-family (broken-state marker). When playground.css is fixed so
// the re-declaration actually applies, this fragment WILL appear and
// the assertion will flip — update the assertion to toContain at that
// point.
const INTENDED_PLAYGROUND_FONT_FRAGMENT = "ui-sans-serif";

function parseLab(value: string): LabChannels {
  const m =
    /^lab\(\s*(-?\d+(?:\.\d+)?|-?\.\d+)%?\s+(-?\d+(?:\.\d+)?|-?\.\d+)\s+(-?\d+(?:\.\d+)?|-?\.\d+)\s*\)$/.exec(
      value,
    );
  if (!m) {
    throw new Error(`Expected lab() color, got ${JSON.stringify(value)}`);
  }
  return [Number(m[1]), Number(m[2]), Number(m[3])] as const;
}

function parseRgb(value: string): RgbChannels {
  const m =
    /^rgba?\(\s*(\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)(?:\s*[,/]\s*(?:\d+(?:\.\d+)?%?|none))?\s*\)$/.exec(
      value,
    );
  if (!m) {
    throw new Error(`Expected rgb()/rgba() color, got ${JSON.stringify(value)}`);
  }
  return [Number(m[1]), Number(m[2]), Number(m[3])] as const;
}

function expectLabClose(actual: string, expected: LabChannels, precision = 2): void {
  const [l, a, b] = parseLab(actual);
  expect(l).toBeCloseTo(expected[0], precision);
  expect(a).toBeCloseTo(expected[1], precision);
  expect(b).toBeCloseTo(expected[2], precision);
}

function expectRgbEqual(actual: string, expected: RgbChannels): void {
  const [r, g, b] = parseRgb(actual);
  expect(r).toBe(expected[0]);
  expect(g).toBe(expected[1]);
  expect(b).toBe(expected[2]);
}

async function readComputed<T>(
  page: Page,
  testId: string,
  reader: (el: HTMLElement) => T,
): Promise<T> {
  return await page.getByTestId(testId).evaluate(reader);
}

// Apply dark mode in a way that survives a future next-themes
// ThemeProvider integration (task 16). The init script runs before any
// page script parses, so the class lands on <html> before hydration;
// populating localStorage "theme" = "dark" ahead of hydration makes
// next-themes (attribute="class", defaultTheme="system") converge on
// dark after hydrating instead of racing the manual classList.add. The
// DOMContentLoaded handler is a redundancy for environments where
// documentElement isn't yet available during init-script execution.
async function applyDarkMode(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("theme", "dark");
    } catch {
      /* incognito / storage disabled — ignore */
    }
    const apply = () => {
      if (document.documentElement && !document.documentElement.classList.contains("dark")) {
        document.documentElement.classList.add("dark");
      }
    };
    apply();
    document.addEventListener("DOMContentLoaded", apply);
  });
}

test.describe("CSS isolation spike — playground container", () => {
  test("plain div inline styles are preserved (weak — see AC2 anchor test for isolation proof)", async ({
    page,
  }) => {
    // Inline styles always beat every author rule (layered or unlayered,
    // own or inherited), so this assertion would pass even if
    // .playground-container had no reset at all. It is retained as a
    // sanity check for the fixture itself; AC2 is actually anchored by
    // the `site globals blocked at container boundary` test below, which
    // reads a descendant WITHOUT inline overrides.
    await page.goto(SPIKE_PATH);
    const styles = await readComputed(page, "spike-plain-div-target", (el) => {
      const cs = getComputedStyle(el);
      return { color: cs.color, fontFamily: cs.fontFamily };
    });
    expect(styles.color).toBe("rgb(255, 0, 0)");
    // Exact match — `toContain("serif")` would also accept `sans-serif` /
    // `ui-sans-serif`, which is exactly the leak the test is supposed to
    // catch.
    expect(styles.fontFamily).toBe("serif");
  });

  test("shadcn Button receives utility-class padding + records typography regression", async ({
    page,
  }) => {
    // Two concerns in one test:
    //
    // (1) Utility-class delivery through @layer playground. Background
    //     and color are intentionally deferred — shadcn's bg-primary /
    //     text-primary-foreground are no-ops until globals.css has the
    //     @theme block that task 15 adds. The deferral is recorded on
    //     task 13's line in tasks.md (visible in the task list, not
    //     buried here). The direct component-level AC3 proof lives in
    //     the `shadcn Button consumes re-established tokens via var()`
    //     test further down.
    //
    // (2) Observed-broken marker for the typography re-declaration bug
    //     (see SPIKE FINDING near the constants). font-family on the
    //     Button's descendant path inherits the CSS initial serif
    //     default because the @layer playground re-declaration is
    //     shadowed by unlayered `all: initial` on the container. The
    //     assertion is a negation: the computed font-family must NOT
    //     include the intended playground stack fragment. Once
    //     playground.css is fixed so the re-declaration actually
    //     applies, this assertion WILL fail (ui-sans-serif starts
    //     appearing) and the test must be updated — that's the intent.
    await page.goto(SPIKE_PATH);
    const styles = await readComputed(page, "spike-shadcn-button-target", (el) => {
      const cs = getComputedStyle(el);
      return {
        paddingLeft: cs.paddingLeft,
        paddingRight: cs.paddingRight,
        paddingTop: cs.paddingTop,
        paddingBottom: cs.paddingBottom,
        fontSize: cs.fontSize,
        fontFamily: cs.fontFamily,
      };
    });
    expect(styles.paddingLeft).toBe("16px");
    expect(styles.paddingRight).toBe("16px");
    expect(styles.paddingTop).toBe("8px");
    expect(styles.paddingBottom).toBe("8px");
    expect(styles.fontSize).toBe("14px");
    for (const fragment of HOST_FONT_FAMILY_FRAGMENTS) {
      expect(styles.fontFamily).not.toContain(fragment);
    }
    expect(styles.fontFamily).not.toContain(INTENDED_PLAYGROUND_FONT_FRAGMENT);
  });

  test("Tailwind utilities resolve inside @layer playground", async ({ page }) => {
    await page.goto(SPIKE_PATH);
    const styles = await readComputed(page, "spike-tailwind-div-target", (el) => {
      const cs = getComputedStyle(el);
      return {
        backgroundColor: cs.backgroundColor,
        paddingTop: cs.paddingTop,
        paddingBottom: cs.paddingBottom,
        paddingLeft: cs.paddingLeft,
        paddingRight: cs.paddingRight,
        fontSize: cs.fontSize,
        lineHeight: cs.lineHeight,
      };
    });
    expectLabClose(styles.backgroundColor, EXPECTED_TAILWIND_BLUE_500);
    expect(styles.paddingTop).toBe("16px");
    expect(styles.paddingBottom).toBe("16px");
    expect(styles.paddingLeft).toBe("16px");
    expect(styles.paddingRight).toBe("16px");
    expect(styles.fontSize).toBe("18px");
    expect(styles.lineHeight).toBe("28px");
  });

  test("playground container stays light when host site is dark", async ({ page }) => {
    const readContainer = () =>
      readComputed(page, "playground-container", (el) => {
        const cs = getComputedStyle(el);
        return {
          background: cs.getPropertyValue("--background").trim(),
          foreground: cs.getPropertyValue("--foreground").trim(),
          primary: cs.getPropertyValue("--primary").trim(),
          primaryForeground: cs.getPropertyValue("--primary-foreground").trim(),
          color: cs.color,
        };
      });

    // Light-mode baseline.
    await page.goto(SPIKE_PATH);
    const before = await readContainer();
    expectLabClose(before.background, EXPECTED_BACKGROUND_LIGHT);
    expectLabClose(before.foreground, EXPECTED_FOREGROUND_LIGHT);
    expectLabClose(before.primary, EXPECTED_PRIMARY_LIGHT);
    expectLabClose(before.primaryForeground, EXPECTED_PRIMARY_FOREGROUND_LIGHT);
    expectRgbEqual(before.color, EXPECTED_CONTAINER_COLOR_RGB);

    // Dark mode applied via init script so the class is on <html> before
    // hydration (future-compatible with next-themes — task 16).
    await applyDarkMode(page);
    await page.reload();
    const after = await readContainer();
    // Every token AND the container's real `color` property stay at the
    // light values. If the .dark class on <html> were leaking through,
    // --background would flip to ~lab(2.75% 0 0) and --foreground to
    // ~lab(98.26% 0 0). String equality here is appropriate — any drift
    // in serialization format would drift consistently between the two
    // reads (same browser, same build), so character-for-character
    // before === after is the simplest correctness proof.
    expect(after).toEqual(before);
  });

  test("descendant reaches re-established tokens via var() references", async ({ page }) => {
    // Controlled test for R11 AC3. A descendant of .playground-container
    // styled via var(--primary) / var(--primary-foreground) / var(--radius)
    // must resolve to the values the playground base stylesheet
    // re-declares in @layer playground. The readContainer asserts the
    // inherited --background and --foreground custom properties too,
    // because those differ between :root (light) and :root.dark (dark) —
    // so the dark-mode re-read proves the container's re-declaration
    // actively wins over inherited dark values, rather than coincidentally
    // matching a light :root.
    const readTarget = () =>
      readComputed(page, "spike-token-access-target", (el) => {
        const cs = getComputedStyle(el);
        return {
          backgroundColor: cs.backgroundColor,
          color: cs.color,
          borderTopLeftRadius: cs.borderTopLeftRadius,
          borderTopRightRadius: cs.borderTopRightRadius,
          borderBottomLeftRadius: cs.borderBottomLeftRadius,
          borderBottomRightRadius: cs.borderBottomRightRadius,
          inheritedBackground: cs.getPropertyValue("--background").trim(),
          inheritedForeground: cs.getPropertyValue("--foreground").trim(),
          inheritedPrimary: cs.getPropertyValue("--primary").trim(),
        };
      });

    await page.goto(SPIKE_PATH);
    const before = await readTarget();
    expectLabClose(before.backgroundColor, EXPECTED_PRIMARY_LIGHT);
    expectLabClose(before.color, EXPECTED_PRIMARY_FOREGROUND_LIGHT);
    expect(before.borderTopLeftRadius).toBe(EXPECTED_RADIUS);
    expect(before.borderTopRightRadius).toBe(EXPECTED_RADIUS);
    expect(before.borderBottomLeftRadius).toBe(EXPECTED_RADIUS);
    expect(before.borderBottomRightRadius).toBe(EXPECTED_RADIUS);
    expectLabClose(before.inheritedBackground, EXPECTED_BACKGROUND_LIGHT);
    expectLabClose(before.inheritedForeground, EXPECTED_FOREGROUND_LIGHT);
    expectLabClose(before.inheritedPrimary, EXPECTED_PRIMARY_LIGHT);

    await applyDarkMode(page);
    await page.reload();
    const after = await readTarget();
    // Every reading must match — including the inherited custom
    // properties that have different values in :root.dark. If
    // .playground-container's @layer playground re-declarations weren't
    // winning, --background and --foreground would flip to their dark
    // values on the descendant; the equality assertion would fail.
    expect(after).toEqual(before);
  });

  test("shadcn Button consumes re-established tokens via var() inline style", async ({ page }) => {
    // Direct R11 AC3 verification at the component path. The fixture
    // Button has inline style backgroundColor=var(--primary),
    // color=var(--primary-foreground) (src/app/(playground)/spike/page.tsx).
    // This decouples AC3 from task 15's @theme utility wiring AND from
    // the general-div fixture in the previous test — it proves the
    // actual shadcn Button component renders with the playground's
    // re-established tokens when given a direct var() consumer.
    //
    // The before/after-dark comparison covers the same "layered
    // re-declaration won vs. inherited :root happened to match" loophole
    // flagged in review v6 by using colors whose :root values differ
    // between light and dark: --primary light = oklch(0.205 0 0),
    // :root.dark --primary = oklch(0.922 0 0). If the container's
    // layered re-declaration weren't actually winning, the Button's
    // computed background-color would flip toward the dark value after
    // applyDarkMode + reload.
    const readButton = () =>
      readComputed(page, "spike-button-token-target", (el) => {
        const cs = getComputedStyle(el);
        return {
          backgroundColor: cs.backgroundColor,
          color: cs.color,
        };
      });

    await page.goto(SPIKE_PATH);
    const before = await readButton();
    expectLabClose(before.backgroundColor, EXPECTED_PRIMARY_LIGHT);
    expectLabClose(before.color, EXPECTED_PRIMARY_FOREGROUND_LIGHT);

    await applyDarkMode(page);
    await page.reload();
    const after = await readButton();
    expect(after).toEqual(before);
  });

  test("AC2 — site globals blocked at container boundary (non-inline inheritance)", async ({
    page,
  }) => {
    // R11 AC2 anchor. A descendant with no inline overrides inherits
    // whatever the container cascaded for font-family. The host site
    // declares `font-family: Geist, "Geist Fallback"` on <html> (via
    // next/font/google's .variable className) and
    // `font-family: Arial, Helvetica, sans-serif` on <body> (Tailwind
    // v4 preflight). If the container's `all: initial` reset were
    // leaking host globals, the descendant would inherit one of these
    // stacks. The assertion is negation-based so it survives Chromium
    // font default changes (Liberation Serif / DejaVu Serif on
    // non-"Times New Roman" distros still passes) while still failing
    // loudly if isolation breaks.
    await page.goto(SPIKE_PATH);
    const styles = await readComputed(page, "spike-ac2-inherit-target", (el) => {
      const cs = getComputedStyle(el);
      return { fontFamily: cs.fontFamily };
    });
    for (const fragment of HOST_FONT_FAMILY_FRAGMENTS) {
      expect(styles.fontFamily).not.toContain(fragment);
    }
  });
});
