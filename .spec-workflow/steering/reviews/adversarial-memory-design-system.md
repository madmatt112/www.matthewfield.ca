# Adversarial Review Memory — design-system
Last updated: 2026-06-06 (v5 authored; r5 pending)

## Cumulative Findings Summary

### Accepted — addressed in v3 (verify, do not re-discover)
v1-A pair-level contrast (matrix deferred); v1-B a11y contract; v1-C Lighthouse category/median/CWV;
v1-D coherence-as-target + concrete-value boundary; v1-E status roles + state conventions; v1-F
governance contradiction resolved in code + Radix upstream policy; v1-G playground = cascade/stacking
scope; v2-A spacing source-of-truth; v2-B breakpoints `sm`–`2xl`; v2-C image/icon a11y; v2-D
chart/sidebar reserved; v2-E "surface" disambiguated; v2-F measure as mobile-shrinking ceiling.

### Accepted — addressed in v4 (r3, verified against repo)
r3-1 status roles demoted to needed-but-deferred (only `destructive` defined); r3-2 "near-neutral"
(was falsely "zero-chroma"); r3-3 perf gate honest about CI; r3-4 route coverage stated as partial;
r3-5 matched-pair qualified + no-flash mechanism deferred; r3-meta governance review-item downgraded
+ automated check named. **r4 confirmed r3-1 and r3-2 fixes hold (active-roles list now matches
tokens.css/@theme exactly; near-neutral accurate).**

### Accepted — addressed in v5 (r4, verified against repo)
- **r4-1** v4 *over-corrected* r3-3: said "Performance is the only assertion" but `lighthouserc.js`
  asserts FOUR categories at 0.9. v5: removed all description of current CI state from the gates.
- **r4-2/r4-3** "Non-Negotiable Gates" oversold — `lhci` runs on `deployment_status` not as a PR
  check; keyboard/reduced-motion/forced-colors have no automated check. v5: section now states the
  **standards** the design must meet, explicitly notes enforcement/coverage is `tech.md`/CI's domain
  and that several bars are manual-review-only today.
- **r4-4** CI-upgrade deferrals were filed under "design spec" but are tooling = `tech.md`'s domain.
  v5: re-pointed CI gate upgrades + active-role↔token check to `tech.md`/CI.
- **r4 should-fix** inlined CI trivia (`numberOfRuns`, `disableTransitionOnChange`) violated altitude.
  v5: removed. Components "error = the status roles" → "error = `destructive`".

### Rejected / pushed to spec or tech.md (not steering altitude)
Computed pairing matrix, full breakpoint maps, data-viz contract → design spec. CI enforcement
mechanisms/thresholds → tech.md/CI. (Declined inlining any into steering.)

### Open for r5
- Did removing CI-state description leave the gates as durable **standards** (good) or as vague
  aspirations with no teeth (bad)? Judge whether "standard + pointer to tech.md" is the right steering
  altitude or an evasion.
- Any residual self-contradiction from the v5 edits; whether the WCAG ratio numbers (≥4.5:1/≥3:1)
  are correctly kept as standards (they are durable, not CI trivia) vs. anything still mis-placed.

## Patterns & Themes
- The dominant recurring vein across r1→r4 was the **gates section**: gates against undefined nouns
  (r1/r2) → overclaim CI (r3) → underclaim CI + oversold "non-negotiable" (r4). v5's fix is
  structural: steering states standards, `tech.md`/CI owns enforcement. r5 should judge whether that
  finally closes the vein or merely relocates it.
- Highest-value findings came from **verifying against the actual repo**. r5 must do the same.

## Guidance for Next Review (r5)
- **Do NOT re-discover** any v1/v2/r3/r4 finding — verify each holds; flag **Recurring (escalate)**
  only if a fix is cosmetic/reintroduced.
- **Verify against code** (`tokens.css`, `globals.css`, `lighthouserc.js`, `lhci.yml`, ThemeProvider).
- **Novel focus:** standards-vs-aspiration altitude of the rewritten gates; any new contradiction
  from the v5 softening; correctness of what remains asserted; whether the doc is now converged.
- This is the 5th review of a steering doc with a v6 cap — be honest if it is converged; do not
  manufacture findings to keep the loop alive (MINOR-only ≠ must-fix).
