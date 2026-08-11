# Design Document

> **Version 9 — final.** Reviewed adversarially eight times (`reviews/adversarial-analysis-design.md`,
> `-r2.md` … `-r8.md`). Every finding from all eight rounds accepted; dispositions in
> §Revision history.
>
> The surface question took three rounds to settle and the resolution reverses v3. v1 measured against
> `--card` while specifying no card; v2 pinned `--background`, which the pairing matrix marked illegal;
> v3 added a card wrapper, which made it legal and **broke the 288px geometry** (`.contribution-card`
> spends 50px on padding and border, leaving 238px for 284px of ink). v4 keeps `--background` and
> amends one matrix cell instead — a card was a perceptual no-op in light mode, cost contrast in dark,
> and bought nothing the amendment did not.

## Overview

A rolling 26-week GitHub contribution heatmap rendered below the curated cards on `/contributions`.

The feature is a straight line: a validated YAML file in `content/` → a Velite collection → one pure
derivation module → one server component emitting inline SVG. Nothing fetches, nothing runs in the
browser, nothing holds a credential. The page keeps `force-static` and the CSP is untouched.

1. **Coverage is a first-class concept.** The file must carry every day from `dataStart` to
   `anchorDate` (Req 1.10), so "quiet February" and "February not seeded" are distinguishable.
2. **The colour ramp is measured.** Carve-out conditions 1, 2, 4 and 5 are satisfied in this document,
   as is the numeric half of condition 3 (per-step table plus greyscale swatches). **[v4] Condition 3's
   spatial half — whether adjacent steps are resolvable at a 9px mark — is a visual check at
   implementation**, with Req 4.8's step-count reduction as its branch. v3's Overview claimed all five
   were met "in this document" while its own §Design System deferred that half; the claim is now
   scoped to what the document actually contains.
3. **Derivation is clock-free** (Req 2.7 — no `new Date()` *with no arguments*, no `Date.now()`).
4. **Every input state has exactly one outcome** (Req 11), now including zero-byte.

## Steering Document Alignment

### Technical Standards (tech.md)

- **Static-first.** `/contributions` stays `force-static` (Req 6.1). **[v7] `revalidate` / ISR is not
  introduced** (Req 6.2), on four grounds: it does not skip build-time prerender so it buys nothing;
  `force-static` is a guard, and removing it lets a future `headers()`/`cookies()`/`searchParams`
  access silently convert the route to per-request SSR; Pagefind indexes one crawl per deploy
  (`scripts/run-pagefind-crawl.mjs`), so a page changing between deploys would have a permanently
  drifting excerpt; and `src/app/sitemap.ts` derives `lastModified` from content dates.
- **Velite content pipeline.** Modelled like every other content type. **[v7] The data file is YAML,
  not JSON** (Req 1.6) — `makeContentYamlLoader`'s `test` is `/\.(ya?ml)$/`, so a `.json` file would
  bypass the repo's only hard-fail content validator entirely. **The schema envelope is the per-entry
  form used at `velite.config.ts:433-443`, without a `.min(0)` suffix** (Req 1.2), matching
  `contributions` and `resources` rather than the array-wrapper shape earlier drafts assumed.
- **[v8] The application makes no network request to GitHub or any third party** (Req 1.7), at build
  or request time, in any environment. Velite is the only reader of the data file; the freshness
  script reads it from disk. Stated here because v7's coverage table pointed at this section for
  Req 1.7 and this section did not contain it.
- **[v9] `JSON.parse` of `.velite/githubActivity.json` is prohibited outside
  `src/lib/github-activity.ts`** (Req 1.11, second half). The collection is reached through
  `#site/content` only; the ESLint edits enforce the import path, and this states the direct-file-read
  half that lint cannot see.
- **[v8] `contributionLevel` is not stored or consumed** (Req 1.8). GitHub's own level field is
  computed relative to the user's personal maximum over the queried period, so it cannot be reproduced
  offline or asserted in a unit test. Levels are derived locally (§Design System), which buys
  **reproducibility from the committed file** — same file, same grid. It does *not* buy stability of
  meaning across refreshes: the window moves, so the encoding re-denominates, and Req 4.6's legend
  discloses when that materially changes what is shown.
- **[v7] Naming** (NFR-Naming): the feature is **activity** in every name that is free to choose —
  the collection (`githubActivity`), the content file, the schema and helper modules, the script, and
  test names. Never `github-contributions.*`, which would sit beside the existing
  `src/lib/contributions.ts` exporting near-identical names for a different concept on a page called
  Contributions. **[v8] Two names are fixed by requirements and are deliberately not "activity"**:
  the component is `ContributionHeatmap` (Req 3.1) and the CSS prefix is `.contrib-heatmap__*`
  (Req 4.10), both of which sit in the `contributions/` component directory and inherit that page's
  naming. v7's bullet claimed "activity everywhere — CSS prefix, component props" and contradicted two
  requirements this same document implements.
- **CSP.** Satisfied by server-rendered inline SVG. **`next.config.ts` is not modified** (Req 6.4).
- **`.env.example` is not modified** (Req 6.5) — no credential in any environment.
- **`src/app/sitemap.ts` and `/sitemap` are not modified** (Req 6.6) — `/contributions` is already in
  both and this feature adds no route.
- **No new runtime dependency.**

### Project Structure (structure.md)

| Artifact | Change | Requirement |
|---|---|---|
| `content/github-activity.yaml` | new — flat `{date, count}` list | Req 1 |
| `velite.config.ts` | **four edits**: `defineCollection`, `collections:` entry, loader-map entry, `prepare()` branch | Reqs 1.1, 1.5, 1.10 |
| `src/lib/build/github-activity-schema.ts` | new | Req 1.4 |
| **`src/lib/build/check-github-activity-invariants.ts`** + `.test.ts` | new — `checkNoDuplicateDates`, `checkCoverageContiguity`, and **[v6]** the composed `runGithubActivityInvariants` that `prepare()` calls | Req 1.10 |
| `src/lib/build/content-error-format.ts` | identifier-field registration | Req 1.5 |
| `eslint.config.mjs` | **two edits**: `importNames` (`:30`); allowlist (`:40-49`) | Req 1.5 |
| `src/lib/github-activity.ts` + `.test.ts` | new | Req 2 |
| `src/components/contributions/contribution-heatmap.tsx` + `.test.tsx` | new | Req 3 |
| `src/lib/format-date.ts` + tests | **three additions**: range formatter, thousands separator, `formatMonthAbbrev` | Req 7.4, §Geometry |
| `src/styles/contributions.css` | `.contrib-heatmap__*` section incl. `@media print` | Reqs 4.10, 4.12 |
| `src/app/(site)/contributions/page.tsx` | integration; `force-static` unchanged | Reqs 3.7, 3.9, 6.1 |
| `scripts/check-github-activity-freshness.mjs` + `.test.mjs` | new | Req 9 |
| `.github/workflows/ci.yml` | two steps before `Build` | Reqs 9.1, 9.8 |
| `docs/contributions-and-resources-authoring.md` | `## GitHub activity data` | Req 10.1 |
| `scripts/check-authoring-docs.mjs` | heading into `CANONICAL_HEADINGS` | Req 10.2 |
| `lighthouserc.js` | `/contributions` into `urls` | Req 10.3 |
| `docs/contributions-and-resources-lighthouse-runs.md` | recorded run + machine-parsed line | Reqs 10.4, 10.5 |
| `design-baseline/after/contributions-*.png` | four screenshots | Req 10.7 |
| `e2e/tests/contact-axe.test.ts` | add `/contributions` to the existing harness | §Testing |
| `e2e/tests/contributions-heatmap.test.ts` | new spec file | §Testing |
| `scripts/__fixtures__/github-activity/seed-52w.json` | new audit fixture | Req 8.3 |
| `.prettierignore` | **[v5]** add `/scripts/__fixtures__/github-activity/` — the payload must stay byte-identical | Req 8.3 |

**[v4] Req 10.1 and Req 10.2 are coupled in one direction only.** `checkHeadings`
(`check-authoring-docs.mjs:102-106`) fails when a **registered** heading is **absent** from the doc; it
does not scan for unregistered headings, and Req 10.2 itself states extras are permitted. So
registering without adding fails CI; adding without registering passes silently and leaves the drift
guard blind to the new section. v3 said "or vice versa", which was false. Both still land in the same
commit — the second direction is a documentation-integrity concern rather than a CI one.

**The ESLint edits are coupled one-way**: `importNames` without the allowlist makes the feature's own
helper violate its new rule, and `pnpm lint` is `ci.yml:29` — the first gate. Same commit.

**Content-chokepoint scanner — decided, not overlooked.** `check-content-chokepoint.ts:78` carries a
closed `ContentSymbol` union (`"contributions" | "resources"`), a per-symbol allowlist pinned by a
`toEqual` assertion, a canary, and an all-or-none commit gate. **This design does not extend it.** The
scanner is invoked from nothing but its own test — there is no repo-wide sweep in `ci.yml` — so not
extending it breaks nothing today. `githubActivity`'s chokepoint enforcement is **ESLint-only,
deliberately**, recorded here so a future reader knows it was decided. Same discipline Req 6.4 applies
to the CSP, pointed the other way.

### Requirement coverage

**[v7] A traceability table, because prose tracking failed six rounds running.** Every requirement in
`requirements.md` v4 maps to a section here. Rows marked **[v7]** are ones that had no design artifact
until this version — six rounds open, three of them recorded as handled when they were not. The table
exists so the next check is a lookup rather than a re-derivation.

