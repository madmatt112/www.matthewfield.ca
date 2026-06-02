# Adversarial Review — Playground Tasks (v3, round 3)

You are a principal Next.js / React delivery engineer doing the **third and likely final** adversarial pass on an implementation task breakdown before it is approved for execution. Deep current (2026) expertise in the Next.js 16 App Router, this repo's toolchain (Vitest 4, Playwright, ESLint, `tsc`, Velite, GitHub Actions), CI sequencing, and task-decomposition discipline. Find every remaining weakness — **not** to validate. Two prior rounds closed two execution-blockers and a cluster of precision items; your job is to (a) verify the **v3 deltas** resolve round 2's four findings without introducing new ones, and (b) judge whether the breakdown is genuinely converged and execution-ready or still hiding a gap.

Target: `/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/playground/tasks.md`.
Approved upstream (fixed; flag only contradictions): requirements `.spec-workflow/specs/playground/requirements.md` (v4), design `.spec-workflow/specs/playground/design.md` (v4). Steering: `.spec-workflow/steering/{product,tech,structure}.md`. Repo root `/home/mcf/repo/matthew-field.ca` (Next 16.2.2, Vitest 4). **Read the tasks doc, the design, the requirements, and the relevant live code before attacking.** Ground every finding in a `file:line`/task-number citation.

## Prior review context

Rounds 1–2 are recorded in the rolling memory file `.spec-workflow/specs/playground/reviews/adversarial-memory-tasks.md` and the analyses `adversarial-analysis-tasks.md` (r1) and `adversarial-analysis-tasks-r2.md` (r2). **Read all three before attacking.**

- **Round 1** found 2 blockers (R1 Task 12 needed a `ci.yml` edit; R2 the 6→3 `data-testid` mismatch) + softer items (R3/R4/R5 + alias edges). All accepted, fixed in v2. Round 2 **verified** both blocker-fixes landed — critically confirming the six-fixture panel matches the *asserted computed values*, not just selector names, and the CI steps land in the correct job.
- **Round 2** found no new blocker — four one-line items: (F1, Medium) Task 8 step-5 ran the whole E2E suite; (F2, Low) Task 3 `Success` still said "three" hooks; (F3, Low) `sample-token-target` radius under-specified; (F4, Low/doc) the six-hook set supersedes the design's illustrative three-hook table without a note. **All accepted, fixed in v3** (see the v3 entry in `## Revision history`).

Round 2's bottom line: "If r2's findings are accepted, this breakdown is execution-ready — the architecture/DAG/coverage are converged; only polish remains. Resist manufacturing weak objections."

**Your mandate:** classify each finding **Novel** / **Compounding** / **Recurring**. Do **not** re-mine what rounds 1–2 confirmed sound (the six-fixture assertion match, CI job placement, `/spike` deletion safety, alias-dep edges, button SSR-safety, Task 8/Task 3 atomicity, ordering safety, the `EXPECTED_RADIUS`/`text-sm` post-M1 invariants, `THEME_STORAGE_KEY`, the `check-authoring-docs` append). Re-examine those **only** if v3 changed them. **If the breakdown is converged, say so plainly — do not manufacture a fourth-round objection.** But verify the v3 deltas hard first.

## Analysis dimensions

### 1. Did the four v3 deltas land correctly and completely?
- **F1 (step-5 run command):** v3 scopes Task 8's RGB-pin run to `node scripts/run-e2e.mjs playground-isolation`. Verify against `scripts/run-e2e.mjs` and `e2e/playwright.config.ts`: does `run-e2e.mjs` actually forward a positional arg to `playwright test` such that `playground-isolation` filters to just `e2e/tests/playground-isolation.test.ts`? Is the filter a filename substring Playwright honors, or does it need a path? Confirm both the step-5 body and the `_Prompt` now use the scoped command (no stray un-scoped `run-e2e.mjs` left in Task 8).
- **F2 (Task 3 "three"→"six"):** confirm no remaining "three"/"3 hooks" phrasing anywhere in Task 3 (body, `Success`, `_Prompt`, `_Leverage`) that still implies the old count.
- **F3 (`sample-token-target` radius):** v3 pins `var(--radius)` to `border-radius`. Verify against the live test which exact computed property the radius assertion reads (`borderRadius`? `borderTopLeftRadius`?), and whether "applied to `border-radius`" produces the value the assertion expects (`"10px"`). Confirm `var(--primary-foreground)` is still on the fixture (v3 reworded the bullet — check nothing was dropped).
- **F4 (design-table supersession note):** v3 records that the six-hook set supersedes `design.md:415-420`. Verify accuracy: does the design table really list three, and does the design's prose actually license "equivalent hooks needed to host the migrated assertions" so this is a refinement, not a contradiction of an approved doc?

### 2. Did the v3 edits introduce any NEW inconsistency?
- Cross-read the v3 revision note against the Task bodies it describes — does every claim match the actual edited text (the scoped run command, the six-hook `Success`, the radius pin)? Find any place a v3 wording updated one location but left a stale contradictory statement.
- Re-scan the whole doc for any remaining stale count, stale path, or `Success:`/body contradiction the three rounds didn't catch.

### 3. Genuine convergence check
- After verifying the four v3 deltas, sweep the breakdown once more for an *execution-blocking* gap all three rounds missed: a task whose `Success` is unreachable, a missing dependency edge, a requirement with no gate, a `_Prompt` a fresh agent can't execute, or an ordering hazard under strict one-at-a-time-with-review execution. If you find one, name it precisely with a citation and a concrete failure scenario.
- If the only remaining items are cosmetic or explicitly deferred-to-implementation, **state that the breakdown is converged and execution-ready**, and list anything the implementer must carry forward. Do not invent a structural objection to justify a third round.

## Deliverables

- **Top risks/gaps** (as many as are real — likely 0–2), each with a concrete failure scenario, a `file:line`/task citation, and a Novel/Compounding/Recurring tag.
- **Top conclusions to challenge or reverse** (or an explicit statement that none remain).
- **What's missing** before execution — or an explicit "nothing blocking; converged."

Be specific and concrete. Cite failure scenarios, not abstract risks. If something is fine, say so briefly and move on. A converged verdict is an acceptable and expected outcome of a third round if the evidence supports it — do not pad.

After the analysis, **write the updated rolling memory file** to `.spec-workflow/specs/playground/reviews/adversarial-memory-tasks.md` (cumulative, round-3 dated), then write your analysis to `/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/playground/reviews/adversarial-analysis-tasks-r3.md`.
