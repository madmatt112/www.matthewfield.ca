# Adversarial Analysis (Round 2) — contributions-and-resources / tasks.md (v2)

Reviewer stance: principal eng / release manager. Focus is the **v2 deltas** (least-reviewed surface), grounded against the live repo. Every finding tagged Novel / Compounding / Recurring per the r1 memory at `reviews/adversarial-memory-tasks.md`.

Repo facts verified this round (file:line):
- `vitest.config.ts:13-17` — `test.environment: "jsdom"`, `include: ["src/**/*.test.{ts,tsx,mjs}"]`, `globalSetup: ["./vitest.global-setup.ts"]`. **No `setupFiles`.**
- `vitest.global-setup.ts` — runs `pnpm velite build` once per `vitest run` (so `#site/content` resolves to a real `.velite` manifest during tests).
- `src/canary.test.tsx` — the **only** `.test.tsx` in the repo. Uses `render()` + `getByRole(...).toBeDefined()`. **It does not use any jest-dom matcher** (`toBeInTheDocument`, `toHaveAccessibleName`). A repo-wide grep for `jest-dom` / `toHaveAccessibleName` / `toBeInTheDocument` returns **zero** matches.
- `package.json` — `@testing-library/react ^16.3.2`, `@testing-library/jest-dom ^6.9.1`, `jsdom ^29.0.2` all present as devDeps; `"test": "vitest run"`.
- `src/lib/projects.empty.test.ts:12-16` — the established empty-collection pattern: a **dedicated file** with a **file-scope** `vi.mock("#site/content", () => ({ projects: [] }))`, then import-after-mock. Comment explicitly warns `vi.mock` inside a `describe` does NOT re-mock.
- `src/app/sitemap.ts:7-21,23-67` — `routes` literal still contains `/contributions` (line 11) and `/resources` (line 13); `sitemap()` is the synchronous default export; collection helpers are called at module-call time. No `src/app/sitemap.test.ts` exists today.
- `eslint.config.mjs:22-50` — `importNames: ["posts"]`; off-list = `blog.ts`, `velite.config.ts`, `chokepoint-canary.ts`, `blog.test.ts`, `feed.xml/parity.test.ts`.
- `velite.config.ts:252-282` — `linkSchema.url = s.string().url().refine(parse + protocol∈{http,https})`. `defineConfig.collections = { pages, profile, posts, projects }` (line 425).
- `tsconfig.json:34` — `exclude: ["node_modules", "src/__fixtures__/chokepoint-canary.ts"]` (only the projects canary).
- `.github/workflows/ci.yml` — `Lint`(45) → `Typecheck`(52) → **`Unit tests` / `pnpm test`(57)** → topology/canary/velite-output self-tests(77-92) → `Build 1`(94) → … → `Velite build (for Build 2)`(117) → `Build 2`(122) → `Check Lighthouse cadence`(135) → Pagefind(141).
- `scripts/check-lighthouse-cadence.mjs` — current fire condition is delta≥3 **only** (the `% 3` modulo gate was removed in commit `72462c5`); parses last count via `matchAll(...).at(-1)`; fails hard if `.velite/projects.json` is missing.
- `design.md:260-270` — unwrap table; the `["links",0,"kind"]` walk is `ZodObject → ZodEffects(.shape.links) → ZodArray → ZodObject → ZodEnum`. **No `ZodPipeline` is on that path.** `ZodPipeline` nodes are only the leaf `title`/`description`/`label` (from `trimmed()`); they have no child the walk descends into.
- `design.md:323` — the description-length assertion "lives in the corresponding `src/lib` test (the constant can be exported **or re-declared** there)."

---

## Top 5 risks / gaps (ranked)

### 1. Tasks 15/16 render tests will not run as written — jest-dom matchers are not registered (no `setupFiles`). **Compounding** (r1 risk #1 fix is incomplete).
This is the highest-severity finding because the entire v2 thesis was "the rendering layer no longer ships test-free," and the load-bearing assertion is Task 16's `getByRole("group")` + `toHaveAccessibleName(h2text)`.

`toHaveAccessibleName`, `toBeInTheDocument`, etc. are **jest-dom** matchers. They only exist after `import "@testing-library/jest-dom"` runs in a per-test setup file (`vitest.config.ts` → `test.setupFiles`). This repo has **no `setupFiles`** — only `globalSetup`, which runs once in Node before the suite and **cannot** register `expect` extensions for jsdom test workers. The sole existing `.test.tsx` (`canary.test.tsx`) sidesteps this by asserting `.toBeDefined()` on the element, never a jest-dom matcher.