| Req | Covered in |
|---|---|
| 1.1, 1.5 | §Project Structure (four `velite.config.ts` edits, four registrations) |
| **1.2** | **[v7]** §Technical Standards — per-entry envelope, no `.min(0)` |
| 1.3, 1.4 | §Components — schema module, `BUILD_START_UTC` bound |
| **1.6** | **[v7]** §Technical Standards — YAML not JSON |
| 1.7 | **[v8]** §Technical Standards — "no network request to GitHub or any third party" bullet |
| **1.8** | **[v8]** §Technical Standards — `contributionLevel` prohibition |
| 1.9 | §Error Handling — loader envelope errors |
| 1.10 | §Components — invariants module, message shapes, contract disposition |
| 1.11 | §Project Structure — ESLint chokepoint edits; **[v9]** §Technical Standards for the `JSON.parse` prohibition |
| 2.1–2.10 | §Components (helper), §Data Models, §Testing |
| 3.1–3.10 | §Components (component), §Geometry |
| 4.1–4.3, 4.6, 4.8, 4.9 | §Design System |
| **4.7** | **[v9]** §Design System — the withdrawn `StatusCallout` precedent |
| **4.10** | **[v9]** §Project Structure — `.contrib-heatmap__*` section in `contributions.css` |
| **4.11** | **[v9]** §Deferred — deferral `d-db7c55e9`, data-viz palette not resolved |
| **4.12** | **[v9]** §Accessibility — `@media print` hides SVG and legend, keeps text |
| **4.4, 4.5** | **[v7]** §Design System — `chart-*` and GitHub green prohibitions |
| 5.1–5.10 | §Accessibility |
| 6.1 | §Technical Standards — `force-static` retained |
| **6.2** | **[v7]** §Technical Standards — ISR rejected, four grounds |
| 6.3 | §Integration points — `data-pagefind-ignore` |
| 6.4, 6.5, 6.6 | §Technical Standards — CSP, `.env.example`, sitemap all unmodified |
| 7.1–7.5 | §Components (render order), §Geometry, §Deferred |
| **8.1** | **[v7]** §Seeding below |
| 8.2, 8.3 | §Deferred — 52-week seed, fixture path/format/visibility |
| **8.4** | **[v9]** §Project Structure — the seeding query is documented in the authoring doc (Req 10.1) |
| **8.5** | **[v9]** §Seeding and removal — seeding is a human step, not a runtime dependency |
| 9.1, 9.2 | §Architecture — reads the YAML directly, runs before `Build` |
| 9.3, 9.4, 9.5, 9.7 | §Error Handling — seven states, thresholds, warn-not-fail |
| **9.6** | **[v9]** §Components (script) — bare `::warning::` output format |
| 9.8 | §Testing — colocated `*.test.mjs`, wired as a CI step |
| 10.1–10.8 | §Project Structure, §Integration points, §Testing |
| 11.1–11.12 | §Error Handling |
| 11.13 | **[v8]** §Commit sequencing — rollback is `git revert`, no paired-merge gate engaged |
| **11.14** | **[v7]** §Seeding below — removal path |
| NFR Performance, Security, Reliability, Maintainability | §Non-Functional Requirements |
| **NFR Usability** | **[v9]** §Non-Functional Requirements, under its own **Usability** bullet — legibility in both themes and in print, the published range readable as text, the legend truthful about levels in use, and the graphic never claiming a period it lacks data for. v8 added this row to close an r7 MUST_FIX and pointed it at a section where the word "Usability" did not appear; the bullet now exists. |
| **NFR Single Responsibility, No-new-runtime-dependency** | **[v9]** §Modular design and §Technical Standards respectively |
| **NFR Naming** | **[v7]** §Technical Standards — activity, never contributions |
| NFR Dependency direction | §Modular design |

### Seeding and removal

**[v7] Req 8.1** — `content/github-activity.yaml` is seeded **once, by hand**, from the documented
52-week query, written in **ascending `date` order** for a stable diff, and carrying **every day in
the covered range** so Req 1.10's contiguity check passes. The ordering is not cosmetic: it makes each
refresh a readable diff rather than a whole-file replacement.

**[v7] Req 11.14** — removing the feature is deleting the `ContributionHeatmap` usage from
`page.tsx`. The collection, the data file, the schema, and the invariants may all remain in place
harmlessly; nothing else on the site reads them. There is no migration and no cleanup obligation.

### Design System

Both prerequisite amendments landed before this document. **[v3] Cited by heading, as Sequencing item
3's verification condition requires**: `steering/design-system.md` §Color, bullet *"Carve-out —
single-hue sequential ramps (added for `github-activity`)"*; and `visual-design/design.md`
§*"Non-text data marks (added for `github-activity`)"* plus the `brand data mark (non-text)` row in
the legal pairing matrix.

**[v4] The section is a plain `<section>` under `<main>`. The marks composite over `--background`, and
the pairing matrix was amended to make that legal.**

Three rounds circled this. v1 measured against `--card` while specifying no card. v2 pinned
`--background` and argued a steering rule superseded Reqs 4.3/4.8 — which failed, because that rule
governs *"Any text or icon"* and Req 4.9 says these marks carry neither. v3 wrapped the section in a
card to satisfy the requirement as written — which **broke the geometry**: `.contribution-card`
(`contributions.css:45-54`) is `padding: 1.5rem` plus a 1px border, so the 288px content box at 320px
leaves **238px** for 284px of ink. That forces a scroll, which triggers Req 3.6's mandate for
`tabindex="0"` on a scrollable container — the exact affordance §Geometry removes — and breaches
SC 1.4.10.

The correct resolution is the one-line amendment rather than the layout contortion:
`visual-design/design.md:244` now reads `✓ see below` in the **`background`** column for
`brand data mark (non-text)`, and the gate table at `:251-255` is scoped to "whichever surface the
marks actually sit on". Rationale, recorded because it reverses a prior version: a card wrapper is a
**perceptual no-op in light mode** — `--card` and `--background` are byte-identical `oklch(1 0 0)` —
and it **costs contrast in dark mode**, where the worst adjacent pair drops from 1.39 (background) to
1.37 (card). It bought nothing and cost the geometry.

Nesting is therefore depth **2**, and the depth-3 carve-out in `visual-design/design.md:258-262` is
genuinely not needed for the shipped arrangement — that section now says so explicitly rather than
leaving a reader to wonder whether it was evaded.

**[v7] Two colour prohibitions, stated because the requirements state them and the design never did.**
`--chart-1` … `--chart-5` are **not used** (Req 4.4): they remain reserved and out of contract, and are
independently unusable here because they are byte-identical across `:root` and `.dark`, so in dark mode
`--chart-5` sits at 1.185:1 against `--card` and the two highest-intensity steps would be the least
visible. **GitHub green is not used** (Req 4.5): the site has a deliberate warm accent, and importing
another product's brand colour for a data graphic is a one-off colour by definition.

**Measurement method.** OKLCH → sRGB, composited at each alpha, WCAG relative-luminance ratios.
**[v3]** Composites are computed in **unquantised float**, not 8-bit — browsers paint 8-bit, and the
difference moves no figure across a gate, but v2 said "as browsers do" and that was imprecise.
**Rounding: floors, 2dp, always down**, so every figure is a lower bound.

**Ramp: `--brand` at `[0.28, 0.48, 0.66, 0.82, 1.0]` for levels 0–4, over `--background`.**

| Level | Alpha | Light | vs surface | Dark | vs surface |
|---|---|---|---|---|---|
| 0 | 0.28 | `#e4cbc0` | **1.54:1** | `#483222` | **1.65:1** |
| 1 | 0.48 | `#d0a593` | 2.20:1 | `#754e33` | 2.73:1 |
| 2 | 0.66 | `#bf846a` | 3.12:1 | `#9d6843` | 4.23:1 |
| 3 | 0.82 | `#af6646` | 4.35:1 | `#c07f51` | 6.02:1 |
| 4 | 1.00 | `#9e441d` | **6.34:1** | `#e89960` | **8.61:1** |

**All four adjacent pairs** — light `1.42 / 1.41 / 1.39 / 1.45`; dark `1.65 / 1.54 / 1.42 / 1.42`.

**Gates (Reqs 4.3, 4.8):** level 0 ≥1.5 → worst 1.54 ✓ · all four adjacent ≥1.3 → worst **1.39** ✓ ·
level 4 ≥3 → worst 6.34 ✓. **[v4]** Reverting to `--background` also recovers dark-mode margin: the
worst pair is 1.39 rather than the 1.37 a card surface produced. §Testing still treats 0.09 as a
regression risk.

**[v5] The ramp also passes Reqs 4.3/4.8 read literally against `--card`** — dark gives level 0 at
1.72:1, level 4 at 7.79:1, adjacent `1.58 / 1.48 / 1.37 / 1.38`, all clearing their floors. So the
surface decision is a matter of which arrangement is better, not of which one squeaks through a gate:
`--background` is chosen for the geometry and the extra 0.02 of margin, and the requirement's literal
wording would have been satisfied either way. Worth stating because three rounds of argument about the
denominator could otherwise imply the choice was load-bearing for compliance. It was not.

**[v3] Greyscale render — carve-out condition 3, in this document.**
Each step rendered as the sRGB grey of identical relative luminance. This is what a greyscale
conversion displays; the swatches are directly comparable by eye and reproducible from the hexes.

- **Light**, on `#ffffff`: `#d0d0d0` → `#afafaf` → `#929292` → `#797979` → `#5f5f5f`
- **Dark**, on `#0a0a0a`: `#373737` → `#575757` → `#747474` → `#8e8e8e` → `#ababab`

Adjacent separations are identical to the colour ramp by construction (luminance is the only channel
the ratio reads), so the five steps remain resolvable with hue removed. **The carve-out's
"separately resolvable" test also has a spatial component at a 9px mark** — that is settled by visual
inspection of the rendered grid during implementation, and if any pair fails on sight the step count
reduces per Req 4.8's fallback. That is the branch, and it now has a trigger.

**[v3] Compliance basis, with the disclosure v2 deleted.** The ramp orders marks by **luminance, not
hue**, so the encoding survives colour-vision deficiency and greyscale. **This is a design-practice
argument, not a cited W3C technique** — carve-out condition 2 requires a spec relying on it to say so,
v1 said it, and v2 dropped the paragraph while keeping the claim. Restored. The non-colour channel
(condition 4) is the `<details>` table; the period-relative disclosure (condition 5) is in Req 4.6's
legend copy.

**Tradeoff.** At 1.54:1 a level-0 cell is a pale warm tint, so ~68 zero-days are faintly brand-tinted
rather than blank. Level 0's alpha is very nearly forced: **[v4] 0.27 is the minimum meeting Req 4.3's
≥1.5:1 floor** (0.27 → 1.5217; **0.26 → 1.4966, which fails** — v3 said 0.26 and was wrong), so
"lower the alpha" buys one hundredth of alpha. The tint is not a concession: Req 4.3's stated purpose
is exactly that empty cells be visible, so this is the requirement working as intended.

## Code Reuse Analysis

- **`makeContentYamlLoader`** (`content-yaml-loader.ts:28`) — **[v3]** v2 cited `:35`, which is the
  passthrough comment, not the declaration. Note also that the passthrough branch stops executing for
  this basename once the schema is registered.
- **`content-schema-primitives.ts`**: `isoDate()` (`:68`) plus `BUILD_START_UTC` (`:17`).
- **`content-error-format.ts:304-309`**: error formatting, once the identifier field is registered.
- **[v3] `src/lib/build/check-experience-project-links.ts`** — the established precedent for a
  cross-entry invariant as a standalone module called from `prepare()` (imported at
  `velite.config.ts:20`). `check-github-activity-invariants.ts` follows it exactly. §Code Reuse missed
  this in v2 while finding the axe harness correctly.
- **`src/lib/format-date.ts`**: `formatContentDate`, `formatMonthYear` (`:27`).
- **`e2e/tests/contact-axe.test.ts`**: the parameterised route-level axe harness.
- **[v3] `e2e/tests/profile-resume.test.ts`**: already uses `page.emulateMedia({ media: "print" })`
  (`:346`, `:370`, `:410`, `:458`) with a full print test at `:388`. v2 claimed print emulation was a
  harness the suite lacked. It is not; there is nothing to build.
- **`contributions.test.ts`**: the `vi.hoisted` + `vi.mock("#site/content", …)` pattern.

### Integration points

