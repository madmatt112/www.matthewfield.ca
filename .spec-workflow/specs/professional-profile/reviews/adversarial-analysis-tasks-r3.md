# Adversarial Analysis: professional-profile tasks.md (Round 3 — Phase 9 / R1–R6)

Scope: the v3 change set is Phase 9 (tasks 25–30), added to reconcile shipped v2 code to
the v4 design's *Implementation Status & Required Remediation* table (R1–R6). Tasks 1–24
remain `[x]`. I read tasks.md and design.md in full, the r2 analysis, the rolling memory,
and — critically — the **live code** (`src/lib/mail.ts`, `src/app/api/contact/route.ts`,
`src/components/shared/contact-form.tsx`, `scripts/run-e2e.mjs`, `e2e/playwright.config.ts`,
`e2e/fixtures/mock-resend.mjs`, the unit tests, and `node_modules/next/dist/bin/next`).

Headline: **Phase 9 generally maps 1:1 to R1–R6 with verifiable success criteria — the
remediation framing is honest and a real improvement over v3.** But task 25 (R1) contains a
latent, self-inflicted contradiction that the prompt correctly flagged as the highest-value
thing to check, and it is real: **the NODE_ENV gate task 25 prescribes will silently disable
the testId partitioning that the entire E2E suite (tasks 22 and 28) depends on, because the
Playwright `webServer` runs `next start`, which forces `NODE_ENV=production`.** This is a
security fix that breaks the test isolation it relies on. It is the dominant r3 finding.

Everything below is grounded in the actual files.

---

## 1. The testId chain after R1 gating — verified BROKEN (the prime suspect, confirmed)

This is the analysis dimension the prompt ranked highest, and it is not hypothetical.

**The mechanism, traced end to end against the code:**

1. Task 25 (R1) prescribes: in `mail.ts`, set the `X-Test-Id` header only when
   `process.env.NODE_ENV !== 'production'` AND `input.testId` is a string; in `route.ts`,
   read `parsed.testId` only when `NODE_ENV !== 'production'`. Task 25's own _Restrictions_
   line says "do not gate on a custom env var (NODE_ENV is the contract)."
2. The E2E suite reaches the mock **only** via the `X-Test-Id` forward. The mock
   (`e2e/fixtures/mock-resend.mjs`) buckets by the `x-test-id` request header, falling back to
   `'__untagged__'`. Task 22's assertions are all `GET /__state?testId=<uuid>` →
   `calls.length === 1`. Task 28's `/__mode?testId=<id>` control is likewise per-`testId`.
3. The Playwright config's `webServer.command` is `pnpm start --port ${PORT}`
   (`e2e/playwright.config.ts`), and `package.json`'s `start` is `next start --port 3013`.
4. **Next.js 16 forces `NODE_ENV=production` for `next start`.** Verified in
   `node_modules/next/dist/bin/next` lines 47/66:
   `const defaultEnv = commandName === 'dev' ? 'development' : 'production';` … then
   `process.env.NODE_ENV = process.env.NODE_ENV || defaultEnv;`. `start` is not `dev`, so the
   default is `production`.
5. **Nothing in the harness sets `NODE_ENV` to anything else.** `grep NODE_ENV` across
   `scripts/run-e2e.mjs`, `package.json`, `e2e/playwright.config.ts`, and `next.config.ts`
   returns nothing. `run-e2e.mjs` sets `RESEND_*` and `NEXT_PUBLIC_SITE_URL` but never
   `NODE_ENV`.

**Therefore:** once task 25 lands, in the E2E environment `NODE_ENV === 'production'`, the gate
closes, `route.ts` never reads `parsed.testId`, `mail.ts` never sets `X-Test-Id`, every
outbound POST lands in the mock's `'__untagged__'` bucket, and **every**
`GET /__state?testId=<uuid>` returns `{ calls: [] }`. Task 22's happy-path
`expect(calls.length).toBe(1)` fails for every test; under `fullyParallel: true`, all workers
write to the single `'__untagged__'` bucket and cross-contaminate. Task 28's `/__mode?testId=`
control becomes unreachable because `POST /emails` arrives with no `X-Test-Id` to match the
per-`testId` mode against.

