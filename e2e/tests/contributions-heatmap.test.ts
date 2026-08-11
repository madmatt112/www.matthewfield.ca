import { expect, test } from "@playwright/test";

import { THEME_STORAGE_KEY } from "../../src/components/layout/theme-provider";

/**
 * `/contributions` — the GitHub activity heatmap (spec: github-activity).
 *
 * Covers Req 3.7 (the section renders as a SIBLING that follows the card grid,
 * not merely somewhere later in the document), Req 3.10 (the SVG
 * never causes horizontal `<body>` overflow), Reqs 5.1/5.2/7.1/7.2 (the visible
 * summary and the `aria-label` publish the SAME period and figures, as a
 * duration naming no date — Req 7.3's freshness line was withdrawn at v5), Req
 * 5.3 (the `<details>` text equivalent), and
 * Req 4.12 (print hides the `<svg>` AND the legend, and forces the monthly
 * table open).
 *
 * FOUR SCOPE NOTES, so nobody reads more into this file than it asserts:
 *
 * 1. THESE ARE DEVELOPER-RUN, NOT A GATE. .github/workflows/ci.yml runs lint,
 *    format, typecheck, Vitest, and build — no Playwright (the same note sits
 *    at profile-resume.test.ts:32-34). Do not describe anything here as
 *    blocking a merge. It is nonetheless the ONLY empirical check on Req 3.10's
 *    288px geometry claim and, via contact-axe.test.ts, on Req 5.10's
 *    both-theme axe sweep — so it is worth running by hand before a release.
 *
 * 2. NO SEEDED FIGURE IS PINNED. `content/github-activity.yaml` is reseeded by
 *    hand (Req 8.1), so the totals, the active-day count, the published range
 *    and the number of month rows all change on every refresh. Every assertion
 *    below is therefore an INVARIANT read off the page — the table sums to the
 *    figures the summary publishes, the copy and the `aria-label` agree with
 *    each other, the copy names no calendar date at all — rather than a literal
 *    copied out of today's seed. A test that pinned "1,712" would go red on a
 *    healthy refresh, which is how this kind of coverage gets deleted.
 *
 * 3. PRINT EMULATION VALIDATES **VISIBILITY** ONLY. `page.emulateMedia({ media:
 *    "print" })` switches which media queries match, so the `display: none` and
 *    `::details-content` rules in src/styles/contributions.css do take effect
 *    and are genuinely observable. Nothing about printed *layout* — page
 *    breaks, paper fit, margins — is validated here.
 *
 * 4. VELITE FOOT-GUN, if you ever hand-edit the data to satisfy yourself these
 *    assertions still bite: `pnpm test:e2e` re-runs `next build`, but NOT
 *    `velite build`. content/ is compiled into .velite/, so an edit to
 *    content/github-activity.yaml does not reach the rendered page until you
 *    run `pnpm exec velite build` yourself.
 */

const CONTRIBUTIONS_PATH = "/contributions";

const THEMES: Array<"light" | "dark"> = ["light", "dark"];

const CARD_GRID = "ul.contributions-grid";
const HEATMAP_SECTION = 'section[aria-labelledby="github-activity-heading"]';

/**
 * Req 3.6's arithmetic: 26 columns at an 11px pitch is 286px of ink inside the
 * 288px content box a 320px viewport leaves after page.tsx's `px-4`. 768 and
 * 1280 are the two wider breakpoints the design names. Height is arbitrary —
 * only the horizontal axis is under test.
 */
const VIEWPORT_WIDTHS = [320, 768, 1280] as const;

/**
 * The canonical announcement (Req 5.1), whose shape the component builds from
 * `ActivityWindow` and never hand-writes (Req 5.2). Matching it as a PATTERN
 * rather than as a string is what keeps this file seed-independent: the groups
 * hand back whatever figures and endpoints the current data produced, and the
 * assertions below relate those to what the rest of the section says.
 *
 * Singular alternatives are real states, not defensive noise: a one-record seed
 * renders "1 contribution across 1 active day".
 */
