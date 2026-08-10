# Requirements Document

> **Version 4.** Rewritten after adversarial reviews v1, v2, and v3
> (`reviews/adversarial-analysis-requirements-r3.md`). v4 closes every r3 finding.
>
> **Verification discipline.** Every `Req N.M` pointer *and* every `path:line` citation in this
> document was resolved against its target during the v4 pass. v3 committed to the first and not the
> second, and shipped two false file citations — including one inside the criterion it called its
> highest-severity fix. Both passes are now scripted. If you edit a requirement number or a cited
> file, re-run both rather than adjusting by hand.

## Introduction

The `github-activity` spec adds a **rolling 26-week GitHub contribution heatmap** to the existing
`/contributions` page: a statically generated, server-rendered inline-SVG calendar driven by a new
`githubActivity` Velite collection reading `content/github-activity.yaml`. Zero client JavaScript,
zero runtime or build-time network calls, zero CSP changes, zero secrets in the deployed application.

The heatmap is **corroboration placed below the curated contribution cards**, never above them. The
cards are the substance. This ordering is load-bearing for Req 5, not a layout preference.

### Two things deliberately not in this spec

**Curated external contributions** ship as an independent content pull request — adding data to an
existing collection under an existing schema and authoring guide is not spec work. **[v4]** With
Req 10.6 reversed (below), that PR is now unconditionally independent: nothing in this spec reads
`contributions.yaml`, and nothing this spec builds changes when that PR lands.

**Scheduled sync automation** is deferred to a follow-on spec. With no automation the file is seeded
by hand (Req 8), which makes the freshness disclosure (Req 7.3), the coverage contract (Req 2.2), and
the detector (Req 9) load-bearing rather than decorative.

### Why 26 weeks and not the conventional 52

Measured 2026-08-08: the trailing **52-week** window contains five consecutive empty months
(2025-08 through 2025-12) — 41% dead space at the leading edge, adjacent to the page `<h1>`. The
trailing **26-week** window contains 1,820 contributions across 114 active days of 182, with no empty
months, at half the DOM cost.

**The window length is a fixed editorial parameter, stated plainly rather than dressed as a derived
optimum.** The density figures describe the current data; they are **not** acceptance thresholds, and
no criterion re-evaluates the window against them. A future period of inactivity will show as empty
columns inside the window. **The window does not move to avoid gaps. A requirement that adjusted the
window to keep the graphic flattering would be the dishonest version of this feature, and is
explicitly rejected.**

**[v4] The same principle now governs the other edge.** v3 stopped the published period running into
the future and never asked the mirror question: nothing established that the data covered
`windowStart`. Because absent days were read as zeros, a truncated file rendered eighteen weeks of
missing history as a quiet spell — which is the *flattering* direction, since incomplete data reads
as "quiet then active" and never as "incomplete". Req 2.2's coverage contract and Req 7.2's
`publishedRangeStart` close it: **the page publishes the period it has data for, not the period the
grid happens to span.**

### Explicitly in scope

**[v4] Third correction to this list.** v2's was off by one; v3's was labelled "corrected and
completed" and still omitted three artifacts. Every bullet below was resolved against a requirement
body.

| Artifact | Requirement |
|---|---|
| `content/github-activity.yaml` (flat `{date, count}` list) | Req 1 |
| `velite.config.ts` — **four edits**: `defineCollection`, the `collections:` map entry, the loader-map entry, and the `prepare()` branch | Reqs 1.1, 1.5, 1.10 |
| `src/lib/build/github-activity-schema.ts` | Req 1.4 |
| `src/lib/build/content-error-format.ts` — identifier-field registration | Req 1.5 |
| `eslint.config.mjs` — two edits (`importNames`, allowlist) | Req 1.5 |
| `src/lib/github-activity.ts` + test | Req 2 |
| `src/components/contributions/contribution-heatmap.tsx` + test | Req 3 |
| `src/lib/format-date.ts` + its tests — a range formatter and a thousands-separator helper, neither of which exists today | Req 7.4 |
| `src/styles/contributions.css` — heatmap section incl. `@media print` | Reqs 4.10, 4.12 |
| `src/app/(site)/contributions/page.tsx` — integration; `force-static` unchanged | Reqs 3.7, 6.1 |
| `scripts/check-github-activity-freshness.mjs` + test | Req 9 |
| `.github/workflows/ci.yml` — wiring the detector | Req 9.1 |
| `docs/contributions-and-resources-authoring.md` + `scripts/check-authoring-docs.mjs` | Reqs 10.1, 10.2 |
| `docs/contributions-and-resources-lighthouse-runs.md` — the recorded run and its machine-parsed line | Reqs 10.4, 10.5 |
| `lighthouserc.js` — add `/contributions` | Req 10.3 |
| `design-baseline/after/contributions-*.png` — four screenshots | Req 10.7 |

**`velite.config.ts` carries the only edit in this set with blast radius outside the feature**: the
`prepare()` hook is shared with the posts series-collision check and the profile/resume cross-collection
invariants (`velite.config.ts:527-537` and following). Req 1.10's checks are added as an additive
branch there.

### Explicitly out of scope

- **A statistics strip**, **streak counters** (gameable, and uncomputable without a clock, which
  Req 2.7 forbids), **a "busiest day" figure** (96 in one day reads as a squash-merge),
  **`restrictedContributionsCount`**, **a top-repositories list**, **a merged-PR total** (82 of 88 are
  self-merged).
- **Any REST `search/issues` dependency** — deprecating, and unauthenticated search is capped at
  10 req/min. A human may use it once when authoring the content PR.
- **The public events feed** — 90-day window, dominated by branch churn on Matthew's own repositories.
- **ISR / `revalidate`** — Req 6.2.
- **Any credential in the Vercel environment, or any network call from the Next.js application** — Req 1.7.
- **Any third-party contribution API in the render path.**
- **Per-cell `<title>` elements or hover tooltips** — Req 5.5.
- **Weekday row labels** — **[v4]** considered and rejected in Req 3.4: they cost 20–25px of a 288px
  horizontal budget that Req 3.6's pitch arithmetic cannot absorb. Month column labels *are* in scope.
- **A 52-week or user-selectable window**; **client-side JavaScript**; **multi-year history, year tabs,
  an archive**; **data for any user other than `madmatt112`**.

## Alignment with Product Vision

