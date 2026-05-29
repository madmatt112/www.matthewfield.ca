# Adversarial Analysis (Round 3) — contributions-and-resources / tasks.md (v3)

**Verdict up front: the document has converged.** The five v3 deltas are correct and — for the two highest-risk ones — empirically verified against the live test harness in this very review. r1 and r2 left nothing unresolved; r3 finds no blocking or compounding defect. What follows are the only residuals: three minor/cosmetic notes and one optional test-robustness suggestion. None gate implementation. **This `tasks.md` is implementation-ready.**

I did not manufacture findings to fill a quota. Each v3 delta is treated below; where it is fine, it is stated in one line with the ground-truth that confirms it.

---

## Ground-truth probes run during this review

Two of the analysis dimensions could be settled empirically rather than argued, so I ran them in the actual repo harness (vitest 4.1.4, jsdom, `globalSetup` runs `velite build`, NO `setupFiles`):

1. **Tasks 15/16 deterministic render assertions** — a throwaway `*.test.tsx` rendering `<div role="group" aria-labelledby="contrib-0">` next to `<h2 id="contrib-0">` and asserting `getByRole("group").getAttribute("aria-labelledby") === "contrib-0"` AND `container.querySelector("#contrib-0")?.textContent === "Title Here"`. **PASSED** with no jest-dom, no setupFiles change. `getByRole("group")` resolves a bare `<div role="group">` in jsdom without any "accessible-name-required" gotcha (the `group` role does not require an accessible name to be queryable). Dimension #1 closed: the v3 assertions are expressible exactly as written, and `querySelector`/`textContent`/`.getAttribute`/`toBe` need no setup file.

2. **Task 20 `sitemap.empty.test.ts` mock + now-fallback** — a throwaway `*.empty.test.ts` with the exact v3 file-scope `vi.mock("#site/content", () => ({ contributions: [], resources: [], posts: [], projects: [], pages: [], profile: [] }))`, importing the real default `sitemap`, asserting both URLs present and `lastModified` inside a `Date.now()` before/after window. **PASSED.** The mock is NOT shadowed by the real built `.velite` (the alias-specifier mock intercepts the transitive helper reads), and the `now` fallback is assertable via a bounded window. Dimensions #2 closed.

---

## Analysis by dimension

