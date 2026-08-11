import { GitHubIcon } from "@/components/shared/github-icon";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import {
  formatApproximateSpan,
  formatContentDate,
  formatCount,
  formatMonthAbbrev,
  formatMonthYear,
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

/**
 * Levels 0–4 (Req 2.3). The legend renders only the levels in `levelsPresent`,
 * so this is the count a FULL ramp would show — anything short of it is a
 * period-relative scale and must say so (Req 4.6).
 */
const RAMP_LEVELS = 5;

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
  const updated = formatContentDate(window.anchorDate);
  const monthLabels = buildMonthLabels(window);

  /* The period is stated as a duration rather than two endpoints, and it is
   * DERIVED from the published range (Req 5.2), not hardcoded:
   * publishedRangeStart is max(windowStart, dataStart), so a thinly seeded file
   * publishes a shorter span and a literal "6 months" would be false.
   *
   * A duration is relative to when the data was captured, not to when the page
   * is read, so the freshness line below is what keeps this honest as the seed
   * ages — it is load-bearing here, not a courtesy. */
  const period = `in the past ${formatApproximateSpan(
    window.publishedRangeStart,
    window.publishedRangeEnd,
  )}`;

  /* The headline figures are built ONCE and spent twice — in the visible
   * summary and in the aria-label — because Req 5.1 makes the label the
   * canonical announcement of the same two numbers the summary shows, and two
   * independently assembled sentences drift. */
  const headline = `${pluralize(window.totalContributions, "contribution")} across ${pluralize(
    window.activeDays,
    "active day",
  )}`;

  /* Derived from ActivityWindow, never hand-written prose (Req 5.2), and
   * stating the PUBLISHED range — putting windowStart/windowEnd here is the
   * single most-relitigated regression in this spec (Reqs 2.2, 5.2, 7.2). */
  const ariaLabel = `GitHub contributions heatmap: ${headline}, ${period}.`;

  /* Ascending, and only the levels a covered cell actually reached (Req 4.6):
   * a five-swatch legend over a three-level grid is the exact untruth the
   * criterion forbids. A Set has no order, so sort rather than trust it. */
  const legendLevels = [...window.levelsPresent].sort((a, b) => a - b);
  const isPeriodRelativeScale = legendLevels.length < RAMP_LEVELS;

  /* Same 9px mark and 11px pitch as the grid, so the legend is dimensionally
   * the key to the graphic rather than a lookalike. The 1px viewBox margin is
   * there for the same reason as the grid's: contributions.css paints a 1px
   * forced-colors outline on the level-0 swatch, which would clip at x = −1
   * against a zero-margin viewBox. */
  const legendWidth = Math.max(0, legendLevels.length * PITCH - (PITCH - MARK));

  return (
    // data-pagefind-ignore (Req 6.3): /contributions has no
    // data-pagefind-body, so Pagefind indexes the whole page. The graphic and
    // its text equivalent exist for visitors and assistive technology, not for
    // search excerpts.
    <section aria-labelledby={headingId} data-pagefind-ignore="all" className="mt-12">
      <h2 id={headingId} className="font-display text-2xl tracking-tight sm:text-3xl">
        GitHub activity
      </h2>
      {/* The summary carries the headline figures deliberately: the text
       * equivalent is forbidden from restating them (Req 5.3) and print hides
       * the graphic (Req 4.12), so this line is the only place a printed or
       * read-aloud page gets the totals. The period is a duration derived from
       * the PUBLISHED range — windowStart/windowEnd are internal geometry and
       * never visitor-facing (Reqs 2.2, 7.2). */}
      <p className="max-w-measure mt-2 text-muted-foreground">
        {headline}, {period}.
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Counts are updated through <time dateTime={window.anchorDate}>{updated.display}</time>.
      </p>
      {/* Same-tab by design, so no NewTabHint — that suffix pairs with
       * target="_blank" (shared/new-tab-hint.tsx).
       *
       * The mark is aria-hidden, so the sr-only suffix is what stops the
       * accessible name being a bare "My profile" in a screen reader's link
       * list. The visible text stays a prefix of that name, which is what
       * WCAG 2.5.3 (Label in Name) requires. */}
      <p className="mt-4">
        <Button asChild variant="outline" size="sm">
          {/* aria-label rather than a visually-hidden suffix: the accessible
           * name is built by concatenating child text with no separator, so
           * "My profile" + " on GitHub" computes as "My profileon GitHub".
           * Stating the name once removes the seam. The visible text stays a
           * contiguous substring of it, which is what WCAG 2.5.3 requires. */}
          <a href={siteConfig.links.github} rel="noopener" aria-label="My profile on GitHub">
            <GitHubIcon className="size-4" />
            My profile
          </a>
        </Button>
      </p>
      {/* overflow-x: auto safety net (Req 3.6). The class is the whole
       * contract — contributions.css writes the rule, this element is the only
       * thing that can carry it, and CSS cannot conjure a wrapper. No
       * tabindex and no accessible name: at the pinned pitch nothing scrolls,
       * so a focusable region here would be permanently inert. */}
      <div className="contrib-heatmap__scroll mt-6">
        {/* role="img" collapses the whole graphic to ONE leaf node carrying one
         * name (Reqs 5.1, 5.4, 5.5). That is why there are no per-cell <title>
         * elements and nothing here is focusable: descendants of an img leave
         * the accessibility tree, so 182 titles would be announced to nobody. */}
        <svg role="img" aria-label={ariaLabel} width="288" height="100" viewBox="-1 -1 288 100">
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
      {/* print:hidden on the ROW, not just the <svg>: Req 4.12 hides "the <svg>
       * and the legend" in print, contributions.css owns that rule and can only
       * name .contrib-heatmap__legend — which sits on the <svg> — so the HTML
       * endpoints beside it would otherwise print as a stray "Less More" beside
       * nothing. The endpoints are HTML rather than SVG <text> deliberately
       * (design §Accessibility, SC 1.4.12): they reflow under a text-spacing
       * override, which words on a fixed baseline in a fixed-width <svg> could
       * not. */}
      <div className="mt-4 print:hidden">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Less</span>
          {/* An inline <svg> of <rect>s, NOT five <span>s with background-color:
           * `background-color` is a forced property under forced-colors and
           * `fill-opacity` is not, so the HTML reading collapses the whole
           * legend to invisible boxes in High Contrast. As rects the swatches
           * take the SAME per-level rules as the grid marks (contributions.css
           * writes each opacity once against a selector list covering both), so
           * legend and grid physically cannot disagree about a level.
           *
           * aria-hidden: the swatches are a colour key to a graphic that is
           * already a single labelled leaf. They carry nothing a non-visual
           * reader can use, and the <details> table below is the full-fidelity
           * route to the same data (Req 5.3). */}
          <svg
            className="contrib-heatmap__legend"
            aria-hidden="true"
            width={legendWidth + 2}
            height={MARK + 2}
            viewBox={`-1 -1 ${legendWidth + 2} ${MARK + 2}`}
          >
            {legendLevels.map((level, index) => (
              <rect
                key={level}
                className="contrib-heatmap__swatch"
                data-level={level}
                x={index * PITCH}
                y={0}
                width={MARK}
                height={MARK}
                rx={CORNER}
              />
            ))}
          </svg>
          <span>More</span>
        </div>
        {/* Req 4.6 / Req 11.12: a short legend is a truthful legend, but on its
         * own it invites the reading "this mid-alpha IS the maximum". The
         * disclosure is what makes the shorter scale honest rather than merely
         * accurate. It states no period of its own — the summary above owns
         * that (Req 7.2). */}
        {isPeriodRelativeScale ? (
          <p className="max-w-measure mt-2 text-xs text-muted-foreground">
            The scale is relative to this period, so it shows only the levels these counts reach.
          </p>
        ) : null}
      </div>
      {/* The Req 5.3 text equivalent, and it sits INSIDE the
       * data-pagefind-ignore section on purpose (Req 6.3) — after </section> it
       * would drop out of the aria-labelledby framing and put a month-by-month
       * table into every site-search excerpt.
       *
       * Ships CLOSED — no `open` attribute. contributions.css forces it open in
       * print through ::details-content, and a disclosure that shipped open
       * would make that rule, and the print check that exercises it, vacuous.
       * The .contrib-heatmap__details class is the sole handle that rule
       * selects on: without it the monthly table prints collapsed. */}
      <details className="contrib-heatmap__details mt-6">
        <summary>Monthly totals</summary>
        {/* Month, contributions, active days — and deliberately NOT
         * totalContributions or activeDays (Req 5.3). The summary and the
         * aria-label already carry those, and Req 5.5 rejects repetition on
         * announcement cost; a third recital would make a screen-reader user
         * hear the same sentence three times traversing one section. Active
         * days is a column rather than an omission: volume without consistency
         * is the one thing the grid adds over the summary line. */}
        <table className="contrib-heatmap__table">
          <thead>
            <tr>
              <th scope="col">Month</th>
              <th scope="col">Contributions</th>
              <th scope="col">Active days</th>
            </tr>
          </thead>
          <tbody>
            {window.monthlyTotals.map((monthTotal) => {
              const label = formatMonthYear(monthTotal.month);
              return (
                <tr key={monthTotal.month}>
                  <th scope="row">
                    <time dateTime={label.datetime}>{label.display}</time>
                  </th>
                  <td>{formatCount(monthTotal.total)}</td>
                  <td>{formatCount(monthTotal.activeDays)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </details>
    </section>
  );
}
