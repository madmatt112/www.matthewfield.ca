import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Active-role ↔ token presence test (Task 20).
 *
 * Asserts every role the design system calls "active" is (a) defined as a
 * `--<role>` custom property in tokens.css — in BOTH the `:root` (light) and
 * `.dark` blocks — and (b) mapped to `--color-<role>` inside the `@theme`
 * block of globals.css, so the matching Tailwind utility resolves.
 *
 * Lightweight text-based stand-in until the deferred CI active-role↔token
 * check lands. If a role is added to the design but missing from tokens or
 * @theme, the corresponding assertion fails loudly with the role name.
 */

const stylesDir = __dirname;
const tokensCss = fs.readFileSync(path.join(stylesDir, "tokens.css"), "utf8");
const globalsCss = fs.readFileSync(path.join(stylesDir, "globals.css"), "utf8");

/** Active roles the design system guarantees. */
const ACTIVE_ROLES = [
  "brand",
  "brand-foreground",
  "brand-visited",
  "success",
  "success-foreground",
  "warning",
  "warning-foreground",
  "info",
  "info-foreground",
  "destructive",
] as const;

/** Optional role: asserted only if the repo defines it. */
const OPTIONAL_ROLES = ["destructive-foreground"] as const;

function extractBlock(css: string, selector: string): string {
  const start = css.indexOf(selector);
  expect(start, `expected selector "${selector}" in CSS`).toBeGreaterThanOrEqual(0);
  const open = css.indexOf("{", start);
  expect(open, `expected "{" after "${selector}"`).toBeGreaterThanOrEqual(0);
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}") {
      depth--;
      if (depth === 0) return css.slice(open + 1, i);
    }
  }
  throw new Error(`unterminated block for selector "${selector}"`);
}

const rootBlock = extractBlock(tokensCss, ":root");
const darkBlock = extractBlock(tokensCss, ".dark");
const themeBlock = extractBlock(globalsCss, "@theme inline");

function hasProp(block: string, role: string): boolean {
  return new RegExp(`--${role}\\s*:`).test(block);
}

function hasThemeMapping(block: string, role: string): boolean {
  return new RegExp(`--color-${role}\\s*:`).test(block);
}

describe("active-role ↔ token presence", () => {
  for (const role of ACTIVE_ROLES) {
    it(`defines --${role} in :root (light) of tokens.css`, () => {
      expect(hasProp(rootBlock, role), `missing --${role} in :root`).toBe(true);
    });

    it(`defines --${role} in .dark of tokens.css`, () => {
      expect(hasProp(darkBlock, role), `missing --${role} in .dark`).toBe(true);
    });

    it(`maps --color-${role} in the @theme block of globals.css`, () => {
      expect(hasThemeMapping(themeBlock, role), `missing --color-${role} in @theme`).toBe(true);
    });
  }

  for (const role of OPTIONAL_ROLES) {
    it(`if --${role} exists it is mapped consistently across tokens + @theme`, () => {
      const inRoot = hasProp(rootBlock, role);
      if (!inRoot) return; // optional role not present; nothing to enforce
      expect(hasProp(darkBlock, role), `--${role} in :root but missing in .dark`).toBe(true);
      expect(
        hasThemeMapping(themeBlock, role),
        `--${role} defined but missing --color-${role} in @theme`,
      ).toBe(true);
    });
  }
});
