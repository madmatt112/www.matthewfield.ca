# Adversarial Review — professional-profile / tasks.md (Round 3)

You are a senior staff engineer and release manager with deep experience shipping
security-sensitive Next.js features and auditing implementation task plans for atomicity,
ordering, and design↔code drift. You have been handed the task breakdown for the
`professional-profile` spec. Your job is to **tear it apart** — find every gap, every
mis-mapping, every place a task will not actually accomplish what it claims. You are not here
to validate or encourage. Assume the author is competent and has already survived two prior
review rounds; your value is finding what those rounds missed and what the latest change set
introduced.

## What changed since the last review (the v3 change set — your primary target)

The `professional-profile` feature was **first implemented against design v2** (commit
`a137649`); tasks 1–24 are all marked `[x]`. Design rounds 2–3 then added security-superior
prescriptions the **shipped code does not contain**. The v4 design captured these as an
*Implementation Status & Required Remediation* table (items R1–R6). The v3 tasks document adds
a new **Phase 9 (tasks 25–30, all `[ ]`)** to reconcile the code to that table:

- **25 = R1 (Critical/security)**: gate the `testId`→`X-Test-Id` forward behind
  `process.env.NODE_ENV !== 'production'` in both `mail.ts` and `route.ts`; add prod-suppression
  tests.
- **26 = R2 (Critical/Req 3.10)**: replace the route step-8 bare `throw err` with
  `console.warn("resend_unexpected")` + a sanitized 502; add a generic-error→502 test.
- **27 = R3 (High)**: replace the racy `state.kind` double-submit guard with a `useRef`
  in-flight latch; add a two-rapid-submits→one-POST E2E test.
- **28 = R4 (High/coverage)**: add a `POST /__mode` forced-status control to the mock, plus
  validation-error / server-error-recovery / Enter-key / `framenavigated`-no-`action` E2E tests.
- **29 = R5 (Low)**: normalize `Origin: null`/empty/unparseable to *absent*.
- **30 = R6 (Low)**: add `.max()` bounds to the profile schema string fields; fix the 413
  response body to the Req-3.5a literal.

Read `tasks.md` in full, plus `design.md` (especially the *Implementation Status & Required
Remediation* table and the *Adversarial Review Response Log*), `requirements.md`, and the
steering docs, before attacking. Ground every finding in the actual text.

## Analysis Dimensions

Attack along at least these axes. Add others if you find them.

### 1. Does Phase 9 actually close the R1–R6 drift, or just restate it?
- For each task 25–30, verify it maps 1:1 to its design R-item and that its **success criterion
  is verifiable** — not "implement per the design" hand-waving. Cite any task whose Success
  clause would pass even if the drift were not actually fixed.
- R1/R2 are described as "a live, unauthenticated, repeatable production Req-3.10 violation."
  Challenge whether tasks 25 and 26 are **sequenced and scoped** to be landed first and
  independently, or whether they are blocked behind / entangled with the low-severity R5/R6 work.
- Phase 9 re-opens code that tasks 8/9/11/17/20 already shipped (`mail.ts`, `route.ts`,
  `contact-form.tsx`, `velite.config.ts`, the mock). Find every place a Phase 9 task **silently
  contradicts** the original task's body or Success criteria, or where the original `[x]` task's
  description is now stale/false and was left unedited (e.g. tasks 9/11/12 still describe the
  *ungated* testId forward as correct; task 17 still describes the `state.kind` guard).

