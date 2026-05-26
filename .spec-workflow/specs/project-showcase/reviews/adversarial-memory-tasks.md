# Adversarial Review Memory — tasks
Last updated: 2026-05-26 (after v3 review)

## Cumulative Findings Summary

### Accepted
- Task 8 too large to review/rollback atomically (v1 Target 1): closed in v2 — split into 8.1/8.2/8.3/8.4 with discrete checkboxes, dependency edges, and reviewer profiles.
- Task 28 conflates release-gate with checkbox (v1 Target 3): closed in v2 — split into 28.1/28.2/28.3/28.4 with 28.3 as a hard gate (≥90 or task stays open).
- Preamble misrepresents linear ordering vs. DAG (v1 Target 3, Conclusion 3): closed in v2 — preamble rewritten as topological-order narrative + Mermaid DAG.
- Heading-hygiene "AST-only" wording inconsistency (v1 Target 2, Risk 4): closed in v2 — Task 8.3 reworded.
- Coverage matrix conflated implementation with verification (v1 Risk 5, Target 5): closed in v2 — matrix legend [I/V/P/D] introduced.
- Type-correctness test for Req 1.9 presence (v1 Target 5): closed in v2 (Case 12 added), tightened in v3 — `toEqualTypeOf<Image>` replaces `toMatchTypeOf` (closes r2 Target 2 sub-finding).
- Author-controlled `updated` (Req 1.5) verifier presence (v1 Target 5): closed in v2 (Case 13 added), tightened in v3 — positive shape regex + widened negative grep (closes r2 Target 2 sub-finding at the surface; see Unresolved for the deeper indirection issue).
- Velite single-process draft-emit assumption documentation (v1 missing-work): closed in v2 — inline comment in Task 8.4.
- Task 14 overload (r2 Target 2): closed in v3 — split into 14.1/14.2/14.3 by reviewer profile.
- Task 28.4 firing mechanism commitment (r2 Target 4): closed in v3 — Option C pinned, three artefacts (script + log + workflow) committed (closure is structural; see Unresolved for functional issues with trigger choice and fixture-counting).
- Multi-fixture decision (r2 Target 5): closed in v3 — second non-draft fixture `fixture-published-second.mdx` added with earlier date.
- `[V — structural only]` marker for Req 11.3 (r2 Target 6): closed in v3 — added to matrix legend, applied to Req 11.3.

### Partially Accepted
- Paired-merge contract for Tasks 6+7 (v1 Target 1, escalated in r2 Target 1): v3 adds Task 6.5 (`scripts/verify-paired-merge.mjs`) as a CI gate. Real mechanical enforcement at merge-time, but the script explicitly no-ops on direct-push-to-main (so post-merge reverts bypass), excludes `blog-errors.ts` despite Task 6's test asserting blog-errors's exports too (mis-diagnosed failures), is fragile to file renames (hard-coded paths), and is under-specified for squash-merge / merge-queue contexts. Closure narrower than v3 claims.
- Skip-if-absent CI-green-when-broken window (r2 Target 3): v3 adds Task 19.5 (`scripts/check-velite-output.mjs`) as a fail-loud pretest gate AND gates the in-test `test.skip()` calls on `process.env.CI !== "true"`. Real defense-in-depth. Remaining gaps: stale `.velite/projects.json` not detected (file exists, gate passes, but reflects deleted source); the two CI step copies (Build 1 / Build 2) are not structurally pinned (a refactor could drop one).

### Rejected
(none — v1/r2 findings were addressed or partially addressed; r3 raises new issues rather than re-litigating)

