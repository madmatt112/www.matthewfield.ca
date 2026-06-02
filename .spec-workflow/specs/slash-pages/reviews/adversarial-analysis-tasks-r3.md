# Adversarial Review — slash-pages `tasks.md` (v3, round 3)

**Reviewer stance:** principal engineer / release manager, brought in cold to break this task breakdown before a fresh-context implementer executes it. Every claim below is checked against live code, not against the document's own assertions. The brief: focus on the v3 deltas (Task 2 dedicated TZ file, Task 5 inlined identifiers + per-doc warning, Task 16 "copy the local idiom"), classify each finding Novel / Compounding / Recurring, and do **not** manufacture a structural objection to justify a fourth round.

**Verdict up front: CONVERGED / implementation-ready.** The r2 blocker (the inert TZ guard) is genuinely fixed in v3, and I verified the fix with a live repro that reproduces the exact CI condition r2 warned about. The dedicated-file approach works: even when the worker process starts under `TZ=UTC`, reassigning `process.env.TZ = "America/Toronto"` in module scope *before* the lone dynamic `import("@/lib/format-date")` causes the module-level `Intl.DateTimeFormat` to construct under the pinned zone, so the un-fixed formatter renders "May 28" → the guard goes RED in UTC CI. Task 5's inlined identifiers and per-doc warning are internally consistent. The only residual issue is **one Novel cosmetic factual error in the Task 16 v3 wording** (`THEME_STORAGE_KEY` is *exported and imported* by the siblings, not a local non-exported idiom to copy) — it does not block implementation and is a one-line phrasing fix. No new blocker. Three rounds in, the document is converged.

---

## Live-code verification log (v3 deltas)

| Claim under test | Verified? | Evidence |
|---|---|---|
| `format-date.ts` has the formatter as a **module-level const** + **zero imports** (so the dedicated file pulls in only the bare module) | ✅ | `src/lib/format-date.ts:1-9` — `const contentDateFormatter = new Intl.DateTimeFormat(...)`; no `import` lines at all |
| `vitest.config.ts` does NOT set `isolate:false` (per-file registry isolation holds) | ✅ | `vitest.config.ts:13-17` — `test:` has `environment`, `include`, `globalSetup` only; no `isolate`/`pool` override |
| No `setupFiles` transitively static-imports `format-date` into every worker | ✅ | `vitest.config.ts` has **no `setupFiles`**; only `globalSetup: ["./vitest.global-setup.ts"]`, which `execFileSync("pnpm",["velite","build"])` in a **subprocess** — it never imports format-date into the worker registry |
| `format-date.test.ts` still static-imports + forbids `resetModules` (so the dedicated-file move is the correct fix, not an over-correction) | ✅ | `format-date.test.ts:1` no-resetModules header; `:3` static import; `:4-5` import blog/projects which re-import format-date (`blog.ts:9`, `projects.ts:2`) |
| **Mid-process `process.env.TZ` reassignment actually affects subsequently-constructed `Intl.DateTimeFormat`** (the load-bearing premise of the dedicated-file fix) | ✅ | Live repro under `TZ=UTC node`: ambient formatter → "May 29"; after `process.env.TZ="America/Toronto"` a *newly* constructed formatter → "May 28". Dynamic-import-after-set repro → "May 28". The pin fires even on a UTC box. |
| Toronto un-fixed → "May 28", UTC-fixed → "May 29" (red/green math) | ✅ | Live repro: `…T00:00:00.000Z` and date-only `2026-05-29` both → "May 28" un-fixed; `timeZone:"UTC"` → "May 29" |
| Task 5: current self-test hardcodes `=== CANONICAL_HEADINGS.length` (the stale 9) and single-doc `writeDoc` | ✅ | `check-authoring-docs.test.mjs:23 (ALL_PRESENT), :33-36 (writeDoc), :104 (CANONICAL_HEADINGS.length)` |
| Task 5: current script early-`process.exit` on missing doc; warning hardcodes the contributions path | ✅ | `check-authoring-docs.mjs:66-69 (early exit), :76 (::warning:: … from ${DOC_REL_PATH})` where `DOC_REL_PATH=":32"` is contributions |
| Task 5: the two `rel` paths are NOT confusable (substring false-pass) | ✅ | `"docs/slash-pages-authoring.md"` vs `"docs/contributions-and-resources-authoring.md"` — neither is a substring of the other |
| Task 16: `AXE_TAGS`, `setupTheme`, `assertTheme` are **local, non-exported** (copy is correct) | ✅ | `blog-axe.test.ts:24,26,40`; `contact-axe.test.ts:8` |
| Task 16: `THEME_STORAGE_KEY` is **local non-exported** (as the v3 wording groups it) | ❌ | `theme-provider.tsx:6` `export const THEME_STORAGE_KEY = "theme"`; **imported** by `blog-axe.test.ts:4` and `contact-axe.test.ts:4`. It is an export the siblings *import*, not a local idiom they copy. |