Failure scenario (day one): an implementer writes Task 16's test exactly as the `Success:` line dictates — `expect(screen.getByRole("group")).toHaveAccessibleName("…")`. It throws `TypeError: expect(...).toHaveAccessibleName is not a function`. The implementer's two outs are both bad:
- Add `import "@testing-library/jest-dom"` (or a `setupFiles`) — but **no task authorizes touching `vitest.config.ts` or adding a setup file**, and Tasks 15/16 are scoped to the component + its colocated test only. This is an undeclared prerequisite.
- Rewrite the assertion to avoid jest-dom (e.g. read `aria-labelledby` and look up the element by id manually). That is fine functionally, but it silently abandons the exact `toHaveAccessibleName` gate the v2 memory cites as the proof the wiring works — i.e. the v2 fix evaporates at implementation time.

**Required addition:** a task (or a Task 15/16 sub-step) must add `test.setupFiles: ["./vitest.setup.ts"]` to `vitest.config.ts` with `import "@testing-library/jest-dom/vitest"`, landed before/with Task 15. Alternatively, rewrite the Success lines to a jsdom-only assertion (read `group.getAttribute("aria-labelledby")`, `getElementById`, compare `textContent`) and drop the jest-dom dependency entirely. Either way the current tasks are not implementable as written.

### 2. Task 16's `toHaveAccessibleName` is a false-confidence assertion even if jest-dom is wired — jsdom's accessible-name computation does not reliably resolve cross-element `aria-labelledby`. **Novel.**
Even granting finding #1 is fixed, the assertion is fragile. jsdom (`jsdom ^29`) has a notoriously incomplete accname implementation; `@testing-library/jest-dom`'s `toHaveAccessibleName` relies on `dom-accessibility-api`, whose `aria-labelledby` resolution depends on the referenced id existing **in the same rendered tree at query time**. The Task 16 test renders only `ContributionCard` (which renders both the `<h2 id="contrib-N">` and the rail), so the id is in-tree — that part is OK. But the assertion's *value* (`toHaveAccessibleName(EQUAL to <h2> text)`) presumes accname returns the `<h2>`'s `textContent` verbatim, with no whitespace normalization surprises.

Failure scenario: the `<h2>` contains `{title}` plus, in a plausible future, a wrapping element or trailing whitespace; `dom-accessibility-api` trims/collapses differently than `h2.textContent`, and the equality assertion fails on a perfectly-wired component — OR (worse) passes regardless because both sides resolve to the same empty/normalized string when the id lookup silently no-ops. The test as specified (`toHaveAccessibleName` EQUAL to `<h2>` text) is doing two things at once and is not robust.

**Recommended:** assert the structural fact directly and deterministically — `expect(group.getAttribute("aria-labelledby")).toBe("contrib-" + index)` AND `expect(container.querySelector("#contrib-" + index)?.textContent).toBe(title)`. That catches the exact `contrib-` vs `contrib_` typo the memory worries about, with zero dependence on jsdom accname. The current `toHaveAccessibleName` framing is the weakest link.

### 3. Task 20's empty-collection test, as specified, can pass vacuously and does not prove `sitemap()` survives `[]`. **Compounding** (r1 risk #3 fix is at the wrong layer / underspecified).
The r1 crash risk is in `sitemap()` calling `maxOr([], now)`. Task 20 says "Add a unit test asserting both collections empty → both entries fall back to `now` without throwing," and the Success line says "the empty-collection test passes (both `[]` → `now` fallback, no throw)." It does **not** say the test calls the real `sitemap()` default export, nor that it `vi.mock`s `#site/content`.

Two concrete failure modes:
- If the implementer tests `maxOr([], now)` in isolation, that proves the helper but **not** that `sitemap()` (the real build path, the thing that crashes the static export) actually calls it with `[]` and survives — exactly the gap the prompt flags.
- If the implementer tests `sitemap()` directly without a mock, it reads the **real** `.velite/contributions.json` / `.velite/resources.json`, which the global setup builds from `content/*.yaml`. On day one those files are `[]` (Task 6), so the test passes — but it would pass with a **bare `.reduce` without an initial value too**, because `[].reduce` only throws when… actually it *does* throw on empty with no init, so this specific bug is caught — but the moment Task 6 seeds even one entry, the test no longer exercises the empty path at all and the regression protection silently disappears.

