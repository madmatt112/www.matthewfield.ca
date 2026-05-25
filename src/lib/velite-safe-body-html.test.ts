/**
 * Verifies the Velite `safeBodyHtml` transform strips `data-copy-source="…"`
 * attributes from `bodyHtml` (the RSS-bound markdown render) while leaving
 * them intact in `body` (the MDX-compiled JSX) — blog-enhanced Task 29; Reqs
 * 9.10, 11.1, 11.4.
 *
 * Test fixture: `content/posts/fixture-unicode-code.mdx`. Its code block
 * contains a non-ASCII character (sparkle, U+2728) so that a Unicode-naive
 * edit to the strip regex would surface as a test break here.
 *
 * Falsifier (manual): comment out the
 * `.replace(/\sdata-copy-source="[^"]*"/g, "")` line in velite.config.ts,
 * rerun `pnpm vitest run velite-safe-body-html.test.ts` — assertions (a)
 * and (c) MUST fail.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getPublishedPosts } from "@/lib/blog";
import { GET as feedGET } from "@/app/feed.xml/route";

const FIXTURE_SLUG = "fixture-unicode-code";

describe("Velite safeBodyHtml — data-copy-source RSS strip", () => {
  // Fixture is a draft (so it doesn't pollute the published roster); enable
  // the draft-include guard for this suite so `getPublishedPosts` surfaces
  // it. Restored in afterAll below.
  const prevDrafts = process.env.BLOG_INCLUDE_DRAFTS;
  process.env.BLOG_INCLUDE_DRAFTS = "1";

  afterAll(() => {
    if (prevDrafts === undefined) delete process.env.BLOG_INCLUDE_DRAFTS;
    else process.env.BLOG_INCLUDE_DRAFTS = prevDrafts;
  });

  const fixture = getPublishedPosts().find((p) => p.slug === FIXTURE_SLUG);

  it("loads the non-ASCII fixture via getPublishedPosts", () => {
    expect(fixture).toBeDefined();
    expect(fixture?.bodyHtml).toContain("✨");
    expect(fixture?.body).toContain("✨");
  });

  it("(a) bodyHtml has no data-copy-source attribute", () => {
    expect(fixture?.bodyHtml).not.toContain("data-copy-source=");
    expect(fixture?.bodyHtml).not.toContain("data-copy-source");
  });

  it("(b) body (MDX output) retains the data-copy-source attribute", () => {
    // `s.mdx()` emits the compiled JSX as a JS function-body string, so the
    // attribute appears as an object key `"data-copy-source":"<base64>"`
    // rather than the HTML-style `data-copy-source="<base64>"`. Either way
    // the substring `data-copy-source` is present.
    expect(fixture?.body).toContain("data-copy-source");
  });

  describe("(c) /feed.xml route output", () => {
    let xml = "";

    beforeAll(async () => {
      const res = feedGET();
      xml = await res.text();
    });

    it("includes the fixture's content (sanity check)", () => {
      expect(xml).toContain(`/blog/${FIXTURE_SLUG}`);
      expect(xml).toContain("✨");
    });

    it("contains no data-copy-source anywhere in the rendered RSS XML", () => {
      expect(xml).not.toContain("data-copy-source");
    });
  });
});