The author's static grounding remains accurate across the board; the single ❌ is a phrasing slip in the v3 Task 16 edit (see Finding 1).

---

## 1. The v3 dedicated TZ test file (Task 2) — the re-fix HOLDS

**The r2 blocker is genuinely resolved. (Recurring r1/r2 finding → now correctly RESOLVED.)**

r2's blocker was that the guard lived in `format-date.test.ts`, whose static import poisoned the registry before any `process.env.TZ` set, and `vi.resetModules()` was forbidden — so the pin was a no-op and the guard stayed green pre-fix in UTC CI. v3 moves the guard to a **dedicated `src/lib/format-date-tz.test.ts`** with no static format-date import, setting `process.env.TZ = "America/Toronto"` at the top before the lone `await import("@/lib/format-date")`.

I attacked every escape hatch the brief named:

- **Transitive static import?** No. `format-date.ts` itself imports nothing (`:1-9`), so the dedicated file's `await import` pulls in only the bare formatter module — no `blog`/`projects` chain, no `#site/content`. There is no shared test helper or `setupFiles` that would pre-load format-date into the worker: `vitest.config.ts` declares **no `setupFiles`**; its only setup is `globalSetup`, which spawns `pnpm velite build` in a subprocess and never imports format-date into the worker registry. So the first-ever evaluation of `format-date` in this file's worker happens *after* the TZ pin.
- **Does `process.env.TZ` set in module scope take effect before the dynamic import resolves, even on a process that already booted under UTC?** Yes — this is the crux, and it is the one thing that *could* have silently defeated the fix (if Node cached the zone at process start, a mid-process reassignment would be ignored and the guard would be inert exactly as in r2, just relocated). I reproduced the UTC-CI condition directly: under `TZ=UTC node`, an ambient formatter renders "May 29", but a formatter constructed *after* `process.env.TZ="America/Toronto"` renders "May 28"; the dynamic-import-after-set form also renders "May 28". Node reads the zone at `Intl.DateTimeFormat` **construction**, which happens inside the awaited module body — after the pin. The guard fires.
- **Is "verify once locally that it goes RED" a real CI gate or un-enforceable manual rot?** This is the one honest soft spot, and it is acceptable. The *test* runs in CI on every `pnpm test`; the **assertion that it is red on the un-fixed formatter** is what's only manually verified once. But because the pin now genuinely overrides the ambient zone (verified above), the test asserts `display === "May 29, 2026"` against a formatter built under Toronto — which is "May 28" if `timeZone:"UTC"` is ever removed. So a future revert of the fix makes this test **fail in CI**, automatically, on any box, west-of-UTC or not. The "verify once locally" line is a sanity check on the harness, not the gate itself — the gate is the standing assertion, and it is CI-enforced. This is materially different from r2, where the assertion was green on both formatters in UTC CI.

