# Adversarial Analysis — professional-profile/design.md (round 3, convergence)

**Reviewer stance:** Principal engineer, final pre-build teardown. The feature is already implemented; I judged the design against the live code (`src/app/api/contact/route.ts`, `src/lib/mail.ts`, `src/components/shared/contact-form.tsx`, the `e2e/tests/contact-*.test.ts` files, `e2e/fixtures/mock-resend.mjs`, `velite.config.ts`, `next.config.ts`, `vercel.json`), not just the prose. Where they diverge, the code is cited.

**Verdict up front:** This is *not* a converged document. The prose has converged beautifully — it is among the most thorough designs I have read — but it has converged onto a **fictional implementation**. The two security-critical fixes the v3 Response Log claims as closed (the `NODE_ENV` production gate and the `inFlightRef` double-submit latch) **do not exist in the shipped code**. Several other "added in v3" mechanisms (the `__mode` mock control, four behavioral E2E tests, the step-8 catch-all) are also absent. The design and the code have drifted so far that the design's own "inspect the live code" instruction exposes the design as inaccurate. This is the dominant finding and it recurs across the top-5 list.

The classification convention from the brief: **Novel** / **Compounding** / **Recurring**. I am using a fourth, more precise label for the central problem — **Design-vs-code drift (D↔C)** — because these are not new *design* defects; they are prior fixes the design *describes* but the code *never received*. By the brief's own rule ("a prior issue still open — if you find one, that is significant"), every one of these is **Recurring** and significant.

---

## 1. Second-order defects in v3's new mechanisms

### 1a. The `NODE_ENV` gate does not exist in the code (Recurring / D↔C — security-critical)

The design (mock-tenancy "Production gating" note, `mail.ts` Transport note, route step-8) states the `testId`→`X-Test-Id` forward is gated behind `process.env.NODE_ENV !== 'production'`, "dead-code-eliminated from production builds," closing the r2-§1 trust-boundary finding.

**The gate is absent from both files.**

- `src/lib/mail.ts:66` — `if (typeof input.testId === "string") { headers["X-Test-Id"] = input.testId; }`. No `NODE_ENV` check. The header is forwarded in **production** for any string `testId` a hostile client supplies.
- `src/app/api/contact/route.ts:104` — `const testId = typeof parsedRecord.testId === "string" ? parsedRecord.testId : undefined;` then forwarded at line 107. No `NODE_ENV` check.

The brief asked me to verify "(b) client-side, is the `testId` read DCE'd from the production bundle?" The answer is moot in a worse way: `contact-form.tsx:127-139` ships the `window.__TEST_ID` read and sends `testId` unconditionally to **every** client, and the server **honors it in production**. So an attacker POSTing `{name,email,message, testId: "anything"}` to the deployed `/api/contact` has their value attached as `X-Test-Id` on the outbound request to the real `api.resend.com` — exactly the trust-boundary crossing r2-§1 was supposed to have closed. The design narrates a fix that was never implemented.

**The unit test actively certifies the wrong behavior.** `route.test.ts:232-249` asserts `testId` *is* forwarded ("forwards a string testId from the raw body into sendContactEmail"). There is no test asserting it is suppressed in production. So CI is green on the vulnerable behavior.

**Minimal fix:** Either (a) implement the gate the design describes — wrap both reads in `process.env.NODE_ENV !== "production"` — and add a route test asserting suppression under stubbed `NODE_ENV=production`; or (b) if the team has *decided* the gate is unnecessary (it is defensible: the `X-Test-Id` header is inert at the real Resend endpoint and the value is length-unbounded only insofar as the 32KB body cap and zod `.strip()` already constrain the request), then **rewrite the design** to stop claiming a gate exists and re-open r2-§1 honestly. What is not acceptable is a design that claims a security gate the code lacks.

### 1b. The step-8 catch-all does not exist; the code ships the explicitly-forbidden `throw err` (Recurring / D↔C — Req 3.10 violation)

Design step 8 and the Response Log: "The catch block is a **total mapping with no bare re-throw** … any other thrown value → 502 … A bare `throw err` at the bottom of the catch is **explicitly forbidden**."

`route.ts:108-121` ships:
```ts
} catch (err) {
  if (err instanceof TimeoutError) { ...503 }
  if (err instanceof ResendError) { ...502 }
  throw err;          // <-- the explicitly-forbidden bare re-throw
}
```