### 2. The testId chain after R1 gating — does the suite still work?
- Task 25 gates the `testId`→`X-Test-Id` forward behind `NODE_ENV !== 'production'`. Tasks 22
  and 28's E2E partitioning **depends on that forward reaching the mock**. Trace whether the E2E
  runner (task 21's `run-e2e.mjs`) sets `NODE_ENV` to something other than `production`, or
  whether `next start` forces `NODE_ENV=production` — in which case R1 gating would **break the
  entire E2E partitioning scheme** (every call lands in the `__untagged__` bucket and parallel
  workers cross-contaminate). This is the highest-value thing to check: a security fix that
  silently disables the test isolation it depends on.
- Is the gating single-point or belt-and-suspenders, and does task 25 keep the two layers
  consistent? Does task 28's `/__mode` control depend on the same `X-Test-Id` partitioning that
  R1 may have just gated off in the relevant env?

### 3. Task 28 scope — is it atomic, and does it collide with task 20/22?
- Task 28 modifies the mock (task 20's artifact) AND adds four behaviorally-distinct E2E tests
  (validation-error, server-error-recovery, Enter-key, JS-submit). Challenge whether this is one
  reviewable task or a bundled phase masquerading as a task. Compare to the precedent set by the
  23/23.1/23.2 split — why is R4 not similarly decomposed?
- The `/__mode` forced-status control mutates per-`testId` server state. Does task 28 specify
  reset/teardown so a forced 503 in one test does not leak into another under `fullyParallel`?

### 4. Recurring unresolved items — addressed or silently dropped?
Prior rounds flagged these and they were never resolved. Confirm whether v3 addresses them or
leaves them open (escalate severity if recurring):
- Task 12 (~12 Vitest cases in one file) and task 24 (local-gate + production-smoke) never split.
- **Real-production verification**: real-Resend deliverability is still unverified by any task.
- **RESEND_FROM prod-regression guard** (throw if `VERCEL_ENV=production` AND
  `RESEND_FROM=onboarding@resend.dev`) — still in no task, and R1/R2 touch `mail.ts`/`route.ts`
  anyway, so the cost of folding it in is now near-zero.
- Manual-task-1/2 ordering and task-8 same-commit constraints remain procedural with no CI gate.
- DMARC 14-day tightening (Req 3.6 SHALL) still has no carrier task.

### 5. Cross-task citation & numerical correctness (a confirmed prior-error pattern)
- Audit **every** forward/back reference added in Phase 9 (task numbers, file paths, Req IDs,
  design section names). The r2 review caught a wrong task-number citation and a wrong character
  count — treat these as a pattern, not a one-off. Verify task 25–30's `_Leverage`/`_Requirements`
  citations point at real tasks and real design/Req sections.
- Verify each Phase 9 task's claimed file set matches what the change actually requires (e.g.
  does R1's prod-suppression test belong in `route.test.ts`, `mail.test.ts`, or both, and does
  the task name them correctly?).

### 6. Status-marker & re-open semantics
- Tasks 1–24 are `[x]`; Phase 9 is `[ ]`. The spec-workflow convention is that `[x]` means
  implemented + logged + reviewed. Challenge whether leaving 1–24 as `[x]` while their described
  behavior is now contradicted by Phase 9 creates a **false "done" signal**. Should any original
  task be re-opened to `[ ]`/`[-]` instead of (or in addition to) adding a remediation task?
  Cite the specific tasks whose Success criteria are now violated by the shipped code per the
  design's R-table.

## Prior Review Context

This is the **third** adversarial round on this document. Do **not** re-discover known issues —
classify each finding you report as **Novel** (not seen before), **Compounding** (deepens a
prior finding), or **Recurring** (same issue, still unresolved — escalate severity).

**Resolved in v2 (do not re-litigate unless v3 regressed them):** the task-17 split, the task-23
CSP/axe/reduced-motion split, the LHCI workflow (task 7.3), the axe-core install (7.2), the
canonical zod/react-obfuscate install (7.1), and the full requirements-coverage matrix
(canonical URL, role=status landmark, CustomEvent, form-action header, sitemap, headshot
viewport, Req 4.4 enumeration, 44×44 tap targets, sm: breakpoint, Req 2.5 tagline, Req 5.5 enum,
logging-discipline assertions). Avoid re-walking requirements coverage unless a v3 edit removed
an assertion.

**Still unresolved going into r3 (Recurring — escalate if still open):** task 12 case split;
task 24 not split into local-gate + production-smoke; real-Resend deliverability untested;
RESEND_FROM prod-regression guard absent; manual-task-1/2 and task-8 same-commit enforcement is
procedural-only; DMARC 14-day tightening has no task; task-17 paperwork-vs-delivery split axis;
"design accepts either" spec-smell instances.

**Themes to test against v3:** (a) v2 fixed loud structural gaps but introduced cross-task
contract drift — check whether Phase 9 adds more of the same (the testId chain is the prime
suspect); (b) procedural mitigations without verification; (c) splitting along requirement-clause
boundaries rather than code-region boundaries.

You may read the rolling memory file at
`/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/professional-profile/reviews/adversarial-memory-tasks.md`
and the latest prior analysis at
`/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/professional-profile/reviews/adversarial-analysis-tasks-r2.md`
to ground the classification — but spend your effort on the v3 change set, not on re-reading
settled history.

## Deliverables

Conclude your analysis with:

- **Top 5 risks/gaps**, ranked, each with a concrete failure scenario (not an abstract risk) and
  a Novel/Compounding/Recurring tag.
- **Top 3 conclusions to challenge or reverse**, with specific reasoning.
- **What's missing** — the work that should happen to this document before it is acted on.

Be specific and concrete. Cite failure scenarios, not abstract risks. Quote the task number and
the exact phrasing you are attacking. If something is actually fine, say so in one line and move
on — do not pad.

## Output

Write your complete analysis to:
`/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/professional-profile/reviews/adversarial-analysis-tasks-r3.md`

Then write an UPDATED rolling memory file to
`/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/professional-profile/reviews/adversarial-memory-tasks.md`
that folds your r3 findings into the cumulative record (sections: Accepted / Partially Accepted /
Rejected / Unresolved; plus Patterns & Themes and Guidance for Next Review), dated
"after v3 review".