Conclusion: the re-fix is correct and the regression is now genuinely guarded in CI. Memory's "for r3: verify the new file truly has no transitive static import and TZ is set before the dynamic import" is discharged — both hold.

## 2. Task 5 — inlined self-test after the v3 edits is internally consistent

**No finding. The v3 nick is resolved.**

- `SUBJECT_REL = "docs/slash-pages-authoring.md"` and `subjectHeadings = SLASH_PAGES_HEADINGS` are now defined inline at the top of the test (Task 5 edit 3); no dangling reference remains.
- The four CLI assertions hold against `main(AUTHORING_DOCS)` report-all semantics:
  - *all-present* → exit 0, no `::warning::` (both docs written full).
  - *one heading missing in subject* (sibling full-present) → non-zero + a single `::warning::` whose text **contains `SUBJECT_REL`**. Because the production message now interpolates the per-doc `rel` and the sibling emits none, the only warning carries the slash-pages path — the assertion proves the per-doc message, not just `/::warning::/`. The two `rel`s are not confusable (neither is a substring of the other — verified), so no false-pass.
  - *neither doc* (`makeTmp()` only) → non-zero + **two** `author doc not found` stderr lines + NO `::warning::`. Consistent with the required report-all `continue` (the current script early-exits after one — Task 5 correctly mandates removing that).
  - *zero-byte subject* (sibling full-present) → non-zero + `warningCount === subjectHeadings.length` (= `SLASH_PAGES_HEADINGS.length`), explicitly NOT the stale hardcoded `CANONICAL_HEADINGS.length`/9 at `test.mjs:104`. Catches the exact current bug.
- The pure-core call-site edits (`checkHeadings(text, headings)` with the headings arg passed explicitly) are consistent: parameterizing `checkHeadings` makes an un-passed `headings` `undefined` → `headings.filter` throws, exactly as the task warns.

The self-test is mechanically gated by `node --test`, so a wrong rewrite fails loudly. No silent-correctness gap remains.

## 3. Residual coverage / ordering / atomicity

**One Novel cosmetic finding (Task 16 wording); everything else intact.**

- **Task 16 `THEME_STORAGE_KEY` mis-grouped (Novel, cosmetic).** The v3 edit says to "copy the local (non-exported) `setupTheme`/`assertTheme`/`THEME_STORAGE_KEY`/`AXE_TAGS` idiom rather than import it." Three of those four are local non-exported (`AXE_TAGS`, `setupTheme`, `assertTheme` — verified). But `THEME_STORAGE_KEY` is **exported** from `src/components/layout/theme-provider.tsx:6` and **imported** by both sibling suites (`blog-axe.test.ts:4`, `contact-axe.test.ts:4`). The established idiom is to `import { THEME_STORAGE_KEY } from "../../src/components/layout/theme-provider"`, not to re-declare the string `"theme"` locally. **Impact:** trivial — if an implementer literally copies a `const THEME_STORAGE_KEY = "theme"` it still works (the value matches), but it duplicates a constant that has a single source of truth and diverges from the sibling pattern Task 16 claims to follow. **Fix:** reword to "copy the local `setupTheme`/`assertTheme`/`AXE_TAGS` idiom; **import `THEME_STORAGE_KEY` from `theme-provider` as the siblings do** (it is exported)." This does not warrant a fourth round on its own.
- **DAG / `File:` / `_Depends on:` drift from the v3 edits:** none. Task 2's `File:` line correctly now lists `src/lib/format-date.ts, src/lib/format-date-tz.test.ts (NEW)`; Task 2 correctly stays `_Depends on: (none)` (the dedicated file imports only the bare formatter). No other edge shifts — Task 5/16 v3 edits change wording, not files or dependencies.
- **Coverage matrix:** AC 10.4 → Task 2 is now a genuine mechanical CI gate (the guard fires on revert — verified), so the row is honest. No AC double-counted or orphaned by the v3 edits. NFR Accessibility → 16 still matches the axe body.
- **Novel-gap sweep:** no task touches a file absent from its `File:` line; no load-bearing behavior lost a test; AC 1.2's "verify-only, no automated guard (accepted trade)" labelling remains honest; the route-task↔E2E coupling note is accurate and contradicts no edge. No steering violation. No build-ordering hazard (Tasks 4–6 still land before/with the route rewires; red-by-construction sequencing intact).

