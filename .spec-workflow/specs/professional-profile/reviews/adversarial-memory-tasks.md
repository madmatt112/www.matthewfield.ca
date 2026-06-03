# Adversarial Review Memory — tasks
Last updated: 2026-06-02 (after v3 review)

## Cumulative Findings Summary

### Accepted (incorporated across v2/v3)
- **Task 17 split** (v2): 17 (core) + 17.1 (focus) + 17.2 (reduced-motion scroll) + 17.3
  (CustomEvent). Caveat: split is along SHALL-clause axis, not code-region axis (see Unresolved).
- **Task 23 split** (v2): 23 (CSP) + 23.1 (axe both themes) + 23.2 (reduced-motion).
- **LHCI workflow** (v2): task 7.3. Caveat: Phase 1 workflow targets Phase 6 pages.
- **@axe-core/playwright install** (v2): task 7.2.
- **zod/react-obfuscate canonical install** (v2): task 7.1.
- **Canonical URL / role=status landmark / CustomEvent assertions** (v2): task 22.
- **form-action 'self' header assertion** (v2): task 23.
- **Sitemap /contact + headshot viewport checks** (v2): task 24.
- **Req 4.4 enum, 44×44 tap targets, sm: breakpoint, Req 5.5 enum warning, tagline pin,
  logging-discipline assertions, rehype-slug** (v2): folded into 11/17/18/8/10/12.
- **Phase 9 (v3): the central v4 fix.** The v3 Response Log honestly separates design-of-record
  from shipped-status; the R1–R6 remediation table is correctly framed; tasks 25–30 map 1:1 to
  R1–R6 with (mostly) verifiable success criteria. This resolved r2's biggest meta-issue
  (completed-past-tense claims about un-shipped code). Citations in Phase 9 are markedly cleaner
  than v2 (no wrong task-number errors). **Accepted as a genuine improvement.**
- **Tasks 26, 29, 30 (v3): clean.** R2 catch-all, R5 origin normalization, R6 .max()+413-string
  are correctly scoped, verifiable, and grounded in confirmed shipped bugs (`throw err;`,
  no-null-normalization, `"Payload too large."`). Task 26 is independently landable.

### Partially Accepted
- **Min-h layout-shift container (Req-NFR-Performance)** (v2): class added in task 17, no CLS
  assertion anywhere. Procedural mitigation, unverified. Still open.
- **Task 24 sitemap/headshot checks** (v2): added inside task 24, but no post-merge
  production-smoke / real-Resend deliverability step. Still open.
- **R1+R2 sequencing (v3):** correctly ordered first in Phase 9 and correctly coupled (R2's
  catch-all sanitizes the residual R1 throw). BUT R1 (task 25) is NOT independently landable in
  practice — it is entangled with the E2E test harness (see r3 Accepted-Critical below), which
  the preamble's "implement them first" does not acknowledge.

### Rejected
- (None. Findings that survived are unresolved, not rejected — the author has consistently
  incorporated or deferred, never pushed back via edits.)

### Unresolved (Recurring — escalate)
- **Task 12 case split (Recurring v1→v2→v3):** still one file; v3 (tasks 25/26) ADDS more
  route.test.ts cases without splitting. Yes/no-signal problem persists.
- **Task 24 not split into local-gate + production-smoke (Recurring v1→v2→v3):** real-Resend
  deliverability verified by ZERO tasks. Highest-severity standing gap not in Phase 9 scope.
- **RESEND_FROM prod-regression guard (Recurring v1→v2→v3):** throw if VERCEL_ENV=production AND
  RESEND_FROM=onboarding@resend.dev. Cost now NEAR-ZERO because task 25 already reopens mail.ts —
  still not folded in. The shipped `getResendClient()` guard only checks test-key+prod-base-URL,
  NOT the sandbox-from-in-prod case. Escalate.
- **DMARC 14-day tightening (Req 3.6 SHALL) (Recurring v1→v2→v3):** no carrier task.
- **Manual-task 1/2 + task-8 same-commit enforcement (Recurring v1→v2→v3):** procedural-only,
  no CI gate.
- **Task 8 split / Task 17 code-region re-split (Recurring v2):** not addressed in v3.

## r3 Findings (after v3 review)

