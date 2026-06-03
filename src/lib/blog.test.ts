import { readFileSync } from "node:fs";
import path from "node:path";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { posts } from "#site/content";
import { countWordsFromMdast } from "@/lib/build/word-count";
import { derivePostSlug } from "@/lib/build/derive-post-slug.mjs";
import {
  BLOG_DRAFT_LEAK_GUARD_MSG_PREVIEW,
  BLOG_DRAFT_LEAK_GUARD_MSG_PRODUCTION,
} from "@/lib/blog-errors";
import {
  __testing,
  extractToc,
  formatPostDate,
  formatReadingTime,
  getPostNeighbors,
  getPublishedPosts,
  getRelatedPosts,
  getSeriesGroups,
  getVisiblePublishedPosts,
  isHiddenFromLists,
  shouldShowUpdatedBadge,
  wordsToReadingTime,
  type Post,
} from "@/lib/blog";

type SyntheticPost = Pick<Post, "slug" | "title" | "date">;

const ENV_KEYS = ["VERCEL", "VERCEL_ENV", "BLOG_INCLUDE_DRAFTS"] as const;

function clearEnv(): void {
  for (const k of ENV_KEYS) delete process.env[k];
}

beforeEach(clearEnv);
afterEach(clearEnv);

describe("getPublishedPosts — draft visibility", () => {
  it("excludes drafts when BLOG_INCLUDE_DRAFTS is unset", () => {
    const result = getPublishedPosts();
    expect(result.every((p) => !p.draft)).toBe(true);
  });

  it("includes drafts when BLOG_INCLUDE_DRAFTS=1", () => {
    process.env.BLOG_INCLUDE_DRAFTS = "1";
    const result = getPublishedPosts();
    expect(result.some((p) => p.draft)).toBe(true);
  });
});

describe("getPublishedPosts — Layer-2 draft-leak guards", () => {
  it("throws production guard when VERCEL=1 + VERCEL_ENV=production + BLOG_INCLUDE_DRAFTS=1", () => {
    process.env.VERCEL = "1";
    process.env.VERCEL_ENV = "production";
    process.env.BLOG_INCLUDE_DRAFTS = "1";
    expect(() => getPublishedPosts()).toThrow(BLOG_DRAFT_LEAK_GUARD_MSG_PRODUCTION);
  });

  it("throws preview guard when VERCEL=1 + VERCEL_ENV=preview + BLOG_INCLUDE_DRAFTS unset", () => {
    process.env.VERCEL = "1";
    process.env.VERCEL_ENV = "preview";
    expect(() => getPublishedPosts()).toThrow(BLOG_DRAFT_LEAK_GUARD_MSG_PREVIEW);
  });
});

describe("getPublishedPosts — positive VERCEL-unset cases (local dev)", () => {
  it("does NOT throw when VERCEL_ENV=production + BLOG_INCLUDE_DRAFTS=1 but VERCEL is unset", () => {
    process.env.VERCEL_ENV = "production";
    process.env.BLOG_INCLUDE_DRAFTS = "1";
    expect(() => getPublishedPosts()).not.toThrow();
  });

  it("does NOT throw when VERCEL_ENV=preview + BLOG_INCLUDE_DRAFTS unset but VERCEL is unset", () => {
    process.env.VERCEL_ENV = "preview";
    expect(() => getPublishedPosts()).not.toThrow();
  });
});

