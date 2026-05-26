# Adversarial Analysis — project-showcase/tasks.md (v1)

Senior delivery lead review. Primary attack surface: atomicity, ordering, coverage. Document is long (28 tasks + matrix), so 5 risks below.

---

## Targets attacked

### Target 1 — Task 6 ordering: "contract test written BEFORE Task 7"

The header line for Task 6 reads "written BEFORE Task 7 wires the imports" and the body says "Until Task 7 lands, the import-test will fail … That failure is informational." This is a delivery anti-pattern dressed up as discipline.

- Challenge the claim that a "deliberately red" test sitting in the repo between Tasks 6 and 7 is harmless. CI in this repo runs vitest on PRs (per blog-core's dual-build topology). If Tasks 6 and 7 are committed in separate PRs — or even separate commits inside one PR with `git bisect` semantics in mind — main will be red after Task 6 lands and green only after Task 7. Bisecting any future regression that touches `next.config.ts` or either error module will tar-pit on this window.
- Stress-test the assumption that "CI does not run until both Task 7 and this test are complete." Nothing in this document binds Task 6's commit to Task 7's commit. The implementation log + log-implementation flow marks tasks done one at a time. A reviewer approving Task 6 in isolation has no mechanism preventing merge.
- Reject the framing "the test pins the contract Task 7 will satisfy" — TDD-style red-first is fine in a working branch, but committing the red test to the same merge target as the production code (Task 7) is the only safe shape. Either (a) renumber so Task 7 lands first and Task 6 second, or (b) explicitly bundle 6+7 into one commit/PR and say so in both task bodies.
- Stress-test the diagnostic claim. When the test fails today (no `project-errors` module yet), the error is `Cannot find module './src/lib/project-errors'` — that's a setup error, not a contract-violation diagnostic. The test does not yet prove what it claims to prove until Task 7 has compiled successfully against the imports.

### Target 2 — Task 8 atomicity: schema + transform + heading-hygiene + draft warning in one task

Task 8 ("Add the `projects` Velite collection with schema + transform + heading-hygiene check + draft-warning emit") spans Components 1 and 2 of the design, lists 8.a / 8.b / 8.c / 8.d sub-blocks, covers 16 requirement IDs (1.1, 1.2, 1.3, 1.4, 1.6, 1.7, 3.1, 3.2, 5.1, 5.2, 5.7, 5.8, 6.9.a, 6.9.b, 6.9.c, 7.2.c), and is the precondition for Tasks 9, 10, 14, 19, 24, 25, 26, 27, 28.

- Challenge the claim that this is one atomic task. It is at minimum four: (i) schema definition + `linkSchema`, (ii) the five-step transform pipeline, (iii) `checkProjectHeadings` AST walker, (iv) draft-warning emit. Each could fail review independently and each has a different reviewer profile (Zod author, Velite plugin author, unified/mdast specialist, build-log UX).
- Stress-test recovery from partial failure. If review finds the heading-hygiene helper rejects valid input (e.g. wrong handling of `mdxJsxFlowElement` capitalization), the entire task gets reopened. The implementation log convention then requires re-marking 8 in-progress, which silently invalidates Tasks 9 and 19 that may already be marked [x].
- Stress-test the prompt's "Restrictions: NO module-scope dedup Set in velite.config.ts — single-process is sufficient." Velite invokes `.transform` per-file but the build process is one Node process — this is true *today*. The v1 footer history at line 7 cites this as a "Risk 3 reversal" but nothing in the task body documents the rollback path if a future Velite version moves to worker threads. The pin is correct for current Velite but the comment trail belongs in code, not just the spec.
- Stress-test the claim "Heading-hygiene check is AST-only — no text scan of `meta.content`." Component 2 (per the design refs) is implemented "inside `velite.config.ts`" as a sibling helper. Velite passes the parsed AST OR the raw content? The task body says "Parse `meta.content` with unified" — that IS a text scan being re-parsed. The constraint as worded is internally inconsistent.
- Challenge the coverage claim. Req 6.9.d ("no custom MDX component registry") appears nowhere in Task 8's coverage list but the Requirements Coverage Matrix (line 601) credits Tasks 8 and 17 for 6.9.d. Task 8's body does not actually do anything about MDX component registration — it's a non-action that nothing tests. Either add a negative assertion to Task 9 or move 6.9.d to Task 17 only.

### Target 3 — Task 28 as a 21-dependency catch-all

Task 28 lists `_Depends on: 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27` — i.e., literally every other task except 1–7. It bundles: dual-build smoke, fixture-render screenshot, Lighthouse manual run, JSON-fragment citation contract.

- Challenge the claim that this is a "task." A task with 21 dependencies and 4 distinct verification artefacts (build outputs, screenshot, Lighthouse JSON, E2E results) is a release-gate, not a unit of work. Splitting reduces the blast radius when Lighthouse comes in at 88 and Task 28 has to stay open while the screenshot is re-shot.
- Stress-test the fixture-render screenshot ask. Task 19's fixture has `draft: true`. Task 28 step 1 builds with `PROJECTS_INCLUDE_DRAFTS=1`. Step 2 explicitly verifies the fixture 404s without drafts. The screenshot can ONLY be taken in step 1's build state. The task doesn't say which step the screenshot runs against — implicit step 1, but a careful reader cannot tell whether the screenshot represents the production deploy.
- Stress-test "Lighthouse re-verification cadence: per Req 12, Lighthouse re-runs after every 3rd published project." This is a recurring contract, not a one-shot task action. Burying it in Task 28's prompt is the wrong place — it should be a follow-up task or a calendar reminder. Marking Task 28 [x] cannot satisfy a forward-looking cadence; the [x] would be a lie about the future.
- Stress-test "if a score is `<90`, open a follow-up task to investigate." The task is marked done on opening the follow-up — meaning a Lighthouse fail is registered as "task complete." That's exactly backwards for a release gate.

### Target 4 — Task 25 / 26 / 27 share `.velite/projects.json` reads without dependency edges to each other

Tasks 25, 26, 27 all read `.velite/projects.json` to derive the expected slug or card count. They depend on 19 (fixture) and 22/23/24 (consumer pages). They do NOT depend on each other and they CAN run in parallel.

- Stress-test the implicit shared-fixture assumption. Task 26 says "or use a `<svg viewBox>` if iframe is impractical" — implying Task 19's fixture body might gain or lose elements during implementation. Task 25's empty-state assertions, Task 26's wide-media measurements, and Task 27's draft toggling all read from the same Task 19 file. If Task 19 is amended mid-stream to add the iframe, the existing screenshot baseline (Task 28) silently shifts.
- Stress-test the parameterization claim. Task 25 says "the test reads `.velite/projects.json` after `pnpm build`" — but `.velite/projects.json` is produced by `pnpm velite build` (a sub-step), not the full `pnpm build`. The blog-core dual-build topology runs `velite build` as a pre-step. If a future CI change reorders this, the file may not exist when Playwright reads it. The skip-if-absent escape in Task 9 is NOT mirrored in Tasks 25-27.
- Challenge the ordering pin in the document preamble: "next.config wiring → Velite collection". Task 7 (next.config) depends on Tasks 4, 5, 6 but NOT on Task 8 (Velite). Task 8 depends on Task 1. So next.config-wiring and Velite-collection are actually independent branches. The preamble's "ordered so dependencies flow naturally" framing implies linearity that does not match the DAG. Reviewers may serialize unnecessarily.

### Target 5 — Requirements Coverage Matrix has at least three orphan ACs

The matrix at lines 532-652 says "Any requirement ID not appearing in this matrix is presumed uncovered." Walk it.

- Req 1.5 (author-controlled `updated`) is credited to Task 8 only. Task 8's body covers `updated optional ISO date` in the schema but no task verifies the editorial guidance or that `updated` is author-controlled vs. system-set. Req 1.5 is about behavior, not just schema presence — the test substrate is missing.
- Req 1.9 (typed `#site/content` consumption) is credited to Tasks 8, 10, 11. Task 8 produces the collection; Task 10 consumes it via type derivation; Task 11 scans for the consumption pattern. Nothing actually tests that the derived `Project` type is correct (e.g., that `links` is `ProjectLink[] | undefined`, not `unknown[]`). A type-only test (e.g., `expectTypeOf`) is absent.
- Req 7.2.d ("Unit tests exercise all branches") is credited to Task 14, which lists Case 2 covering production / production+draft / local. But the AC says "ALL branches" — including the four-way truth table from the looks-like-prod variant. Task 14 Case 5 ostensibly does this but the case enumeration mixes guard-throwing with filter-behavior. The distinction between "draft filter case" (7.2.b) and "guard throw case" (7.3) is blurred — a reviewer cannot tell which AC each subcase satisfies.
- Req 3.6 (same-domain CSP) is credited to "22, 23 (no change beyond consumer wiring)" — the parenthetical admits no task does this work. If no task touches CSP, this is an orphan with a fig leaf. Either drop the credit and accept the AC is satisfied by pre-existing infrastructure (and say so in requirements.md, not here) or add a verification step.
- Req 12 "Code architecture/modularity" is credited to "2, 10, 16" — three implementation tasks. Nothing verifies the SRP claim ("No business logic in page files beyond data wiring") at test time. A negative grep test or import-graph check is absent. The matrix treats implementation as coverage; it should distinguish "implements" from "tests."

---

## Top 5 risks/gaps

1. **Task 8 is too large to review or roll back atomically.** Schema + transform + heading-hygiene helper + draft-warning emit + 16 requirements + 8 downstream dependents in one [x] checkbox. Decompose into 8a/8b/8c/8d as discrete checkbox tasks, each with its own _Depends on_ edge, OR explicitly accept the blast radius and document the recovery procedure.

2. **Task 6's "deliberately red until Task 7" framing is unsafe.** Either land 6 and 7 in one commit/PR (and say so), or reorder. As written, main can be red between merges, which corrupts `git bisect` on every future regression touching the wired modules.

3. **Task 28 conflates release-gate verification with task completion.** A Lighthouse score of 88 should NOT allow marking [x] with a follow-up. The acceptance criterion needs to be: "Score ≥90 OR Task 28 stays open." The "re-verification cadence after every 3rd project" contract belongs on a recurring tracker, not in this task's prompt.

4. **Heading-hygiene helper consistency.** Task 8.c's "Restrictions: AST-only — no text scan of `meta.content`" contradicts its own body ("Parse `meta.content` with unified..."). Re-parsing the raw text IS the AST extraction path here, so the restriction wording is misleading. Reword to clarify that the AST walk is the sole inspection mechanism (no regex pass over the source text).

5. **Coverage matrix conflates implementation with verification.** Req 3.6, Req 12 SRP claims, Req 1.5 author-controlled `updated`, and Req 1.9 type-correctness are credited to implementation tasks without any task that *tests* them. The matrix's own "presumed uncovered" rule says these need either a verification task or an explicit "satisfied by pre-existing infrastructure" annotation.

---

## Top 3 conclusions to challenge or reverse

1. **Reverse Task 6's ordering pin.** The document explicitly says the contract test ships before Task 7. This must either become a commit-pair contract (Task 6 + Task 7 land together, atomic merge) or Task 7 must land first and Task 6 second. Reasoning: a red test on main between merges poisons `git bisect` and provides a false signal to anyone running the test suite in that window. The "informational failure" defense is delivery-lead handwaving.

2. **Reverse the bundling in Task 28.** The single-task framing of "smoke + screenshot + Lighthouse + cadence" should be three or four discrete tasks: (28a) dual-build smoke + chokepoint negative test, (28b) fixture-render screenshot capture + commit, (28c) Lighthouse run with a hard pass/fail gate, (28d) cadence tracker created (issue, calendar, or recurring task). Each artefact has different evidence and a different reviewer.

3. **Challenge the "Tasks are ordered so dependencies flow naturally" preamble (line 3).** The actual dependency graph is a DAG with at least two independent branches (next.config wiring 4→5→6→7 and Velite collection 1→8). The preamble's linear narrative misrepresents what an implementer can parallelize. Either rewrite as "Tasks are listed in a topological order; the DAG below shows true dependencies" with an actual DAG, or explicitly serialize the document's prose to match the listed order.

---

## What's missing — work before acting on this document

- **A bundled-merge contract for Tasks 6+7.** State explicitly that these two checkboxes share a single commit (or PR) and may not be marked [x] independently. Adjust the implementation-log workflow guidance to allow paired-task entries.
- **Decomposition of Task 8.** Either split into 8a (schema), 8b (transform), 8c (heading-hygiene), 8d (draft warning) with proper _Depends on_ edges and individual coverage lists, or add a "recovery procedure" sub-section to Task 8 documenting what happens when one sub-block fails review after later tasks are already done.
- **A type-correctness test referenced by Req 1.9.** Add a `expectTypeOf<Project["links"]>().toEqualTypeOf<ProjectLink[] | undefined>()` (or similar) assertion to Task 14, OR add a new task. Today the matrix says 1.9 is covered when it is only consumed, not type-tested.
- **A Lighthouse hard gate.** Either move the ≥90 acceptance into Task 28's Success criterion as a blocker (not "open a follow-up"), or move the Lighthouse step to a separate task that can stay open without blocking the spec from being marked complete.
- **A DAG diagram or explicit parallelism note.** The preamble's "ordered so dependencies flow naturally" should either include a Mermaid DAG or call out the two independent branches (config-wiring chain vs. Velite-collection chain) so implementers don't serialize unnecessarily.
- **Decision on Task 6's failure semantics.** If the contract test is meant to be informational-only until Task 7, scope it via `describe.skip` until Task 7 lands, or guard the import with a try/catch that emits a different diagnostic. As written, Task 6's test passes when broken in misleading ways.
- **Clear ownership of Req 3.6, 6.9.d, 10.1–10.6, 11.4.** These are credited to documentation tasks (17) or to "consumer wiring" with no mechanical verification. Either accept them as documentation-only (and say so explicitly in the matrix's legend) or add verification tasks.
- **A rollback note for the velite single-process draft-emit pin.** Task 8.d's "no per-worker dedup state" assumption depends on Velite running single-process. If a future Velite upgrade moves to worker threads, this design breaks silently. Add a runtime check (`process.pid` log line in CI) or an explicit comment-in-code that pins the assumption.