The repo already has the correct idiom for this (`src/lib/projects.empty.test.ts`): a **dedicated file** with a **file-scope** `vi.mock("#site/content", () => ({ contributions: [], resources: [] }))`, then `import sitemap from "@/app/sitemap"` after the mock, then `expect(() => sitemap()).not.toThrow()` and assert both URLs carry `lastModified === now`-ish. Task 20 must pin this (own file, file-scope mock, call the default export), or the v2 fix is illusory.

### 4. The `CONTRIBUTIONS_DESCRIPTION` / `RESOURCES_DESCRIPTION` length test has an ownership/circularity defect — the constant lives in the page file but the test lives in `src/lib`. **Novel.**
Task 17 says `CONTRIBUTIONS_DESCRIPTION` is "a constant" in `src/app/(site)/contributions/page.tsx`. Task 12 says the `src/lib/contributions.ts` test must "assert `CONTRIBUTIONS_DESCRIPTION` length ∈ [50,160] (constant exported here or re-declared in test)." Design line 323 explicitly permits "exported **or re-declared** there." Each option is defective:

- **Re-declared in the test:** the test asserts the length of a *copy*. The real page-file constant can drift out of [50,160] and CI stays green — this is precisely the "asserted, not tested" anti-pattern v2 was supposed to eliminate (it re-introduces a manual sync invariant). The `Req 2.8/5.8` gate is defeated.
- **Exported from `src/lib/contributions.ts` and imported by the page:** clean, but then Task 17's claim that the constant "lives in the page file" is wrong, and the page must import it from lib. That's fine directionally (page→lib), but **no task pins which direction**, so two implementers (Task 12 and Task 17, on separate branches per the DAG) can each invent their own constant and the test guards neither the page's nor a shared one.

There is no genuine *circular* import hazard (lib never needs to import the page), but there is an unresolved **single-source-of-truth** decision. **Required:** pin the constant in `src/lib/contributions.ts` / `resources.ts`, export it, have the page import it, and have the lib test assert the real exported constant. Make Task 17 import-only. As written, Tasks 12 and 17 disagree on ownership.

### 5. Task 3 sub-deliverable (e)'s mandated `ZodPipeline` traversal is an untriggerable vanity test; and the a–g checklist is still one atomic `[x]`, so partial completion is undetectable. **Compounding** (r1 risk #5 fix is cosmetic on both counts).
Two distinct problems, same task:

(a) **Vanity `ZodPipeline` test.** Design lines 260-270 show the only real walk targets: `["links",0,"kind"]` goes `ZodObject → ZodEffects → ZodArray → ZodObject → ZodEnum`. The `ZodPipeline` nodes (`title`/`description`/`label` from `trimmed()`) are **leaf string fields** — the walk never descends *through* a pipeline into a child, because pipelines wrap a terminal `ZodString`, not an object/array with further path segments. The only path that reaches a `.shape` for the `unrecognized_keys` "did you mean" is the parent `ZodObject` (entry or `links` element), reached via `ZodEffects`, never via `ZodPipeline`. So the `_def.out`/`_def.in` branch of the unwrap table **cannot be exercised by any issue these two real schemas can emit.** Task 3(e) forces a test of that branch, which means the implementer must hand-build a *synthetic* schema that doesn't correspond to anything in production — a test that pins dead code. Either delete the `_def.out`/`_def.in` row from the unwrap table (and the (e) ZodPipeline clause) as YAGNI, or explicitly label it "defensive/unreachable, synthetic fixture" so it isn't mistaken for coverage of a real path. As written it's a false signal of robustness.

(b) **Checklist is still atomic.** Sub-deliverables a–g are non-checkbox bullets inside one task body, one file, one `[ ]`. The task is marked `[x]` in a single stroke. Nothing mechanically prevents marking it done with (e) or (f) untested — the "ALL seven … tests pass" Success line is human-asserted, not gate-enforced (there is no per-clause CI assertion that all seven describe-blocks exist). This is the same monolith r1 flagged, with nicer formatting. Genuine atomicity would require either (i) splitting into checkbox sub-tasks 3.1–3.7, or (ii) a test-name manifest the suite asserts against. Acknowledged trade-off: splitting risks the same-file two-task coupling r1 warned about — but the current state does not actually make partial completion detectable, which was the stated goal.

---

## Top 3 conclusions to challenge or reverse

