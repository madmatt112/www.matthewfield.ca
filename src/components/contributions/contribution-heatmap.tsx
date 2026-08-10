import { siteConfig } from "@/config/site";
import {
  formatContentDate,
  formatCount,
  formatDateRange,
  formatMonthAbbrev,
} from "@/lib/format-date";
import type { ActivityWindow } from "@/lib/github-activity";

export type ContributionHeatmapProps = {
  /**
   * Never `null`. The page owns both the empty-collection and the
   * empty-window gates (Reqs 3.1, 3.8, 3.9), so this component performs no
   * lookup of its own and renders whatever window it is handed.
   */
  window: ActivityWindow;
};

/* ------------------------------------------------------------------ *
 * Geometry (design §Geometry). Every number below is PINNED, not
 * derived at render time: the document spent nine revisions closing
 * three defensible readings of "how big is the <svg>", and recomputing
 * any of it from the grid reopens them.
 *
 * 26 columns × 11px pitch = 286px of content, which fits the 288px
 * content box at a 320px viewport (page.tsx's px-4 costs 16px a side).
 * The rendered element is 288 × 100 because the viewBox carries a 1px
 * margin on all four sides — the forced-colors zero-state outline in
 * contributions.css paints at x ∈ [−1, 0] on the first column and would
 * clip against a zero-margin viewBox. Units are one-to-one; the marks
 * render at exactly 9px with no scaling.
 * ------------------------------------------------------------------ */
const PITCH = 11;
const MARK = 9;
const CORNER = 2;
const GRID_WIDTH = 286;

/** 12px label × 1.4, rounded up. Reserved space only — see LABEL_BASELINE. */
const LABEL_BAND = 17;
const LABEL_GAP = 4;
const GRID_TOP = LABEL_BAND + LABEL_GAP;

/**
 * `line-height` does not lay out SVG text: a `<text>` sits on an explicit
 * baseline, and `dominant-baseline` is not consistent enough across engines
 * to be relied on. So the band height above only reserves room, and every
 * label states its own baseline within it.
 */
const LABEL_BASELINE = 13;

/**
 * Conservative advance for a three-glyph month abbreviation at 12px in the
 * sans stack. A server component cannot measure rendered text, so the
 * "would this label overrun 286px?" test uses a fixed upper bound rather
 * than a real width — erring wide only ever right-anchors a label that
 * would have fitted, which is harmless, while erring narrow would break the
 * guarantee that ink never exceeds 286px.
 */
const MONTH_LABEL_WIDTH = 27;

type MonthLabel = {
  month: string;
  text: string;
  x: number;
  anchor: "start" | "end";
};

/**
 * Places one label per month intersecting the published range, anchored to
 * the column holding that month's first covered day (design §Geometry).
 *
 * Labels are start-anchored so a three-glyph abbreviation extends rightwards
 * over the following columns instead of centring and overhanging leftwards at
 * the leading edge. The final label flips to `text-anchor="end"` at the grid's
 * right edge when a start-anchored one would overrun 286px; those two rules
 * together are what make the ink guarantee true rather than assumed. Nothing
 * else absorbs the overflow — there is deliberately no inset.
 *
 * Collision: when two labels would overlap, the LATER one is dropped. At an
 * 11px pitch months sit ~4.3 columns apart, so this is reachable only for a
 * short published range.
 */
function buildMonthLabels(window: ActivityWindow): MonthLabel[] {
  const columnByDate = new Map<string, number>();
  window.grid.forEach((column, columnIndex) => {
    for (const cell of column) columnByDate.set(cell.date, columnIndex);
  });

  const labels: MonthLabel[] = [];
  let previousRight = Number.NEGATIVE_INFINITY;

  window.monthlyTotals.forEach((monthTotal, index) => {
    const column = columnByDate.get(monthTotal.rangeStart);
    if (column === undefined) return;

    const startX = column * PITCH;
    const isFinal = index === window.monthlyTotals.length - 1;
    const anchor = isFinal && startX + MONTH_LABEL_WIDTH > GRID_WIDTH ? "end" : "start";
    const left = anchor === "end" ? GRID_WIDTH - MONTH_LABEL_WIDTH : startX;

    if (left < previousRight) return;
    previousRight = left + MONTH_LABEL_WIDTH;

    labels.push({
      month: monthTotal.month,
      text: formatMonthAbbrev(monthTotal.month),
      x: anchor === "end" ? GRID_WIDTH : startX,
      anchor,
    });
  });

  return labels;
}

