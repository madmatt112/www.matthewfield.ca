#!/usr/bin/env node
/**
 * check-playground-css.mjs
 *
 * Cheap leak guard for playground CSS Modules (Reqs 6.2, 10.6).
 *
 * Recursively reads `playground/**\/*.module.css` and fails (exit 1 +
 * `::warning::` annotation) on the constructs that escape CSS-Module
 * scoping:
 *   - `:global(` (or `:global {`) — the explicit global escape hatch.
 *   - any `@import` (incl. the `@import url(...)` form) whose target is
 *     NOT a `*.module.css` — pulling in unscoped global CSS.
 *   - `composes: … from global` — composing from a global class name.
 *
 * Bare element selectors are scoped by the compiler and PERMITTED.
 *
 * This is a deliberately small grep, not a full CSS linter. The pure core
 * `checkCss(cssText)` is exported so the self-test can cover synthetic
 * cases without touching real files.
 *
 * CLI:
 *   node scripts/check-playground-css.mjs
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const TAG = "[check-playground-css]";

/** Directory (relative to cwd) scanned for `*.module.css` files. */
export const PLAYGROUND_DIR = "playground";

/**
 * Pure core: scan one CSS Module's text for scope-escaping constructs.
 *
 * @param {string} cssText
 * @returns {{ ok: boolean, violations: string[] }}
 */
export function checkCss(cssText) {
  const violations = [];

  // Strip `/* ... */` comments first so prose that merely NAMES a
  // forbidden construct (e.g. an explanatory "no :global" comment) does
  // not trip the guard. Replace with a space to preserve token gaps.
  const css = cssText.replace(/\/\*[\s\S]*?\*\//g, " ");

  // `:global(...)` or `:global { ... }` — the explicit global escape.
  if (/:global\b/.test(css)) {
    violations.push(":global escapes CSS-Module scoping");
  }

  // `composes: <name> from global` — composing from a global class.
  if (/composes\s*:[^;]*\bfrom\s+global\b/.test(css)) {
    violations.push("composes … from global escapes CSS-Module scoping");
  }

  // `@import` whose target is not a `*.module.css`.
  // Matches both `@import "x.css";` and `@import url("x.css");`.
  const importRe = /@import\s+(?:url\(\s*)?["']?([^"')\s]+)["']?/g;
  let m;
  while ((m = importRe.exec(css)) !== null) {
    const target = m[1];
    if (!target.endsWith(".module.css")) {
      violations.push(`@import of non-module target: ${target}`);
    }
  }

  return { ok: violations.length === 0, violations };
}

/**
 * Recursively collect `*.module.css` files under `dir`.
 *
 * @param {string} dir absolute path
 * @returns {string[]} absolute file paths
 */
export function collectModuleCss(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectModuleCss(abs));
    } else if (entry.isFile() && entry.name.endsWith(".module.css")) {
      out.push(abs);
    }
  }
  return out;
}

/**
 * CLI entry point. Scans every playground CSS Module and aggregates the
 * exit code (all files checked before exiting).
 *
 * @param {string} dirRel directory relative to cwd
 */
export function main(dirRel) {
  const root = process.cwd();
  const dirAbs = path.join(root, dirRel);
  let exitCode = 0;

  for (const fileAbs of collectModuleCss(dirAbs)) {
    const rel = path.relative(root, fileAbs);
    const { ok, violations } = checkCss(readFileSync(fileAbs, "utf8"));
    if (!ok) {
      exitCode = 1;
      for (const v of violations) {
        console.log(`::warning::${TAG} ${rel}: ${v}`);
      }
    }
  }

  process.exit(exitCode);
}

if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
  main(PLAYGROUND_DIR);
}
