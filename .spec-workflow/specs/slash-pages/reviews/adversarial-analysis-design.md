# Adversarial Analysis — slash-pages/design (v1)

Staff-engineer teardown. Verified against live code; citations are `file:line`. Where the
design is actually sound I say so briefly and move on — most of it is, because this spec was
pre-simplified across three requirements rounds. The genuine risks are narrow and concrete.

---

## 1. The central `formatContentDate` UTC fix — blast radius and correctness

**Verified facts.**
- `formatContentDate` is one TZ-naive `Intl.DateTimeFormat("en-CA", …)` (`src/lib/format-date.ts:1-9`).
- It has **six** consumers, all via the same function reference (`grep`):
  `formatPostDate` (`src/lib/blog.ts:87`), `formatProjectDate` (`src/lib/projects.ts:76`),
  `formatResourceDate` (`src/lib/resources.ts:56`), `formatContributionDate`
  (`src/lib/contributions.ts:21`), plus direct calls in `project-card.tsx:16`,
  `updated-badge.tsx:8`, `projects/[slug]/page.tsx:71`, `blog/[slug]/page.tsx:73,75`.
- The design's blast-radius statement (`design.md:66,141`) names only `/blog` + `/projects`.
  **It omits `/resources` and `/contributions`** (`formatResourceDate`/`formatContributionDate`
  are the same reference — `resources.ts:56`, `contributions.ts:21`). The omission is harmless
  *only if* those two also render date-only `s.isodate()` values — which they do — but the
  design asserts a smaller blast radius than the truth and never checked the two YAML
  collections. That is a documentation defect in a section whose whole job is "blast radius."

**Stress-test results.**
- **Challenge the claim that `s.isodate()` "normalizes a date-only `2026-05-29` to the full ISO
  `2026-05-29T00:00:00.000Z`" (`design.md:120`).** Half-true and dangerously imprecise. Velite's
  `isodate` is `stringType().refine(Date.parse).transform(v => new Date(v).toISOString())`
  (`node_modules/velite/dist/index.js:140`). It does **not** pin to midnight — it parses
  *whatever the author wrote* and re-serializes. A date-only `"2026-05-29"` → `…T00:00:00.000Z`
  (verified). But a **full datetime** like `"2026-05-29T18:30:00-04:00"` is accepted by
  `s.isodate()` and re-serialized to `2026-05-29T22:30:00.000Z`. The UTC-pinned formatter then
  renders the **UTC calendar day**, which for an evening-Eastern author is the *next* day. So the
  design's "every consumer wants the authored calendar date" (`design.md:141`) is false for any
  author who ever writes a time-of-day in `updated`/`date`. The authoring doc must forbid
  time-of-day in these fields, or the schema must be tightened — neither is specified.
- **The single TZ-independent unit-test assertion.** Sound. Verified: `Intl…{timeZone:"UTC"}`
  formatting `new Date("2026-05-29T00:00:00.000Z")` **and** `new Date("2026-05-29")` both yield
  `"May 29, 2026"` regardless of ambient `TZ`. The Vitest `TZ` cannot leak — both the `Z` form and
  the bare date-only form parse to the same UTC instant and are formatted in UTC. Design claim
  holds (`design.md:141`, `requirements.md:218`).
- **No existing test breaks.** The current `format-date.test.ts:18-23` date-only case uses
  `"2026-05-25"` but asserts only a loose regex (`/^[A-Z][a-z]+ \d{1,2}, \d{4}$/`) and never
  pins the day, so it passes both before (Toronto → "May 24") and after (UTC → "May 25") the fix
  (verified by running the formatter under `TZ=America/Toronto`). The `12:00:00Z` case is
  TZ-stable. **However**: the design does not mention updating `format-date.test.ts` at all, even
  though the new Req 10.4 assertion ("May 29, 2026" pinned to the day) is a *new* test the existing
  file does not contain. The design says "add a unit test" but never says *where* — colocated
  `src/lib/format-date.test.ts` already exists and is the obvious home; the design's Testing
  Strategy (`design.md:429`) lists the assertion without naming the file. Minor, but it leaves the
  most behaviorally-load-bearing test homeless.

