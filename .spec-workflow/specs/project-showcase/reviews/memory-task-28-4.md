# Task Review Memory — Task 28.4 (project-showcase)
Last updated: 2026-05-28T18:46:00Z (after v2 review)

## Cumulative Findings Summary

### Still Present (recurring/compounding in latest review)
- v1 [info→critical] Cadence-log latest-entry parser ordering (scripts/check-lighthouse-cadence.mjs:69) — v1 logged this as info/hygiene "note for future runs"; v2 analysis shows it is a functional defect. The parser reads the FIRST/top "Published projects at run time: N" line, but docs/projects-showcase-lighthouse-runs.md:7-8 instructs appending new runs at the BOTTOM. Result: guard can never be cleared after first fire. Reported at correct severity (critical), not escalated for recurrence.

### Addressed (present earlier, not found in latest)
- v1 [critical] Missing both workflow run URLs (AC clause ii) — RESOLVED. Implementation log now cites run 26593496468 (negative/main) and run 26593546255 (positive/feature branch). Remote confirmed as madmatt112/www.matthewfield.ca; positive branch verified to contain 3 non-fixture published delete-me-cadence-{1,2,3}.mdx (draft:false, slugs do not match ^fixture-). URLs not network-verified but plausible.
- v1 [warning][hygiene] Implementation log omits local smoke-test record — log now references the two prior local-tmpdir simulation entries; treating as addressed.

### New in Latest Review (v2)
- [warning] Modulo gating skips cadence on non-multiple counts (scripts/check-lighthouse-cadence.mjs:89) — `currentCount % CADENCE_N === 0` couples firing to absolute multiples of 3, not delta-since-last-run; batch adds (e.g. 0→4) silently skip the trigger. Redundant with `delta >= CADENCE_N`.
- [warning] Success criterion "CI runs green at launch state" NOT met — `pnpm format:check` fails on main (88 files, exit 1); cited negative-case run conclusion is `failure`. Cadence STEP green but CI RUN red; main is broken-windows.
- [warning] Scope creep — eslint.config.mjs changes (no-restricted-imports exemptions + pagefind ignore) unrelated to cadence deliverable, bundled to unblock runs.
- [info] Cadence step not literally the workflow's "final step" (ci.yml:135) — followed by Pagefind + deploy chain. Functionally fine (blocks deploy on failure) but contradicts restriction wording.
- [info][hygiene] Self-contradictory comment block (scripts/check-lighthouse-cadence.mjs:57-65) — symptom of the parser/doc ordering defect.

## Patterns & Themes
- Core spec artifacts (script, runs-log, ci.yml step) were committed in the big end-to-end commit 36569ad; the v4 iteration's tree work was URL capture + a bundled CI/eslint fix (df5aacb). The script itself was NOT touched in v4, so v1's parser observation persists unchanged.
- Recurring theme: the cadence LOGIC (parser ordering + modulo gating) is the weak point, not the CI wiring. Both defects are latent — they pass the narrow launch-state ACs (count=0, nothing fired yet) but break the moment the guard is meant to do real work.
- Verification has improved (real URLs now), but "green CI" was claimed while the run conclusion was actually failure — watch for AC claims that conflate step-level success with run-level success.

## Guidance for Next Review
- PRIMARY: confirm the parser fix. The unblock procedure (append run entry below) MUST clear the guard. Verify by simulating Run 1=0 + Run 2=N appended below → script must read N. Reconcile the script comment with the runs-log doc so they state ONE ordering contract.
- Confirm the modulo clause is removed or justified — trigger should be delta-based.
- Confirm "CI runs green at launch state" by checking the actual run conclusion, not just the cadence step (format:check must pass; main is currently red on it).
- Well-covered, de-prioritize: ci.yml step name verbatim ("Check Lighthouse cadence" present line 135), workflow_dispatch present (line 8), fixture filter `!/^fixture-/` present (script line 54), URL citation. These are settled.