### Unresolved (raised in r3)
- **Task 6.5 verifier's revert/rename/squash gaps (r3 Target 1)**: explicit no-op on push-to-main bypasses the revert case r2 flagged; hard-coded path list breaks silently under rename refactors; asymmetric file set (no `blog-errors.ts`) mis-diagnoses; merge-queue interaction under-specified.
- **Case 13 indirection from the actual AC (r3 Target 2)**: positive shape regex is brittle to `.describe()` chains / whitespace variants; the regex-based schema-block extraction itself is fragile; widened negative grep still misses dynamic-import-via-variable, `node:child_process`, alternative git wrappers, `.git/` reads. The actual AC (Req 1.5: build-output-level author-controlled `updated`) is one indirection removed from what is verified.
- **Task 28.4 trigger choice + fixture-counting (r3 Target 3)**: `push to main paths: 'content/projects/**/*.mdx'` fires on every mdx edit, not just cadence events; signal degrades. Script counts fixtures (including `fixture-published-second.mdx`) as published projects — off-by-N at the cadence. First-run verification does not exercise the red case.
- **Task 27 sitemap assertion asymmetric (r3 Target 4)**: only the negative case (draft absent) is explicit; positive case (published-second present) implicit. Reverse-chrono assertion still degenerate in Build 2 (one card). Neither fixture exercises `PROJECTS_ALLOW_H4=1`.
- **Task 19.5 stale-file blind spot (r3 Target 5)**: gate passes if `.velite/projects.json` exists but reflects deleted source; CI step duplication not structurally pinned; the "second tripwire" in tests is dead code under the canonical failure mode.

### Recurring (escalated)
- **Canary ↔ regex-list pair-update contract (r2 Target 2 sub-finding → r3 Target 6)**: still prose-only in v3 despite v3 applying the mechanical-gate pattern (Task 6.5) to the structurally identical 6+7 pair. Asymmetric application of the same closure principle. Severity escalated.

## Patterns & Themes
- **Mechanical-gate-as-prose-at-the-seam**: v3 swapped many prose pins for tool gates (6.5, 19.5, 28.4 workflow). But the gates themselves contain hardcoded file paths, hardcoded fixture-vs-published assumptions, and hardcoded trigger choices. The enforcement layer moved up one level; the underlying coupling-by-convention pattern persists at the new seam.
- **Closure-scope overstated in revision history**: v3's revision history claims each closure (6.5 closes r2 Target 1, 19.5 closes r2 Target 3, 28.4 closes r2 Target 4) but each closure is narrower than the original finding's scope. Reviewers reading the revision history alone get a misleading "all closed" picture.
- **Asymmetric application of closure principles**: 6.5 mechanically gates Tasks 6+7's coupling. The same coupling exists between Task 12 (canary) and Task 14.2 Case 9 (regex list). The mechanical gate was NOT applied symmetrically.
- **Fixture footprint vs. coverage trade-off**: v3 added a second fixture to fix degenerate sort. The footprint (2 MB of cover assets) sets a precedent. Coverage of `PROJECTS_ALLOW_H4=1` is still uncovered at E2E level; adding a third fixture trades footprint for branch coverage.
- **Indirection between verifier and AC**: Case 13 verifies a proxy (schema source shape) for an AC stated at build-output level. The matrix legend's `[V — structural only]` precedent (new in v3 for Req 11.3) suggests a `[V — implementation-surface only]` or `[V — indirect]` marker for Case 13 would be honest.

## Guidance for Next Review

### Focus areas
- **Are Task 6.5's revert/rename/squash gaps addressed?** Look for branch-protection rules, revert-shape detection, or extended path tracking.
- **Has Case 13 been replaced with a runtime fixture assertion** (write `updated:` in frontmatter, build, assert `.velite/projects.json` matches verbatim)?
- **Is Task 28.4's trigger changed** to `workflow_dispatch` + a step in the existing CI workflow, AND does the script exclude fixture files from the count?
- **Is Task 27's Build-2 sitemap assertion symmetric** (positive case AND negative case explicit)?
- **Is the canary ↔ regex-list pair-update mechanically gated** (Task 6.5 extended OR a new Task 14.4)?
- **Are 19.5's two CI steps structurally pinned** (a test asserts the step name appears exactly twice in ci.yml)?

### Areas well-covered (don't re-examine)
- Task 8 / Task 28 / Task 14 decomposition — well-handled across v2/v3.
- Coverage matrix legend (including `[V — structural only]`) — well-handled.
- DAG/preamble — well-handled.
- `toEqualTypeOf<Image>` for Case 12 — well-handled in v3.
- Skip-if-absent gated on `CI !== "true"` — well-handled.
- Multi-fixture presence (1 draft + 1 published) — well-handled at the existence level; per-fixture coverage gaps are different findings.
