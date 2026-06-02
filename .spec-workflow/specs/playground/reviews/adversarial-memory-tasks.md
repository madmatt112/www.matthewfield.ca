# Adversarial Review Memory — tasks

Last updated: 2026-06-01 (after **round 3** review of v3; cumulative)

## Verdict trajectory
- **r1 (v1):** 2 BLOCKERS + softer items. All accepted, fixed in v2.
- **r2 (v2):** 0 blockers; 4 one-line precision items. All accepted, fixed in v3.
- **r3 (v3):** 0 blockers, 0 new findings. **CONVERGED — execution-ready.** All four v3 deltas verified landed and correct against live code. Do not open a round 4 without a *code* change to the spec.

## Cumulative Findings Summary

### Accepted — folded into v2 (from r1), all CLOSED
- **R1 (BLOCKER) — Task 12 needs a `ci.yml` edit.** v2 named `.github/workflows/ci.yml` + the two-step spec (run + self-test mirroring `ci.yml:48-49`,`97-98`). r2 verified correct job/order — CLOSED.
- **R2 (BLOCKER) — `data-testid` hook set 2 short** (live test selects SIX descendant testids). v2 expanded to a six-fixture panel + 6→6 Task 8 re-point. r2 verified the panel matches ASSERTED computed values on all six with the same CSS mechanism — CLOSED.
- **R4 — `[10,10,10]` verify-then-edit loop.** v2 made it named post-build step 5; v3 scoped the run command (see r2-F2). CLOSED in v3.
- **R3 — `applyDarkMode` literal `"theme"`.** v2 = import `THEME_STORAGE_KEY` (line 160), fix stale comment (36-37). CLOSED.
- **R5 — Req 1.2 matrix overclaim.** v2 marked "by construction; not gated." CLOSED.
- **Missing alias-dep edges.** v2 added 1→9, 1→10; r2 re-audited all manifest importers — CLOSED.

### Accepted — folded into v3 (from r2), all VERIFIED CLOSED in r3
- **r2-F1 (Low/doc) — design↔tasks hook-table divergence.** v3 revision note (`tasks.md:44`) records that the six-hook set supersedes the design's illustrative three-hook table `design.md:415-420`. **r3 verified:** design table really lists 3 descendant hooks + container (`design.md:415-420`); Decision #7 (`requirements.md:245`) licenses "equivalent `data-testid` hooks" — a refinement, not a contradiction. Note is accurate — CLOSED.
- **r2-F2 (Medium) — Task 8 step 5 ran the whole E2E suite.** v3 scopes to `node scripts/run-e2e.mjs playground-isolation` in BOTH step-5 body (`tasks.md:141`) and `_Prompt` (`tasks.md:146`). **r3 verified:** `run-e2e.mjs:102` forwards `process.argv.slice(2)` to `playwright test`; `playground-isolation` is a Playwright filename substring filter; only `e2e/tests/playground-isolation.test.ts` matches that substring (no other test file contains it) → runs exactly the isolation spec, no coupling to unrelated/not-yet-written suites. No stray un-scoped `run-e2e.mjs` left in Task 8. CLOSED.
- **r2-F3 (Low) — `sample-token-target` radius under-spec.** v3 pins `var(--radius)` to `border-radius` (`tasks.md:86`). **r3 verified:** live test reads `border{Top,Bottom}{Left,Right}Radius` each `=== "10px"` (`playground-isolation.test.ts:319-322,333-336`); `border-radius: var(--radius)` shorthand sets all four longhands → produces the asserted `"10px"`. Reworded bullet still carries BOTH `var(--primary)` and `var(--primary-foreground)` (test asserts backgroundColor + color, `:331-332`) — nothing dropped. CLOSED.
- **r2 Task 3 `Success` "three"→"six" (Low).** v3 corrects it. **r3 verified:** body line 82 says "SIX", `Success`/`_Prompt` line 94 says "six"; the only remaining "three" in tasks.md is the *three authoring docs* (Task 15, `:206`) and revision-history prose — neither is a hook count. CLOSED.

### r3 new findings
- **None.** No new inconsistency introduced by the v3 edits; revision note (`:44`) matches every edited task body; no remaining stale count/path/`Success`-vs-body contradiction. No execution-blocking gap (unreachable `Success`, missing dep edge, ungated requirement, un-executable `_Prompt`, or ordering hazard) found in the convergence sweep.

### Rejected
- (none, across all three rounds)

## Confirmed fine — DO NOT RE-MINE (verified across rounds)
- The six-fixture assertion-level match (all six vs live test + live spike mechanism; inline-style fixtures stay inline, Tailwind fixture stays utility-class) — r2 hard-verified.
- CI steps land in the correct single `ci` job, toolchain present — r2.
- `button.tsx` SSR-safety (pure UI primitive, no browser globals, no `(site)` coupling) — r2.
- Alias-dep edges: every `#playground/manifest` importer (6,7,9,10,11) carries the Task-1 edge; Tasks 13/16 don't import the manifest — r2.
- Task 3 / Task 8 atomicity (do NOT split either) — r1/r2.
- Ordering safety: Task 13-before-8 (csp.test targets `/playground`, only a comment mentions spike); Task 11 fs.existsSync after sample folders; unused `PlaygroundFrame` export between Task 2 and 6 doesn't trip eslint/tsc — r2.
- `/spike` deletion safety (no external importers) — r1.
- `EXPECTED_RADIUS="10px"` + `text-sm`(14px Button) hold post-M1; `THEME_STORAGE_KEY` exported at `theme-provider.tsx:6`; `check-authoring-docs` append + count-bump (`.test.mjs:110`) — r1/r2.
- Green-before/after + transient double-`.playground-container` wrap note (Task 6→8) — r1.
- Req 1.2 "by construction" matrix note; axe scope (gallery + iframe-landing, same-page toy exempt); the four deferred verify-by-build items folded into `Success:` lines — r1/r2.

## Patterns & Themes
- r1's blockers were **seam defects** (work falling between two tasks). r2's were **softer items on the new surfaces v2 introduced** (a traceability gap + a too-broad run command + two precision gaps). r3 found the v3 fixes are **mechanized and correct**, not merely asserted.
- The highest-value recurring check (six-fixture assertion match) and the F1 run-command scoping both verified against live code, not taken on faith.

## Guidance for Next Review (round 4 — only if the spec changes)
- The breakdown is **converged and execution-ready** as of v3/r3. A fourth round is NOT warranted absent a new edit to tasks.md.
- If tasks.md changes again, re-verify only the changed region; do NOT re-mine the "Confirmed fine" list above.
- Carry-forward items the IMPLEMENTER owns (already folded into `Success:` lines, not gaps): the `[10,10,10]` RGB is a hypothesis to pin against the real prod-build serialization (exact `toBe`, no tolerance); the `#playground` alias-under-Vitest resolution (fallback: vite-tsconfig-paths or relative import); `_components`/`next/dynamic` SSR; the Vercel-preview isolation re-check before merge.
