# Adversarial Review Memory — tasks
Last updated: 2026-05-20 (after v3 review)

## Cumulative Findings Summary

### Accepted
- v1 attack 1 (Task 6 packed five distinct changes): v2 split into 6.1–6.5; v3 further split 6.4 into 6.4 (log-only spike) and 6.45 (implementation). Accepted on the split-shape; the 6.45 SCRIPT/HOOK bifurcation remains a partial issue (see Recurring).
- v1 attack 2 (Task 18 bundled 8 components + 21 ACs with "verified visually"): v2 split into 18.1–18.9 with per-component Playwright smokes; v3 added the preview-route infrastructure (Task 17.5) + pinned Playwright test location at `e2e/tests/component-preview/<slice>.test.ts` + extended Task 35's Playwright glob. Accepted on the per-component smoke shape; new merge-conflict factory at `registry.ts` introduced (see Unresolved Novel-to-v3).
- v1 attack 3 (Task 0 grep-able pass-string + design-gate misclassification): v2 reclassified Task 0 as a precondition spike. Accepted; remains stable through v3.
- v1 attack 4 (Task 23 ordering + scope): v2 split into 23.1–23.3 + reversed 25 ↔ 23 ordering. v3 added a transitional flag `BLOG_ENHANCED_CI_LITERALS_REQUIRED` to close the CI-red-line interval v2 introduced. Accepted on the split shape; the flag mechanism introduces new long-tail risks (see Unresolved Novel-to-v3).
- v1 attack 5 (coverage matrix overclaim): v2 added Tasks 39/40/41; v3 added Velite-emit parity test to Task 27 + `s.markdown()` heading-ID parity to Task 33 + step-group assertion to Task 25 for Req 0.4 mechanical coverage. Accepted on coverage closures.
- v1 attack 6 / v2 attack 5 (baseline-drift methodology): v3 removed the "OR document the drift" escape hatch and replaced with a mechanical-only SHA gate in Task 38 step 7. Accepted on the mechanical-only intent; the SHA computation itself is wrong (see Unresolved Novel-to-v3).
- v2 attack 2 first bullet (parallel-edit conflict on `globals.css`): v3 added Task 17.5 to carve globals.css into per-component slice files. Accepted on the carve shape; same antipattern re-introduced via `registry.ts` (see Compounding Novel-to-v3).
- v2 attack 3 second bullet (23.1's wrong `_Depends on: 26` edge): v3 dropped the bogus 26 dep from 23.1. Accepted.
- v2 attack 5 first bullet (Task 38's `_Depends on:` omits 23.1/23.2/23.3): v3 added them. Accepted.
- v2 attack 5 last bullet (decimal-task-ID parser extension unowned): v3 extended Task 25 to also extend `scripts/verify-task-dependencies.mjs` with the regex `/^- \[[ x]\] (\d+(?:\.\d+[a-z]?)?)\. /`. Accepted on the extension; the `6.45` ID itself is a string-sort hack (see Unresolved Novel-to-v3).
- v2 attack 6 first bullet (Velite-emit parity test missing for Req 1.12): v3 added it to Task 27. Accepted.
- v2 attack 6 third bullet (Req 7.4 v4 `s.markdown()` parity missing): v3 extended Task 33 to compare `s.markdown()` bodyHtml IDs alongside rendered DOM + `extractToc`. Accepted.
- v2 attack 6 fourth bullet (Req 13.2 runbook location hedge): v3 pinned runbook to `design.md` operator notes ONLY; README placement REJECTED. Accepted.
- v2 attack 1 fourth bullet (6.4 SCRIPT-branch package.json edit undeclared): v3 added `package.json` to 6.45's `Files:` and explicitly authorized the `scripts.build` carve-out. Partially accepted — the carve-out lacks mechanical enforcement (see Unresolved Novel-to-v3).
- v2 attack 4 first bullet (Task 5's `_comments` hedge): v3 rejected the JSON-comment hack outright. Accepted.

### Partially Accepted
- v2 attack 4 second bullet (Task 5 grep invariant violated by unrelated `3013` matches): v3 narrowed grep to path-scoped `git grep -l -- 'package.json' 'lighthouserc.js' 'scripts/run-pagefind-crawl.mjs'`, but this is a tautology — it verifies "these three contain 3013" not "ONLY these three contain 3013."
- v2 attack 4 third bullet (Task 5 → Task 9 ordering / forward-reference): not addressed — Task 5 still depends on `1` only despite needing 9 to satisfy its grep.
- v2 attack 1 (6.4 still-a-spike problem): v3 split into 6.4/6.45 but 6.45 itself bifurcates HOOK vs SCRIPT with no mechanical CHOSEN_PATH verifier.
- v2 attack 5 third bullet (median-of-3 Lighthouse statistical methodology): v3 confirmed the methodology but did not add per-category retry. One URL × one category at 88 still fails the whole gate.

### Rejected
- (none confirmed yet — v3 is the second response review; rejections need explicit v4 author response)

### Unresolved (Novel to v3 review)
- **`src/app/(site)/blog/__component-preview/registry.ts` is the new globals.css** — nine parallel 18.x sub-tasks edit ONE file. Same antipattern v3 explicitly fixed for CSS. Needs per-component registry files + barrel-export aggregator.
- **Task 23.1's `_Depends on:` does NOT include Task 35** despite v3 revision-history claim that it does. The Playwright-glob extension can land after 23.1, leaving 23.1's draft-PR verification running an incomplete test surface.
- **Task 38's `git merge-base main HEAD` description is wrong** — merge-base is the divergence point, not "most recent main reachable from this branch." Gate passes silently when spec branch has merged 30+ main commits since divergence.
- **`BLOG_ENHANCED_CI_LITERALS_REQUIRED` flag has no meta-gate** — nothing prevents a future PR from removing the env line; verifier silently reverts to default-off.
- **Task 17.5's "preview-route infrastructure" is multi-deliverable** — CSS carve + dynamic route + registry + 404 gating, no single Playwright smoke covers all four.
- **Task 17.5's slice files start empty** — if blog-core has any inline component CSS in globals.css, it disappears at 17.5-time and re-appears piecemeal at 18.x-time; no visual-neutrality assertion.
- **`BLOG_INCLUDE_DRAFTS=1` env wiring for Playwright preview-route smokes is undeclared** — Task 35 extends the glob but doesn't set the env; preview routes will 404 in CI.
- **Task 6.45 lacks `verify-chosen-path.mjs`** — implementer-cognitive-judgment from 6.4 to 6.45 is reviewable only by reading PR diff against log; no mechanical check.
- **Task 6.45 retains error-surface timing inconsistency** — HOOK fails at `pnpm velite`, SCRIPT fails after `next build`. v3 says "Both are acceptable; document in implementation log" — documentation is not a gate.
- **Task `6.45` ID is a string-sort hack** — `6.45 > 6.5` numerically but `< 6.5` textually only with leading-zero padding. Use `6.4.1` or `6.4-impl`.
- **Task 23.2's DEPLOY_VIA_CI safety pin is on the wrong sub-task** — the safety note lives on 23.3, but 23.2 is where DEPLOY_VIA_CI is first flipped during draft-PR verification.
- **Task 25's step-group YAML parser dependency is unpinned** — script may need `yaml`/`js-yaml`; current verifier uses regex; the dep change isn't called out.
- **Cross-file port-duplication comment text in `scripts/run-pagefind-crawl.mjs` is homeless** — Task 5 defers to Task 9; Task 9 doesn't mention it; no verifier checks the comment exists.
- **Task 5 grep invariant is tautological** — narrowed scope confirms "these three contain 3013" but doesn't enforce "only these three contain 3013."
- **Task 17.5's preview-route + 18.7/18.9 static-stub mechanism is unpinned** — preview route renders components from registry; static HTML stubs need a different mechanism (raw-HTML mode OR throwaway registry entries).
- **Task 35's Playwright config file is hedged** — `playwright.config.ts` OR `testMatch` — "(pin during implementation)" hedge persists.
- **Task 25 transitional-flag interval is verifier-blind** — between 23.1 and 23.3 landing, new step literals are present but flag is still default-off; regressions go unflagged.

### Unresolved (carried from v2, not addressed in v3)
- **Median-of-3 Lighthouse single-URL/single-category-fails-whole-gate** (v2 attack 5 third bullet) — no per-category retry policy.
- **Task 5 ↔ Task 9 forward-reference dep edge** (v2 attack 4 third bullet) — Task 5 depends on Task 1, not 9, but its success criterion requires Task 9 to have landed.
- **Task 5 grep "ONLY these three" invariant** (v2 attack 4 second bullet) — v3 inverted the direction (now "these three contain") instead of fixing it.

## Patterns & Themes
- **Same antipattern, new file**: v3 fixed `globals.css` parallel-edit by carving but re-introduced the same shape via `registry.ts`. Pattern: the author recognizes the conflict factory in one place but not in the dependent infrastructure they introduce to solve it.
- **Revision-history claims vs artifact reality**: v3's revision-history says "extended Task 23.1's `_Depends on:` to include Task 35"; the actual 23.1 footer reads `_Depends on: 9, 11, 25_`. Mechanical claim/artifact mismatch.
- **"Design pins at implementation time" hedge persists**: v3 explicitly rejected this antipattern (Task 5 `_comments`, Task 37 README) but it survives in Task 35 ("`playwright.config.ts` or testMatch — pin during implementation"), 17.5 (slice-file content "likely empty"), 6.45 (HOOK vs SCRIPT).
- **Soft gates wrapping hard gates**: Task 25 transitional flag (no meta-gate forcing it on), Task 6.45 carve-out (no mechanical enforcement of `scripts.build`-only edit), Task 38 SHA gate (wrong reference command). Each is a discipline marker without a verifier.
- **Naming hacks**: Task ID `6.45` is the first one — string-sort-only convention break.

## Guidance for Next Review (v4)
- **Focus areas**:
  - Whether `registry.ts` is carved into per-component files (or 18.x sub-tasks are serialized).
  - Whether Task 23.1's `_Depends on:` is actually fixed to include Task 35 (not just claimed).
  - Whether Task 38's SHA-comparison command is correct (`git rev-parse origin/main` vs `git merge-base main HEAD`).
  - Whether `BLOG_ENHANCED_CI_LITERALS_REQUIRED` has a meta-gate or has been replaced with atomic landing.
  - Whether the `BLOG_INCLUDE_DRAFTS=1` env wiring for Playwright preview routes is declared.
  - Whether Task `6.45` is renamed `6.4.1` (or split into hook/script alternatives).
  - Whether the YAML-parsing dependency for Task 25's step-group assertion is pinned.
  - Whether the cross-file port comment in `scripts/run-pagefind-crawl.mjs` has a verifier.
  - Whether `verify-chosen-path.mjs` exists to enforce 6.4 → 6.45 alignment.
  - Whether the median-of-3 Lighthouse per-category-retry concern is addressed.
- **Well-covered (don't re-examine)**:
  - Task 0 reclassification + spike re-runnability + checksum + version-pin — stable through v3.
  - Tasks 6.1, 6.2, 6.3, 6.5 — atomic sub-tasks (only 6.4/6.45 split remains contentious).
  - Coverage matrix closures for Reqs 2.7 (Task 39), 6.6 (Task 40), 5.5 (Task 41), 1.12 Velite-emit parity (Task 27), 7.4 v4 s.markdown() parity (Task 33), 0.4 step-group (Task 25), 12.2 workflow-side (23.1/23.2/23.3), 13.2 runbook location (37).
  - Task 38's `_Depends on:` now correctly includes 23.1/23.2/23.3.
  - 23.1's `_Depends on:` correctly drops the bogus 26 edge.
- **Likely to recur if not resolved by v4**:
  - `registry.ts` parallel-edit conflict (same shape as v2 globals.css attack).
  - Task 35 Playwright config hedge ("pin during implementation").
  - Task 38 median-of-3 single-URL/category gate sensitivity.
  - Task 5 grep invariant (now inverted-tautology shape, still doesn't enforce "only these three").
  - Task 6.45 implementer-cognitive-judgment HOOK vs SCRIPT bifurcation.
