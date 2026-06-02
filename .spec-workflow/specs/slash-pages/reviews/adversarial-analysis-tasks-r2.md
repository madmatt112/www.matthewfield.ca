# Adversarial Review — slash-pages `tasks.md` (v2, round 2)

**Reviewer stance:** principal engineer / release manager, brought in cold to break this plan before a fresh-context implementer executes it. Every claim below is checked against live code, not against the document's own assertions. The brief said: focus on the v2 deltas, classify each finding Novel / Compounding / Recurring, and do not invent a structural objection to justify a third round.

**Verdict up front:** The v2 deltas are *mostly* correct, but the headline v2 fix — the TZ-pinned regression guard in **Task 2** — **does not work as written** in the file Task 2 targets. The existing `format-date.test.ts` statically imports `formatContentDate` at file top, so the module-level formatter constant is constructed once under the runner's ambient zone (UTC in CI) before any test sets `process.env.TZ`; the prescribed `await import("./format-date")` returns that **already-cached** module, so the TZ pin is a no-op and the guard stays green on the un-fixed formatter — exactly the hole r1 claimed v2 closed. This is a **Recurring** finding (r1 Finding 1 is *not* actually resolved) and the one blocker for a third round. The axe pass (Task 16) and the Task 5 inline are otherwise sound, with two small precision nicks. The DAG, citations, and ordering remain correct.

---

## Live-code verification log (v2 deltas)

| Claim under test | Verified? | Evidence |
|---|---|---|
| `formatContentDate` formatter is a **module-level const** constructed at import (Task 2) | ✅ | `src/lib/format-date.ts:1-5` — `const contentDateFormatter = new Intl.DateTimeFormat(...)` at module scope |
| America/Toronto un-fixed → "May 28", fixed-UTC → "May 29" (Task 2 red/green) | ✅ | `TZ=America/Toronto node` repro: no-tz `…T00:00:00.000Z` → **May 28, 2026**; date-only `2026-05-29` → **May 28, 2026**; `timeZone:"UTC"` → **May 29, 2026** |
| Existing `format-date.test.ts` **statically imports** `formatContentDate` at top | ✅ | `format-date.test.ts:3` `import { formatContentDate } from "@/lib/format-date"` — plus `:4-5` import `formatPostDate`/`formatProjectDate` which themselves static-import format-date (`blog.ts:9`, `projects.ts:2`) |
| File **forbids `vi.resetModules()`** (the standard cache-bust fix) | ✅ | `format-date.test.ts:1` literal comment: "Do not call vi.resetModules() in this file — parity assertions depend on shared module instances." |
| vitest does NOT disable per-file isolation | ✅ | `vitest.config.ts` has no `isolate:false`/`pool` override — fresh registry per file, but the static import poisons the cache *within* this one file |
| `AXE_TAGS` is **exported** from blog-axe (Task 16 `_Leverage`/hedge) | ❌ | `blog-axe.test.ts:24` `const AXE_TAGS = [...]` — **local, not exported**; same in `contact-axe.test.ts:8` |
| `setupTheme`/`assertTheme` exported from blog-axe (Task 16 `_Leverage`) | ❌ | `blog-axe.test.ts:26-49` — **local functions, not exported** |
| `AxeBuilder` / `@axe-core/playwright` is a real dependency (Task 16) | ✅ | `package.json` `"@axe-core/playwright": "^4.11.3"`; default import `blog-axe.test.ts:1` |
| `gray-matter` available (Tasks 14/15) | ✅ | `package.json` `"gray-matter": "4.0.3"` |
| Current self-test hardcodes single-doc helper + `=== CANONICAL_HEADINGS.length` (Task 5) | ✅ | `check-authoring-docs.test.mjs:23 (ALL_PRESENT), :33-36 (writeDoc), :104 (CANONICAL_HEADINGS.length)` |
| Current script `main()` early-`process.exit` on missing doc; warning msg hardcodes `DOC_REL_PATH` (Task 5) | ✅ | `check-authoring-docs.mjs:66-69 (early exit), :76 (::warning:: … missing from ${DOC_REL_PATH})` |

