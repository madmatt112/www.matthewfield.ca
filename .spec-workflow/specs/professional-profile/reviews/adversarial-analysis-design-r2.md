# Adversarial Analysis — professional-profile/design.md (round 2)

Reviewer posture: principal engineer, brought in to break this before it ships.
Findings are graded Novel / Compounding / Recurring per the brief.

**Grounding note (read first).** The brief frames this as a pre-build review, but the
feature is *already implemented on disk*. I reviewed the design against the live code,
not just its prose. That changes the calculus: several "design says X" claims are
falsifiable against `src/`, and two of them are wrong in the implementation. Where the
code and the design diverge I cite the code, because the code is what ships.

Two premises in the prompt are also factually off and worth pinning before the analysis,
because they change which failure modes are real:

- **"React 18 concurrency."** `package.json` pins `react@19.2.4` / `react-dom@19.2.4` and
  `next@16.2.2`. This is React 19 on Next 16, not React 18. StrictMode double-invoke and
  effect semantics still apply, but any reasoning premised on React-18-specific batching
  quirks is moot. The form-state findings below are re-derived against React 19.
- **"`fetch` rejects CRLF in header values — does it depend on runtime?"** On this
  project's Node runtime (undici), `Headers.set/append` throws `TypeError` on CRLF in a
  value. I verified this directly. But it does **not** throw on non-string values — it
  coerces them (`{}` → `"[object Object]"`, `[1,2]` → `"1,2"`, `42` → `"42"`). That
  asymmetry is the actual bug surface in dimension 1, not CRLF.

---

## 1. The `testId` → `X-Test-Id` forwarding seam

**This is the most important finding in the round, and it is live in production code, not
hypothetical.** `src/app/api/contact/route.ts` reads `parsedRecord.testId` and threads it
into `sendContactEmail`; `src/lib/mail.ts` then does:

```ts
if (typeof input.testId === "string") {
  headers["X-Test-Id"] = input.testId;
}
```

There is **no `NODE_ENV` / `VERCEL_ENV` gate**. The design's defense — "In production the
header is absent (no test ever attaches it)" — is not a property of the code; it is a
property of *client goodwill*. A hostile client can `curl https://matthewfield.ca/api/contact`
with `{name,email,message, testId: "..."}` and the production handler will attach an
attacker-controlled `X-Test-Id` header to the outbound request to the *real*
`api.resend.com`. Classification: **Recurring/Compounding** — the v1 multi-tenant-mock fix
(memory §"Multi-tenant mock-Resend") is exactly what introduced this seam, and v2 did not
close it.

Concrete consequences, graded by how much I actually believe them after testing:

- **Header injection via CRLF: blocked, but by luck of runtime, not by design.** I verified
  that undici throws `TypeError` on `X-Test-Id: "a\r\nBcc: x"`. So CRLF smuggling into the
  Resend request is *not* currently exploitable. **But** that `TypeError` is thrown *inside
  `sendContactEmail`*, is not an instance of `TimeoutError` or `ResendError`, and therefore
  hits the `throw err;` re-raise at the bottom of the route's catch — which becomes an
  **unhandled 500** with a stack trace. Req 3.10 forbids leaking, and Req 3.5c's no-throw
  spirit is violated. A trivially-crafted `testId` (any string with `\r\n`) is a remote
  unauthenticated 500 + log-noise generator. **This is novel and concrete.**
- **Non-string `testId` is silently coerced.** `route.ts` guards with
  `typeof parsedRecord.testId === "string"`, so `{testId: {}}` or `{testId: 42}` is dropped
  before reaching mail.ts. Good — the guard closes the coercion path the brief asked about.
  So the object/array/number case is handled. Credit where due.
- **Log poisoning at Resend / upstream proxy.** Even a clean ASCII `testId` is forwarded
  verbatim to Resend's edge. An attacker can stuff a 16KB `testId` (under the 32KB body cap)
  of arbitrary ASCII into a header Resend logs. Low real-world impact (it is Resend's logs,
  not ours), but it is an unbounded attacker-controlled value crossing a trust boundary for
  zero production benefit.

**The architectural verdict the design dodges:** test-only behavior is compiled into the
production route and the production client bundle (`contact-form.tsx` reads
`window.__TEST_ID` unconditionally). The design explicitly considered and *did not* gate it.
That is a "test code in prod" smell that should be designed out. The minimal fix is one of:

1. Gate the forward: `if (process.env.NODE_ENV !== "production" && typeof input.testId === "string")` in mail.ts. Dead-code-eliminated in the prod bundle for the client read too.
2. Better: drop the wire-field hop entirely. The mock already runs in-process under the
   wrapper script; partition by a header the *test harness* injects via Playwright's
   `page.route` request interception, never touching production code. The current design
   chose the wire field specifically to avoid CORS-header complexity — but it traded a test
   convenience for a production trust-boundary crossing, which is the wrong trade.

At minimum, even if the seam stays, the bare `throw err` must be replaced with a sanitized
502/400 so a CRLF `testId` cannot mint unhandled 500s. That is a 3-line fix and it is not
optional.

## 2. The `*.vercel.app` blanket Origin/Referer suffix match

Live code (`isAcceptedHost` in route.ts): `if (host.endsWith(".vercel.app")) return true;`.

**The wildcard is real and the design's "would not improve security" claim is too strong —
but the attack the brief gestures at does not land, for a more interesting reason.**

Walk the scenario the brief asks for: a third party stands up `evil-xyz.vercel.app`. Can
they cause a *victim's browser* to send `Origin: https://evil-xyz.vercel.app` to
*our* `/api/contact` in a way that matters? No — because the endpoint is **credential-free**.
There are no cookies, no session, no `Authorization` tied to the victim. CSRF requires the
server to act on *ambient authority* carried by the victim's browser. A contact form that
sends an email with attacker-chosen `name/email/message` has no victim authority to ride.
The worst a cross-origin page can do is submit a form *as itself*, which is identical to
`curl`. So the Origin check buys **nothing against CSRF here** regardless of how tight the
allowlist is.

That reframes the whole check. Classification: **Novel** — neither v1 nor v2 questioned
*whether the Origin check should exist at all* on a credential-free endpoint; they only
argued about how wide the wildcard should be.

The check's only real job is to make casual cross-origin spray marginally harder. Against
that modest goal, weigh the **false-403 cost to legitimate humans**, which is non-trivial:

- `Origin: null` cases. Sandboxed-iframe embeds, some `Referrer-Policy: no-referrer`
  + privacy-proxy combinations, and certain redirect chains can produce `Origin: null` or a
  bare `null` string. `new URL("null")` throws → caught → `return false` → **403**. A real
  human in Lockdown Mode or behind a privacy proxy that rewrites Origin gets silently
  rejected on the *primary inbound funnel*.
- The both-absent fallback (`return true`) is the *only* thing saving privacy browsers that
  strip both headers. But a browser that sends `Origin: null` (present, but unusable) does
  **not** hit the both-absent path — it hits the present-but-mismatched path and 403s. That
  is the gap: "stripped entirely" is allowed; "present but null" is rejected. Real browsers
  do the latter.