---

## 2. `getNowPage()` return-type assertion and evaluation timing

**Verified facts.** `.velite/index.d.ts` defines `export type Page =
Collections['pages']['schema']['_output']`. After adding `updated: s.isodate().optional()`,
`Page.updated` is `string | undefined`. `aboutPage = getAboutPage()` runs at module top level
(`about/page.tsx:19`).

**Stress-test results.**
- **The `as Page & { updated: string }` cast (`design.md:170`) is type-sound but runtime-fragile
  in one edge.** The runtime guard `if (!entry.updated) throw` (`design.md:167`) rejects
  `undefined` AND `""`. Since `s.isodate()` requires `Date.parse` to succeed, an empty string
  never validates into the collection in the first place, so `""` cannot reach the guard — the
  cast is honest. Fine.
- **Challenge the module-load throw timing.** The design asserts module-load evaluation gives a
  "genuine build-time throw" (`design.md:25,173`). True for `next build` page-data collection.
  But there is an unaddressed failure mode the design glosses: **the throw also fires at *import*
  time in any context that imports the route module without `.velite/` populated** — e.g. a cold
  checkout where `pnpm velite` has not run, or a unit test that imports the route. The design's
  Req 10.3 test deliberately reads *raw `.mdx`* to avoid importing the route (`design.md:428`), so
  the test side is safe. But the design never states the build ordering dependency: `velite` must
  run before `next build` evaluates `now/page.tsx`. That ordering exists today for `/about`, so
  this is a *preserved* invariant, not a new risk — but the design claims a new build-time guard
  ("a dateless `/now` is a build error") without verifying that `next build` actually imports the
  page module early enough to throw *before* a successful build is emitted. For a statically
  rendered route Next.js does import the module during the build, so the throw does fire — but the
  design asserts this rather than citing the existing `/about` precedent proving it. Low risk
  (the precedent does prove it), but the design overstates certainty it did not establish.
- **`updated` typed `string | undefined` — does the cast hide a real null at runtime?** No, per
  the guard above. Not a defect.

---

## 3. The parameterized `check-authoring-docs` + self-test rewrite (the v3/r3 blocking finding)

This is the highest-risk section because it rewrites a **currently-passing** self-test, and the
design specifies the rewrite in prose only.

**Verified facts (current code).**
- `checkHeadings(docText)` takes **one** arg and closes over the module-level
  `CANONICAL_HEADINGS` (`check-authoring-docs.mjs:54-58`).
- The test imports `{ checkHeadings, CANONICAL_HEADINGS }` and calls `checkHeadings(text)` with
  **one** arg in three pure-core tests (`check-authoring-docs.test.mjs:40-57`).
- `main()` takes **no** args, hardcodes `DOC_REL_PATH` (`check-authoring-docs.mjs:63-81`).
- The five CLI tests `spawnSync` the real script in a tmp `cwd` and `writeDoc()` writes **only**
  the contributions doc (`check-authoring-docs.test.mjs:33-36, 61-108`).

**Stress-test results.**
- **The signature change breaks the existing pure-core tests — the design acknowledges this but
  under-specifies the fix.** `checkHeadings(docText)` → `checkHeadings(docText, headings)`
  (`design.md:292`). The three existing pure-core tests call `checkHeadings(text)` /
  `checkHeadings("")` / `checkHeadings(ALL_PRESENT)` with **no** headings arg
  (`test.mjs:41,48,54`). After the change `headings` is `undefined` and
  `headings.filter(...)` throws `TypeError: Cannot read properties of undefined`. The design says
  "now calling `checkHeadings(text, CANONICAL_HEADINGS)`" (`design.md:433`) — correct in
  intent, but this is a **mandatory** edit to three named tests, not an optional one, and the
  design frames it loosely ("now call …") rather than as a required diff. An implementer who
  parameterizes the script but forgets one of the three pure-core call sites ships a red test.
  Call this out as a checklist item, not prose.
