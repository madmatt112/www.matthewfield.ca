#!/usr/bin/env node
/**
 * Convert src/styles/tokens.css OKLCH values to sRGB hex for email use.
 *
 * Email clients do not support oklch(), so email/buttondown/custom-css.css
 * carries literal hex. This script is how that file is re-derived when the
 * design system changes a token — run it, then update the hex values and the
 * contrast figures quoted in the CSS comments.
 *
 *   node scripts/oklch-to-hex.mjs
 *
 * Prints every token in both themes plus the contrast ratios the email CSS
 * comments cite, so a token change that breaks a WCAG gate is visible here
 * rather than in an inbox.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** oklch() → sRGB. Returns hex plus whether the color needed gamut clipping. */
function oklchToRgb(L, C, H) {
  const h = (H * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const linear = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  let clipped = false;
  const rgb = linear.map((v) => {
    if (v < -1e-4 || v > 1 + 1e-4) clipped = true;
    const c = Math.min(1, Math.max(0, v));
    const encoded = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
    return Math.round(encoded * 255);
  });
  const hex = `#${rgb.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
  return { hex, rgb, clipped };
}

const luminance = ([r, g, b]) => {
  const f = (c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};

const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/**
 * Pull `--name: oklch(L C H)` pairs out of a tokens.css block, including the
 * `oklch(L C H / A%)` alpha form used by the dark theme's --border/--input.
 * Email needs opaque values (Outlook's rendering of translucent borders is
 * unreliable), so alpha tokens are flattened over the block's --background
 * and reported with the alpha they came from.
 */
function parseBlock(css, selector) {
  const block = css.match(new RegExp(`${selector}\\s*\\{([\\s\\S]*?)\\n\\}`, "m"));
  if (!block) throw new Error(`No ${selector} block in tokens.css`);
  const tokens = {};
  const re = /--([\w-]+):\s*oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+)%)?\)/g;
  let match;
  while ((match = re.exec(block[1])) !== null) {
    const [, name, L, C, H, alphaPct] = match;
    tokens[name] = {
      oklch: [Number(L), Number(C), Number(H)],
      alpha: alphaPct === undefined ? 1 : Number(alphaPct) / 100,
    };
  }
  return tokens;
}

/** sRGB alpha composite of `rgb` over `backdrop` — how a browser blends it. */
const flatten = (rgb, alpha, backdrop) =>
  rgb.map((v, i) => Math.round(alpha * v + (1 - alpha) * backdrop[i]));

/** Resolve a token to an opaque [r,g,b], flattening alpha over --background. */
function resolve(tokens, name) {
  const token = tokens[name];
  if (!token) return null;
  const { rgb, clipped } = oklchToRgb(...token.oklch);
  if (token.alpha === 1) return { rgb, clipped, alpha: 1 };
  const backdrop = oklchToRgb(...tokens.background.oklch).rgb;
  return { rgb: flatten(rgb, token.alpha, backdrop), clipped, alpha: token.alpha };
}

const toHex = (rgb) => `#${rgb.map((v) => v.toString(16).padStart(2, "0")).join("")}`;

const css = readFileSync(join(ROOT, "src/styles/tokens.css"), "utf8");

// Pairs the email CSS asserts a contrast ratio for, as [foreground, surface].
const GATED_PAIRS = [
  ["foreground", "background"],
  ["muted-foreground", "background"],
  ["brand", "background"],
  ["foreground", "muted"],
  ["muted-foreground", "muted"],
  ["brand", "muted"],
];

let failures = 0;

for (const [label, selector] of [
  ["LIGHT (:root)", ":root"],
  ["DARK (.dark)", "\\.dark"],
]) {
  const tokens = parseBlock(css, selector);
  console.log(`\n${label}`);
  console.log("-".repeat(64));
  for (const name of Object.keys(tokens)) {
    const { rgb, clipped, alpha } = resolve(tokens, name);
    const notes = [
      alpha < 1 ? `flattened from ${alpha * 100}% over --background` : "",
      clipped ? "** OUT OF sRGB GAMUT **" : "",
    ]
      .filter(Boolean)
      .join("  ");
    console.log(`  --${name.padEnd(24)} ${toHex(rgb)}${notes ? `  ${notes}` : ""}`);
  }

  console.log("\n  Contrast (WCAG AA needs 4.5:1 for normal text)");
  for (const [fg, bg] of GATED_PAIRS) {
    const f = resolve(tokens, fg);
    const b = resolve(tokens, bg);
    if (!f || !b) continue;
    const ratio = contrast(f.rgb, b.rgb);
    const pass = ratio >= 4.5;
    if (!pass) failures += 1;
    console.log(`  ${pass ? "PASS" : "FAIL"}  ${fg} on ${bg}: ${ratio.toFixed(2)}:1`);
  }
}

if (failures > 0) {
  console.error(`\n${failures} pair(s) below 4.5:1 — email CSS must not ship these.`);
  process.exit(1);
}
