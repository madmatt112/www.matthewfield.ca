/**
 * Four-row truth-table coverage for the `(hiddenFromLists, excludeFromSearch)`
 * policy across all five enforcement layers (blog-enhanced Task 28; Reqs
 * 7.4, 7.11).
 *
 * The five assertions per row are:
 *   1. isHiddenFromLists(post)                — helper
 *   2. getVisiblePublishedPosts filter        — synthetic list helper
 *   3. <article data-pagefind-body> JSX       — actual page.tsx component
 *   4. generateMetadata() robots policy       — actual page.tsx export
 *   5. extraSlugs filter in run-pagefind-crawl.mjs (logic mirror)
 *
 * Regime-discriminating contract: flipping the page.tsx spread to ALWAYS emit
 * data-pagefind-body MUST fail Rows 3 + 4 (the excludeFromSearch=true rows).
 */

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Post } from "@/lib/blog";
import { isHiddenFromLists } from "@/lib/blog";

// Minimal MDX body that satisfies the `new Function(code)(runtime)` contract
// in src/components/shared/mdx-content.tsx — returns a component that renders
// an empty <span>.
const MINIMAL_MDX_BODY =
  "const{jsx:n}=arguments[0];return{default:function(){return n('span',{children:'body'})}};";

function makePost(
  slug: string,
  hiddenFromLists: boolean,
  excludeFromSearch: boolean,
): Post {
  return {
    title: `Truth-table post ${slug}`,
    description: `desc ${slug}`,
    date: "2026-01-10T00:00:00.000Z",
    tags: [],
    categories: [],
    draft: false,
    hiddenFromLists,
    excludeFromSearch,
    slug,
    body: MINIMAL_MDX_BODY,
    bodyHtml: "<p>body</p>",
    readingTime: 1,
  } as unknown as Post;
}

type Row = {
  label: string;
  slug: string;
  hiddenFromLists: boolean;
  excludeFromSearch: boolean;
  expectVisibleInLists: boolean;
  expectPagefindBody: boolean;
  expectRobotsNoIndex: boolean;
  expectInExtraSlugs: boolean;
};

const ROWS: Row[] = [
  {
    label: "Row 1 (false,false) — normal published",
    slug: "ttable-row1-published",
    hiddenFromLists: false,
    excludeFromSearch: false,
    expectVisibleInLists: true,
    expectPagefindBody: true,
    expectRobotsNoIndex: false,
    expectInExtraSlugs: false, // not hidden, so /blog index already covers it
  },
  {
    label: "Row 2 (true,false) — fixture-search config (hidden but searchable)",
    slug: "ttable-row2-fixture-search",
    hiddenFromLists: true,
    excludeFromSearch: false,
    expectVisibleInLists: false,
    expectPagefindBody: true,
    expectRobotsNoIndex: true,
    expectInExtraSlugs: true,
  },
  {
    label: "Row 3 (true,true) — hidden everywhere",
    slug: "ttable-row3-hidden-everywhere",
    hiddenFromLists: true,
    excludeFromSearch: true,
    expectVisibleInLists: false,
    expectPagefindBody: false,
    expectRobotsNoIndex: true,
    expectInExtraSlugs: false, // excludeFromSearch=true filters it out
  },
  {
    label: "Row 4 (false,true) — visible in lists but not searched",
    slug: "ttable-row4-list-only",
    hiddenFromLists: false,
    excludeFromSearch: true,
    expectVisibleInLists: true,
    expectPagefindBody: false,
    expectRobotsNoIndex: false,
    expectInExtraSlugs: false, // not hidden, so the crawler reaches it via /blog
  },
];

// Mirror of the `extraSlugs` filter in scripts/run-pagefind-crawl.mjs#buildExtraUrls.
// Source of truth: that file's predicate is
//   p.hiddenFromLists === true && !p.draft && p.excludeFromSearch !== true
function extraSlugsFilter(post: Post): boolean {
  return (
    post.hiddenFromLists === true && !post.draft && post.excludeFromSearch !== true
  );
}