The author's grounding remains accurate **for the static facts**. The two ❌ rows are not fabricated symbols — they are *reuse* claims (`AXE_TAGS`/`setupTheme` as importable leverage) that overstate what the sibling file exposes; the task body's actual instruction ("local `setupTheme`/`assertTheme`", "reuse … if exported, else mirror") is correct, so these are cosmetic `_Leverage` overreach, not blockers.

---

## 1. The v2 TZ-pinned regression test (Task 2) — it does NOT work as specified

**This is the blocker. Recurring (r1 Finding 1 is unresolved).**

Task 2 instructs: in `src/lib/format-date.test.ts`, set `process.env.TZ = "America/Toronto"` then `const { formatContentDate } = await import("./format-date")`, and leave the existing loose-regex case untouched — i.e. the new test lives **in the same file** as the existing static import. The premise is "the module-const formatter constructs under that zone." That premise is false in this file:

1. **The module is already loaded before the test runs.** `format-date.test.ts:3` is a top-level `import { formatContentDate } from "@/lib/format-date"`. ESM evaluates that statically at file load — `contentDateFormatter` is constructed *immediately*, under the runner's ambient `TZ` (UTC on the CI box). Lines 4–5 also static-import `formatPostDate`/`formatProjectDate`, which re-import the same module (`blog.ts:9`, `projects.ts:2`). By the time any `it()`/`beforeAll` body runs and mutates `process.env.TZ`, the formatter constant already exists with the UTC zone baked in.

2. **A dynamic `await import("./format-date")` returns the cached module.** Node's ESM loader keys the module registry by resolved specifier. `@/lib/format-date` and `./format-date` resolve to the **same** module record (the `@` alias points at `src`), so the dynamic import is a cache hit — it does **not** re-evaluate the module and does **not** reconstruct `contentDateFormatter` under the new TZ. The pinned zone is ignored; the formatter still formats in UTC. Result: `…T00:00:00.000Z` → "May 29" on **both** the broken and fixed formatter. The guard is green pre-fix — the precise regression hole r1 said v2 closed.

3. **The one standard fix is explicitly forbidden by the file.** To force re-evaluation under the pinned TZ you would `vi.resetModules()` before the dynamic import. But `format-date.test.ts:1` carries a hard prohibition: "Do not call vi.resetModules() in this file — parity assertions depend on shared module instances." (The parity tests at `:26-37` assert `formatPostDate === formatContentDate` by reference; `resetModules` would break that identity.) So the obvious patch is off the table *in this file*.

