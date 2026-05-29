# Adversarial Review Memory — requirements
Last updated: 2026-05-28 (after v3 review)

## Cumulative Findings Summary

### Accepted (addressed in v3)
- **v2 finding 1 — `<dl>` semantic mismatch**: v3 Req 5.5 replaces `<dl>/<dt>/<dd>` with `<ul>/<li>` carrying `<a>` + `<p class="resource-note">`. The Pagefind-extractor conflict is also resolved by the change.
- **v2 finding 2 — intermediate h2 text/visibility punted**: v3 Req 2.3 retracts the intermediate `<h2>Card list</h2>` entirely. Page structure is `<h1>` → cards' `<h2>` directly; the `<ul role="list">` carries `aria-labelledby="page-heading"` for grid context.
- **v2 finding 3 — card heading slot is `repo`, not `title`**: v3 Req 2.4 swaps them. `<h2>` carries `title`; `repo` is a sub-line. (See r3 Finding 3 for surviving sub-element-choice question.)
- **v2 finding 4 — `role="status"` wrong for permanent empty state**: v3 Reqs 2.9 / 5.7 retract `role="status"` and use `<section aria-labelledby="empty-state-heading">` with `<h1>` retained in both populated and empty branches.
- **v2 finding 5 — Req 8.2's `prepare` hook claim is factually wrong** (HIGH-SEVERITY): v3 retracts the `prepare`-hook wiring and replaces with a `package.json scripts.check:authoring-docs` + `scripts/check-authoring-docs.mjs` standalone script invoked from CI. The footnote explicitly cites `velite.config.ts:400-458` correctly. (Surviving issues: see r3 Finding 4 — dev/CI asymmetry, escape rules, integration test tautology.)
- **v2 finding 6 — build warning invisible in CI**: v3 upgrades to GHA annotation `::warning file=...::` PLUS non-zero exit in CI. (Surviving issue: escape rules not specified — r3 Finding 4b.)
- **v2 finding 8 — required `added` creates seed-date pathology**: v3 Req 8.1 adds the canonical heading `## Seeding added for legacy bookmarks`; Req 5.3 acknowledges the degenerate alphabetical-within-category sort case explicitly.
- **v2 finding 9 — `added` has no upper bound**: v3 Req 4.2 adds `.refine((d) => new Date(d) <= now())`. (Surviving issue: timezone semantics — r3 Finding 5.)
- **v2 finding 10 — Req 4.4's identifier substitution glosses an asymmetry**: v3 introduces a shared error-contract section with the parameterized identifier-display-eligibility rule (MIN_DISPLAY = 2 after trim). (Surviving issue: the floor is dead code under any valid schema — r3 Finding 2.)
- **v2 finding 11 — Req 1.2 cap rationale stale**: v3 Req 1.2 rewrites the cap-rationale to "enum cardinality minus one — explicitly the same arithmetic as Req 3.2's 'at most one slot is unused' statement; the cap and Req 3.2 say the same thing in two different ways." Consistent.
- **v2 finding 12 — `id="contrib-N"` unstable**: v3 Req 2.4 adds the explicit anchor-stability disclaimer with cross-reference to Req 10.6. (Surviving issue: r3 Finding 3 — the disclaim is broader than the actual cause.)
- **v2 finding 13 — Pagefind marker acceptance test is a tautology**: v3 removes the `data-pagefind-body` marker entirely from both pages (Introduction "Explicitly out of scope" cites the drop with rationale).
- **v2 finding 14 — `<dl>` + Pagefind extractor conflict**: resolved by v2 finding 1's `<ul>/<li>` switch.
- **v2 finding 15 — Req 10.7 misses quick-takedown**: v3 Req 10.7 spells out two known limitations (staging-rebase friction; removal-latency = one CI+deploy cycle) and the no-`draft`-doesn't-solve-takedown framing. Out-of-scope section also explicitly lists "quick takedown with sub-CI-deploy latency" as deferred.
- **v2 finding 16 — Req 1.4 → Req 3.1 / Req 4.4 cross-reference fragility**: v3 introduces a top-level "Shared Build-Time Error-Message Contract" section referenced by anchor from Reqs 1.4 / 3.1 / 4.4. (Surviving issue: extension-point clause unstructured — r3 Finding 2.)
- **v2 finding 7 — unit test does not exercise integration**: v3 Req 8.2 adds an "integration coverage" line for a CI smoke test. (Surviving issue: smoke-test assertion is tautological — r3 Finding 4e.)

