import { githubActivity } from "#site/content";

// Derivation helper for the GitHub activity heatmap (Req 2; design §Data Models).
//
// THE ONLY READER OF THE COLLECTION (Req 1.11). eslint.config.mjs allowlists
// this one path in `no-restricted-imports`; every other module receives an
// `ActivityWindow` as a prop. `JSON.parse` of `.velite/githubActivity.json` is
// prohibited everywhere, here included — the collection arrives through
// `#site/content` so the schema and the cross-entry invariants cannot be
// bypassed.
//
// CLOCK-FREE (Req 2.7). No `new Date()` with no arguments, no `Date.now()`, no
// other wall-clock source. "Today" is never consulted: `anchorDate` is the
// maximum date in the committed file, so the whole output is a pure function of
// that file and is identical on every run, in every timezone. The only
// legitimate clock in this feature lives in
// scripts/check-github-activity-freshness.mjs.
//
// UTC-ONLY ARITHMETIC (Req 2.8). Every date computation goes through
// `Date.UTC(...)` on split parts and the `getUTC*` accessors. The local-time
// forms — `new Date(y, m, d)`, and `.getDate()` / `.getMonth()` on a parsed
// value — are never used here: they resolve a day earlier or later depending on
// the runner's offset and would silently misalign grid columns. That is the
// regression github-activity.test.ts pins two zones to catch (design
// §Components), so keep the arithmetic in the helpers below rather than
// reaching for a `Date` method at a call site.
//
// NEVER READ `contributionLevel` (Req 1.8) — it is not in the schema, and the
// levels below are derived locally so that the same file always yields the same
// grid.

/** Ramp position. 0 means `count === 0` **and** `hasData` (Shared Definitions). */
export type Level = 0 | 1 | 2 | 3 | 4;

/**
 * One day in the grid frame.
 *
 * `hasData` is false when the day falls before `dataStart` (not yet seeded) or
 * after `anchorDate` (not yet happened). Such a day is NOT a zero-activity day:
 * Req 3.5 renders it as no element at all, and Req 2.4 excludes it from every
 * published figure. Its `level` is a filler 0 with no meaning — never read it
 * without checking `hasData` first.
 */
export interface Cell {
  date: string;
  count: number;
  level: Level;
  hasData: boolean;
}

/**
 * One calendar month intersecting the published range.
 *
 * `rangeStart`/`rangeEnd` are the covered days within the month, and
 * `isClipped` is true when those are narrower than the month itself. There is
 * no universal "the first month is always clipped": `publishedRangeStart` can
 * land on the 1st (`2026-02-01` and `2026-03-01` are both Sundays), which is
 * why the flag is computed rather than positional.
 */
export interface MonthTotal {
  month: string;
  total: number;
  activeDays: number;
  isClipped: boolean;
  rangeStart: string;
  rangeEnd: string;
}

/** Inclusive (R type-7) quartiles of the non-zero covered counts, unrounded. */
export interface Thresholds {
  p25: number;
  p50: number;
  p75: number;
}

/**
 * The dates that frame the grid.
 *
 * `windowStart`/`windowEnd` are internal geometry and SHALL NOT appear in any
 * visitor-facing string (Reqs 2.2, 5.2, 7.2). The published range is the only
 * period the page may state, because it is exactly the span the data covers.
 */
export interface WindowGeometry {
  anchorDate: string;
  dataStart: string;
  windowStart: string;
  windowEnd: string;
  publishedRangeStart: string;
  publishedRangeEnd: string;
}

/** Everything the heatmap renders, per requirements §Shared Definitions. */
export interface ActivityWindow extends WindowGeometry {
  /** 26 columns of 7 cells, column-major, each column Sunday → Saturday. */
  grid: Cell[][];
  totalContributions: number;
  activeDays: number;
  /** The levels actually assigned to a covered cell — what Req 4.6's legend renders. */
  levelsPresent: Set<Level>;
  monthlyTotals: MonthTotal[];
  thresholds: Thresholds | null;
}

const DAY_MS = 86_400_000;
const GRID_COLUMNS = 26;
const GRID_ROWS = 7;

/** 182 days: the window is 26 whole Sunday → Saturday columns. */
const WINDOW_DAYS = GRID_COLUMNS * GRID_ROWS;