4. **Even setting `TZ` "early" inside the file does not help.** There is no point inside `format-date.test.ts` that runs before the top-level static imports — module-eval precedes all test bodies. A top-of-file `process.env.TZ = "America/Toronto"` statement still executes *after* the hoisted static `import` evaluations (ESM evaluates imported modules before the importing module's body), so the formatter is still built under the ambient zone.

**Net:** as written, Task 2's "deliberate minimal TZ harness" produces a test that passes identically on the broken and fixed formatter in a UTC CI runner — no regression protection. Task 2's own `Success:` line ("the test demonstrably goes RED if `timeZone: "UTC"` is removed … verify once locally") will *appear* satisfiable to an implementer who verifies on their own west-of-UTC dev box (where the *ambient* zone, not the pin, makes it red) — masking that it is green in UTC CI. That is the worst case: locally-verified-green, CI-silent.

**Fix (name it concretely):** put the TZ-pinned regression test in a **separate test file** (e.g. `src/lib/format-date-tz.test.ts`) that has **no** static import of `format-date` and is free to `process.env.TZ = "America/Toronto"` at the very top *before* its only (dynamic) import — vitest's per-file isolation gives it a clean registry, so the first-ever evaluation of `format-date` in that file happens under the pinned zone. The parity-instance constraint (the no-`resetModules` rule) is confined to the existing file and is untouched. Task 2 must drop "leave it in the existing file / new test in format-date.test.ts" and instead specify a dedicated file, OR specify `vi.resetModules()` *and* relocate the dynamic-import test away from the parity file. Either way the current wording — same file, dynamic import, no resetModules — is internally contradictory with the file it names.

*(Aside: the DST/offset math in Task 2 is correct — verified May 28 vs May 29 above. The flaw is purely the module-cache/static-import collision, not the zone reasoning.)*

---

## 2. The v2 axe pass (Task 16) — works, but the `_Leverage` overstates reuse

**Novel (minor) — the hedge resolves correctly but two leverage claims are wrong.**

- `@axe-core/playwright` is a real dep (`^4.11.3`) and `AxeBuilder` is the default import — the core instruction is implementable. ✅
- **`AXE_TAGS` is NOT exported** (`blog-axe.test.ts:24` / `contact-axe.test.ts:8` are local `const`s). Task 16's hedge "reuse the existing `AXE_TAGS` constant **if exported, else mirror**" therefore deterministically resolves to **mirror** (inline `["wcag2a","wcag2aa","wcag21a","wcag21aa"]`). So the hedge does *not* leave the implementer guessing — it has exactly one live-code answer. But the `_Leverage` line ("blog-axe.test.ts … AxeBuilder + AXE_TAGS") and the `_Prompt` ("mirror blog-axe.test.ts's AxeBuilder().withTags(AXE_TAGS)") read as if `AXE_TAGS` is importable. **Minor fix:** state plainly "inline the four WCAG tags — `AXE_TAGS` is a local const in the sibling files, not an export." Likewise `setupTheme`/`assertTheme` are local, not exported; Task 16's body already says "local `setupTheme`/`assertTheme`" (correct), but the `_Leverage` framing as reusable helpers is loose. None of this blocks implementation; it's `_Leverage` accuracy.
- **No new dev-dependency install task is needed** — `@axe-core/playwright` already ships. So adding the axe pass introduces **no** new dependency edge (the brief asked whether Task 16 needs an install task — it does not). ✅
- **Scope-creep check (the brief's explicit question):** running axe on `/sitemap` and `/slashes` (deliberately `noindex`, flat link-lists) is *cheap and conventional*, not creep. `contact-axe.test.ts` already axes `/profile` and `/contact` with the identical zero-exclusion `withTags(AXE_TAGS).analyze()`; flat link lists with one `<h1>` are the *easiest* surfaces to pass and the *most likely* to expose a real defect (e.g. a list of links with no discernible text, a contrast miss on `<a>` in dark theme). The five-page × two-theme matrix (10 axe runs) is squarely within the established pattern (blog axes 8 pages × 2 themes + a dialog pass). This is **warranted**, not review-driven bloat. One caveat: unlike `blog-axe.test.ts`, the slash pages have no Shiki code blocks, so Task 16 correctly omits the `CODE_BLOCK_EXCLUDE`. Good — no spurious exclusion carried over.

---

## 3. Task 5's inlined checklist — internally consistent, two dangling references

**Compounding (minor) on r1 Finding 3 — the inline is real and mostly self-contained, but not fully.**

Cross-checking the inlined `writeDocs`/assertions against the new `main(AUTHORING_DOCS)` contract:

- **`main()` report-all vs the "neither doc → two stderr lines" assertion:** consistent. The task says `main()` "iterates all docs … does NOT `process.exit` on the first missing doc (it `continue`s and exits once after the loop)." With neither doc written, two iterations each hit the not-found branch → two `author doc not found` stderr lines → exit non-zero, NO `::warning::`. Matches the assertion. ✅ (The current script `:66-69` early-exits and emits one line; the task correctly calls out changing this.)
- **Zero-byte `warningCount === <subjectDoc>.headings.length` when the sibling is full-present:** consistent. A zero-byte subject doc makes all of *its* headings missing (→ that many `::warning::`), while the full-present sibling emits none — so the total equals the subject doc's heading count. The task explicitly forbids the stale hardcoded `CANONICAL_HEADINGS.length`/`9` at `test.mjs:104`. Correct, and it catches the exact current bug. ✅
- **All-present and one-missing assertions:** consistent with report-all. ✅
- **Pure-core call-site edits** (`checkHeadings(text, CANONICAL_HEADINGS)`): consistent — current `checkHeadings(docText)` (`mjs:54`) closes over the module-level `CANONICAL_HEADINGS`; parameterizing to `(docText, headings)` makes the un-passed `headings` `undefined` and `headings.filter` throws, exactly as the task warns. The three rewrites are stated verbatim. ✅
- **Dangling references (the nick):** edit (3) uses `SUBJECT_REL`, `subjectHeadings`, and `<subjectDoc>.headings.length` but **never defines them inline**. The implementer must infer `const SUBJECT_REL = "docs/slash-pages-authoring.md"` and `subjectHeadings = SLASH_PAGES_HEADINGS`. For a task whose entire v2 purpose was "self-contained, no need to open design.md," leaving the subject identifiers implicit is a small self-containment miss. `ALL_PRESENT` is correctly noted as *removed* (replaced by per-doc defaulting in `writeDocs`), and `CANONICAL_HEADINGS`/`SLASH_PAGES_HEADINGS`/`AUTHORING_DOCS` are all defined or exported — those are fine. **Minor fix:** add one line to edit (3): "where `SUBJECT_REL = "docs/slash-pages-authoring.md"` and `subjectHeadings = SLASH_PAGES_HEADINGS` (the slash-pages doc is the subject; contributions is the full-present sibling)."
- **One un-mentioned production edit:** the script's `::warning::` message hardcodes `missing from ${DOC_REL_PATH}` (`mjs:76`). Under `main(AUTHORING_DOCS)` the message must interpolate the *current doc's* `rel`, else a slash-pages heading miss is annotated as missing from the contributions doc. The task implies per-doc semantics but doesn't spell out fixing the message string. The CLI assertions only `match(/::warning::/)` (not the path), so a wrong path would still pass the self-test — a silent-correctness gap, though cosmetic (the annotation text, not the gate). **Minor fix:** add a restriction: "the `::warning::` message must name the per-doc `rel`, not the hardcoded contributions path."

Self-test is mechanically gated by `node --test`, so a structurally wrong rewrite fails loudly — this is thrash/cosmetic risk, not silent-failure risk. Net: the v2 inline substantially delivers on r1 Finding 3; two small completions remain.

---

## 4. Residual atomicity / ordering / coverage

**No new structural defect from the v2 edits.**

- **DAG / `_Depends on:` unchanged-correctness:** the axe pass adds no dependency (dep already installed); the TZ test adds no new dependency (and Task 2 correctly stays `_Depends on: (none)` — but see below). Task 16's edges (7,8,9,10,11,13) are unaffected by the axe addition. No edge needs adding for the v2 deltas. ✅
- **Task 2 self-containment vs the fix:** if Finding 1 is fixed by a *new* file, Task 2's `File:` line must add it (`src/lib/format-date-tz.test.ts`). That's part of the fix, not a separate gap.
- **Coverage matrix:** the v2 addition "NFR Accessibility → 16 (axe pass per page per theme), M (contrast at launch)" now matches the task body. AC 10.4 → Task 2 is the row whose mechanical proof is undermined by Finding 1 — once Task 2's test actually guards the regression, 10.4 is genuinely gated; until then 10.4's covering task does not mechanically prove it in CI. No other AC's `Success:` regressed under v2.
- **Novel-gap sweep:** no task touches a file outside its `File:` list; no load-bearing behavior lost a test (the axe pass *adds* coverage). The route-task↔E2E coupling note (footer section) is accurate and contradicts no `_Depends on:` edge — it correctly records that 7/9/11's soft halves are backstopped by 16/3, which the DAG already encodes (16 depends on 7,9,11). AC 1.2's "verify-only, no automated guard (accepted trade)" labelling is honest and consistent with r1's accepted conclusion. No steering violation.

---

## Deliverables

### Top risks/gaps (severity-ordered)

1. **Task 2 — the TZ-pinned regression guard does not work in the file it targets. (BLOCKER. Recurring — r1 Finding 1 unresolved.)** The existing `format-date.test.ts:3` static-imports `formatContentDate` (and `:4-5` transitively re-import it), so `contentDateFormatter` is constructed under the runner's ambient (UTC) zone at file load; the prescribed `await import("./format-date")` is a cache hit that does **not** reconstruct the formatter under the pinned `America/Toronto`. The guard is green on the un-fixed formatter in UTC CI — the exact hole v2 claimed to close. The one standard fix (`vi.resetModules()`) is explicitly **forbidden** by the file's header comment (parity tests need shared instances). **Failure scenario:** a future revert of `timeZone:"UTC"` passes CI silently; an implementer "verifying once locally" on a west-of-UTC box sees red *from the ambient zone, not the pin*, and ships a guard that is inert in CI. **Fix:** specify a **dedicated new test file** (`src/lib/format-date-tz.test.ts`) with no static format-date import, set `process.env.TZ` at the very top before its sole dynamic import (per-file isolation gives a clean registry), and add that file to Task 2's `File:` line. Remove "leave the new test in the existing format-date.test.ts" wording.

2. **Task 5 — two dangling/under-specified references blunt the v2 "self-contained" goal. (Compounding, minor.)** Edit (3) uses `SUBJECT_REL`/`subjectHeadings`/`<subjectDoc>.headings.length` without defining them inline; and the production `::warning::` message (`mjs:76`) hardcodes the contributions path but must become per-doc under `main(AUTHORING_DOCS)` (the self-test won't catch a wrong path since it only matches `/::warning::/`). **Fix:** define `SUBJECT_REL = "docs/slash-pages-authoring.md"`/`subjectHeadings = SLASH_PAGES_HEADINGS` inline, and add a restriction that the annotation message names the per-doc `rel`.

3. **Task 16 — `_Leverage` overstates reuse of `AXE_TAGS`/`setupTheme`/`assertTheme`. (Novel, minor/cosmetic.)** All three are *local, non-exported* in `blog-axe.test.ts`/`contact-axe.test.ts`. The body's instructions are correct (hedge resolves to "mirror"; "local setupTheme/assertTheme"), so this is implementable, but the `_Leverage`/`_Prompt` phrasing implies importable symbols. **Fix:** state that the WCAG tags and theme helpers are mirrored, not imported.

*No 4th or 5th risk manufactured. The axe scope is warranted (not creep), no new dependency/edge is missing, and the DAG/ordering are intact.*

### Top 3 conclusions to challenge or reverse

1. **"r1 Finding 1 (UTC regression guard) is Accepted and resolved in v2" (memory + tasks v2 revision note).** **Reverse.** The v2 mechanism (TZ pin + dynamic import, same file) is defeated by the file's pre-existing static import and the no-`resetModules` constraint. The finding is **Unresolved**; the resolution must move to a dedicated file.

2. **"This is a deliberate minimal TZ harness and supersedes the design's 'true by construction' note" (Task 2 body).** Challenge the "minimal" framing: the *minimal* working harness is a *separate file*, not a same-file dynamic import. As written it is not minimal — it is non-functional. The supersession claim is right in spirit (a harness IS needed) but the prescribed harness doesn't run under the pinned zone.

3. **"Reuse the existing AXE_TAGS constant if exported" (Task 16) implies a live export.** Challenge: there is no export; the live-code answer is always "mirror." Stating the hedge invites a fruitless search for an import. Resolve it to the single real answer.

### What's missing before implementation-ready

- **A working Task 2 TZ harness:** move the regression-guard test to a dedicated `src/lib/format-date-tz.test.ts` (no static format-date import; `process.env.TZ` set before the lone dynamic import), and add that file to Task 2's `File:` line. *(must-fix — the v2 headline delta is currently inert in CI.)*
- **Task 5 inline completeness:** define `SUBJECT_REL`/`subjectHeadings`; require the per-doc `::warning::` message path. *(should-fix — small, restores the v2 self-containment goal.)*
- **Task 16 leverage accuracy:** note that `AXE_TAGS`/`setupTheme`/`assertTheme` are mirrored, not imported. *(nice-to-have — cosmetic.)*

No missing *task*, no missing *dependency edge of consequence*, no stale citation of a static fact. The DAG, topological order, and red-by-construction sequencing remain correct (re-verified). **This is not a converged document:** Finding 1 is a genuine blocker that makes the spec's load-bearing regression guard (the whole point of the v2 Task 2 delta) silently ineffective in CI — a third round (or a direct Task 2/5/16 patch) is warranted, not a manufactured objection.

---

**Bottom line:** v2 fixed the *symptoms* r1 named (it added a TZ harness, an axe pass, and an inlined checklist) but the TZ harness as specified cannot run under the pinned zone in the file it targets — the static import + no-`resetModules` rule defeat it. Fix Task 2 to use a dedicated test file, tidy the two minor nicks in Tasks 5 and 16, and the document is implementation-ready. Everything else the author claimed about v2 holds up against live code.
