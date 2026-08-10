import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Heatmap ramp canary (Task 22).
 *
 * WHAT THIS IS: an *inputs* canary. It pins the nine values design
 * §Design System measured — `--brand` and `--background` in both themes
 * (tokens.css) and the five `fill-opacity` steps (contributions.css) —
 * plus the binding that makes those nine numbers mean anything: that the
 * marks are filled with `var(--brand)`. Without that last assertion,
 * repointing the fill at `var(--chart-1)` (a direct Req 4.4 breach) would
 * leave every pinned value intact and this file green.
 *
 * WHAT IT IS NOT: a contrast calculation. Asserting the composited WCAG
 * ratios needs OKLCH → OKLab → linear sRGB → gamma → relative luminance
 * plus alpha compositing, hand-written with no oracle — and a converter
 * that is uniformly wrong still clears every floor and reports green,
 * i.e. false assurance about the one thing the test exists to guard. A
 * canary on the inputs has no such failure mode: it cannot be subtly
 * wrong, only present or absent.
 *
 * WHY IT EXISTS: design §"What is not gated" — Playwright does not run in
 * ci.yml, `pnpm lhci` is not wired, and NOTHING ELSE IN THE REPOSITORY
 * MEASURES THE RAMP. The worst adjacent pair has 0.09 of margin, and
 * `--muted-foreground` and `--destructive` have each already been retuned
 * once for contrast (tokens.css:21-25, :28-30). A future contrast fix to
 * `--brand` would otherwise drop a pair below 1.3:1 with no gate noticing.
 *
 * WHAT IT DETECTS IS CHANGE, NOT VIOLATION. It cannot tell a compliant
 * retune from a non-compliant one; it forces a human re-measurement
 * whenever an input moves, which is the whole ask.
 *
 * SCOPE — WHAT IS GUARDED. Only the TOP-LEVEL cascade: the five
 * `fill-opacity` declarations and the single `fill` in contributions.css,
 * the tokens.css values they resolve against, Req 4.3's level-0 alpha
 * floor, and two structural properties — that each level is declared
 * exactly once, and that every ramp rule covers the legend swatch as well
 * as the grid cell.
 *
 * SCOPE — WHAT IS NOT GUARDED. An ADDITIVE at-rule override.
 * `topLevelRules` skips at-rule blocks, so leaving the ramp rules exactly
 * as they are and APPENDING, say,
 * `@media (min-width: 48rem) { .contrib-heatmap__cell[data-level="2"] {
 * fill-opacity: 0.5 } }`, or an `@supports` block repointing `fill` at
 * `var(--chart-1)`, renders a different ramp with all eleven cases here
 * still green.
 *
 * DO NOT "FIX" THAT BY REMOVING THE AT-RULE SKIP. The skip is what keeps
 * the shipped `@media (forced-colors: active)` block — which sets
 * `fill: CanvasText` on the very same selector list, by design and per Req
 * 5.6 — from reading as a second ramp rule and failing the exactly-one-
 * rule assertion on every run, permanently. Parsing into at-rule blocks to
 * catch the additive case re-admits that false positive; it was ruled out
 * of scope deliberately. The blind spot is bounded: reaching it requires
 * ADDING a block, not editing the ramp, and every edit to the ramp itself
 * still reddens.
 *
 * MEASURED RAMP (design §Design System) — `--brand` over `--background`,
 * composited in unquantised float, WCAG relative luminance, rounded down
 * to 2dp so every figure is a lower bound:
 *
 *   | Level | Alpha | Light   | vs surface | Dark    | vs surface |
 *   |-------|-------|---------|------------|---------|------------|
 *   |   0   | 0.28  | #e4cbc0 |   1.54:1   | #483222 |   1.65:1   |
 *   |   1   | 0.48  | #d0a593 |   2.20:1   | #754e33 |   2.73:1   |
 *   |   2   | 0.66  | #bf846a |   3.12:1   | #9d6843 |   4.23:1   |
 *   |   3   | 0.82  | #af6646 |   4.35:1   | #c07f51 |   6.02:1   |
 *   |   4   | 1     | #9e441d |   6.34:1   | #e89960 |   8.61:1   |
 *
 *   All four adjacent pairs — light 1.42 / 1.41 / 1.39 / 1.45; dark
 *   1.65 / 1.54 / 1.42 / 1.42.
 *
 *   Gates (Reqs 4.3, 4.8): level 0 ≥1.5:1 → worst 1.54 ✓ · every adjacent
 *   pair ≥1.3:1 → worst 1.39 ✓ · level 4 ≥3:1 → worst 6.34 ✓.
 *
 *   Level 0's alpha is very nearly forced: 0.27 is the minimum meeting
 *   Req 4.3's ≥1.5:1 floor (0.27 → 1.5217; 0.26 → 1.4966, which FAILS) —
 *   design.md:272-273. Shipping 0.28 leaves one hundredth of headroom.
 *
 * _Requirements: 4.2, 4.3, 4.4, 4.8_
 * No new dependency, runtime or dev: this reads two CSS files and
 * compares strings.
 */

