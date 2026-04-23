# Task Review Memory — Task 27 (site-foundation)
Last updated: 2026-04-23T16:13:00Z (after v2 review)

## Cumulative Findings Summary

### Still Present (recurring/compounding in latest review)
- (none)

### Addressed (present earlier, not found in latest)
- v1 [warning] No explicit count assertion for 6 hero cards (e2e/tests/landing.test.ts:11) — fixed by adding `sections.getByRole('link').toHaveCount(6)`
- v1 [warning] Unescaped RegExp for accessible-name matching is fragile (e2e/tests/landing.test.ts:16) — fixed by switching from `new RegExp(card.title)` to plain-string `name: card.title`
- v1 [info] Relative import path instead of @/ alias (e2e/tests/landing.test.ts:3) — intentionally unchanged; matches sibling e2e/tests/navigation.test.ts convention (no ts-path resolver configured for the Playwright runner). Not counted as "still present" because it is a documented project-level convention rather than a regression.

### New in Latest Review (v2)
- [info] Click tests verify URL change but not destination page rendered (e2e/tests/landing.test.ts:28) — sibling navigation.test.ts pairs `toHaveURL` with an H1 role assertion; this suite skips that second check, so a client-side URL-only transition or silent 404 on a destination page would not be caught here.
- [info] Click destinations driven entirely from siteConfig.heroCards — no cross-check against the explicit paths in the task prompt (e2e/tests/landing.test.ts:28) — a bad href in siteConfig would still pass because the test both reads and asserts from the same source. `toHaveCount(6)` already escapes this tautology for cardinality; paths do not.

## Patterns & Themes
- The author responds quickly and correctly to explicit, actionable v1 warnings — both were fixed with minimal, targeted diffs and no scope creep.
- Remaining gaps are all about strengthening assertions, not correcting defects: the test as written exercises the correct surfaces but verifies a narrower slice than sibling suites.
- Config-driven testing is a recurring theme here — it is correct per R6 AC4 (hero cards are data-driven) but creates a tautology risk any time the test and the production code read from the same config. The v2 addition of a hardcoded `toHaveCount(6)` is the right counter-pattern and could be extended to paths.

## Guidance for Next Review
- Focus areas if v3 lands:
  - Whether destination-page rendering gets asserted (or a conscious decision is logged to leave it out).
  - Whether heroCards path expectations get hardcoded or cross-checked against siteConfig.navItems (R6 AC2 parity with R4 AC2 mapping).
- De-prioritize:
  - Cardinality assertion (done).
  - RegExp escaping / accessible-name selector style (done).
  - Relative import path — this is a suite-wide convention, not a per-task issue; stop re-raising unless the convention changes.
