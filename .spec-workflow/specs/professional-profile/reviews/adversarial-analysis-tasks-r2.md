# Adversarial Analysis: professional-profile tasks.md (v2)

The v2 tasks document accepted most of the prior round's structural critique — task 17 is split into 17/17.1/17.2/17.3, task 23 into 23/23.1/23.2, task 7 sprouted 7.1/7.2/7.3 (zod+react-obfuscate install, @axe-core/playwright install, LHCI workflow), canonical/CustomEvent/role=status assertions landed in task 22, the `form-action 'self'` header check landed in task 23, sitemap + headshot viewport checks landed in task 24, task 11 enumerates 429/502/503/504, task 17 carries the `sm:` breakpoint + 44px + min-height callouts, and task 21 was rewritten as "audit AND fix." These are real wins and they have closed the loudest v1 gaps.

What's left is subtler and more dangerous. The new splits create a *paperwork* atomicity — three tasks (17.1/17.2/17.3) modify the same `useEffect` in the same file in strict order. The new LHCI workflow lands six phases ahead of the pages it Lighthouses. The new `testId` forwarding crosses a task boundary where the function signatures don't agree. And several v1 findings (task 8 schema/content split, task 12 case-cluster split, manual-task enforcement, DMARC tightening reminder, prod `RESEND_FROM` regression guard, real-production verification) survived the v2 rewrite unchanged.

The dominant failure mode is now **cross-task contract drift**: pairs of tasks describe the same surface in subtly different language and no machinery reconciles them.

---

## 1. Task 17's split is a paperwork atomicity, not a delivery atomicity

### Challenge the claim that 17.1/17.2/17.3 are independently shippable

The v2 split presents tasks 17, 17.1, 17.2, 17.3 as four reviewable units. Read the actual file footprint:

- **Task 17** authors `src/components/shared/contact-form.tsx` with "the side-effect call sites empty/no-op placeholders or omit entirely."
- **Task 17.1** modifies `src/components/shared/contact-form.tsx` — adds a `useEffect` keyed on `[attemptId, state.kind]` performing three focus transitions.
- **Task 17.2** modifies `src/components/shared/contact-form.tsx` — extends the *same* `useEffect` to call `scrollIntoView` on the success transition. The task body says explicitly: "On the `submitting → success` transition (the same effect added in 17.1)…"
- **Task 17.3** modifies `src/components/shared/contact-form.tsx` — extends the *same* `useEffect` to dispatch the `contact_submit_success` CustomEvent. Task body: "On the `submitting → success` transition (same effect as 17.1/17.2)…"

All four touch the same file. 17.2 and 17.3 textually depend on 17.1's effect existing. The split does not enable parallel work and it does not enable PR-by-PR landing — every reviewer of 17.2 must read 17.1's effect to follow the diff, and 17.3 is a one-line addition to a closure that only makes sense in 17.2's context. The split makes the *checklist* finer-grained but does not change the *delivery* unit.