/** "1 contribution" / "1,234 contributions", with the count formatted centrally. */
function pluralize(count: number, singular: string): string {
  return `${formatCount(count)} ${count === 1 ? singular : `${singular}s`}`;
}

export function ContributionHeatmap({ window }: ContributionHeatmapProps) {
  const headingId = "github-activity-heading";
  const range = formatDateRange(window.publishedRangeStart, window.publishedRangeEnd);
  const updated = formatContentDate(window.anchorDate);
  const monthLabels = buildMonthLabels(window);

  return (
    // data-pagefind-ignore (Req 6.3): /contributions has no
    // data-pagefind-body, so Pagefind indexes the whole page. The graphic and
    // its text equivalent exist for visitors and assistive technology, not for
    // search excerpts.
    <section aria-labelledby={headingId} data-pagefind-ignore="all" className="mt-12">
      <h2 id={headingId}>GitHub activity</h2>
      {/* The summary carries the headline figures deliberately: the text
       * equivalent is forbidden from restating them (Req 5.3) and print hides
       * the graphic (Req 4.12), so this line is the only place a printed or
       * read-aloud page gets the totals. It states the PUBLISHED range —
       * windowStart/windowEnd are internal geometry and never visitor-facing
       * (Reqs 2.2, 7.2). */}
      <p>
        {pluralize(window.totalContributions, "contribution")} across{" "}
        {pluralize(window.activeDays, "active day")}, from{" "}
        <time dateTime={window.publishedRangeStart}>{range.start.display}</time> to{" "}
        <time dateTime={window.publishedRangeEnd}>{range.end.display}</time>.
      </p>
      <p>
        Counts are updated through <time dateTime={window.anchorDate}>{updated.display}</time>.
      </p>
      <p>
        <a href={siteConfig.links.github} rel="noopener">
          Matthew&rsquo;s GitHub profile
        </a>
      </p>
      {/* overflow-x: auto safety net (Req 3.6). The class is the whole
       * contract — contributions.css writes the rule, this element is the only
       * thing that can carry it, and CSS cannot conjure a wrapper. No
       * tabindex and no accessible name: at the pinned pitch nothing scrolls,
       * so a focusable region here would be permanently inert. */}
      <div className="contrib-heatmap__scroll">
        <svg width="288" height="100" viewBox="-1 -1 288 100">
          {/* fill="currentColor" is load-bearing, not decoration. SVG's initial
           * `fill` is black, and nothing else paints these labels — the marks'
           * colour comes from .contrib-heatmap__cell and contributions.css
           * writes no rule for the label text. Without this the labels stay
           * black in dark mode against an oklch(0.145 0 0) surface (~1.26:1).
           * Inheriting the surrounding text colour is the same idiom every
           * other inline SVG here uses (shared/social-links.tsx,
           * blog/share-bar.tsx). */}
          {monthLabels.map((label) => (
            <text
              key={label.month}
              className="text-xs tracking-normal"
              fill="currentColor"
              x={label.x}
              y={LABEL_BASELINE}
              textAnchor={label.anchor}
            >
              {label.text}
            </text>
          ))}
          {window.grid.map((column, columnIndex) =>
            column.map((cell, rowIndex) =>
              // A day outside dataStart → anchorDate is not a quiet day, so it
              // renders as NO ELEMENT AT ALL (Req 3.5) — not a level-0 mark,
              // not an empty rect. Its `level` is filler and must not be read.
              cell.hasData ? (
                <rect
                  key={cell.date}
                  className="contrib-heatmap__cell"
                  data-level={cell.level}
                  x={columnIndex * PITCH}
                  y={GRID_TOP + rowIndex * PITCH}
                  width={MARK}
                  height={MARK}
                  rx={CORNER}
                />
              ) : null,
            ),
          )}
        </svg>
      </div>
    </section>
  );
}
