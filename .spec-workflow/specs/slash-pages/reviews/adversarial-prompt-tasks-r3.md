# Adversarial Review — slash-pages `tasks.md` (v3, round 3)

You are a **principal engineer and release manager** brought in cold to break this implementation task breakdown before a fresh-context implementer executes it. You have no stake in the plan. Find every way it will fail to produce a correct, complete, build-green implementation — do not validate it. Be ruthless, specific, concrete: cite the exact task number, file, and the failure scenario. If something is genuinely fine, say so in one line and move on. **Do not manufacture a structural objection just to justify another round** — if the document is converged, say so plainly; a false "blocker" is itself a failure of this review.

## Target document

- `/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/slash-pages/tasks.md`

## Prior review context

This is the **third** adversarial round on `tasks.md`. Round 1 (no structural defect; `Success:`-rigor + one axe gap) and round 2 (one real **blocker** — the v2 TZ-test was inert — plus two nicks) both verified citations against live code. **All r1 and r2 findings were accepted and resolved in v3.**

Before attacking, read:
1. The rolling memory: `/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/slash-pages/reviews/adversarial-memory-tasks.md` (cumulative record + per-round resolutions).
2. The r2 analysis: `/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/slash-pages/reviews/adversarial-analysis-tasks-r2.md`.

The **v3 deltas** (new, unreviewed — scrutinize these first):
- **Task 2** now puts the regression guard in a **dedicated new file `src/lib/format-date-tz.test.ts`** (no static `format-date` import; `process.env.TZ = "America/Toronto"` set before the lone dynamic import; relies on per-file vitest isolation), and forbids both adding the guard to `format-date.test.ts` and using `vi.resetModules()`.
- **Task 5** now defines `SUBJECT_REL`/`subjectHeadings` inline and requires the production `::warning::` to interpolate the per-doc `rel`, with the self-test asserting the warning contains `SUBJECT_REL`.
- **Task 16** `_Leverage`/`_Prompt` now say to **copy** the local (non-exported) `setupTheme`/`assertTheme`/`THEME_STORAGE_KEY`/`AXE_TAGS` idiom rather than import it.

**Classify each finding** as **Novel**, **Compounding**, or **Recurring** (a prior finding NOT actually resolved — escalate). Focus on the v3 deltas and any genuinely novel issue; do not re-report resolved findings as new.

## Analysis dimensions

### 1. The v3 dedicated TZ test file (Task 2) — does the re-fix actually hold?
- Verify the new-file approach truly fixes the r2 blocker: confirm `vitest.config.ts` does **not** set `isolate: false` (and uses the default per-file worker isolation), so `src/lib/format-date-tz.test.ts` gets a fresh module registry and the dynamic `import("@/lib/format-date")` constructs the formatter under the pinned `TZ`.
- Stress the remaining escape hatches: does the new file transitively pull in `format-date` through any *other* static import (a shared test helper, a setup file, `vitest.config.ts` `setupFiles`)? Does setting `process.env.TZ` in module scope actually take effect before the dynamic import resolves in Node's ICU/Intl (is the timezone read at `Intl.DateTimeFormat` construction, which happens inside the awaited module)?
- Challenge whether "verify once locally that it goes RED" is a real gate or an un-enforceable manual step that could rot — is the regression genuinely guarded *in CI* now, or only demonstrable by hand?

### 2. Task 5 — the inlined self-test after the v3 edits
- Re-check internal consistency now that `SUBJECT_REL`/`subjectHeadings` are defined: do the four CLI assertions still hold against a `main(AUTHORING_DOCS)` that reports all docs? In particular, the "one heading missing → `::warning::` contains `SUBJECT_REL`" assertion assumes the production message interpolates `rel`; confirm nothing else in the task contradicts that (e.g. the doc-not-found stderr line vs the `::warning::` line — are they distinguishable, and does the "neither doc → two stderr lines, no `::warning::`" case still pass?).
- Challenge whether requiring the warning to *contain* `SUBJECT_REL` could false-pass if `SUBJECT_REL` is a substring of the sibling path or vice versa (it isn't, but verify the two `rel`s are not confusable).

### 3. Residual coverage / ordering / atomicity (anything all three rounds missed)
- With Task 2 now creating a new test file, re-check the `File:` lists, the DAG, and `_Depends on:` edges for any drift introduced by the v3 edits.
- Audit the Requirements Coverage Matrix once more: after the v3 changes, is every AC's covering-task `Success:` still a mechanical gate where claimed? Is any AC now double-counted or orphaned?
- Look for any genuinely novel gap none of the three rounds caught: a load-bearing behavior with no test, a task touching a file absent from its `File:` line, a steering-doc violation, a build-ordering hazard.

## Deliverables

1. **Top risks/gaps** (up to 5), severity-ordered, each with task number, concrete failure scenario, and specific fix. Mark each Novel / Compounding / Recurring.
2. **Top 3 conclusions to challenge or reverse**, grounded in live code.
3. **What's missing** before this document is implementation-ready.
4. **A clear convergence verdict.** If the v3 deltas are correct and no novel blocker exists, state that the document is **converged / implementation-ready** in plain words. Three rounds in, the prior is that this small, well-grounded document is at or near convergence — only declare a blocker if you can cite the exact line and the concrete failure it causes.

Be specific and concrete — cite failure scenarios, not abstract risks.

After your analysis, **update the rolling memory file** at `/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/slash-pages/reviews/adversarial-memory-tasks.md` per the methodology format, incorporating your v3 findings and a convergence note.

Write your complete analysis to:

`/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/slash-pages/reviews/adversarial-analysis-tasks-r3.md`