- **Stress-test "write every managed doc into the fixture dir" against the FIVE assertions.** The
  design's plan (`design.md:327, 434`) is: each tmp dir writes *both* docs; the doc-under-test
  carries the scenario, the sibling is written fully-present. Walk the five:
  1. *all present → exit 0, no stdout* (`test.mjs:61-71`): both docs full-present → exit 0, no
     `::warning::`. **Holds** — but only if `ALL_PRESENT` for the slash doc uses
     `SLASH_PAGES_HEADINGS`, not `CANONICAL_HEADINGS`. The current `ALL_PRESENT` constant
     (`test.mjs:23`) is `CANONICAL_HEADINGS.join`. The design's `writeDocs` helper must compute
     per-doc full-present text from each doc's own heading set; the design says "defaulting
     unspecified managed docs to their fully-present heading text" (`design.md:327`) but does not
     show the helper deriving text from `AUTHORING_DOCS[i].headings`. If the helper reuses the old
     single `ALL_PRESENT`, the slash doc is written with contributions headings → permanently
     missing all four slash headings → this "exit 0" test fails. **Concrete trap.**
  2. *one heading missing → non-zero + `::warning::`* (`test.mjs:73-83`): holds if the sibling is
     full-present. Holds.
  3. *doc missing → non-zero + stderr + NO annotation* (`test.mjs:85-95`): the design says "writes
     **neither** doc" (`design.md:327`). But the new `main()` **iterates** and `continue`s on a
     missing doc (`design.md:303-307`) — it no longer `process.exit(1)` on the *first* missing
     doc. So with neither doc present, it emits **two** `author doc not found` stderr lines and
     still no `::warning::`, exit 1. The assertion is `assert.match(r.stderr, /author doc not
     found/)` + `assert.doesNotMatch(r.stdout, /::warning::/)` — both still pass. **Holds**, but
     the design's parenthetical "first missing doc → stderr + exit 1" (`design.md:327`) is
     **wrong about the control flow** — the new `main()` does not stop at the first; it reports
     all. The assertions survive the discrepancy, but the design's own description of its own code
     is inconsistent (`design.md:303-307` loops/continues vs `design.md:327` "first missing doc").
  4. *zero-byte doc → per-heading warnings, count == headings.length* (`test.mjs:97-108`): the
     existing assertion is `warningCount === CANONICAL_HEADINGS.length` (9). If the zero-byte
     doc-under-test is the **slash** doc, the script emits **4** warnings for it (its 4 headings)
     **plus 0** for the full-present contributions sibling = 4, not 9 → assertion fails. If the
     zero-byte doc is the **contributions** doc, it emits 9 (contributions) + 0 (slash sibling) =
     9 → passes. So this test's correctness depends entirely on *which* doc the rewrite chooses as
     the zero-byte subject, and on the assertion being changed from the hardcoded
     `CANONICAL_HEADINGS.length` to the under-test doc's own heading count. The design says
     "zero-byte doc-under-test → exit non-zero + per-heading warnings" (`design.md:434`) but does
     **not** state that the assertion's expected count must become per-doc. **Concrete trap** — a
     literal reading of "update the fixtures, keep the assertions" ships a red test.
  5. *aggregate exit code* — a single-doc scenario now runs under a two-doc loop. **Does
     aggregating change observed stdout/stderr for a single-doc test?** Yes for the zero-byte and
     all-present cases (above). The design's claim "this keeps the five behavioral assertions
     intact" (`design.md:327`) is **only true if assertions 1 and 4 are also edited** — which the
     design does not explicitly mandate. It mandates editing fixtures and asserts the behavior is
     "intact," but two of the five assertions must themselves change.
- **`CANONICAL_HEADINGS` still exported with the same meaning?** Yes — design keeps it
  (`design.md:277,323`) as the contributions set, matching the test import (`test.mjs:17`). Holds.

**Verdict on §3:** the *mechanism* is fine and the v3/r3 blocker is genuinely addressed, but the
design's prose under-specifies the test rewrite and contains two internal inconsistencies (the
"first missing doc" control-flow claim, and the implicit assumption that assertions 1/4 survive
unchanged). An implementer following the prose literally has two concrete ways to ship a red
self-test.