1. **"Tooling (`@testing-library/react`, jest-dom, jsdom) confirmed present in package.json" (memory line 8) → therefore the render tests are runnable.** Reverse. Presence as a devDependency is necessary but not sufficient: jest-dom matchers require `setupFiles` registration, which this repo lacks and no task adds. The conclusion conflates "installed" with "wired." The render-test gate is not executable as specified (finding #1).

2. **"Task 16's Success now requires `getByRole('group')` to have an accessible name equal to the card `<h2>` text (proves the wiring)" (memory line 8).** Challenge. `toHaveAccessibleName` over a cross-element `aria-labelledby` is the *least* reliable way to prove this in jsdom (incomplete accname). A direct `getAttribute("aria-labelledby") === "contrib-"+index` + `getElementById(...).textContent === title` proves the same wiring deterministically and actually fails on the `contrib_` typo without depending on jsdom's accname quirks. Swap the assertion (finding #2).

3. **Matrix: "the durable committed V for Reqs 2.8/5.8 is the `src/lib` length test."** Challenge. If the constant is re-declared in the test (a permitted option per design 323 and Task 12), the lib test verifies a copy, not the page's real constant — so the committed "V" guards nothing the page ships. The verification is only durable if the constant is the single exported source the page imports. The matrix marks 2.8/5.8 as `I + V` (Tasks 12/17, 13/19) without pinning that prerequisite (finding #4).

Conclusions that are **fine, not re-litigated:** the separate paired-merge gate (Task 11) and separate cadence script (Task 23) no-coupling decisions are sound and verified against `verify-canary-regex-pair.mjs` / `check-lighthouse-cadence.mjs`. The CI step ordering in Task 24 is correct: the cadence step (ci.yml:135) is after the Build-2 velite build (ci.yml:117) where `.velite/*.json` exists. The 6.5→6 renumber left no dangling references (DAG node T6, `_Depends on: 5`, matrix rows 1.9/4.1, and the parallel-branch prose are all consistent). The chokepoint test files correctly use `vi.mock` (Tasks 12/13) and `fs.readFileSync`-only canary reads (Task 10), so no new `#site/content` real-import sneaks past the allowlist.

---

## What's missing — concrete additions before implementation

1. **Add a vitest setup file for jest-dom** (or remove all jest-dom matchers from Tasks 15/16). Concretely: a new sub-step landing with/before Task 15 that creates `vitest.setup.ts` (`import "@testing-library/jest-dom/vitest";`) and adds `setupFiles: ["./vitest.setup.ts"]` to `vitest.config.ts:13` test block. Without this, Tasks 15/16 cannot pass. (Finding #1 — blocking.)

2. **Re-specify Task 16's a11y assertion** to the deterministic form: `expect(group.getAttribute("aria-labelledby")).toBe(\`contrib-${index}\`)` plus an id→`textContent` equality check, instead of `toHaveAccessibleName`. (Finding #2.)

3. **Pin Task 20's empty test to the real `sitemap()` path in its own file** with a file-scope `vi.mock("#site/content", () => ({ contributions: [], resources: [] }))` and `expect(() => sitemap()).not.toThrow()` — mirroring `src/lib/projects.empty.test.ts`. State the file name (`src/app/sitemap.empty.test.ts`) and that it must assert both URLs are present with the `now` fallback. (Finding #3 — the current Success line is satisfiable by an isolated `maxOr` test that proves nothing.)

4. **Make the description constant single-sourced.** Edit Task 12/13 to "export `CONTRIBUTIONS_DESCRIPTION`/`RESOURCES_DESCRIPTION` from the helper; the test asserts the **exported** constant," and edit Task 17/19 to "import the description constant from `src/lib/...` (do not redeclare)." Remove the "or re-declared in test" escape hatch. (Finding #4.)

5. **Resolve Task 3(e)'s untriggerable branch.** Either drop the `_def.out`/`_def.in` unwrap row + the ZodPipeline clause as unreachable for these schemas, or relabel it "defensive (no real path emits it)" so reviewers don't read it as live coverage. Separately, decide whether the a–g checklist needs real per-clause checkboxes (3.1–3.7) or a test-name manifest assertion to make partial completion detectable — the current single `[x]` does not. (Finding #5.)

6. **Minor — Task 23 day-one seeding vs `matches.at(-1)`:** verify the seeded runs-log initial entry records the **launch count** (0 if data is `[]`), not a placeholder, so `count - last >= 10` is `0 - 0` and does not fire on day one. The parser is correct (`at(-1)`, append-at-bottom), but Task 23 should state the seed value explicitly to avoid an implementer logging a non-zero placeholder that makes the first real run fire spuriously. Non-blocking but worth a one-line restriction.