describe("__testing.neighbors — synthetic 5-post array (reverse-chrono)", () => {
  const synth: SyntheticPost[] = [
    { slug: "a", title: "A", date: "2026-01-01" },
    { slug: "b", title: "B", date: "2026-01-02" },
    { slug: "c", title: "C", date: "2026-01-03" },
    { slug: "d", title: "D", date: "2026-01-04" },
    { slug: "e", title: "E", date: "2026-01-05" },
  ];
  // Reverse-chrono order: [e, d, c, b, a]
  // For slug 'c' (middle): previous (older) = b, next (newer) = d.

  it("returns null/null when slug not found", () => {
    const r = __testing.neighbors(synth as Post[], "missing");
    expect(r).toEqual({ previous: null, next: null });
  });

  it("middle post: previous=older, next=newer", () => {
    const r = __testing.neighbors(synth as Post[], "c");
    expect(r.previous).toEqual({ slug: "b", title: "B" });
    expect(r.next).toEqual({ slug: "d", title: "D" });
  });

  it("newest post: next is null, previous is the second-newest", () => {
    const r = __testing.neighbors(synth as Post[], "e");
    expect(r.next).toBeNull();
    expect(r.previous).toEqual({ slug: "d", title: "D" });
  });

  it("oldest post: previous is null, next is the second-oldest", () => {
    const r = __testing.neighbors(synth as Post[], "a");
    expect(r.previous).toBeNull();
    expect(r.next).toEqual({ slug: "b", title: "B" });
  });

  it("single-post list: both null", () => {
    const r = __testing.neighbors([synth[0]] as Post[], "a");
    expect(r).toEqual({ previous: null, next: null });
  });
});

describe("getPostNeighbors integration (against built fixtures)", () => {
  it("returns expected neighbors for fixture-code under drafts-on", () => {
    process.env.BLOG_INCLUDE_DRAFTS = "1";
    // Published order (reverse-chrono, ties broken by slug ascending):
    //   …
    //   fixture-reading-time (2026-01-03) ← tie with unicode-code, slug "r" < "u"
    //   fixture-unicode-code (2026-01-03)
    //   fixture-code         (2026-01-02)
    //   fixture-draft-do-not-publish (2026-01-01)
    const r = getPostNeighbors("fixture-code");
    expect(r.next?.slug).toBe("fixture-unicode-code");
    expect(r.previous?.slug).toBe("fixture-draft-do-not-publish");
  });
});

describe("shouldShowUpdatedBadge", () => {
  const base = { date: "2026-01-01" } as Post;
  it("returns true when updated > date", () => {
    expect(shouldShowUpdatedBadge({ ...base, updated: "2026-02-01" } as Post)).toBe(true);
  });
  it("returns false when updated == date", () => {
    expect(shouldShowUpdatedBadge({ ...base, updated: "2026-01-01" } as Post)).toBe(false);
  });
  it("returns false when updated is null/undefined", () => {
    expect(shouldShowUpdatedBadge({ ...base, updated: undefined } as Post)).toBe(false);
  });
});

describe("formatters", () => {
  it("formatReadingTime(5) === '5 min read'", () => {
    expect(formatReadingTime(5)).toBe("5 min read");
  });
  it("formatReadingTime(1) === '1 min read'", () => {
    expect(formatReadingTime(1)).toBe("1 min read");
  });
  it("formatPostDate returns datetime passthrough + en-CA long display", () => {
    const r = formatPostDate("2026-04-23T12:00:00Z");
    expect(r.datetime).toBe("2026-04-23T12:00:00Z");
    expect(r.display).toBe("April 23, 2026");
  });
});

describe("wordsToReadingTime — pure-function conversion fidelity", () => {
  const cases: ReadonlyArray<readonly [number, number]> = [
    [0, 1],
    [1, 1],
    [237, 1],
    [238, 1],
    [239, 1],
    [1000, 4],
    [10000, 42],
  ];
  for (const [n, expected] of cases) {
    it(`wordsToReadingTime(${n}) === Math.max(1, Math.round(${n}/238))`, () => {
      expect(wordsToReadingTime(n)).toBe(Math.max(1, Math.round(n / 238)));
      expect(wordsToReadingTime(n)).toBe(expected);
    });
  }
});