/** What every failure message tells the reader to DO. */
const REMEDY =
  "re-measure the ramp and update design §Design System " +
  "(.spec-workflow/specs/github-activity/design.md)";

/**
 * The measured literals, transcribed from design §Design System. These are
 * the test's own expectation — deliberately NOT read back out of the CSS,
 * or both sides of every assertion would move together and the canary
 * would pin nothing.
 */
const MEASURED_BRAND = { light: "oklch(0.5 0.13 42)", dark: "oklch(0.75 0.12 55)" } as const;
const MEASURED_BACKGROUND = { light: "oklch(1 0 0)", dark: "oklch(0.145 0 0)" } as const;

/**
 * Levels 0–4. Note level 4 is `1`, not `1.0`: prettier normalises the
 * trailing zero away, so `1.0` is what design records and `1` is what the
 * stylesheet contains.
 */
const MEASURED_ALPHAS = ["0.28", "0.48", "0.66", "0.82", "1"] as const;

/** Req 4.3's floor on level 0, expressed in alpha rather than ratio. */
const LEVEL_0_ALPHA_FLOOR = 0.27;

/** The binding the nine measured values are measured *through* (Req 4.4). */
const MEASURED_FILL = "var(--brand)";

const STYLES_DIR = __dirname;

/** Read a stylesheet with comments stripped, so prose cannot match a selector. */
function readCss(file: string): string {
  return fs.readFileSync(path.join(STYLES_DIR, file), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
}

type Rule = { selector: string; body: string };

/**
 * Split a stylesheet into its top-level rules, skipping at-rule blocks.
 * Skipping `@media` is deliberate: contributions.css declares
 * `fill: CanvasText` for the same selector list under
 * `@media (forced-colors: active)`, and that override is not the ramp.
 * That skip is also this canary's one blind spot — see SCOPE in the file
 * header before touching it.
 *
 * Note the shape of the scan: everything between the previous rule and the
 * next `{` is taken as one selector. An at-STATEMENT (`@import …;`, which
 * has no block) therefore glues onto the selector that follows it and
 * takes that whole rule out of the scan with it.
 */
function topLevelRules(css: string): Rule[] {
  const rules: Rule[] = [];
  let cursor = 0;
  for (let i = 0; i < css.length; i++) {
    if (css[i] !== "{") continue;
    const selector = css.slice(cursor, i).trim();
    let depth = 1;
    let j = i + 1;
    for (; j < css.length && depth > 0; j++) {
      if (css[j] === "{") depth++;
      else if (css[j] === "}") depth--;
    }
    if (!selector.startsWith("@")) rules.push({ selector, body: css.slice(i + 1, j - 1) });
    i = j - 1;
    cursor = j;
  }
  return rules;
}

/** The rule's selector list, one normalised selector per entry. */
function selectorParts(rule: Rule): string[] {
  return rule.selector.split(",").map((part) => part.replace(/\s+/g, " ").trim());
}

/** The declared value of `prop` in this rule, or undefined. */
function declaredValue(rule: Rule, prop: string): string | undefined {
  for (const chunk of rule.body.split(";")) {
    const colon = chunk.indexOf(":");
    if (colon === -1) continue;
    if (chunk.slice(0, colon).trim() !== prop) continue;
    return chunk.slice(colon + 1).trim();
  }
  return undefined;
}

const tokensRules = topLevelRules(readCss("tokens.css"));
const contributionsRules = topLevelRules(readCss("contributions.css"));

/** The live value of a custom property inside a whole-block selector. */
function tokenValue(selector: string, prop: string): string | undefined {
  const rule = tokensRules.find((candidate) => selectorParts(candidate).includes(selector));
  expect(
    rule,
    `the tokens.css scan found no top-level "${selector}" block. Either the block moved ` +
      `or was renamed, or an at-statement such as \`@import\` now sits above it and took ` +
      `it out of the scan (see topLevelRules); ${REMEDY}`,
  ).toBeDefined();
  return declaredValue(rule as Rule, prop);
}

/**
 * The single ramp rule declaring `prop` for `cellSelector`.
 *
 * Requires EXACTLY ONE such rule: a second one is a theme branch or a
 * later override that silently wins, which is precisely the drift this
 * canary exists to surface. Also requires that rule to cover the legend
 * swatch as well, so the legend physically cannot disagree with the grid.
 */
function rampRule(cellSelector: string, swatchSelector: string, prop: string): Rule {
  const matches = contributionsRules.filter(
    (rule) =>
      declaredValue(rule, prop) !== undefined &&
      selectorParts(rule).some((part) => part.includes(cellSelector)),
  );
  expect(
    matches.length,
    `expected exactly one contributions.css rule setting ${prop} for ${cellSelector}, ` +
      `found ${matches.length} — a second rule is an override or theme branch that ` +
      `changes the rendered ramp; ${REMEDY}`,
  ).toBe(1);
  const parts = selectorParts(matches[0]);
  expect(
    parts,
    `the ${prop} rule for ${cellSelector} no longer covers ${swatchSelector}, so the ` +
      `legend can now disagree with the grid; ${REMEDY}`,
  ).toContain(swatchSelector);
  expect(
    parts,
    `the ${prop} rule reaches ${cellSelector} only through a combinator or a wider ` +
      `selector; ${REMEDY}`,
  ).toContain(cellSelector);
  return matches[0];
}

describe("heatmap ramp canary — the measured inputs have not drifted", () => {
  it("--brand still holds its measured light value in tokens.css :root", () => {
    expect(
      tokenValue(":root", "--brand"),
      `--brand (light) moved off the value the ramp was measured against; ${REMEDY}`,
    ).toBe(MEASURED_BRAND.light);
  });

  it("--brand still holds its measured dark value in tokens.css .dark", () => {
    expect(
      tokenValue(".dark", "--brand"),
      `--brand (dark) moved off the value the ramp was measured against; ${REMEDY}`,
    ).toBe(MEASURED_BRAND.dark);
  });

  it("--background still holds its measured light value in tokens.css :root", () => {
    expect(
      tokenValue(":root", "--background"),
      `--background (light) is the surface every ratio in the table is computed ` +
        `against and it moved; ${REMEDY}`,
    ).toBe(MEASURED_BACKGROUND.light);
  });

  it("--background still holds its measured dark value in tokens.css .dark", () => {
    expect(
      tokenValue(".dark", "--background"),
      `--background (dark) is the surface every ratio in the table is computed ` +
        `against and it moved; ${REMEDY}`,
    ).toBe(MEASURED_BACKGROUND.dark);
  });

  it("the marks are still filled with var(--brand)", () => {
    const rule = rampRule(".contrib-heatmap__cell", ".contrib-heatmap__swatch", "fill");
    expect(
      declaredValue(rule, "fill"),
      `the heatmap marks no longer draw from ${MEASURED_FILL}; every ratio in the ` +
        `measured table is a --brand composite, so they now describe nothing ` +
        `(and --chart-* is forbidden by Req 4.4); ${REMEDY}`,
    ).toBe(MEASURED_FILL);
  });

  MEASURED_ALPHAS.forEach((alpha, level) => {
    it(`level ${level} still uses fill-opacity ${alpha}`, () => {
      const rule = rampRule(
        `.contrib-heatmap__cell[data-level="${level}"]`,
        `.contrib-heatmap__swatch[data-level="${level}"]`,
        "fill-opacity",
      );
      expect(
        declaredValue(rule, "fill-opacity"),
        `level ${level}'s alpha moved, so its published contrast figures and the two ` +
          `adjacent-pair separations either side of it are stale; ${REMEDY}`,
      ).toBe(alpha);
    });
  });

  it(`level 0 still clears Req 4.3's ${LEVEL_0_ALPHA_FLOOR} alpha floor`, () => {
    const rule = rampRule(
      '.contrib-heatmap__cell[data-level="0"]',
      '.contrib-heatmap__swatch[data-level="0"]',
      "fill-opacity",
    );
    const alpha = Number(declaredValue(rule, "fill-opacity"));
    expect(
      alpha,
      `level 0 at ${alpha} breaches Req 4.3's ≥1.5:1 floor against the surface ` +
        `(0.27 → 1.5217 is the minimum that passes; 0.26 → 1.4966 fails). Empty days ` +
        `must stay visible — if the tint has to go, the requirement changes first; ` +
        `${REMEDY}`,
    ).toBeGreaterThanOrEqual(LEVEL_0_ALPHA_FLOOR);
  });
});
