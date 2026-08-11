// github-activity.test.ts — the derivation helper's only coverage: window
// geometry, coverage/`hasData` accounting, quartile bucketing, grid shape,
// monthly aggregation, and the two-timezone regression suite (Req 2.10).
//
// Mirrors the `vi.hoisted` + `vi.mock("#site/content", …)` pattern from
// contributions.test.ts (see contributions.test.ts:10-18): a mutable holder lets
// each case swap the synthetic collection before calling getActivityWindow().
// Fixtures come from the inline factory below — NOT from
// scripts/__fixtures__/github-activity/seed-52w.json, which is an audit artifact
// proving the spec's quoted figures, not a test input.
import { beforeAll, describe, expect, it, vi } from "vitest";

const mockGithubActivity = vi.hoisted(() => ({
  value: [] as Array<{ date: string; count: number }>,
}));

vi.mock("#site/content", () => ({
  get githubActivity() {
    return mockGithubActivity.value;
  },
}));

// Import AFTER the mock is registered so the module under test resolves
// `#site/content` to the mocked module.
import {
  bucketLevels,
  deriveWindow,
  getActivityWindow,
  toGrid,
  toMonthlyTotals,
  type ActivityWindow,
  type Cell,
  type Level,
} from "@/lib/github-activity";

// ---------------------------------------------------------------------------
// Inline fixture factory
//
// The helpers here do their own date arithmetic in UTC for the same reason the
// module does (Req 2.8): a local-time fixture generator would shift its own
// dates under the pinned zones below and report a green suite as red, or worse,
// cancel out a real defect.
// ---------------------------------------------------------------------------

const DAY_MS = 86_400_000;