// ---- vi.mock setup ---------------------------------------------------------
//
// We mock @/lib/blog so page.tsx's `getPostBySlug(slug)` returns the synthetic
// post for the row under test. Other blog helpers used by the page (toc,
// neighbors, related, series) are stubbed to inert empties — the article
// shape (data-pagefind-body presence/absence) is unaffected. We deliberately
// re-export the real `isHiddenFromLists` so the helper assertion below tests
// real production code.

const currentPost: { value: Post | null } = { value: null };

vi.mock("@/lib/blog", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/blog")>();
  return {
    ...actual,
    getPostBySlug: () => currentPost.value,
    getPublishedPosts: () => (currentPost.value ? [currentPost.value] : []),
    getPostNeighbors: () => ({ previous: null, next: null }),
    getRelatedPosts: () => [],
    getSeriesGroups: () => new Map(),
    extractToc: () => [],
  };
});

// Also stub MDXContent — Velite's compiled body string requires a non-trivial
// runtime environment; the article's data-pagefind-body attribute is on the
// outer <article>, not inside MDX, so an inert stub keeps the JSX render
// deterministic.
vi.mock("@/components/shared/mdx-content", () => ({
  MDXContent: () => null,
}));

// Stub Next.js Link to avoid router context requirements in unit-test render.
vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string } & Record<string, unknown>) =>
    React.createElement("a", { href, ...rest }, children),
}));

// Import the page module AFTER mocks are registered.
import BlogPostPage, { generateMetadata } from "@/app/(site)/blog/[slug]/page";

beforeEach(() => {
  currentPost.value = null;
});

afterEach(() => {
  currentPost.value = null;
});

describe("visibility truth table — four-row matrix", () => {
  for (const row of ROWS) {
    describe(row.label, () => {
      const post = makePost(row.slug, row.hiddenFromLists, row.excludeFromSearch);

      it("(1) isHiddenFromLists returns expected", () => {
        expect(isHiddenFromLists(post)).toBe(!row.expectVisibleInLists);
      });

      it("(2) getVisiblePublishedPosts filter includes/excludes correctly", () => {
        // Mirror the filter on a synthetic list. The production helper applies
        // exactly `!isHiddenFromLists(p)`; using the helper directly here keeps
        // the assertion regime-discriminating against that predicate.
        const list: Post[] = [post];
        const visible = list.filter((p) => !isHiddenFromLists(p));
        const included = visible.some((p) => p.slug === row.slug);
        expect(included).toBe(row.expectVisibleInLists);
      });

      it("(3) <article data-pagefind-body> rendered or omitted per page.tsx", async () => {
        currentPost.value = post;
        const element = await BlogPostPage({
          params: Promise.resolve({ slug: row.slug }),
        });
        const html = renderToStaticMarkup(element as React.ReactElement);
        const articleMatch = html.match(/<article[^>]*>/);
        expect(articleMatch, "expected an <article> element in rendered HTML").toBeTruthy();
        const articleTag = articleMatch![0];
        const hasPagefindBody = /\sdata-pagefind-body(?:=""|=|\s|>)/.test(articleTag);
        expect(hasPagefindBody).toBe(row.expectPagefindBody);
      });

      it("(4) generateMetadata returns robots: noindex/nofollow when hiddenFromLists", async () => {
        currentPost.value = post;
        const md = await generateMetadata({
          params: Promise.resolve({ slug: row.slug }),
        });
        if (row.expectRobotsNoIndex) {
          expect(md.robots).toEqual({ index: false, follow: false });
        } else {
          expect(md.robots).toBeUndefined();
        }
      });

      it("(5) extraSlugs filter (run-pagefind-crawl.mjs) includes/excludes correctly", () => {
        expect(extraSlugsFilter(post)).toBe(row.expectInExtraSlugs);
      });
    });
  }
});
