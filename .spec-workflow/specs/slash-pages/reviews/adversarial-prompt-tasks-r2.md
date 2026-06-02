# Adversarial Review — slash-pages `tasks.md` (v2, round 2)

You are a **principal engineer and release manager** brought in cold to break this implementation task breakdown before a fresh-context implementer executes it. You have no stake in the plan. Your job is to find every way it will fail to produce a correct, complete, build-green implementation — not to validate it. Be ruthless, specific, concrete: cite the exact task number, file, and the failure scenario. If something is genuinely fine, say so in one line and move on. Do not manufacture objections to hit a count.

## Target document

- `/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/slash-pages/tasks.md`

## Prior review context

This is the **second** adversarial round on `tasks.md`. The v1 round verified every citation against live code, found **no structural defect, no stale citation, no ordering bug**, and concentrated its findings on `Success:`-gate rigor plus one convention shortfall. All v1 findings were **accepted and resolved in v2**.

Before attacking, read:
1. The rolling memory: `/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/slash-pages/reviews/adversarial-memory-tasks.md` (the cumulative record of what prior rounds found and how it was resolved).
2. The v1 analysis: `/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/slash-pages/reviews/adversarial-analysis-tasks.md`.

The **v2 deltas** you must scrutinize most (these are new and unreviewed):
- **Task 2** now pins `process.env.TZ = "America/Toronto"` and **dynamically imports** `formatContentDate` after, to make the UTC test a genuine regression guard.
- **Task 16** now adds an **`AxeBuilder` axe/WCAG pass** per page per theme, citing `AXE_TAGS` from `blog-axe.test.ts`.
- **Task 5** now **inlines** the full four-item self-test checklist (incl. a `writeDocs` code block) instead of referencing design.md.
- **Task 6 Success** strengthened to cover the colophon body; **Task 14 File line** fixed; a **route-task ↔ E2E coupling note** added near the footer-semantics section.

**Classify each finding** as **Novel** (not seen before), **Compounding** (deepens a prior finding), or **Recurring** (a prior finding that is NOT actually resolved — escalate severity). Focus your energy on the v2 deltas and any genuinely novel issue; do not re-report resolved v1 findings as if new. Ground every attack in live code, not the document's own assertions.

## Analysis dimensions

### 1. The v2 TZ-pinned regression test (Task 2) — does it actually work?
- Stress-test the ESM mechanics: vitest hoists static `import`s, but Task 2 relies on `process.env.TZ` being set **before** a **dynamic** `import("./format-date")`. Verify that the module-level `Intl.DateTimeFormat` constant truly reads `TZ` at construction, and that a dynamic import inside a test (or `beforeAll`) evaluates the module *after* the env mutation — i.e. the module hasn't already been loaded/cached by another test in the same file (e.g. the existing loose-regex case importing `formatContentDate` statically would evaluate the module once, caching it before the TZ is set).
- Challenge whether the existing static-import test and the new dynamic-import test can coexist in one file without the static import poisoning the module cache. If they cannot, name the fix (separate test file, `vi.resetModules()`, etc.) and whether Task 2 specifies it.
- Verify `America/Toronto` actually produces "May 28" for the un-fixed formatter (DST/offset reasoning) so the guard genuinely goes red pre-fix.

### 2. The v2 axe pass (Task 16) — citation and integration accuracy
- Verify `AXE_TAGS` is actually **exported** from `blog-axe.test.ts` (or wherever) and importable, and that `AxeBuilder` / `@axe-core/playwright` is a real dependency. If `AXE_TAGS` is a local non-exported const, the task's "reuse the existing AXE_TAGS constant if exported, else mirror" hedge must resolve to something concrete — challenge whether that hedge leaves the implementer guessing.
- Challenge whether running axe on `/sitemap` and `/slashes` (deliberately `noindex`, link-list pages) adds value proportionate to the convention, or whether the five-page-times-two-theme axe matrix is now heavier than the "smallest spec" framing claims. Is this scope creep introduced by the review, or genuinely warranted?

### 3. Task 5's inlined checklist — internal consistency
- Cross-check the inlined `writeDocs` helper and the four CLI assertions against the new `main(AUTHORING_DOCS)` contract described in the same task. Find any contradiction (e.g. does the "neither doc written → two stderr lines" assertion match a `main()` that `continue`s per missing doc? does the zero-byte `warningCount === <subjectDoc>.headings.length` hold when the sibling is written full-present?).
- Verify the inlined code references (`ALL_PRESENT`, `CANONICAL_HEADINGS`, `SLASH_PAGES_HEADINGS`, `SUBJECT_REL`) are all defined or derivable within the task, not dangling.

### 4. Residual atomicity / ordering / coverage (anything v1 or v2 missed)
- Re-examine the DAG and `_Depends on:` edges in light of the v2 edits — did adding the axe pass or the TZ test change any dependency (e.g. does Task 2 now need a dependency, does Task 16 need a new dev-dependency install task)?
- Audit the Requirements Coverage Matrix once more for any AC whose covering task's `Success:` still does not mechanically prove it after the v2 changes.
- Look for any genuinely novel gap the first round missed: a task that touches a file not in its File: list, a missing test for a load-bearing behavior, a steering-doc violation.

## Deliverables

1. **Top risks/gaps** (up to 5), severity-ordered, each with task number, concrete failure scenario, and a specific fix. Mark each Novel / Compounding / Recurring.
2. **Top 3 conclusions to challenge or reverse**, grounded in live code.
3. **What's missing** before this document is implementation-ready.
4. If the document is genuinely converged (the v2 deltas are correct and no novel blocker exists), **say so plainly** — do not invent a structural objection to justify a third round.

Be specific and concrete — cite failure scenarios, not abstract risks.

After your analysis, **update the rolling memory file** at `/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/slash-pages/reviews/adversarial-memory-tasks.md` per the format in the methodology (Accepted / Partially Accepted / Rejected / Unresolved, Patterns & Themes, Guidance for Next Review), incorporating your v2 findings.

Write your complete analysis to:

`/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/slash-pages/reviews/adversarial-analysis-tasks-r2.md`