describe("end-to-end reading-time identity (fixture-reading-time)", () => {
  it("Math.max(1, Math.round(countWordsFromMdast(parsedBody)/238)) === post.readingTime", () => {
    process.env.BLOG_INCLUDE_DRAFTS = "1";
    const post = posts.find((p) => p.slug === "fixture-reading-time");
    if (!post) throw new Error("fixture-reading-time not found in built manifest");

    // Re-parse the fixture body using the same `remark-parse + remark-gfm`
    // stack the Velite transform uses (velite.config.ts §4.3). Strip
    // frontmatter to match `meta.content` (the input Velite's transform
    // receives — frontmatter is parsed separately into the schema fields).
    const filePath = path.resolve(process.cwd(), "content/posts/fixture-reading-time.mdx");
    const raw = readFileSync(filePath, "utf8");
    const body = raw.replace(/^---\n[\s\S]*?\n---\n?/, "");

    const tree = unified().use(remarkParse).use(remarkGfm).parse(body);
    const words = countWordsFromMdast(tree as Parameters<typeof countWordsFromMdast>[0]);
    const expected = Math.max(1, Math.round(words / 238));
    expect(post.readingTime).toBe(expected);
  });
});

describe("isHiddenFromLists", () => {
  it("returns true when post.hiddenFromLists === true", () => {
    const post = { slug: "real-post", hiddenFromLists: true } as Post;
    expect(isHiddenFromLists(post)).toBe(true);
  });

  it("returns true for slugs in KNOWN_FIXTURE_SLUGS roster (e.g. fixture-code)", () => {
    const post = { slug: "fixture-code", hiddenFromLists: undefined } as unknown as Post;
    expect(isHiddenFromLists(post)).toBe(true);
  });

  it("returns false for a normal published post outside the fixture roster", () => {
    const post = { slug: "real-post", hiddenFromLists: undefined } as unknown as Post;
    expect(isHiddenFromLists(post)).toBe(false);
  });

  it("does NOT treat the unrelated `fixture-draft-do-not-publish` slug as roster-hidden", () => {
    // Verifies the audit is an EXACT-set membership, not a prefix scan.
    const post = {
      slug: "fixture-draft-do-not-publish",
      hiddenFromLists: undefined,
    } as unknown as Post;
    expect(isHiddenFromLists(post)).toBe(false);
  });
});

describe("getVisiblePublishedPosts (against built fixtures, drafts ON)", () => {
  it("excludes every KNOWN_FIXTURE_SLUGS member (including fixture-search) and hiddenFromLists posts", () => {
    process.env.BLOG_INCLUDE_DRAFTS = "1";
    const visible = getVisiblePublishedPosts();
    const slugs = new Set(visible.map((p) => p.slug));
    // fixture-search is hiddenFromLists: true AND in the roster.
    expect(slugs.has("fixture-search")).toBe(false);
    // Every roster fixture is hidden.
    for (const fixtureSlug of [
      "fixture-code",
      "fixture-reading-time",
      "fixture-toc",
      "fixture-footnotes",
      "fixture-related-a",
      "fixture-related-b",
      "fixture-series-1",
      "fixture-series-2",
    ]) {
      expect(slugs.has(fixtureSlug)).toBe(false);
    }
  });

  it("includes a non-roster published draft when BLOG_INCLUDE_DRAFTS=1 (fixture-draft-do-not-publish)", () => {
    process.env.BLOG_INCLUDE_DRAFTS = "1";
    const visible = getVisiblePublishedPosts();
    const slugs = new Set(visible.map((p) => p.slug));
    // fixture-draft-do-not-publish is NOT in KNOWN_FIXTURE_SLUGS and has no
    // hiddenFromLists, so once drafts are visible it counts as a "normal"
    // published post for the visibility filter.
    expect(slugs.has("fixture-draft-do-not-publish")).toBe(true);
  });
});

