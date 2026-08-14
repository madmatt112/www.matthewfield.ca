// reading.test.ts — the currently-reading / recently-read split, the
// newest-first sort, and the three-item cap on the Recently Read column.
//
// Mirrors the `vi.mock("#site/content", ...)` pattern from contributions.test.ts
// so each case can swap the synthetic reading array.
import { describe, expect, it, vi } from "vitest";

const mockReading = vi.hoisted(() => ({
  value: [] as Array<Record<string, unknown>>,
}));

vi.mock("#site/content", () => ({
  get reading() {
    return mockReading.value;
  },
}));

// Import AFTER the mock is registered so the module under test resolves
// `#site/content` to the mocked module.
import { RECENTLY_READ_LIMIT, getCurrentlyReading, getRecentlyRead } from "@/lib/reading";

function synth(title: string, started: string, finished?: string): Record<string, unknown> {
  return {
    title,
    author: "Author",
    url: "https://app.thestorygraph.com/books/x",
    started,
    cover: { src: "/static/x.jpg" },
    ...(finished ? { finished } : {}),
  };
}

describe("getCurrentlyReading", () => {
  it("returns only entries without a finished date", () => {
    mockReading.value = [
      synth("in progress", "2026-01-01"),
      synth("done", "2025-01-01", "2025-02-01"),
    ];
    expect(getCurrentlyReading().map((e) => e.title)).toEqual(["in progress"]);
  });

  it("preserves file order", () => {
    mockReading.value = [synth("second", "2026-01-01"), synth("first", "2026-05-01")];
    expect(getCurrentlyReading().map((e) => e.title)).toEqual(["second", "first"]);
  });

  it("returns an empty array when every book is finished", () => {
    mockReading.value = [synth("done", "2025-01-01", "2025-02-01")];
    expect(getCurrentlyReading()).toEqual([]);
  });
});

describe("getRecentlyRead", () => {
  it("returns only finished entries", () => {
    mockReading.value = [
      synth("in progress", "2026-01-01"),
      synth("done", "2025-01-01", "2025-02-01"),
    ];
    expect(getRecentlyRead().map((e) => e.title)).toEqual(["done"]);
  });

  it("sorts newest finished first regardless of file order", () => {
    mockReading.value = [
      synth("oldest", "2025-01-01", "2025-02-01"),
      synth("newest", "2026-01-01", "2026-06-01"),
      synth("middle", "2025-06-01", "2025-09-01"),
    ];
    expect(getRecentlyRead().map((e) => e.title)).toEqual(["newest", "middle", "oldest"]);
  });

  it(`caps the list at ${RECENTLY_READ_LIMIT} entries`, () => {
    mockReading.value = Array.from({ length: RECENTLY_READ_LIMIT + 2 }, (_, i) =>
      synth(`book ${i}`, "2025-01-01", `2025-01-0${i + 1}`),
    );
    expect(getRecentlyRead()).toHaveLength(RECENTLY_READ_LIMIT);
  });

  it("does not mutate the source collection order", () => {
    mockReading.value = [
      synth("oldest", "2025-01-01", "2025-02-01"),
      synth("newest", "2026-01-01", "2026-06-01"),
    ];
    getRecentlyRead();
    expect(mockReading.value.map((e) => e.title)).toEqual(["oldest", "newest"]);
  });

  it("returns an empty array when nothing is finished", () => {
    mockReading.value = [synth("in progress", "2026-01-01")];
    expect(getRecentlyRead()).toEqual([]);
  });
});