**Recommendation (reverse, don't tighten):** since the endpoint is credential-free, the
honeypot + zod + size cap already carry the abuse load the design assigns to Origin. The
Origin check mostly adds false-403 modes for exactly the privacy-conscious users a personal
site wants to court. Either (a) treat `Origin: null` / unparseable as the both-absent
fallback (allow, let honeypot+zod catch bots), or (b) drop the Origin check and lean on the
documented residual-DoS posture the spec already accepts. The design's "tightening the
wildcard would not improve security" is correct but is answering the wrong question — the
question is whether the check earns its false-403s, and on a credential-free endpoint it does
not.

## 3. React 19 form-state machine correctness

Reviewed against the live `contact-form.tsx`. The two-`useState` split (FormState +
fields) plus `attemptId` is real.

- **`[attemptId, state.kind]` effect keying — correct, and StrictMode-safe.** Because
  `attemptId` increments once per submit and the effect early-returns on `attemptId === 0`,
  the success side-effects (focus, `scrollIntoView`, `dispatchEvent`) fire once per attempt.
  StrictMode's dev double-invoke of the effect *would* fire the `CustomEvent` twice in dev,
  but production is single-invoke and the e2e test races a `once: true` listener so it would
  not catch a double-fire anyway. **Low severity, dev-only.** The keying choice is sound;
  this part of v2 holds up. One nit: `dispatchEvent` of an analytics event inside an effect
  that StrictMode double-invokes means *a future analytics subscriber will double-count
  successes in dev*. Harmless now (no subscriber), worth a one-line comment.

- **Double-submit guard under rapid Enter — real but narrow gap.** `Compounding`. The guard
  is `if (state.kind === "submitting") return;` reading `state` from closure. In React 19,
  two synchronous Enter keydowns dispatched before the `setState({kind:"submitting"})` from
  the first commit will both see `state.kind !== "submitting"` (stale closure) and both
  proceed to `fetch`. React's batching does not save you here because the second event
  handler runs in a *separate* task with the *old* closure. The native `disabled` attribute
  the design deliberately avoided is exactly what browsers use to make this impossible at the
  event layer. Mitigations the design relies on: server is idempotent-ish (two emails sent,
  not a state corruption) and the window is sub-frame. But "two emails per fast double-tap"
  is a real outcome on the primary funnel. Minimal fix: a `useRef` in-flight latch set
  synchronously at the top of `handleSubmit` (refs are not subject to the stale-closure
  problem), checked before the state read. ~3 lines. The design's claim that the in-handler
  guard "preserves the no-double-submit guarantee" is **false as written** — the guard reads
  async state, not a synchronous latch.

- **Stale in-flight fetch overwriting newer state — mostly not a bug, by accident.** The
  brief's scenario (response A lands after a transition back into submitting) is bounded
  because each `handleSubmit` invocation owns a *local* `controller`/`response` and the
  re-entry guard blocks a second submit while `submitting`. To start attempt B you must first
  leave `submitting` (success/error), which only happens after A's `await fetch` settles or
  aborts. So A is done before B starts. The one untested edge: `handleRetry` sets
  `idle` (not via the guard), so after a server-error you can click "Try again" and
  immediately submit — but A already resolved to produce that server-error, so it is inert.
  **No fix needed; the design over-worries this.** Note this works *despite* the design's
  prose, not because of an explicit guard — there is no `attemptId`-stamping on the response
  handler. If a future refactor removes the re-entry guard or aborts-and-resubmits, the race
  reopens with no test to catch it.

- **Clear-on-success ordering — clean.** `setFields(INITIAL_FIELDS)` then `setState(success)`
  in the same task; both flushed in one commit; and the success branch does not render the
  inputs at all (it swaps to a `role="status"` panel). So there is no render showing stale
  values under a focused success heading. Fine.

- **Bug spotted in passing (Novel, not in the design at all):** the textarea has
  `className="min-h-44"`. Tailwind `min-h-44` = `11rem` (176px), not the `min-h-11` (44px)
  the design's tap-target language implies. Cosmetic, but it shows the design's class names
  are not the implemented ones — worth a sync. Also `role="status"` wraps the success panel
  *and* the inner `<h2>` carries `tabIndex={-1}` and receives focus; focusing a child of a
  `role="status"` live region is fine, but the outer `role="status"` + inner focusable
  heading is a slightly redundant structure that the design described as a single focusable
  region.

## 4. Requirements ↔ design traceability holes

- **Req 4.5 "submit button SHALL … be disabled" vs. design's `aria-disabled`.** The design
  consciously substitutes `aria-disabled` for native `disabled` (focus-limbo rationale —
  legitimate). But Req 4.5 says *disabled*, and the design's reinterpretation means the
  literal acceptance criterion ("be disabled to prevent double-submission") is **not met by
  the mechanism it claims** (see §3 — the guard is racy). This is a requirement the design
  *gestures at* with a mechanism that does not fully discharge it. **Compounding** with the
  v1 a11y discussion. Flag: either amend Req 4.5 to bless `aria-disabled` + a *synchronous*
  guard, or add the ref-latch so the "prevent double-submission" clause is actually true.

- **Req 4.4 lists `504` in the handled set; the design's client maps 504, but the server
  never emits a structured 504** (Vercel does). Fine — but the live `contact-form.tsx`
  `SERVER_ERROR_COPY` includes a `"unknown"` bucket not enumerated in Req 4.4. Any status
  outside {429,502,503,504} or a 400-without-`errors` lands in `unknown`. Harmless superset,
  but it is design surface that exists in code and is undocumented in design.md. Minor.

- **Untested-by-strategy acceptance criteria (the jsdom abstention bites here).** The design
  declares `<ContactForm />` is not unit-tested and only Playwright covers it. That leaves
  these Req acceptance criteria with **no automated assertion**:
  - **Req 4.3** (validation-error UX: per-field `aria-describedby`, `role="alert"` summary,
    focus to first invalid field, values preserved). The happy-path and honeypot e2e tests
    do not submit an *invalid* form. There is no test that a 400-with-`errors` produces the
    `role="alert"` summary, moves focus to the first invalid field, or preserves values.
    This is a *whole requirement* with zero coverage. **Novel** — v1/v2 focused on the
    happy path and CSP; nobody noticed the validation-error branch is untested.
  - **Req 4.4 recovery UX** (the "Try again" button + LinkedIn CTA, focus-to-region, values
    preserved on server error). No e2e test drives the mock into a 502/503 to assert the
    recovery panel renders, focuses, and preserves field values. The mock always returns 200.
  - **Req 4.8** (Enter-from-input submits; Enter-in-textarea inserts newline). No test.
  - **Req 4.2 reduced-motion** *is* covered (`contact-reduced-motion.test.ts` exists) — good,
    that v1 carry-forward landed.
  These are coverage holes, not design errors, but the design's "Playwright covers the
  meaningful wiring" is **overclaimed**: it covers the happy path, honeypot, SSR-leak, CSP,
  and reduced-motion. It does not cover the two largest *behavioral* requirements (4.3, 4.4),
  which are the entire point of "accessible, non-disruptive feedback."

- **Req 1.3 / Req 1.5 headshot-absent path.** `content/profile.mdx` ships *without* a
  `headshot` field, and `headshot` is `s.image().optional()`. The design says the page renders
  the headshot "when present." Good — but there is **no test** that `/profile` renders cleanly
  with `headshot` absent (the as-shipped state). The axe/happy-path tests run against the
  no-headshot page, so they incidentally cover the absent branch — but a regression that
  assumes `profile.headshot` is defined (`profile.headshot.src`) would only fail if a headshot
  is *later* added and then removed. Acceptable, but the design should note that the
  as-authored content exercises only the absent branch; the *present* branch
  (`<Image>` rendering) is **completely untested**.

- **Req 6.1 description-distinctness from `/about`** is asserted by author discretion only;
  the design correctly notes it cannot be CI-enforced. No gap, just confirming it is a manual
  gate.

- **`availability`/`location` length constraints**: the brief asks. There are none — both are
  `s.string()` unbounded. A 5000-char `availability` would render unbounded into the layout.
  Trivial residual; worth a `.max()` if these feed a constrained layout slot. Low.

## 5. Build/runtime edge cases

- **`vercel.json` shell precedence — the design's worry is unfounded; I proved it.** The
  string is `git fetch --deepen=1000 || git fetch --unshallow || true && pnpm build`. In
  POSIX `sh`, `&&` and `||` have **equal precedence and are left-associative**, so this parses
  as `(((deepen || unshallow) || true) && pnpm build)`. The `|| true` guarantees the
  left operand of `&&` always exits 0, so **`pnpm build` always runs** regardless of fetch
  outcome. I verified all branches (`false||false||true && echo` → runs; `true||...&&echo` →
  runs). **The design's mechanism is correct.** The *real* subtlety the design under-states:
  `|| true` swallows *every* failure of both fetches, so a genuinely-shallow clone with no
  history proceeds straight to build, and the **only** thing catching "we still don't have the
  commit" is the Velite transform's empty-output guard. That guard exists and is wired
  (verified in `velite.config.ts`), so the chain is sound — but the design should say plainly
  that `vercel.json` provides *zero* fetch-failure signal; 100% of the safety is downstream in
  the transform. **No fix; documentation precision.**

- **`force-static` + runtime POST — fine, but `force-static` is the wrong tool for the
  reason given.** The page is a static RSC; the POST happens from a client component to a
  separate route handler that is *not* statically rendered (route handlers with no caching
  directives are dynamic). Nothing in static export breaks the runtime POST — they are
  independent. The design's rationale (Req 1.9: guard against accidental `headers()`/`cookies()`
  dynamic degradation) is the correct *motivation*, but note: on Next 16, a page that calls no
  dynamic APIs is *already* statically rendered; `force-static` additionally *suppresses* the
  build error you would otherwise get if someone adds a dynamic API, silently serving stale
  data instead. So `force-static` trades "loud build failure on accidental dynamic API" for
  "silent static serve." For a guard whose stated purpose is to *catch* accidental dynamic
  usage, `export const dynamic = 'error'` is the directive that actually fails loudly, which
  is what Req 1.9's intent ("prevent silent degradation") literally asks for. **Novel** —
  `force-static` vs `'error'` is a real semantic mismatch with the requirement's stated goal.
  Recommend reconsidering `'error'` for these two pages.

