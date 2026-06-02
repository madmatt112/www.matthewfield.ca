# Adversarial Analysis — Playground Tasks (v3, round 3)

Reviewer stance: tear down, not validate — but converge if the evidence supports it. Every claim below is checked against the live repo at `/home/mcf/repo/matthew-field.ca` (Next 16.2.2, Vitest 4): the actual `scripts/run-e2e.mjs`, `e2e/playwright.config.ts`, `e2e/tests/playground-isolation.test.ts`, `design.md`, and `requirements.md`.

**Headline:** v3 lands all four r2 precision items **correctly and completely**, introduces **no new inconsistency**, and the convergence sweep surfaces **no execution-blocking gap**. This breakdown is **converged and execution-ready**. I did not manufacture a fourth-round objection; the evidence does not support one.

---

## 1. Did the four v3 deltas land correctly and completely?

### F1 — Task 8 step-5 run command scoped to the isolation spec — **landed, verified mechanically (Recurring → CLOSED)**

The fix appears in **both** required locations: step-5 body (`tasks.md:141`) and the `_Prompt` (`tasks.md:146`), both now `node scripts/run-e2e.mjs playground-isolation`. No stray un-scoped `run-e2e.mjs` remains inside Task 8 (the only other `run-e2e.mjs` in the doc is Task 16's `Success`, `tasks.md:225`, which legitimately runs the full suite).

Mechanically verified the filter actually works:
- `run-e2e.mjs:102` reads `const extraArgs = process.argv.slice(2)` and `:103-113` spawns `pnpm exec playwright test --config=e2e/playwright.config.ts …extraArgs`. So `playground-isolation` is forwarded to `playwright test` as a positional **filename filter** (Playwright treats bare positionals as substring matches against test file paths).
- It resolves to exactly one file: `e2e/tests/playground-isolation.test.ts` is the **only** file under `e2e/tests/` whose path contains the substring `playground-isolation` (the sibling `playground.test.ts` is created later in Task 16 and does NOT contain that substring). So the filter reads the isolation spec alone — no coupling to the blog/contributions/csp suites or the not-yet-written `playground.test.ts`, exactly as the r2 fix intended.
- `playwright.config.ts:13 testMatch` would otherwise pull the whole `e2e/tests/` tree (the r2-F2 exposure). The positional filter overrides that to the single matching file. Correct.

The v3 revision note's parenthetical claim — "`run-e2e.mjs` forwards the positional filter to `playwright test`, so this runs the isolation spec alone" (`tasks.md:141`) — is **accurate**.

### F2 — Task 3 "three"→"six" — **landed, no residual "three" hook phrasing (Recurring → CLOSED)**

Task 3 body (`tasks.md:82`) reads "SIX `data-testid` hooks (R2, 6→6 with the live suite)"; its `_Prompt` `Success` (`tasks.md:94`) reads "it carries the **six** data-testid hooks." Full-doc sweep for `three`/`3 hooks`/`3 data-testid` finds no remaining stale hook count anywhere in Task 3 (body, `Success`, `_Prompt`, `_Leverage`). The only surviving "three" tokens in the doc are the **three authoring docs** (Task 15, `tasks.md:206` "writes all three docs") — correct and unrelated — and revision-history prose ("three adversarial rounds"). CLOSED.

### F3 — `sample-token-target` radius pinned to `border-radius` — **landed, verified against the exact computed property (Recurring → CLOSED)**

v3 wording (`tasks.md:86`): "an element using `var(--primary)`/`var(--primary-foreground)` via inline `style`, with `var(--radius)` applied specifically to `border-radius` (the live radius assertions read `border*Radius`, exact `=== "10px"`)."

Verified against the live test:
- The radius assertions read `cs.borderTopLeftRadius` / `borderTopRightRadius` / `borderBottomLeftRadius` / `borderBottomRightRadius` (`playground-isolation.test.ts:319-322`) and assert each `=== EXPECTED_RADIUS` where `EXPECTED_RADIUS = "10px"` (`:70`, `:333-336`). These are the four longhand corners — **not** a `borderRadius` shorthand read.
- Applying `border-radius: var(--radius)` (the shorthand) sets all four `border*Radius` longhands; `var(--radius) = 0.625rem` resolves to `10px` at the M1-fixed 16px container font-size (the test header `:65-69` documents this). So "applied to `border-radius`" produces exactly the value the four assertions expect. Correct property, correct value.
- **Nothing dropped in the reword:** the bullet still names BOTH `var(--primary)` and `var(--primary-foreground)`. The live test asserts `backgroundColor` against `EXPECTED_PRIMARY_LIGHT` and `color` against `EXPECTED_PRIMARY_FOREGROUND_LIGHT` (`:331-332`), so both tokens must remain on the fixture — and they do. The r3 prompt's specific worry ("check nothing was dropped") is clean.

### F4 — design-table supersession note — **accurate (Recurring → CLOSED)**

v3 revision note (`tasks.md:44`) records the six-hook set supersedes `design.md:415-420` as "a legitimate refinement (Decision #7's 'equivalent `data-testid` hooks'…; the design table was illustrative, not exhaustive), not a contradiction." Verified:
- The design table at `design.md:415-420` really lists **three** descendant hooks (`sample-font-target` :418, `sample-token-target` :419, `sample-leak-probe` :420) plus the `playground-container` row (:417). So the "3-vs-6" the note reconciles is real.
- Decision #7 (`requirements.md:245`) states the spike's assertions migrate onto the same-page sample "which carries **equivalent** `data-testid` hooks (Req 7.2, 10.2)" — explicit license for a complete equivalent mapping rather than a literal three. The design's own table caption (`design.md` table at :410+) frames the hooks as "for Req 10.2 migration," i.e. illustrative of the migration map, not an exhaustive selector inventory. So the six-hook expansion is a refinement of an under-specified illustrative table, not a contradiction of a load-bearing design decision. The traceability note is correct and sufficient.

---

## 2. Did the v3 edits introduce any NEW inconsistency?

**No.** Cross-reading the v3 revision note (`tasks.md:44`) against the task bodies it describes:
- "scopes the command to `node scripts/run-e2e.mjs playground-isolation`" → matches `:141` and `:146`. ✔
- "corrects it to six" → matches `:82`, `:94`. ✔
- "pins that it applies `var(--radius)` to `border-radius`" → matches `:86`. ✔
- "supersedes the design's illustrative three-hook table (`design.md:415-420`)" → accurate per §1-F4. ✔

Full-doc re-scan for stale count / stale path / `Success`-vs-body contradiction found none. The four r2 items were single-location-or-two edits and each was applied to every location that referenced it (verified F1 hit both step-5 and `_Prompt`; F2 hit both body and `Success`). No location was updated while leaving a contradictory sibling.

---

## 3. Genuine convergence check

Swept the breakdown once more for an execution-blocking gap under strict one-at-a-time-with-review execution — looking for an unreachable `Success`, a missing dependency edge, an ungated requirement, an un-executable `_Prompt`, or an ordering hazard:

- **Unreachable `Success`:** Task 8's `Success` (`:146`) requires the isolation suite to pass on `/playground/scribble-pad` with all six descendant assertions migrated and the RGB pinned to the actual serialization. The six fixtures (Task 3) map 1:1 onto the six live selectors with matching computed values (r2 hard-verified, unchanged in v3), and the F1-scoped run command makes the pin step reachable without gating on unrelated suites. Reachable.
- **Missing dep edge:** every `#playground/manifest` importer (6,7,9,10,11) carries the Task-1 edge (r2 re-audited; v3 didn't touch deps). 13/16 don't import the manifest. None missing.
- **Ungated requirement:** the matrix maps every requirement; Req 1.2 is honestly marked by-construction; the deferred verify-by-build items are folded into `Success:` lines. No orphan.
- **Un-executable `_Prompt`:** Task 8's `_Prompt` is long but is one cohesive cascade with a single verification — executable in one pass (r2). The F1 scoping made its run command concrete rather than dragging the whole suite. No other `_Prompt` regressed.
- **Ordering hazard:** Task 13-before-8 safe (csp.test targets `/playground`, only a comment mentions spike); Task 11 fs.existsSync gated behind sample folders (deps 3,4); unused `PlaygroundFrame` export between Task 2 and 6 doesn't trip eslint/tsc. All previously verified, none disturbed by v3.

No new blocker. The only items the implementer carries forward are the four deferred verify-by-build criteria already embedded in `Success:` lines (RGB pin against real serialization; `#playground` alias under Vitest with documented fallback; `_components`/`next/dynamic` SSR; Vercel-preview re-check) — these are honest "prove at build time," not gaps.

---

## Deliverables

### Top risks / gaps
**None.** Zero blockers, zero new findings. All four v3 deltas verified landed, correct, and complete against live code.

### Top conclusions to challenge or reverse
**None remain.** r1's two blockers and r2's four precision items are all closed with mechanized, live-code-verified fixes. The architecture, DAG, atomicity guarantees, and coverage matrix are sound and unchanged.

### What's missing before execution
**Nothing blocking; converged.** The breakdown is execution-ready.

Implementer carry-forward (already in `Success:` lines, not gaps):
1. Pin `EXPECTED_CONTAINER_COLOR_RGB` to the **actual** prod-build serialized container `color` ([10,10,10] is the hypothesis; `expectRgbEqual` is exact `toBe`, no tolerance).
2. Confirm `#playground/manifest` resolves under Vitest in Task 11; fall back to vite-tsconfig-paths or a relative import if not.
3. Confirm `_components` is router-ignored and `next/dynamic` SSRs+hydrates at `next build` (Task 6).
4. Re-check item isolation + iframe sizing on a Vercel preview before merge (Task 16 / Req 10.4).

This is a converged third-round verdict supported by the evidence — no manufactured objection.