function utcMs(date: string): number {
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function isoDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Sunday 0 … Saturday 6, in UTC. */
function utcWeekday(date: string): number {
  return new Date(utcMs(date)).getUTCDay();
}

/** Every calendar day from `start` to `end` inclusive, ascending. */
function daysFrom(start: string, end: string): string[] {
  const dates: string[] = [];
  for (let ms = utcMs(start); ms <= utcMs(end); ms += DAY_MS) dates.push(isoDay(ms));
  return dates;
}

/**
 * A contiguous run of day records. Req 1.10 makes a gap inside
 * `dataStart → anchorDate` a build error, so every fixture is contiguous by
 * construction — a gapped fixture would exercise a state production cannot
 * reach.
 */
function days(
  start: string,
  end: string,
  count: (date: string, index: number) => number,
): Array<{ date: string; count: number }> {
  return daysFrom(start, end).map((date, index) => ({ date, count: count(date, index) }));
}

function seed(records: Array<{ date: string; count: number }>): void {
  mockGithubActivity.value = records;
}

/** Non-null `getActivityWindow()` — every case below seeds a non-empty file. */
function derive(): ActivityWindow {
  const window = getActivityWindow();
  expect(window).not.toBeNull();
  return window as ActivityWindow;
}

const flatten = (window: ActivityWindow): Cell[] => window.grid.flat();
const coveredCells = (window: ActivityWindow): Cell[] =>
  flatten(window).filter((cell) => cell.hasData);
const coveredDates = (window: ActivityWindow): string[] =>
  coveredCells(window).map((cell) => cell.date);

function cell(date: string, count: number, hasData: boolean): Cell {
  return { date, count, level: 0, hasData };
}

// The seven anchors below are one whole Sunday → Saturday week, so all seven
// share `windowEnd` 2026-08-08 and `windowStart` 2026-02-08 while
// `publishedRangeEnd` walks day by day.
const ANCHOR_WEEK = [
  { anchor: "2026-08-02", weekday: "Sunday" },
  { anchor: "2026-08-03", weekday: "Monday" },
  { anchor: "2026-08-04", weekday: "Tuesday" },
  { anchor: "2026-08-05", weekday: "Wednesday" },
  { anchor: "2026-08-06", weekday: "Thursday" },
  { anchor: "2026-08-07", weekday: "Friday" },
  { anchor: "2026-08-08", weekday: "Saturday" },
] as const;

// ---------------------------------------------------------------------------
// deriveWindow — Shared Definitions geometry (Req 2.2)
// ---------------------------------------------------------------------------
describe("deriveWindow", () => {
  it.each(ANCHOR_WEEK)(
    "$weekday anchor $anchor: windowEnd is the Saturday on-or-after, windowStart the Sunday 181 days earlier",
    ({ anchor }) => {
      const geometry = deriveWindow(anchor, "2026-01-01");

      expect(geometry.windowEnd).toBe("2026-08-08");
      expect(geometry.windowStart).toBe("2026-02-08");
      expect(utcWeekday(geometry.windowEnd)).toBe(6);
      expect(utcWeekday(geometry.windowStart)).toBe(0);
      expect(geometry.windowEnd >= anchor).toBe(true);
      expect(daysFrom(geometry.windowStart, geometry.windowEnd)).toHaveLength(182);
    },
  );

  it("publishedRangeStart is max(windowStart, dataStart) — dataStart later", () => {
    const geometry = deriveWindow("2026-08-08", "2026-03-01");
    expect(geometry.publishedRangeStart).toBe("2026-03-01");
  });

  it("publishedRangeStart is max(windowStart, dataStart) — windowStart later", () => {
    const geometry = deriveWindow("2026-08-08", "2025-01-01");
    expect(geometry.publishedRangeStart).toBe("2026-02-08");
  });

  it("publishedRangeStart is either bound when the two coincide", () => {
    const geometry = deriveWindow("2026-08-08", "2026-02-08");
    expect(geometry.publishedRangeStart).toBe("2026-02-08");
  });
});

// ---------------------------------------------------------------------------
// Anchor weekday sweep — all seven, per Req 2.10
// ---------------------------------------------------------------------------
describe("getActivityWindow — one case per anchor weekday", () => {
  it.each(ANCHOR_WEEK)(
    "$weekday anchor $anchor: the last hasData cell is anchorDate and no covered day is dropped",
    ({ anchor }) => {
      const dataStart = isoDay(utcMs(anchor) - 200 * DAY_MS);
      seed(days(dataStart, anchor, () => 1));
      const window = derive();

      const covered = coveredDates(window);
      expect(covered.at(-1)).toBe(anchor);
      // Contiguous, ascending, no duplicates, nothing missing between the
      // published bounds — asserted as a whole-sequence equality so a dropped or
      // repeated day cannot hide behind a length check.
      expect(covered).toEqual(daysFrom(window.publishedRangeStart, window.publishedRangeEnd));
      expect(covered).toEqual(daysFrom("2026-02-08", anchor));
    },
  );

  it.each(ANCHOR_WEEK)(
    "$weekday anchor $anchor: publishedRangeEnd equals anchorDate and is never later",
    ({ anchor }) => {
      const dataStart = isoDay(utcMs(anchor) - 200 * DAY_MS);
      seed(days(dataStart, anchor, () => 1));
      const window = derive();

      expect(window.publishedRangeEnd).toBe(anchor);
      expect(window.publishedRangeEnd <= window.anchorDate).toBe(true);
      // The frame runs past the data at every anchor but Saturday; the published
      // range must not follow it there.
      expect(window.publishedRangeEnd <= window.windowEnd).toBe(true);
    },
  );

  it.each(ANCHOR_WEEK)("$weekday anchor $anchor: the grid is always 26 × 7", ({ anchor }) => {
    const dataStart = isoDay(utcMs(anchor) - 200 * DAY_MS);
    seed(days(dataStart, anchor, () => 1));
    const window = derive();

    expect(window.grid).toHaveLength(26);
    expect(window.grid.every((column) => column.length === 7)).toBe(true);
    expect(flatten(window)).toHaveLength(182);
  });
});

// ---------------------------------------------------------------------------
// Collection states — Reqs 11.5-11.8, 2.10
// ---------------------------------------------------------------------------
describe("getActivityWindow — collection states", () => {
  it("returns null for an empty collection (Req 11.7 — the unseeded state)", () => {
    seed([]);
    expect(getActivityWindow()).toBeNull();
  });

  it("a single day record publishes that one day, not the whole frame", () => {
    seed([{ date: "2026-08-08", count: 5 }]);
    const window = derive();

    expect(window.dataStart).toBe("2026-08-08");
    expect(window.anchorDate).toBe("2026-08-08");
    expect(window.publishedRangeStart).toBe("2026-08-08");
    expect(window.publishedRangeEnd).toBe("2026-08-08");
    // The frame is still the full 182 days — it is geometry, not a claim.
    expect(window.windowStart).toBe("2026-02-08");
    expect(window.windowEnd).toBe("2026-08-08");
    expect(coveredDates(window)).toEqual(["2026-08-08"]);
    expect(window.totalContributions).toBe(5);
    expect(window.activeDays).toBe(1);
    // n = 1 < 4 — the degenerate flat assignment.
    expect(window.thresholds).toBeNull();
    expect([...window.levelsPresent]).toEqual([2]);
    expect(window.monthlyTotals).toEqual([
      {
        month: "2026-08",
        total: 5,
        activeDays: 1,
        isClipped: true,
        rangeStart: "2026-08-08",
        rangeEnd: "2026-08-08",
      },
    ]);
  });

  it("an all-zero file renders an empty grid, a one-level legend, and zero totals (Req 11.8)", () => {
    seed(days("2026-08-01", "2026-08-08", () => 0));
    const window = derive();

    expect(window.totalContributions).toBe(0);
    expect(window.activeDays).toBe(0);
    expect(window.thresholds).toBeNull();
    expect([...window.levelsPresent]).toEqual([0]);
    expect(coveredCells(window).every((c) => c.level === 0)).toBe(true);
    expect(window.monthlyTotals).toEqual([
      {
        month: "2026-08",
        total: 0,
        activeDays: 0,
        isClipped: true,
        rangeStart: "2026-08-01",
        rangeEnd: "2026-08-08",
      },
    ]);
  });

  it("days outside the window are ignored, and never reach the bucketing multiset", () => {
    // Three enormous pre-window days: if they leaked into `S` they would set p75
    // and push every in-window day to level 1 instead of the flat level 2.
    seed([
      ...days("2026-02-05", "2026-02-07", () => 1000),
      ...days("2026-02-08", "2026-08-08", () => 1),
    ]);
    const window = derive();

    expect(window.dataStart).toBe("2026-02-05");
    expect(window.publishedRangeStart).toBe("2026-02-08");
    expect(window.totalContributions).toBe(182);
    expect(window.activeDays).toBe(182);
    expect(coveredDates(window)).toHaveLength(182);
    expect(flatten(window).some((c) => c.count === 1000)).toBe(false);
    expect(window.thresholds).toBeNull();
    expect([...window.levelsPresent]).toEqual([2]);
  });

  it("a 52-week file with a 26-week window is valid input (Req 8.2)", () => {
    // 364 days ending on the anchor; only the trailing 182 are in frame.
    seed(days("2025-08-10", "2026-08-08", (date) => (date >= "2026-02-08" ? 3 : 1)));
    const window = derive();

    expect(window.dataStart).toBe("2025-08-10");
    expect(window.anchorDate).toBe("2026-08-08");
    expect(window.publishedRangeStart).toBe("2026-02-08");
    expect(window.grid).toHaveLength(26);
    expect(coveredDates(window)).toHaveLength(182);
    // 182 × 3 — the 182 out-of-frame days at count 1 are absent from the total.
    expect(window.totalContributions).toBe(546);
    expect(window.monthlyTotals.map((m) => m.month)).toEqual([
      "2026-02",
      "2026-03",
      "2026-04",
      "2026-05",
      "2026-06",
      "2026-07",
      "2026-08",
    ]);
  });
});

// ---------------------------------------------------------------------------
// Partial coverage — Req 2.10's `dataStart > windowStart` case
// ---------------------------------------------------------------------------
describe("getActivityWindow — partial coverage", () => {
  // Anchor Wednesday 2026-08-05 inside a frame ending Saturday 2026-08-08, with
  // data starting 2026-03-01: uncovered at BOTH edges in one fixture.
  const setup = () => {
    seed(days("2026-03-01", "2026-08-05", (_date, index) => index + 1));
    return derive();
  };

  it("publishedRangeStart is dataStart when dataStart is later than windowStart", () => {
    const window = setup();
    expect(window.windowStart).toBe("2026-02-08");
    expect(window.publishedRangeStart).toBe("2026-03-01");
    expect(window.publishedRangeEnd).toBe("2026-08-05");
  });

  it("leading and trailing out-of-coverage cells carry hasData: false and count 0", () => {
    const window = setup();
    const cells = flatten(window);

    const leading = cells.filter((c) => c.date < "2026-03-01");
    const trailing = cells.filter((c) => c.date > "2026-08-05");
    expect(leading.map((c) => c.date)).toEqual(daysFrom("2026-02-08", "2026-02-28"));
    expect(trailing.map((c) => c.date)).toEqual(daysFrom("2026-08-06", "2026-08-08"));
    expect([...leading, ...trailing].every((c) => !c.hasData && c.count === 0)).toBe(true);
    expect(coveredDates(window)).toEqual(daysFrom("2026-03-01", "2026-08-05"));
  });

  it("uncovered cells are excluded from every published figure (Req 2.4)", () => {
    const window = setup();

    // 158 covered days numbered 1…158.
    expect(coveredDates(window)).toHaveLength(158);
    expect(window.totalContributions).toBe((158 * 159) / 2);
    expect(window.activeDays).toBe(158);
    // Every covered day is non-zero, so a level 0 in `levelsPresent` could only
    // have come from an uncovered cell — this is the assertion that proves the
    // exclusion rather than merely restating the counts.
    expect(window.levelsPresent.has(0)).toBe(false);
    expect([...window.levelsPresent].sort()).toEqual([1, 2, 3, 4]);
    // February is uncovered end to end, so it is absent — not a month of zeros.
    expect(window.monthlyTotals.map((m) => m.month)).toEqual([
      "2026-03",
      "2026-04",
      "2026-05",
      "2026-06",
      "2026-07",
      "2026-08",
    ]);
  });

  it("a first month starting on the 1st is not clipped", () => {
    const window = setup();
    expect(window.monthlyTotals[0]).toMatchObject({
      month: "2026-03",
      isClipped: false,
      rangeStart: "2026-03-01",
      rangeEnd: "2026-03-31",
    });
  });
});

// ---------------------------------------------------------------------------
// bucketLevels — Req 2.3
// ---------------------------------------------------------------------------
describe("bucketLevels", () => {
  it("computes inclusive (R type-7) quartiles of the non-zero counts, unrounded", () => {
    const { thresholds } = bucketLevels([1, 1, 1, 1, 2, 3, 4, 10]);
    expect(thresholds).toEqual({ p25: 1, p50: 1.5, p75: 3.25 });
  });

  it("does not round: a fractional threshold survives as a fraction", () => {
    const { thresholds } = bucketLevels([1, 2, 3, 3, 3, 3]);
    expect(thresholds).toEqual({ p25: 2.25, p50: 3, p75: 3 });
  });

  it("returns levels parallel to the input counts", () => {
    const counts = [0, 9, 1, 5, 0, 3, 7, 2];
    const { levels } = bucketLevels(counts);
    expect(levels).toHaveLength(counts.length);
    expect(levels[0]).toBe(0);
    expect(levels[4]).toBe(0);
  });

  it("bands are upper-inclusive at exactly p25, p50 and p75", () => {
    // S = 1…9 → p25 3, p50 5, p75 7, all three present in the data.
    const { thresholds, levels } = bucketLevels([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(thresholds).toEqual({ p25: 3, p50: 5, p75: 7 });
    expect(levels).toEqual([1, 1, 1, 2, 2, 3, 3, 4, 4]);
    // Spelled out, because an off-by-one on any boundary flips a band:
    expect(levels[2]).toBe(1); // count === p25 → 1, not 2
    expect(levels[4]).toBe(2); // count === p50 → 2, not 3
    expect(levels[6]).toBe(3); // count === p75 → 3, not 4
    expect(levels[7]).toBe(4); // count  >  p75 → 4
  });

  it("count 0 is level 0 whenever thresholds exist", () => {
    const { levels } = bucketLevels([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(levels[0]).toBe(0);
  });

  // -- Degenerate path 1: n === 0 -----------------------------------------
  it("n === 0 (no non-zero counts): thresholds null, every cell level 0", () => {
    const { thresholds, levels } = bucketLevels([0, 0, 0, 0]);
    expect(thresholds).toBeNull();
    expect(levels).toEqual([0, 0, 0, 0]);
  });

  it("an empty counts array: thresholds null, no levels", () => {
    const { thresholds, levels } = bucketLevels([]);
    expect(thresholds).toBeNull();
    expect(levels).toEqual([]);
  });

  // -- Degenerate path 2: n < 4 -------------------------------------------
  it("n < 4: thresholds null, every non-zero day level 2", () => {
    const { thresholds, levels } = bucketLevels([0, 5, 9, 100]);
    expect(thresholds).toBeNull();
    expect(levels).toEqual([0, 2, 2, 2]);
  });

  it("n === 3 is still below the four-band floor", () => {
    const { thresholds, levels } = bucketLevels([1, 2, 3]);
    expect(thresholds).toBeNull();
    expect(levels).toEqual([2, 2, 2]);
  });

  it("n === 4 is the first size that supports thresholds", () => {
    const { thresholds } = bucketLevels([1, 2, 3, 4]);
    expect(thresholds).not.toBeNull();
  });

  // -- Degenerate path 3: p25 === p75 -------------------------------------
  it("p25 === p75 (collapsed spread): thresholds null, every non-zero day level 2", () => {
    const { thresholds, levels } = bucketLevels([0, 7, 7, 7, 7, 7]);
    expect(thresholds).toBeNull();
    expect(levels).toEqual([0, 2, 2, 2, 2, 2]);
  });

  // -- Degenerate path 4: bands stand, one of them empty ------------------
  it("p25 === p50 < p75: bands stand and the level 2 band is legally empty", () => {
    const { thresholds, levels } = bucketLevels([1, 1, 1, 1, 1, 2, 3, 4]);
    expect(thresholds).toEqual({ p25: 1, p50: 1, p75: 2.25 });
    // `1 < c <= 1` holds nothing — level 2 is absent and that is not an error.
    expect(levels).toEqual([1, 1, 1, 1, 1, 3, 4, 4]);
    expect(levels).not.toContain(2);
  });

  it("p25 < p50 === p75: bands stand and the level 3 band is legally empty", () => {
    const { thresholds, levels } = bucketLevels([1, 2, 3, 3, 3, 3]);
    expect(thresholds).toEqual({ p25: 2.25, p50: 3, p75: 3 });
    // `3 < c <= 3` holds nothing — level 3 is absent, and so is level 4.
    expect(levels).toEqual([1, 1, 2, 2, 2, 2]);
    expect(levels).not.toContain(3);
  });

  it("S = [1,1,1,1,2,3,4,10]: no integer satisfies 1 < c ≤ 1.5, so level 2 is empty", () => {
    const { thresholds, levels } = bucketLevels([1, 1, 1, 1, 2, 3, 4, 10]);
    expect(thresholds).toEqual({ p25: 1, p50: 1.5, p75: 3.25 });
    expect(levels).toEqual([1, 1, 1, 1, 3, 3, 4, 4]);
    expect(levels).not.toContain(2);
  });
});

// ---------------------------------------------------------------------------
// The empty band end to end — Req 2.10 and Req 4.6's legend gate
// ---------------------------------------------------------------------------
describe("getActivityWindow — thresholds non-null with an empty band", () => {
  const setup = () => {
    // Covered 2026-07-30 → 2026-08-08. The non-zero counts are exactly
    // S = [1,1,1,1,2,3,4,10]; two zero days supply level 0.
    const counts: Record<string, number> = {
      "2026-07-30": 0,
      "2026-07-31": 1,
      "2026-08-01": 1,
      "2026-08-02": 1,
      "2026-08-03": 1,
      "2026-08-04": 2,
      "2026-08-05": 3,
      "2026-08-06": 4,
      "2026-08-07": 10,
      "2026-08-08": 0,
    };
    seed(days("2026-07-30", "2026-08-08", (date) => counts[date]));
    return derive();
  };

  it("keeps thresholds non-null even though one band is empty", () => {
    expect(setup().thresholds).toEqual({ p25: 1, p50: 1.5, p75: 3.25 });
  });

  it("levelsPresent is {0,1,3,4} — the legend renders from this, so it omits level 2", () => {
    const window = setup();
    expect([...window.levelsPresent].sort()).toEqual([0, 1, 3, 4]);
    expect(window.levelsPresent.has(2)).toBe(false);
  });

  it("assigns each covered day the level its count earns", () => {
    const byDate = new Map(coveredCells(setup()).map((c) => [c.date, c.level]));
    expect(Object.fromEntries(byDate)).toEqual({
      "2026-07-30": 0,
      "2026-07-31": 1,
      "2026-08-01": 1,
      "2026-08-02": 1,
      "2026-08-03": 1,
      "2026-08-04": 3,
      "2026-08-05": 3,
      "2026-08-06": 4,
      "2026-08-07": 4,
      "2026-08-08": 0,
    });
  });

  it("totals and active days count only covered cells", () => {
    const window = setup();
    expect(window.totalContributions).toBe(23);
    expect(window.activeDays).toBe(8);
  });
});

// ---------------------------------------------------------------------------
// toGrid — Req 2.5
// ---------------------------------------------------------------------------
describe("toGrid", () => {
  const frame = daysFrom("2026-02-08", "2026-08-08").map((date) => cell(date, 0, true));

  it("emits 26 columns of 7, column-major, each column Sunday → Saturday", () => {
    const grid = toGrid(frame);

    expect(grid).toHaveLength(26);
    expect(grid.every((column) => column.length === 7)).toBe(true);
    expect(grid.every((column) => utcWeekday(column[0].date) === 0)).toBe(true);
    expect(grid.every((column) => utcWeekday(column[6].date) === 6)).toBe(true);
    expect(grid[0][0].date).toBe("2026-02-08");
    expect(grid[25][6].date).toBe("2026-08-08");
  });

  it("preserves input order across the column-major chunking", () => {
    const grid = toGrid(frame);
    expect(grid.flat().map((c) => c.date)).toEqual(frame.map((c) => c.date));
    expect(grid[1][0].date).toBe("2026-02-15");
    expect(grid[3][4].date).toBe("2026-03-05");
  });

  it("throws rather than emitting a short grid", () => {
    expect(() => toGrid(frame.slice(0, 181))).toThrow(/182 cells/);
    expect(() => toGrid(frame.slice(0, 181))).toThrow(/received 181/);
  });

  it("throws on a long grid too", () => {
    expect(() => toGrid([...frame, cell("2026-08-09", 0, true)])).toThrow(/received 183/);
  });

  it("throws on an empty array", () => {
    expect(() => toGrid([])).toThrow(/received 0/);
  });
});

// ---------------------------------------------------------------------------
// toMonthlyTotals — Req 2.6
// ---------------------------------------------------------------------------
describe("toMonthlyTotals", () => {
  it("reports a clipped first month, a whole middle month and a clipped last month", () => {
    const cells = [
      // Uncovered padding on both sides — must be skipped entirely.
      ...daysFrom("2026-03-01", "2026-03-14").map((d) => cell(d, 9, false)),
      ...daysFrom("2026-03-15", "2026-05-20").map((d, i) => cell(d, i % 3, true)),
      ...daysFrom("2026-05-21", "2026-05-31").map((d) => cell(d, 9, false)),
    ];

    expect(toMonthlyTotals(cells)).toEqual([
      {
        month: "2026-03",
        total: 16,
        activeDays: 11,
        isClipped: true,
        rangeStart: "2026-03-15",
        rangeEnd: "2026-03-31",
      },
      {
        month: "2026-04",
        total: 30,
        activeDays: 20,
        isClipped: false,
        rangeStart: "2026-04-01",
        rangeEnd: "2026-04-30",
      },
      {
        month: "2026-05",
        total: 20,
        activeDays: 13,
        isClipped: true,
        rangeStart: "2026-05-01",
        rangeEnd: "2026-05-20",
      },
    ]);
  });

  it("returns months ascending, and ranges by min/max, regardless of input order", () => {
    // Reversed rather than gapped: Req 1.10 makes a gap inside the covered
    // range a build error, so a discontiguous month is not a reachable state and
    // is not worth pinning behaviour for. What is worth pinning is that
    // rangeStart/rangeEnd are min/max and not first/last.
    const cells = daysFrom("2026-03-01", "2026-05-31")
      .map((d) => cell(d, 1, true))
      .reverse();

    const months = toMonthlyTotals(cells);
    expect(months.map((m) => m.month)).toEqual(["2026-03", "2026-04", "2026-05"]);
    expect(months[0]).toMatchObject({
      rangeStart: "2026-03-01",
      rangeEnd: "2026-03-31",
      isClipped: false,
    });
  });

  it("skips uncovered cells entirely rather than reporting a month of zeros", () => {
    const cells = [
      ...daysFrom("2026-02-01", "2026-02-28").map((d) => cell(d, 5, false)),
      ...daysFrom("2026-03-01", "2026-03-31").map((d) => cell(d, 2, true)),
    ];
    const months = toMonthlyTotals(cells);
    expect(months.map((m) => m.month)).toEqual(["2026-03"]);
    expect(months[0].total).toBe(62);
  });

  it("returns an empty array when nothing is covered", () => {
    expect(
      toMonthlyTotals(daysFrom("2026-02-01", "2026-02-28").map((d) => cell(d, 1, false))),
    ).toEqual([]);
  });

  it("recognises a whole February in a non-leap year (28 days) as unclipped", () => {
    const cells = daysFrom("2026-02-01", "2026-02-28").map((d) => cell(d, 1, true));
    expect(toMonthlyTotals(cells)[0]).toMatchObject({
      month: "2026-02",
      isClipped: false,
      rangeEnd: "2026-02-28",
    });
  });

  it("recognises a whole February in a leap year (29 days) as unclipped", () => {
    const cells = daysFrom("2024-02-01", "2024-02-29").map((d) => cell(d, 1, true));
    expect(toMonthlyTotals(cells)[0]).toMatchObject({
      month: "2024-02",
      isClipped: false,
      rangeEnd: "2024-02-29",
    });
  });

  it("a first month is not clipped when the published range starts on the 1st", () => {
    // windowStart itself lands on the 1st here: 2026-02-01 is a Sunday, so the
    // Saturday-anchored frame starts on it. There is no universal "the first
    // month is always clipped".
    seed(days("2026-01-01", "2026-08-01", () => 1));
    const window = derive();

    expect(window.windowStart).toBe("2026-02-01");
    expect(window.publishedRangeStart).toBe("2026-02-01");
    expect(window.monthlyTotals[0]).toMatchObject({
      month: "2026-02",
      isClipped: false,
      rangeStart: "2026-02-01",
      rangeEnd: "2026-02-28",
    });
    expect(window.monthlyTotals.at(-1)).toMatchObject({
      month: "2026-08",
      isClipped: true,
      rangeStart: "2026-08-01",
      rangeEnd: "2026-08-01",
    });
  });
});

// ---------------------------------------------------------------------------
// Two-timezone regression suite
//
// WHY TWO ZONES, AND WHY DROPPING EITHER IS A SILENT LOSS.
// A bare `YYYY-MM-DD` already parses as UTC, so the naive "date string parses
// local" defect cannot occur here. The residual risk is a future refactor
// reaching for a local-time Date form, and the two forms fail in OPPOSITE
// directions — one zone cannot see both:
//
//   Europe/Berlin (UTC+2)  catches `new Date(2026, 7, 8)`      → 2026-08-07
//   America/Edmonton (UTC-6) catches `new Date("2026-08-08").getDate()` → 7
//
// Delete Europe/Berlin and component-wise construction ships unnoticed; delete
// America/Edmonton and the local-accessor form does. The zones are
// complementary, not redundant (design §Required code comments).
//
// WHAT THE SETUP ASSERT BUYS, AND WHAT IT DOES NOT.
// It stops a block passing quietly while the process is NOT actually in that
// zone — an env var that was set too late, or a runner that ignored it. It does
// NOT keep the zone coverage alive under a plain `pnpm test`: a skip is silent,
// and under a plain run both blocks skip. The only thing that guarantees both
// zones actually execute is the `pnpm test:tz` step in CI, which runs vitest
// once per zone against this file. Deleting that step deletes all zone coverage.
//
// The skipped tests are named `TZ-ZONE[<zone>]` so a run can be grepped for
// what did and did not execute.
// ---------------------------------------------------------------------------
const TZ_ZONES = ["America/Edmonton", "Europe/Berlin"] as const;

describe.each(TZ_ZONES)("UTC date arithmetic under TZ=%s", (zone) => {
  const pinned = process.env.TZ === zone;

  // Registered only when the runner is pinned: an unconditional hook would turn
  // the intended skip into a red suite on every plain `pnpm test`.
  if (pinned) {
    beforeAll(() => {
      expect(process.env.TZ).toBe(zone);
      // The env var is the request; this is the confirmation that the runtime
      // honoured it, which is the failure mode the assert exists for.
      expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe(zone);
    });
  }

  const zoneIt = pinned ? it : it.skip;

  const setup = () => {
    seed(days("2026-03-01", "2026-08-08", () => 2));
    return derive();
  };

  zoneIt(`TZ-ZONE[${zone}] deriveWindow returns the same UTC geometry`, () => {
    expect(deriveWindow("2026-08-08", "2026-03-01")).toEqual({
      anchorDate: "2026-08-08",
      dataStart: "2026-03-01",
      windowStart: "2026-02-08",
      windowEnd: "2026-08-08",
      publishedRangeStart: "2026-03-01",
      publishedRangeEnd: "2026-08-08",
    });
  });

  zoneIt(`TZ-ZONE[${zone}] windowStart is a Sunday and windowEnd a Saturday`, () => {
    const geometry = deriveWindow("2026-08-05", "2026-03-01");
    expect(geometry.windowStart).toBe("2026-02-08");
    expect(geometry.windowEnd).toBe("2026-08-08");
    expect(utcWeekday(geometry.windowStart)).toBe(0);
    expect(utcWeekday(geometry.windowEnd)).toBe(6);
  });

  zoneIt(`TZ-ZONE[${zone}] every grid column runs Sunday → Saturday`, () => {
    const window = setup();
    const cells = flatten(window);

    expect(cells.map((c) => c.date)).toEqual(daysFrom("2026-02-08", "2026-08-08"));
    expect(window.grid.every((column) => utcWeekday(column[0].date) === 0)).toBe(true);
    expect(window.grid.every((column) => utcWeekday(column[6].date) === 6)).toBe(true);
    expect(window.grid[0][0].date).toBe("2026-02-08");
    expect(window.grid[25][6].date).toBe("2026-08-08");
  });

  zoneIt(`TZ-ZONE[${zone}] coverage boundaries and published figures are unchanged`, () => {
    const window = setup();

    expect(coveredDates(window)).toEqual(daysFrom("2026-03-01", "2026-08-08"));
    expect(window.publishedRangeStart).toBe("2026-03-01");
    expect(window.publishedRangeEnd).toBe("2026-08-08");
    expect(window.totalContributions).toBe(322);
    expect(window.activeDays).toBe(161);
  });

  zoneIt(`TZ-ZONE[${zone}] month-end detection holds for 31-, 30- and 28-day months`, () => {
    const window = setup();
    const byMonth = new Map(window.monthlyTotals.map((m) => [m.month, m]));

    expect(window.monthlyTotals.map((m) => m.month)).toEqual([
      "2026-03",
      "2026-04",
      "2026-05",
      "2026-06",
      "2026-07",
      "2026-08",
    ]);
    expect(byMonth.get("2026-03")).toMatchObject({ isClipped: false, rangeEnd: "2026-03-31" });
    expect(byMonth.get("2026-04")).toMatchObject({ isClipped: false, rangeEnd: "2026-04-30" });
    expect(byMonth.get("2026-08")).toMatchObject({ isClipped: true, rangeEnd: "2026-08-08" });

    const february = toMonthlyTotals(
      daysFrom("2026-02-01", "2026-02-28").map((d) => cell(d, 1, true)),
    );
    expect(february[0]).toMatchObject({ isClipped: false, rangeEnd: "2026-02-28" });
  });
});

// ---------------------------------------------------------------------------
// Type-system assertion — `Level` is the closed 0-4 union the ramp depends on
// ---------------------------------------------------------------------------
describe("Level", () => {
  it("is the closed 0-4 union", () => {
    const all: Level[] = [0, 1, 2, 3, 4];
    expect(all).toHaveLength(5);
  });
});
