// resources.test.ts — comparator branch coverage, stability, seed-date
// degenerate case, category-label completeness, group order, empty-group
// omission, and the single-sourced RESOURCES_DESCRIPTION length invariant
// (Req 5.3, 5.6, 5.8, 7.2).
//
// Mirrors the `vi.mock("#site/content", ...)` pattern from projects.test.ts
// (see projects.test.ts:41). A mutable holder lets each case swap the
// synthetic resources array before calling the module under test.
import { describe, expect, it, vi } from "vitest";

const mockResources = vi.hoisted(() => ({
  value: [] as Array<Record<string, unknown>>,
}));

vi.mock("#site/content", () => ({
  get resources() {
    return mockResources.value;
  },
}));

// Import AFTER the mock is registered so the module under test resolves
// `#site/content` to the mocked module.
import {
  CATEGORY_ORDER,
  RESOURCES_DESCRIPTION,
  RESOURCE_CATEGORY_LABELS,
  byAddedDescTitleAscUrlAsc,
  formatResourceDate,
  getAllResources,
  getResourcesGroupedByCategory,
  type Resource,
  type ResourceCategory,
} from "@/lib/resources";
import { formatContentDate } from "@/lib/format-date";

// Minimal synthetic factory — only the comparator/grouping-relevant fields
// (added, title, url, category) are exercised; the full Velite shape is
// irrelevant.
function synth(
  added: string,
  title: string,
  url: string,
  category: ResourceCategory = "devops-tools",
): Record<string, unknown> {
  return { added, title, url, category };
}

const asResource = (r: Record<string, unknown>): Resource =>
  r as unknown as Resource;

// ---------------------------------------------------------------------------
// Comparator — three deterministic keys (added desc, title asc, url asc)
// ---------------------------------------------------------------------------
describe("byAddedDescTitleAscUrlAsc", () => {
  it("orders by added descending (primary key)", () => {
    const older = asResource(synth("2025-01-01", "z title", "https://z.example"));
    const newer = asResource(synth("2025-06-01", "a title", "https://a.example"));
    expect(byAddedDescTitleAscUrlAsc(newer, older)).toBeLessThan(0);
    expect(byAddedDescTitleAscUrlAsc(older, newer)).toBeGreaterThan(0);
  });

  it("breaks an added tie by title ascending (second key)", () => {
    const a = asResource(synth("2025-01-01", "aaa", "https://z.example"));
    const b = asResource(synth("2025-01-01", "bbb", "https://a.example"));
    expect(byAddedDescTitleAscUrlAsc(a, b)).toBeLessThan(0);
    expect(byAddedDescTitleAscUrlAsc(b, a)).toBeGreaterThan(0);
  });

  it("breaks an added+title tie by url ascending (third key)", () => {
    const a = asResource(synth("2025-01-01", "same", "https://a.example"));
    const b = asResource(synth("2025-01-01", "same", "https://b.example"));
    expect(byAddedDescTitleAscUrlAsc(a, b)).toBeLessThan(0);
    expect(byAddedDescTitleAscUrlAsc(b, a)).toBeGreaterThan(0);
  });

  it("returns 0 when all three keys are identical (stability)", () => {
    const a = asResource(synth("2025-01-01", "same", "https://same.example"));
    const b = asResource(synth("2025-01-01", "same", "https://same.example"));
    expect(byAddedDescTitleAscUrlAsc(a, b)).toBe(0);
  });

  it("is stable: identical-key entries keep their original relative order", () => {
    // Array.prototype.sort is stable; a comparator returning 0 must preserve
    // input order. Tag each entry to detect any reordering.
    const items = [
      asResource({ added: "2025-01-01", title: "same", url: "https://s.example", tag: 0 }),
      asResource({ added: "2025-01-01", title: "same", url: "https://s.example", tag: 1 }),
      asResource({ added: "2025-01-01", title: "same", url: "https://s.example", tag: 2 }),
    ];
    const sorted = [...items].sort(byAddedDescTitleAscUrlAsc);
    expect(sorted.map((r) => (r as unknown as { tag: number }).tag)).toEqual([0, 1, 2]);
  });

  it("seed-date degenerate case: equal `added` sorts alphabetically by title (Req 5.3)", () => {
    const items = [
      asResource(synth("2025-01-01", "Charlie", "https://c.example")),
      asResource(synth("2025-01-01", "Alpha", "https://a.example")),
      asResource(synth("2025-01-01", "Bravo", "https://b.example")),
    ];
    const sorted = [...items].sort(byAddedDescTitleAscUrlAsc);
    expect(sorted.map((r) => r.title)).toEqual(["Alpha", "Bravo", "Charlie"]);
  });
});