---

## 4. `/sitemap` E2E link-resolution (Req 10.5)

**Verified facts.** `playwright.config.ts:3-4,18-20` sets `baseURL =
http://localhost:${PORT}` and `use.baseURL`. `/contact` is `force-static`
(`contact/page.tsx:7`) and ships a CSP header with `form-action 'self'` (`contact-csp.test.ts:96`).

**Stress-test results.**
- **Are hrefs root-relative so `request.get` resolves against `baseURL`?** All `slashPages` and
  `navItems` hrefs are leading-slash root-relative (`site.ts:34-40`, `design.md:243-249`), and
  Home is `"/"`. Playwright's `page.request.get("/contact")` resolves relative URLs against
  `use.baseURL` (it shares the context base). **Holds.** But note: the design collects hrefs from
  the *rendered DOM* (`design.md:442`), and Next.js `<Link>`/`<a href="/contact">` render the href
  verbatim, so the collected value is `/contact`, resolvable. Fine.
- **Will `/contact` 200 in the E2E server?** `/contact` is `force-static` and owned by another
  spec; it renders without the mock Resend backend (the form only needs the backend on *submit*,
  not on GET). `page.request.get("/contact")` does a plain GET — `response.ok()` will be 200.
  **Holds.** The CSP header does not affect `request.get` (no script execution, no resource
  loads). The design's separate "console/CSP cleanliness" check runs on the *five slash pages*
  (`design.md:443`), NOT on `/contact` — so the contact form's CSP surface is never navigated.
  **No flake from `/contact` CSP.** Good.
- **False-positive surface on the console/CSP-cleanliness check (`design.md:443`).** This is the
  real flake risk and the design hand-waves it. The design attaches `page.on("console", error)`
  + `page.on("pageerror")` and asserts **zero** errors on all five pages. Concrete false-positive
  sources NOT addressed:
  - **next-themes / hydration:** the project uses a `THEME_STORAGE_KEY` init-script pattern
    (`blog-axe.test.ts:4,31`). The slash pages are server components in the `(site)` shell that
    *does* include the theme provider; a hydration-mismatch warning is a `console.warn`
    (filtered out if the listener is error-only — the design says "error level"
    `design.md:443`, so warnings are excluded). OK *if* error-only is actually implemented.
  - **Pagefind "index not found":** `/blog` E2E tolerates a missing Pagefind index
    (`blog-axe.test.ts:78-81`). The `(site)` shell may mount the search trigger on every page;
    if the Pagefind bundle 404s it can log a console **error**. The five slash pages inherit the
    same chrome as `/blog`, so this is a live risk the design never rules out. The existing
    `csp.test.ts` / blog suites work around Pagefind explicitly; this design does not.
  - **favicon / static 404s** in dev vs `pnpm start` (the E2E server runs `pnpm start`,
    `playwright.config.ts:29`, so prod build — lower risk, but the design never says it relies on
    the prod server to avoid dev-only React error overlays).
  The design asserts "no console/CSP violations" as if it were free; in this codebase the
  pre-existing suites all carry explicit carve-outs (code-block contrast exclusion, Pagefind
  tolerance, CSP-listener-before-scripts ordering). **The design specifies none of these
  carve-outs**, so the cleanliness assertion is the most likely test to land flaky.

---

## 5. Inline-vs-component and config-as-editorial decisions

**Verified facts.** `force-static` is the house pattern (`resources`, `profile`, `contact`,
`projects`, `blog`, `contributions` all set it — grep). `siteConfig` is a leaf (`site.ts` imports
nothing from `app/`/`components/`). The `SiteConfig` **type** currently has no `slashPages`
(`site.ts:12-25`).

**Stress-test results.**
- **Inline `/sitemap`+`/slashes` vs structure.md "components".** No contradiction — structure.md's
  "small focused files" is satisfied by inline link lists; the design's rationale (used once, no
  reuse — `design.md:97`) is sound and matches the user's "don't over-engineer" standing
  instruction. Fine.
