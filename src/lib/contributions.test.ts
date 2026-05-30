// contributions.test.ts — comparator branch coverage, stability, sort order,
// type-system assertions, empty-collection behavior, and the single-sourced
// CONTRIBUTIONS_DESCRIPTION length invariant (Req 2.1, 2.8, 7.1, 1.8).
//
// Mirrors the `vi.mock("#site/content", ...)` pattern from projects.test.ts
// (see projects.test.ts:41). A mutable holder lets each case swap the
// synthetic contributions array before calling getAllContributions().
import { describe, expect, expectTypeOf, it, vi } from "vitest";

const mockContributions = vi.hoisted(() => ({
  value: [] as Array<Record<string, unknown>>,
}));

vi.mock("#site/content", () => ({
  get contributions() {
    return mockContributions.value;
  },
}));

// Import AFTER the mock is registered so the module under test resolves
// `#site/content` to the mocked module.
import {
  CONTRIBUTIONS_DESCRIPTION,
  byDateDescRepoAscTitleAsc,
  formatContributionDate,
  getAllContributions,
  type Contribution,
  type ContributionLink,
} from "@/lib/contributions";
import { formatContentDate } from "@/lib/format-date";

// Minimal synthetic factory — only the comparator-relevant fields
// (date, repo, title) are exercised; the full Velite shape is irrelevant.
function synth(
  date: string,
  repo: string,
  title: string,
): Record<string, unknown> {
  return { date, repo, title };
}

const asContrib = (c: Record<string, unknown>): Contribution =>
  c as unknown as Contribution;

// ---------------------------------------------------------------------------
// Comparator — three deterministic keys (date desc, repo asc, title asc)
// ---------------------------------------------------------------------------
describe("byDateDescRepoAscTitleAsc", () => {
  it("orders by date descending (primary key)", () => {
    const older = asContrib(synth("2025-01-01", "z/repo", "z title"));
    const newer = asContrib(synth("2025-06-01", "a/repo", "a title"));
    expect(byDateDescRepoAscTitleAsc(newer, older)).toBeLessThan(0);
    expect(byDateDescRepoAscTitleAsc(older, newer)).toBeGreaterThan(0);
  });

  it("breaks a date tie by repo ascending (second key)", () => {
    const a = asContrib(synth("2025-01-01", "alpha/repo", "z title"));
    const b = asContrib(synth("2025-01-01", "bravo/repo", "a title"));
    expect(byDateDescRepoAscTitleAsc(a, b)).toBeLessThan(0);
    expect(byDateDescRepoAscTitleAsc(b, a)).toBeGreaterThan(0);
  });

  it("breaks a date+repo tie by title ascending (third key)", () => {
    const a = asContrib(synth("2025-01-01", "same/repo", "aaa"));
    const b = asContrib(synth("2025-01-01", "same/repo", "bbb"));
    expect(byDateDescRepoAscTitleAsc(a, b)).toBeLessThan(0);
    expect(byDateDescRepoAscTitleAsc(b, a)).toBeGreaterThan(0);
  });

  it("returns 0 when all three keys are identical (stability)", () => {
    const a = asContrib(synth("2025-01-01", "same/repo", "same"));
    const b = asContrib(synth("2025-01-01", "same/repo", "same"));
    expect(byDateDescRepoAscTitleAsc(a, b)).toBe(0);
  });

  it("is stable: identical-key entries keep their original relative order", () => {
    // Array.prototype.sort is stable; a comparator returning 0 must preserve
    // input order. Tag each entry to detect any reordering.
    const items = [
      asContrib({ date: "2025-01-01", repo: "same/repo", title: "same", tag: 0 }),
      asContrib({ date: "2025-01-01", repo: "same/repo", title: "same", tag: 1 }),
      asContrib({ date: "2025-01-01", repo: "same/repo", title: "same", tag: 2 }),
    ];
    const sorted = [...items].sort(byDateDescRepoAscTitleAsc);
    expect(sorted.map((c) => (c as unknown as { tag: number }).tag)).toEqual([0, 1, 2]);
  });
});

// ---------------------------------------------------------------------------
// getAllContributions — sorts the collection; no draft filtering
// ---------------------------------------------------------------------------
describe("getAllContributions", () => {
  it("returns the collection sorted by the comparator", () => {
    mockContributions.value = [
      synth("2025-01-01", "z/repo", "z title"),
      synth("2025-06-01", "bravo/repo", "title"),
      synth("2025-06-01", "alpha/repo", "title"), // date tie → repo asc
      synth("2025-06-01", "alpha/repo", "aaa"), // date+repo tie → title asc
    ];
    const result = getAllContributions().map((c) => `${c.date}|${c.repo}|${c.title}`);
    expect(result).toEqual([
      "2025-06-01|alpha/repo|aaa",
      "2025-06-01|alpha/repo|title",
      "2025-06-01|bravo/repo|title",
      "2025-01-01|z/repo|z title",
    ]);
  });

  it("returns every entry — no draft filtering", () => {
    mockContributions.value = [
      synth("2025-01-01", "a/repo", "one"),
      synth("2025-02-01", "b/repo", "two"),
      synth("2025-03-01", "c/repo", "three"),
    ];
    expect(getAllContributions()).toHaveLength(3);
  });

  it("returns an empty array for an empty collection", () => {
    mockContributions.value = [];
    expect(getAllContributions()).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// formatContributionDate — re-export, NOT a wrapper
// ---------------------------------------------------------------------------
describe("formatContributionDate", () => {
  it("is the same reference as formatContentDate (re-export, no wrapper)", () => {
    expect(formatContributionDate).toBe(formatContentDate);
  });
});

// ---------------------------------------------------------------------------
// Type-system assertions (Req 7.1)
// ---------------------------------------------------------------------------
describe("Contribution / ContributionLink types", () => {
  it("Contribution['links'] is a non-empty array element of ContributionLink", () => {
    expectTypeOf<ContributionLink>().toEqualTypeOf<Contribution["links"][number]>();
  });

  it("ContributionLink has the expected kind union and url", () => {
    expectTypeOf<ContributionLink["kind"]>().toEqualTypeOf<
      "pr" | "commit" | "issue" | "release" | "writeup" | "discussion"
    >();
    expectTypeOf<ContributionLink["url"]>().toEqualTypeOf<string>();
  });
});

// ---------------------------------------------------------------------------
// CONTRIBUTIONS_DESCRIPTION — single source of truth, length ∈ [50,160]
// (Req 2.8). Assert the EXPORTED constant; do NOT re-declare it.
// ---------------------------------------------------------------------------
describe("CONTRIBUTIONS_DESCRIPTION", () => {
  it("length is within [50, 160]", () => {
    expect(CONTRIBUTIONS_DESCRIPTION.length).toBeGreaterThanOrEqual(50);
    expect(CONTRIBUTIONS_DESCRIPTION.length).toBeLessThanOrEqual(160);
  });
});