**Concrete failure scenario:** Implementer lands task 25 exactly as written, runs
`pnpm test:e2e`. The mock boots, `next start` boots under `NODE_ENV=production`, the happy-path
test submits a valid form, the route drops `testId` (gate closed), the mock records under
`'__untagged__'`, `__state?testId=<uuid>` returns empty, and the test fails on
`calls.length === 1`. The implementer "fixes" task 22 by reading the `'__untagged__'` bucket —
which re-introduces the cross-worker race that the whole tenancy scheme (design §Mock Resend
server, the r2-§4.3 `mode: 'serial'` discussion) was built to eliminate. The security fix has
silently regressed the isolation guarantee.

**Why task 25 does not catch this itself:** task 25's _Success_ says "with NODE_ENV unset/test,
forwarding still works so task 22's E2E partitioning is unaffected." That clause is **false for
this repo** — the E2E partitioning does not run under "unset/test," it runs under `next start`,
which is `production`. The success criterion encodes an assumption about the runtime env that
the actual `webServer` command contradicts. Task 25 never inspects `playwright.config.ts` or
`run-e2e.mjs`, and its files list (`mail.ts`, `route.ts`, `mail.test.ts`, `route.test.ts`) does
not include the harness, so nothing in the task forces the implementer to reconcile the gate
predicate with the runtime that the E2E depends on.

**The fix is small but MUST be in task 25 (or a paired task that lands in the same change):**
the gate predicate and the test-runtime must be made consistent. Two coherent options:
- **(A)** Have `run-e2e.mjs` export `NODE_ENV=test` (or `playwright.config.ts` set
  `webServer.env` to include it) so the `!== 'production'` gate stays open in E2E. But note
  this collides with the task-21 pin (see §2 below) **and** changes Next's own build/runtime
  posture — `next start` under `NODE_ENV=test` emits the `NON_STANDARD_NODE_ENV` warning is
  *not* triggered (test is standard) but you are now running a production server build under a
  non-production NODE_ENV, which is itself a smell worth a sentence.
- **(B)** Gate on a dedicated test seam that is independent of `NODE_ENV` (e.g. only forward
  when `RESEND_BASE_URL` points at `127.0.0.1`/localhost, or a `E2E=1` flag the wrapper sets),
  and rely on the R2 catch-all (task 26) plus the absence of the seam in real production. This
  contradicts task 25's "do not gate on a custom env var" restriction, so the restriction must
  be rewritten.

Either way, **task 25 as written is internally consistent but externally wrong against this
codebase**, and shipping it unchanged turns the entire green E2E suite red. This is the single
highest-value defect in the v3 change set.

**Classification: Novel** (the NODE_ENV/`next start` collision was not identified in r1/r2;
the testId chain was flagged in r2 as a *type/contract* drift, but the *runtime-env* break is
new and more severe). **Compounding** on the r2 "testId chain coherence" theme.

### 1b. Belt-and-suspenders consistency — fine, but irrelevant if the predicate is wrong

Task 25 correctly gates both layers (route read + mail header set) — "belt-and-suspenders so
neither layer alone can leak it." That is the right structure. But both layers key on the same
`NODE_ENV !== 'production'` predicate, so they fail open/closed *together*; the redundancy buys
defense against a future single-layer edit, not against the predicate being wrong. The §1 break
hits both layers identically. One line.

---

## 2. R1 gating collides with the task-21 `webServer.env` pin — and the pin is ALREADY violated

The design (§Wrapper script "Pin") and task 21 both forbid setting `webServer.env` to a literal
object, because it *replaces* inherited env wholesale. **The shipped `playwright.config.ts`
already violates this pin**: `env: { BLOG_INCLUDE_DRAFTS: "1" }` is a literal object, not
`{ ...process.env, BLOG_INCLUDE_DRAFTS: "1" }`.

