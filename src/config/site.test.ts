import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { siteConfig } from "./site";

const EXPECTED_HREFS = ["/about", "/now", "/colophon", "/contact", "/sitemap", "/slashes"];

describe("siteConfig.slashPages", () => {
  it("contains exactly the six expected slash pages", () => {
    const hrefs = siteConfig.slashPages.map((p) => p.href);
    expect(hrefs).toEqual(EXPECTED_HREFS);
  });

  it("each entry has a non-empty title", () => {
    for (const page of siteConfig.slashPages) {
      expect(page.title.length).toBeGreaterThan(0);
    }
  });

  it("each entry has a non-empty description", () => {
    for (const page of siteConfig.slashPages) {
      expect(page.description.length).toBeGreaterThan(0);
    }
  });

  it("each entry has an href starting with /", () => {
    for (const page of siteConfig.slashPages) {
      expect(page.href.startsWith("/")).toBe(true);
    }
  });
});

/**
 * Drift guard for the one unavoidable duplication of `siteConfig.url`.
 *
 * print.css expands internal `/projects/*` cross-links against a hardcoded
 * origin so a printed CV carries a followable URL. CSS cannot read TypeScript,
 * so the literal has to exist — but nothing else notices when the canonical
 * host changes here and the stylesheet keeps pointing at the old one.
 */
describe("siteConfig.url ↔ print.css origin", () => {
  it("print.css expands internal links against the canonical origin", () => {
    const printCssPath = path.join(__dirname, "..", "styles", "print.css");
    const printCss = fs.readFileSync(printCssPath, "utf8");
    const origin = new URL(siteConfig.url).origin;

    expect(
      printCss.includes(origin),
      `src/styles/print.css must contain the origin "${origin}" from siteConfig.url ` +
        `(src/config/site.ts) — update the literal in print.css's ` +
        `.profile-internal-link::after rule to match.`,
    ).toBe(true);
  });
});