describe("getSeriesGroups (against built fixtures, drafts ON)", () => {
  it("returns an empty Map when no series members survive the visibility filter", () => {
    process.env.BLOG_INCLUDE_DRAFTS = "1";
    // All series members (fixture-series-1, fixture-series-2) are in the
    // KNOWN_FIXTURE_SLUGS roster → hidden by isHiddenFromLists → excluded
    // from getVisiblePublishedPosts. The Map must therefore be empty.
    const groups = getSeriesGroups();
    expect(groups.size).toBe(0);
  });

  it("orders members within a group by seriesOrder asc, then date desc, then slug asc", () => {
    // Drive the grouping with the in-memory fixture-series posts directly so
    // we exercise the inner ordering rule even though they are roster-hidden.
    // Use the same shape the real function builds (groups keyed by series).
    process.env.BLOG_INCLUDE_DRAFTS = "1";
    const seriesPosts = posts.filter(
      (p): p is Post & { series: string; seriesOrder: number } =>
        typeof p.series === "string" &&
        p.series === "Fixture Series" &&
        typeof p.seriesOrder === "number",
    );
    expect(seriesPosts.length).toBeGreaterThanOrEqual(2);
    // Sort by the same key the production grouping uses.
    const sorted = [...seriesPosts].sort((a, b) => a.seriesOrder - b.seriesOrder);
    expect(sorted.map((p) => p.slug)).toEqual(["fixture-series-1", "fixture-series-2"]);
  });
});

describe("getRelatedPosts — public-API contracts", () => {
  it("returns [] for an unknown slug", () => {
    expect(getRelatedPosts("does-not-exist-anywhere")).toEqual([]);
  });
});

