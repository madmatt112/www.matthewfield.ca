import { expect, test, type Page } from "@playwright/test";

import { THEME_STORAGE_KEY } from "@/components/layout/theme-provider";

/* CSS isolation — Playwright verification.
 *
 * Asserts the empirical behavior of the .playground-container isolation
 * boundary applied by <PlaygroundFrame> around the same-page
 * `scribble-pad` sample, plus the M1 typography re-establishment. All
 * assertions read computed styles via
 * page.evaluate(() => getComputedStyle(...)) on elements selected by
 * data-testid carried by the scribble-pad fixture.
 *
 * Tests run against the production build (`pnpm build && pnpm start`) via
 * playwright.config.ts → webServer.
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

// The same-page `scribble-pad` sample carries the migrated data-testid
// hooks the isolation assertions read. It renders inside <PlaygroundFrame>
// (the `.playground-container` reset boundary).
const SCRIBBLE_PAD_PATH = "/playground/scribble-pad";

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

// After the M1 fix, `color: oklch(0.145 0 0)` is declared in a SECOND
// unlayered rule on .playground-container, after the reset, so it beats
// `all: initial` and actually applies. The production build runs that
// oklch() through Lightning CSS, which emits an `#0a0a0a` sRGB fallback
// alongside the modern lab() form; Chromium serializes the computed
// `color` property to sRGB, so the container's real `color` resolves to
// rgb(10, 10, 10). The dark-mode re-read asserts the same value: if the
// host's .dark tokens leaked through the container reset, `color` would
// flip to the dark --foreground instead of staying rgb(10, 10, 10).
// Pinned to the exact prod-build serialization (expectRgbEqual is an
// exact toBe match — no tolerance).
const EXPECTED_CONTAINER_COLOR_RGB: RgbChannels = [10, 10, 10];

// --radius = 0.625rem = 10px. The container re-declares font-size: 16px
// in the M1 unlayered rule, matching Chromium's 16px root default, so
// var(--radius) resolves to 10px on descendants.
const EXPECTED_RADIUS = "10px";

// Strings that MUST NOT appear in any playground-descendant computed
// font-family. The host site declares Geist on <html> and Arial /
// Helvetica via Tailwind v4's preflight body rule; if the container
// reset were leaking, descendants would inherit one of these.
// Only "Geist" — the host's next/font-loaded family that cannot
// legitimately appear in the playground's own ui-sans-serif stack
// (which includes Arial / Helvetica Neue). Keeping the list narrow
// avoids false multi-failure noise when the typography fix lands.
const HOST_FONT_FAMILY_FRAGMENTS = ["Geist"] as const;
// String that MUST appear in playground-descendant computed font-family.
// The M1 fix re-establishes the ui-sans-serif stack on the container via
// an unlayered rule that beats `all: initial`, so descendants inherit it.
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

// Apply dark mode in a way that cooperates with the next-themes
// ThemeProvider. The init script runs before any page script parses, so
// the class lands on <html> before hydration; populating the theme
// storage key = "dark" ahead of hydration makes next-themes
// (attribute="class", defaultTheme="system") converge on dark after
// hydrating instead of racing the manual classList.add. The
// DOMContentLoaded handler is a redundancy for environments where
// documentElement isn't yet available during init-script execution.
// THEME_STORAGE_KEY is passed into the init script (closure vars aren't
// in scope inside the serialized browser-side function).
async function applyDarkMode(page: Page): Promise<void> {
  await page.addInitScript((storageKey: string) => {
    try {
      localStorage.setItem(storageKey, "dark");
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
  }, THEME_STORAGE_KEY);
}

test.describe("CSS isolation — playground container", () => {
  test("plain div inline styles are preserved (weak — see AC2 anchor test for isolation proof)", async ({
    page,
  }) => {
    // Inline styles always beat every author rule (layered or unlayered,
    // own or inherited), so this assertion would pass even if
    // .playground-container had no reset at all. It is retained as a
    // sanity check for the fixture itself; AC2 is actually anchored by
    // the `site globals blocked at container boundary` test below, which
    // reads a descendant WITHOUT inline overrides.
    await page.goto(SCRIBBLE_PAD_PATH);
    const styles = await readComputed(page, "sample-plain-div", (el) => {
      const cs = getComputedStyle(el);
      return { color: cs.color, fontFamily: cs.fontFamily };
    });
    expect(styles.color).toBe("rgb(255, 0, 0)");
    // Exact match — `toContain("serif")` would also accept `sans-serif` /
    // `ui-sans-serif`, which is exactly the leak the test is supposed to
    // catch.
    expect(styles.fontFamily).toBe("serif");
  });

  test("shadcn Button receives utility-class padding + inherits the M1 typography", async ({
    page,
  }) => {
    // Two concerns in one test:
    //
    // (1) Utility-class delivery through @layer playground. The shadcn
    //     Button's size utilities (padding, font-size) resolve inside
    //     the container's layer.
    //
    // (2) M1 typography proof on the Button's descendant path. After the
    //     M1 fix re-establishes the ui-sans-serif stack via an unlayered
    //     rule that beats `all: initial`, the Button inherits it, so the
    //     computed font-family MUST contain the intended playground stack
    //     fragment — and MUST NOT contain any host-leak fragment.
    await page.goto(SCRIBBLE_PAD_PATH);
    const styles = await readComputed(page, "sample-font-target", (el) => {
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
    expect(styles.fontFamily).toContain(INTENDED_PLAYGROUND_FONT_FRAGMENT);
  });

  test("Tailwind utilities resolve inside @layer playground", async ({ page }) => {
    await page.goto(SCRIBBLE_PAD_PATH);
    const styles = await readComputed(page, "sample-tailwind-div", (el) => {
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
    await page.goto(SCRIBBLE_PAD_PATH);
    const before = await readContainer();
    expectLabClose(before.background, EXPECTED_BACKGROUND_LIGHT);
    expectLabClose(before.foreground, EXPECTED_FOREGROUND_LIGHT);
    expectLabClose(before.primary, EXPECTED_PRIMARY_LIGHT);
    expectLabClose(before.primaryForeground, EXPECTED_PRIMARY_FOREGROUND_LIGHT);
    expectRgbEqual(before.color, EXPECTED_CONTAINER_COLOR_RGB);

    // Dark mode applied via init script so the class is on <html> before
    // hydration (cooperates with the next-themes ThemeProvider).
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
      readComputed(page, "sample-token-target", (el) => {
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

    await page.goto(SCRIBBLE_PAD_PATH);
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
    // color=var(--primary-foreground) (playground/scribble-pad/index.tsx).
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
      readComputed(page, "sample-button-token", (el) => {
        const cs = getComputedStyle(el);
        return {
          backgroundColor: cs.backgroundColor,
          color: cs.color,
        };
      });

    await page.goto(SCRIBBLE_PAD_PATH);
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
    await page.goto(SCRIBBLE_PAD_PATH);
    const styles = await readComputed(page, "sample-leak-probe", (el) => {
      const cs = getComputedStyle(el);
      return { fontFamily: cs.fontFamily };
    });
    for (const fragment of HOST_FONT_FAMILY_FRAGMENTS) {
      expect(styles.fontFamily).not.toContain(fragment);
    }
  });
});