/** `YYYY-MM-DD` → UTC midnight, via split parts so no local-time parse exists. */
function toUtcMs(iso: string): number {
  const [year, month, day] = iso.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

/** UTC milliseconds → `YYYY-MM-DD`, via the `getUTC*` accessors only. */
function toIsoDay(ms: number): string {
  const date = new Date(ms);
  const year = String(date.getUTCFullYear()).padStart(4, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Whole-day step. Exact in UTC, which has no DST discontinuity to drift across. */
function addDays(iso: string, days: number): string {
  return toIsoDay(toUtcMs(iso) + days * DAY_MS);
}

/** Sunday 0 … Saturday 6, in UTC. */
function utcDayOfWeek(iso: string): number {
  return new Date(toUtcMs(iso)).getUTCDay();
}

/**
 * Last calendar day of a `YYYY-MM` month.
 *
 * `Date.UTC(year, monthNumber, 0)` reads the 1-based month number as the
 * 0-based index of the FOLLOWING month and then steps back one day, which lands
 * on the last day of `month` — leap years included, no table.
 */
function lastDayOfMonth(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  return toIsoDay(Date.UTC(year, monthNumber, 0));
}

/**
 * Inclusive (R type-7) quantile of an ascending-sorted array.
 *
 * Linear interpolation between the two neighbouring order statistics; the
 * result is NOT rounded (Req 2.3), so a threshold of 3.25 stays 3.25 and the
 * upper-inclusive bands stay exact.
 */
function quantile(sorted: readonly number[], p: number): number {
  const h = (sorted.length - 1) * p;
  const lo = Math.floor(h);
  const hi = Math.ceil(h);
  return sorted[lo] + (h - lo) * (sorted[hi] - sorted[lo]);
}

/** The degenerate assignment: every non-zero day takes the middle level. */
function flatLevel(count: number): Level {
  return count > 0 ? 2 : 0;
}

/**
 * Assigns a ramp level to each covered count (Req 2.3).
 *
 * `counts` are the counts of `hasData` cells, in grid order; `levels` comes back
 * parallel to it. The bucketing multiset `S` is the ascending non-zero subset —
 * uncovered cells never reach this function, so they cannot bias the quartiles
 * (Req 2.4).
 *
 * Bands are upper-inclusive: `0 < c <= p25` → 1, `p25 < c <= p50` → 2,
 * `p50 < c <= p75` → 3, `c > p75` → 4. AN EMPTY BAND IS LEGAL, not an error —
 * `S = [1,1,1,1,2,3,4,10]` gives p25 1.0 / p50 1.5 / p75 3.25, and no integer
 * satisfies `1 < c <= 1.5`. That is why Req 4.6's legend renders from
 * `levelsPresent` rather than from these thresholds.
 *
 * Three degenerate paths return `thresholds: null`; they are written separately
 * because each is a distinct documented state, and Req 2.10 asserts all of them.
 */
export function bucketLevels(counts: readonly number[]): {
  thresholds: Thresholds | null;
  levels: Level[];
} {
  const nonZero = counts.filter((count) => count > 0).sort((a, b) => a - b);

  // Nothing to rank: an all-zero (or entirely uncovered) window is level 0 flat.
  if (nonZero.length === 0) {
    return { thresholds: null, levels: counts.map((): Level => 0) };
  }

  // Fewer than four non-zero days cannot support four bands.
  if (nonZero.length < 4) {
    return { thresholds: null, levels: counts.map(flatLevel) };
  }

  const p25 = quantile(nonZero, 0.25);
  const p50 = quantile(nonZero, 0.5);
  const p75 = quantile(nonZero, 0.75);

  // A collapsed spread — the outer boundaries coincide, so the ramp would
  // encode nothing and the flat assignment is the honest one.
  if (p25 === p75) {
    return { thresholds: null, levels: counts.map(flatLevel) };
  }

  return {
    thresholds: { p25, p50, p75 },
    levels: counts.map((count): Level => {
      if (count <= 0) return 0;
      if (count <= p25) return 1;
      if (count <= p50) return 2;
      if (count <= p75) return 3;
      return 4;
    }),
  };
}

/**
 * Derives the grid frame and the published range from the data's own bounds
 * (Req 2.2, requirements §Shared Definitions).
 *
 * `windowEnd` is the Saturday on-or-after `anchorDate`, so `windowStart` — 181
 * days earlier — is necessarily a Sunday and the 182 days chunk into whole
 * columns. The published range is the intersection of that frame with the data:
 * the page can then never claim a period it has no records for.
 */
export function deriveWindow(anchorDate: string, dataStart: string): WindowGeometry {
  const windowEnd = addDays(anchorDate, 6 - utcDayOfWeek(anchorDate));
  const windowStart = addDays(windowEnd, -(WINDOW_DAYS - 1));

  return {
    anchorDate,
    dataStart,
    windowStart,
    windowEnd,
    // ISO calendar dates sort lexicographically, so `max` is a string compare.
    publishedRangeStart: dataStart > windowStart ? dataStart : windowStart,
    publishedRangeEnd: anchorDate,
  };
}

/**
 * Chunks the ordered window days into 26 columns of 7, column-major, each
 * column Sunday → Saturday (Req 2.5).
 *
 * Throws on any other length rather than emitting a short grid: the shape is a
 * guarantee the SVG geometry depends on, and a silently ragged grid would
 * render as a truncated graphic on a green build.
 */
export function toGrid(cells: readonly Cell[]): Cell[][] {
  if (cells.length !== WINDOW_DAYS) {
    throw new Error(
      `toGrid expects ${WINDOW_DAYS} cells (${GRID_COLUMNS} columns × ${GRID_ROWS} days), received ${cells.length}.`,
    );
  }

  const grid: Cell[][] = [];
  for (let column = 0; column < GRID_COLUMNS; column += 1) {
    const start = column * GRID_ROWS;
    grid.push(cells.slice(start, start + GRID_ROWS));
  }
  return grid;
}

/**
 * Aggregates covered cells into one entry per calendar month, ascending
 * (Req 2.6, requirements §Shared Definitions).
 *
 * Uncovered cells are skipped, which is what keeps an unseeded leading month out
 * of the table entirely rather than reporting it as a month of zeros (Req 2.4).
 * `rangeStart`/`rangeEnd` are computed as min/max rather than first/last so the
 * function does not depend on its input being sorted.
 */
export function toMonthlyTotals(cells: readonly Cell[]): MonthTotal[] {
  const byMonth = new Map<string, Cell[]>();
  for (const cell of cells) {
    if (!cell.hasData) continue;
    const month = cell.date.slice(0, 7);
    const bucket = byMonth.get(month);
    if (bucket) bucket.push(cell);
    else byMonth.set(month, [cell]);
  }

  const months = [...byMonth.entries()].sort(([a], [b]) => (a < b ? -1 : 1));

  return months.map(([month, monthCells]) => {
    let total = 0;
    let activeDays = 0;
    let rangeStart = monthCells[0].date;
    let rangeEnd = monthCells[0].date;

    for (const cell of monthCells) {
      total += cell.count;
      if (cell.count > 0) activeDays += 1;
      if (cell.date < rangeStart) rangeStart = cell.date;
      if (cell.date > rangeEnd) rangeEnd = cell.date;
    }

    return {
      month,
      total,
      activeDays,
      isClipped: rangeStart !== `${month}-01` || rangeEnd !== lastDayOfMonth(month),
      rangeStart,
      rangeEnd,
    };
  });
}

/**
 * The single entry point the contributions page calls (Req 2.1).
 *
 * Returns `null` on an empty collection — the unseeded state — and Req 3.8 then
 * renders no section at all rather than an empty frame.
 */
export function getActivityWindow(): ActivityWindow | null {
  if (githubActivity.length === 0) return null;

  const countsByDate = new Map<string, number>();
  let dataStart = githubActivity[0].date;
  let anchorDate = githubActivity[0].date;
  for (const record of githubActivity) {
    countsByDate.set(record.date, record.count);
    if (record.date < dataStart) dataStart = record.date;
    if (record.date > anchorDate) anchorDate = record.date;
  }

  const geometry = deriveWindow(anchorDate, dataStart);

  // The 182 frame days in order. Days in the file but outside the frame are
  // simply never looked up, so a 52-week file with a 26-week window is valid
  // input (Req 2.2). Days inside the frame but outside `dataStart → anchorDate`
  // are uncovered, not quiet.
  const days = [];
  for (let offset = 0; offset < WINDOW_DAYS; offset += 1) {
    const date = addDays(geometry.windowStart, offset);
    const hasData = date >= geometry.dataStart && date <= geometry.anchorDate;
    days.push({ date, count: hasData ? (countsByDate.get(date) ?? 0) : 0, hasData });
  }

  // Only covered counts feed the bucketing (Req 2.4). Uncovered days are absent
  // from `levelByDate`, so the lookup below falls back to the filler 0 that
  // `Cell` documents as meaningless without `hasData`.
  const covered = days.filter((day) => day.hasData);
  const { thresholds, levels } = bucketLevels(covered.map((day) => day.count));
  const levelByDate = new Map<string, Level>(
    covered.map((day, index): [string, Level] => [day.date, levels[index]]),
  );

  const cells: Cell[] = days.map((day) => ({
    date: day.date,
    count: day.count,
    level: levelByDate.get(day.date) ?? 0,
    hasData: day.hasData,
  }));

  let totalContributions = 0;
  let activeDays = 0;
  const levelsPresent = new Set<Level>();
  for (const cell of cells) {
    if (!cell.hasData) continue;
    totalContributions += cell.count;
    if (cell.count > 0) activeDays += 1;
    levelsPresent.add(cell.level);
  }

  return {
    ...geometry,
    grid: toGrid(cells),
    totalContributions,
    activeDays,
    levelsPresent,
    monthlyTotals: toMonthlyTotals(cells),
    thresholds,
  };
}
