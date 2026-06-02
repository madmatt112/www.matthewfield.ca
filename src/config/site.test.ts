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