- **`/contributions` page**: both lookups, both suppression gates, passes `ActivityWindow` as a prop.
- **`ci.yml`**: freshness script and its `node --test` self-test, before `Build`.
  **[v3] Correction**: v2 said inserting steps widens `verify-ci-topology.mjs`'s drift. It does not —
  that script asserts the *existence* and relative order of a fixed list of named steps (`:61-71`,
  `:267`, `:277-278`) with no extra-step check, so two new steps are simply invisible to it. Nothing
  is widened, and Req 10.8's disposition is unaffected.
- **`lighthouserc.js`**: one line; `assertMatrix` derives from `urls.map`. Buys **manual** coverage
  only — `pnpm lhci` is absent from `ci.yml` and `total-byte-weight` is a placeholder (`:22`).
- **[v3] Req 10.6**: the dormant cadence script stays unwired, handed to triage. This design does not
  touch it.
- **Pagefind**: the section carries `data-pagefind-ignore="all"`.

## Architecture

```mermaid
graph TD
    Y["content/github-activity.yaml"] --> L["makeContentYamlLoader<br/>envelope + per-entry schema"]
    L --> P["velite prepare() →<br/>check-github-activity-invariants.ts"]
    P --> V[".velite → #site/content"]
    V --> H["src/lib/github-activity.ts<br/>pure, clock-free"]
    H -->|ActivityWindow \| null| PG["contributions/page.tsx<br/>owns both gates"]
    C["#site/content contributions"] --> PG
    PG -->|props| CH["ContributionHeatmap<br/>server component"]
    CH --> SVG["section → SVG + legend + details"]
    Y -.reads directly.-> S["check-github-activity-freshness.mjs<br/>clock + span arithmetic only"]
    S -.::warning::.-> CI["ci.yml — before Build"]
```

### Why the script reads the YAML and runs before `Build`

`.velite/*.json` collapses a missing file and an empty file into the same `[]`, so Req 9.7's
absent-file warning could not be distinguished from the `[]` warning. Reading
`content/github-activity.yaml` directly with `yaml` (imported by `verify-ci-topology.mjs`) keeps them
distinct. **That reason holds and is the whole justification for the direct read.**

**[v5] The second reason v3/v4 gave for the step's *position* is withdrawn as false.** Those versions
said running before `Build` keeps Req 9.3's impossible-date check reachable, because otherwise the
schema bound would already have failed the build. But §Testing's own v4 correction establishes that
Velite runs at `postinstall` — `ci.yml:26-27`, the **first** step — so the schema bound fires before
any position this script could occupy. **Two of the seven input states are therefore unreachable in CI
at any position**: state 11 (impossible date) and state 7 (zero-byte/`null`), both of which Velite
rejects at install. They remain implemented and unit-tested because the script is also run by hand and
because Req 1.3's bound could later be relaxed, but this design no longer claims CI exercises them.
The step still runs before `Build` for ordering hygiene, not for reachability.

### The script does not re-implement the window arithmetic

The coverage check is a **span** rule — warn when `anchorDate − dataStart + 1 < 182` — so it needs no
`windowEnd`, no Saturday alignment, and no second implementation. **[v3] The bound is exact and there
are no false negatives**: `windowStart = anchorDate + k − 181` for `k ∈ [0,6]` (the anchor's distance
to the following Saturday), so `dataStart > windowStart` ⟺ `span < 182 − k`. Testing `span < 182`
therefore catches every genuinely incomplete file and additionally warns on at most `k` span-values —
maximal at a Sunday anchor, zero at a Saturday. Over-warning only; never silence. Documented in the
authoring doc so the one-in-seven early warning is not read as a bug.

### Modular design

- **Single responsibility**: schema validates, invariants module checks cross-entry rules, helper
  derives, component renders, script reads a clock and does span arithmetic. **[v6]** The invariants
  module exposes one composed entry point, `runGithubActivityInvariants`, so `prepare()` has exactly
  one call and the composition is itself testable.
- **Component isolation**: takes `ActivityWindow`, performs no lookups.
- **Utility modularity**: `deriveWindow`, `bucketLevels`, `toGrid`, `toMonthlyTotals` exported and
  tested; `checkNoDuplicateDates` and `checkCoverageContiguity` live in their own module.

## Components and Interfaces

### `src/lib/build/github-activity-schema.ts`
`githubActivityEntrySchema` — `{ date, count }`, `.strict()`, `isoDate()` composed with a
`BUILD_START_UTC` upper bound.

### `src/lib/build/check-github-activity-invariants.ts`
- **Interface:** `checkNoDuplicateDates(records): void` and `checkCoverageContiguity(records): void` —
  pure, throwing named errors — plus **[v6] `runGithubActivityInvariants(records): void`**, which
  calls both in order and is the single entry point `prepare()` invokes.
- **Wiring:** `velite.config.ts`'s `prepare()` branch calls `runGithubActivityInvariants` only,
  mirroring how `checkExperienceProjectLinks` is imported at `velite.config.ts:20` and called from the
  same hook. **[v6]** v5 introduced this function in §Testing as the whole replacement for the
  withdrawn integration assertions but gave it no home here, in §Project Structure, or in §Modular
  design, while this section still described the abandoned two-direct-calls wiring and
  forward-referenced assertions §Testing had removed. Corrected.
- **Why the composed entry point exists:** it makes the call site itself unit-testable. A test that
  drives `runGithubActivityInvariants` with a duplicate-date array and a gapped array proves both
  checkers are reached, which is the only cheap way to close the "written, unit-tested, never called"
  hole given a fixture-driven Velite run is not available (§Testing).

