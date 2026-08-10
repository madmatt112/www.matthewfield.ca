import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";

import { ContributionHeatmap } from "./contribution-heatmap";
import type { ActivityWindow, Cell, Level, MonthTotal } from "@/lib/github-activity";

/*
 * The window is hand-built rather than produced by getActivityWindow(), which
 * reads the `#site/content` chokepoint: the component is props-driven (Req 3.1)
 * precisely so its test does not depend on what happens to be committed in
 * content/github-activity.yaml.
 *
 * 2026-02-08 is a Sunday and 2026-08-08 the Saturday 181 days later, so the 182
 * days chunk into 26 whole Sunday → Saturday columns exactly as deriveWindow()
 * guarantees.
 */
const WINDOW_START = "2026-02-08";
const WINDOW_END = "2026-08-08";
const GRID_COLUMNS = 26;
const GRID_ROWS = 7;
const DAY_MS = 86_400_000;

function addDays(iso: string, days: number): string {
  return new Date(Date.parse(`${iso}T00:00:00.000Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Mirrors `toMonthlyTotals`' contract; see the note above on not importing it. */
function monthlyTotalsFrom(cells: Cell[]): MonthTotal[] {
  const byMonth = new Map<string, Cell[]>();
  for (const cell of cells) {
    if (!cell.hasData) continue;
    const month = cell.date.slice(0, 7);
    const bucket = byMonth.get(month) ?? [];
    bucket.push(cell);
    byMonth.set(month, bucket);
  }
  return [...byMonth.entries()].map(([month, monthCells]) => ({
    month,
    total: monthCells.reduce((sum, cell) => sum + cell.count, 0),
    activeDays: monthCells.filter((cell) => cell.count > 0).length,
    isClipped: monthCells.length < 28,
    rangeStart: monthCells[0].date,
    rangeEnd: monthCells[monthCells.length - 1].date,
  }));
}

function buildWindow(dataStart: string, anchorDate: string) {
  const cells: Cell[] = [];
  for (let offset = 0; offset < GRID_COLUMNS * GRID_ROWS; offset += 1) {
    const date = addDays(WINDOW_START, offset);
    const hasData = date >= dataStart && date <= anchorDate;
    // A repeating 0-4 ramp, so a data-level that ignored its cell could not
    // hide behind a uniform grid.
    const level = (hasData ? offset % 5 : 0) as Level;
    cells.push({ date, count: hasData ? level : 0, level, hasData });
  }

  const grid: Cell[][] = [];
  for (let column = 0; column < GRID_COLUMNS; column += 1) {
    grid.push(cells.slice(column * GRID_ROWS, column * GRID_ROWS + GRID_ROWS));
  }

  const activityWindow: ActivityWindow = {
    anchorDate,
    dataStart,
    windowStart: WINDOW_START,
    windowEnd: WINDOW_END,
    publishedRangeStart: dataStart,
    publishedRangeEnd: anchorDate,
    grid,
    totalContributions: 1234,
    activeDays: 152,
    levelsPresent: new Set<Level>([0, 1, 2, 3, 4]),
    monthlyTotals: monthlyTotalsFrom(cells),
    thresholds: { p25: 1, p50: 2, p75: 3 },
  };

  return { activityWindow, covered: cells.filter((cell) => cell.hasData) };
}

/**
 * Scoped to the grid `<svg>` inside the scroll wrapper, never to the whole
 * container: the legend is a second `<svg>` of `<rect>`s in this same
 * component, and a container-wide query would silently start counting it.
 */
function gridSvg(container: HTMLElement): SVGSVGElement {
  const svg = container.querySelector<SVGSVGElement>(".contrib-heatmap__scroll svg");
  if (!svg) throw new Error("grid <svg> not found inside .contrib-heatmap__scroll");
  return svg;
}

describe("ContributionHeatmap", () => {
  // Two uncovered leading days (Feb 8-9) and, in the second fixture, three
  // uncovered trailing days.
  const full = buildWindow("2026-02-10", WINDOW_END);

  afterEach(cleanup);

  it("wraps the svg in a scroll container with no tabindex", () => {
    const { container } = render(<ContributionHeatmap window={full.activityWindow} />);
    const wrapper = container.querySelector(".contrib-heatmap__scroll");
    expect(wrapper).not.toBeNull();
    expect(wrapper?.hasAttribute("tabindex")).toBe(false);
    expect(wrapper?.querySelector("svg")).not.toBeNull();
    expect(container.querySelector("section")?.getAttribute("data-pagefind-ignore")).toBe("all");
  });

  it("renders the pinned svg geometry one-to-one", () => {
    const { container } = render(<ContributionHeatmap window={full.activityWindow} />);
    const svg = gridSvg(container);
    expect(svg.getAttribute("width")).toBe("288");
    expect(svg.getAttribute("height")).toBe("100");
    expect(svg.getAttribute("viewBox")).toBe("-1 -1 288 100");

    // First mark is Feb 10 — column 0, row 2 — at the 11px pitch and 9px mark
    // below the 17px label band plus its 4px gap.
    const first = svg.querySelector("rect");
    expect(first?.getAttribute("x")).toBe("0");
    expect(first?.getAttribute("y")).toBe("43");
    expect(first?.getAttribute("width")).toBe("9");
    expect(first?.getAttribute("height")).toBe("9");
    expect(first?.getAttribute("rx")).toBe("2");
  });

  it("gives every grid rect the cell class and its own data-level", () => {
    const { container } = render(<ContributionHeatmap window={full.activityWindow} />);
    const rects = [...gridSvg(container).querySelectorAll("rect")];
    expect(rects).toHaveLength(full.covered.length);
    rects.forEach((rect, index) => {
      expect(rect.getAttribute("class")).toBe("contrib-heatmap__cell");
      expect(rect.getAttribute("data-level")).toBe(String(full.covered[index].level));
    });
  });

  it("renders no element at all for cells without data", () => {
    const partial = buildWindow("2026-02-10", "2026-08-05");
    const { container } = render(<ContributionHeatmap window={partial.activityWindow} />);
    const rects = [...gridSvg(container).querySelectorAll("rect")];
    // 182 frame days less two unseeded leading days and three future trailing
    // days: absent, not level-0 marks.
    expect(rects).toHaveLength(177);
    expect(partial.covered).toHaveLength(177);
  });

  it("anchors the first month label at its column and the last at the grid edge", () => {
    const { container } = render(<ContributionHeatmap window={full.activityWindow} />);
    const labels = [...gridSvg(container).querySelectorAll("text")];
    expect(labels.map((label) => label.textContent)).toEqual([
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
    ]);

    const first = labels[0];
    expect(first.getAttribute("text-anchor")).toBe("start");
    expect(first.getAttribute("x")).toBe("0");
    expect(first.getAttribute("y")).toBe("13");

    // August's column starts at x=264, where a start-anchored three-glyph label
    // would run past 286px, so it flips to the right edge instead.
    const last = labels[labels.length - 1];
    expect(last.getAttribute("text-anchor")).toBe("end");
    expect(last.getAttribute("x")).toBe("286");
  });

  it("paints every month label in the inherited text colour", () => {
    const { container } = render(<ContributionHeatmap window={full.activityWindow} />);
    const labels = [...gridSvg(container).querySelectorAll("text")];
    expect(labels).toHaveLength(7);
    // SVG's initial `fill` is black, so a label with no fill paints black in
    // BOTH themes — about 1.26:1 against dark mode's --background, i.e.
    // invisible. Nothing else colours these: contributions.css styles the
    // marks via .contrib-heatmap__cell and writes no rule for the label text,
    // so the attribute on the element is the entire mechanism. Dropping it
    // must fail here rather than ship an unreadable graphic.
    labels.forEach((label) => {
      expect(label.getAttribute("fill")).toBe("currentColor");
    });
  });

  it("states the published range and both headline figures", () => {
    const { container } = render(<ContributionHeatmap window={full.activityWindow} />);
    const text = container.textContent ?? "";
    expect(text).toContain("1,234 contributions");
    expect(text).toContain("152 active days");
    expect(text).toContain("February 10, 2026");
    expect(text).toContain("August 8, 2026");
    // windowStart is internal geometry and never visitor-facing (Reqs 2.2, 7.2),
    // and no copy asserts a fixed 26-week period.
    expect(text).not.toContain("February 8, 2026");
    expect(text).not.toContain("26 weeks");
  });

  it("links to the GitHub profile in the same tab", () => {
    const { getByRole } = render(<ContributionHeatmap window={full.activityWindow} />);
    const link = getByRole("link", { name: /GitHub profile/ });
    expect(link.getAttribute("href")).toBe("https://github.com/madmatt112");
    expect(link.getAttribute("rel")).toBe("noopener");
    expect(link.hasAttribute("target")).toBe(false);
  });
});