So the load-bearing catch-all the design says closes the CRLF-`testId`→unhandled-500 vector is **not implemented**. Combined with 1a (testId ungated), this is the full r2-§1 vector still live: a production client sends a CRLF-bearing `testId` → `mail.ts:67` `headers["X-Test-Id"] = "...\r\n..."`. (Note: the code assigns into a plain `Record<string,string>` object literal, not the `Headers` constructor the design describes, so the throw site differs — undici's `fetch` will reject the CRLF header when it builds the request — but the outcome is identical: a non-`TimeoutError`/non-`ResendError` throw reaches line 120, re-throws, and Next.js mints an unhandled 500 with a stack trace = Req 3.10 violation, repeatable and unauthenticated).

**Minimal fix:** Replace `throw err;` with the catch-all the design specifies: `console.warn("resend_unexpected"); return Response.json({ error: VENDOR_ERROR_MESSAGE }, { status: 502 });`. Add a route test that injects a generic `Error` rejection and asserts 502 (no throw). This is independent of 1a and should be done regardless.

### 1c. The `inFlightRef` latch does not exist; the code ships the racy `state.kind` guard the design says was replaced (Recurring / D↔C)

The design's Form-State Machine section and Response Log make the `inFlightRef` synchronous `useRef` latch the **v3 headline double-submit fix**, with a detailed explanation of why an `if (state.kind === 'submitting') return;` guard is racy under double-Enter.

`contact-form.tsx` has **no `inFlightRef`** (`grep` confirms zero matches). `handleSubmit` opens with exactly the guard the design condemns:
```ts
async function handleSubmit(event) {
  event.preventDefault();
  if (state.kind === "submitting") return;   // line 121 — the racy stale-closure guard
```

So Req 4.5's "prevent double-submission" is discharged in code by the precise mechanism the design proves is broken under a fast double-tap. The brief asked me to "trace the `finally` that resets `inFlightRef.current`" — there is no `finally` resetting a ref and no ref to reset, so the "permanent lock-out" risk does not apply; but the *actual* double-submit hole the design claims to have fixed is wide open.

**Minimal fix:** Implement the `inFlightRef` latch as the design describes (set `true` as the first statement, early-return if already `true`, reset in `finally`), and add an E2E test that two rapid Enter/clicks produce exactly one POST (see 4b). Or, if the racy guard is accepted, rewrite the design to stop claiming the latch. Again: the design must match the code.

### 1d. The `__mode` mock control does not exist (Recurring / D↔C)

The design (mock surface, §`POST /__mode?testId=&status=`, and Response Log) introduces a `POST /__mode` endpoint that forces 502/503/`timeout` responses, calling it "the control the validation-error and server-error E2E cases need; without it the mock only ever returns 200 and the Req 4.4 recovery branch is untestable."

`e2e/fixtures/mock-resend.mjs` implements only `POST /emails`, `POST /__reset`, `GET /__state`. **There is no `/__mode` and no forced-status capability** (`grep -rn "__mode"` → zero matches). The mock can only ever return 200. Therefore the design's own stated precondition for testing Req 4.4 is unmet — see 1e.

The brief's sub-question — does the `timeout` sentinel actually exercise the 9s server abort or trip Playwright's timeout first? — is moot: the sentinel is not implemented. (Had it been: a hung mock socket would block the route handler's `fetch` until `mail.ts`'s 9s `AbortController` fires → 503; the *page* `fetch` has a 12s client ceiling; the Playwright default action timeout for the `.click()` is satisfied immediately on click, and the assertion would `await expect(...recovery region...)` which has its own ~5s expect timeout. So a 9s server abort → 503 → recovery UI would land at ~9s, **inside** Playwright's default 30s test timeout but **outside** the 5s default `expect` timeout unless the test bumps it. This is a real second-order trap the design never analyzes — but it is academic until `/__mode` exists.)

### 1e. The Origin normalization (`null`/unparseable → absent) is NOT implemented as designed (Compounding / D↔C — but the gap is benign-to-safe)

Design step 2 "`null`/unparseable normalization": a header value of literal `"null"`, empty string, or any value where `new URL(value)` throws is normalized to *absent* (→ both-absent allow path). This is the r2-§2 fix.

`route.ts:40-58` `originAllowed` does **not** normalize. Trace `Origin: null`:
```ts
const origin = req.headers.get("origin");   // "null"
if (origin) {                               // truthy — "null" is a non-empty string
  try { return isAcceptedHost(new URL(origin).host); }  // new URL("null") THROWS
  catch { return false; }                   // → 403
}
```
So a real browser sending `Origin: null` (Lockdown Mode, sandboxed iframe, certain privacy-proxy/redirect chains) gets a **403**, which is exactly the false-403 on the primary funnel that r2-§2 set out to eliminate. The design says this is fixed; the code reintroduces it.

**Severity note (and a reversal of the brief's framing):** The brief worried the normalization might *over-open* the endpoint. The opposite is true — the code is *more* restrictive than the design, not less. And per the design's own honest reframing (§"What this check is worth"), this is a **credential-free endpoint** where the Origin check buys near-zero CSRF protection at any tightness. So the code's stricter behavior costs nothing security-wise and only re-opens the privacy-user false-403. This is a real D↔C drift but **low** severity. Fix: implement the normalization helper the design describes (treat `"null"`/`""`/unparseable as absent), or downgrade the design's claim.

**On the internal-consistency challenge the brief raised:** Is the design self-contradictory — relying on the check for "cheap friction" while making it trivially bypassable? No. The design picks a coherent story: the check is *worthless for CSRF* (stated plainly) and retained only because Req 3.5b mandates it. Making `Origin: null` allow does not "gut" anything that had value, because there was no value to gut. The design is internally consistent here. The only defect is that the code doesn't match it (above).

### 1f. `mail.ts` uses a plain object for headers, not the `Headers` constructor (Novel, minor)

The design's Transport note says "Header assembly uses the `Headers` constructor so a malformed value would throw a `TypeError` that the route's step-8 catch-all sanitizes." The code (`mail.ts:62-68`) uses a plain `Record<string,string>` and passes it to `fetch`. The CRLF rejection still happens (undici validates when constructing the request), so the *outcome* is the same, but the design's stated mechanism is inaccurate. Trivial — fold into the 1b fix.

---

## 2. Document-internal consistency

### 2a. The sequence diagram is now consistent with the *design prose* but both are inconsistent with the *code* (Compounding)

The brief flagged the `sequenceDiagram` as possibly encoding the old error mapping. It does not — the diagram (design.md:146-152) correctly shows 502 for Resend error and 503+Retry-After for timeout, matching the prose. However, the diagram (like the prose) shows a clean total mapping with no "unexpected throw → 502" arm, which is fine as an abstraction *except* that the code has no catch-all at all (1b). So the diagram is internally consistent with the prose and wrong about the code in the same way the prose is. Not a separate defect; a symptom of 1b.

### 2b. 413 response body string differs between design and code (Novel, minor)

Req 3.5a, design "Error Handling" / "Data Models" (design.md:448): 413 body is `{ error: "Message is too long. Please shorten and try again." }`. Code (`route.ts:74`): `{ error: "Payload too large." }`. The client treats all 413s as `server-error` and renders its own copy, so the wire string is never shown to a user — harmless functionally, but it is a literal Req-3.5a contract the code violates and the design misstates. Fix: align the string (cheaper to fix the code to match Req 3.5a's mandated copy).

### 2c. Test-file inventory is wrong (Compounding / D↔C)

The design's Testing Strategy names two new E2E files: `e2e/tests/contact-form.test.ts` and `e2e/tests/contact-csp-axe.test.ts`. The code ships **four**: `contact-form.test.ts`, `contact-csp.test.ts`, `contact-axe.test.ts`, `contact-reduced-motion.test.ts`. The split is arguably *better* than the design (separation of concerns), but the design's "Existing tests untouched" / file-naming claims are stale. Also `design.md:600` lists `smoke.test.ts` etc. as "unchanged" — fine — but the named-file inventory should match reality.

### 2d. Cross-references and Req↔design numbers (checked — sound)

I verified the Req numbers the design cites against `requirements.md`: 3.5a–g (✓ Req 3.5 a–g), 4.3/4.4/4.5/4.8 (✓), 1.9 (✓ force-static), 3.8 (✓ 9s/503), 3.10 (✓ no-log), 6.1 (✓ description distinctness), 1.14 (✓ same-commit). No miscited Req numbers found. The `r2-§N` back-references resolve to real items in `adversarial-memory-design.md`. Traceability of *numbers* is clean; it is the *implementation claims* behind them that are false.

---

## 3. Requirements coverage r1/r2 did not sweep

### 3a. NFR Performance / Lighthouse — cite-without-mechanism, but acceptable (Novel, low)

Req-NFR-Performance mandates Lighthouse ≥ 90 enforced by a non-blocking `@lhci/cli` PR-comment job. The design does not mention `@lhci/cli` wiring for these two routes at all — it is silent on the perf budget. The headshot `<Image>` ships with `priority` (`profile/page.tsx:34`) which is correct for LCP, and the only client JS is `<ContactForm />` + `react-obfuscate`, so the budget is plausibly fine. But the design discharges the Lighthouse NFR by neither citing the existing LHCI harness nor adding these routes to it. **Low severity** (the repo already has `scripts/run-lhci.mjs`), but it is a genuine cite-without-mechanism gap: nothing in this design ensures `/profile` and `/contact` are in the LHCI URL set. Recommend one sentence confirming they are (or adding them).

### 3b. `source` silent-swallow — correctly dispositioned (no defect)

`sourceSchema = z.enum([...]).optional().catch(undefined)` (route.ts:17, code matches design). The brief asked whether any Req treats `source` as a *trustworthy* signal. Req 5.5 and its "Enum lock-in note" explicitly accept silent normalization to `undefined` as the closed-set security posture, and Req-NFR-Observability treats `source` as email-body attribution only, never a security or routing input. So silent coercion is by-design and Req-backed. **Not a defect.** One residual the design *does* flag adequately: a typo'd future `source="landing"` callsite normalizes to `undefined` with no test failure — Req 5.5's lock-in note owns this.

### 3c. `/contact` vs `/profile` metadata distinctness — sound (no defect)

`/profile` sets `alternates.canonical: "/profile"` + frontmatter title/description (page.tsx:14-20). `/contact` sets a distinct static `title: "Contact"` + a distinct description (page.tsx:9-15). The placeholder `robots: {index:false}` is removed from both (grep confirms no `robots`/`noindex` in either page) — so neither accidentally deindexes. `/contact` has no `canonical`; that is acceptable (self-canonical default). Metadata distinctness (Req 6.1) holds. **Not a defect.**

---

## 4. Testing strategy's residual honesty — the over-promise the brief predicted

### 4a. The design over-promises four E2E cases that do not exist (Recurring / D↔C — this is the largest *coverage* gap and it is exactly the gap r2 flagged)

The design's Response Log claims v3 closed "Req 4.3/4.4/4.8 untested (Agreed — largest gap)" with new E2E for validation-error UX, server-error recovery UX, Enter-key, and the JS-submit `framenavigated` test. **None of these four exist in the code:**

- **Validation-error UX (Req 4.3):** no test submitting an invalid form and asserting `aria-describedby`/`role="alert"`/focus-to-first-invalid/value-preservation. (`contact-form.test.ts` covers only happy path, SSR-leak, honeypot.)
- **Server-error recovery UX (Req 4.4):** no test. It *cannot* exist, because it depends on `POST /__mode` which is also absent (1d). The recovery UI (`role="status"`, "Try again", LinkedIn CTA) is rendered in `contact-form.tsx:237-266` but **never exercised by any test**.
- **Enter-key submission (Req 4.8):** no `keyboard.press("Enter")` test anywhere (`grep` confirms). The textarea-Enter-inserts-newline assertion is also absent.
- **JS-submit-stays-JS (r2-§6):** no `framenavigated` listener and no no-`action`-attribute assertion anywhere (`grep` confirms zero `framenavigated`). This is the *one knowingly-open hole from v1* that the design says is "closed here, not deferred again." It is still open.

So the two **core behavioral requirements of the entire feature** (4.3 validation feedback, 4.4 error recovery) have **zero automated coverage in the shipped code**, while the design's Response Log lists them as the headline v3 accomplishment. This is the most consequential honesty gap: r2's largest finding is re-opened, and the design hides it by claiming it closed.

### 4b. The `inFlightRef` double-submit latch is the claimed headline fix and is neither implemented (1c) nor tested (Recurring)

The brief asks: "If the latch is the v3 headline fix, is it tested?" No — and worse, it isn't implemented. There is no test asserting two rapid submits produce exactly one POST. Given the racy `state.kind` guard that actually ships (1c), such a test would likely *fail* under double-Enter.

### 4c. What the design over-claims vs. what is honestly covered

For completeness, the E2E coverage that *does* ship and is sound: happy-path on both pages with full payload-shape assertions (subject/text/reply_to/html-undefined), SSR email-leak guard, honeypot silent-200, CSP no-violation smoke + `form-action 'self'` header presence, axe in light+dark on both pages, reduced-motion (no smooth-scroll + `animationName === 'none'`), and the absolute-canonical assertion (Req 6.3). The unit suites (`mail.test.ts`, `route.test.ts`) are genuinely strong on the validation pipeline, origin cases, `Retry-After: 60` (route.test.ts:263), sanity-guard (mail.test.ts:173), and log-discipline (`assertNoUserInputLogged`). The coverage that ships is good; the problem is the design claims a *superset* it doesn't have.

---

## 5. Anything genuinely new

### 5a. Client ships a dead `unknown`/`504` server-error path that no test and no server route can produce 504 for (Novel, low)

`contact-form.tsx:20` types `status` including `504`, and SERVER_ERROR_COPY handles it. Fine as fail-safe. The `unknown` bucket (route can't emit non-enumerated 5xx, but Vercel can) is documented in the design ("server-error status superset"). Code matches design here. Not a defect, just confirming the `unknown` bucket the brief asked about is real and documented.

### 5b. `AvatarPlaceholder` fallback is undocumented design surface (Novel, low)

`profile/page.tsx:6,37-39` renders an `<AvatarPlaceholder>` when `profile.headshot` is absent. The design's `/profile` composition (design.md:196) says "headshot image (when `profile.headshot` present)" and is silent on the absent branch — it implies *nothing* renders when absent. The code instead renders a placeholder avatar. This is a reasonable UX choice but it is **undocumented design surface**, and it interacts with the design's "headshot-present branch is untested" coverage note (design.md:595): in reality it is the *placeholder* branch that ships and is exercised by every axe/happy-path run, while *both* the real-`<Image>` path AND the design's claimed "nothing renders" behavior are fictional. Minor: document the placeholder.

### 5c. `force-static` — correctly dispositioned (no defect)

Both pages declare `export const dynamic = "force-static"` (profile:12, contact:7), matching Req 1.9 and the design's r2-§5 disposition. The `'error'` alternative remains a flagged requirements-refinement candidate. Code matches design and Req. Clean.

### 5d. `velite.config.ts`, `vercel.json`, `next.config.ts` — code matches design (no defect)

The Velite `profile` collection (execFileSync + `--follow` + empty-output named-error guard), `vercel.json` buildCommand, and the `form-action 'self'` CSP directive all ship exactly as designed. The only nit: the design's r2-§4 `.max()` bounds on the profile string fields (design.md:342, "title/description/headline/location/availability") are **not present** in the shipped schema (`velite.config.ts:66-74` uses bare `s.string()` for all five). Minor D↔C drift — the design claims `.max()` bounds it doesn't have. Low severity (build-time only, author-controlled content) but it is another "design claims a v3 fix the code lacks" instance. Add the `.max()` bounds or drop the claim.

---

## Top 5 risks/gaps (ranked)

1. **`NODE_ENV` production gate absent — testId trust boundary re-open (Recurring/D↔C, security-critical).** `mail.ts:66` + `route.ts:104` forward attacker-controlled `testId` to real Resend in production with no gate; the design claims the gate exists and closes r2-§1. *Scenario:* prod client POSTs `{...,testId:"x\r\nInjected: y"}` → `X-Test-Id` set → undici rejects CRLF header → throw escapes the catch (see #2) → unauthenticated repeatable 500 + stack trace (Req 3.10 violation). *Fix:* gate both reads behind `process.env.NODE_ENV !== "production"`; add a suppression test.

2. **Step-8 catch-all absent; code ships the forbidden `throw err` (Recurring/D↔C, Req 3.10).** `route.ts:120`. Any non-typed throw from `sendContactEmail` becomes an unhandled 500 with stack trace. *Fix:* replace `throw err;` with `console.warn("resend_unexpected"); return 502`. Add a generic-error→502 test. (Compounds #1 into a live exploit.)

3. **Req 4.3 + 4.4 behavioral E2E absent; `__mode` mock control absent (Recurring/D↔C, largest coverage gap).** The two core "accessible feedback" requirements have zero automated coverage; the design's Response Log lists them as the headline v3 fix. *Scenario:* a refactor breaks the validation-error focus management or the LinkedIn recovery CTA and ships green. *Fix:* implement `POST /__mode` in the mock (force 502/503), then add the validation-error, server-error-recovery, Enter-key, and `framenavigated` tests the design already specifies in full.

4. **`inFlightRef` double-submit latch absent; racy `state.kind` guard ships (Recurring/D↔C).** `contact-form.tsx:121`. Two synchronous Enter keydowns can both observe stale `idle` and double-send. *Fix:* implement the `useRef` latch per the design; add a two-rapid-submits→one-POST test.

5. **Origin `null`/unparseable not normalized → false-403 for privacy users (Compounding/D↔C, low).** `route.ts:43-49`. `Origin: null` → `new URL` throws → 403. *Fix:* normalize `"null"`/empty/unparseable to absent per the design's step-2.

(Lower-tier, fold-in fixes: #2b 413 string; #5b placeholder doc; #5d missing `.max()` bounds; #3a confirm LHCI covers the two routes; #2c test-file inventory; #1f headers-object vs `Headers`.)

## Top 3 conclusions to challenge or reverse

1. **Reverse: "v3 addressed all of v2" / the Response Log.** This is the document's central claim and it is false against the code. r2-§1 (testId gate), r2-§3/§4 (inFlightRef), and r2-§4 (4.3/4.4/4.8 E2E + `__mode`) are all still open in the shipped implementation. The Response Log is currently a record of *intended* fixes presented as *completed* ones. Either implement them or rewrite the log to say "designed, not yet implemented."

2. **Challenge: the "convergence" framing itself.** The prose has converged; the *system* (design + code) has diverged. A design that drifts from its own already-shipped code is arguably less build-ready than a rougher design that matches reality, because it will mislead the next implementer into believing protections exist. The convergence verdict the brief invites must account for the design↔code axis, not just the design↔requirements axis.

3. **Challenge (mild): the brief's worry that Origin-normalization over-opens the endpoint.** The code is *stricter* than the design, not looser, and on a credential-free endpoint the whole check is near-zero-value anyway (the design's own honest reframing is correct and internally consistent). Don't spend hardening budget here; spend it on #1–#4.

## What's missing before build-ready

The design is not "before build" — it is *after* build, describing a build that differs from it. Before this is safe to hand to anyone:

- **Reconcile design and code on the five drift items** (testId gate, catch-all, inFlightRef, Origin-normalize, `.max()` bounds). For each: implement-to-match-design, or amend-design-to-match-code with the security trade-off stated.
- **Implement `POST /__mode`** and the four missing behavioral E2E tests (4.3/4.4/4.8 + `framenavigated`), or formally re-defer them with the gap re-opened in the memory ledger — not silently claimed closed.
- **Add the three missing tests** that would have caught the drift: testId-suppression-in-prod, generic-error→502 (no throw), and two-rapid-submits→one-POST.
- **One line** confirming `/profile` + `/contact` are in the LHCI URL set (Req-NFR-Performance).

## Convergence verdict

**Blocking defect.** Design v3 is **not** ready to build. The prose is excellent and the requirements traceability is clean, but the document asserts — as completed, security-critical fixes — three mechanisms that do not exist in the already-shipped code (`NODE_ENV` gate, step-8 catch-all, `inFlightRef` latch), one test-infrastructure piece that does not exist (`__mode`), and four behavioral tests that do not exist (Req 4.3/4.4/4.8 + JS-submit). Of these, items #1 and #2 combine into a live, unauthenticated, repeatable Req-3.10 violation in production. This is not "ready-with-minor-edits": the design's own Response Log must be rewritten to stop claiming closed what the code leaves open, and the code must receive the fixes the design describes. Until design and code are reconciled, treat r2-§1, r2-§3/§4, r2-§4, and r2-§6 as **Recurring and open**.
