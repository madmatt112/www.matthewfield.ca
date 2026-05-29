# Adversarial Review Memory — tasks

Last updated: 2026-05-29 (after v2 review, responded in tasks.md v3)

## Cumulative Findings Summary

### Accepted (all r1 findings were accepted and addressed in tasks.md v2)
- **Risk #1 — rendering layer had zero render tests; Req 2.6/3.7 `aria-labelledby`↔`id` wiring split across Tasks 15/16, verified by neither (r1).** Response: Tasks 15 & 16 each gained a colocated `.test.tsx`; Task 16's Success now requires `getByRole("group")` to have an accessible name equal to the card `<h2>` text (proves the wiring; a `contrib-` vs `contrib_` typo fails the test). Tooling (`@testing-library/react`, jest-dom, jsdom) confirmed present in package.json.
- **Risk #2 — Task 5 had no restriction forbidding global `strict: true` in `defineConfig` (r1).** Response: added explicit "do NOT set any `strict` key in defineConfig" to Task 5 body + Restrictions.
- **Risk #3 — sitemap `maxOr` empty-array `.reduce` crash on the launch `[]` data (r1).** Response: Task 20 now pins "no bare `.reduce` without initial value" + an empty-collection test (both `[]` → `now` fallback, no throw).
- **Risk #4 — Task 9's three-exemption (fixture + tsconfig-exclude + eslint-off) atomicity only implied; split commit leaves intermediate commit red (r1, Req 1.9).** Response: Task 9 Restrictions now pin "ONE commit, never split."
- **Risk #5 — Task 3 oversized single checkbox hiding 7 contract sub-functions incl. the defect-prone v3 schema-walk (r1).** Response: added 7 explicit sub-deliverables (a–g) as a tracked checklist, each requiring its own unit test; Success now enumerates the `["links",0,"kind"]` schema-walk-FOUND test + a `ZodPipeline` traversal case. Kept as one file/one task to avoid the same-file two-task coupling r1 itself warned against.
- **Risk #6 — new scanner test file omitted from Task 8 allowlist (parity gap with projects) (r1).** Response: Task 8 allowlist now includes `check-content-chokepoint.test.ts`; Task 10 Restrictions pin "read canary via `fs.readFileSync` only; RegExp-literal sentinels, no inline import-shaped strings."
- **`eslint.config.mjs` shared-edit coupling between Tasks 7 and 9 undeclared (r1).** Response: coupling note added to both Task 7 and Task 9.
- **Orphan: loader `test:/\.(ya?ml)$/` forward-coupling not documented for future YAML-collection authors (r1).** Response: Task 21 author-doc now includes the forward-coupling note (register schema in `makeContentYamlLoader`).
- **Matrix overstated Task 26 as the verifier for 1.4/4.4/10.1 (r1, conclusion 1).** Response: matrix note added — durable committed V is Task 4's loader tests; Task 26 is a one-time launch-gate.
- **Task 25 should be explicitly non-blocking (r1, conclusion 3).** Response: Task 25 retitled "OPTIONAL — non-blocking," body states nothing gates on it.
- **Cosmetic: `5 → 6.5` numbering (r1).** Response: renumbered Task 6.5 → 6 throughout (DAG, footers, matrix).