**Concrete failure scenario**: Implementer lands task 17 in PR A. Lands 17.2 (reduced-motion scrollIntoView) in PR B *before* 17.1. PR B's code references a `useEffect` and a focus call that don't exist yet. Either PR B has to inline the whole focus-management effect (re-doing 17.1's work and creating merge conflict when 17.1 lands), or PR B can't merge until 17.1 lands. The "independently shippable" framing breaks down on contact with strict ordering.

- Challenge the framing that 17.1 → 17.2 → 17.3 is parallel — they share a closure, a file, and a transition.
- Stress-test the claim that 17.2's "behavior depends on what 17.1 added" is acceptable atomicity. The whole point of splitting was to make focus-management and motion-correctness *independently fixable*, not just *sequentially landable*.
- Confront the interim state: task 17 lands a "working" form whose success heading is **not focused** (a11y broken), whose success state has **no scrolling** (UX broken on long pages), and which **dispatches no analytics event** (observability hook missing). If this PR ships to production before 17.1/17.2/17.3 land, the requirement set is partly violated and the implementer's "task 17 complete" checkbox is honest by the letter of the checkbox and dishonest by the letter of the requirements.

**Better split** (would actually buy independence): collapse 17/17.1/17.2/17.3 into ONE task with a richer body, *or* split by surface that owns separate code regions — e.g. (a) DOM + state machine, (b) submission pipeline + status-code mapping (talks to network, separate code path), (c) the success-side useEffect bundling focus + scroll + CustomEvent, (d) the error-side useEffect bundling error focus management. (c) and (d) live in different effects and can land independently in a way that (current 17.1/17.2/17.3) cannot.

**Classification: Novel.** v1 said "split 17 because surfaces are independent." v2 split it, but the split is along the *wrong axis* — by SHALL-clause rather than by code region. The split achieves checkbox granularity without achieving delivery granularity.

---

## 2. Phase ordering ships broken intermediate states

### Stress-test the claim that task 7.3 (LHCI workflow) belongs in Phase 1

Task 7.3 lands a GitHub Actions workflow that "assert four Lighthouse categories (performance, accessibility, best-practices, SEO) on `/profile` and `/contact`." But `/profile/page.tsx` doesn't exist until task 18 (Phase 6), and `/contact/page.tsx` doesn't exist until task 19 (Phase 6). That is ten tasks downstream.

Concrete scenario: Implementer lands task 7.3 on `main`. The next PR opens a Phase 2/3/4/5 implementation. Vercel builds a preview. LHCI workflow fires. LHCI hits `/profile` on the preview URL — gets a 404 page (or a placeholder, if site-foundation left one). Lighthouse scores a 404 page across performance/a11y/best-practices/SEO. The PR comment posts those meaningless scores. Either: (a) reviewers learn to ignore the comment (degrades the gate's value before it ever matters), or (b) reviewers occasionally panic at a score regression that is actually the 404 page rendering differently than yesterday.

- Challenge the placement of task 7.3 in Phase 1. The workflow has no meaningful target until Phase 6.
- Stress-test the success criterion "A PR opened against main shows a 'lhci' check that completes (pass/warn, not fail-blocking) and a comment containing four scores." On the *first* PR after task 7.3 lands, this is a 404 page's scores. The success criterion is satisfied trivially and uselessly.
- Confront the implementer's choice: "(either via `pull_request_target` + the Vercel API, or by polling the GitHub `deployment_status` event — pick whichever the Vercel-Lighthouse integration recommends in current docs)." Two implementers picking from "current docs" will produce two different workflows. The task is non-deterministic on the choice that most affects security (`pull_request_target` runs with write tokens on PRs from forks — accepting external PRs with that trigger is a footgun).
- The task should land alongside or after task 19, with a guard that LHCI fails fast (or skips) when `/profile` and `/contact` return 404. Otherwise the value of the gate accumulates only post-Phase 6, and noise accumulates immediately.

**Concrete failure scenario for the security note above**: A future contributor opens a PR from a fork to fix a typo. The LHCI workflow uses `pull_request_target` (one of the two options the task accepts). The workflow runs with the repository's write token on the forked PR's code. The contributor's PR injects a token-exfiltration step into the LHCI script the workflow downloads. Tokens leak. This is the canonical `pull_request_target` foot-gun. The task body's "pick whichever" framing offers no warning.

**Classification: Novel.**

### Stress-test the claim that task 17 ships a "form-works core"

Task 17's body: "the success `<h2>` renders with `tabIndex={-1}` but is not focused yet; success state shows without scrollIntoView; no CustomEvent is dispatched." This is described as a "core" that's complete on its own. It is not. Req 4.5 (focus on success), Req 4.8 (reduced-motion compliance), and Req-NFR-Observability (CustomEvent) are all *requirements* the task carves out and explicitly leaves unimplemented.

If task 17 lands and PR review concludes "this satisfies its `_Requirements:` line," that's *technically* honest — task 17 cites Req 3.2/3.7/3.8/4.1/4.3/4.4/4.7/4.9/4.11/Req-NFR-Usability/Req-NFR-Performance — but Req 4.5/4.8/Req-NFR-Observability are deferred to 17.1/17.2/17.3 *without the task list flagging that the requirement is partially shipped on landing of 17 alone*. A reviewer who only sees task 17's PR sees the form working and checks the box.

- Stress-test the assumption that "checkbox complete" === "requirement satisfied." Currently it doesn't, for any Req 4.5/4.8/Req-NFR-Observability between task 17 landing and 17.3 landing.
- Confront whether the spec workflow allows a task to ship that *delegates* part of a Req to a future task. The current task body labels this clearly but doesn't propagate that to a guard.

**Classification: Compounding** on v1's "task 17 hides ~6 surfaces" finding. v1 said splitting would fix the regression-hiding problem; v2 split it; v2 made a new regression-hiding problem (interim incomplete state) that v1 didn't predict.

---

## 3. Cross-task contract slippage

### Challenge the testId forwarding contract between task 9 and task 11

- Task 9 defines: `type ContactEmailInput = { name; email; message; source: 'profile' | 'contact' | undefined }`. No `testId` field.
- Task 11 says: "Test-id forwarding: read `parsed.testId` BEFORE handing validated body to `sendContactEmail`. If string, pass as `X-Test-Id` request header on the outbound fetch — implement by extending `sendContactEmail` to accept an optional `testId` arg, or via a per-call header override (design accepts either as long as the header name and behavior match)."

Two failures here:

1. **Type contract drift**: If task 9 lands as written (no testId), task 11 cannot pass testId to `sendContactEmail` without modifying `mail.ts` — but task 11's files list is `src/app/api/contact/route.ts` only. So task 11 must *also* modify `src/lib/mail.ts`, but that's not declared in its scope. The implementer either: (a) modifies mail.ts inside task 11 (scope leak; reviewer reads "API route" and sees mail.ts diff), or (b) goes the "per-call header override" route, which would mean exposing a low-level fetch hook from mail.ts — but mail.ts owns its own fetch call internally; there's no documented hook.

2. **Test coupling drift**: Task 12's mocks must match task 11's implementation choice. If task 11 chose option (a), task 12's `vi.mock('@/lib/mail')` mocks `sendContactEmail(input, testId?)`. If option (b), task 12 mocks a different shape. The task pair leaves implementer choice in task 11 and downstream-couples test code in task 12.

- Challenge the claim that "design accepts either" is acceptable in a task spec. Two implementations diverge the public surface and the test surface.
- Stress-test which one is actually intended. The simplest read — "extend `sendContactEmail` to accept an optional `testId` arg" — requires *task 9 to add the field* OR *task 11 to expand task 9's deliverable*. Task 9's `ContactEmailInput` type does not include `testId`. The task list does not say which task owns the addition.

**Resolution**: pick one. Add `testId?: string` to `ContactEmailInput` in task 9 (and add a single test case for header forwarding in task 10). Then task 11 simply passes it through. Two-line addition to task 9 closes the cross-task gap.

**Classification: Novel.**

### Challenge the buildCommand 86-character claim in task 5

Task 5 success criterion: "`jq .buildCommand vercel.json` returns the exact 86-character string."

The documented buildCommand: `git fetch --deepen=1000 || git fetch --unshallow || true && pnpm build`.

Counting: 23 (`git fetch --deepen=1000`) + 4 (` || `) + 21 (`git fetch --unshallow`) + 8 (` || true`) + 14 (` && pnpm build`) = **70 characters**, not 86.

This is either:
- A typo (the design or task author miscounted).
- An indicator that the *intended* command is longer than what's in the spec body (e.g. includes `git config --global ...` somewhere that got dropped during editing).

Either way, an implementer who writes the 70-char string and runs `jq .buildCommand vercel.json | wc -c` (which counts the newline byte too, getting 71 or 72) will see the count is not 86 and either: (a) panic and start adding to the command, (b) ignore the success criterion's char count, (c) ask for clarification.

- Challenge the success criterion's numerical specificity. If the implementer can't verify the count matches the spec, the gate is broken.
- Stress-test where the "86" came from. If from the design doc, that document has an inconsistent count somewhere too. If invented in v2, it's a fabrication.

**Concrete failure scenario**: Implementer rounds-trips the command through a JSON editor that escapes the `&&` or `||`, producing a string that is character-different but functionally identical. `jq` returns 70 chars, success criterion says 86. Implementer assumes they got the spec wrong, hand-edits to match the count, breaks the build command.

**Resolution**: Drop the char-count assertion entirely. The substantive check is "command string verbatim per design"; the byte count adds nothing and is wrong.

**Classification: Novel.**

### Stress-test the THEME_STORAGE_KEY import in task 23.1

Task 23.1: "import `THEME_STORAGE_KEY` from `@/components/layout/theme-provider` (task 13)."

This phrasing is ambiguous between:
- `import { THEME_STORAGE_KEY } from '...'` (named import — matches task 13's `export const`)
- `import THEME_STORAGE_KEY from '...'` (default import — does NOT match task 13)

Task 13 says: "Export a single named constant `THEME_STORAGE_KEY`." So the answer is "named import," but the v2 task 23.1 prompt writes the import imperatively in prose, without code style. An implementer writing `import THEME_STORAGE_KEY from '@/components/layout/theme-provider'` gets a tsc error (default import doesn't exist), which is fine — it'll fail fast. But the prose ambiguity is gratuitous when one extra brace pair would eliminate it.

- Stress-test the prompt phrasing. Specs that compile imports in prose should pin syntax.

**Classification: Novel.** Low severity. Self-correcting at compile time.

---

## 4. Structure.md edit choreography between tasks 7 and 21

### Challenge the task 7 → task 21 dance over `scripts/`

- **Task 7** adds a "forward-reference for `scripts/`" to structure.md, noting that "`scripts/run-e2e.mjs` (the only inhabitant) is created in task 20."
- **Task 21** "adds `scripts/` to the directory tree (this is the half deferred in task 7)."

Two issues:

1. **The wrong task number is cited in task 7.** `scripts/run-e2e.mjs` is created in **task 21**, not task 20. Task 20 creates `e2e/fixtures/mock-resend.mjs` (NOT in scripts/). Task 7's forward-reference points to the wrong follow-up task. An implementer reading task 7 to write the structure.md note will document the wrong dependency.

2. **No machinery reconciles the two edits.** Task 7 lands a "(future)" annotation. Task 21 is supposed to remove that annotation and replace it with a real tree entry. There is no test, no lint rule, no schema for structure.md. If task 21's implementer forgets to remove the "(future)" annotation, structure.md ships with conflicting prose ("`scripts/` is the future home for…" alongside "scripts/run-e2e.mjs" as an actual tree entry). The doc reads as work-in-progress.

- Challenge whether structure.md ought to be edited twice over the same directory. Better: have task 21 do the only edit (delete task 7's structure.md responsibility for `scripts/`; task 7 only documents `vercel.json`).
- Stress-test the task-number citation. Verify that every forward-reference in the task list points to the task that actually creates the referenced file.

**Concrete failure scenario**: An implementer audits the spec's forward-references end-to-end, finds task 7 says "task 20 creates `scripts/run-e2e.mjs`," opens task 20, finds task 20 creates `e2e/fixtures/mock-resend.mjs`. Now the implementer doesn't know whether task 7 is wrong or task 20 is wrong, and pauses for clarification.

**Classification: Novel** (task-number citation error); **Compounding** on v1's "split task 7 because the structure-doc-lies-about-reality window is wrong" finding — v2 took the split but introduced a new problem (the wrong forward-reference) in the half that was split out.

---

## 5. Recurring v1 findings unaddressed in v2

### Recurring: task 8 (schema + transform + content + frontmatter) not split

v1 recommended splitting task 8 into 8a (schema + transform, unregistered) + 8b (registration + content). v2 took the rebut and left task 8 as one. The same-commit constraint *between content and registration* is real; the same-commit constraint *between transform implementation and content authoring* is not. The transform (with `execFileSync`, `--follow`, the named-error contract) is a security-conscious chunk that benefits from review in isolation.

The v2 task 8 body added an additional surface: "If Velite's MDX pipeline does not already include rehype-slug (check the existing pages collection's mdx() options), add it to the shared MDX config so h2/h3 headings in profile.mdx render with anchor IDs (Req 1.11)." So task 8 now *also* owns rehype-slug installation+configuration (Req 1.11) on top of schema+transform+content+frontmatter. The task got *bigger*, not smaller.

**Escalated severity** (recurring): the rehype-slug addition makes the split-or-not call clearer — at least the rehype-slug install should be its own task. Task 8's coverage gap was identified in v1 ("NO TASK installs/configures rehype-slug"); v2 fixed the gap by stuffing the install into task 8, *not* by adding a new task. That's the wrong fix axis.

### Recurring: task 12 (~12 cases in one Vitest file) not split

v1 recommended 12a/12b/12c/12d. v2 added a logging-discipline assertion (correct addition for Req 3.10) and left the case count at 12+. The yes/no signal problem (a reviewer can't easily tell which case slipped) remains.

**Severity unchanged but unresolved.**

### Recurring: task 24 not split into local-gate vs production-verification

v1 recommended 24a (local quality gate) + 24b (post-merge production verification — submit real form on prod, verify email, verify CSP headers via curl, verify canonical). v2 added sitemap and headshot viewport checks *inside* task 24 (good) but did not add the post-merge step (still missing). Real-Resend deliverability is verified by zero tasks. The spec ships with no end-to-end production confirmation that the funnel actually delivers mail.

**Recurring and unresolved.** This is now the highest-severity unaddressed v1 finding.

### Recurring: DMARC 14-day reminder, RESEND_FROM production regression guard

Both were called out in v1 §6. Neither has a task in v2.

- Req 3.6's 14-day post-launch tightening (operator-deferred) — still no task.
- A two-line runtime check in `mail.ts` that throws if `VERCEL_ENV === 'production' && RESEND_FROM === 'onboarding@resend.dev'` — still no task. v2 task 9's `_Prompt:` mentions the sanity guard for (test-key + production base URL) but not the RESEND_FROM regression class.

**Both recurring and unresolved.**

### Recurring: manual-task enforcement gap (tasks 1, 2, 8 same-commit)

v1 §3 and §6 said the manual-task discipline (and task 8's same-commit constraint) are procedure-only with no CI gate. v2 unchanged. A future contributor lands task 3's alias-in-source before task 1's mail-provider filter is verified, and the alias is searchable globally within minutes. The task body warns; no machinery enforces.

**Recurring.** Severity unchanged but increasing as project moves into multi-contributor territory.

---

## 6. Coverage gaps still surfacing

### Stress-test task 22's E2E `testId` reliance

Task 22 sets `window.__TEST_ID` via `page.addInitScript`. Task 17 says the wire payload includes `testId` only if `window.__TEST_ID` is set. Task 11 says read `parsed.testId` and forward as `X-Test-Id` header. Task 20 says the mock partitions calls by `X-Test-Id`.

The chain works IF and ONLY IF the cross-task contract holds:

- Task 17 sends `testId` in JSON body when `window.__TEST_ID` is set.
- Task 11 reads `parsed.testId` BEFORE handing validated body to `sendContactEmail` (so zod's `.strip()` doesn't drop it — but `.strip()` *does* drop unknown keys, so `parsed.testId` must be read off the raw `parsed` object, not the zod-validated one). Task 11's body: "Test-id forwarding: read `parsed.testId` BEFORE handing validated body to `sendContactEmail`." Correct read.
- Task 11 forwards as outbound `X-Test-Id`. Task 9's signature has no testId; see §3.
- Task 20 reads `X-Test-Id` and buckets calls.

**Failure scenario**: implementer of task 11 reads `validated.testId` instead of `parsed.testId` (transposed by accident). Zod strips testId during validation. Outbound fetch never sends `X-Test-Id`. Task 20 buckets all calls under `__untagged__`. Task 22's `__state?testId=<id>` returns empty bucket. Test fails with `calls.length === 0` instead of 1 — a confusing failure mode (the reviewer thinks the form's broken, not that testId got dropped).

- Stress-test whether task 11's prompt distinguishes between `parsed.testId` (read off the raw parsed object) and `validated.testId` (read off the zod result). The task says "read `parsed.testId` BEFORE handing validated body" — but a careless implementer reads it after and the symptom is silent.
- Confront whether task 12 has a test case for "testId is read pre-validation and forwarded." It does not enumerate this case in v2. If task 12 only mocks `sendContactEmail`, the cross-task contract isn't asserted at the unit level either.

**Resolution**: add a task 12 case "valid body with testId in JSON → sendContactEmail called with testId argument (or fetch mock called with X-Test-Id header — whichever option task 11 chose)."

**Classification: Novel.**

### Stress-test task 17's `min-h-[<measured-px>]` layout-shift container

Task 17: "wrap the form region in a container with `min-h-[<measured-px>]` (measured during implementation against the success-state render) so the role=status region rendering does not push subsequent page content downward."

This is hand-wavy on the measurement:

- *When* is the success-state height measured? At which viewport? With which content? Light theme or dark? In task 17 (where the success state is rendered but un-scrolled, un-focused) or in 17.1/17.2/17.3 (after focus + scroll + CustomEvent land)?
- The "measured during implementation" approach hard-codes a height into Tailwind. If the success-state copy is later edited (e.g. recruiter name is added), the height changes and CLS regresses silently.
- There's no test for CLS in any task. Req-NFR-Performance says "no vertical layout shift from obfuscation reveal or form state changes." Task 23/23.1/23.2 don't assert this. The `min-h` is a procedural mitigation with no verification.

- Challenge the measurement methodology. Specs should not embed numeric pixel values without a regeneration mechanism.
- Stress-test the absence of a CLS assertion. Without one, the `min-h` could be wrong on landing and nobody would know until the next a11y/perf audit.

**Better**: render the form's status region with `min-height: max(<idle-height>, <success-height>)` computed via the same DOM (e.g. an invisible "shadow" copy of success state that always reserves its row), OR add a Lighthouse CLS assertion at the threshold Req-NFR-Performance implies.

**Classification: Novel** (the `min-h-[<measured-px>]` approach is new in v2; v1's "no task reserves vertical space" finding was answered with this hand-wave).

---

## Closing Deliverables

### Top 5 risks/gaps (ranked)

1. **Task 17 split is along the wrong axis (Novel)**. 17.1/17.2/17.3 all extend the same useEffect in the same file in strict order. The split achieves checkbox granularity without delivery granularity. Failure scenario: implementer lands task 17 to production, requirements 4.5/4.8/Req-NFR-Observability are *partially* satisfied (task 17 cites them indirectly via its sibling tasks), reviewer checks the box, the form ships without focusing the success heading on submit. Better split would be by code region (success-side effect vs error-side effect) not by SHALL clause.

2. **Cross-task contract drift on `testId` (Novel)**. Task 9's `ContactEmailInput` type lacks `testId`; task 11 says to forward it via `sendContactEmail`; task 12 mocks `sendContactEmail` without enumerating the testId-forwarding case; task 22 depends on the whole chain working. A silent regression where testId is dropped post-validation results in task 22 reporting "form broken" rather than "testId broken." Resolution is a two-line addition: testId in the type, one test case in task 12.

3. **LHCI workflow lands six phases before the pages it tests (Novel)**. Task 7.3 in Phase 1 runs Lighthouse on /profile and /contact, which exist starting Phase 6. First several runs Lighthouse a 404. Worse: task 7.3 offers `pull_request_target` as an acceptable trigger choice without flagging that this is the canonical token-exfiltration foot-gun on fork PRs. Either delay the workflow to land alongside task 19, or scope it to skip when /profile and /contact return 404, AND pin a non-`pull_request_target` trigger.

4. **Recurring: post-merge real-production verification still missing (Recurring, escalated)**. v1 recommended splitting task 24 into 24a (local) + 24b (production smoke — submit real form, verify email arrives, curl CSP headers, check canonical). v2 added sitemap and headshot checks inside task 24 (improvement) but the real-Resend deliverability path is exercised by zero tasks. The spec ships with no end-to-end production confirmation that the funnel delivers mail. Operator finds out manually post-launch.

5. **Recurring: manual-task enforcement gap (Recurring)**. Tasks 1, 2, 8 carry critical procedural constraints (alias provisioned before commit referencing it; same-commit Velite schema+content) with zero CI machinery. v2 unchanged. The window between task 1 verified and task 3 committed is operator-discipline-only. GitHub Code Search indexes within minutes. The risk is irreversible once tripped.

### Top 3 conclusions to challenge or reverse

1. **"Task 17 split is fixed → wrong, it's a paperwork split, not a delivery split."** The four subtasks share a useEffect, a file, and a strict order. They are reviewable in a chain but not independently. A correct split is by code region — success-side useEffect (focus + scroll + CustomEvent bundled) vs error-side useEffect (focus management for validation-error and server-error). The current SHALL-clause split optimizes for checklist completeness, not for review independence or PR isolation.

2. **"Task 7.3 LHCI workflow belongs in Phase 1 → wrong, it should land in Phase 6 alongside the pages it tests."** Phase 1 LHCI either Lighthouses 404 pages (noise) or fails-fast (in which case the gate is broken until Phase 6 anyway). The workflow should land with task 19, when /profile and /contact actually exist. Additionally, the task's acceptance of `pull_request_target` as a trigger option must be removed or warned-about — the fork-PR token-exfiltration class is well-known.

3. **"Cross-task ambiguity ('design accepts either') is acceptable specification language → wrong, this is a spec smell."** Task 11 offers two implementations of testId forwarding. Task 17 offers measurement-dependent `min-h-[<measured-px>]` without a methodology. The "design accepts either" idiom delegates choice to implementer, which then couples downstream test code to the choice. Pick one and pin it. The cost of pinning is zero; the cost of not pinning is two reviewers reaching different conclusions about whether an implementation matches spec.

### What's missing — work to do before acting on this document

**Tasks to add (still missing after v2)**:
- **Task K**: Production-env runtime guard in `mail.ts` that throws if `VERCEL_ENV === 'production' && RESEND_FROM === 'onboarding@resend.dev'`. Two lines; closes a silent-deliverability-regression class. (Recurring from v1.)
- **Task L**: 14-day post-launch DMARC tightening reminder — either as a calendar-action task or as an explicit deferred/operator-only acknowledgment in the requirements trace. (Recurring from v1.)
- **Task M**: Post-merge production smoke — submit real form against production URL, confirm email receipt, curl-verify CSP headers, curl-verify canonical link absoluteness. (Recurring from v1.)
- **Task N**: A CLS assertion (Lighthouse or Playwright `measureLayoutShift`) on /profile and /contact, covering the obfuscation-reveal + form-state-change paths. The `min-h-[<measured-px>]` mitigation has no verification today.

**Tasks to fix (contract drift / numeric errors / wrong references)**:
- **Task 5**: drop the "86-character" claim; the actual buildCommand is ~70 chars.
- **Task 7**: change the forward-reference "task 20" → "task 21" for `scripts/run-e2e.mjs`. Audit every other forward-reference in the task list (cheap; ~5 minutes).
- **Task 9**: add `testId?: string` to `ContactEmailInput`. Removes the cross-task contract drift with task 11.
- **Task 11**: pin to *one* testId-forwarding implementation. Recommend: extend `sendContactEmail` to accept testId (per task 9 fix above).
- **Task 12**: add a "testId forwarded" case. Without it, the wire-up isn't unit-tested at all.
- **Task 17**: drop the "static text 'Sending…' to make 17.2 simpler" trade-off. The right answer is a CSS-animated spinner gated on `@media (prefers-reduced-motion: no-preference)`. UX wins; the test still asserts `animationName === 'none'` under reduced-motion.
- **Task 23.1**: pin the import as `import { THEME_STORAGE_KEY }` (named import).

**Tasks to split (still recurring from v1)**:
- **Task 8 → 8a (schema + transform + rehype-slug install, unregistered) / 8b (registration + content + frontmatter)**. v2 made task 8 *bigger* by stuffing rehype-slug into it; this makes the split call clearer than it was in v1.
- **Task 12 → 12a/12b/12c/12d** as proposed in v1.
- **Task 17 → re-split by code region** (success-side effect vs error-side effect vs DOM/state machine vs submission pipeline).
- **Task 24 → 24a (local gate) / 24b (production smoke — Task M above)**.

**Tasks to move**:
- **Task 7.3 (LHCI) → Phase 6**, immediately after task 19. Or alternatively gate LHCI to skip when /profile returns 404 (less clean).

The v2 rewrite resolved most of v1's structural critique. What survives is (a) recurring v1 findings the author chose not to address (task 8 split, task 12 split, real-production verification, RESEND_FROM regression, DMARC reminder, manual-task enforcement), and (b) a new class of issue introduced *by* the v2 changes themselves — paperwork-style atomicity in task 17, premature LHCI placement, cross-task contract drift (testId, char-count, structure.md choreography). The new issues are smaller individually but they are evidence that the task list is being edited as a checklist rather than as a delivery plan, and the gap between "checkbox satisfied" and "requirement satisfied" is widening, not closing.