- **Builder credibility** (objective #2): corroborates sustained activity on-site.
- **Independence from platforms** (objective #4): first-party SVG from a file in version control.
- **Markdown-first / data-first** (principle #2): a validated YAML file in `content/`.
- **Simple to maintain** (principle #3): a refresh is a file edit; staleness is a soft failure.
- **Wide and spacious** (principle #1): one horizontal band below the cards.
- **Responsive** (principle #6): Req 3.6.
- **Accessible** (principle #7): Req 5.
- **Performance** (metric #4): zero added client JS, zero added requests.

## Shared Definitions

**`anchorDate`** — the maximum `date` in the data file. Bounded above by Req 1.3.

**`dataStart`** — **[v4, new]** the minimum `date` in the data file. Req 1.10 requires the file to
carry a record for every day from `dataStart` to `anchorDate`, so the covered range is contiguous by
construction and coverage is decidable from the file alone.

**`windowEnd`** — the Saturday on-or-after `anchorDate`. **Internal grid geometry only; never
published.**

**`windowStart`** — `windowEnd − 181 days`, necessarily a Sunday.

**Window** — the 182 days from `windowStart` to `windowEnd` inclusive. A frame, not a claim.

**`publishedRangeStart`** — **[v4, new]** `max(windowStart, dataStart)`.

**`publishedRangeEnd`** — `anchorDate`.

**Published range** — `publishedRangeStart → publishedRangeEnd`. **The only period any visitor-facing
string may state.** It is exactly the span the data covers within the frame, so the page cannot claim
a period it has no data for.

**Day record** — one `{ date, count }` pair.

**Cell** — **[v4, revised]** `{ date: string; count: number; level: 0|1|2|3|4; hasData: boolean }`.
`hasData` is false when `date < dataStart` (not yet seeded) or `date > anchorDate` (not yet happened).
v3 carried `isFuture`, which distinguished "no data yet" from "no activity" only at the trailing edge;
`hasData` generalises it to both, which is the distinction Req 3.5 depends on.

**Level** — 0–4 per Req 2.3. Level 0 means `count === 0` **and `hasData` is true**.

**Grid** — 26 columns × 7 cells, column-major, each column Sunday → Saturday.

**`totalContributions`** — sum of `count` over cells with `hasData`.

**`activeDays`** — count of cells with `hasData` and `count > 0`.

**`levelsPresent`** — **[v4, new]** the set of levels actually assigned to at least one `hasData`
cell in the grid. Req 4.6's legend is gated on this, not on whether thresholds were computed.

**`monthlyTotals`** — one entry per calendar month intersecting the published range, each
`{ month: "YYYY-MM"; total: number; activeDays: number; isClipped: boolean; rangeStart: string;
rangeEnd: string }`. **[v4]** `isClipped` is true when the month is only partially covered by the
published range. v3's gloss said "always true for the first month"; that is false when
`publishedRangeStart` falls on the 1st — `2026-02-01` and `2026-03-01` are both Sundays, so it happens
roughly one month in thirty. The operative rule is "partially covered"; there is no universal.

**`ActivityWindow`** — `{ anchorDate, dataStart, windowStart, windowEnd, publishedRangeStart,
publishedRangeEnd, grid, totalContributions, activeDays, levelsPresent, monthlyTotals, thresholds }`,
where `thresholds` is `{ p25, p50, p75 } | null`.

## Requirements

### Requirement 1: `githubActivity` collection, schema, and registrations

**User Story:** As Matthew, I want activity data to be a validated file in version control, so a
malformed or incomplete payload fails the build instead of shipping.

#### Acceptance Criteria

1. `velite.config.ts` SHALL define a collection `githubActivity` with
   `pattern: "github-activity.yaml"`, registered additively.

2. The schema envelope SHALL match the per-entry form used by the existing collections at
   `velite.config.ts:433-443`, without a `.min(0)` suffix.

3. The per-entry schema SHALL require exactly two fields and no others:
    - `count` — integer, `>= 0`.
    - `date` — ISO 8601 calendar date, **bounded above by `BUILD_START_UTC`**.
      `isoDate()` (`src/lib/build/content-schema-primitives.ts:68`) validates format and calendar
      validity and nothing else; the future-date guard is a separate composition applied deliberately
      in `resources-schema.ts:23`, `reading-schema.ts:21`, and `education-schema.ts:15` — and where
      omitted, the schema records the omission (`contributions-schema.ts:12`). Because
      `anchorDate = max(date)` originates the derivation, one transposed digit is catastrophic and
      silent: `2126-08-08` passes schema, shifts the window a century, renders an empty grid on a
      green build, prints a 2126 freshness line, and permanently silences Req 9's detector.
      **[v4]** v3 cited this function at `:9`, which is a closing `*/`. Corrected.

4. The schema module SHALL live at `src/lib/build/github-activity-schema.ts`, built from
   `content-schema-primitives.ts` rather than re-deriving date or integer validation.

5. **Four registration edits**, all load-bearing; without the first there is no validation at all:
    - `"github-activity.yaml": githubActivityEntrySchema` in the `makeContentYamlLoader({…})` map at
      `velite.config.ts:496-503`. `content-yaml-loader.ts:35` passes any basename absent from that map
      straight through — *"Not ours — benign passthrough"* — and Velite is non-strict.
    - `"github-activity.yaml": "date"` in `IDENTIFIER_FIELD_BY_BASENAME` at
      `content-error-format.ts:304-309`, else the locator falls back to `"title"`, which these entries
      lack.
    - `githubActivity` added to `no-restricted-imports`' `importNames` at `eslint.config.mjs:30`.
    - `src/lib/github-activity.ts` added to the allowlist at `eslint.config.mjs:40-49`.
    - **[v4] The test-file question is closed here rather than deferred.** Neither
      `src/lib/github-activity.test.ts` nor the Req 3 component test needs an allowlist entry:
      `no-restricted-imports` fires on `import` declarations, and Req 2.10's mandated pattern reaches
      the collection through `vi.mock("#site/content", …)` — a call argument. `contributions.test.ts`
      uses the same pattern, is absent from the allowlist, and lint passes on `main`.

6. The data file SHALL be YAML, not JSON: `makeContentYamlLoader`'s `test` is `/\.(ya?ml)$/` and a
   `.json` file bypasses the validator entirely.

7. **The Next.js application SHALL make no network request to GitHub or any third party**, at build or
   request time, in any environment.

8. **`contributionLevel` SHALL NOT be stored or consumed.** The reason is **reproducibility and
   testability**: GitHub's bucketing is undocumented, cannot be reproduced offline, and cannot be
   asserted in a unit test, whereas locally derived levels are a pure function of the committed file.
   Req 2.3's guarantee is *same file → same grid*. It is **not** stability of meaning across
   refreshes — the window moves, so the encoding re-denominates, and Req 4.6 discloses when that
   materially changes what the legend shows.

9. **Empty-payload handling** is inherited from `content-yaml-loader.ts`'s envelope checks: missing
   file → `[]`, build succeeds; explicit `[]` → build succeeds (see Req 9.7 and Req 11.5 for why that
   is not the end of the story); zero-byte or `null`/`~` → the loader's existing named error.

10. **Cross-entry invariants.** Two checks, both implemented as an additive branch in the Velite
    `prepare()` hook — this repository's existing home for cross-entry invariants
    (`velite.config.ts:527-537`, the posts series-collision check):
    - **Duplicate `date`** → build error naming the duplicated date.
    - **[v4] Coverage contiguity** → the file SHALL contain a record for every calendar day from
      `dataStart` to `anchorDate` inclusive. A gap is a build error naming the first missing date.
      This is what makes coverage decidable, and it is the mechanism behind the leading-edge fix: with
      contiguity guaranteed, "quiet February" and "February not seeded" are distinguishable, because
      the latter simply is not in the file.
    - **[v4] Scope note, not an assertion of exemption.** These are cross-entry invariants. The
      **Shared Build-Time Error-Message Contract** — a named section of a different, completed spec at
      `.spec-workflow/specs/contributions-and-resources/requirements.md:58` — is specified around
      per-entry field validation ("any entry violates the schema") and on its own terms does not reach
      cross-entry checks. This spec reads it that way rather than carving an exemption out of another
      spec's contract; if the owner of that spec disagrees, the resolution is an amendment there, not
      a unilateral exception here. v3 asserted the exemption without citing the contract — the third
      instance of a governance defect v3 fixed in two other places.

11. The collection output SHALL be surfaced through `#site/content`; direct `JSON.parse` of
    `.velite/githubActivity.json` outside `src/lib/github-activity.ts` is prohibited.

### Requirement 2: Derivation helper (`src/lib/github-activity.ts`)

**User Story:** As a future maintainer, I want every number and cell position to come from one pure,
tested module, so the graphic cannot disagree with itself.

#### Acceptance Criteria

1. The module SHALL export `getActivityWindow(): ActivityWindow | null` — `null` when the collection is
   empty, otherwise the shape pinned in Shared Definitions.

2. **Window and coverage derivation** SHALL follow Shared Definitions.
    - Days present in the file but outside the window SHALL be ignored (a 52-week file with a 26-week
      window is valid input — Req 8.2 requires exactly that).
    - **[v4] Days inside the window but outside `dataStart → anchorDate` are uncovered**, carry
      `hasData: false`, and SHALL NOT be treated as zero-activity days. v3 read every absent in-window
      day as `count: 0`, which made a truncated file indistinguishable from a genuinely quiet period —
      the same conflation `hasData` exists to prevent at the trailing edge.
    - Gaps *within* `dataStart → anchorDate` cannot occur: Req 1.10 makes them a build error.

3. **Bucketing** SHALL be by quartile over the non-zero counts of `hasData` cells in the window:
    - `count === 0` → level 0 (for `hasData` cells only).
    - Let `S` be the ascending-sorted multiset of qualifying non-zero counts, `n = |S|`.
    - Thresholds are the **inclusive (R type-7)** quantiles of `S` at 0.25, 0.5, 0.75, in floating
      point, **no rounding applied to the threshold**.
    - Bands are **upper-inclusive**: `0 < c <= p25` → 1; `p25 < c <= p50` → 2; `p50 < c <= p75` → 3;
      `c > p75` → 4.
    - `n === 0`: every `hasData` cell is level 0; `thresholds` is `null`.
    - `n < 4`: thresholds not computed; all non-zero days → level 2; `thresholds` is `null`.
    - `p25 === p75`: all non-zero days → level 2; `thresholds` is `null`.
    - `p25 === p50 < p75` or `p25 < p50 === p75`: bands stand; **an empty band is legal, not an
      error** — and per Req 4.6 the legend renders from `levelsPresent`, not from these thresholds.
    - **Rationale**: on the live 26-week window, quartiles yield 68/33/25/27/29 cells across levels
      0–4. Linear bucketing over the same window puts 105 of 114 non-zero days in level 1.

4. Cells without `hasData` SHALL be excluded from `totalContributions`, `activeDays`, `monthlyTotals`,
   `levelsPresent`, and `S`.

5. Grid construction SHALL emit exactly 26 columns of 7 cells, column-major, Sunday → Saturday, each
   carrying the full **Cell** shape.

6. `monthlyTotals` and `levelsPresent` SHALL be computed per Shared Definitions, over the published
   range.

7. **The module SHALL NOT call `new Date()` with no arguments, `Date.now()`, or any other wall-clock
   source.** Any function needing "today" SHALL take it as a parameter. This repository carries
   `src/lib/format-date-tz.test.ts` because timezone-dependent behaviour has caused defects here. The
   only legitimate clock use in this feature is Req 9's detector, which lives in a script.

8. All date arithmetic SHALL be in UTC.

9. The module SHALL export its primitives — at minimum `deriveWindow`, `bucketLevels`, `toGrid`,
   `toMonthlyTotals` — for independent unit testing.

10. **Test coverage** SHALL follow `src/lib/contributions.test.ts` (`vi.hoisted` holder,
    `vi.mock("#site/content", …)`, module imported after the mock), with fixtures from a small inline
    factory. Tests SHALL cover at minimum:
    - **One case per anchor weekday (all seven)** asserting the last `hasData` cell's date equals
      `anchorDate` and no day between `dataStart` and `anchorDate` is dropped.
    - **One case per anchor weekday** asserting `publishedRangeEnd` is never later than `anchorDate`.
    - **[v4] Partial coverage**: `dataStart > windowStart` → leading cells carry `hasData: false`,
      are excluded from every published figure, and `publishedRangeStart === dataStart`. This is the
      case that produced r3's top finding; v3's test list could not generate it.
    - **[v4] `thresholds` non-null with an empty band** — e.g. `S = [1,1,1,1,2,3,4,10]`, which under
      R type-7 gives `p25 = 1.0`, `p50 = 1.5`, `p75 = 3.25`, so the band `1 < c ≤ 1.5` contains no
      integer and level 2 is empty while `thresholds` is non-null. Assert `levelsPresent` is
      `{0,1,3,4}` and that the legend (Req 4.6) omits level 2. `p25 === p50` holds whenever at least
      half the non-zero days share the minimum count, which for contribution data is the common case.
    - Bucket boundaries at exactly `p25`, `p50`, `p75`; every degenerate path in Req 2.3 including the
      `thresholds === null` return.
    - `monthlyTotals`: a clipped first month, a clipped last month, a whole month, and **a first month
      that is *not* clipped** (`publishedRangeStart` on the 1st).
    - Empty collection → `null`. Single day record — asserting the published range is that one day,
      not the whole frame. All-zero file. Out-of-window exclusion. A 52-week file with a 26-week window.
    - Grid shape invariably 26 × 7.

### Requirement 3: Heatmap component and page integration

**User Story:** As a visitor, I want to see at a glance whether Matthew has been consistently active,
without the page getting slower or noisier.

#### Acceptance Criteria

1. `src/components/contributions/contribution-heatmap.tsx`, named export `ContributionHeatmap`.
   **[v4] The component is props-driven**, taking `ActivityWindow` (or `null`) from the page, matching
   `contribution-card.tsx`'s convention. v3's Req 3.1 cited that convention while Req 3.8 gated on the
   component calling `getActivityWindow()` itself, which pointed the opposite way and left the test
   shape and the Req 3.9 gate location undecided. The page performs both lookups and owns both gates.

2. A server component: no `'use client'`, no hooks, no client JavaScript.

3. Inline SVG — never `<img>`, `<iframe>`, `<canvas>`, or an external background image.

4. Rendered structure, in DOM order: a `<section>` with `aria-labelledby`; an `<h2>`; the window label
   and freshness disclosure (Req 7); the `<svg>` grid **with month column labels**; the legend
   (Req 4.6); the text equivalent (Req 5.3).
    - **[v4] Month column labels are required and weekday row labels are rejected.** v3's structure
      gave a sighted user two temporal anchors for 182 cells — the endpoints in the window label —
      while the `<details>` table gave a screen-reader user month-by-month resolution, inverting the
      primary/secondary relationship the spec claims. Month labels cost vertical space only. Weekday
      labels would cost 20–25px of the 288px horizontal budget, which Req 3.6's arithmetic cannot
      absorb; the convention of labelling only alternate weekdays does not recover enough.

5. **Cells without `hasData` SHALL be rendered as absent** — no rect, no border, no fill — never as
   level 0. This covers both uncovered leading cells and future trailing cells.

6. **Responsive behaviour.**
    - The cell **pitch SHALL be ≤11px**, and **`mark + gap ≤ 11px`** SHALL hold as a checkable
      constraint. **[v4]** v3 pinned the pitch and deferred the mark size, so a design-phase mark
      floor above 8px would have made the pitch unsatisfiable at the moment it was resolved. If the
      two conflict, the pitch yields and the scroll container becomes the normal path — stated here so
      the resolution is not invented in design.
    - At 320px the content box is 288px (`page.tsx:24`'s `px-4` costs 16px per side), and
      26 × 11 = 286 fits.
    - The SVG SHALL be wrapped in an `overflow-x: auto` container **as a pure CSS safety net, with no
      `tabindex` and no accessible name**. **[v4]** v2 made `tabindex` conditional on scrollability,
      which a server component cannot evaluate; v3 made it unconditional, which — given the pitch
      guarantee means the container never scrolls at any supported viewport — mandated a permanently
      focusable, permanently inert region in the tab order. Neither is right. If the pitch constraint
      is ever relaxed such that the container can scroll, `tabindex="0"` and an accessible name become
      required, and that is a change to this criterion, not a runtime condition.

7. The section SHALL render **after** the contributions card grid.

8. **Empty state**: WHEN the page's `getActivityWindow()` returns `null` THEN the section SHALL NOT be
   rendered — no heading, no frame, no placeholder.

9. **The section SHALL NOT render when the contributions collection is empty.** `page.tsx:29-33`
   renders `<h2 id="empty-state-heading">No contributions yet</h2>` on that branch; without this gate,
   "no contributions, non-empty activity" would render that heading directly above a heatmap
   announcing 1,820 contributions.

10. The SVG SHALL NOT cause horizontal overflow of `<body>` at any breakpoint.

### Requirement 4: Colour, print, and design-system conformance

**User Story:** As the owner of this site's design system, I want the heatmap to use a licensed
treatment, decided deliberately, not asserted inside a feature spec.

#### Acceptance Criteria

1. **BLOCKING PREREQUISITE — [v4] and it names two documents, not one.** v3 sent the amendment only to
   `visual-design/design.md`, a completed spec's design document. The sentence that actually prohibits
   this feature is in **steering**:
   `.spec-workflow/steering/design-system.md:73-75` — *"**Data visualization is out of scope**: the
   active palette has no chroma system for distinguishing data series, charts must never encode
   meaning by color alone (WCAG 1.4.1), and any charts are a design-spec decision."* Steering is loaded
   every session and binds every subsequent feature; amending a spec doc leaves it standing, producing
   a repository where one completed spec permits what steering forbids.
    - **`design-system.md` (steering)** carries the gate: the data-visualization scope statement and
      the colour-alone rule. It needs a narrow carve-out for a single-hue sequential ramp with a
      non-colour channel (Req 4.8, Req 5.3).
    - **`visual-design/design.md`** carries the implementation contract and needs three things, not
      v3's two: a **non-text data marks** subsection defining a mark-versus-surface ratio; a
      **nesting-depth carve-out**; and legalisation of a **brand-derived tint surface** — the pairing
      matrix's surface list at `:226` is `background`, `card`, `popover`, `muted`, and the **status**
      `/10` tints, so a `--brand`-at-alpha fill is a category that does not exist, and the Forbidden
      clause at `:175-176` reads on it.
    - This spec **requests** both amendments; it does not impose `SHALL` on artifacts it has excluded
      from its own requirements. Sequencing item 3 names the owner and verification for both.
    - **Gate scope**: Req 4 in its entirety, plus the fill/stroke attributes emitted by Req 3. The
      component structure, helper, schema, tests, and documentation may proceed.

2. **Recommended treatment, subject to approval**: levels 1–4 as `--brand` at four ascending alpha
   steps. `--brand` is theme-paired (`oklch(0.5 0.13 42)` light, `oklch(0.75 0.12 55)` dark) and a
   single-hue sequential ramp is the conventional, most legible encoding — and the basis of Req 4.8's
   1.4.1 argument. A neutral `--foreground` ramp is the alternative; it is greyer, harder to
   distinguish from body text, and needs identical governance.

3. **Level 0 SHALL clear ≥1.5:1 against `--card`** in both themes, with the measured value recorded.
   For reference `--border` composites to 1.26:1 light / 1.32:1 dark — the invisibility this prevents.
   The collision with Req 5.6's uniform-fill rule SHALL be resolved explicitly: either level 0 is a
   `--brand` fill at a floor opacity meeting the ratio, or it is exempted from Req 5.6 and the
   exemption is written into both criteria.

4. **`--chart-1` … `--chart-5` SHALL NOT be used** — reserved and out of contract, and byte-identical
   across `:root` and `.dark`, so in dark mode `--chart-5` sits at 1.185:1 against `--card`.

5. **GitHub green SHALL NOT be used.**

6. **The legend SHALL render exactly the levels in `levelsPresent`**, in ascending order, with
   Less → More text endpoints.
   **[v4]** v3 gated this on `thresholds === null`, asserting that "no thresholds" and "some levels
   unused" are the same condition. Req 2.3 documents three paths where they are not, and the common
   one is reachable with ordinary data (Req 2.10's `S = [1,1,1,1,2,3,4,10]` case). Gating on
   `levelsPresent`, computed from the grid, is what NFR-Usability's "truthful about the levels in use"
   actually requires.
    - WHEN `levelsPresent` is a strict subset of `{0,1,2,3,4}` THEN the visible copy SHALL disclose
      that the scale is relative to the period shown, so a two-swatch legend is not read as "this
      mid-alpha is the maximum."

7. **The `StatusCallout` precedent citation is withdrawn** — `status-callout.tsx:9-12` never touches
   `--brand`, tints a background while text and an icon carry the information, and compiles
   `bg-success/10` to `color-mix(…)`, the baked alpha Req 5.6 forbids.

8. **The WCAG 1.4.11 "essential presentation" exception is withdrawn**, and the 1.4.1 argument is made
   explicitly with the measurement that tests it.
    - **The compliance basis** is that a single-hue alpha ramp orders marks by **luminance, not hue**,
      so the encoding survives colour-vision deficiency and a greyscale render. This addresses the
      steering rule quoted in Req 4.1.
    - **[v4] An adjacent-step luminance separation SHALL be pinned**, because the argument's operative
      test is whether adjacent steps remain distinguishable with hue removed, and v3 pinned only the
      two endpoints. Four alphas across a ~3:1 span leave pairs ~1.3:1 apart — satisfying every stated
      number while failing the test the argument depends on, with nothing able to catch it and the
      three-level fallback unable to trigger. **Each level SHALL clear ≥1.3:1 against its immediate
      neighbour**, composited over `--card`, in both themes, with the per-step table recorded in the
      design document. The number is the floor at which a 5-step ramp remains resolvable within the
      21:1 total range available; it is this spec's own figure, not a W3C threshold.
    - **The verification artifact** is a greyscale render of the ramp plus the per-step measurement
      table, recorded alongside Req 5.6's forced-colors screenshot.
    - **Honest limitation**: "the standard defence for sequential encodings" is a design-practice
      convention, not a cited W3C technique. This spec advances it as its own argument and records the
      fallback trigger accordingly.
    - Level 4 SHALL clear ≥3:1 against `--card` in both themes.
    - **Fallback**, triggered when the adjacent-step floor cannot be met: reduce to three levels plus
      zero, at alphas where every level clears 3:1 (light-mode `--brand` clears 3:1 above ~0.62 alpha).

9. **Nesting depth**: tinted cells on `card` on `background` is depth 3 against a maximum of 2. Cells
   carry no text, so the text-contrast gate does not apply. Covered by Req 4.1's carve-out.

10. Styles SHALL be a `/* Contribution heatmap */` section in `src/styles/contributions.css` using
    `.contrib-heatmap__*` naming, all colours as `var(--…)`.

11. **This spec SHALL NOT resolve the project's open "Data-viz / chart palette" deferred decision.** It
    licenses one sequential ramp for one graphic. Recorded via the `deferrals` tool in design.

12. **Print SHALL be addressed, and the rule names its elements.**
    `src/styles/print.css:53-58` overrides `--background`, `--card`, `--popover`, `--muted`, and
    `--border` to white/`#ccc`, and `:61-66` overrides `--brand` to a third value present in neither
    theme. SVG `fill` prints even with background graphics disabled, so a `--muted`-derived level 0
    would print white on white.
    **[v4]** v3 said "the heatmap SHALL be hidden in print", which was ambiguous between the `<svg>`
    and the whole `<section>` — and the section reading drops the totals, period, and freshness date
    in the one context where the graphic is unavailable, contradicting NFR-Usability.
    - The **`<svg>` and the legend** SHALL be hidden in `@media print`.
    - The `<h2>`, the window label, the freshness disclosure, and the Req 5.3 text equivalent SHALL
      print.
    - The `<details>` SHALL be forced open in print (`details { display: block }` / `[open]`
      equivalent), since it prints collapsed by default in every engine.

### Requirement 5: Accessibility contract

**User Story:** As a screen-reader, low-vision, or high-contrast user, I want the heatmap's
information in a form I can actually consume.

#### Acceptance Criteria

1. The `<svg>` SHALL carry `role="img"` and a single descriptive `aria-label` naming the published
   range, `totalContributions`, and `activeDays`. **This is the canonical announcement of the headline
   figures.**

2. The `aria-label` SHALL be derived from `ActivityWindow`, never hand-written prose, and SHALL use
   `publishedRangeStart` and `publishedRangeEnd` — never `windowStart` or `windowEnd`.

3. **A visible text equivalent SHALL be rendered as a `<details>` disclosure.**
   **[v4] The justification is restated, because v3 kept v2's remedy after replacing the reasoning
   that produced it.** With Req 4.8's luminance argument carrying 1.4.1, the table is the **1.1.1
   non-text-content channel**. `<details>` rather than `sr-only` remains correct for two reasons that
   survive the change: month-by-month figures are useful to sighted low-vision readers who can see the
   graphic but cannot resolve four alpha steps, and Req 3.4's month labels give the graphic only
   column-level resolution, so the table is the only place any user gets per-month totals.
    - Content: `monthlyTotals` as a table — month label, contribution total, and **active-day count**.
      Without the active-day column the text channel carries volume but not consistency, and
      consistency is the only thing the grid adds over Req 7.1's summary.
    - **[v4] The table SHALL NOT restate the headline figures.** v3 published `totalContributions` and
      `activeDays` in three places — the visible summary, the `aria-label`, and the table — so a
      screen-reader user traversing the section heard the same sentence three times. Req 5.5 rejects
      per-cell `<title>`s partly on announcement cost; the same scrutiny applies here. The summary
      (Req 7.1) and the `aria-label` (Req 5.1) keep them; the table drops them.
    - WHEN `isClipped` is true THEN the row SHALL show its covered range alongside the month label.
      `src/lib/format-date.ts:27` exports `formatMonthYear` for the labels.
    - Values SHALL derive from `ActivityWindow.monthlyTotals` — one traversal, honouring the
      dependency direction in the NFRs.

4. Individual cells SHALL NOT be focusable and SHALL NOT be separate accessibility-tree nodes.

5. **Per-cell `<title>` elements SHALL NOT be rendered.** `role="img"` makes the element a leaf node,
   so descendants leave the accessibility tree and `aria-label` overrides subtree content anyway. 182
   titles would be announced to nobody, unreachable by keyboard, serving only mouse hover.

6. **`forced-colors: active` SHALL be handled explicitly.** `fill` and `stroke` are forced properties;
   `fill-opacity` and `opacity` are not.
    - Cells SHALL use `fill: var(--brand)` plus per-level `fill-opacity` — subject to Req 4.3.
    - Cells SHALL NOT bake alpha into the colour value (no `color-mix(…)`, no `oklch(… / 25%)`).
    - A `@media (forced-colors: active)` block SHALL pin `fill: CanvasText` while retaining per-level
      `fill-opacity`.
    - The fallback SHALL resolve **three** states — no-data / zero / non-zero — using a forced-property
      channel (outline or stroke) for the distinction opacity cannot carry.
    - Verification SHALL be recorded in the design document with a screenshot. The development platform
      is WSL2 on Windows, so Edge on the Windows host is available. If verification proves impossible,
      the three-state fallback SHALL ship unconditionally.

7. The `<h2>` SHALL continue the page's `<h1>` → `<h2>` chain; the `<section>` carries
   `aria-labelledby`.

8. `prefers-reduced-motion` SHALL be honoured. No animation at launch.

9. The graphic SHALL satisfy **SC 1.4.10 (Reflow)** at 320px CSS width / 400% zoom without loss of
   content or two-dimensional scrolling, and **SC 1.4.12 (Text Spacing)** for the label, legend, and
   text-equivalent copy. Results recorded alongside Req 5.6's.

10. Colour contrast, keyboard operability, and both-theme correctness SHALL be verified per the
    decomposition's cross-spec Accessibility and Theme verification conventions. WCAG 2.1 AA violations
    are blocking.

### Requirement 6: Static rendering and search indexing

**User Story:** As the site owner, I want this feature to leave the site's static guarantees exactly as
it found them.

#### Acceptance Criteria

1. `page.tsx` SHALL retain `export const dynamic = "force-static"`.

2. **`revalidate` / ISR SHALL NOT be introduced.** It does not skip build-time prerender, so it buys
   nothing; `force-static` is a guard, and removing it lets a future `headers()`/`cookies()`/
   `searchParams` access silently convert the route to per-request SSR; Pagefind indexes one crawl per
   deploy (`scripts/run-pagefind-crawl.mjs`), so a page changing between deploys would have a
   permanently drifting excerpt; and `src/app/sitemap.ts` derives `lastModified` from content dates.

3. **The heatmap wrapper SHALL carry `data-pagefind-ignore="all"`.** `/contributions` has no
   `data-pagefind-body`, so Pagefind indexes the whole page. Precedent:
   `src/lib/build/rehype-copy-button.ts`. The Req 5.3 text equivalent SHALL be inside the ignored
   wrapper — it exists for assistive technology, not for search.

4. No change to `next.config.ts` is required or permitted; the CSP is already satisfied by
   server-rendered inline SVG. The design document SHALL state this so a future reader does not "fix"
   a CSP for a requirement that does not exist.

5. No change to `.env.example` is required; the design document SHALL state this for the same reason.

6. No change to `src/app/sitemap.ts` or `/sitemap` is required.

### Requirement 7: Published-range disclosure and data freshness

**User Story:** As a visitor, I want to know what period the graphic covers and how current it is.

#### Acceptance Criteria

1. A **visible text summary** SHALL state the published range and the headline figures, derived from
   `ActivityWindow`, never hard-coded.

2. **The summary SHALL state `publishedRangeStart → publishedRangeEnd`** — never `windowStart`, never
   `windowEnd`. **[v4] No copy anywhere SHALL assert a fixed "26 weeks"**, because the published range
   is 176–182 days when coverage is complete and shorter when it is not; v3's Introduction, Req 10.1,
   and in-scope list all said "26 weeks" while Req 7.2 pinned a range that can disagree with it. The
   26-week figure describes the grid frame, which is an implementation fact, not a claim to a visitor.
   A link to `https://github.com/madmatt112` SHALL be present, `rel="noopener"`, same-tab.

3. A **freshness disclosure SHALL be rendered**, stating `anchorDate`. Mandatory.

4. Date and number formatting SHALL go through `src/lib/format-date.ts` — `formatContentDate` (en-CA,
   e.g. "August 8, 2026") for dates and `formatMonthYear` for month labels. **[v4] The module exports
   exactly those two functions today; Req 7.1 needs a range formatter and a thousands separator for a
   four-digit total, so both SHALL be added there with tests** rather than formatted ad hoc in the
   component. No date library SHALL be introduced.

5. **Staleness and partial coverage are soft failures**: neither SHALL fail the build or hide the
   graphic. Reqs 7.2, 7.3 and 9 are the mitigations.

### Requirement 8: One-time seeding and review fixture

**User Story:** As a reviewer, I want the numbers this spec relies on to be checkable rather than
asserted.

#### Acceptance Criteria

1. `content/github-activity.yaml` SHALL be seeded once, by hand, from a documented query, in ascending
   `date` order, **carrying every day in the covered range** per Req 1.10.

2. **The seed query SHALL cover 52 weeks**, though the window is 26. Req 2.2 ignores the surplus, and
   the longer payload makes this document's five-empty-months claim checkable.

3. **The fixture path and format SHALL be named**, because no convention covers this artifact:
   `src/__fixtures__/` holds TypeScript lint canaries plus `projects-empty/`, `scripts/__fixtures__/`
   holds per-script scenario directories, and there are zero JSON fixtures in the repository. The
   design phase SHALL name path and format and state whether it is lint-visible and type-checked.

4. The seeding procedure SHALL be documented in the authoring doc (Req 10.1), including the exact
   query, so a refresh is reproducible by hand.

5. Seeding is a human step, not a runtime dependency. Both the authenticated GraphQL API and the
   unauthenticated public endpoint are acceptable. The claim that they return identical figures is an
   editorial note unless both payloads are committed.

### Requirement 9: Freshness and coverage detection

**User Story:** As Matthew, I want a stale, impossible, or incomplete data file surfaced in the CI log
so I catch it on a run I am already reading. **Detection is manual — the check annotates, it does not
notify.** A heatmap does not warrant an alerting pipeline, and this story is written to match what the
criteria deliver rather than to claim a channel that does not exist.

#### Acceptance Criteria

1. `scripts/check-github-activity-freshness.mjs` SHALL be wired into `.github/workflows/ci.yml`
   **before the `Build` step**. **[v4] The position is pinned because it decides implementability.**
   Content-derived scripts that read `.velite/*.json` must run after `Build`; there, a missing file and
   an empty file are both `[]`, which makes Req 9.7's absence warning impossible and Req 9.3's forward
   check unreachable (Req 1.3's bound would already have failed the build).

2. It SHALL read `content/github-activity.yaml` **directly**, not `.velite/githubActivity.json`, using
   the `yaml` package — already a transitive dependency imported by `scripts/verify-ci-topology.mjs`
   and `scripts/check-velite-output.mjs`.

3. **Three checks, all warnings:**
    - **Stale**: `anchorDate` older than **45 days** before the build clock.
    - **Impossible**: `anchorDate` ahead of the build clock at all — the mirror of Req 1.3's bound and
      the backstop if that guard is relaxed.
    - **[v4] Incomplete coverage**: `dataStart` later than `windowStart`, i.e. the file does not cover
      the frame. This is the detector for r3's top finding, and neither of the other two checks can see
      it, because both read only `max(date)`.

4. The staleness threshold is **45 days**, pinned here because Req 10.1 requires the authoring doc to
   document it.

5. It SHALL warn, not fail. A stale or partially covered graphic is honest-but-limited, and Reqs 7.2
   and 7.3 already disclose it to visitors.

6. It SHALL emit bare `::warning::` lines, matching `scripts/check-vercel-auto-deploy.mjs` and
   `scripts/warn-no-pagefind.mjs`.

7. **Input-state branches SHALL be exhaustive**, and all three non-happy states warn:
    - **File absent** → `::warning::`. Correct-but-noisy for the one commit before seeding; after
      seeding it is the only detector of a silent deletion.
    - **[v4] File present but `[]`** → `::warning::`. v3 covered absence only, leaving this state —
      reachable by an ordinary merge resolution, and *cheaper* to reach than deletion — reported
      healthy by Reqs 1.9, 3.8, and 2.10's "empty collection → null" test simultaneously.
    - **[v4] File present with records but every `count` is zero** → `::warning::`, distinct message.
      Reachable from a mis-parameterised refresh query.
    - Each state SHALL have a distinct message naming the state.

8. It SHALL have a colocated `*.test.mjs`. **[v4]** `ci.yml` runs `node --test` for exactly three
   scripts today (`check-velite-output`, `check-authoring-docs`, `check-playground-css`) while the repo
   holds ten-plus colocated test files, and the two scripts Req 9.6 cites as warning precedent are
   themselves untested. **This test SHALL be wired as a CI step**, so the criterion does not mandate
   shelfware.

### Requirement 10: Documentation and CI coverage

**User Story:** As the person reading this in a year, I want to know how the data got there, how to
refresh it, and what the failure modes look like.

#### Acceptance Criteria

1. `docs/contributions-and-resources-authoring.md` SHALL gain a canonical section
   `## GitHub activity data` covering: that the file is generated and should not be hand-edited row by
   row; the exact refresh query and its 52-week range; **that the file must carry every day in its
   covered range (Req 1.10) and that a short refresh silently shortens the published period**; that the
   grid frame is 26 weeks while the published range is whatever the data covers; that staleness is a
   soft failure and the "as of" line is the tell; the 45-day threshold; and one example entry.

2. The heading SHALL be added to `CANONICAL_HEADINGS` in `scripts/check-authoring-docs.mjs` in the same
   pull request. That script does exact full-line matching, order-independent, extras permitted; the
   no-comma/no-colon rule is a convention from the authoring doc, not a script behaviour.

3. `${baseUrl}/contributions` SHALL be added to the `urls` array in `lighthouserc.js`. The
   `assertMatrix` derives from `urls.map`, so this is a one-line change.

4. **Known gap, stated rather than silently inherited**: `pnpm lhci` is a manual local wrapper, not
   invoked in `ci.yml`, and the `total-byte-weight` thresholds are scaffold placeholders. Adding the
   URL extends manual coverage, not automated gating. A run against `/contributions` SHALL be performed
   manually and recorded in `docs/contributions-and-resources-lighthouse-runs.md`.

5. The recorded run SHALL include the machine-parsed line
   `- Entries at run time (contributions + resources): N`, which
   `check-contributions-resources-lighthouse-cadence.mjs` parses.

6. **[v4] REVERSED. The dormant cadence script SHALL NOT be wired by this spec.** It is handed to
   triage, on exactly the grounds Req 10.8 applies to `verify-ci-topology.mjs` twelve lines below.
   v3 mandated wiring it, which was inconsistent in two ways: two dormant, unwired, non-failing scripts
   received opposite dispositions in adjacent criteria; and v3 had already removed the argument that
   distinguished them by decoupling the content PR. The script counts
   `.velite/contributions.json` + `.velite/resources.json` and never `githubActivity`, so this feature
   does not move its counter at all. Wiring it was also the only branch that re-coupled the content PR:
   on today's counts (contributions 1 + resources 4 = 5, logged baseline 0, `CADENCE_N = 10`), wiring
   plus a six-entry content PR takes the delta to 11 and turns a content-only change red. Req 10.5's
   log line is still required, because it costs one line and leaves the script in a better state for
   whoever triages it.

7. The four `design-baseline/after/contributions-*.png` screenshots SHALL be regenerated in the same
   pull request as the visual change.

8. **Out-of-scope observations, recorded for triage.** Neither is fixed here and neither blocks this
   spec: `scripts/verify-ci-topology.mjs` exits non-zero against `main` today, asserting CI step names
   `ci.yml` no longer contains; and `check-contributions-resources-lighthouse-cadence.mjs` remains
   dormant per Req 10.6.

### Requirement 11: Lifecycle and failure modes

**User Story:** As a maintainer, I want every failure state to have exactly one documented outcome, so
no state is simultaneously reported as healthy by several requirements.

#### Acceptance Criteria

**[v4]** v3's version of this story was a completeness claim the criteria did not meet: it closed the
file-deletion instance and left two neighbours in the same shape. The table below enumerates every
input state.

1. **Malformed YAML** → build fails, via the loader registration in Req 1.5.
2. **Duplicate dates** → build fails, naming the date (Req 1.10).
3. **Gap inside the covered range** → build fails, naming the first missing date (Req 1.10).
4. **Future-dated record** → build fails at the schema (Req 1.3); if that bound is ever relaxed,
   Req 9.3's impossible-date check warns.
5. **File absent, never seeded** → section not rendered (Req 3.8); CI warns (Req 9.7).
6. **File absent, previously seeded** → same as above. Indistinguishable by design; the warning is what
   makes it visible.
7. **File present but `[]`** → section not rendered (Req 3.8); CI warns with a distinct message
   (Req 9.7).
8. **File present, all counts zero** → section renders an empty grid, a one-level legend, and "0
   contributions" for the covered period; CI warns (Req 9.7). This is honest output, consistent with
   the Introduction's refusal to move the window to avoid gaps, and it is documented here so a reader
   hitting it in production has an answer.
9. **File covers less than the frame** → the published range shrinks to the covered span (Req 7.2),
   uncovered cells render as absent (Req 3.5), and CI warns (Req 9.3). The page never claims a period
   it has no data for.
10. **Empty contributions collection** → section suppressed (Req 3.9), so the empty-state copy is never
    contradicted.
11. **Stale file** → old "as of" date; CI warns past 45 days (Reqs 9.3–9.4).
12. **Degenerate distribution** → grid renders with the levels present, legend shows only those levels
    and discloses that the scale is period-relative (Reqs 2.3, 4.6).
13. **Rollback** is `git revert`. There is no per-entry unpublish.
14. **Removal of the feature** is deleting the component usage from `page.tsx`; the collection and file
    may remain harmlessly.

## Sequencing and Prerequisite Work

1. **Content pull request — the six external contributions.** Adds merged PRs in
   `deliveryhero/helm-charts` (2), `open-policy-agent/gatekeeper`, `MicrosoftDocs/azure-docs`,
   `nvbn/thefuck`, and `neiraitheforgiven/Good-Morning-Gauntlet` to `content/contributions.yaml`.
   **Independent and unordered, unconditionally** — **[v4]** v3 made this claim while Req 10.6's
   "wire it" branch would have re-coupled it; with Req 10.6 reversed, nothing in Reqs 1–11 reads
   `contributions.yaml` and no CI gate this spec touches counts its entries.
   **[decided 2026-08-09]** Both open decisions are now settled: **four entries**, not six.
   `deliveryhero/helm-charts`'s two merged PRs become **one entry with two `links`** — it reads as
   "contributed to this project" rather than two separate wins, and it stays inside `uniqueByKind`
   (`contributions-schema.ts:35`) only if the two links carry different `kind` values, so if both are
   `pr` the second SHALL be omitted or retyped rather than duplicated.
   `neiraitheforgiven/Good-Morning-Gauntlet` is **excluded** — a genuine external contribution, but a
   small personal project that sits oddly beside Gatekeeper and the Azure docs. The four shipped
   entries are `deliveryhero/helm-charts`, `open-policy-agent/gatekeeper`, `MicrosoftDocs/azure-docs`,
   and `nvbn/thefuck`.

2. **Amend `.spec-workflow/spec-decomposition/decomposition.md`** with an `### 11. github-activity`
   block, then regenerate `INDEX.md` with the `spec-index` tool. **Owner: Matthew. Verification:
   `INDEX.md` lists the spec in Active.**

3. **Amend two documents per Req 4.1**, and approve both:
    - `.spec-workflow/steering/design-system.md` — a carve-out to the data-visualization scope
      statement and the colour-alone rule at `:73-75`.
    - `.spec-workflow/specs/visual-design/design.md` — a non-text-data-marks subsection, a
      nesting-depth carve-out, and legalisation of a brand-derived tint surface.
   **Owner: Matthew. Verification: this spec's design phase cites both amended sections by heading
   before any colour task starts.** Gate scope is pinned in Req 4.1.

4. This spec's design phase.

5. **Follow-on spec `github-activity-sync`** — scheduled refresh automation. Guidance for its author,
   not `SHALL`s imposed on a spec that does not exist: a pull request authored by the Actions
   `GITHUB_TOKEN` does not trigger `pull_request` workflow runs, so the payload would never be
   validated before merge; an unmerged sync PR left open indefinitely is a state "soft failure" rules
   report as healthy; the secret should not be named `GITHUB_TOKEN`, which is reserved and
   auto-injected as a repository-scoped installation token that cannot read
   `user(login:).contributionsCollection`; and any sync must preserve Req 1.10's coverage contiguity,
   since a short write is the failure Req 9.3 exists to catch.

## Non-Functional Requirements

### Code Architecture and Modularity

- **Single Responsibility**: `github-activity-schema.ts` validates; `github-activity.ts` derives;
  `contribution-heatmap.tsx` renders; `check-github-activity-freshness.mjs` detects. No module does two.
- **Naming**: the feature is **activity**, not contributions, throughout — a `github-contributions.ts`
  beside the existing `contributions.ts` is a foreseeable trap and is prohibited.
- **Dependency direction**: page → component → props. The page reads `#site/content` via the helper;
  the component receives `ActivityWindow` and performs no lookups (Req 3.1). No second traversal for
  the text equivalent.
- **No new runtime dependency** in `package.json`: no date library, no charting library, no SVG library.

### Performance

- Zero client JavaScript added. Zero network requests added.
- **DOM cost**: ~182 rects plus month labels, legend, a ~7-row table, and wrappers. The design phase
  SHALL measure the page baseline rather than inheriting a figure; the previously quoted "135 elements"
  was taken with one contribution card, and Sequencing item 1 may add six. Lighthouse's `dom-size`
  warns above 800 and has been a weight-0 diagnostic since Lighthouse 10.
- Lighthouse ≥90 across all four categories on `/contributions`, verified manually per Req 10.4.

### Security

- No credential in the deployed application, the Next.js build, or `.env.example`.
- No third-party origin in the render path; no CSP relaxation. No user input is rendered.

### Reliability

- The site SHALL build and render correctly with the data file absent, empty, all-zero, partially
  covering the frame, or arbitrarily stale — each with the outcome documented in Req 11.
- **No build path in any environment** SHALL depend on network reachability of GitHub or any third
  party.

### Usability

- Legible in both themes at every named breakpoint, and in print per Req 4.12.
- The published range, totals, and freshness date are readable as text without interpreting the
  graphic — including in print, where the graphic is hidden and the text is not.
- The legend is present, labelled, and truthful about the levels in use.
- **The graphic never claims a period it has no data for**, at either edge.

### Maintainability

- Levels are computed locally, giving reproducibility from the committed file — same file, same grid
  (Req 1.8). The encoding is *not* stable across refreshes, and Req 4.6 discloses when that shows.
- Coverage is decidable from the file alone (Req 1.10), so no reader has to guess whether a quiet
  stretch is real.
- The clock-free constraint (Req 2.7) keeps derivation deterministic and assertable.
- Documentation drift is caught by the existing `check:authoring-docs` CI step.