### 1. v3 deterministic render assertions (Tasks 15/16) — CONVERGED
Verified empirically (probe 1). `getByRole("group")` is reliable in this harness for a bare `role="group"` wrapper; no need to downgrade to `querySelector('[role="group"]')`. Import-renderability (dimension #1, third bullet): `ContributionCard` imports `formatContributionDate` from `src/lib/contributions.ts` and the rail. `contributions.ts` imports `formatContentDate` from `@/lib/format-date` and `contributions` from `#site/content` (aliased to `.velite` in vitest) — no server-only/`next/*`-server module leaks into the jsdom render. `format-date.ts` is pure. Nothing breaks the isolated render. **Fine.**

### 2. v3 `sitemap.empty.test.ts` mock completeness — CONVERGED (with one harmless over-spec)
Traced every `#site/content` read reachable from `sitemap()`:
- `sitemap.ts` imports **helpers**, not raw collections: `getVisiblePublishedPosts` (→ `blog.ts` reads `posts`), `getAllTags`/`getAllCategories` (→ `blog-taxonomy.ts` → `blog.ts`, `posts`), `getPublishedProjects` (→ `projects.ts` reads `projects`), plus the new `getAllContributions`/`getAllResources` (→ `contributions`/`resources`).
- Actual transitive symbol set required: **`posts`, `projects`, `contributions`, `resources`** — four symbols.
- The v3 mock lists six: `{contributions, resources, posts, projects, pages, profile}`. `pages` and `profile` are **not** read by anything `sitemap()` touches. Including them is harmless over-specification, not a defect — `vi.mock` replaces the whole module, and unread extra keys are inert. (Note for the memory file: the r2-prompt phrasing "include every symbol `sitemap.ts` transitively imports" is over-broad in the helpful direction; the test would pass with just the four, but listing six is fine and future-proofs against `sitemap.ts` growing.)
- **Mock-vs-built-`.velite` shadowing** (dimension #2, second bullet): the `globalSetup` `velite build` runs and writes a real `.velite`, but the file-scope `vi.mock` of the `#site/content` alias wins for this module graph — confirmed by probe 2 passing (it returned the mocked empty collections, not the built fixtures). No shadowing. **Fine.**
- **Memoization caveat (worth a one-line note, not a finding):** `getPublishedProjects()` keeps module-level `__cached` keyed on `VERCEL`/`VERCEL_ENV`/`PROJECTS_INCLUDE_DRAFTS`. In an isolated `sitemap.empty.test.ts` the cache starts null and the mocked `projects: []` is what gets cached, so there is no cross-file leak (vitest isolates module state per test file). The implementer does NOT need the `projects.empty.test.ts` distinct-env dance — but copying it would be harmless. No action required.

### 3. Single-sourced description constants — CONVERGED
The constant lives in `src/lib/contributions.ts`/`resources.ts`, which already import their collection from `#site/content`. The page importing `CONTRIBUTIONS_DESCRIPTION` from `src/lib/contributions.ts` does NOT newly pull `#site/content` into the page's lint surface — the page imports from `src/lib`, which is the authorized helper boundary, and `src/lib/contributions.ts` is on Task 7's eslint exemption list. No chokepoint interaction, no `force-static` concern (the constant is a build-time string). Ordering: Task 17 `_Depends on: 12`; Task 12 owns the exported constant — correct. Task 19 `_Depends on: 13`; Task 13 owns `RESOURCES_DESCRIPTION` — mirrors correctly. No surviving text says the constant "lives in the page" (design.md:323 still carries the stale "can be exported or re-declared there" phrasing, but **tasks.md** — the artifact under review — has cleanly removed the re-declare escape in Tasks 12/13/17/19). **Fine.** (See residual R1 for the design.md:323 drift.)

### 4. Coverage / matrix integrity — CONVERGED
- Reqs 2.8/5.8 (single-sourced meta bounds): matrix lists `12,17` and `13,19` as `I + V` — Task 12/13 own the exported constant and the length assertion (the V), Task 17/19 consume it. Correct after v3.
- Reqs 2.6/3.7 (deterministic a11y test): matrix lists `15,16` as `I + V`; Task 16 carries the load-bearing cross-element wiring assertion. Correct.
- Req 6.2 (sitemap empty test): matrix lists `20` as `I + V`. Correct.
- Orphan AC check: walked the matrix. Every AC 1.1–10.8, all NFRs, have ≥1 task. Req 9.4 is `—` and explicitly tagged "D (non-feature)" — legitimate. No task lacks a requirement. **No orphans.**

### 5. Least-reviewed tasks — all fine (one line each)
- **Task 1 `httpUrl()`/`isoDate()`:** `httpUrl()` faithfully extracts the `velite.config.ts:271-279` two-stage `new URL()` + protocol `.refine`. `isoDate()` validate-don't-transform with `fatal:true` and a UTC round-trip is correct and its bad-date test list is exhaustive (rollover, non-leap, out-of-range, unparseable-without-RangeError). Fine.
- **Task 6 data-file/schema ordering:** `_Depends on: 5`; the empty-`[]` launch literal keeps every intermediate commit green per Req 1.9. Fine.
- **Task 22 heading-exactness vs Task 21:** I diffed all three sources — Req 8.1, design "Author documentation", and Task 21 list the **same 9** canonical headings verbatim (`## Contributions YAML shape` … `## Deep-link anchor stability`). Task 22 checks exact-line matches of those 9. No off-by-one, no comma/colon in any heading. Fine.
- **Task 24 topology-verifier interaction:** the live `verify-ci-topology.mjs` pins a fixed literal list + nine ordered "blog-enhanced" literals; inserting `check:authoring-docs` (after `Lint`, before `Build 1`) and the cadence step (co-located with `Check Lighthouse cadence`, ci.yml:135, after Build 2) does not reorder any pinned literal. Task 24 correctly hedges "grow the literal list if needed" and mandates re-running the verifier. Fine.
- **Task 26 malformed-class completeness:** covers bad enum, oversize field, unknown key, duplicate `kind`, future-dated `added`, calendar-invalid `date`, zero-byte file, top-level mapping — the full failure taxonomy from Reqs 1.4/4.4. Fine.

---

## Residuals (none blocking)

**R1 — design.md:323 still carries the retracted "re-declared in test" escape (Recurring-in-design, already fixed in tasks).** *Class: cosmetic / doc-drift.* tasks.md correctly single-sources the constants and removed the escape, but `design.md:323` still reads "*the constant can be exported or re-declared there*". This is the exact phrasing r2 #4 retired. It is harmless because the *task* (the implementation contract) is unambiguous, but a fresh implementer who reads design.md:323 could re-introduce a re-declared copy. *Failure scenario:* implementer follows design prose, re-declares `RESOURCES_DESCRIPTION` in `resources.test.ts`, asserts the copy → the length guard guards nothing the page ships (the precise hole r2 closed). *Fix:* one-line edit to design.md:323 to match tasks.md (assert the exported constant, no re-declare). Low priority; tasks.md is the governing artifact.

**R2 — Task 20's "both URLs present" assertion is satisfied by the pre-edit static `routes` too (minor test-discriminating-power note).** *Class: Novel, minor.* The current `sitemap.ts` already lists `/contributions` and `/resources` as static `now`-stamped routes (sitemap.ts:11,13). Probe 2 passed *before* applying Task 20's edit — i.e. the "both URLs present + `lastModified` ≈ now" assertions pass against the OLD code. The test's genuinely load-bearing assertion is `not.toThrow()` (the `maxOr` empty-array guard) and the *computed* path; URL-presence alone does not prove Task 20's `routes`-array removal happened. *Failure scenario:* an implementer who forgets to remove the two literals from `routes` (leaving them ALSO in the computed `sectionEntries`) ships **duplicate** sitemap entries, and this empty-test still passes. The Task 20 body's restriction ("Remove the two literals from `routes` — no duplicate entries") covers the intent, but no test asserts *exactly-once*. *Optional hardening:* add a one-line assertion that each URL appears exactly once (`urls.filter(u => u.endsWith('/contributions')).length === 1`). Not required — the restriction + Task 26's build verification catch it — but cheap insurance against a duplicate-entry regression. (The empty-array crash guard, which is the test's stated purpose, is fully delivered.)

**R3 — Task 20 mock-symbol note for the memory file (informational, not a defect).** The v3 mock lists six symbols; only four (`posts`, `projects`, `contributions`, `resources`) are transitively read by `sitemap()`. Over-listing is harmless and future-proof; flagged only so the memory file records the actual minimal set, in case a future reviewer wonders whether `pages`/`profile` are load-bearing (they are not).

---

## Top conclusions to challenge or reverse

**None — converged.** The two prior rounds' dominant weakness class ("asserted-not-tested / tested-at-wrong-layer / tooling-not-actually-wired") is now empirically closed: I *ran* the two assertions r2 was worried about and they execute correctly in the real harness. The three Velite corrections, the DAG/footer consistency, and the no-coupling (separate-scanner / separate-gate) decisions remain sound and were not re-litigated.

## What's missing

**Nothing blocking. The document is implementation-ready.** The only concrete pre-implementation additions are optional polish:
- (R1) one-line fix to design.md:323 to delete the retracted re-declare phrasing, so design and tasks agree.
- (R2) optionally add an "exactly-once" URL assertion to `sitemap.empty.test.ts` to give it discriminating power over the `routes`-removal edit (Task 20's restriction + Task 26 already cover correctness; this is belt-and-suspenders).

A crisp summary for the response/memory: **r3 found zero Recurring and zero Compounding findings, zero blocking issues; three minor residuals (one design-prose drift, one optional test-hardening, one informational note). v3 has genuinely converged. Recommend approval.**