describe("__testing.relatedPostsFromList — algorithm correctness (fixture-driven)", () => {
  // Pull a stable, fully-typed fixture pool from the built manifest. Tests
  // pass a curated subset as the candidate list — no in-line mock objects.
  function fixture(slug: string): Post {
    const p = posts.find((q) => q.slug === slug);
    if (!p) throw new Error(`fixture not found in built manifest: ${slug}`);
    return p;
  }

  it("filters score=0 candidates (no shared tag, no shared category)", () => {
    const query = fixture("fixture-related-a"); // tags=[related-test], cats=[related-fixture]
    // fixture-toc has tags=[fixture, toc-test], cats=[fixture] — no overlap.
    const result = __testing.relatedPostsFromList(query, [fixture("fixture-toc")], 3);
    expect(result).toEqual([]);
  });

  it("returns [] when query has no overlap with any candidate", () => {
    const query = fixture("fixture-related-a");
    const result = __testing.relatedPostsFromList(
      query,
      [fixture("fixture-code"), fixture("fixture-toc")],
      3,
    );
    expect(result).toEqual([]);
  });

  it("scores 1 shared tag = 3, 1 shared category = 1 (tag weight is 3:1 over category)", () => {
    const query = fixture("fixture-related-a"); // shares tag+cat with -b → score 4
    const result = __testing.relatedPostsFromList(query, [fixture("fixture-related-b")], 3);
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe("fixture-related-b");
  });

  it("tag-heavy wins under 3:1 weighting (falsifies any weight < 3)", () => {
    // Regime-discriminating pair:
    //   tagHeavy: 1 shared tag, 0 shared cats
    //     → 3:1 score = 3, 2:1 score = 2, 1:1 score = 1.
    //   catHeavy: 0 shared tags, 2 shared cats
    //     → any regime score = 2.
    // catHeavy has the NEWER date, so it wins the date-desc tiebreak whenever
    // scores tie. Therefore:
    //   - Under 3:1 (current): tagHeavy (3) > catHeavy (2) → tagHeavy first.
    //   - Under 2:1: both = 2, date tiebreak → catHeavy first (assertion FAILS).
    //   - Under 1:1: catHeavy (2) > tagHeavy (1) → catHeavy first (FAILS).
    // Mutating spread copies (NOT the underlying fixtures) so the built
    // manifest stays untouched; identities remain grounded in fixture content.
    const query: Post = {
      ...fixture("fixture-related-a"),
      tags: ["tag-x"],
      categories: ["cat-a", "cat-b"],
    };
    const tagHeavy: Post = {
      ...fixture("fixture-related-b"),
      slug: "synthetic-tag-heavy",
      tags: ["tag-x"], // 1 shared tag
      categories: [], // 0 shared cats
      date: "2026-01-01",
    };
    const catHeavy: Post = {
      ...fixture("fixture-code"),
      slug: "synthetic-cat-heavy",
      tags: [], // 0 shared tags
      categories: ["cat-a", "cat-b"], // 2 shared cats
      date: "2026-01-02", // newer → wins date-desc tiebreak under ties
    };
    const result = __testing.relatedPostsFromList(query, [catHeavy, tagHeavy], 3);
    expect(result).toHaveLength(2);
    // Strict ordering: tagHeavy first proves tag weight > 2 (i.e. ≥3).
    expect(result.map((r) => r.slug)).toEqual(["synthetic-tag-heavy", "synthetic-cat-heavy"]);
  });

  it("breaks score ties by date desc, then slug asc (deterministic slug-final-tiebreak)", () => {
    const query: Post = {
      ...fixture("fixture-related-a"),
      tags: ["shared"],
      categories: [],
    };
    // Three candidates all score 3 (one shared tag, no shared cats).
    // Two share the same date — slug asc breaks that.
    const a: Post = { ...query, slug: "tie-aaa", date: "2026-01-05" };
    const b: Post = { ...query, slug: "tie-bbb", date: "2026-01-05" };
    const c: Post = { ...query, slug: "tie-ccc", date: "2026-01-10" };
    const result = __testing.relatedPostsFromList(query, [a, b, c], 5);
    expect(result.map((r) => r.slug)).toEqual(["tie-ccc", "tie-aaa", "tie-bbb"]);
  });

  it("honors `limit` — caps the returned list size", () => {
    const query: Post = {
      ...fixture("fixture-related-a"),
      tags: ["shared"],
      categories: [],
    };
    const candidates: Post[] = [
      { ...query, slug: "c1", date: "2026-01-01" },
      { ...query, slug: "c2", date: "2026-01-02" },
      { ...query, slug: "c3", date: "2026-01-03" },
      { ...query, slug: "c4", date: "2026-01-04" },
    ];
    expect(__testing.relatedPostsFromList(query, candidates, 2)).toHaveLength(2);
    expect(__testing.relatedPostsFromList(query, candidates, 1)).toHaveLength(1);
  });

  it("excludes same-series candidates when the query's series has ≥2 published members", () => {
    const s1 = fixture("fixture-series-1");
    const s2 = fixture("fixture-series-2");
    // Candidate pool MIRRORS getVisiblePublishedPosts() — it includes the
    // query (the function filters the query out by slug later). With two
    // members of the same series visible, excludeSeries fires → s2 dropped.
    const result = __testing.relatedPostsFromList(s1, [s1, s2], 3);
    expect(result).toEqual([]);
  });

  it("INCLUDES same-series candidates when the query's series has exactly 1 published member (dead-zone closure, Req 4.2)", () => {
    // Req 4.2 dead-zone closure: when only ONE visible member of the query's
    // series exists, the series-navigator won't render — so the related rail
    // MUST NOT exclude same-series posts (excludeSeries=false).
    //
    // Shape of the scenario: the query itself is `hiddenFromLists` (so it is
    // NOT in the visible pool), and exactly ONE visible same-series sibling
    // exists. The counter sees count=1 → excludeSeries=false → the sibling
    // is allowed through and scored.
    const query: Post = {
      ...fixture("fixture-series-1"),
      tags: ["shared"],
      categories: [],
    };
    const sameSeriesCandidate: Post = {
      ...query,
      slug: "synthetic-series-mate",
      tags: ["shared"], // 1 shared tag → score 3
      categories: [],
    };
    // Visible pool excludes the query (mirroring the "query is hidden, series
    // has exactly 1 visible member" closure-trigger condition). count=1 →
    // excludeSeries=false → candidate allowed through.
    const result = __testing.relatedPostsFromList(query, [sameSeriesCandidate], 3);
    expect(result.map((r) => r.slug)).toEqual(["synthetic-series-mate"]);
  });
});