### Accepted — Critical (the dominant r3 finding)
- **R1 gate (task 25) kills the E2E partitioning it depends on (Novel/Compounding).** Task 25
  gates testId→X-Test-Id on `NODE_ENV !== 'production'`. The Playwright `webServer.command` is
  `pnpm start` → `next start`, which FORCES `NODE_ENV=production` (verified in
  `node_modules/next/dist/bin/next` lines 47/66: default env for non-`dev` commands is
  `production`; `process.env.NODE_ENV ||= defaultEnv`). NO harness file sets NODE_ENV
  (`run-e2e.mjs` sets RESEND_*/NEXT_PUBLIC_SITE_URL only; playwright.config.ts sets none). So
  after task 25 lands, in E2E the gate is CLOSED → no X-Test-Id forwarded → all calls bucket
  under `'__untagged__'` in the mock → `GET /__state?testId=<uuid>` returns `{calls:[]}` → task
  22's `calls.length===1` fails for every test, parallel workers cross-contaminate, task 28's
  `/__mode?testId=` is unreachable, task 27's two-rapid-submits→one-POST is dead too. Task 25's
  own _Success_ ("with NODE_ENV unset/test, forwarding still works") is FALSE for this repo. Fix
  must live in task 25 (or a paired harness task): make the E2E env satisfy the gate (NODE_ENV=test
  via wrapper + fix the §2 literal-env pin), OR gate on a non-NODE_ENV seam (drop task 25's "do
  not gate on a custom env var" restriction). This is THE r3 finding.

### Accepted — High/Medium
- **Stale `[x]` tasks assert un-shipped security properties (Novel/Recurring).** task 9 prose:
  "production payloads never include [testId]" — code forwards UNCONDITIONALLY
  (`if (typeof input.testId === "string") headers["X-Test-Id"] = input.testId`). task 11: "other
  → 502" — code does `throw err;` (the R2 bug). task 17 _Success_: "double-click fires once via
  the early-return guard" — design line 185 says that `state.kind` guard is RACY and does not
  prevent it. contact-form.tsx:121 is literally `if (state.kind === "submitting") return;`.
  These three `[x]` tasks are a false done-signal for the exact Critical/High items 25/26/27
  remediate. Recommend de-asserting (one-line "(remediated in task N)") or re-opening to `[-]`.
- **`webServer.env` literal-object pin ALREADY violated in code, unowned (Novel/Compounding).**
  e2e/playwright.config.ts: `env: { BLOG_INCLUDE_DRAFTS: "1" }` — the literal-object pattern the
  task-21/design pin forbids (should be `{ ...process.env, ... }`). Currently works by
  Playwright's merge-over-process.env semantics, but becomes load-bearing if the §1 fix routes
  NODE_ENV through the wrapper. No Phase 9 task touches the config; task 21 `[x]` and stale.
- **Task 28 is a bundled phase, not an atomic task (Recurring, escalated).** One mock change
  (`/__mode`) + four orthogonal E2E tests (validation-error, server-error-recovery, Enter-key,
  framenavigated/no-action) in one checkbox — against the spec's OWN 23/23.1/23.2 split
  precedent. Also DROPS the design's "`/__reset` also clears the forced mode" clause (design
  §Mock /__reset bullet). Should be 28/28.1/28.2/28.3 + restore the reset-clears-mode requirement.

### Accepted — Low
- **Enter-key mislabeled Req 4.8 (Novel).** Enter-key submission is keyboard operability (Req
  4.5/4.9), not motion (Req 4.8). Mislabel originates in design Testing Strategy line 548; task
  28 propagates it.
- **Design "step 8 vs step 9" catch enumeration inconsistency.** Design pipeline lists the
  sendContactEmail+catch as step 9; the R-table and tasks 25/26 call the catch "step 8." Reader
  counting design steps finds it at 9.

### Rejected / Not substantiated in r3
- **R1/R2 entangled with low-severity R5/R6 (prompt's worry): NOT substantiated.** Phase 9
  orders 25/26 first, R5/R6 last; no entanglement with low-severity work. (The real entanglement
  is R1 ↔ test harness — see Critical above.)
- **Tasks 26/29/30 success criteria are hand-wavy: NO.** They are verifiable and grounded in
  confirmed shipped bugs.

## Patterns & Themes
- **Each round fixes the prior round's loud problem and introduces a subtler same-class one.**
  v2 fixed structural gaps, introduced cross-task contract drift. v3 fixed the design-vs-code
  honesty problem (the v4 R-table), but task 25's security gate introduces a NEW cross-surface
  contract break (gate-predicate vs test-runtime) — the same "two surfaces described in
  different terms with no reconciling machinery" pattern, now between a task and the live harness.
- **Verify against CODE, not just task text.** The two most severe r3 findings (the NODE_ENV/
  `next start` collision; the literal `webServer.env`) are invisible from the task/design text
  alone — they require reading `node_modules/next/dist/bin/next` and `playwright.config.ts`.
  r2's testId finding was a *text* contract drift; r3's is a *runtime* break. Always check the
  runtime the gate predicate keys on.
- **Splitting along requirement-clause boundaries, not code-region boundaries (Recurring).**
  Task 28 is the new instance (four orthogonal tests, one task) — and it regresses against the
  spec's own 23-split precedent.
- **`[x]` ≠ requirement-satisfied.** Phase 9 makes this acute: `[x]` tasks 9/11/17 assert
  Critical security properties the code lacks and the design's own R-table contradicts.
- **Procedural mitigations without verification / recurring deferred items (Recurring):**
  real-Resend smoke, RESEND_FROM guard, DMARC, manual-task CI gate — all still unowned. The
  RESEND_FROM guard cost is now near-zero (task 25 reopens mail.ts) yet still skipped.

## Guidance for Next Review (r4)
- **Confirm the §1 fix actually landed and is coherent.** When tasks 25 lands: verify the E2E
  env satisfies whatever gate predicate was chosen (run `pnpm test:e2e` mentally / check that
  the testId reaches the mock under the chosen seam). Re-check that `webServer.env` was made a
  `{ ...process.env }` spread if NODE_ENV is routed through the wrapper. This is the #1 thing.
- **Check whether tasks 9/11/17 were de-asserted or re-opened.** If they are still `[x]` with
  the stale security claims, the false-done-signal persists.
- **Check whether task 28 was split** and whether `/__reset`-clears-mode was restored.
- **Check the standing recurring items** (real-Resend smoke, RESEND_FROM guard, task 12/24
  split, DMARC, manual-task CI gate) — none addressed in v3.
- **Deprioritize (well-covered):** requirements-coverage matrix (settled in v2), task-23
  colocation, zod/react-obfuscate install ambiguity, the testId *type* contract (now in the
  shipped ContactEmailInput). Do not re-walk these.
- **Method note:** the highest-value r3 findings came from grepping the actual harness/runtime
  for the predicate the security task keys on. For any "gate behind env X" task, always confirm
  what sets/forces X in the environment the dependent tests run under.