- **9s / 12s / 10s timeline — the design's "503 reaches the client cleanly" is the warm-path
  case only, and the design admits this, but the numbers are optimistic.** Trace a 9.5s Resend
  call on a *cold* invocation: module init (~100–200ms) + cold boot (~200–500ms) before
  handler start, then the 9s abort fires at t≈9.0s *relative to handler start* ≈ 9.3–9.7s
  wall. The catch path (`console.warn` + `Response.json` with header) is cheap (<10ms), so on
  cold start it usually *just* ships the 503 before the 10s cap — but the margin is the
  ~300ms the spec itself flags, and a slow cold log flush can blow it. The design's Error
  Handling §8 already documents the 504 fallback and Req 4.4 handles 504 client-side, so the
  *contract* holds. **No new gap; the design is honest here.** One concrete improvement: drop
  the server abort to ~8000ms to widen the cold-path response budget from ~300ms to ~1.3s —
  the spec picked 9s to maximize Resend's window, but Resend p99 is well under 8s and the
  trade buys real cold-path headroom.

## 6. The surviving Unresolved item — JS-vs-native submission regression

**Escalate to a top-3 gap. It is the one knowingly-open hole, and I confirmed it is still
open in the shipped tests.** I grepped every `contact-*.test.ts`: the only `form-action`
assertion (`contact-csp.test.ts:91`) checks that the *response header string* contains
`form-action 'self'`. **No test asserts the runtime submission stays JS-driven.** Nothing
asserts `event.preventDefault()` runs, nothing asserts the `<form>` has no `action`
attribute, nothing asserts a submit does not navigate.