- **"Clear Interfaces / exported `SlashPage` type used by both" NFR.** The design exports
  `SlashPage` and has both routes import it (`design.md:234-240,252`). Satisfies the NFR. Fine.
- **Does adding `slashPages` to the `SiteConfig` *type* force existing consumers/tests to
  change?** Adding a **required** `slashPages: SlashPage[]` to the `SiteConfig` type
  (`design.md:240`) makes every object literal of that type need the field. There is exactly one
  literal (`siteConfig`, `site.ts:27`), and the design adds the field to it (`design.md:242-250`),
  so the literal stays assignable with no cast. **No existing consumer reads `slashPages`**, so
  widening the type cannot break a reader (TS structural typing only *adds* a member). **Holds** —
  no cast needed, no existing test of `siteConfig` breaks (the only test is the *new* Req 10.1
  test). Confirmed against `site.ts`.
- **One real nit:** the design's `SlashPage` is declared `type SlashPage = {…}` (`design.md:234`)
  but the NFR + `design.md:252` say it is **exported**. The snippet at `design.md:234` omits
  `export`. Trivial, but the snippet as written would fail the "imported by both routes"
  requirement. Make it `export type SlashPage`.

---

## 6. Scope/requirements fidelity

Cross-checked the design against all 10 requirements + 8 Decisions. Coverage is high. Gaps:

- **Req 7.1 title-template resolution — asserted, never tested.** Req 7.1
  (`requirements.md:181`) requires each page's title resolve through the root template to
  `"<Page> | matthewfield.ca"`. The design sets `title: nowPage.title` etc. (`design.md:176`) and
  *claims* template inheritance (`design.md:38` "inherit … title template"), but **no test
  asserts the resolved `"… | matthewfield.ca"` string** for any of the five pages, and the design
  never reads `src/app/layout.tsx` to confirm the template actually exists / is `%s |
  matthewfield.ca`. The E2E asserts a visible `<h1>` (`design.md:440`), not `<title>`. So Req 7.1
  has **no design home beyond an assertion**. Either drop the claim or add a title-resolution
  check. (Low severity — the template is inherited structurally — but it's an acceptance criterion
  with no verification.)
- **Req 1.5 image colocation — verify-existing, untested, acceptable.** Design defers to the
  existing Velite `public/static/` pipeline (`requirements.md:115`); no design work needed. Fine —
  but the design doesn't even restate it; a reader checking 1.5 finds silence. Cosmetic.
- **Req 5.4 / 7.2 `noindex` on `/sitemap`+`/slashes` — covered** (`design.md:207,224`). Fine.
- **NFR external-link `rel` — partially covered.** Design says `/colophon` external links carry
  `rel="noopener"` (`design.md:38,198`). But the NFR (`requirements.md:240`) requires
  `target="_blank"` links to **also** carry `rel="noopener noreferrer"`. The design only specifies
  `rel="noopener"` and never says whether colophon links open in a new tab. If any do, the design
  under-specifies the `noreferrer`. And **no test asserts any `rel` value** — there is no
  axe/E2E/unit check for it anywhere in the Testing Strategy. Unenforced NFR.
- **Req 7.5 canonical — explicitly optional** (`requirements.md:185`); design omits canonical.
  Fine.
- **Over-build check:** I found **no** over-engineering. The design adds zero machinery beyond the
  six edits the requirements pin. Decisions #2/#4 (no registry, no parity normalizer) are honored.
  This is the document's strongest property.
- **Seed-sentinel test (Req 10.2) — correct target, confirmed.** The placeholder body in
  `.velite/pages.json` is literally `"Placeholder content. Replaced in a downstream spec."`
  (verified). The design correctly mandates reading **raw `.mdx`** not the compiled body
  (`design.md:427`), which is right because the compiled body is a JS function-string. Sound.

---

## Top 5 risks/gaps