const ARIA_LABEL_PATTERN =
  /^GitHub contributions heatmap: ([\d,]+) contributions? across ([\d,]+) active days?, in the past (?:(\d[\d,]*) )?(months|weeks|month|week)\.$/;

const ARIA_LABEL_PREFIX = "GitHub contributions heatmap: ";

/** `textContent` preserves the JSX source's line breaks; `innerText` would hide
 * a missing space. Normalise explicitly so the comparison is about words. */
function squash(text: string | null): string {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

/** "1,712" → 1712. `formatCount` writes en-CA thousands separators. */
function parseCount(text: string | null): number {
  const cleaned = squash(text).replace(/,/g, "");
  expect(cleaned, "a count cell must be a plain integer").toMatch(/^\d+$/);
  return Number(cleaned);
}

test.describe("/contributions — heatmap placement, geometry, disclosure, and print", () => {
  for (const theme of THEMES) {
    test(`the heatmap section renders after the contribution card grid in ${theme} theme`, async ({
      page,
    }) => {
      if (theme === "dark") {
        await page.addInitScript(
          ({ key, value }) => {
            localStorage.setItem(key, value);
          },
          { key: THEME_STORAGE_KEY, value: "dark" },
        );
      }

      await page.goto(CONTRIBUTIONS_PATH);

      if (theme === "dark") {
        await expect(page.locator("html")).toHaveClass(/\bdark\b/);
      } else {
        await expect(page.locator("html")).not.toHaveClass(/\bdark\b/);
      }

      // Req 3.7. The cards are the page's subject and the heatmap is context
      // for them, so this ordering is load-bearing rather than a layout
      // preference — and it is invisible to a snapshot, which would render an
      // above-the-cards regression as a merely different-looking page.
      //
      // The child combinator is what makes this bite. Plain document order is
      // too weak: a <section> nested INSIDE the <ul> also comes "after" the
      // grid, and that is not the ordering Req 3.7 asks for. Scoping both
      // halves to direct children of <main> means document order over
      // `main > *` IS sibling order. The unit-level guard at
      // src/app/(site)/contributions/page.test.tsx:126-134 reasons the same
      // way, so the two layers agree.
      const ordering = await page.evaluate(
        ({ grid, section }) => {
          const siblings = Array.from(
            document.querySelectorAll(`main > ${grid}, main > ${section}`),
          );
          return {
            tagNames: siblings.map((node) => node.tagName),
            sameParent:
              siblings.length === 2 && siblings[0].parentElement === siblings[1].parentElement,
          };
        },
        { grid: CARD_GRID, section: HEATMAP_SECTION },
      );

      // Counted explicitly, because a selector that matched NOTHING would
      // otherwise "pass" — and `main > ` is easy to get wrong here: the shell
      // renders a NESTED <main> (site-shell.tsx's `main.flex-1` wraps this
      // page's `main.mx-auto`), pre-existing and nothing to do with this spec.
      expect(
        ordering.tagNames,
        "the card grid and the heatmap section must both be direct children of a <main>",
      ).toHaveLength(2);
      expect(
        ordering.sameParent,
        "they must share a parent — matching under two different <main>s is not sibling order",
      ).toBe(true);
      expect(
        ordering.tagNames,
        "the heatmap must follow the card grid as its sibling, not merely appear later",
      ).toEqual(["UL", "SECTION"]);

      await expect(page.locator("#github-activity-heading")).toBeVisible();
      await expect(page.locator(`${HEATMAP_SECTION} svg[role="img"]`)).toBeVisible();
    });
  }

  /**
   * Req 3.10: "The SVG SHALL NOT **cause** horizontal overflow of `<body>` at
   * any breakpoint."
   *
   * MEASURED, NOT ASSUMED — and the measurement changed how this is written.
   * `<body>` ALREADY overflows at 320px on this site, by 22px (342 against a
   * 320 client width), on every page in the `(site)` group: `/`, `/projects`,
   * `/resources` and `/contributions` all report the identical figure with the
   * identical culprit, a link row in src/components/layout/footer.tsx. That is
   * pre-existing site chrome and nothing to do with this feature, so a bare
   * `body.scrollWidth <= clientWidth` assertion here would be red on arrival,
   * would be red for a reason no requirement in this spec owns, and would very
   * likely be deleted rather than investigated.
   *
   * So the requirement's own word — *cause* — is what gets asserted, three
   * ways, none of which a pre-existing footer bug can trip:
   *
   *   1. `/contributions` overflows `<body>` no more than a heatmap-free page
   *      of the same shell does. This is the differential Req 3.10 asks for:
   *      any width the graphic contributes shows up here as a delta.
   *   2. No element inside the heatmap section extends past the viewport. This
   *      is Req 3.6's 288px arithmetic (26 columns × 11px pitch = 286px of ink
   *      inside the 288px content box `px-4` leaves at 320px), and it is the
   *      only empirical check on it anywhere in the repository.
   *   3. The `overflow-x: auto` wrapper does not actually scroll. Without this
   *      an oversized grid would be absorbed by the safety net and leave 1 and
   *      2 both clean — the failure the wrapper is designed to survive, and the
   *      one it is therefore able to hide.
   *
   * Control page: `/resources` renders the same `mx-auto w-full max-w-5xl px-4`
   * main under the same layout, with no heatmap.
   */
  const CONTROL_PATH = "/resources";

  test("the heatmap causes no horizontal <body> overflow at 320, 768, or 1280", async ({
    page,
  }) => {
    // `document.documentElement.clientWidth`, not `window.innerWidth`: it
    // excludes a classic scrollbar, so a page that exactly fills the viewport
    // does not read as overflowing by the gutter's width.
    const measure = (scroller: string) => {
      const element = document.querySelector(scroller);
      return {
        bodyScrollWidth: document.body.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
        scrollerScrollWidth: element?.scrollWidth ?? -1,
        scrollerClientWidth: element?.clientWidth ?? -1,
      };
    };

    const overflowingChildren = (selector: string) => {
      const viewportWidth = document.documentElement.clientWidth;
      const section = document.querySelector(selector);
      if (section === null) return ["the heatmap section is absent"];
      return Array.from(section.querySelectorAll("*"))
        .map((element) => ({ element, box: element.getBoundingClientRect() }))
        .filter(({ box }) => box.width > 0 && (box.right > viewportWidth + 0.5 || box.left < -0.5))
        .map(({ element, box }) => `${element.tagName.toLowerCase()} [${box.left}, ${box.right}]`);
    };

    for (const width of VIEWPORT_WIDTHS) {
      await page.setViewportSize({ width, height: 900 });

      await page.goto(CONTROL_PATH);
      const control = await page.evaluate(measure, ".contrib-heatmap__scroll");

      await page.goto(CONTRIBUTIONS_PATH);
      await expect(
        page.locator(HEATMAP_SECTION),
        `Req 3.10 is unmeasurable without the section (${width}px)`,
      ).toBeVisible();
      const metrics = await page.evaluate(measure, ".contrib-heatmap__scroll");

      expect(
        metrics.bodyScrollWidth,
        `the heatmap must add no <body> overflow beyond ${CONTROL_PATH}'s at ${width}px`,
      ).toBeLessThanOrEqual(control.bodyScrollWidth);

      expect(
        await page.evaluate(overflowingChildren, HEATMAP_SECTION),
        `nothing in the heatmap may extend past the viewport at ${width}px`,
      ).toEqual([]);

      expect(
        metrics.scrollerScrollWidth,
        `the heatmap scroll container must not scroll at ${width}px`,
      ).toBeLessThanOrEqual(metrics.scrollerClientWidth);
    }
  });

  test("the published period in the copy matches the aria-label and names no date", async ({
    page,
  }) => {
    await page.goto(CONTRIBUTIONS_PATH);

    const section = page.locator(HEATMAP_SECTION);
    const label = await section.locator('svg[role="img"]').getAttribute("aria-label");
    const normalisedLabel = squash(label);

    // Shape first: without this, a label that had degenerated into "undefined"
    // would still satisfy the equality below, because the summary is built from
    // the same variables and would degenerate with it.
    expect(normalisedLabel, "the aria-label must name the range and both figures").toMatch(
      ARIA_LABEL_PATTERN,
    );

    // THE agreement assertion. The component spends one `headline` string twice
    // — once in the visible summary, once in the aria-label — so the summary's
    // full text is the label minus its prefix, exactly. Comparing the whole
    // strings rather than checking each for "presence" is what catches a
    // published-range regression: swapping publishedRange* for windowStart /
    // windowEnd in ONE of the two places is the single most-relitigated defect
    // in this spec, and it leaves both halves individually well-formed.
    const summary = section.locator("p").first();
    expect(squash(await summary.textContent())).toBe(
      normalisedLabel.slice(ARIA_LABEL_PREFIX.length),
    );

    // The summary states a DURATION, not two endpoints, so the old
    // "publishedEnd <= anchorDate" check has nothing to read. What replaced it:
    // the summary must name no date at all, which makes leaking windowStart /
    // windowEnd — the most-relitigated defect in this spec — structurally
    // impossible rather than merely unasserted.
    await expect(
      summary.locator("time"),
      "the summary states a duration, so it publishes no endpoints",
    ).toHaveCount(0);
    expect(
      squash(await summary.textContent()),
      "the summary must name no calendar date",
    ).not.toMatch(/\b\d{4}\b/);

    // Req 7.3's freshness line was WITHDRAWN at v5, so there is no rendered
    // anchorDate left to compare against and "publishedRangeEnd <= anchorDate"
    // is no longer observable from the DOM at all. It is not unguarded: the
    // invariant moved down a layer to src/lib/github-activity.test.ts, which
    // asserts it directly on deriveWindow's output. Asserting its ABSENCE here
    // is what stops the line reappearing by accident and the two layers
    // disagreeing about which one owns the check.
    await expect(
      section.locator("p", { hasText: /Counts are updated through/ }),
      "Req 7.3 was withdrawn at v5 — the freshness line must not return",
    ).toHaveCount(0);

    // The only date the section may still carry is the machine-readable month
    // on each table row, which is not visitor-facing copy.
    const details = section.locator("details.contrib-heatmap__details");
    await details.locator("summary").click();
    const lastMonth = await details.locator("tbody tr th time").last().getAttribute("datetime");
    expect(lastMonth, "the last month row must carry an ISO month").toMatch(/^\d{4}-\d{2}$/);
  });

  test("the monthly totals disclosure opens and its rows sum to the published figures", async ({
    page,
  }) => {
    await page.goto(CONTRIBUTIONS_PATH);

    const section = page.locator(HEATMAP_SECTION);
    const details = section.locator("details.contrib-heatmap__details");
    const table = details.locator("table");

    // Ships closed (Req 5.3 is a disclosure, not an always-open block), so the
    // "opens" half of this test is a real interaction.
    expect(
      await details.evaluate((element: HTMLDetailsElement) => element.open),
      "the disclosure must ship closed",
    ).toBe(false);
    await expect(table).toBeHidden();

    await details.locator("summary").click();
    await expect(table).toBeVisible();

    const label = squash(await section.locator('svg[role="img"]').getAttribute("aria-label"));
    const match = ARIA_LABEL_PATTERN.exec(label);
    expect(match, "the aria-label must name the range and both figures").not.toBeNull();
    const publishedTotal = parseCount(match![1]);
    const publishedActiveDays = parseCount(match![2]);

    const rows = table.locator("tbody tr");
    const rowCount = await rows.count();
    expect(rowCount, "a seeded window spans at least one month").toBeGreaterThan(0);

    // Req 5.3's text equivalent is only equivalent if it agrees with the
    // figures the graphic PUBLISHES. Both columns are summed and compared to
    // the two counts parsed out of the `aria-label` — and that label is the
    // whole comparison. Nothing below reads the grid's per-day cells or their
    // `hasData` flag, so this is a table-against-label check, not a check that
    // either one matches the rendered squares.
    let totalSum = 0;
    let activeDaySum = 0;
    for (let i = 0; i < rowCount; i += 1) {
      const cells = rows.nth(i).locator("td");
      await expect(cells, `row ${i} must carry contributions and active days`).toHaveCount(2);
      totalSum += parseCount(await cells.nth(0).textContent());
      activeDaySum += parseCount(await cells.nth(1).textContent());
    }

    expect(totalSum, "the month rows must sum to the published contribution total").toBe(
      publishedTotal,
    );
    expect(activeDaySum, "the month rows must sum to the published active-day count").toBe(
      publishedActiveDays,
    );
  });

  /**
   * Req 4.12, and this is the ONLY gate in the spec that can see any of it: the
   * unit tests apply no stylesheet, and the visual baselines are screen-only.
   *
   * TWO TRAPS, both deliberately avoided below.
   *
   * 1. `toBeHidden()` also passes for an element that does not exist, so a
   *    mistyped `.contrib-heatmap__legend` would break the print rule in
   *    contributions.css and silence the assertion in the same stroke — the
   *    gate reporting green because of the bug it exists to catch. Both targets
   *    are asserted VISIBLE on screen first. profile-resume.test.ts:397-408 is
   *    this repository's own guard against exactly this.
   *
   * 2. The disclosure must be CLOSED here. Run after the "it opens" test's
   *    click on the same page, the table would print because `open` was set,
   *    not because the `::details-content` force-open rule fired — a vacuous
   *    gate on the one mechanism nothing else in the spec can observe. This
   *    test navigates fresh and asserts `open` is false both before AND after
   *    emulating print, so the only thing that can make the table visible is
   *    the print rule.
   */
  test("print hides the grid and the legend and forces the monthly table open", async ({
    page,
  }) => {
    await page.goto(CONTRIBUTIONS_PATH);

    const section = page.locator(HEATMAP_SECTION);
    const grid = section.locator('svg[role="img"]');
    const legend = section.locator("svg.contrib-heatmap__legend");
    const details = section.locator("details.contrib-heatmap__details");
    const table = details.locator("table");

    await expect(grid, "the grid must exist on screen").toBeVisible();
    await expect(legend, "the legend must exist on screen").toBeVisible();
    expect(
      await details.evaluate((element: HTMLDetailsElement) => element.open),
      "the disclosure must be closed before print, or this test proves nothing",
    ).toBe(false);
    await expect(table, "a closed disclosure hides its table on screen").toBeHidden();

    await page.emulateMedia({ media: "print" });

    // Both halves of Req 4.12's hide list. SVG `fill` prints even with
    // background graphics disabled, and print.css re-bases --brand to a third
    // value present in neither theme, so these are hidden outright.
    await expect(grid, "the grid must not print").toBeHidden();
    await expect(legend, "the legend must not print").toBeHidden();

    // The text channel survives, and the table appears WITHOUT the attribute
    // changing — that is the ::details-content rule doing the work.
    await expect(table, "the monthly table must print").toBeVisible();
    expect(
      await details.evaluate((element: HTMLDetailsElement) => element.open),
      "the table must print via the force-open rule, not via the open attribute",
    ).toBe(false);
    await expect(page.locator("#github-activity-heading"), "the <h2> must print").toBeVisible();
    await expect(section.locator("p").first(), "the summary must print").toBeVisible();
  });
});