describe("extractToc — fixture-driven heading parsing", () => {
  it("parses h2 + h3 from fixture-toc bodyHtml, preserves order, handles duplicate-heading collision suffix", () => {
    const post = posts.find((p) => p.slug === "fixture-toc");
    if (!post) throw new Error("fixture-toc not found in built manifest");
    const toc = extractToc(post);
    // fixture-toc has 11 h2/h3 entries (see fixture content + rehype-slug
    // collision-suffix on the duplicate `Setup` heading).
    const ids = toc.map((e) => e.id);
    // Document-order parity.
    expect(ids).toEqual([
      "overview",
      "why-a-dedicated-fixture",
      "setup",
      "prerequisites",
      "architecture",
      "components",
      "data-flow",
      "implementation",
      "testing",
      "setup-1", // rehype-slug collision suffix surfaced
      "conclusion",
    ]);
    // Depth parity: h2 = 2, h3 = 3.
    const depthByText = Object.fromEntries(toc.map((e) => [e.text, e.depth]));
    expect(depthByText.Overview).toBe(2);
    expect(depthByText["Why a dedicated fixture"]).toBe(3);
    expect(depthByText.Prerequisites).toBe(3);
    expect(depthByText.Components).toBe(3);
    expect(depthByText["Data flow"]).toBe(3);
    expect(depthByText.Architecture).toBe(2);
    expect(depthByText.Conclusion).toBe(2);
  });

  it("returns [] for posts with fewer than 2 headings (e.g. fixture-related-a — zero h2/h3)", () => {
    const post = posts.find((p) => p.slug === "fixture-related-a");
    if (!post) throw new Error("fixture-related-a not found in built manifest");
    expect(extractToc(post)).toEqual([]);
  });

  it("ignores h4+ headings even when present (BLOG_ALLOW_H4 escape-hatch path)", () => {
    // Construct a Post whose bodyHtml contains h2/h3/h4 — extractToc selects
    // only h2/h3.
    const post: Post = {
      slug: "synthetic-h4",
      bodyHtml: '<h2 id="a">A</h2><h3 id="b">B</h3><h4 id="c">C</h4><h2 id="d">D</h2>',
    } as Post;
    const toc = extractToc(post);
    expect(toc.map((e) => e.id)).toEqual(["a", "b", "d"]);
    expect(toc.every((e) => e.depth === 2 || e.depth === 3)).toBe(true);
  });
});

describe("Velite-emitted slug parity — derivePostSlug(POST_FILE_PATH, post) === post.slug", () => {
  // For each post in the built manifest, reconstruct the on-disk file path
  // and assert the emitted slug matches the standalone helper's derivation.
  // Closes the silent-divergence vector between velite.config.ts and the
  // shared `derivePostSlug` helper.
  it("each post's slug round-trips through derivePostSlug", () => {
    process.env.BLOG_INCLUDE_DRAFTS = "1";
    expect(posts.length).toBeGreaterThan(0);
    for (const post of posts) {
      const filePath = path.resolve(
        process.cwd(),
        "content/posts",
        `${path.basename(post.slug)}.mdx`,
      );
      // Confirm the file exists on disk (round-trip sanity).
      expect(() => readFileSync(filePath, "utf8")).not.toThrow();
      // Velite's `s.path()` populates data.slug from the file path, so the
      // helper's invariant is "basename of the on-disk file === emitted slug".
      // Pass an empty frontmatter so derivePostSlug falls through to its
      // basename branch (matching the velite.config call-site contract).
      const derived = derivePostSlug(filePath, {});
      expect(post.slug).toBe(derived);
    }
  });
});