### Accepted (r2 findings, all addressed in tasks.md v3)
- **r2 #1 (blocking, Compounding on r1 #1) — render tests don't run: `vitest.config.ts` has no `setupFiles`, so jest-dom matchers (`toHaveAccessibleName`) are unregistered.** Response: v3 dropped jest-dom entirely from Tasks 15/16; assertions are now deterministic DOM checks (`getAttribute("aria-labelledby")`, `querySelector("#contrib-"+index).textContent`) that need no setupFiles — same approach as the existing `src/canary.test.tsx`. No `vitest.config.ts` change required.
- **r2 #2 (Novel) — `toHaveAccessibleName` over cross-element `aria-labelledby` is false-confidence in jsdom.** Response: subsumed by the #1 fix — the deterministic assertion replaces accname entirely.
- **r2 #3 (Compounding on r1 #3) — Task 20 empty test was at the wrong layer (isolated `maxOr`, would stop exercising empty path once Task 6 seeds data).** Response: v3 pins a dedicated `src/app/sitemap.empty.test.ts` with a file-scope `vi.mock("#site/content", {contributions:[],resources:[],...})` calling the real `sitemap()` default export — mirrors `projects.empty.test.ts`.
- **r2 #4 (Novel) — description-constant length test guarded a copy ("re-declared in test" escape).** Response: v3 single-sources `CONTRIBUTIONS_DESCRIPTION`/`RESOURCES_DESCRIPTION` — exported from `src/lib`, imported by the page, lib test asserts the exported constant; "re-declare" escape removed from Tasks 12/13/17/19.
- **r2 #5a (Compounding on r1 #5) — Task 3(e)'s `ZodPipeline` traversal is untriggerable by real data.** Response: relabeled as defensive/synthetic coverage (not a production path) with an explicit note.
- **r2 #5b — a–g checklist still atomic `[x]`.** Response: Task 3 Success now requires seven named `describe` blocks (a)–(g) as a grep-able partial-completion guard (kept as one task to avoid the same-file two-task coupling r1 warned about — an accepted trade-off).
- **r2 #6 (minor) — Task 23 cadence seed value could fire spuriously.** Response: restriction added to seed the runs-log initial entry with the actual launch count (0 when `[]`), not a placeholder.

### Partially Accepted
- (none)

### Rejected
- (none — r1 and r2 were both high-quality, well-grounded; every finding was actionable)

### Unresolved
- (none outstanding from r1 or r2)

## Patterns & Themes
- r1 confirmed **task↔design fidelity is strong**: the three load-bearing Velite corrections (per-entry schema, validate-don't-transform `isoDate`, loader-as-validator) are pinned as enforceable restrictions backed by downstream gates. The DAG and per-task footers were verified mutually consistent (r1 and r2 both).
- The dominant weakness class across r1+r2 was **"asserted, not tested" / tested-at-the-wrong-layer / testing-tooling-not-actually-wired** — verification that looks present but doesn't execute or doesn't guard the real artifact. v2 and v3 progressively converted each instance into a real, executable gate (deterministic DOM assertion; real-`sitemap()` empty test; single-sourced exported constant).
- A secondary class was **load-bearing facts living only in design.md prose but not in any task** (the `strict:true` rejection, the `maxOr` guard, the loader forward-coupling). v2/v3 lifted them into Restrictions/task bodies.
- r2's most valuable move was **ground-truthing against the actual repo config** (`vitest.config.ts` has no `setupFiles`; `canary.test.tsx` avoids jest-dom; `projects.empty.test.ts` is the empty-collection idiom). The lesson: assertions must match the repo's ACTUAL test harness, not an assumed one.

## Guidance for Next Review (r3 focus)
- **Two adversarial rounds have now converged**: r1 closed coverage/ordering gaps, r2 closed test-harness-reality gaps. Both reviews found NOTHING in the three Velite corrections, the DAG/footer consistency, or the no-coupling decisions — those are **well-covered, do NOT re-litigate**.
- **Scrutinize the v3 deltas specifically**: (a) are the deterministic DOM assertions in Tasks 15/16 actually expressible with the repo's `@testing-library/react` + core vitest `expect` (no jest-dom) — e.g. is `getByRole("group")` reliable, or should it be a `querySelector("[role=group]")`? (b) Does the v3 `sitemap.empty.test.ts` `vi.mock` enumerate ALL symbols `sitemap.ts` imports (a partial mock leaves real `#site/content` reads)? (c) Did single-sourcing the description constant into `src/lib` create any NEW issue — e.g. does the page now import a value AND the helpers from lib cleanly, any chokepoint interaction, or a Task 17/19 vs 12/13 ordering edge? (d) Is the "seven describe blocks" manifest actually enforceable or still just prose?
- **Diminishing returns watch**: if r3 finds only cosmetic/nitpick issues or must reach for increasingly improbable failure scenarios, SAY SO plainly — the document may have converged. Do not manufacture findings to fill a quota. A short "this has converged; here are the only residuals" is a valid and valuable r3 outcome.
- Classify every r3 finding as **Novel / Compounding / Recurring**; escalate any Recurring (unresolved-from-r1/r2). Note: r1 and r2 both left nothing unresolved, so a true Recurring finding would be notable.
