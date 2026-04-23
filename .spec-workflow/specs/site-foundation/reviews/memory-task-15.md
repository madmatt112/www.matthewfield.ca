# Task Review Memory — Task 15 (site-foundation)
Last updated: 2026-04-20T21:24:00Z (after v2 review)

## Cumulative Findings Summary

### Still Present (recurring/compounding in latest review)
- v1, v2 [warning] R9 AC3 verification not achieved in task 15 — v1 flagged the @theme block as runtime-dead (src/app/layout.tsx:3 still imports the scaffold); v2 redirected the verification to task 16 but left R9 AC3 in task 15's _Requirements line (tasks.md:141), so closure still claims an AC that hasn't been met in-task
- v1, v2 [info] Regeneration-command provenance drift — v1 noted tokens.css was extracted via `--defaults` while task 15 used `--base radix --preset nova --yes --force`; v2 updated globals.css's comment to pin the latter command but tokens.css (src/styles/tokens.css:2) still documents `--defaults`, so the two comments now actively disagree
- v1, v2 [info, hygiene] new-york style / neutral base conflation — v1 flagged it in globals.css:19, v2 removed it from globals.css but reintroduced it in d-7790c25b's Context (the phrasing "neutral preset's scaffold" and "shadcn's new-york destructive Button variant" sit in the same paragraph)

### Addressed (present earlier, not found in latest)
- v1 [warning] muted/muted-foreground failing AA normal-text in light mode — recorded as deferral d-0d979b2d against R5 AC5
- v1 [warning] destructive-foreground token absent, contrast pair unverifiable as specified — recorded as deferral d-7790c25b against R5 AC5

### New in Latest Review (v2)
- [info] Deferral d-142fd010 defers the arithmetic itself, not just a decision — the composited /60 destructive contrast number was never computed, so R5 AC5's dark-mode destructive pair has no numerical bound (.spec-workflow/deferrals/d-142fd010.md:19)

## Patterns & Themes
- The implementation leans heavily on deferrals to close R5 AC5 gaps. Two of the three deferrals (d-0d979b2d, d-7790c25b) are legitimate scope decisions (match shadcn upstream rather than diverge). The third (d-142fd010) uses the deferral to skip work rather than defer a decision — worth distinguishing, since "we chose not to compute X" reads identically to "we don't know whether X passes" in the artifact trail.
- Scope / accounting hygiene is the recurring weak point: v1 called out file-level provenance drift, v2 compounded it (comment mismatch between tokens.css and globals.css) and added a new accounting mismatch (task 15 _Requirements still lists R9 AC3 while the work has moved to task 16).
- Narrative hygiene repeats across artifacts: the "new-york / neutral" conflation v1 flagged in globals.css reappeared verbatim in d-7790c25b's Context. When rewording a recurring gotcha, check sibling artifacts for the same phrasing.

## Guidance for Next Review
- Focus areas: (1) is R9 AC3 explicitly removed or annotated in task 15's _Requirements line, and does task 16 carry unambiguous ownership? (2) does d-142fd010 now include the computed composited ratio, or is the deferral still just a placeholder? (3) are tokens.css and globals.css regeneration comments aligned on a single shadcn init command?
- De-prioritise: the structural correctness of the @theme block (mappings, ordering, @layer playground preservation) — v1 already validated this and v2 didn't change it. Contrast math for the non-deferred pairs (foreground/background, primary, secondary at the non-large threshold, muted in dark) was verified in v1 and hasn't been touched.
- Watch for: new commits that touch src/app/layout.tsx (the real R9 AC3 test becomes possible once the import flips) and any changes to button.tsx that would invalidate d-7790c25b's "text-white hardcoded" premise.