1. **The self-test rewrite (§3) has two concrete red-test traps the prose hides:** the zero-byte
   assertion's hardcoded `CANONICAL_HEADINGS.length` (9) and the all-present `ALL_PRESENT`
   constant both assume a single doc/heading-set. Under the two-doc list they must become
   per-doc, but the design says "keep the five assertions intact" (`design.md:327`) — two of them
   cannot stay intact. **Highest-confidence implementation bug.**
2. **`s.isodate()` does not "normalize to midnight" (§1):** it re-serializes whatever was authored,
   so a time-of-day in `updated`/`date` makes the UTC-pinned formatter shift the displayed day.
   The design's "blast radius is benign, every consumer wants the calendar date" is false for any
   author who writes a time. No authoring-doc rule or schema constraint forbids it.
3. **The console/CSP "cleanliness" E2E (§4) has an unaddressed false-positive surface** —
   Pagefind-index-404 and next-themes/hydration are tolerated by *every* sibling suite via explicit
   carve-outs; this design specifies none. Most likely test to land flaky.
4. **Blast-radius documentation is incomplete (§1):** `/resources` and `/contributions` also
   re-export `formatContentDate` and are silently affected by the UTC change; the design names only
   `/blog`+`/projects`.
5. **Three acceptance criteria are asserted but unverified (§6):** Req 7.1 title-template
   resolution, the `rel="noopener noreferrer"` NFR for any `target="_blank"` colophon link, and
   (cosmetically) Req 1.5. None has a test.

## Top 3 conclusions to challenge or reverse

1. **"The blast radius is intentional and benign; every consumer wants the authored calendar
   date" (`design.md:141`).** Reverse the certainty. It is benign *only* for strictly date-only
   `YYYY-MM-DD` values across all six consumers (blog, projects, resources, contributions, now,
   and the projects `updated` badge). The moment any `s.isodate()` field carries a time-of-day,
   UTC-pinning shifts the day for evening-Eastern authoring. Add an authoring-doc rule "dates are
   date-only, never with a time" (and ideally a velite refine), or scope the claim honestly.
2. **"This keeps the five behavioral assertions intact" for the self-test (`design.md:327`).**
   Challenge: two of the five (all-present exit-0 and zero-byte count==N) require the *assertions
   themselves* to change once the script gates two docs with different heading counts. The design
   should specify the new expected counts/text per doc, not claim invariance.
3. **The "genuine build-time throw" framing for `getNowPage()` (`design.md:25,173`).** Challenge
   the over-stated certainty: the throw fires at module *import*, which is build-time only because
   `next build` happens to import statically-rendered route modules — the design asserts this
   without grounding it in the `/about` precedent that actually proves it. Cite the precedent or
   add a build-smoke; don't assert.

## What's missing before acting on this document

- A **literal diff spec** for `check-authoring-docs.test.mjs`: which of the five CLI assertions
  change, the new per-doc expected warning counts, the `writeDocs` helper deriving full-present
  text from each `AUTHORING_DOCS[i].headings`, and the three pure-core call-site edits. The prose
  is too loose for a rewrite of a passing test.
- An **authoring-doc rule (and/or schema refine) forbidding time-of-day** in `updated`/`date`, so
  the UTC fix's correctness claim actually holds.
- **Carve-outs for the console-cleanliness E2E** matching the sibling suites (Pagefind-index
  tolerance, error-vs-warning level, prod-server assumption).
- **A title-template resolution check** (or removal of the Req 7.1 claim) and a **`rel` assertion**
  for colophon external links (or an explicit statement that no colophon link opens in a new tab).
- Fix the in-document inconsistencies: `export type SlashPage` (`design.md:234`), the "first
  missing doc → exit 1" vs loop/continue control-flow contradiction (`design.md:303` vs `:327`),
  and correct the blast-radius list to include `/resources`+`/contributions`.

**Net:** the architecture is correct and admirably minimal — no over-build, the six pinned
mechanisms all verify against live code, and the headline UTC fix and `pages`-import-allowed
(`eslint.config.mjs:30` lists only `posts`/`contributions`/`resources`, not `pages`) claims hold.
The real exposure is entirely in **test-specification precision** (§3, §4) and **one false
correctness generalization** (§1), not in the design's shape.
