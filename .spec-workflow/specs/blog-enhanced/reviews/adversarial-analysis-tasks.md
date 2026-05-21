# Adversarial Analysis — blog-enhanced/tasks (v1)

Target: `/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/blog-enhanced/tasks.md`
Frame: senior delivery lead, tearing it apart on atomicity / ordering / coverage.

---

## Attack 1 — Task 6: an unbounded "Velite schema/transform extension"

The single task carries FIVE structurally distinct changes — schema additions, h4 rejection clause, fixture-slug audit, series-order collision detection (a NEW cross-post hook), inline-slug replacement at two call sites, AND `safeBodyHtml` regex extension — all gated behind one checkbox.

- Challenge the claim that this is atomic. The task itself admits the series-order collision check needs a hook Velite "may not expose" and would then fall back to a "Velite output-collection-level validation step" — that branch is a multi-hour spike masquerading as a sub-bullet. Split it out and gate Task 7 (fixtures) on the spike's outcome.
- Stress-test the assumption that "Design pins" the implementation site for the cross-post hook. The design defers it ("most natural place is after the per-post transform completes, inside a `prepare` or `complete` hook — Design pins"). That is the task admitting the design does NOT pin it. Implementers will either invent a hook surface or fall back to a separate script — neither is a one-line transform extension.
- Challenge the rollback story. If `velite.config.ts` is rewritten with all five edits and the h4 rejection breaks an existing blog-core fixture nobody saw (e.g. a stray `####` in a draft), the reviewer cannot revert four-fifths of the task. Split into 6a (schema fields + categories cap), 6b (h4 rejection + escape hatch), 6c (fixture-slug audit), 6d (series-order collision), 6e (slug-derivation call-site swap + safeBodyHtml regex). Each is independently revertable.
- Challenge the dependency edge. Task 22 (next.config.ts X-Robots-Tag) depends on Task 6 because it reads `hiddenFromLists` from `.velite/index.js`. But Task 22 only needs the SCHEMA addition (6a), not the h4 rejection or the series-collision check. Collapsing them blocks Task 22 unnecessarily.
- Stress-test the success criterion. "rejects `fixture-search.mdx` if `hiddenFromLists` is removed" — but `fixture-search.mdx` is CREATED in Task 7, which depends on Task 6. The success criterion is forward-referencing a fixture that doesn't yet exist when Task 6 should be verifiable.

## Attack 2 — Task 18: eight components + global CSS edits in one checkbox

Eight component files (five server, three client), plus a sweeping `globals.css` edit covering "tokens for `--reading-progress-fill` (light + dark), copy-button positioning rules, code-block-wrapper styles, share-bar tokens, TOC indentation, footnote section styling. Also `.pagefind-ignored` token overrides for theme parity." This is multiple sprints inside one bullet.

- Challenge the claim that this can be implemented + reviewed atomically. The Requirements footer covers 21 distinct AC IDs (2.1, 2.5, 4.5, 5.1, 5.4, 5.5, 5.6, 5.7, 6.1, 6.2, 6.4, 6.5, 6.6, 7.1, 7.6, 7.9, 9.1, 9.6, 9.7, 9.8, 9.9). A reviewer cannot mentally hold "did the implementer satisfy 21 requirements correctly in 8 files" in one pass — that's exactly the kind of task that lands in spec review with "looks fine" and ships bugs.
- Stress-test the success criterion: "Each component renders in isolation under storybook-equivalent dev; light + dark themes verified visually." This is unfalsifiable hand-wave. There is no storybook here. "Verified visually" is reviewer judgment, not a mechanical gate. Demand per-component Playwright smoke (which is what Tasks 31–35 should cover but only DO for some components — see Attack 5).
- Challenge the global-CSS coupling. `globals.css` is touched in one task that's also touching eight `.tsx` files. A revert of "CopyButton was wrong" cannot be done by reverting just `copy-button.tsx` — the CSS additions for the wrapper landed in the same commit. Split into 18a–18h per component (each owning its CSS slice) + 18i for the shared `.pagefind-ui` overrides.
- Stress-test the dependency edge from Task 19 (`<SiteSearch />`). Task 19 declares "Depends on: 18" but the only thing it actually needs from 18 is the `.pagefind-ui` CSS override block, NOT the eight presentational components. That over-broad dependency stalls Task 19 behind work it doesn't need.
- Challenge the claim that `<CopyButton />` uses a "DOM-marker hydration pattern, NOT per-MDX-block JSX." The component is described as a hydrator with `useEffect` running `document.querySelectorAll('[data-copy-button]')`. But the bullet doesn't say WHERE it is mounted in the React tree. Mount it once in the layout? On every post page? In the article wrapper? The mount site is unstated and Task 20 doesn't pick it up either — it lands as an integration gap.

