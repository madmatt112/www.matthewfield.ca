# Adversarial Review Memory — requirements
Last updated: 2026-05-25 (after v3 review)

## Cumulative Findings Summary

### Accepted (resolved across v1 → v3)
- **`description`/`summary` split logic** (v1 → v2 → v3): v3 made `summary` always required (Req 1.2), closing the "opportunistic compromise string" failure mode. Note: r3 raised a new floor-minimum gap — see Unresolved.
- **`links` keyed-map → array-of-objects** (v1 → v2): array model retained in v3 with a CLOSED `kind` enum (Req 5.1). Closes v2's "kind typo silently iconless" finding.
- **`featured` ordering ambiguity** (v1 → v2): grid-span/row-order foreclosed; accent-only treatment confirmed in v3.
- **`featured` user story missing** (r2): v3 Req 11.2 / §9 captures editorial guidance ("when to set, when to unset, how many at once") in the doc.
- **Cover-image dimension/aspect floor** (v1 → v2 → v3): v3 *removed* the aspect-ratio band in favor of `width ≥ 1200`, `height ≥ 800` + file-size caps (soft 500 KB, hard 1 MB). Closes the 4:3-exclusion and 5 MB-PNG failures.
- **Cover/OG decoupling** (r2): v3 Reqs 1.3 / 6.4 explicitly decouple — no cover-as-OG fallback. Closes the band-mismatch finding.
- **File-size cap** (r2): v3 Req 3.1 adds 500 KB soft / 1 MB hard caps.
- **Velite output-shape contract test** (r2): v3 Req 1.11 adds the smoke test + version pin.
- **Uniqueness per recognized `kind`** (r2): v3 Req 5.1 enforces "at most one entry per kind value." Note: introduces the asymmetric-rendering issue for paired demos — see Unresolved.
- **Rail cap lowered to 6** (r2): v3 Req 5.8 lowers from 10 to 6.
- **Container width** (v1 → v2 → v3): v3 narrowed from `max-w-7xl` (1280) to `max-w-5xl` (1024), addressing r2's "empty whitespace on common laptops."
- **Wide-media auto-escape contract** (r2): v3 Req 6.7 names four tags (`<img>`, `<video>`, `<pre>`, `<figure>`) with automatic escape, no per-element opt-in. Note: r3 found the CSS technique still unspecified — see Unresolved.
- **Chokepoint test's four evasion patterns** (r2): v3 Req 7.4 enumerates named/namespace/barrel/dynamic imports explicitly.
- **Canary fixture for chokepoint test** (r2): v3 Req 7.6.h adds the `chokepoint-canary.ts.txt` fixture. Note: r3 raised a path/extension concern — see Unresolved.
- **`PROJECTS_INCLUDE_DRAFTS` vs. blog env var** (r2): v3 Req 11 §8 covers both in the author doc.
- **`next build && next start` static-build runtime** (r2): v3 Req 7.2.c explicitly addresses with "deliberate consequence" admission. Note: r3 challenges the user-model — see Unresolved.
- **Empty-gallery contract vs. homepage** (r2): v3 Req 2.9 / intro clarify this is an acceptable initial production state.
- **Author-facing doc filename pinned** (r2): v3 Req 11.1 pins `docs/projects-authoring.md`. Closes the "filename decision deferred" finding.
- **Doc completeness checklist** (r2): v3 Req 11.1 enumerates §1–§10 with required topics; v3 Req 11.3 adds a launch-gate task. Note: r3 challenges the "reviewer-eye" mechanism — see Unresolved.
- **`<h1>` rejection across MDX/Markdown forms** (r2): v3 Req 6.9.a covers AST nodes + literal `<h1>`/`<H1>` text. Note: r3 raised code-fence false-positive risk — see Unresolved.
- **Heading-hygiene contract** (r2): v3 Req 6.9.c added as "best-effort, not strict." Note: r3 challenges the lack of enforcement given no TOC — see Unresolved.
- **Shared date module path overhead** (r2): v3 Req 9.1 documents the path-pinning decision. Closes the v2 finding with an explicit decision.
- **Lighthouse target enforcement path** (r2): v3 Req 12 acknowledges Lighthouse-CI is out of scope and target is manual at launch. Note: r3 raised re-verification cadence — see Unresolved.
- **Rollback window** (r2): v3 Req 10.5 cites CI duration (3–5 min). Note: r3 challenges the empirical-vs-contractual nature — see Unresolved.
- **`noindex` mechanism** (r2): v3 intro acknowledges with planned-shape forward awareness. Reasonable deferral.

### Partially Accepted
- **`rel="noopener"` only, `noreferrer` omitted** (v1 → v2 → v3): rationale unchanged across versions; r2's "modern Referrer-Policy already truncates" critique unaddressed.
- **Same-tab default for outbound links** (v1 → v2 → v3): three versions with no engagement on the underlying critique. Documented as personal preference would close it.

### Rejected
- (None explicit — user adopted most v1/v2 critiques.)

