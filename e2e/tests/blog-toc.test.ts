import { expect, test, type Page } from "@playwright/test";
import { parse } from "node-html-parser";

// Per design §"`blog-toc.test.ts` (NEW)" — this suite proves three-source
// parity (rendered DOM heading IDs, `extractToc(post)` output, `post.bodyHtml`
// parsed via `node-html-parser`) closes the `s.mdx()` vs `s.markdown()`
// heading-ID gap. Two axes:
//
//   Build 1 axis: against /blog/fixture-toc (draft; reachable when drafts
//     are included or when `next dev` serves drafts) AND /blog/fixture-code
//     (the explicit duplicate-`## Setup` collision-suffix case).
//   Build 2 axis: against /blog/fixture-search (published, hiddenFromLists).
//
// Each axis is its own describe block with its own gating: Build 1 axis runs
// when the Pagefind index is NOT available (i.e. `next dev`); Build 2 axis
// runs when it IS available (i.e. `pnpm build:search && pnpm start`).
//
// IMPORTANT: the test imports the REAL `extractToc` helper from
// `@/lib/blog` (via relative path) and the REAL Velite post collection from
// `.velite/posts.json`, NOT reimplementations.

import { extractToc, type Post } from "../../src/lib/blog";
import postsJson from "../../.velite/posts.json" with { type: "json" };

const posts = postsJson as unknown as Post[];

function getPostOrThrow(slug: string): Post {
  const post = posts.find((p) => p.slug === slug);
  if (!post) throw new Error(`fixture post not found: ${slug}`);
  return post;
}

async function readRenderedHeadingIds(page: Page): Promise<string[]> {
  // Locator order matches DOM order. We collect IDs separately for h2 and
  // h3 then merge by walking the article in document order so the merged
  // array reflects the actual visual sequence.
  return page.evaluate(() => {
    const article = document.querySelector("article");
    if (!article) return [];
    const headings = Array.from(
      article.querySelectorAll<HTMLElement>("h2[id], h3[id]"),
    );
    return headings.map((h) => h.id);
  });
}

function readBodyHtmlHeadingIds(bodyHtml: string): string[] {
  const root = parse(bodyHtml);
  const headings = root.querySelectorAll("h2, h3");
  const ids: string[] = [];
  for (const h of headings) {
    const id = h.getAttribute("id");
    if (id) ids.push(id);
  }
  return ids;
}

function readExtractTocIds(post: Post): string[] {
  // extractToc returns [] if fewer than 2 headings — for fixtures with one
  // or zero TOC-eligible headings we still want a meaningful comparison,
  // so the equality is asserted against the actual extractToc contract.
  return extractToc(post).map((e) => e.id);
}

async function assertThreeWayParity(page: Page, slug: string) {
  const post = getPostOrThrow(slug);
  await page.goto(`/blog/${slug}`);

  const renderedIds = await readRenderedHeadingIds(page);
  const bodyHtmlIds = readBodyHtmlHeadingIds(post.bodyHtml);
  const extractTocIds = readExtractTocIds(post);

  // All three sources must agree on order AND set. Use deep equality on the
  // ordered array so a `rehype-slug` regression in either pipeline (the
  // MDX `s.mdx()` path or the markdown `s.markdown()` path) fails LOUDLY.
  //
  // Note on `extractToc`: it returns [] when fewer than 2 headings exist
  // (TOC-display heuristic). For fixtures with >= 2 headings, the three
  // arrays MUST equal each other. The fixtures pinned here all clear that
  // threshold by construction.
  expect(bodyHtmlIds).toEqual(renderedIds);
  expect(extractTocIds).toEqual(renderedIds);
  expect(extractTocIds).toEqual(bodyHtmlIds);
}

// --- Build gating: probe Pagefind index once per axis. ---------------------

let pagefindAvailable: boolean | null = null;

test.beforeAll(async ({ request, baseURL }) => {
  try {
    const resp = await request.get(`${baseURL}/pagefind/pagefind-entry.json`);
    pagefindAvailable = resp.ok();
  } catch {
    pagefindAvailable = false;
  }
});

// --- Build 1 axis ----------------------------------------------------------

test.describe("blog TOC three-source parity — Build 1 axis", () => {
  test.beforeEach(() => {
    test.skip(
      pagefindAvailable === true,
      "Pagefind index present — Build 2 (this axis runs in Build 1 only; drafts reachable).",
    );
  });

  test("fixture-toc: rendered DOM, extractToc, bodyHtml parse agree", async ({ page }) => {
    await assertThreeWayParity(page, "fixture-toc");
  });

  test("fixture-code duplicate-heading collision (setup / setup-1) parity", async ({ page }) => {
    // fixture-code carries the canonical duplicate `## Setup` pair; the
    // collision-suffix `setup-1` must appear in ALL three sources in the
    // same position relative to `setup`.
    await assertThreeWayParity(page, "fixture-code");
    const post = getPostOrThrow("fixture-code");
    const ids = readBodyHtmlHeadingIds(post.bodyHtml);
    expect(ids).toContain("setup");
    expect(ids).toContain("setup-1");
    expect(ids.indexOf("setup-1")).toBeGreaterThan(ids.indexOf("setup"));
  });
});

// --- Build 2 axis ----------------------------------------------------------

test.describe("blog TOC three-source parity — Build 2 axis", () => {
  test.beforeEach(() => {
    test.skip(
      pagefindAvailable === false,
      "Pagefind index not present — Build 1 (this axis runs in Build 2 only; published fixtures).",
    );
  });

  test("fixture-search: rendered DOM, extractToc, bodyHtml parse agree", async ({ page }) => {
    await assertThreeWayParity(page, "fixture-search");
  });

  test("fixture-toc duplicate-heading collision (setup / setup-1) source parity", async ({}) => {
    // fixture-toc itself contains the same duplicate-`## Setup` pair as
    // fixture-code. Even though /blog/fixture-toc is a draft (not
    // reachable under Build 2), the SOURCE-LEVEL parity of `extractToc`
    // vs the `s.markdown()` `bodyHtml` is still meaningful: it pins the
    // Velite pipeline outputs against each other regardless of route
    // visibility. This is a fast, route-free guardrail for the Req 7.4
    // v4 parity claim.
    const post = getPostOrThrow("fixture-toc");
    const bodyHtmlIds = readBodyHtmlHeadingIds(post.bodyHtml);
    const extractTocIds = readExtractTocIds(post);
    expect(extractTocIds).toEqual(bodyHtmlIds);
    expect(bodyHtmlIds).toContain("setup");
    expect(bodyHtmlIds).toContain("setup-1");
    expect(bodyHtmlIds.indexOf("setup-1")).toBeGreaterThan(
      bodyHtmlIds.indexOf("setup"),
    );
  });
});