## Attack 3 — Task 0 spike status is a hidden critical-path gate

Task 0 says "Failure returns the design to v5" — i.e. if the spike fails, this entire 38-task plan is invalidated. Yet the dependency graph treats Task 0 as a normal predecessor.

- Challenge the claim that Task 0 belongs in the task list at all. If failure invalidates the design, the spike is a DESIGN-phase artifact, not an IMPLEMENTATION-phase task. Putting it as Task 0 in the implementation tasks file conflates "we proved the mechanism" with "we shipped the mechanism." Move it to the design v4 changelog as a precondition and start implementation tasks at Task 1.
- Stress-test the spike's claim of self-cleanup. The task says "Do NOT commit the `public/__spike/` directory (the spike must clean it up in step 12)." Cleanup is in user-space. If step 12 fails (e.g. master timeout fires mid-cleanup), the spike directory ends up tracked. There is no automated check at the start of Task 1 that the working tree is clean of `public/__spike/`.
- Challenge the verification-key pattern. Task 1's only check that Task 0 succeeded is "contains the literal string `All v3 spike assertions PASSED`." Anyone can echo that into the file. This is sham gating — replace with a mechanical re-run of the spike's six acceptance criteria from Task 1, or replace with a CI workflow that produces the artifact under provenance.
- Stress-test the pinned `pagefind` version logic. The task reads `PAGEFIND_VERSION` from `package.json` BEFORE Task 1 commits the pin. The bullet acknowledges this circularity ("an initial spike against `main` with a temporary `pnpm dlx pagefind@<pin>` invocation is acceptable") — but doesn't tell you WHICH pin to use. The implementer has to choose. That choice may or may not match what Task 1 commits. If Task 1 picks a different version, the spike's validity is in question.
- Challenge the requirement-footer coverage. Task 0 claims `_Requirements: 1.2, 1.4_`. A SPIKE doesn't satisfy production requirements — it validates feasibility. This requirements citation pollutes the coverage matrix (Req 1.4 is "covered by 14, 23, 37" PLUS Task 0 — which is wrong; Task 0 covers nothing in production).

## Attack 4 — Task 23 is the bottleneck and the dependency graph hides it

Task 23 extends `ci.yml` with eight new steps + insertion of `Verify getPublishedPosts callers`. It is depended on by Tasks 25, 31, 32, 33, AND it depends on Tasks 9, 10, 11, 12, 13, 14 (six scripts).