Why this is *higher* severity now than in v1:

1. It was a *deliberate* carry-forward (memory §Unresolved), so it is no longer "we missed
   it" — it is "we chose to ship it uncovered," which raises the bar for justification.
2. The regression is *silent and plausible*. If a future refactor (e.g. adopting a Server
   Action or React 19's `<form action={fn}>`) removes the manual `fetch`+`preventDefault`,
   `form-action 'self'` *allows* the same-origin native submit, so the CSP smoke stays green,
   the happy-path e2e *might* still pass if the native POST happens to reach `/api/contact`
   with form-encoded (not JSON) body — except the handler does `JSON.parse`, so a native
   `application/x-www-form-urlencoded` submit would 400, and the e2e *would* catch it via the
   missing success heading. So the happy-path test is an *accidental* partial guard. But a
   native submit that navigates away (full page reload to a 400 page) is a UX catastrophe the
   CSP test cannot see and the happy-path test catches only because the success heading never
   appears — a confusing failure mode, not a targeted assertion.
3. React 19 specifically *invites* this regression: `<form action={serverAction}>` is the
   idiomatic React 19 pattern, and a well-meaning "modernize the form" PR is exactly the
   change that drops `preventDefault`.

**Minimal fix (one test, ~6 lines):**

```ts
test("form submits via JS, never native navigation", async ({ page }) => {
  await page.goto("/contact");
  const form = page.locator("form");
  await expect(form).not.toHaveAttribute("action", /.+/); // no action attribute
  let navigated = false;
  page.on("framenavigated", () => { navigated = true; });
  // fill + submit, assert success heading appears AND no top-level navigation occurred
  // ...
  expect(navigated).toBe(false);
});
```

The design's framing — "keep `form-action` for cross-origin defense-in-depth, do not rely on
it for regression protection" — is correct *and* is precisely the argument for adding the
behavioral test: the design itself admits nothing protects against the regression, then
declines to add the one cheap thing that would. That is not an acceptable resting state for
the primary inbound funnel.

---

## Top 5 risks/gaps (ranked)

1. **Production `testId` → `X-Test-Id` forward is ungated AND a CRLF `testId` mints
   unhandled 500s.** *(Recurring/Compounding.)* Scenario: `curl -d
   '{"name":"a","email":"a@b.co","message":"0123456789","testId":"x\r\ny"}'` →
   `Headers.set` throws `TypeError` → falls through `TimeoutError`/`ResendError` checks →
   `throw err` → unhandled 500 + stack in Vercel logs (Req 3.10 violation), repeatable
   unauthenticated. Fix: gate the forward behind `NODE_ENV !== "production"` (or remove the
   wire-field entirely), AND replace the route's bare `throw err` with a sanitized 502.

2. **No test covers Req 4.3 (validation-error UX) or Req 4.4 (server-error recovery UX) —
   the two core behavioral requirements of "accessible feedback."** *(Novel.)* Scenario: a
   refactor breaks focus-to-first-invalid-field or drops the LinkedIn CTA on 502; every test
   stays green because the mock only returns 200 and no test submits an invalid form. Fix:
   add two Playwright cases — one submitting an invalid form (assert `role="alert"`, focus,
   value preservation), one driving the mock to return 502 (assert recovery panel + CTA +
   value preservation).

3. **JS-vs-native submission regression has no behavioral test.** *(Recurring, escalated.)*
   Scenario above (§6). Fix: the 6-line `framenavigated` + no-`action`-attribute test.

4. **Rapid double-Enter sends two emails; the "no-double-submit guarantee" is false as
   coded.** *(Compounding.)* The guard reads stale closure `state`, not a synchronous latch.
   Fix: `const inFlight = useRef(false)` set at the top of `handleSubmit`, checked before the
   state read, cleared in `finally`.

5. **Origin check is security theater on a credential-free endpoint and 403s real privacy
   users on `Origin: null`.** *(Novel.)* Scenario: Lockdown-Mode Safari or a privacy proxy
   sends `Origin: null` → `new URL("null")` throws → 403 on the primary funnel; meanwhile the
   check stops zero real CSRF because there is no victim authority to ride. Fix: treat
   `null`/unparseable Origin as the both-absent allow path, or drop the check and rely on
   honeypot+zod (already the documented abuse posture).

## Top 3 conclusions to challenge or reverse

1. **"In production the [`X-Test-Id`] header is absent (no test ever attaches it)."** Reverse.
   This is true of the test harness, not of the endpoint. The endpoint forwards any
   client-supplied `testId`. The conclusion that the seam is benign in production is wrong;
   it is a trust-boundary crossing that exists solely for test convenience and should be
   compiled out of production.

2. **"Tightening the wildcard to a per-deploy hostname list would not improve security."**
   Challenge — it is answering the wrong question. On a credential-free endpoint the Origin
   check buys ~nothing *at any tightness*, so the correct move is not "leave it wide" but
   "stop letting it 403 legitimate `Origin: null` traffic." The design defends the wildcard's
   width while missing that the check's false-403 cost exceeds its (near-zero) benefit.

3. **`export const dynamic = 'force-static'` as the guard against accidental dynamic
   rendering (Req 1.9 intent).** Reverse to `'error'`. `force-static` *silences* the signal
   it is supposed to surface — an accidental `headers()`/`cookies()` call gets statically
   coerced instead of failing the build. `dynamic = 'error'` is the directive that fails
   loudly, which is literally what Req 1.9 ("prevent silent degradation") asks for.

## What's missing (add before this is considered done)

- **A `NODE_ENV` gate (or removal) of the `testId`/`X-Test-Id` path**, plus a sanitized
  catch-all in the route so no thrown error from `sendContactEmail` escapes as a 500.
- **Behavioral coverage for the validation-error and server-error UX branches** (Req 4.3,
  4.4) — the design's testing section should stop claiming Playwright "covers the meaningful
  wiring" until it drives the non-happy paths. The mock needs a way to force a 502/503
  (e.g. a `X-Mock-Status` request header or a `/__fail` toggle scoped by `testId`).
- **A JS-submit-stays-JS assertion** (§6).
- **A synchronous in-flight latch** for double-submit (§3/§4).
- **A note that the headshot *present* branch is untested** (`<Image>` rendering), and
  optionally `.max()` bounds on `location`/`availability`.
- **Documentation precision**: `vercel.json` provides no fetch-failure signal (all safety is
  the Velite transform guard); the 9s/10s budget is warm-path and a drop to ~8s would buy
  cold-path headroom.
- **Sync the design's class names to the implementation** (`min-h-44` textarea, the
  `"unknown"` server-error bucket not in Req 4.4) so design.md is not describing code that
  does not exist.

### Sound, moving on

- `execFileSync` + `--follow` git transform: correct, verified in `velite.config.ts`.
- Velite v0.3.1 `(data,{meta})` API and the empty-output transform guard: correct.
- `getResendClient()` sanity guard (test-key + prod base URL): present and correct in
  `mail.ts`.
- `Retry-After: 60` on 503 and the Vitest assertion of it: correct.
- Reduced-motion Playwright verification: landed (`contact-reduced-motion.test.ts`).
- `THEME_STORAGE_KEY` exported from the provider (value `"theme"`), and the provider's
  `value={{light,dark}}` mapping is consistent with the test setting `theme:'dark'`: correct.
- Honeypot `display:none` + silent-200 path: correct and e2e-tested (zero recorded calls).
- Non-string `testId` coercion is *blocked* by the route's `typeof === "string"` guard
  (only the CRLF-string case bites): credit.
- `attemptId`-keyed effect for same-kind transitions: correct, StrictMode impact is dev-only.