### Unresolved (raised in r3)
- **1-char minimum on `description`/`summary` defeats the "always require both" rationale**: schema permits `"A"`/`"A"` trivially.
- **Asymmetric caps `description ≤ 160` / `summary ≤ 140` lack rationale anchors**: 140 is now its own magic number.
- **`summary ≤ 140` may be too high for mobile single-column cards** (5–6 lines at narrow viewport).
- **"Duplication is intentional" rationale presumes author behavior not enforced by schema**: paste-once is the dominant behavior.
- **160 ceiling on `description` is a hard error with no override / no documented heuristic-vs-contract acknowledgment** (recurring from r2).
- **Silent-OG-loss when authors don't supply `ogImage`**: no build-time notice; site default applies quietly.
- **Cover floor `1200×800` is over-spec for `max-w-5xl` (1024 px) detail page**: source dimensions wasted at downscale.
- **Cumulative page weight not bounded**: per-image cap × N covers = N MB on the gallery.
- **`ogImage` shape validated but appropriateness not** (same file twice passes shape if dimensions match).
- **"Omit `kind` to add a new type" footgun**: authors invent kinds and hit build errors first.
- **Uniqueness-per-kind forces asymmetric rendering for paired demos** (staging vs. production demo).
- **Rail-above-body fold-eating** still unresolved at 6-entry cap with short bodies.
- **Wide-media auto-escape CSS technique still unspecified at requirements level**: design phase can ship brittle implementation.
- **Closed four-tag list (`<img>`, `<video>`, `<pre>`, `<figure>`) excludes `<table>`, `<iframe>`, `<svg>`, `<canvas>`**.
- **No path for full-width prose elements** (callouts, hero quotes) given no custom components.
- **Heading-sequence not schema-enforced + no TOC = bad heading flow ships silently.**
- **h4+ forbidden by default may be too restrictive for long project writeups** (architecture + lessons + future work want nesting).
- **`<H1>` literal-text scan may produce false positives on code-fenced HTML examples** (scan technique unspecified).
- **Canary fixture `.ts.txt` extension may put it outside the production scanner's scan path**: test-of-the-test risk of being a no-op.
- **Chokepoint allowlist is path-pinned with no expansion contract** documented.
- **"Regex/AST scan" technique still under-specified after r2 enumeration**: regex-only has high false-negative risk on TS variations.
- **`pnpm start` after draft-included build admission documents the footgun but doesn't surface it at build time.**
- **Rollback window bounded by *empirical* CI history, not contract**: silent degradation if CI slows.
- **Req 9.1 path `src/lib/format-date.ts` invites future non-content date consumers** (minor; reasonable as-is).
- **Req 11.3 "reviewer-eye check" is the weakest gate for a solo project**: self-review of doc completeness.
- **Req 11 section ordering favors reference over tutorial**: first-encounter author wants starter first.
- **Lighthouse target re-verification cadence absent**: manual at launch is one-time; gallery grows.
- **Intro "out of scope" vs. Req 3.7 in-body image handling has a fuzzy boundary** (no auto-optimization but yes-CSS-wrap).

## Patterns & Themes

- **v3 closed a large fraction of r2's findings** — the most consequential reversals (always-required `summary`, cover/OG decoupling, file-size caps, closed kind enum, narrowed container, enumerated chokepoint patterns + canary, pinned doc filename, doc section requirements) all landed.
- **Mechanism-without-implementation is the most persistent r3 theme** — three versions in, the wide-media auto-escape and the chokepoint scan technique are still "design phase / implementation choice." The pattern of naming-a-contract-without-pinning-a-technique survives the adversarial review.
- **The "reviewer-eye" / "documented in the author doc" remediation pattern recurs** for every soft-failure (typo kinds, env-var footguns, heading flow, doc completeness). For a solo author who is both reviewer and implementer, this is the same risk surface as "no check at all."
- **r3's new findings cluster around schema floors** (1-char minima) and **technique-deferred contracts** (CSS escape, scanner approach) — both forms of "the requirement names the contract but doesn't pin the mechanism."
- **The same-tab outbound-link policy and the noreferrer-omission rationale are now in their third version unchallenged in the requirements** — these are personal preferences that have not been written as such. Either pinning rationale or relabeling as preference would close them.
- **MDX-vs-Markdown user-model tension still unresolved**: v3 doubles down on no-components without engaging r2's "rename the file extension or accept components" suggestion.

## Guidance for Next Review

- **Well-covered, do not re-examine**: cover/OG decoupling, `summary` always-required, file-size caps, closed kind enum, chokepoint four-pattern enumeration, canary fixture existence, container width narrowing, doc filename pinning, doc section enumeration, sitemap basics, lifecycle paths, `next build && next start` admission (the issue is the user-model, not the omission).
- **Focus areas** for v4 (if there is one):
  - **Schema floors**: minimum-length on `description`/`summary` — pick a number or document the 1-char floor.
  - **Wide-media CSS technique**: pin it in requirements or list candidates with tradeoffs.
  - **Canary fixture scan path**: verify the test exercises the production scanner code path.
  - **Heading-sequence enforcement**: schema-enforce or document the gap.
  - **Doc-completeness automation**: section-heading parser, ~20 lines, closes the self-review gap.
  - **Build-log notice for `PROJECTS_INCLUDE_DRAFTS`**: surfaces the footgun without requiring authors to read the doc.
- **Adjacent areas worth a once-over** if v4 expands scope: `.mdx` vs. `.md` file extension decision, cumulative page weight contract, Lighthouse re-verification cadence, the rail-above-body short-body failure (still unresolved), the same-tab/noreferrer rationale (third version pending).
- **Likely lower-yield areas**: most schema-shape findings (closed enums, required fields, dimensions) have been addressed; structural reversals (links array, featured semantics, accessible name scoping) are stable; the chokepoint architecture (four patterns + canary) is conceptually closed pending the scanner-technique decision.
