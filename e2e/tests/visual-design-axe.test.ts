import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { THEME_STORAGE_KEY } from "../../src/components/layout/theme-provider";

// Task 21 — Accessibility / contrast verification for the visual-design spec.
//
// Asserts ZERO color-contrast violations on the visual-design surfaces in BOTH
// themes: the landing page, the profile page, a blog post, and a rendered
// StatusCallout status-feedback state. axe's color-contrast rule runs on the
// SSR'd DOM + CSS and does NOT require hydration, so these checks are valid
// despite the suite's pre-existing CSP/eval hydration failures.
//
// Also verifies the design §1 legal-pairing matrix at its deepest legal nest
// (status text on its `/10` tint composited over `card`) via the
// status-callout component-preview, and the brand focus ring's ≥3:1 non-text
// contrast via a computed assertion (axe color-contrast covers text, not rings).

const THEMES: Array<"light" | "dark"> = ["light", "dark"];
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

// Shiki code blocks pin upstream theme token colors not all of which clear AA;
// they are opt-in monospaced content, excluded exactly as blog-axe.test.ts does.
const CODE_BLOCK_EXCLUDE = "figure[data-rehype-pretty-code-figure]";

// Visual-design surfaces. We deliberately avoid /blog/categories/fixture
// (a pre-existing real a11y failure tracked by blog-axe.test.ts) and target
// landing, profile, a blog post, and the status-feedback preview instead.
const PAGES = [
  { path: "/", label: "landing" },
  { path: "/profile", label: "profile" },
  { path: "/blog/fixture-code", label: "blog post" },
  // StatusCallout (all tones) nested in a `card` — the status-feedback state,
  // server-rendered (no hydration needed) via the component-preview harness.
  {
    path: "/blog/component-preview/status-callout",
    label: "status-feedback (StatusCallout on card)",
  },
] as const;

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

test.describe("visual-design color-contrast (axe, both themes)", () => {
  for (const { path, label } of PAGES) {
    for (const theme of THEMES) {
      test(`${label} has zero color-contrast violations in ${theme} theme`, async ({ page }) => {
        await setupTheme(page, theme);
        await page.goto(path);
        await assertTheme(page, theme);

        const results = await new AxeBuilder({ page })
          .withTags(AXE_TAGS)
          .exclude(CODE_BLOCK_EXCLUDE)
          .analyze();

        // Filter to the color-contrast rule per the task: assert empty.
        const contrast = results.violations.filter((v) => v.id === "color-contrast");
        expect(contrast).toEqual([]);
      });
    }
  }

  // The status-feedback preview is the deepest legal nest in the §1 matrix
  // (status text on its `/10` tint over `card`). Confirm the composite actually
  // renders so the contrast assertion above is auditing the intended surface.
  for (const theme of THEMES) {
    test(`StatusCallout-on-card composite renders in ${theme} theme`, async ({ page }) => {
      await setupTheme(page, theme);
      await page.goto("/blog/component-preview/status-callout");
      await assertTheme(page, theme);

      const card = page.locator(".bg-card").first();
      await expect(card).toBeVisible();
      // success/warning/info/error callouts all nested inside the card surface.
      await expect(card.getByText("has been sent")).toBeVisible();
      await expect(card.getByText("Something went wrong")).toBeVisible();
    });
  }
});

// ---------------------------------------------------------------------------
// Brand focus-ring non-text contrast (design §1 ring-alpha note).
// axe color-contrast covers TEXT, not focus rings. Per design §1 the focus ring
// is drawn at FULL alpha (`--ring` = `--brand`, the Button utility uses
// `ring-ring` not `ring-ring/50`) and must clear WCAG 1.4.11 ≥3:1 non-text
// against adjacent background/card/muted in both themes. We compute it here.
// ---------------------------------------------------------------------------

// OKLCH (L 0..1, C, h°) → linear sRGB → sRGB. Mirrors the CSS color pipeline.
function oklchToSrgb(L: number, C: number, hDeg: number): [number, number, number] {
  const h = (hDeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;

  const rLin = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const gLin = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bLin = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  const enc = (c: number) => {
    const cl = Math.min(1, Math.max(0, c));
    return cl <= 0.0031308 ? 12.92 * cl : 1.055 * cl ** (1 / 2.4) - 0.055;
  };
  return [enc(rLin), enc(gLin), enc(bLin)];
}

function relLuminance([r, g, b]: [number, number, number]): number {
  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrastRatio(fg: [number, number, number], bg: [number, number, number]): number {
  const l1 = relLuminance(fg);
  const l2 = relLuminance(bg);
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

// Token values straight from src/styles/tokens.css (design §1).
const TOKENS = {
  light: {
    ring: [0.5, 0.13, 42], // --brand
    surfaces: {
      background: [1, 0, 0],
      card: [1, 0, 0],
      muted: [0.97, 0, 0],
    },
  },
  dark: {
    ring: [0.75, 0.12, 55], // --brand
    surfaces: {
      background: [0.145, 0, 0],
      card: [0.205, 0, 0],
      muted: [0.269, 0, 0],
    },
  },
} as const;

test.describe("brand focus ring non-text contrast (design §1 ring-alpha note)", () => {
  for (const theme of ["light", "dark"] as const) {
    for (const [surfaceName, surface] of Object.entries(TOKENS[theme].surfaces)) {
      test(`ring (full-alpha brand) vs ${surfaceName} clears 3:1 in ${theme} theme`, () => {
        const ring = oklchToSrgb(...(TOKENS[theme].ring as [number, number, number]));
        const bg = oklchToSrgb(...(surface as [number, number, number]));
        const ratio = contrastRatio(ring, bg);
        // WCAG 1.4.11 non-text contrast minimum.
        expect(ratio).toBeGreaterThanOrEqual(3);
      });
    }
  }
});
