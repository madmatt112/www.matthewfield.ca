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

/**
 * The legend `<svg>`, located STRUCTURALLY — the one `<svg>` in the section that
 * is not the grid — rather than by `.contrib-heatmap__legend`.
 *
 * That is the whole point of the helper. The swatch assertions below check a
 * class on every rect, and the class assertion below checks
 * `contrib-heatmap__legend` on this element; selecting the scope root by either
 * of those classes would make the matching assertion vacuous, since a missing
 * class would simply select nothing and pass. Structure is the independent
 * handle.
 */
function legendSvg(container: HTMLElement): SVGSVGElement {
  const svgs = [...container.querySelectorAll("svg")].filter(
    (svg) =>
      svg.closest(".contrib-heatmap__scroll") === null &&
      // The GitHub mark on the profile button is also a non-grid <svg>. It is
      // a single <path>, so "carries rects" separates the two without reaching
      // for .contrib-heatmap__legend — the class this helper's callers assert.
      svg.querySelector("rect") !== null,
  );
  if (svgs.length !== 1) {
    throw new Error(`expected exactly one non-grid <svg> with rects, found ${svgs.length}`);
  }
  return svgs[0];
}

function detailsElement(container: HTMLElement): HTMLDetailsElement {
  const details = container.querySelector("details");
  if (!details) throw new Error("<details> text equivalent not found");
  return details;
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

  it("states the period as a duration and both headline figures", () => {
    const { container } = render(<ContributionHeatmap window={full.activityWindow} />);
    const summary = container.querySelector("p")?.textContent ?? "";
    expect(summary).toContain("1,234 contributions");
    expect(summary).toContain("152 active days");
    // Feb 10 → Aug 8 is 180 days, which rounds to six months.
    expect(summary).toContain("in the past 6 months");
    // The summary names no endpoint at all now, which makes leaking
    // windowStart/windowEnd (Reqs 2.2, 7.2) structurally impossible here rather
    // than merely unasserted. Scoped to the summary on purpose: the freshness
    // line below it legitimately states anchorDate.
    expect(summary).not.toContain("2026");
    expect(summary).not.toContain("26 weeks");
    // windowStart is never visitor-facing ANYWHERE in the section.
    expect(container.textContent).not.toContain("February 8, 2026");
  });

  it("derives the period from the published range, not the window frame", () => {
    // dataStart lands well inside the 26-week frame, so publishedRangeStart is
    // dataStart rather than windowStart and the published span is ~2 months
    // against a 6-month frame. A period computed from the frame reads "6" here.
    const late = buildWindow("2026-06-01", "2026-08-08");
    const { container } = render(<ContributionHeatmap window={late.activityWindow} />);
    const text = container.textContent ?? "";
    expect(text).toContain("in the past 2 months");
    expect(text).not.toContain("in the past 6 months");
  });

  it("links to the GitHub profile in the same tab, as a button carrying the mark", () => {
    const { getByRole } = render(<ContributionHeatmap window={full.activityWindow} />);
    // The mark is aria-hidden, so the accessible name comes from the visible
    // "My profile" plus the sr-only suffix. Asserting the full name is what
    // stops the suffix being dropped and leaving a bare "My profile" in a
    // screen reader's link list.
    const link = getByRole("link", { name: "My profile on GitHub" });
    expect(link.getAttribute("href")).toBe("https://github.com/madmatt112");
    expect(link.getAttribute("rel")).toBe("noopener");
    expect(link.hasAttribute("target")).toBe(false);
    // Rendered through Button asChild, so the anchor itself carries the button
    // treatment rather than being wrapped in one.
    expect(link.getAttribute("data-slot")).toBe("button");
    // The visible label must remain a prefix of the accessible name (WCAG
    // 2.5.3), which a sr-only-only label would silently break.
    expect(link.textContent).toContain("My profile");
    expect(link.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("gives the legend its own svg carrying the shared style handle", () => {
    const { container } = render(<ContributionHeatmap window={full.activityWindow} />);
    // The class is the print rule's only handle (`@media print` hides
    // .contrib-heatmap__legend) and the scope root every swatch assertion below
    // depends on. Located structurally above, so this cannot pass vacuously.
    expect(legendSvg(container).getAttribute("class")).toBe("contrib-heatmap__legend");
    // An <svg> of <rect>s, never five <span>s with background-color:
    // `background-color` is forced under forced-colors and `fill-opacity` is
    // not, so the HTML reading collapses the legend to invisible boxes.
    expect(legendSvg(container).querySelectorAll("rect").length).toBeGreaterThan(0);
  });

  it("hides the legend swatches from the accessibility tree", () => {
    const { container } = render(<ContributionHeatmap window={full.activityWindow} />);
    // The swatches are a colour key to a graphic that is already a single
    // labelled leaf, and the <details> table is the full-fidelity route to the
    // same data (Req 5.3). Without this, five unnamed decorative rects start
    // being announced.
    expect(legendSvg(container).getAttribute("aria-hidden")).toBe("true");
  });

  it("flanks the swatches with the Less and More endpoints", () => {
    const { container } = render(<ContributionHeatmap window={full.activityWindow} />);
    const legend = legendSvg(container);
    const less = legend.previousElementSibling;
    const more = legend.nextElementSibling;
    // Req 4.6 / design §Components: with the <svg> aria-hidden, these two words
    // are the legend's ENTIRE accessible surface, so they are asserted as the
    // siblings either side of the swatches rather than as strings loose in the
    // document — the direction of the ramp is what they encode.
    expect(less?.textContent).toBe("Less");
    expect(more?.textContent).toBe("More");
    // ...and they only carry that meaning while they are themselves announced.
    expect(less?.closest('[aria-hidden="true"]')).toBeNull();
    expect(more?.closest('[aria-hidden="true"]')).toBeNull();
  });

  it("marks every legend rect as a swatch at its own level, ascending", () => {
    const { container } = render(<ContributionHeatmap window={full.activityWindow} />);
    const swatches = [...legendSvg(container).querySelectorAll("rect")];
    expect(swatches.map((rect) => rect.getAttribute("data-level"))).toEqual([
      "0",
      "1",
      "2",
      "3",
      "4",
    ]);
    swatches.forEach((rect) => {
      // The same class/data-level contract as the grid cells, because
      // contributions.css writes each opacity once against a selector list
      // covering both — that shared rule is what stops the legend and the grid
      // disagreeing about what a level looks like.
      expect(rect.getAttribute("class")).toBe("contrib-heatmap__swatch");
      expect(rect.getAttribute("width")).toBe("9");
      expect(rect.getAttribute("height")).toBe("9");
      expect(rect.getAttribute("rx")).toBe("2");
    });
  });

  it("renders only the levels present and discloses a period-relative scale", () => {
    // design §Testing's empty-band case: S = [1,1,1,1,2,3,4,10] leaves no
    // integer in 1 < c <= 1.5, so level 2 is never assigned and the legend must
    // not offer a swatch for it.
    const subset: ActivityWindow = {
      ...full.activityWindow,
      levelsPresent: new Set<Level>([0, 1, 3, 4]),
    };
    const { container } = render(<ContributionHeatmap window={subset} />);
    const swatches = [...legendSvg(container).querySelectorAll("rect")];
    expect(swatches.map((rect) => rect.getAttribute("data-level"))).toEqual(["0", "1", "3", "4"]);
    // Without this, a four-swatch legend reads as "this is the absolute
    // maximum" (Reqs 4.6, 11.12).
    expect(container.textContent).toContain("The scale is relative to this period");
  });

  it("omits the period-relative disclosure when every level is present", () => {
    const { container } = render(<ContributionHeatmap window={full.activityWindow} />);
    expect(legendSvg(container).querySelectorAll("rect")).toHaveLength(5);
    expect(container.textContent).not.toContain("The scale is relative to this period");
  });

  it("names the graphic once with the published range and both headline figures", () => {
    // anchorDate stops three days short of windowEnd, so a label built from the
    // window frame rather than the published range would be visible here.
    const partial = buildWindow("2026-02-10", "2026-08-05");
    const { container } = render(<ContributionHeatmap window={partial.activityWindow} />);
    const svg = gridSvg(container);

    expect(svg.getAttribute("role")).toBe("img");
    const label = svg.getAttribute("aria-label") ?? "";
    expect(label).toContain("1,234 contributions");
    expect(label).toContain("152 active days");
    // Feb 10 → Aug 5 is 177 days, six months to the nearest month.
    expect(label).toContain("in the past 6 months");
    // Neither the label nor the visible copy may state windowStart/windowEnd or
    // reach past anchorDate (Reqs 2.2, 5.2, 7.2) — the most-relitigated
    // decision in this spec.
    expect(label).not.toContain("February 8, 2026");
    expect(label).not.toContain("August 8, 2026");
    expect(container.textContent).not.toContain("February 8, 2026");
    expect(container.textContent).not.toContain("August 8, 2026");

    // role="img" makes the element a leaf, so per-cell titles would be
    // announced to nobody and cells are not tree nodes (Reqs 5.4, 5.5).
    expect(svg.querySelector("title")).toBeNull();
    expect(svg.querySelector("[tabindex]")).toBeNull();
  });

  it("ships the text equivalent as a closed details carrying the print handle", () => {
    const { container } = render(<ContributionHeatmap window={full.activityWindow} />);
    const details = detailsElement(container);
    // contributions.css forces this open in print via
    // .contrib-heatmap__details::details-content; without the class the rule
    // selects nothing and the monthly table prints collapsed.
    expect(details.getAttribute("class")).toContain("contrib-heatmap__details");
    // Closed on load — an already-open disclosure would make the print
    // force-open rule, and the check that exercises it, vacuous.
    expect(details.hasAttribute("open")).toBe(false);
  });

  it("keeps the text equivalent inside the pagefind-ignored section", () => {
    const { container } = render(<ContributionHeatmap window={full.activityWindow} />);
    const section = container.querySelector("section");
    // Req 6.3: after </section> the table would land in every search excerpt
    // and drop out of the aria-labelledby framing.
    expect(detailsElement(container).closest("[data-pagefind-ignore]")).toBe(section);
  });

  it("tabulates every month without restating the headline figures", () => {
    const { container } = render(<ContributionHeatmap window={full.activityWindow} />);
    const details = detailsElement(container);
    expect([...details.querySelectorAll("thead th")].map((cell) => cell.textContent)).toEqual([
      "Month",
      "Contributions",
      "Active days",
    ]);

    const rows = [...details.querySelectorAll("tbody tr")];
    expect(rows).toHaveLength(full.activityWindow.monthlyTotals.length);
    const march = full.activityWindow.monthlyTotals[1];
    expect(rows[1].textContent).toContain("March 2026");
    expect([...rows[1].querySelectorAll("td")].map((cell) => cell.textContent)).toEqual([
      String(march.total),
      String(march.activeDays),
    ]);

    // Req 5.3: the summary and the aria-label already carry these, and a third
    // recital makes a screen-reader user hear the same sentence three times.
    expect(details.textContent).not.toContain("1,234");
    expect(details.textContent).not.toContain("152");
  });

  it("labels month rows with the month alone, clipped or not", () => {
    const { container } = render(<ContributionHeatmap window={full.activityWindow} />);
    const rows = [...detailsElement(container).querySelectorAll("tbody tr")];

    // February is covered only from the 10th, so `isClipped` is true — but the
    // row deliberately does NOT spell out the covered days. The qualifier was
    // removed as noise; the summary's period and the freshness line carry the
    // coverage story. `isClipped` stays on the model for the SVG's month
    // labels, so this asserts the rendering choice, not the data.
    expect(full.activityWindow.monthlyTotals[0].isClipped).toBe(true);
    expect(rows[0].textContent).toContain("February 2026");
    expect(rows[0].textContent).not.toContain("covers");
    expect(rows[0].textContent).not.toContain("February 10, 2026");

    expect(full.activityWindow.monthlyTotals[1].isClipped).toBe(false);
    expect(rows[1].textContent).not.toContain("covers");
  });
});