- **[v6] Error-message shape (Req 1.10's open question, which r4 correctly flagged as unanswered).**
  `requirements.md` Req 1.10 asks the design phase to record whether these cross-entry throws fall
  under the **Shared Build-Time Error-Message Contract**
  (`contributions-and-resources/requirements.md:58`). **Disposition: they do not, and they do not route
  through `content-error-format.ts`.** That module formats per-entry Zod issues and is reached via
  `IDENTIFIER_FIELD_BY_BASENAME`, which serves schema errors only; a cross-entry invariant has no
  offending field, no entry index, and no Zod issue to format. The two throws are therefore plain
  `Error`s with self-contained messages, and their shape is pinned here because it is the entire
  diagnostic surface for the coverage contract:
  - duplicates — `github-activity.yaml: duplicate date <ISO> (appears N times). Each day must appear exactly once.`
  - gap — `github-activity.yaml: coverage gap — no record for <ISO>. The file must contain every day from <dataStart> to <anchorDate>; see docs/contributions-and-resources-authoring.md.`

  Both name the file, the offending date, and the rule, which is what the shared contract exists to
  guarantee even though this is not routed through it.

### `src/lib/github-activity.ts`
`getActivityWindow(): ActivityWindow | null`, plus the four primitives. No `new Date()` with no
arguments, no `Date.now()`.

**[v5] Req 2.8's UTC artifact — mitigations kept, rationale corrected.** v4 justified these with two
claims that are both false. First, a bare `YYYY-MM-DD` **already parses as UTC** under the ECMAScript
date-time-string format (`new Date("2026-08-08")` → `2026-08-08T00:00:00.000Z`, verified in node), so
the described "local-time parse shifts a day" defect cannot occur on the date-only form this data
uses. Second, the page is `force-static` with zero client JS, so it is prerendered once on a UTC
runner — a visitor's timezone cannot affect the rendered grid at all, which makes "visible only to a
visitor in a non-UTC zone" impossible by construction.

The mitigations are still worth having, for the residual risk they actually address: a future refactor
introducing a *component-wise* construction (`new Date(y, m, d)`, or `.getDate()` / `.getMonth()` on a
parsed value) **is** local-time and would misalign columns. So: all date arithmetic goes through
`Date.UTC(...)` on split parts and the `getUTC*` accessors, never the local-time forms; and
`github-activity.test.ts` runs under **two** pinned zones so such a regression fails the suite rather
than shipping. `src/lib/format-date-tz.test.ts` is the precedent for pinning `TZ` here.

**[v7] Two zones, because a single pin is directional and misses half the problem.** Verified
empirically:

| | `TZ=America/Edmonton` (UTC−6) | `TZ=Europe/Berlin` (UTC+2) |
|---|---|---|
| `new Date(2026,7,8)` → ISO | `2026-08-08` — **not caught** | `2026-08-07` — **caught** |
| `new Date("2026-08-08").getDate()` | `7` — **caught** | `8` — **not caught** |

v5–v6 pinned only Edmonton while naming the component-wise construction as the *first* regression to
guard — the one Edmonton cannot see. The suite therefore runs both zones.

**[v9] How both zones run**, which r7 flagged as unspecified. Vitest reads `process.env.TZ` at worker
start, so a single run cannot hold two zones. `github-activity.test.ts` therefore uses a
`describe.each(["America/Edmonton", "Europe/Berlin"])` block whose setup asserts
`process.env.TZ === zone` and skips with a named message if the runner has not been configured for it,
plus a `test:tz` script in `package.json` that invokes vitest twice with `TZ` set. CI runs `test:tz`
alongside the normal suite. The assert-and-skip guard is what stops the zone coverage silently
evaporating if someone runs plain `pnpm test`.

### `src/components/contributions/contribution-heatmap.tsx`
- `ContributionHeatmap({ window }: { window: ActivityWindow })` — props-driven, never called with `null`.
- **Renders:** `<section aria-labelledby>` (no card wrapper — §Design System) → `<h2>` → summary +
  freshness line → the
  `rel="noopener"` same-tab link to `https://github.com/madmatt112` (Req 7.2) → `<svg>` with month
  labels → legend → `<details>` table.
- **[v3] Legend specified**: five swatches at the same 9px size and `rx="2"` as the grid marks, in
  ascending level order, flanked by "Less" and "More" at `text-xs`. It renders **only the levels in
  `levelsPresent`** (Req 4.6), and when that is a strict subset it carries the period-relative
  disclosure.
- **[v9] The legend is its own inline `<svg>`, not HTML swatches.** Its markup was never specified,
  and the natural HTML reading — five `<span>`s with `background-color` — collapses the whole legend
  to invisible boxes under `forced-colors: active`, because `background-color` is forced while SVG
  `fill-opacity` is not. As `<rect>` elements it inherits the same fill and forced-colors treatment as
  the grid, including the zero-state outline, so legend and grid cannot disagree about what a level
  looks like.
- **[v9] Strokes — one statement of the rule.** None in the **normal** rendering, grid or legend. The
  **forced-colors fallback** adds a 1px outline on the zero state, in both (§Accessibility). v7 scoped
  this in §Geometry and left an absolute "no strokes anywhere" claim standing here — the exact
  secondary-restatement pattern r7 named. This bullet is now the only place the rule is stated.

### `scripts/check-github-activity-freshness.mjs`
- **[v3] Test seam**: the module exports a pure `evaluate(fileContents | null, nowMs)` returning an
  ordered list of warning strings; the CLI wrapper reads the file, calls it, prints, and **always
  exits 0**. This mirrors `check-authoring-docs.mjs:102`'s exported-checker pattern and is what makes
  the mandated test writable — v2 pinned an interface its own test plan could not target.
- **[v3] Evaluation order and stacking**: states are evaluated in the order below and **all applicable
  warnings are emitted** (they stack; there is no early return), except that the three file-level
  states are terminal because no dates exist to check.
- **[v9] Output format** (Req 9.6): each warning is a **bare `::warning::<message>` line on stdout**,
  one per applicable state — no `file=`/`line=` parameters, since there is no source position to point
  at. This matches the convention in `scripts/check-vercel-auto-deploy.mjs` and
  `scripts/warn-no-pagefind.mjs`. A rewrite dropped this bullet; r7 caught that `::warning::` survived
  in the document only as a mermaid edge label.
- **[v9] Reuses** `yaml`, already imported by `scripts/verify-ci-topology.mjs`.

## Data Models

```
DayRecord   date: string (ISO 8601, <= BUILD_START_UTC)   count: integer >= 0

Cell        date, count, level (0-4), hasData: boolean
MonthTotal  month "YYYY-MM", total, activeDays, isClipped, rangeStart, rangeEnd

ActivityWindow
  anchorDate, dataStart                    string
  windowStart, windowEnd                   string   # internal geometry, never published
  publishedRangeStart, publishedRangeEnd   string   # the only visitor-facing period
  grid                                     Cell[26][7]
  totalContributions, activeDays           number
  levelsPresent                            Set<0|1|2|3|4>
  monthlyTotals                            MonthTotal[]
  thresholds                               { p25, p50, p75 } | null
```

## Geometry

26 columns × 7 rows. Pitch **11px** = 9px mark + 2px gap (Req 3.6's `mark + gap ≤ 11px`). Grid width
26 × 11 = **286px**; the 288px content box at 320px (`page.tsx:24`'s `px-4`) leaves 4px of true slack
since 286 includes the trailing gap. No strokes **in the normal rendering** (the forced-colors
fallback adds one — §Accessibility), so no half-stroke inset and no viewBox clipping.
Marks use `rx="2"`.

**[v9] The `<svg>` element is `width="288" height="100"` with `viewBox="-1 -1 288 100"`** — stated
because eight versions never sized the element, leaving three defensible readings (286 × 98, 288 × 100,
or `width:100%`, which breaches Req 3.6). One-to-one units, no scaling, marks render at exactly 9px.
The 288 × 100 outer box is the 286 × 98 content plus the 1px viewBox margin on each side, and 288px
fits the 288px content box at a 320px viewport exactly.

**Content height is 98px.** The month-label band must hold `text-xs` (0.75rem = 12px), the
smallest named step in `visual-design/design.md`'s type scale — arbitrary sizes are forbidden. Band
**17px** (12 × 1.4 = 16.8, rounded up) + 4px gap + 77px grid = **98px**. v3 said 18px and 99px, which
did not follow from its own arithmetic.

**[v4] `line-height` does not lay out SVG text.** SVG `<text>` positions on an explicit baseline, so
the band height above is a reserved-space figure only; each label sets `y` explicitly (baseline at
13px within the band) and `dominant-baseline` is not relied on for cross-browser consistency.

**Month labels** use a third `format-date.ts` export, `formatMonthAbbrev` — `formatMonthYear` (`:27`)
returns "August 2026", unusable at an 11px column pitch, and slicing a localised string is fragile.

**[v5] The label's typography and anchoring are pinned**, because v4 specified a band height without
specifying what goes in it — which left the 286px ink claim, the column-anchoring rule, and the
SC 1.4.12 argument mutually inconsistent:

- `text-anchor="start"`, `x` set to the left edge of the column containing that month's first covered
  day, so a three-glyph label extends *rightwards* over the following columns rather than centring
  and overhanging leftwards at the leading edge.
- Face and size: the sans stack at `text-xs` (12px), `letter-spacing: normal`, matching the meta/caption
  role rather than the mono kicker.
- The **final** month's label is right-anchored (`text-anchor="end"` at the grid's right edge) when
  a start-anchored label would exceed 286px. These two rules together are what make the "ink never
  exceeds 286px" guarantee true rather than assumed.
- Collision: when two labels would overlap, the later one is dropped (months are ~4.3 columns apart at
  this pitch, so this is reachable only for a short published range).

**[v5] SC 1.4.12 correction**: `letter-spacing` and `word-spacing` **do** apply to SVG `<text>`, so v4's
claim that spacing overrides cannot reach the labels was wrong. What holds is narrower and sufficient:
the labels are three glyphs on an explicit baseline with no line-box participation, so a spacing
override widens them slightly and cannot wrap, clip, or vertically displace them. The right-anchor
rule above absorbs the extra width at the only edge where it could overflow.

Weekday row labels are out of scope: 20–25px of a budget with 4px of slack.

The wrapper carries `overflow-x: auto` as a pure CSS net with **no `tabindex`** — at the pinned pitch
nothing scrolls, so a focusable inert region would be a keyboard cost with no benefit. **[v3] The
guarantee is stated over the SVG's full rendered extent** — grid *and* label band — not over any
single column. **[v7]** The mechanism is the anchoring rule above (first label `text-anchor="start"`
at its column's left edge, last label `text-anchor="end"` at the grid's right edge when a
start-anchored label would exceed 286px), **not** an inset. v5 wrote "inset" here while specifying
flush anchoring 20 lines earlier — two incompatible mechanisms, and r5 flagged it. One mechanism now:
anchoring.

## Error Handling

### Build-time (hard failures)
1. Malformed YAML / unknown key / bad type — loader + `.strict()`.
2. Future-dated `date` — schema refinement against `BUILD_START_UTC`.
3. Duplicate `date` — `checkNoDuplicateDates`, naming the date.
4. Gap inside the covered range — `checkCoverageContiguity`, naming the first missing date.
5. Zero-byte / `null` payload — the loader's envelope error.

### CI warnings — **[v3] seven input states**, never blocking, always exit 0

| # | State | Terminal? |
|---|---|---|
| 6 | File absent | yes |
| 7 | **[v3] File zero-byte or `null`** — v2's "exhaustive" list filed this only under build-time failure 5, which runs *after* the script; unhandled, the script would throw and exit non-zero, turning a Req 9.5 soft failure into a red build at a step contracted to always exit 0 | yes |
| 8 | File present but `[]` | yes |
| 9 | All counts zero | no |
| 10 | Stale (>45 days) | no |
| 11 | Impossible (`anchorDate` ahead of the build clock) | no |
| 12 | Incomplete coverage (span < 182) | no |

States 9–12 stack; each emits a distinct message naming the state.

### Render-time
13. `getActivityWindow()` returns `null` — section omitted entirely.
14. Contributions collection empty — section omitted (Req 3.9).
15. Partial coverage — published range shrinks; cells without `hasData` render as no element at all.
16. Degenerate distribution — `thresholds` null, non-zero days collapse to level 2, legend renders only
    `levelsPresent` with the period-relative disclosure.

## Accessibility

- **`role="img"` + one `aria-label`** naming the published range, total, and active days, derived from
  `ActivityWindow`. Cells are not focusable, not tree nodes, no `<title>`.
- **Text equivalent** — `<details>` with the monthly table (month, total, active days; clipped rows
  carry their covered range). Does not restate the headline figures.
- **`forced-colors: active`** — `fill: var(--brand)` plus a separate `fill-opacity`, never baked alpha.
  **[v3] The result is computed here rather than deferred to a screenshot.** Under the standard
  black-on-white high-contrast theme, `CanvasText` at the five opacities over `Canvas` gives
  **1.99 / 3.70 / 7.25 / 13.59 / 21.00** against `Canvas`, adjacent separations
  **1.86 / 1.95 / 1.87 / 1.54** — all five steps distinguishable, comfortably above 1.3. The pass
  criterion is therefore met analytically; the screenshot from Edge on the WSL2 Windows host confirms
  rendering. Retaining opacity deliberately shows sub-maximal contrast to users who requested maximum
  contrast; justified because the ramp carries information flattening would destroy, and the table is
  the full-contrast route to the same data.
  **[v7] The fallback resolves three states using an outline, as Req 5.6 literally requires.** If the
  ramp does not survive: **no-data** renders as no element at all (it already does — Req 3.5),
  **zero** renders as an unfilled mark with a 1px `outline` in `CanvasText`, and **non-zero** renders
  as a filled `CanvasText` mark. Outline is a forced-property channel, which is exactly what the
  criterion names.

  **This reverses v4–v6's size channel, and the reason those versions gave was wrong.** They claimed a
  stroke would clip at the viewBox edges. **[v8]** It *would* have clipped at the left edge under the
  implicit zero-margin viewBox — r7 was right about that and v7's "4px slack" answer was wrong — but
  the zero-margin viewBox was itself a consequence of assuming no stroke, not a constraint against
  one. Giving the viewBox a 1px margin (below) costs 2px of a 288px box and removes the clipping
  entirely. With the obstacle gone, the deviation had nothing left holding it up —
  and amending an approved requirement to avoid a change that fits comfortably is the wrong trade. The
  requested Req 5.6 amendment is **withdrawn**; no requirements change is needed.

  Two consequences, both cheap: §Geometry's "no strokes anywhere" rule is now scoped to the **normal**
  rendering (where it still holds, and still means no half-stroke inset), and the forced-colors block
  gains a `outline: 1px solid CanvasText` on the zero state. The outline is drawn outside the fill box
  **[v8] and the `viewBox` carries a 1px margin on all four sides to accommodate it.** v7 said "the 4px
slack absorbs it at both edges", which is false: that 4px is 2px of trailing viewBox on the right plus
2px of page-layout margin *outside* the `<svg>`, so there is **0px at the left**, where a 1px outline
on the first column paints at x ∈ [−1, 0] and clips. The document had also never stated a `viewBox` at
all. Pinned now: **`viewBox="-1 -1 288 100"`** — the 286 × 98 content plus 1px on each side. The
rendered width becomes 288px, which still fits the 288px content box exactly, and the outline is
clipped nowhere. The withdrawal of the size channel stands; only v7's arithmetic for it was wrong.
- **[v3] `prefers-reduced-motion`** (Req 5.8) — the heatmap has no animation, no transition, and no
  hover motion, so the query is satisfied by construction; if hover styling is added later it must be
  non-motion.
- **SC 1.4.10** — the grid is fixed-size SVG in a reflowing column and fits 320px at 400% zoom;
  vertical scrolling is permitted. The `<details>` table is a **data table**, which 1.4.10 exempts from
  the no-two-dimensional-scrolling rule; invoked deliberately.
- **SC 1.4.12 (Text Spacing)** — argued rather than asserted. It reaches the `<h2>`, summary, freshness
  line, legend endpoints, and table copy, all HTML that reflows normally under spacing overrides.
  **[v5]** It also reaches the SVG month labels — `letter-spacing` and `word-spacing` *do* apply to
  SVG `<text>`, contrary to v4 — but they cannot wrap, clip, or vertically displace there, because the
  labels are three glyphs on an explicit baseline outside CSS line-box layout, and §Geometry's
  right-anchor rule absorbs the extra width at the only edge that could overflow. No content is lost
  in either case.
- **Print** — `@media print` hides the `<svg>` and legend, keeps heading, summary, freshness line, and
  table, `<details>` forced open. `print.css` reaches this route via `globals.css:41`; `:53-58` sets
  the surfaces white and `:61-66` re-bases `--brand`.

## Testing Strategy

### Unit
**`github-activity.test.ts`** — `vi.hoisted` + `vi.mock("#site/content", …)`, inline factory. One case
per anchor weekday (all seven) for the last `hasData` cell and `publishedRangeEnd ≤ anchorDate`;
partial coverage; the empty-band case (`S = [1,1,1,1,2,3,4,10]` → p25 1.0 / p50 1.5 / p75 3.25, so
`1 < c ≤ 1.5` holds no integer, `levelsPresent` = `{0,1,3,4}`, legend omits level 2); bucket
boundaries; all four degenerate paths; `monthlyTotals` with clipped first, clipped last, whole middle,
and a **non-clipped first month** (`2026-02-01`, `2026-03-01` are Sundays); empty collection; single
record; all-zero; out-of-window exclusion; a 52-week file with a 26-week window; grid always 26 × 7.

**`github-activity-schema.test.ts`** — valid; negative count; non-integer; bad format; impossible
date; future date; unknown key.

**[v3] `check-github-activity-invariants.test.ts`** — pure-function tests for duplicates and for
contiguity (single gap, leading gap, trailing gap, empty array, single record).

**`check-github-activity-freshness.test.mjs`** (`node --test`) — `evaluate()` against **seven** input
states, plus stacking (a file that is simultaneously stale and under-covering emits both), plus the
always-exit-0 contract.

### Integration
**[v5] The two build-driven assertions are withdrawn, and the wiring gap they were meant to close is
covered a different way.** This is the third round to catch the same defect (r2 named the harness gap;
r3 caught the wrong command; r4 caught that the prescribed assertions were unwritable by the mechanism
the same paragraph ruled out), so the honest resolution is to stop prescribing something the repo
cannot run. The facts that force it: `package.json:8` is `"build": "next build"`, Velite is invoked
only by `"postinstall": "velite build"` (`:21`), and `velite.config.ts:476` pins `root: "content"` —
so a fixture-driven Velite run needs a config override or a subprocess with a swapped content root,
and neither has precedent here.

Replaced by two things that are writable today:

- **A wiring unit test.** The `prepare()` body is extracted as an exported
  `runGithubActivityInvariants(records)` that calls both checkers; the test asserts a duplicate-date
  array and a gapped array each throw through it. This closes the exact hole — `checkCoverageContiguity`
  written, unit-tested, and never called — because the function under test *is* the call site.
- **The real install.** Every CI run executes `velite build` against the real content file at
  `ci.yml:26-27`. **[v6] What that does and does not catch, stated precisely** — v5 claimed "a
  registration that is missing or misregistered fails immediately", which is false for the one
  registration that matters most and contradicted §Commit sequencing item 1. A **missing loader-map
  entry fails nothing**: `content-yaml-loader.ts` passes the basename straight through, Velite is
  non-strict, and the build goes green with the collection unvalidated. What the real install does
  catch is a *malformed* file once the entry exists, and a collection or schema wiring error that
  throws. The missing-entry case is covered by §Commit sequencing's ordering rule, not by CI.

No integration test file is introduced, and the document no longer names an assertion it cannot site.

### End-to-end
**This is a new spec file, not an extension** — no `/contributions` e2e spec exists; only
`navigation.test.ts:34` iterates the route.
- **`contact-axe.test.ts`** — add `/contributions` to the existing `PAGES` union and array.
- **`contributions-heatmap.test.ts`** (new) — grid renders below the cards in both themes; no
  horizontal `<body>` overflow at 320/768/1280; the published period in the copy matches the
  `aria-label` and neither extends past `anchorDate`; `<details>` opens and its month rows sum to the
  summary total; print emulation via `page.emulateMedia({ media: "print" })` hides the `<svg>` and
  shows the table.

### **[v3] What is not gated**
Every enforcement mechanism named for the accessibility and performance contracts is developer-run:
**Playwright does not run in `ci.yml`** (stated at `profile-resume.test.ts:32-34`), `pnpm lhci` is
absent from `ci.yml`, and **nothing in the repository measures the ramp**. The worst adjacent pair has
0.09 of margin (**[v5]** corrected from 0.07, which was the abandoned `--card` figure), and `--muted-foreground` and `--destructive` have already been retuned once
(`tokens.css:21-25`, `:28-30`) — so a future contrast fix to `--brand` or `--card` could drop a pair
below 1.3:1 with no gate noticing. v2 recorded this caveat for Lighthouse and withheld it for
Playwright. Recorded now for both; a ramp-measurement unit test is the cheapest mitigation and is
listed below.

## Non-Functional Requirements

**[v4] This section was present in v2 and dropped by v3's rewrite** — the fourth instance of the
delete-rather-than-correct regression the reviews keep catching. Restored, with the measurement the
NFR assigns to the design phase actually taken.

- **Zero client JavaScript, zero network requests** added at build or request time.
- **DOM cost — measured.** Current `/contributions` built HTML is **135 elements** with one
  contribution card. **[v6]** The content PR adds **four** more cards at ~11 elements each → ~179 —
  v5 said three, but `content/contributions.yaml` holds one entry today and the `[decided 2026-08-09]`
  scope ships four *new* ones. This feature
  adds ~182 rects + ~7 month labels + 5 legend swatches + a `<details>` table (~7 rows × 3 cells plus
  head) + ~12 wrapper and copy elements ≈ **~235**, projecting **~414 elements** total. Lighthouse's
  `dom-size` warns above 800 and has been a weight-0 diagnostic since Lighthouse 10, so this lands at
  roughly half the warning threshold with no score impact.
- **Lighthouse ≥90** across all four categories on `/contributions`, verified manually per Req 10.4 —
  see §"What is not gated" for why "verified" means "by a person, once".
- **Security**: no credential in the deployed application, the build, or `.env.example`; no
  third-party origin in the render path; no CSP relaxation; no user input rendered.
- **Reliability**: the site builds and renders correctly with the data file absent, empty, all-zero,
  partially covering the frame, or arbitrarily stale — each outcome documented in §Error Handling. No
  build path in any environment depends on network reachability of GitHub or any third party.
- **[v9] Usability**: legible in both themes at every named breakpoint and in print (§Accessibility);
  the published range, totals and freshness date are readable as text without interpreting the
  graphic — including in print, where the graphic is hidden and the text is not; the legend is
  present, labelled, and truthful about the levels actually in use; and the graphic never claims a
  period it has no data for, at either edge. Reqs 4.6 and 4.12 cite this NFR by name as their
  justification, and it had no bullet until now.
- **Maintainability**: levels are computed locally, giving reproducibility from the committed file —
  same file, same grid. The encoding is *not* stable across refreshes and Req 4.6 discloses when that
  shows. Coverage is decidable from the file alone (Req 1.10).

## Commit sequencing

**[v4] New section.** A sequencing lens on r3 found a forced ordering no prior version stated, and it
is the kind that fails silently rather than loudly.

1. **The loader-map entry must land in the same commit as — or before — `content/github-activity.yaml`.**
   `content-yaml-loader.ts:36-38` passes any unregistered basename straight through, and Velite is
   non-strict, so a data file committed ahead of its registration ships **with no validation at all**
   and a green build. Nothing warns.
2. **Both ESLint edits in one commit** (`importNames` + allowlist), else `pnpm lint` fails at
   `ci.yml:29`, the first gate.
3. **Authoring-doc heading and its `CANONICAL_HEADINGS` registration in one commit** — registered
   without added fails CI; added without registered passes silently (see §Project Structure).
4. **[v6] The `.prettierignore` entry must land with or before
   `scripts/__fixtures__/github-activity/seed-52w.json`**, or `pnpm format:check` reddens at
   `ci.yml:38-39` on a raw payload that must stay byte-identical. v5 added the artifact and left
   "everything else is order-free" standing, which its own new entry falsified.
5. Everything else is order-free.

**Revert is clean.** No paired-merge gate is engaged by this change set —
`verify-paired-merge.mjs` tracks four unrelated files and `verify-content-canary-regex-pair.mjs`
tracks the chokepoint canary, which this design deliberately does not touch. A single revert restores
a consistent state.

**What a reviewer cannot verify from the diff alone**: the rendered ramp's spatial resolvability at
9px, the forced-colors behaviour, and the Lighthouse figures. Those need the artifacts named in
§Design System and §Testing, which is why they are deliverables rather than assertions.

## Required code comments

**[v6] New section, closing r4's maintenance-lens finding.** This repo records *why* at the point of
decision — `tokens.css:21-24` and `:28-29`, `print.css:48-50`, `content-yaml-loader.ts:23-26`,
`lighthouserc.js:1-22`, `.prettierignore:17-19`, `profile-resume.test.ts:16-34`. Prior versions of
this design mandated no comment anywhere, leaving three decisions whose reasons existed only in
`.spec-workflow/` — which is `.prettierignore`d, not loaded by default, and not where someone editing
`contributions.css` looks. Each reads as a bug to a future contributor, and "fixing" it breaks a
requirement:

| Decision | Comment must record | What happens if silently "fixed" |
|---|---|---|
| `overflow-x: auto` with **no** `tabindex` (`contributions.css`) | the pitch guarantees no scroll, so a focusable inert region would be a keyboard cost with no benefit (Req 3.6) | reinstates the exact affordance Req 3.6 removes |
| Level 0's deliberate tint at alpha **0.27+** (`contributions.css`) | Req 4.3's ≥1.5:1 floor makes empty cells visible on purpose; 0.26 measures 1.4966 and fails | lowering the alpha silently breaches Req 4.3 |
| **[v8]** `TZ` pinned to **both** `America/Edmonton` and `Europe/Berlin` (`github-activity.test.ts`) | the zones are complementary, not redundant — Berlin catches `new Date(y, m, d)`, Edmonton catches `new Date("…").getDate()`; bare `YYYY-MM-DD` is already UTC | dropping **either** zone silently stops catching one of the two regressions |

## Deferred to implementation

- Exact copy strings for the summary, freshness line, period-relative disclosure, and clipped-row
  labels. **[v3]** Per Req 7.2 none of them may assert a fixed "26 weeks" — the published range is
  176–182 days when coverage is complete and shorter when it is not.
- Month-label collision behaviour at 286px when two labels compete for adjacent columns.
- **[v3] Candidate**: a unit test asserting the five composited ratios and four adjacent separations
  against the gate floors, so a token retune fails a test rather than shipping. Not required by any
  requirement; the cheapest answer to the un-gated risk above.

**Req 8.3 is resolved here**, and Req 8.3 requires all four answers — path, format, lint-visibility,
type-checked. **[v4] v3 answered three and dropped lint-visibility**, which v2 had carried; that is the
third time a criticised sentence was deleted rather than corrected, so it is restored explicitly:

- **Path**: `scripts/__fixtures__/github-activity/seed-52w.json`, following the per-script
  fixture-directory convention (`scripts/__fixtures__/` holds seven such directories).
- **Format**: the raw unmodified 52-week API payload, JSON.
- **Type-checked**: **no** — because it is JSON, not because of its location. `tsconfig.json`'s
  `include` is `**/*.ts` repo-wide, so v2's "outside the TS project's `src` root" was wrong.
- **Lint-visible**: **no** — ESLint is configured for TS/TSX sources and this is a JSON data file with
  no lint rules applying to it; it needs no ESLint ignore or allowlist entry.
- **[v5] Prettier-visible: yes, and that needs an action.** `.prettierignore` covers neither
  `scripts/` nor JSON, so `pnpm format:check` would reformat-check a raw upstream payload and fail on
  it. **A `/scripts/__fixtures__/github-activity/` entry is added to `.prettierignore`** — the same
  treatment the chokepoint canary fixtures already get there, and for the same reason: the file's
  value is that it is byte-identical to what the API returned, so reformatting destroys the thing it
  exists to prove. Added to the §Project Structure inventory.

It is an audit artifact proving this spec's quoted figures, not a test input; Req 2.10's tests use an
inline factory.

Deferral `d-db7c55e9` records that this spec licenses one sequential ramp for one graphic and does not
resolve the project's open data-viz palette decision (Req 4.11).

## Revision history

### v9 — dispositions of adversarial review r8, and the final version of this document

r8 returned `iterate` (2 MUST_FIX / 3 SHOULD_FIX / 6 MINOR) and escalated a process question rather
than a design one: whether v9 should be a grep-verified punch-list followed by handover, or another
review round. **Decision: punch-list and hand over.** This is the loop's v9 cap, every remaining
finding was mechanical, and r8 confirmed the engineering substance clean for the fourth consecutive
round — ramp, geometry, coverage, error handling and testing, plus independent recomputation of the
forced-colors figures, the empty-band quartiles, and ~45 citations.

Every item below was grep-verified after editing, not asserted.

| Finding | Severity | Disposition |
|---|---|---|
| The `viewBox` delta contradicted §Geometry and left the element unsized — `:461` still said 98px against a 100-unit viewBox, and eight versions never stated `width`/`height`, leaving three defensible readings | MUST_FIX | **Closed.** `width="288" height="100" viewBox="-1 -1 288 100"`, one-to-one units, with the 98px figure relabelled as content height. |
| The v8 disposition table ended with a catch-all row that was false for six of the remaining r7 items, and broke the no-catch-all rule written five rows below it | MUST_FIX | **Closed.** All six genuinely addressed: the two-zone `TZ` mechanism (`describe.each` + `test:tz` + assert-and-skip guard), Req 1.11's `JSON.parse` half, Req 9.6's bare-`::warning::` format, the legend's forced-colors behaviour, and both citation drifts. The false row is retained and annotated rather than deleted. |
| `:423`'s "no strokes anywhere including the legend" was still absolute — the exact site r7 named — and underneath it the legend's markup was unspecified, so the natural HTML reading collapses it under `forced-colors` | SHOULD_FIX | **Closed.** Legend is its own inline `<svg>` of `<rect>`s, inheriting the grid's fill and forced-colors treatment; the stroke rule is now stated in exactly one place. |
| The coverage table failed four more ways — the NFR-Usability row v8 added pointed at a section lacking the word; 4.7/4.10/4.11/4.12 misrouted; 9.1–9.8 and 1.11 over-claimed; and 8.4, 8.5, NFR Single Responsibility and NFR No-new-runtime-dependency had no rows | SHOULD_FIX | **Closed.** Rows split to the section that actually covers each, four rows added, and a Usability bullet written in §NFR so its row resolves. |
| Remaining MINOR items | MINOR | Citation drifts corrected; the rest are wording in sections rewritten above. |

**Handover note.** Nine versions, eight adversarial rounds, every finding accepted. The finding curve
— 13, 20, 13, 11, 7, 10, 12, 11 — flattened rather than reaching zero, and from r6 onward the findings
were overwhelmingly defects introduced by the previous round's own edits rather than defects in the
design. That is the signal that this document has reached the useful limit of the review loop. It is
ready for the tasks phase.


### v8 — dispositions of adversarial review r7 (`VERDICT: iterate`, 2 MUST_FIX / 4 SHOULD_FIX / 6 MINOR, `ESCALATE: none`)

r7 named the recurring pattern precisely: **the primary edit site gets fixed and the secondary site
restating the same rule does not** — three instances in v7 alone. v8's method was to grep every
restatement of each rule *before* editing it. All findings mechanical; none needed a decision.

| Finding | Severity | Disposition |
|---|---|---|
| The new §Requirement coverage table — the artifact built to end six rounds of coverage failure — is wrong in four places: row 1.7 points at a section with no network statement, row 1.8 at a colour section (and `contributionLevel` appears nowhere in the document), row 11.1–11.13 covers 11.13 which lives in §Commit sequencing, and **NFR-Usability has no row at all** despite Reqs 4.6 and 4.12 citing it by name | MUST_FIX | **Accepted.** Reqs 1.7 and 1.8 now have real body text in §Technical Standards; the 11.13 row is split out and repointed; NFR-Usability has a row. |
| §Required code comments still mandated the single-zone Edmonton pin with the rationale v7 disproved 300 lines earlier — it would have written a false comment into shipped source | MUST_FIX | **Accepted.** Both zones, with which zone catches which regression stated in the comment. |
| The outline fallback's "4px slack absorbs it at both edges" is false — that 4px is trailing viewBox plus page margin outside the `<svg>`; there is 0px at the left, and no `viewBox` was ever stated | SHOULD_FIX | **Accepted.** `viewBox="-1 -1 288 100"` pinned; rendered width 288px, fits exactly, nothing clips. The withdrawal of the size channel stands; only the arithmetic was wrong. |
| v7's NFR-Naming bullet ("activity everywhere — CSS prefix, component props") contradicts Req 4.10's `.contrib-heatmap__*` and Req 3.1's `ContributionHeatmap`, both implemented in this same document | SHOULD_FIX | **Accepted.** Scoped to names that are free to choose; the two requirement-fixed names are called out as deliberate exceptions. |
| Remaining r7 items | — | **[v9] This row was false when written.** Six of them were not restatements and were untouched: the two-zone `TZ` mechanism, the `JSON.parse` half of Req 1.11, Req 9.6's output format, the legend's forced-colors behaviour, and two citation drifts. All are closed in v9. The row is retained rather than deleted so the failure is visible in the history. |


### v7 — dispositions of adversarial review r6 (`VERDICT: iterate`, 2 MUST_FIX / 2 SHOULD_FIX / 6 MINOR, `ESCALATE: yes`)

Every r6 finding gets a row. No catch-all, and nothing is claimed without a grep-verified anchor —
that discipline failed in v3, v4, v5 and v6, which is why r6's finding count rose.

| Finding | Severity | Disposition |
|---|---|---|
| r5's S2 unfixed in the body and absent from the v6 table — `:402` said labels are **inset** while `:380-387` specified flush anchoring | MUST_FIX | **Accepted.** One mechanism now: anchoring. The "inset" sentence is replaced. |
| The v6 table stated the no-catch-all rule and broke it by silence — six r5 findings and six r4 items unrowed; **r4 MINOR 8 alone was eight requirements with no design artifact** | MUST_FIX | **Accepted.** All eight now have body text (Reqs 1.2, 1.6, 4.4, 4.5, 6.2, 8.1, 11.14, NFR-Naming), each grep-verified, plus a new **§Requirement coverage** table so the next check is a lookup. |
| The `TZ` pin is directional and cannot catch the regression it names first | SHOULD_FIX | **Accepted.** Verified empirically: Edmonton catches the parsed-`.getDate()` form and misses the component-wise form; Berlin is the reverse. The suite now runs **both** zones, with the table showing which catches what. |
| The Req 5.6 deviation fails on both halves — the clipping reason is circular, and the amendment is parked on a discharged sequencing item | SHOULD_FIX | **Accepted, and the deviation is withdrawn entirely.** The fallback now uses an **outline**, exactly as Req 5.6 requires. The clipping argument was wrong — §Geometry has 4px of slack and an outline is 1px, and the zero-margin viewBox was a consequence of assuming no stroke, not a constraint against one. **No requirements amendment is needed**; the request is cancelled. §Geometry's no-strokes rule is rescoped to the normal rendering. |
| r5 MINOR 2–6 and the remaining r4 items | MINOR | Folded where they belong: citation ranges corrected in v6; the rest are wording in sections rewritten above. **This row names what it covers rather than gesturing at "remaining items".** |


### v6 — dispositions of adversarial review r5 (`VERDICT: iterate`, 2 MUST_FIX / 5 SHOULD_FIX / 6 MINOR, `ESCALATE: none`)

All findings accepted. Targeted edits again, not a rewrite.

| Finding | Severity | Disposition |
|---|---|---|
| **v5's catch-all disposition row was false** — it claimed r4's remaining 6 SHOULD_FIX and 8 MINOR were "folded into the sections above"; ten of eleven were not in the body. Second consecutive round the catch-all row was untrue | MUST_FIX | **Accepted, and the practice is abandoned.** r4's S4, S5, S6 are now genuinely addressed (§Required code comments, the Req 1.10 message shape, the Req 5.6 declared deviation); the v5 row is corrected to say what it actually did. **No future entry uses a catch-all row** — each finding gets a named disposition or is explicitly declined with a reason. |
| **`runGithubActivityInvariants` had no home** — introduced in §Testing as the whole replacement for the withdrawn assertions, absent from §Project Structure, §Components and §Modular design, while §Components still described the abandoned two-direct-calls wiring and forward-referenced removed assertions | MUST_FIX | **Accepted.** Given a home in all three places; §Components rewritten to the composed entry point. |
| §Testing's "a registration that is missing or misregistered fails immediately" is false for the loader-map entry and contradicts §Commit sequencing item 1 | SHOULD_FIX | **Accepted.** Restated precisely: a missing loader-map entry fails nothing; ordering covers it, not CI. |
| "Everything else is order-free" falsified by v5's own `.prettierignore` artifact | SHOULD_FIX | **Accepted.** Added as sequencing item 4. |
| DOM projection used +3 cards; the decided content scope is +4 | SHOULD_FIX | **Accepted.** ~414, not ~403. |
| r4 S4 — every non-obvious decision's reason lives only in the spec, against this repo's convention | SHOULD_FIX | **Accepted.** New §Required code comments with the three at-risk decisions. |
| r4 S5 — Req 1.10's error-message-contract question unanswered | SHOULD_FIX | **Accepted.** Disposition recorded (not routed through `content-error-format.ts`, with reasons) and both message shapes pinned. |
| r4 S6 — Req 5.6's fallback channel overridden unilaterally | SHOULD_FIX | **Accepted.** Deviation now declared, with an amendment requested rather than a silent exception. |
| r4 MINOR 1 — citation drift into the amended document | MINOR | **Accepted.** Gate table is `visual-design/design.md:251-255`; carve-out `:258-262`. |


### v5 — dispositions of adversarial review r4 (`VERDICT: iterate`, 5 MUST_FIX / 6 SHOULD_FIX / 8 MINOR, `ESCALATE: none`)

All findings accepted. **v5 was made as targeted edits rather than a rewrite** — the two wholesale
rewrites (v3, and v2's restructure) each silently dropped content that a later round had to restore,
which is the delete-rather-than-correct pattern the memory file tracks.

| Finding | Severity | Disposition |
|---|---|---|
| §Components and the mermaid diagram still specified the card wrapper v4 exists to reverse | MUST_FIX | **Accepted.** Both corrected; this was a disposition-vs-body mismatch of exactly the kind the review protocol checks for. |
| The freshness step's ordering rationale is false — Velite runs at `postinstall` (`ci.yml:26-27`, step one), so states 7 and 11 are unreachable in CI at any position | MUST_FIX | **Accepted.** Second rationale withdrawn; the direct-read reason (absent vs `[]`) stands; the two unreachable states are named as hand-run/future-proofing only. |
| The two integration assertions are unwritable by the mechanism the same paragraph rules out — third round on this hole | MUST_FIX, Recurring | **Accepted.** Assertions withdrawn; replaced by an exported `runGithubActivityInvariants` whose unit test *is* the call site, plus the real `velite build` at install. |
| The Req 8.3 fixture fails `pnpm format:check` — `.prettierignore` covers neither `scripts/` nor JSON | MUST_FIX | **Accepted.** `.prettierignore` entry added and inventoried; the payload must stay byte-identical. |
| Req 2.8's rationale is false in both halves — bare `YYYY-MM-DD` already parses as UTC, and `force-static` means a visitor's TZ cannot affect a prerendered page | MUST_FIX | **Accepted.** Mitigations kept, rationale replaced with the residual risk they actually address (a future component-wise local-time construction). |
| `0.07` vs `0.09` margin contradiction — `:475` retained the abandoned `--card` figure | SHOULD_FIX | **Accepted.** Corrected. |
| Month-label band specified as height only — no `text-anchor`, face, or tracking — leaving the 286px claim, the anchoring rule, and the 1.4.12 argument inconsistent; and `letter-spacing` does apply to SVG text | SHOULD_FIX | **Accepted.** Typography, anchoring, edge rule, and collision behaviour pinned; 1.4.12 argument narrowed to what is actually true. |
| The ramp passes the literal `--card`-worded requirements too, which the document never said | SHOULD_FIX | **Accepted.** Stated, with the point that the surface choice was never load-bearing for compliance. |
| r4 S2 (label band pinned vertically but not horizontally) | SHOULD_FIX | **Accepted** — §Geometry's month-label typography block. |
| r4 S4, S5, S6 and the remaining MINOR items | — | **[v6] Not actually folded in by v5** — see the v6 entry. v5's catch-all row claimed otherwise and was false. |


### v4 — dispositions of adversarial review r3 (`VERDICT: iterate`, 6 MUST_FIX / 7 SHOULD_FIX / 6 MINOR, `ESCALATE: none`)

All findings accepted.

| Finding | Severity | Disposition |
|---|---|---|
| The v3 card wrapper breaks the 288px geometry — `.contribution-card` is `padding: 1.5rem` + 1px border, leaving 238px for 284px of ink; forces a scroll, which triggers the `tabindex` mandate §Geometry removes, and breaches SC 1.4.10 | MUST_FIX | **Accepted, and the card wrapper is reversed.** Marks return to `--background`; `visual-design/design.md:244` amended to `✓` in the `background` column and the gate table rescoped to "whichever surface the marks sit on". A card was a perceptual no-op in light mode and cost dark-mode contrast (1.37 vs 1.39). |
| `pnpm build` does not run Velite (`package.json:8` is `next build`; Velite is `postinstall` at `:21`), so both integration assertions targeted a command that cannot observe them | MUST_FIX | **Accepted.** Retargeted at `velite build`; noted the throws fire during `pnpm install` at `ci.yml:26-27`. |
| Forced-colors fallback is two-state where Req 5.6 mandates three, via a stroke channel this design bans | MUST_FIX | **Accepted.** Three-state fallback using a **size** channel: no-data absent, zero 5px inset, non-zero 9px. No stroke, no clipping. |
| §Overview claims all five carve-out conditions met "in this document" while §Design System defers condition 3's spatial half | MUST_FIX | **Accepted.** Claim scoped to 1, 2, 4, 5 plus condition 3's numeric half. |
| Req 10.1↔10.2 coupling is false in one direction — `checkHeadings` only fails registered-but-absent | MUST_FIX | **Accepted.** Corrected to one-directional. |
| Req 8.3's lint-visibility answer, present in v2, deleted in v3 | MUST_FIX | **Accepted.** All four answers restored as an explicit list. |
| NFR section (incl. the DOM baseline the NFR assigns to the design phase) dropped entirely by v3's rewrite | SHOULD_FIX | **Accepted.** Section restored; baseline measured at 135 → ~403 projected. |
| Req 2.8's UTC rule has no design artifact; CI's UTC runner cannot see the defect | SHOULD_FIX | **Accepted.** `Date.UTC` on split parts mandated; `TZ` pinned to `America/Edmonton` in the test. |
| SC 1.4.12 named but never argued | SHOULD_FIX | **Accepted.** Argued for HTML copy and SVG labels separately. |
| Band height 18px does not follow from 12 × 1.4; `line-height` does not lay out SVG text | SHOULD_FIX | **Accepted.** 17px band, 98px total, explicit baselines. |
| "0.26 is the minimum meeting the ≥1.5:1 floor" — 0.26 gives 1.4966 | SHOULD_FIX | **Accepted.** Corrected to 0.27 (1.5217). |
| Silent forced ordering: data file before loader-map entry ships unvalidated | SHOULD_FIX | **Accepted.** New §Commit sequencing. |
| Remaining MINOR wording items | MINOR | **Accepted**, folded into the sections above. |


### v3 — dispositions of adversarial review r2 (`VERDICT: iterate`, 6 MUST_FIX / 14 SHOULD_FIX / 15 MINOR)

All findings accepted. The escalation was resolved in-document rather than referred, because a card
wrapper satisfies the requirement as written and needs no second amendment.

| Finding | Severity | Disposition |
|---|---|---|
| Shipped surface `--background` is marked `—` for data marks at `visual-design/design.md:244`; supersession argument cites a rule scoped to "text or icon" | blocking | **Accepted.** Card wrapper added; operative column is `--card`; depth-3 carve-out now active. Both amendments cited by heading. |
| Carve-out conditions 2 and 3 unmet — greyscale render deferred; design-practice disclosure present in v1 and deleted in v2 | blocking | **Accepted.** Greyscale swatches computed in-document; disclosure restored; Req 4.8 fallback given a trigger. |
| Invariant functions have no home module; inventory claims completeness | blocking | **Accepted.** `check-github-activity-invariants.ts` named, following `check-experience-project-links.ts`. |
| Contiguity branch has no wiring test | blocking | **Accepted.** Second integration assertion added for a gapped file. |
| Velite harness still unnamed | blocking | **Accepted.** Bespoke harness dropped; both assertions run against the real build, with the reason stated. |
| "Print emulation is a harness the suite does not have" is false | blocking | **Accepted.** Corrected; `profile-resume.test.ts:346` etc. cited. |
| Freshness script crashes on zero-byte; six-state test unwritable against the pinned interface | high | **Accepted.** Zero-byte added as a seventh state; `evaluate()` seam added; order and stacking specified. |
| No enforcement gates the accessibility/perf contract | high | **Accepted.** §"What is not gated" added; ramp-regression test proposed. |
| Monotonic `Y` is not the greyscale render the condition asks for | — | **Accepted.** Swatches supplied; the spatial component named as a visual check with the step-count fallback as its branch. |
| Month labels below the 12px type-scale floor | medium | **Accepted.** Band 18px, total height 99px. |
| Legend unspecified | medium | **Accepted.** Specified, fills only. |
| Missing one-liners (Req 5.8, 10.6, 10.1↔10.2, 7.2 copy, 2.7 wording) | minor | **Accepted.** All added. |
| Four repository misstatements ("as browsers do"; `content-yaml-loader.ts:35`; "outside the TS `src` root"; `verify-ci-topology` drift) | minor | **Accepted.** All corrected. |

### v2 — dispositions of adversarial review r1

All 13 findings accepted. Headline: v1's ramp violated the gate this document exists to verify —
levels 0 and 1 shared alpha `0.28`, so their pair measured 1.00:1 against a 1.3:1 floor, and the table
reported three of four pairs and marked the failure `—`. Reverted to five fills. Also closed: surface
ambiguity, `eslint.config.mjs` absence, the chokepoint decision, Req 10/6.5/6.6/7.2 coverage, the
duplicated window arithmetic, geometry pins, Req 8.3, and four testing inaccuracies.

## Implementation evidence

**This section is evidence, not design.** It is appended after the fact by task 17 to satisfy Req 5.6
(the forced-colors verification must be recorded in the design document, with a screenshot), Req 5.9
(SC 1.4.10 and SC 1.4.12 recorded together in one place), Req 5.10 and Req 4.8's branch condition. It
revises no decision, figure or claim above it, and the v9 version header is unchanged: everything
above this heading is the approved document, and nothing here amends it. The four checks are the ones
only a rendered page could settle — §Design System deferred condition 3's spatial half to
"visual inspection of the rendered grid during implementation", and this is that inspection.

### Render environment common to all four checks

- Real production render, not a dev-server approximation: `pnpm exec velite build` → `pnpm build`
  (exit 0) → `pnpm start` on port 3013. Route `/contributions`.
- Playwright 1.59.1, Chromium, **`deviceScaleFactor: 1`**, so a 9px mark is 9 real device pixels.
  Enlargements are nearest-neighbour (`PIL Image.NEAREST`) resamples of the captured PNGs, never a
  vector re-render — what is magnified is the shipped pixels, antialiasing included.
- Grid content at capture time: **1,712 contributions / 107 active days / 2026-02-15 → 2026-08-10**;
  `data-level` counts `0:70 1:31 2:25 3:24 4:27` (177 of 182 slots), so **all five levels were
  present in the grid and all five swatches in the legend** — the checks were made against a full
  ramp, not a partial one.
- Computed styles confirmed live: cell `fill` resolves to `--brand` (light `lab(41.0104 36.4302
  41.1254)`, dark `lab(70.451 26.7202 42.1269)`), `fill-opacity` per level `0.28 / 0.48 / 0.66 /
  0.82 / 1`, surface `--background` (light `lab(100 0 0)`, dark `lab(2.75381 0 0)`). No baked alpha
  anywhere, exactly as §Accessibility's forced-colors argument requires.

Screenshots live in the spec's `Implementation Logs/` directory. That directory is gitignored
(`.gitignore:63`), which is **expected and correct**: these are evidence of a one-time human
judgement, not visual-diff baselines, and `design-baseline/` is the place for baselines. Filenames
are cited below so the artifacts remain identifiable if they are re-captured or archived.

### What was on screen when checks 1 and 2 were signed off

Recorded in this much detail for one reason: **task 22's ramp-regression canary is expected to fire
if the alphas ever move**, and whoever retunes the ramp then needs to compare their new ramp against
exactly what was approved at 9px — not against a remembered impression of it. This is that
reference point.

- **Ramp under judgement:** `--brand` at `[0.28, 0.48, 0.66, 0.82, 1.0]` over `--background`, i.e.
  the five-level scheme in §Design System, unmodified.
- **Composites judged:** light `#e4cbc0 → #d0a593 → #bf846a → #af6646 → #9e441d`; dark
  `#483222 → #754e33 → #9d6843 → #c07f51 → #e89960`.
- **Adjacent separations judged:** light `1.42 / 1.41 / 1.39 / 1.45`; dark `1.65 / 1.54 / 1.42 /
  1.42` (pairs 0→1, 1→2, 2→3, 3→4) — the figures already tabulated in §Design System.
- **Geometry judged:** 9px mark on an 11px pitch (2px gap), which is the shipped grid geometry; every
  mark in the comparison strip carried the shipped `.contrib-heatmap__swatch` class over the real
  `--background` token, so nothing was redrawn, re-alphaed or scaled for the test.
- **The comparison strip** (a throwaway harness injected into the live page under Playwright,
  present in no source file) had three parts: (A) the five levels at rendered pitch beside their
  greyscale-luminance equivalents from §Design System — light `#d0d0d0 → #afafaf → #929292 →
  #797979 → #5f5f5f`, dark `#373737 → #575757 → #747474 → #8e8e8e → #ababab`; (B) a per-level table
  of alpha, composite hex, ratio-vs-surface and separation-to-next; (C) **the four adjacent pairs
  ranked tightest-first**, each shown twice — at the rendered 2px gap and butted with no gap, which
  is the harder edge comparison — with ranks #1 and #2 flagged in-image.
- **The "where to look" ranking was baked into the strip rather than left to memory**, so the two
  tightest pairs could not be signed off by inattention: light ranked **2→3 at 1.39 as #1** and
  **1→2 at 1.41 as #2**; dark ranked **2→3 at 1.42 as #1** and **3→4 at 1.42 as #2**. Both of the
  ramp's two tightest pairs overall are in the light theme, which is why check 1 carried the higher
  risk.

A retuned ramp should be re-judged against a strip built the same way — same class, same surface
token, same 9px-on-11px geometry, same `deviceScaleFactor: 1`, same tightest-first ranking — before
anyone concludes it is at least as resolvable as this one.

### Check 1 — 9px spatial resolvability, light theme — **PASS (2026-08-11)**

Verdict given by Matthew Field, by eye, against the purpose-built light ramp strip at 1:1 (true 9px
marks on an 11px pitch) and its 6× nearest-neighbour enlargement, plus the rendered grid, legend and
section from the live page. **All four adjacent pairs are resolvable**, including the two tightest
pairs in the whole ramp — **2→3 at 1.39:1** and **1→2 at 1.41:1**.

This closes the remaining half of the design-system carve-out's condition 3. §Design System settled
the numeric half in-document and deferred the spatial half to this inspection; both halves are now
satisfied, and the five-level scheme stands as specified.

Evidence: `task-17-check1-light-ramp-strip-1x.png`,
`task-17-check1-light-ramp-strip-6x-pixelated.png`, `task-17-check1-light-page-heatmap-1x.png`,
`task-17-check1-light-page-heatmap-8x-pixelated.png`, `task-17-check1-light-page-legend-1x.png`,
`task-17-check1-light-page-legend-8x-pixelated.png`, `task-17-check1-light-page-section-1x.png`.

### Check 2 — 9px spatial resolvability, dark theme — **PASS (2026-08-11)**

Verdict given by Matthew Field, by eye, against the dark ramp strip at 1:1 and 6×, plus the rendered
dark grid, legend and section. **All four adjacent pairs are resolvable**, including the tied
tightest pairs **2→3 and 3→4, both at 1.42:1**.

Evidence: `task-17-check2-dark-ramp-strip-1x.png`, `task-17-check2-dark-ramp-strip-6x-pixelated.png`,
`task-17-check2-dark-page-heatmap-1x.png`, `task-17-check2-dark-page-heatmap-8x-pixelated.png`,
`task-17-check2-dark-page-legend-1x.png`, `task-17-check2-dark-page-legend-8x-pixelated.png`,
`task-17-check2-dark-page-section-1x.png`.

### Check 3 — `forced-colors: active` — **PASS (2026-08-11)**

**Route used: Playwright `page.emulateMedia({ forcedColors: "active" })` in Chromium — the EMULATED
fallback, not the real Windows high-contrast theme in Edge on the WSL2 host.** Named explicitly
because emulation is a *rendering approximation* of the high-contrast theme rather than the theme
itself, and a reader of this record is entitled to know which one produced the screenshot.

Why the real Edge route was not used: the Windows host is reachable and `msedge.exe` is present, but
the real route requires Windows High Contrast to be **on**, and it was off
(`HKCU\Control Panel\Accessibility\HighContrast` Flags = 126, bit 0 `HCF_HIGHCONTRASTON` clear).
Turning it on would have changed the entire desktop session. Driving that same Edge over CDP would
still have gone through `Emulation.setEmulatedMedia` — the same approximation in a different binary,
so no gain.

Measured under emulation: `matchMedia("(forced-colors: active)").matches === true`; cell and legend
swatch `fill` both resolve to `rgb(0, 0, 0)` (`CanvasText` under the standard black-on-white theme);
**`fill-opacity` survives unforced at all five levels** (`0.28 / 0.48 / 0.66 / 0.82 / 1`); the
level-0 zero state carries `outline: rgb(0, 0, 0) solid 1px`. The screenshots show five distinct
greys and the zero state rendering as an outlined unfilled mark, so the three-state distinction
(no element / outlined / filled) is visible as §Accessibility specifies.

This is consistent with the analytic figures already recorded in §Accessibility — `CanvasText` at the
five opacities over `Canvas` giving **1.99 / 3.70 / 7.25 / 13.59 / 21.00**, adjacent separations
**1.86 / 1.95 / 1.87 / 1.54**. Those figures are the pass criterion; this screenshot is the
rendering confirmation Req 5.6 mandates. Note that §Accessibility says "the screenshot from Edge on
the WSL2 Windows host confirms rendering" — the confirmation exists, but it came from the emulated
route described here, and that sentence above is left as approved rather than edited.

The three-state outline fallback ships unconditionally (task 13); this check is evidence, not a gate
on shipping it.

Evidence: `task-17-check3-forced-colors-active-EMULATED-chromium-heatmap.png`,
`task-17-check3-forced-colors-active-EMULATED-chromium-heatmap-8x-pixelated.png`,
`task-17-check3-forced-colors-active-EMULATED-chromium-legend.png`,
`task-17-check3-forced-colors-active-EMULATED-chromium-legend-8x-pixelated.png`,
`task-17-check3-forced-colors-active-EMULATED-chromium-section.png`.

### Check 4 — SC 1.4.10 (Reflow) and SC 1.4.12 (Text Spacing) — **PASS (2026-08-11)**

Recorded together per Req 5.9. Automated under Playwright/Chromium against the same production
render.

**SC 1.4.10, 320px CSS width / 400% zoom (viewport 320 × 256):**

- Heatmap scroll wrapper: left 16, right 304, **width 288, `scrollWidth` 288 === `clientWidth` 288**
  — the container never scrolls horizontally.
- The `<svg>` itself: 288px wide, right edge 304, inside the 320px viewport with the page's 16px
  margins intact — the `viewBox="-1 -1 288 100"` box fits exactly, as §Accessibility argues.
- Section: width 288, `scrollWidth` 288 === `clientWidth` 288. Legend: 55px, no overflow.
  `<details>`: 288px, no overflow.
- No two-dimensional scrolling is introduced by the heatmap; vertical scrolling only, which 1.4.10
  permits.
- Monthly-totals table opened at 320px: **all 7 rows present, unclipped and legible**, table 288px,
  `scrollWidth` === `clientWidth`.

**SC 1.4.12, text-spacing override** (`line-height: 1.5`, `letter-spacing: 0.12em`,
`word-spacing: 0.16em`, paragraph `margin-bottom: 2em`, applied via `*`):

- **Nothing is lost or clipped.** The section grows 348px → 478px tall and reflows normally.
- The scroll wrapper still does not overflow (`scrollWidth` === `clientWidth`); legend and
  `<details>` are not clipped.
- **The SVG month labels do take the override** — computed `letter-spacing: 1.44px`,
  `word-spacing: 1.92px` on the `<text>` nodes, confirming §Accessibility's [v5] correction that
  these properties reach SVG `<text>`. Measured right edges after the override: Feb 25.33, Apr 90.33,
  May 137.33, Jun 190.33, Jul 230.33, **Aug 280.33** against the viewBox right edge at **287** — no
  glyph passes the edge, no wrap, no clip, no vertical displacement. The right-anchor rule absorbs
  the extra width exactly as argued.
- Monthly-totals table under the override at 320px: all 7 rows still present and legible; the table
  measures 289.9px inside its 288px box — a ~2px bleed into the page's own 16px right margin with
  `overflow: visible`, so nothing is clipped, its right edge (305.9) is still inside the 320px
  viewport, and it introduces no document horizontal scrollbar of its own.

**Honest nuance — a pre-existing, site-wide footer overflow, judged separately.** At a 320px viewport
`document.body`/`documentElement` reports `scrollWidth` **342px** (and 396px once the text-spacing
override is applied). **That is not the heatmap.** Proven rather than assumed, by measuring control
routes at the same viewport: `/`, `/projects`, `/resources` and `/profile` — none of which contain a
heatmap — report the identical 342px unstyled and the identical 396px under the override. An
element-level sweep for anything whose right edge passes 321px returns the same two offenders on
every route (a footer `<a class="hover:text-foreground">` and its `<span class="sr-only">` at right
= 395.8), and the count of overflowing elements **inside the heatmap section is zero** on every
measurement. The verdict above is therefore recorded on the heatmap's own boxes, all of which fit
320px with room to spare; the page-level 342/396 figure is the pre-existing footer bug tracked as
deferral **`d-eb289402`** and is out of scope for this spec.

Evidence: `task-17-check4-reflow-320px-400pct-fullpage.png`,
`task-17-check4-reflow-320px-400pct-section.png`,
`task-17-check4-reflow-320px-400pct-details-open.png`,
`task-17-check4-text-spacing-override-320px-fullpage.png`,
`task-17-check4-text-spacing-override-320px-section.png`,
`task-17-check4-text-spacing-override-320px-details-open.png`,
`task-17-check4-text-spacing-override-1280px-section.png`.

### Outcome

Four checks, four dated verdicts, **all PASS**. Req 4.8's fallback — reduce to three levels plus
zero — is **not triggered**, so the five-level scheme, the ramp table in §Design System, the
`0|1|2|3|4` level union, the empty-band `{0,1,3,4}` case, the five alphas and the legend's five
swatches all stand exactly as designed. No escalation was raised and nothing above this section was
changed.