- Challenge the claim that Task 23 is one task. Eight new CI steps with five conditional `if:` predicates (`vars.PAGEFIND_ENABLED != 'false'`, `vars.DEPLOY_VIA_CI == 'true'`, combinations) plus env-var wiring across multiple steps — this is an integration of six independent scripts into one workflow. Each script (Tasks 9–14) lands separately, but they are only verifiable end-to-end when Task 23 wires them. That means Tasks 9–14 are unverifiable until Task 23 lands. Re-order: write the workflow skeleton first (calling stubs), then fill the scripts; or split Task 23 into 23a (Pagefind crawl + verify steps), 23b (Vercel build/deploy steps), 23c (warn step).
- Stress-test the assumption that `vars.PAGEFIND_ENABLED` is a repo variable. The task says "NEVER set `PAGEFIND_ENABLED` or `DEPLOY_VIA_CI` in env — they are repo VARIABLES, read via `vars.*`." But the requirement to CREATE those repo variables in the GitHub UI is nowhere in the task list. New repo without those vars: `vars.PAGEFIND_ENABLED` evaluates to empty string, the `!= 'false'` predicate succeeds, and Pagefind runs by default. The fall-open behavior is fine, but the runbook to FLIP the variable (the operator step that Task 14's warn script defends against) is undocumented in tasks.
- Challenge the ordering of "Verify getPublishedPosts callers" insertion. Task 23 inserts the step "IMMEDIATELY AFTER `Typecheck`," but Task 26 (which implements the verifier) is downstream — Task 23 depends only on 9–14, not on 26. So Task 23 lands a CI step that calls a script that doesn't yet exist. Either Task 23 must depend on 26, or Task 26 must precede 23.
- Stress-test the verifier extension feedback. Task 25 ("extend `verify-ci-topology.mjs`") depends on Task 23 — but the verifier extension SHOULD precede the ci.yml edit so the new step literals are mechanically protected from day one. Reverse the order: 25 first (with the new literals registered), then 23 (which will pass the verifier).
- Challenge the success criterion: "A PR CI run with `DEPLOY_VIA_CI` unset SKIPS the deploy steps." This needs to be VERIFIED IN A PR, not just claimed. Add a sub-task: open a draft PR with the workflow change, screenshot the skipped-step badges, paste into the implementation log.

## Attack 5 — Coverage gaps the matrix hides

The Requirements Coverage Matrix at the foot claims every AC is covered. Spot-checking reveals false positives.

- Challenge Req 2.7 ("taxonomy pages render series badge via same component"). The matrix says "covered by 18." Task 18 builds `<SeriesBadge />` but says NOTHING about mounting it on `/blog/tags/[tag]/page.tsx` or `/blog/categories/[category]/page.tsx`. Task 8.1 carves the taxonomy helpers into a new module but doesn't touch the rendering. Task 21 mounts SeriesBadge on `/blog` only ("the blog index page's `<PostCard />` entries") — NOT on the taxonomy pages. Req 2.7 is uncovered. Add a sub-task.
- Stress-test Req 6.6 ("44×44 touch target") coverage of "18, 35". Task 18 says `h-11 w-11`. Task 35 extends `blog-axe.test.ts` but axe-core does NOT validate touch-target sizes by default (that's WCAG 2.5.5 AAA, not in axe-core's default rule set). The matrix promises a touch-target verification that doesn't happen. Either add a Playwright bounding-box assertion to Task 35 explicitly, or admit Req 6.6 is unverified.
- Challenge Req 5.5 ("reduced-motion respect") coverage. Task 18 says "respects `prefers-reduced-motion`" but Task 35's axe extension does not enumerate a reduced-motion test. No Playwright test emulates `prefers-reduced-motion: reduce` and asserts the bar's animation property. This is an unverified claim — add a Playwright case with `page.emulateMedia({ reducedMotion: 'reduce' })`.
- Stress-test Req 10.6 ("`total-byte-weight` assertMatrix + Pagefind exclusion") coverage. Task 36 says "verify the byte-weight report's resource list does NOT contain `pagefind/*` entries." But the success criterion is "resource-list inspection confirms Pagefind is absent" — this is a manual one-time check, not an `assertMatrix` rule. If a future change re-introduces Pagefind into the home-page payload, Lighthouse will not catch it. Demand a mechanical assertion (e.g. a custom audit) or accept that this is a one-shot check, not a regression gate.
- Challenge Req 1.10 ("`/` shortcut scoping") coverage of "19, 31". The shortcut scoping rules (skip when in input/textarea/contenteditable/modifier-held) are stated. Task 31's success criterion mentions ONE of those branches ("`/` does NOT open dialog when focus is in `<input>`"). The other three branches (textarea, contenteditable, modifier-held) are unverified. The matrix overclaims coverage.

## Attack 6 — Tasks 38 + 36 conflate measurement with verification

Task 36 sets Lighthouse thresholds via `B[url] + 100_000 + 0.10 * B[url]`. Task 38 then asserts those thresholds pass. But the BASELINE is measured INSIDE Task 36, so any drift in `main` between Task 36's measurement and Task 38's smoke invalidates the threshold.

- Challenge the claim that thresholds are static. "blog-core's `main`" baseline is captured at one moment. If a blog-core change lands during blog-enhanced implementation that adds 50KB to `/blog`, Task 36's threshold becomes too tight even on a clean blog-enhanced build. The methodology is dependent on blog-core being frozen — but nothing in this task list locks blog-core during implementation.
- Stress-test the formula. `B[url] + 100_000 + 0.10 * B[url]` means the blog-enhanced budget is "blog-core + 100KB + 10%." That's a 10–15% generous allowance, but the actual payload of `<SiteSearch />` lazy imports (`pagefind.js` + `@pagefind/default-ui` could be 200–400KB combined) is NOT included on the index page because they're behind a click. If a future change moves the dialog into an always-rendered surface, the threshold permits it silently. The formula doesn't model the architectural assumption it depends on.
- Challenge Task 38 step 7. "lhci run — all six URLs pass ≥90 across performance/a11y/best-practices/SEO." Lighthouse performance scores fluctuate ±5 points run-to-run even with no code change. A single 89 fails the gate. Either accept retries explicitly (LHCI supports `--upload.numberOfRuns`), or pin the methodology (median of N runs). The task says neither.
- Stress-test the dependency edge from 38 to 36. Task 38 depends on 36 (good) but the smoke ASSUMES Task 36's measurement methodology was correct. There is no independent re-validation in Task 38. If Task 36's baseline run hit a network-flaky CDN, the threshold is wrong and Task 38 inherits it.

---

## Top 5 risks / gaps

1. **Task 6 packs five distinct schema/transform changes** including an unresolved series-order cross-post hook ("Design pins" — i.e. doesn't pin) into one checkbox. Split into 6a–6e or accept multi-day rework when the cross-post hook turns out not to exist in Velite. Concrete failure: implementer spends two days inventing a `prepare` hook, reviewer rejects it, work blocks Tasks 7, 8, 22, 29 simultaneously.
2. **Task 18 bundles 8 components + global CSS + 21 ACs** with "verified visually" as success criterion. This is the highest-risk single task in the document by file count, AC count, and unfalsifiable verification. Concrete failure: implementation lands with subtle theme breakage on `<ReadingProgress />` dark variant, ships green, gets caught by an end user.
3. **Coverage matrix overclaims** Req 2.7 (taxonomy series badge — UNCOVERED), Req 6.6 (axe-core does not verify touch targets — UNVERIFIED), Req 5.5 (reduced-motion — UNVERIFIED), Req 1.10 (only 1 of 4 scoping branches tested). The "best-effort" caveat at the foot does not absolve overclaim. Concrete failure: spec ships marked-complete, three ACs silently uncovered.
4. **Task 23 is the convergence bottleneck** that integrates six independent scripts. The tasks file admits Task 23 inserts a step ("Verify getPublishedPosts callers") that depends on Task 26 — yet Task 23 does not declare a dependency on Task 26. Concrete failure: Task 23 lands, CI fails immediately because the verifier script doesn't exist; or Task 23 lands first with a stub step and the verifier is never wired.
5. **Task 0 spike is a design gate misclassified as Task 0**, and its "success" is a grep-able literal phrase that anyone can echo. The version-pin chicken-and-egg with Task 1 means the spike runs against a version that may not be what gets pinned. Concrete failure: spike "passes" against pagefind 1.2.0, Task 1 pins 1.3.0 (latest stable at implementation time), the mechanism behaves differently, spike validity nullified.

## Top 3 conclusions to challenge or reverse

1. **Reverse: Task 0 is NOT an implementation task.** The doc claims "Failure returns the design to v5." That's the definition of a design-phase gate. Move it to design v4's prerequisites; start tasks at Task 1; the implementation file gets shorter and more honest about what it represents.
   - Reasoning: A task whose failure invalidates the entire downstream plan is not part of the plan — it's a precondition to having a plan. Mixing them encourages reviewers to wave Task 0 through as "logged" while the spike was actually never run with the eventually-pinned version.

2. **Reverse: Task 18's "verified visually" success criterion.** This is the largest task in the document and its only completion gate is a reviewer's eye. The spec workflow's adversarial-review pass exists precisely because "looks fine" is unreliable for 21 ACs across 8 components. Demand mechanical per-component Playwright tests as the success gate; if those tests are too heavy to write per-component, the design has under-specified the verification surface and that needs design-level rework.
   - Reasoning: "Visual verification" in a project that has axe-core, Playwright, and lhci already wired is a regression in rigor. The other tasks (Task 31–35, Task 36) work hard to mechanize verification — Task 18 opts out for no stated reason.

3. **Reverse the dependency direction between Task 23 and Task 25.** Currently Task 25 (verifier extension) depends on Task 23 (ci.yml extension). Make Task 25 land FIRST with the new step literals registered, then Task 23 produces a ci.yml that mechanically passes the verifier. This is the same discipline blog-core enforces.
   - Reasoning: A verifier that lands AFTER the thing it's supposed to verify cannot catch the introduction of the thing. The point of the verifier is regression defense; introducing the literals into the verifier first means Task 23's submission passes a mechanical gate, not a human gate.

## What's missing — work that should be done before acting on this document

- **Split Task 6 into 6a–6e** (or at minimum 6a-schema, 6b-transform-extensions-singular-post, 6c-series-collision). The current shape is non-reviewable.
- **Split Task 18 into per-component sub-tasks** with per-component Playwright smoke. The current shape will land buggy and the bugs will not be caught by the test suite as currently planned.
- **Add tasks for**:
  - Mount `<SeriesBadge />` on taxonomy pages (Req 2.7 coverage gap).
  - Playwright touch-target bounding-box assertion (Req 6.6 coverage gap).
  - Playwright `prefers-reduced-motion: reduce` emulation (Req 5.5 coverage gap).
  - Playwright cases for `/` shortcut suppression in textarea + contenteditable + with modifier (Req 1.10 completeness).
  - GitHub UI runbook step: how to set `PAGEFIND_ENABLED` and `DEPLOY_VIA_CI` repo variables (Task 23 / Task 14 prerequisite).
  - Lighthouse retries / median-of-N methodology decision (Task 38 step 7 flakiness).
- **Resolve the series-order collision hook surface** as a design-level question before Task 6 starts — does Velite expose a post-list-complete hook? If not, the implementation strategy needs design pinning, not a "Design pins at implementation time" hedge.
- **Re-order Task 25 to precede Task 23** so the ci.yml step-literal registry exists before the workflow file is edited.
- **Replace Task 0's grep-able pass-string** with either (a) a CI workflow that runs the spike and produces a signed artifact, or (b) a re-runnable spike script + checksum that Task 1 verifies. The current literal-phrase gate is unenforceable.
- **Add a baseline-freeze policy** for Task 36's Lighthouse thresholds — either pin the baseline commit SHA of blog-core's `main` used for measurement, or accept that thresholds get re-measured during Task 38.
- **Specify the mount site of `<CopyButton />`** in Task 18 OR Task 20. Currently neither task says where the hydrator React component is rendered into the tree.