This is independently a latent bug (it means `pnpm start` under the webServer does NOT inherit
`run-e2e.mjs`'s `RESEND_BASE_URL`/`RESEND_API_KEY`/etc. via this object — though Playwright
merges `webServer.env` over `process.env` rather than replacing it in current versions, so it
may currently work by luck of Playwright's merge semantics). But it becomes load-bearing for
Phase 9: **if the §1 fix is option (A) — setting `NODE_ENV` in `run-e2e.mjs` — the literal
`webServer.env` object would need `NODE_ENV` added to it too**, or the env never reaches
`next start`. No Phase 9 task touches `playwright.config.ts`. Task 25's files list omits it.

So the §1 fix is entangled with a pre-existing pin violation that no task owns. Whoever fixes
task 25 via option (A) must also fix the `webServer.env` literal — which is task 21's
already-`[x]` responsibility, now stale.

**Classification: Novel** (the shipped literal-`env` violation was not caught; r2 reviewed the
*task* text for the pin, not the *code*). **Compounding** on r2's "task 21 audit-and-fix."

---

## 3. Phase 9 silently contradicts / staleness in the original `[x]` tasks

The prompt asked specifically for places where Phase 9 re-opens code that 8/9/11/17/20 shipped
and leaves the original task's description stale or contradicted. Confirmed instances:

- **Task 9 body is now false re: testId.** Task 9 states the testId "is forwarded as the
  outbound `X-Test-Id` request header when present (consumed by task 20's mock; production
  payloads never include it)." The parenthetical "production payloads never include it" is
  presented as a *property of task 9's code*, but the shipped `mail.ts` forwards it
  **unconditionally** (`if (typeof input.testId === "string") headers["X-Test-Id"] = input.testId;`
  — no NODE_ENV check). Task 9's claim is only made true by task 25. Task 9 is `[x]` and
  unedited, so it asserts a security property the code does not have. **This is the R1
  vulnerability described in task-9 prose as already-handled.**
- **Task 10 is stale and will be contradicted by task 25.** Task 10's _Success_ asserts the
  testId-forwarding cases pass with unconditional forwarding (mail.test.ts:95 "sets X-Test-Id
  header when input.testId is a string" with no NODE_ENV stub). Task 25 explicitly says
  "update/replace the `mail.test.ts` case that currently certifies unconditional forwarding."
  So task 10 (`[x]`) describes a test that task 25 will rewrite. Task 10's checkbox now
  signals "done" for a test that is about to be declared wrong.
- **Task 11 step 8 + step 9 are stale.** Task 11 step 8 describes reading `parsed.testId`
  unconditionally; step 9's catch maps `TimeoutError`→503 and `ResendError`/other→502 — but the
  *shipped* `route.ts` ends its catch with `throw err;` (the R2 bug), not a 502 catch-all.
  Task 11's body claims "ResendError / other → 502," which the code does not do for the "other"
  case. Task 11 is `[x]` describing behavior the code lacks. Task 26 fixes the code; task 11's
  description was left asserting the fixed behavior as already-shipped.
- **Task 12's logging-discipline / 502 description is partly aspirational.** Task 12 enumerates
  the 502 branch and logging-discipline; the shipped route has no generic-error→502 branch
  (R2), so task 12's "covers every branch" claim is incomplete against the code it was written
  for. Task 26 adds the branch *and* the test.
- **Task 17 ships the racy guard.** `contact-form.tsx:121` is literally
  `if (state.kind === "submitting") return;` — the stale-closure guard. Task 17's _Success_
  says "double-click submit only fires once via the early-return guard," which the design's
  own Form-State Machine block (lines 185) declares **racy and false** ("the prior `state.kind`
  guard was racy and did not [prevent double-submission]"). Task 17 is `[x]` asserting a
  double-submit guarantee the design says it does not have. Task 27 (R3) fixes it.
- **Task 8 ships unbounded profile schema.** R6/task 30 adds `.max()` bounds; task 8's body
  lists the schema fields without bounds and is `[x]`. Minor.

**This is the §6 status-marker problem made concrete:** tasks 9, 11, and 17 are `[x]` while
their bodies assert security/correctness properties (production-suppressed testId, total error
mapping, double-submit prevention) that the shipped code does **not** have and that the design's
own R-table lists as **live drift**. The `[x]` markers are a false "done" signal for exactly the
Critical/High items. See §6 for the recommendation.

**Classification: Recurring/Compounding** — r2 flagged testId contract drift; r3 confirms the
drift is now *enshrined as completed* in `[x]` task bodies.

---

## 4. Task 28 scope — bundled phase masquerading as a task (Recurring, escalated)

Task 28 (R4) bundles: (1) a new mock endpoint (`POST /__mode`, modifying task 20's artifact),
(2) validation-error UX test, (3) server-error-recovery UX test, (4) Enter-key test, (5)
JS-vs-native `framenavigated` test. That is one infra change plus **four behaviorally distinct
E2E tests** in one checkbox.

- **Atomicity:** This directly contradicts the precedent the spec set for itself. Task 23 was
  split into 23/23.1/23.2 specifically because CSP, axe, and reduced-motion are "orthogonal
  failure modes." The four task-28 tests are *more* orthogonal than that (a validation-error
  focus bug, a server-error recovery bug, an Enter-key bug, and a native-navigation regression
  share no code path), yet R4 is a single task. The decomposition rationale that justified the
  23-split applies verbatim to 28 and was not applied. **Why is R4 not 28 / 28.1 / 28.2 / 28.3?**
  No reason is given.
- **Mock teardown / state leak under `fullyParallel`:** Task 28's `/__mode` "records a
  per-`testId` forced-response mode." Task 22's `beforeEach` resets via
  `POST /__reset?testId=<id>`. The **shipped** mock's `/__reset` clears only the `buckets` Map
  — there is no mode map yet (it does not exist until task 28). Task 28 must extend `/__reset`
  to also clear the forced-mode for that `testId`, or a forced-503 set in one test leaks into
  the next test reusing... no — `testId` is per-test UUID, so cross-*test* leak is bounded by
  the UUID. BUT the design §Mock `/__reset` bullet says reset "clears the recorded calls AND any
  forced-status mode for that `testId`." Task 28's body says `/__mode` "records a per-`testId`
  forced-response mode" but its _Restrictions_ do **not** restate that `/__reset` must also
  clear the mode. The design has it; the task dropped it. Given each test uses a fresh UUID the
  practical leak risk is low, but the §1 break (everything collapses to `'__untagged__'`) makes
  it acute: if testId is gone, *all* workers share `'__untagged__'`, and a `/__mode` set by one
  worker forces 503 for every other worker's `POST /emails`. (This is a second-order symptom of
  §1, not independent — but it shows §1 poisons §28 specifically.)

**Resolution:** split task 28 into the mock change + the four tests, and add to the task an
explicit "/__reset clears the forced mode" requirement matching the design's §Mock bullet.

**Classification: Recurring** (task-splitting-along-wrong-axis is a standing theme; here it is
a regression *against the spec's own 23-split precedent*). Escalate: the four tests cover two
Critical-adjacent behavioral Reqs (4.3, 4.4) with zero current coverage, so a partial landing
hides which behavior is verified.

---

## 5. Ordering / independence of R1+R2 vs R5+R6 — actually fine, with one caveat

The prompt asked whether tasks 25/26 (the live prod security violation) are sequenced first and
not entangled with low-severity R5/R6.

- **Sequencing is correct.** Phase 9's preamble (tasks.md line 362) states "R1 and R2 together
  are a live, unauthenticated, repeatable production Req-3.10 violation — implement them first,"
  and 25/26 are numerically first in the phase. R5 (29) and R6 (30) are last and Low. Good.
- **R1 and R2 are correctly coupled.** The design (§mock production-gating note, lines 498) and
  task 26 both note that R2's catch-all is what sanitizes the CRLF-`testId`→`Headers`-throw that
  R1's gate removes the *source* of. So 25+26 are a coherent pair and 26 is genuinely
  independent of 27–30. One line: task 26 is *correctly* landable without 25 (the catch-all is
  good hygiene regardless), and 25 is *more* defensible if 26 lands first (so a residual throw is
  already sanitized). The phase orders 25 before 26; reversing them (26 then 25) would be
  marginally safer, but the difference is negligible and not a blocking finding.
- **Caveat:** the §1 break means task 25 cannot actually be "landed first and independently" and
  stay green — it requires the harness change. So R1 is *not* independently landable in
  practice, contradicting the preamble's "implement them first." The dependency is on the test
  harness, not on R5/R6, so the prompt's specific worry (entanglement with low-severity work) is
  unfounded — but a different entanglement (R1 ↔ E2E harness) is real and unacknowledged.

**Classification: Novel** (the R1↔harness entanglement); the R5/R6 entanglement worry is
**not substantiated** — one line, fine.

---

## 6. Status markers: tasks 9/11/17 should be re-opened, not just patched

Per the spec-workflow convention that `[x]` = implemented + logged + reviewed, leaving 9, 11,
and 17 as `[x]` while their bodies assert un-shipped security/correctness properties (see §3)
is a false done-signal. The design's own R-table calls R1/R2/R3 "Critical/Critical/High" drift
against these exact files.

Two defensible models:
- **Remediation-task model (what Phase 9 does):** add 25–30, leave 1–24 `[x]`. Acceptable
  *only if* the stale bodies of 9/11/17 are corrected to say "the ungated forward / bare throw /
  racy guard shipped here is remediated in task 25/26/27" — otherwise a reader of task 9 believes
  production is safe.
- **Re-open model:** flip 9→`[-]`, 11→`[-]`, 17→`[-]` (in-progress/superseded) with a pointer
  to 25/26/27. Cleaner for the Critical items.

**Recommendation:** at minimum, edit the stale claims in tasks 9, 10, 11, 12, 17 to stop
asserting the remediated behavior as shipped (a one-line "(remediated in task N)" annotation on
each). Re-opening is optional; the false-claim removal is not. Right now the document asserts
in two places (task-9 prose and design R-table) mutually contradictory states of the same code.

**Classification: Novel.**

---

## 7. Cross-task citation & file-set correctness audit (the confirmed r2 error pattern)

I audited every `_Leverage_` / `_Requirements_` / file reference in tasks 25–30.

- **Task 25 files:** `mail.ts`, `route.ts`, `mail.test.ts`, `route.test.ts` — correct. All four
  exist and all four need touching (mail.ts:64-ish header set; route.ts:107 testId read;
  mail.test.ts:95-121 the forwarding cases; route.test.ts:232-248 the forwarding cases).
  Verified the named test cases exist. **Correct.**
- **Task 25 _Leverage_** cites "task 9's `mail.ts` `X-Test-Id` construction; task 11's step-8
  `parsed.testId` read." Task 11's testId read is described as "step 8" in task 11's body and
  the design pipeline — but the **shipped** route reads `parsed.testId` at the point *after* zod
  (between source-normalize and the `try`), which design step 8 labels correctly. Citation is
  consistent with the design's step numbering. **Correct.**
- **Task 26** cites "task 11's step-8 error mapping; task 12's logging-discipline assertions."
  The shipped catch is in `route.ts`; design calls the catch "step 8" (lines 289). Note a latent
  numbering smell: the **design** pipeline lists 9 steps (1–9, where step 9 is the
  `sendContactEmail`+catch), but the **Response Log and R-table call the catch "step-8"**
  (design line 703, task 26). The shipped code's catch is the last step. "Step 8" vs "step 9"
  for the catch is an inconsistency between the design pipeline enumeration (step 9) and the
  R-table/task wording (step 8). Minor, but it is exactly the citation-drift class r2 flagged —
  a reader counting design steps finds the catch at step 9, not 8.
- **Task 27** cites "task 22's mock-state `__state` partitioning." Correct, but see §1: that
  partitioning is the thing R1 breaks, so task 27's two-rapid-submits→one-POST assertion
  *also* depends on `X-Test-Id` reaching the mock and is *also* dead under §1. Task 27 inherits
  the §1 break. The citation is right; the dependency is poisoned.
- **Task 28** cites task 20/21/22 — correct. Req 4.3/4.4/4.8: the Enter-key/textarea-newline
  case is mapped to Req 4.8 in the design Testing Strategy (line 548) but Req 4.8 is the
  *reduced-motion* clause; Enter-key submission is more naturally Req 4.5/4.9 (keyboard
  operability). The design itself mislabels Enter-key as Req 4.8 (line 548 header
  "Enter-key submission (Req 4.8)"), and task 28 copies "Req 4.3, 4.4, 4.8." **Likely wrong Req
  ID for the Enter-key case** — Enter-key is keyboard submission (Req 4.5/4.9), not motion
  (4.8). Inherited from the design, but the task propagates it. Worth pinning.
- **Task 29** `_Requirements_: R5; Req 3.5b` — correct (`originAllowed` is the step-2 origin
  check, shipped in `route.ts`).
- **Task 30** `_Requirements_: R6; Req 3.5a` — correct. The shipped 413 body is literally
  `"Payload too large."` (route.ts), and Req-3.5a's string is
  `"Message is too long. Please shorten and try again."` — confirmed mismatch, task 30 cites it
  correctly. The `.max()` bounds target the Velite profile schema (velite.config.ts), correct.

**Net:** the Phase 9 citations are markedly cleaner than the r2 round (no wrong task-number like
the old "task 20 creates run-e2e.mjs"). Two soft issues: the design's own "step 8 vs step 9"
catch enumeration, and the Enter-key→Req 4.8 mislabel inherited from the design. Both are
design-originated; task 30/29/27/25 file sets are accurate.

**Classification: Novel** (the Req-4.8/Enter-key mislabel) — low severity.

---

## 8. Recurring unresolved items — still open (escalate)

Confirmed against tasks.md and design — none of these got a carrier task in v3:

- **Task 12 not split** (still ~9 cases plus the testId/logging additions in one file). Task 25
  and 26 *add more* cases to route.test.ts without splitting. **Recurring, unresolved.**
- **Task 24 not split into local-gate + production-smoke.** **Recurring, unresolved.**
- **Real-Resend deliverability untested by any task.** The closest is manual tasks 1/2. Phase 9
  added nothing here. With R1/R2 touching `mail.ts`/`route.ts`, the marginal cost of adding a
  post-merge real-send smoke is unchanged but still unaddressed. **Recurring, unresolved,
  escalate** — this is the highest-severity standing gap not in Phase 9's scope.
- **RESEND_FROM prod-regression guard** (throw if `VERCEL_ENV=production` AND
  `RESEND_FROM=onboarding@resend.dev`). The prompt notes R1/R2 already reopen `mail.ts`, so
  folding this in is near-zero cost. **It was not folded in.** Task 25 edits `mail.ts` and could
  carry a two-line guard beside the existing `getResendClient()` sanity guard (which only checks
  `test-key` + prod base URL, NOT the sandbox-from-in-prod case). **Recurring, unresolved,
  escalate** — the cost is now demonstrably near-zero because the file is already open.
- **DMARC 14-day tightening (Req 3.6 SHALL)** — no carrier task. **Recurring, unresolved.**
- **Manual-task-1/2 ordering and task-8 same-commit are procedural-only, no CI gate.**
  **Recurring, unresolved.**

---

## 9. Things that are actually fine (one line each)

- Task 29 (R5 origin normalization) maps cleanly to the shipped `originAllowed`; the
  try/catch-returns-false → normalize-to-absent change is well scoped and its three test cases
  are verifiable. Fine.
- Task 30 (R6) is correctly scoped and its 413-string + `.max()` assertions are verifiable
  against the shipped `"Payload too large."`. Fine.
- Task 26 (R2) success criterion ("a generic rejection yields 502; `console.warn` logs only
  `resend_unexpected`; no path produces an unhandled 500") is genuinely verifiable and the
  shipped `throw err;` is exactly the bug. Fine — and independently landable.
- Phase 9's preamble honestly states the v2/v4 drift and the design's R-table is now correctly
  framed as design-of-record vs shipped-status (the central v4 fix). Honest. Fine.
- The belt-and-suspenders two-layer gate (route + mail) in task 25 is the right *structure*
  (even though the predicate is wrong — §1).

---

## Top 5 risks/gaps (ranked)

1. **R1 gate kills the E2E partitioning it depends on (Novel/Compounding).** Task 25 gates the
   testId forward on `NODE_ENV !== 'production'`; the Playwright `webServer` runs `next start`,
   which forces `NODE_ENV=production` (verified in `node_modules/next/dist/bin/next` lines
   47/66). No harness file sets `NODE_ENV`. Failure scenario: land task 25 → every E2E POST
   loses its `X-Test-Id` → all calls land in the mock's `'__untagged__'` bucket →
   `GET /__state?testId=<uuid>` returns `{calls:[]}` → task 22's `calls.length===1` fails for
   every test and parallel workers cross-contaminate. Task 25's own _Success_ clause ("with
   NODE_ENV unset/test, forwarding still works") is false for this repo. Tasks 27 and 28 inherit
   the break. **Must fix the gate-predicate/runtime-env mismatch inside task 25.**

2. **Stale `[x]` tasks assert un-shipped security properties (Novel/Recurring).** Task 9 says
   "production payloads never include [testId]" (code forwards unconditionally); task 11 says
   "other → 502" (code does `throw err;`); task 17 says "double-click fires once via the
   early-return guard" (design says that guard is racy and does not). These three `[x]` tasks are
   a false "done" signal for the exact Critical/High items R1/R2/R3 remediate. Failure scenario:
   a reviewer reads task 9, concludes prod testId-leak is handled, and de-prioritizes task 25.

3. **`webServer.env` literal-object pin already violated in code, unowned by any task
   (Novel/Compounding).** `e2e/playwright.config.ts` has `env: { BLOG_INCLUDE_DRAFTS: "1" }` —
   the literal-object pattern task 21's design pin forbids. If the §1 fix sets `NODE_ENV` via the
   wrapper, this literal must also carry it. No Phase 9 task touches the config; task 21 is `[x]`
   and stale.

4. **Task 28 is a bundled phase, not an atomic task (Recurring, escalated).** One mock change +
   four orthogonal behavioral tests (validation, server-error recovery, Enter-key, native-nav)
   in one checkbox — directly against the spec's own 23/23.1/23.2 split precedent. Plus task 28
   drops the design's "`/__reset` also clears the forced mode" requirement. Failure scenario:
   partial landing leaves it ambiguous which of Req 4.3/4.4 is actually covered.

5. **Real-Resend deliverability + RESEND_FROM prod-regression guard still unowned (Recurring,
   escalated).** No task verifies a real email is delivered; no task adds the
   `VERCEL_ENV=production && RESEND_FROM=onboarding@resend.dev` throw — even though task 25
   reopens `mail.ts` and could carry it for ~2 lines beside the existing sanity guard. Failure
   scenario: production silently ships with the Resend sandbox `from`, all "sent" mail is
   dropped, and nobody learns until a recruiter never replies.

---

## Top 3 conclusions to challenge or reverse

1. **"R1 (task 25) can be landed first and independently" — reverse.** It cannot land green
   without a coordinated harness change, because `next start` forces `NODE_ENV=production` and
   closes the gate in the E2E env. R1 is entangled with the test harness (not with R5/R6, as the
   prompt worried). Task 25 must either set a test-env `NODE_ENV` (and fix the §2 literal-env
   pin) or gate on a non-`NODE_ENV` seam (and drop its own "do not gate on a custom env var"
   restriction). As written, landing 25 alone turns the suite red.

2. **"Leaving tasks 1–24 `[x]` while adding Phase 9 is a clean remediation model" — challenge.**
   It is clean only if the stale bodies of 9/11/17 are de-asserted. Today the document
   simultaneously claims (task-9 prose) the prod testId-leak is handled and (design R-table)
   that it is a live Critical drift. Re-open 9/11/17 to `[-]` or annotate them
   "(remediated in 25/26/27)"; do not leave the contradictory claims standing.

3. **"Task 28 is one reviewable unit" — reverse.** By the spec's own 23-split logic it is four.
   Split into the mock-control change plus per-behavior tests, and restore the design's
   "`/__reset` clears the forced mode" clause that the task dropped.

---

## What's missing — work to do to this document before it is acted on

**Critical (blocking):**
- **Fix task 25's gate/runtime mismatch.** Add to task 25 (or a new task 25.1 owning the
  harness): make the E2E env satisfy the gate. Decide the seam (NODE_ENV=test via the wrapper +
  `webServer.env` merge fix, OR a localhost/`E2E=1` seam) and pin it. Update task 25's _Success_
  clause — the "NODE_ENV unset/test" assumption is false against `next start`.
- **Fix the `webServer.env` literal-object violation** in `e2e/playwright.config.ts`
  (`{ ...process.env, BLOG_INCLUDE_DRAFTS: "1" }`) — assign it to a task (re-open 21 or fold into
  the §1 harness task). Without this, option-(A) for §1 cannot work.

**Should-fix:**
- **De-assert or re-open tasks 9, 10, 11, 12, 17** so they stop claiming the remediated behavior
  as shipped. One-line "(remediated in task N)" annotations minimum.
- **Split task 28** into mock-control + four behavioral tests; restore the `/__reset`-clears-mode
  clause.
- **Add the RESEND_FROM prod-regression guard** to task 25's `mail.ts` scope (near-zero cost now
  that the file is open): throw if `VERCEL_ENV === 'production' && RESEND_FROM === 'onboarding@resend.dev'`.
- **Add a real-production deliverability smoke task** (the standing task-24b gap).
- **Fix the Enter-key Req-ID:** it is keyboard submission (Req 4.5/4.9), not motion (Req 4.8) —
  in both task 28 and the design Testing Strategy line 548.

**Standing recurring (carry forward, still unowned):** task 12 split, task 24 split, DMARC
14-day tightening, manual-task / same-commit CI enforcement, the design "step 8 vs step 9" catch
enumeration inconsistency.

**Bottom line:** Phase 9 is an honest, well-cited remediation phase that correctly closes the
v3 design-vs-code-drift framing problem — but task 25 ships a security gate whose predicate is
wrong against this repo's test runtime, and that single defect cascades into tasks 22, 27, and
28. Fix the gate/runtime mismatch and de-assert the three stale `[x]` security claims before
acting on this document.
