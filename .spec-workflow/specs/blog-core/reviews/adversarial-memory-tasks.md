# Adversarial Review Memory — tasks
Last updated: 2026-05-19 (after v3 review)

## Cumulative Findings Summary

### Accepted
- HTML-comment trap (v1 Attack 1): carve-out for comment-shaped html nodes moved into Task 4.2's rejection visitor; multi-line carve-out test added in v3 per r2 review. Status: v3 incorporated.
- CDATA dual-assertion (v1 Attack 2): Task 14 now pins BOTH raw-string CDATA framing regex AND parsed-tree assertion with `cdataPropName: '__cdata'`. Status: v2 incorporated.
- Helpers placement (v1 Attack 5): moved to `src/lib/build/*.ts` (TypeScript). Status: v2 incorporated.
- Task 4 monolith (v1 Attack 4): split into 4.1–4.4. Status: v2 incorporated.
- Shiki variable-name pin (v1 Attack 3): Task 9 pins `--shiki-light`/`--shiki-dark` literally; v3 acknowledges Task 28 IS the deferred verification gate and requires re-runs of Tasks 24 + 26 on patch. Status: v3 incorporated (but see Unresolved — value-comparison still missing in re-run).
- CI env-var step-scoping (v1 Attack 6): Task 20 pins per-step; v3 adds Task 20.5 mechanical verifier. Status: v3 incorporated (but see Unresolved — step-name matching is fragile, workflow-level env uncovered).
- siteConfig audit (v1 What's-missing): Task 5 added. Status: v2 incorporated.
- Static-asset audit (v1 What's-missing): Task 6 commits fixture-image.svg. Status: v2 incorporated.
- e2e server-boot pin (v1 What's-missing): Task 20 documents step-level env-var contract; v3 drops "defense-in-depth" framing and reframes as "forward-compat pin." Status: v3 incorporated.
- Body-parity HTML parser (v1 What's-missing): Task 27 pins `node-html-parser`. Status: v2 incorporated.
- Sentinel framing (v1 Attack 6): Task 18 documents sentinel as defense-in-depth; v3 inverts touch ordering in Task 20 (per r2 Attack Surface 3) so sentinel signals "Build 1 reached cleanup-eligible state." Status: v3 incorporated.
- Task 6 ↔ Task 4.1 ordering pin (v2 Attack 1): explicit `Depends on: 4.1` footer added to Task 6. Status: v3 incorporated.
- Task 16 Vercel-log surface (v2 Attack 2): manual verification step added with quarterly cadence reminder. Status: v3 incorporated.
- Runbook drift (v2 Attack 2): Task 6.5 introduces `src/lib/blog-errors.ts` with shared constants imported by Tasks 7 and 16. Status: v3 incorporated (but see Unresolved — helper framed as "optional").
- CI topology mechanical defense (v2 Attack 3): Task 20.5 adds `scripts/verify-ci-topology.mjs`. Status: v3 incorporated (but see Unresolved — step-name matching is fragile, workflow-level env uncovered).
- Sentinel ordering inversion (v2 Attack 3): Task 20 touches sentinel immediately after `pnpm build` succeeds. Status: v3 incorporated.
- Task 9 vs Task 28 deferral pattern (v2 Attack 4): Task 9 acknowledges Task 28 IS the verifier; Task 28 mandates re-runs of Tasks 24 + 26 on patch. Status: v3 incorporated (but see Unresolved — re-run doesn't compare hex values).
- Task 22 tautological identity (v2 Attack 5): Task 22.5 adds synthetic-input walker-self test for `countWordsFromMdast`. Status: v3 incorporated (but see Unresolved — construction substrate unpinned, `inlineCode` disambiguation missing).
- Task 22 substrate pin (v2 Attack 5): Task 22 pins reading from `#site/content` (not raw .mdx). Status: v3 incorporated.
- Requirements coverage matrix (v2 Attack 6): added at document foot. Status: v3 incorporated (but see Unresolved — matrix is procedural, not mechanically verified).
- Multi-line HTML-comment carve-out (v2 Attack 1): added to Task 4.2 success criterion. Status: v3 incorporated.
- Task 6 image alt text (v2 Attack 1): pinned literally as `Placeholder fixture image`. Status: v3 incorporated.
- `_Requirements:` footer semantics (v2 Attack 6): clarified at document head as "contributes to satisfying." Status: v3 incorporated.

### Partially Accepted
- (none yet — first re-review since v2; user has not weighed in on v3 review yet)

### Rejected
- (none yet)

### Unresolved (raised by v3 review)
- **Coverage matrix is procedural, not mechanically verified**: hand-curated; stales on requirements.md edits. v3 added the matrix but no `verify-requirements-coverage.mjs`. Pattern: same as v2 CI-topology pattern, closed by Task 20.5. (v3 Attack 1)
- **Matrix omits some IDs claimed in task footers**: spot-check found Reqs 6.0 and 6.1 claimed by Task 4.3 but absent from matrix Req 6 section. (v3 Attack 1)
- **`Depends on:` footers applied inconsistently**: 7 tasks have them, 6+ tasks with real dependencies don't. Task 22 lacks footer while Task 22.5 (smaller dep set) has one. (v3 Attack 2)
- **No `verify-task-dependencies.mjs`**: parallel to coverage matrix — graph could go stale or develop cycles. (v3 Attack 2)
- **Task 6.5 `checkVercelDraftGuard()` framed as "optional"**: Tasks 7 and 16 unconditionally use it; framing invites skip. (v3 Attack 3)
- **No env-var-name constants exported**: `VERCEL`, `VERCEL_ENV`, `BLOG_INCLUDE_DRAFTS` are string literals scattered across files. Same design-r3 Vercel-staleness pattern. (v3 Attack 3)
- **Helper truth-table not directly tested**: `checkVercelDraftGuard()` tested only transitively through `getPublishedPosts()`; null-return happy path not asserted directly. (v3 Attack 3)
- **Multi-line constant string form unpinned**: template literal vs. concatenation in Task 6.5. (v3 Attack 3)
- **Task 20.5 step-name matching is fragile**: pins (b) and (d) match by name pattern; ci.yml step names not pinned in Task 20. (v3 Attack 4)
- **Task 20.5 pin (a) doesn't cover workflow-level env**: only job-level. (v3 Attack 4)
- **No self-test for the topology verifier**: one planted-failure case required, should be five (one per pin). (v3 Attack 4)
- **mdast construction substrate unpinned in Task 22.5**: hand-built trees may be structurally inequivalent to parser-emitted trees. (v3 Attack 5)
- **`code` vs. `inlineCode` disambiguation missing**: Task 2 says "drops `code`"; unclear whether inline code spans contribute to word count. (v3 Attack 5)
- **Task 22.5 "75 words" structure ambiguous**: whether the three assertions are one tree or three separate fixtures. (v3 Attack 5)
- **Vitest include pattern unverified for `src/lib/build/word-count.test.ts`**: Task 22.5 doesn't confirm the test file location matches Vitest's include glob. (v3 Attack 5)
- **Task 26 color-match assertion is binary, not value-comparing**: Task 28's re-run can pass with cascade-resolves-to-wrong-color. (v3 Attack 6)
- **Task 28 spot-check skipped on visual-match path**: "If reality matches the pin, document and move on" lets the implementer skip 24/26 re-run on visual inspection alone. (v3 Attack 6)
- **Task 21 threshold audit missing**: lighthouserc.js inherited thresholds not verified against Task 28's ≥90 contract. (v3 Attack 6)
- **Implementation-log citation format unpinned**: "cite Playwright report fragments" — JSON? HTML? screenshot? console output? (v3 Attack 6)

## Patterns & Themes
- **Procedural-as-structural recurrence — third iteration**: v1 surfaced it (sentinel-as-topology-proof, env-var scoping); v2 closed half of it (Task 17 ESLint chokepoint, Task 20.5 demanded); v3 closed Task 20.5 BUT introduced two new procedural artifacts that need the same treatment: the Requirements Coverage Matrix (no `verify-requirements-coverage.mjs`) and the `Depends on:` footer graph (no `verify-task-dependencies.mjs`). The pattern repeats: every time a procedural defense is added, it surfaces a need for a parallel mechanical defense. User has been receptive to mechanical-defense asks across both v1 and v2.
- **Step-name fragility**: Task 20.5's verifier matches ci.yml steps by name pattern. Same fragility class as design-r3's launch-time-verification staleness — the defense depends on a third-party-style invariant (here, the step name) that's free to drift.
- **"Optional helper" framing for load-bearing code**: Task 6.5 frames `checkVercelDraftGuard()` as optional when it's unconditionally used by two consumers. Pattern: spec author's hedge-language exposes the implementer to skipping load-bearing wiring.
- **Selective consistency**: `Depends on:` footers applied to non-obvious edges only — but the result is that readers infer absence-means-no-dependency, which is incorrect for at least six tasks. Half-measures are worse than no measures here.
- **Test substrate vs. real substrate**: Task 22.5 builds mdast by hand, which may not match what `remark-parse` emits. Same pattern as the design-r3 reading-time finding (synthetic-input assertions assume the synthetic input is a faithful representation of the real production input).
- **Re-run requirements that don't actually exercise the regression class**: Task 28's re-run of 24+26 is necessary but not sufficient for catching "cascade-resolves-to-wrong-color" because Task 26's assertion is binary. Pattern: structural re-run defense exists, but the underlying assertion granularity is too coarse.

## Guidance for Next Review
- **Focus areas if v4 happens**:
  - Whether `scripts/verify-requirements-coverage.mjs` lands (mechanical defense for the matrix).
  - Whether `scripts/verify-task-dependencies.mjs` lands (mechanical defense for the depends-on graph).
  - Whether `Depends on:` footers become universal or get removed entirely (consistency).
  - Whether Task 20 pins literal ci.yml step names AND Task 20.5 pins missing-step-fails-noisily semantics.
  - Whether Task 20.5 pin (a) extends to workflow-level env.
  - Whether Task 20.5 grows self-tests (five fixture ci.yml files).
  - Whether Task 22.5 pins mdast construction substrate (`unist-builder` or equivalent).
  - Whether Task 2 disambiguates `code` vs. `inlineCode` and Task 22.5 adds a coverage case.
  - Whether Task 6.5's helper is reframed as required (not optional) and env-var names get exported as constants.
  - Whether Task 26's color-match assertion gains hex-value comparison.
  - Whether Task 28 drops the "skip re-run on visual match" gate and always runs 24 + 26.
  - Whether Task 21 audits lighthouserc.js thresholds against the ≥90 contract.
- **Well-covered, don't re-examine**:
  - Task 4 atomicity (resolved by 4.1–4.4 split).
  - HTML-comment carve-out single AND multi-line cases (resolved).
  - CDATA dual-assertion (resolved).
  - Helpers placement (resolved).
  - Shiki variable names — base pin (resolved; verification gate now explicit at Task 28).
  - siteConfig audit (resolved).
  - Fixture image asset and alt-text pin (resolved).
  - Step-scoped CI env vars (resolved at YAML-config layer AND with mechanical verifier).
  - Body-parity HTML parser choice (resolved).
  - Sentinel touch ordering (resolved by v3 inversion).
  - Runbook drift between two operator messages (resolved by Task 6.5 shared constants).
  - Synthetic-input test for `countWordsFromMdast` (exists, but content has unresolved sub-issues — see Unresolved above).
  - Coverage matrix existence (exists, but mechanical-verifier missing — see Unresolved).
  - `_Requirements:` footer semantics (resolved by document-head note).
  - Vercel-log surfacing for Task 16 (resolved by manual verification step).