---

## Deliverables

### Top risks/gaps (severity-ordered)

1. **Task 16 — `THEME_STORAGE_KEY` mis-described as a local non-exported idiom to copy. (Novel, cosmetic.)** It is `export const` in `theme-provider.tsx:6` and imported by both siblings (`blog-axe.test.ts:4`/`contact-axe.test.ts:4`). **Failure scenario:** an implementer re-declares `const THEME_STORAGE_KEY = "theme"` locally, duplicating a single-source-of-truth constant and diverging from the very sibling idiom the task says to follow; no functional breakage. **Fix:** "import `THEME_STORAGE_KEY` from `theme-provider` (it is exported); copy only `setupTheme`/`assertTheme`/`AXE_TAGS` (those are local)."

*No 2nd–5th risk manufactured. The r2 blocker is resolved (verified by live repro of the UTC-CI condition), Task 5's inline is consistent, and the DAG/ordering/coverage are intact. I will not invent a structural objection to justify a fourth round.*

### Top 3 conclusions to challenge or reverse

1. **"The r2 Task 2 blocker is resolved in v3" (revision note + memory).** **Upheld, with proof.** I did not take the document's word — I reproduced the exact CI condition (`TZ=UTC` worker) and confirmed a mid-process `process.env.TZ="America/Toronto"` set before the dynamic import makes the un-fixed formatter render "May 28" → the guard goes red in UTC CI. The fix is real.
2. **"Copy the local non-exported idiom incl. `THEME_STORAGE_KEY`" (Task 16 v3).** **Reverse the `THEME_STORAGE_KEY` part.** It is exported and imported by the siblings; grouping it with the genuinely-local helpers is a factual slip. The other three are correctly local.
3. **"`verify once locally that it goes RED` is a manual step that could rot" (a natural skeptic's challenge).** **Reject as a blocker.** The CI gate is the standing assertion `display === "May 29, 2026"` under the Toronto pin, which the harness now genuinely enforces on any box; the manual "verify once" is harness sanity, not the regression gate.

### What's missing before implementation-ready

- Nothing load-bearing. **Optional one-line polish:** correct Task 16's `_Leverage`/body to import `THEME_STORAGE_KEY` (exported) rather than copy it. *(nice-to-have — cosmetic; safe to fix in-flight or leave, since the copied value would still be `"theme"`.)*

No missing task, no missing dependency edge, no stale citation, no inert gate. The DAG, topological order, and red-by-construction sequencing remain correct (re-verified).

### Convergence verdict

**Converged / implementation-ready.** The single r2 blocker is genuinely fixed in v3 and I confirmed the fix with a live repro of the precise failure mode r2 described (UTC-CI worker, mid-process TZ pin, dynamic import). Task 5's inlined identifiers and per-doc warning are internally consistent, and the per-doc paths are not confusable. The only remaining issue is a cosmetic mis-statement in Task 16 about `THEME_STORAGE_KEY` being a local idiom — it is an export the siblings import — which does not block a fresh-context implementer and is a one-line phrasing fix. **No fourth round is warranted on technical grounds.** A false "blocker" here would itself be a failure of this review; the honest call is convergence with one optional polish.

---

**Bottom line:** v3 fixed the thing r2 actually broke, and it fixed it *correctly* — the dedicated-file TZ harness fires in UTC CI, which I verified rather than assumed. Ship it; optionally tweak the one Task 16 phrasing about `THEME_STORAGE_KEY`.