// ---------------------------------------------------------------------------
// getAllResources — sorts the collection by the comparator
// ---------------------------------------------------------------------------
describe("getAllResources", () => {
  it("returns the collection sorted by the comparator", () => {
    mockResources.value = [
      synth("2025-01-01", "z title", "https://z.example"),
      synth("2025-06-01", "bbb", "https://b.example"),
      synth("2025-06-01", "aaa", "https://a.example"), // added tie → title asc
      synth("2025-06-01", "aaa", "https://aa.example"), // added+title tie → url asc
    ];
    const result = getAllResources().map((r) => `${r.added}|${r.title}|${r.url}`);
    expect(result).toEqual([
      "2025-06-01|aaa|https://a.example",
      "2025-06-01|aaa|https://aa.example",
      "2025-06-01|bbb|https://b.example",
      "2025-01-01|z title|https://z.example",
    ]);
  });

  it("returns an empty array for an empty collection", () => {
    mockResources.value = [];
    expect(getAllResources()).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getResourcesGroupedByCategory — group order + per-group sort + empty omit
// ---------------------------------------------------------------------------
describe("getResourcesGroupedByCategory", () => {
  it("groups in CATEGORY_ORDER, each group sorted by the comparator", () => {
    mockResources.value = [
      synth("2025-01-01", "fun-a", "https://fa.example", "fun-stuff"),
      synth("2025-03-01", "tool-new", "https://tn.example", "devops-tools"),
      synth("2025-02-01", "tool-old", "https://to.example", "devops-tools"),
      synth("2025-01-01", "read-a", "https://ra.example", "reading"),
    ];
    const groups = getResourcesGroupedByCategory();
    expect(groups.map((g) => g.category)).toEqual(["devops-tools", "reading", "fun-stuff"]);
    // devops-tools sorted added desc within the group.
    expect(groups[0].resources.map((r) => r.title)).toEqual(["tool-new", "tool-old"]);
  });

  it("omits empty groups (Req 5.6)", () => {
    mockResources.value = [
      synth("2025-01-01", "only-reading", "https://or.example", "reading"),
    ];
    const groups = getResourcesGroupedByCategory();
    expect(groups.map((g) => g.category)).toEqual(["reading"]);
    expect(groups).toHaveLength(1);
  });

  it("group order is a prefix-consistent subsequence of CATEGORY_ORDER", () => {
    mockResources.value = [
      synth("2025-01-01", "f", "https://f.example", "fun-stuff"),
      synth("2025-01-01", "d", "https://d.example", "devops-tools"),
      synth("2025-01-01", "b", "https://b.example", "blogs-and-feeds"),
      synth("2025-01-01", "r", "https://r.example", "reading"),
    ];
    const order = getResourcesGroupedByCategory().map((g) => g.category);
    expect(order).toEqual([...CATEGORY_ORDER]);
  });
});

// ---------------------------------------------------------------------------
// RESOURCE_CATEGORY_LABELS — covers every enum member
// ---------------------------------------------------------------------------
describe("RESOURCE_CATEGORY_LABELS", () => {
  it("has a label for every category in CATEGORY_ORDER", () => {
    for (const category of CATEGORY_ORDER) {
      expect(RESOURCE_CATEGORY_LABELS[category]).toBeTruthy();
    }
  });

  it("maps each category to its expected label", () => {
    expect(RESOURCE_CATEGORY_LABELS).toEqual({
      "devops-tools": "DevOps Tools",
      "blogs-and-feeds": "Blogs & Feeds",
      reading: "Reading",
      "fun-stuff": "Fun Stuff",
    });
  });

  it("has exactly the same key set as CATEGORY_ORDER (no extras, no gaps)", () => {
    expect(Object.keys(RESOURCE_CATEGORY_LABELS).sort()).toEqual([...CATEGORY_ORDER].sort());
  });
});

// ---------------------------------------------------------------------------
// CATEGORY_ORDER — enum order
// ---------------------------------------------------------------------------
describe("CATEGORY_ORDER", () => {
  it("equals the schema enum order", () => {
    expect([...CATEGORY_ORDER]).toEqual([
      "devops-tools",
      "blogs-and-feeds",
      "reading",
      "fun-stuff",
    ]);
  });
});

// ---------------------------------------------------------------------------
// Re-exports and single-sourced description invariant
// ---------------------------------------------------------------------------
describe("formatResourceDate", () => {
  it("is the shared formatContentDate (Req 7.2 restriction)", () => {
    expect(formatResourceDate).toBe(formatContentDate);
  });
});

describe("RESOURCES_DESCRIPTION", () => {
  it("has a length within the SEO meta-description range [50, 160] (Req 5.8)", () => {
    expect(RESOURCES_DESCRIPTION.length).toBeGreaterThanOrEqual(50);
    expect(RESOURCES_DESCRIPTION.length).toBeLessThanOrEqual(160);
  });
});