### Partially Accepted (carried forward from v2 into v3)
- **i18n / non-ASCII silence**: v3 Req 10.8 now explicitly locks the English-only, ASCII-only-for-slugs policy and acknowledges Unicode in free-form `title`/`description`. Closes the v2 carry-over.

### Rejected
- (none — all v1/v2 findings have been addressed or carried forward into v3's surviving compounding issues)

### Unresolved (v3 findings, pending v4)
- **r3 Finding 1 — Recurring HIGH-SEVERITY**: NFR Performance claims "quarterly cadence … mirroring the project-showcase Req 12 pattern" but project-showcase Req 12 is **count-based (every Nth project addition, N=3)** and `scripts/check-lighthouse-cadence.mjs` is a count-delta gate, not a time-based gate. The cited commit `72462c5` is a parser-bug fix, not the pattern introduction. **Same class of false-precedent error as v2 finding 5; recurring across two reviews.**
- **r3 Finding 2 — Compounding**: Shared error-message contract under-specifies (a) non-string JSON-stringified serialization (quoted strings indistinguishable from quoted numbers), (b) multi-line/newline truncation, (c) `MIN_DISPLAY = 2` floor that is dead code, (d) extension-point appendix structure.
- **r3 Finding 3 — Compounding**: Req 2.4 sub-line uses `<span class="contrib-repo">` without engaging with `<code>` as the semantically correct alternative for a code-styled identifier. Also: anchor disclaim is broader ("MAY change for any reason") than the actual cause (sort-position drift), making the anchor effectively useless. Also: repo sub-line has no semantic landmark for screen-reader navigation.
- **r3 Finding 4 — Novel**: Req 8.2 wiring has (a) unspecified CI step position, (b) unspecified GHA annotation escape rules for the file-scoped `::warning file=...::` form (no precedent in this repo — only bare `::warning::<msg>` is used), (c) dev/CI silent-fail path (local exit 0, CI exit 1 — Matthew can dismiss local warning and ship), (d) empty-doc-file edge case unspecified, (e) integration test asserts tautologically.
- **r3 Finding 5 — Novel**: `added` upper-bound `.refine()` has unaddressed UTC-timezone semantics — wall-clock "today" in non-UTC timezones can land in the future per UTC and fail the refine. Also: future-date asymmetry with contributions' `date` (resources rejected, contributions accepted) is uncalled-out.
- **r3 Finding 6 — Recurring**: Empty-state literal text "or near-identical author-revised wording" is the same half-lock as v2's intermediate-h2 punt. Also: v3 silently dropped the v2 "meta description uses the same curated string as the populated branch" clause.
- **r3 Finding 7 — Novel**: Closed `category` enum extension-friction concerns (typo-blast-radius at higher cardinality; category-rename external-link silent-no-op; no expected addition-cadence guidance).
- **r3 Finding 8 — Recurring**: Acceptance-test pinnability surviving ambiguity is the "or near-identical" hedge (Finding 6) and the design-phase `kind`-default labels.
- **r3 Finding 9 — Novel**: Req 9.1 cites `src/config/site.ts:33-72` by line range, fragile to file edits; should cite by symbol.

## Patterns & Themes
- **False precedent claims (HIGH-SEVERITY pattern across v2 and v3)**: v2 cited a `prepare`-hook pattern that didn't exist; v3 cites a "quarterly cadence" pattern that doesn't match the count-based mechanism actually in place. **Reviews MUST verify every "same pattern as X" claim against source.** Two consecutive reviews exposing this pattern means the next review's discovery would be a third-strike launch-blocker.
- **Half-locked structures pattern**: v2 introduced half-locks (structure mandated, text/visibility punted). v3 closed several (Req 2.3 intermediate h2 dropped; Req 5.5 `<ul>/<li>` locked; Req 2.9/5.7 empty-state structure locked) but reopened the empty-state TEXT half-lock with "or near-identical author-revised wording." Pattern recurs across versions.
- **Underspecified serialization formats**: v3 introduces a shared error-message contract but under-specifies several edge cases (non-string serialization, multi-line truncation, MIN_DISPLAY purpose, extension-point appendix). Centralizing the contract moved the fragility, not eliminated it.
- **Dev/CI asymmetry as silent-fail vector**: v3 introduces a "warning-only local, error in CI" wiring for the author-doc check. Same friction problem the dev/CI parity argument is supposed to avoid, just inverted.
- **ARIA / semantic-HTML precision**: v3 caught some issues (dropped `role="status"`; switched to `<ul>/<li>`) but introduced new ones (`<span>` over `<code>` for code-styled identifiers; no semantic landmark for the repo sub-line).
- **Citation fragility**: v3 cites multiple commits (`72462c5`, `df5aacb`) and line ranges (`site.ts:33-72`, `velite.config.ts:400-458`). Commit hashes can be inspected; line ranges drift with file edits. Future requirements should cite by symbol or by commit-stable anchors.

## Guidance for Next Review (v4)
**Focus areas — novel attack angles:**

1. **Verify the NFR Performance cadence claim is resolved**. If v4 keeps "quarterly," verify there is an actual mechanism (not just a runs-log convention). If v4 switches to count-based, verify the script-reuse and runs-log adoption align with the existing pattern. **This is the highest-priority focus — recurring HIGH-SEVERITY.**
2. **Stress-test the shared error-message contract serialization**: pass a `description: 42` (number that should be a string), `description: null` (null payload), `description: |\n  line\n  break` (multi-line), `description: "  "` (whitespace) through the contract mentally and assert the error message is unambiguous in each case.
3. **Pressure-test the Req 8.2 dev/CI asymmetry**: if v4 keeps it, expect this finding to escalate. If v4 picks "both fail" or "pre-commit hook bridges the gap," verify the unit tests cover the chosen path.
4. **Verify the empty-state text decision is forced**. If v4 keeps "or near-identical," this is a recurring half-lock — escalating to launch-blocker.
5. **Examine the `<code>` vs `<span>` decision for the repo sub-line** if v4 picks one. If v4 doesn't engage, flag as half-locked.
6. **Verify the UTC-timezone semantics for `added`'s upper-bound refine**: v4 should specify the comparison anchor (UTC build date) and acknowledge the wall-clock failure mode.
7. **Verify any new commit/line-range citations** in v4 against current source. v3 has at least two (`72462c5`, `site.ts:33-72`); v4 may have new ones.
8. **Verify CI workflow step position** for the new `check:authoring-docs` script if v4 specifies it.

**Areas that have been well-covered (don't re-discover):**
- Velite `s.yaml()` issue, schema envelope, empty-payload handling (the four file states), sort order with three tiebreakers, comparator testability, page heading-level chain (h1 → h2), hero-card / nav-item existence, Pagefind cross-spec dependency (dropped entirely), closed-enum blast radius, no-draft rationale + quick-takedown framing, the `dl` vs `ul` decision, `role="status"` retraction, the heading-slot swap (`title` not `repo`), the writeup link-kind precedent, the Req 1.2 cap rationale, the anchor non-stability for both pages, the `added` upper-bound rejection, the seed-date pattern.

For each new finding, classify as:
- **Novel**: not in v1, v2, or v3 review.
- **Compounding**: deepens a v1/v2/v3 finding.
- **Recurring**: same issue as v1/v2/v3 but not actually fixed. **Recurring after three prior reviews is a launch-blocker.**

## Severity escalation log
- v2 finding 5 (`prepare`-hook claim factually wrong): **RESOLVED in v3** — wiring retracted, replaced with `package.json scripts.check:authoring-docs` + `scripts/check-authoring-docs.mjs`, footnote cites the actual `velite.config.ts:400-458` evidence.
- **r3 Finding 1 — NEW HIGH-SEVERITY recurring**: "Quarterly cadence mirroring project-showcase Req 12" is a false-precedent claim. The actual Req 12 mechanism is count-based (N=3), not time-based; `scripts/check-lighthouse-cadence.mjs` is a count-delta gate; the cited commit `72462c5` is a parser fix. Same CLASS of error as v2 finding 5 — "same pattern as X" without verifying X. **Two consecutive reviews surfacing this class of error. v4 MUST verify all precedent claims against source or this escalates to a third-strike launch-blocker.**
- r3 Finding 6 — Recurring half-lock pattern on empty-state text. Second review surfacing the half-lock pattern (after v2 finding 2). If v4 keeps "or near-identical author-revised wording," this finding escalates to launch-blocker on the recurring rule.
