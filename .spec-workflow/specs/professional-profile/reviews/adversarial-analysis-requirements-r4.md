# Adversarial Analysis — professional-profile Requirements (Round 4)

**Reviewer stance:** senior staff engineer with operational scars from Vercel-hosted Next.js, Resend deliverability, and Playwright CI. The spec is mature; this round attacks the second-order seams around CI mechanics, vendor semantics, and operational gates that the first three rounds did not pressure.

**Verdict up front:** the spec is close. Six **Novel** findings remain, all of which are one-or-two-clause additions; none require structural rework. Three **Recurring** findings have escalated severity because their remedy still isn't in the doc. The form handler hot path is closed.

---

## Findings by Dimension

### 1. CI test infrastructure under parallel execution

**Finding 1.1 — `globalSetup` env-var sequencing vs. `webServer` boot. (Novel)**

`e2e/playwright.config.ts:22-28` configures `webServer.command = "pnpm start --port ${PORT}"`. Per Playwright's lifecycle, `webServer` is started **before** `globalSetup` runs (Playwright awaits `webServer.url` reachability and only then invokes `globalSetup`). That means: if `globalSetup` is responsible for spawning the sidecar mock and exporting `RESEND_BASE_URL=http://127.0.0.1:<dynamic-port>`, the `pnpm start` child process has already been forked from a parent process whose `process.env.RESEND_BASE_URL` was unset (or was the default). Setting the env var on the parent after the child is forked **does not propagate**.

Concrete failure: route handler reads `process.env.RESEND_BASE_URL` at request time, gets `undefined` or `https://api.resend.com`, sends real mail (or 401s against real Resend) instead of hitting the mock. Smoke test asserts `mock received exactly two calls` → asserts `0 === 2` → flake on every run.

Remedy: requirements should mandate one of (a) start the mock and choose the port via a wrapper script that *precedes* both `webServer` and `globalSetup` and exports the env var into the shell that spawns Playwright; (b) set the port to a fixed value, refuse to run if the port is in use, and bake the env var into the test invocation command in CI. Either is one clause; neither is in the doc.

**Finding 1.2 — `fullyParallel: true` + `retries: 2` cross-contaminates the "exactly two calls" assertion. (Novel)**

`e2e/playwright.config.ts:8,10` confirm `fullyParallel: true` with `retries: 2 in CI`. Req 3.13 asserts the mock received "exactly two calls across the test run." Two failure modes that are not addressed:

1. If two test files (or two `test()` blocks in the same file) both submit the form, Playwright runs them in parallel workers. Both workers hit the same mock; the assertion `count === 2` either succeeds spuriously (if both workers submit once each, totaling 2) or fails (if one of them retries). The assertion is brittle to test count and worker count.
2. On flake → retry, the mock receives 3+ calls, and the assertion fails for an unrelated reason. Retries are how Playwright papers over genuine bot/network flakes; here, retries become assertion-killers.

Remedy: scope the assertion per-test, not "across the run." E.g., reset the mock's call counter at the start of each test (via a `beforeEach` that calls a `/reset` endpoint on the mock), and assert exactly *one* call per submission inside the test that issued it. The spec should require this explicitly; "exactly two calls across the test run" reads like a one-off invariant but in a parallel + retry world it's a flake generator.

**Finding 1.3 — Next.js dev/prod env-var caching. (Compounding on prior cold-start finding)**

In Next.js production (`pnpm start` per `playwright.config.ts:23`), `process.env` reads at request time work correctly for runtime route handlers. But if any code path imports the Resend client at module-init with the URL baked in (e.g., `const resend = new Resend(KEY, { baseUrl: process.env.RESEND_BASE_URL })` at module top level), the URL is captured **once** when the module is first loaded, not per request. The spec doesn't forbid module-level client construction. If the implementer writes the obvious `lib/mail.ts` pattern (singleton client at module top), `RESEND_BASE_URL` set after server boot is dead — even if Finding 1.1's sequencing problem is resolved.

Remedy: requirements should specify the Resend client is constructed **inside** the route handler (or via a getter that reads env at call time), not at module init.

---

### 2. Email subject contract

**Finding 2.1 — Subject string is wholly undefined; smoke test asserts on a contract that doesn't exist. (Novel)**

Req 3.13 asserts the mock-received payload has shape `{from, to, reply_to, subject, text}`. Nowhere in Reqs 1–6 or NFR is the **value** of `subject` defined. The test author and the route-handler implementer are forced to invent it independently. They will diverge on first PR and spend a review cycle reconciling.

Remedy: spec should name the literal subject string (e.g., `"Contact form submission from <source>"` where `<source>` is `'profile' | 'contact' | 'unspecified'`) OR forbid user-controlled values in the subject and let the implementer choose any constant.

**Finding 2.2 — If the implementer puts `name` in the subject, the CRLF closure of Req 3.6 re-opens. (Novel)**

The spec correctly identifies that `name` could contain embedded CRLF (zod's `.trim()` strips only leading/trailing whitespace) and closes that vector by setting `reply_to` to the bare email. Subjects per RFC 5322 §2.2 are headers. If the implementer writes:

```
subject: `Contact form: ${name}`
```

…and Resend's API does not sanitize CRLF in the `subject` field before constructing SMTP headers, `name: "Spammer\r\nBcc: attacker@example.com"` injects a Bcc header. The spec has not thought about subject-as-sink the way it thought about `reply_to`-as-sink.

Resend's HTTP API likely sanitizes; their server-side mail construction is unlikely to honor raw CRLF. But the spec shouldn't rely on vendor sanitization that wasn't verified — that's the same class of assumption it explicitly rejected for `reply_to`. Cheap remedy: require subject to contain only constants and zod-validated `source` (which is enum-bounded and CRLF-impossible), forbidding any direct interpolation of `name` or `email`.

---

### 3. Vendor-side semantics: Resend / DMARC / DKIM alignment

**Finding 3.1 — DMARC alignment mode unspecified; relaxed is the default and works, but nothing in the spec defends against `adkim=s` being added later. (Compounding)**

Req 3.6 enumerates SPF, DKIM, DMARC posture but doesn't name the alignment mode. DMARC default is **relaxed** (subdomain CNAME-based DKIM aligns to the parent domain), which is what makes Resend's `resend._domainkey.<subdomain>` setup work. If anyone — Matthew six months from now, or a security-hardening PR — adds `adkim=s` (strict) to the DMARC TXT record, mail starts bouncing because Resend's DKIM is signed for `resend._domainkey.matthew-field.ca` and strict alignment requires the d= tag to match the From: domain exactly.

Remedy: spec should explicitly note the relaxed-alignment requirement and add a "do not change" annotation to the DMARC clause. One sentence; prevents a self-inflicted future outage.

**Finding 3.2 — DNS verification has no automated gate. (Recurring, escalated)**

Memory acknowledges this as unresolved. The spec says "DNS verification is a launch prerequisite" but nothing enforces it. Concrete failure: Matthew launches, traffic arrives, all delivered mail goes to spam due to misconfigured DMARC, recruiters never hear back, Matthew sees no submissions in his inbox and assumes the site is just not getting traffic. This is the **#1 inbound-funnel-killer** and the spec depends on Matthew remembering to do a manual check.

Escalation: this should be a CI preflight. Concretely — a job that runs `dig +short TXT _dmarc.matthew-field.ca` and `dig +short CNAME resend._domainkey.matthew-field.ca` against a public resolver and fails the deploy if either record is absent or fails a regex check. This is ~20 lines of bash; the spec deferring it to a manual checklist is dramatically over-pricing the cost of automation against the cost of a silent funnel outage.

**Finding 3.3 — DMARC tightening reminder has no failure-mode mitigation. (Compounding)**

Req 3.6 makes the 14-day post-launch tightening Matthew's calendar duty and accepts "failure to tighten" as a residual risk. Concrete failure: Matthew misses the reminder, DMARC stays at `p=none` indefinitely, spoofed `From: matthew-field.ca` mail keeps reaching recipients (low-cost spoofing because there's no rejection signal), eventually some scammer abuses it to phish someone in Matthew's network → reputational damage and a spam-folder reputation cliff for the domain.

Spec accepts the residual; that's defensible. But the residual is mispriced — it's not just "DMARC stays permissive," it's "DMARC stays permissive *forever* unless Matthew manually intervenes." A dead-man's-switch option exists: a scheduled CI job (GitHub Actions monthly cron) that opens a GitHub issue on day 30 if `_dmarc.matthew-field.ca` still resolves to `p=none`. ~15 lines of YAML. Spec should at minimum acknowledge this option exists.

---

### 4. Cold-start budget math vs. Vercel Hobby 10s cap

**Finding 4.1 — Cold-start budget is tighter than the spec acknowledges. (Compounding)**

Memory flagged this. New evidence:

- Vercel Hobby cold start: ~200–500ms (slower than Pro by design).
- Node.js module init for Resend SDK + zod + Next.js route handler imports: ~100–200ms cold (V8 parse + module resolve).
- Sydney → US-East round-trip baseline: ~180–220ms RTT for the Resend HTTP call.
- JSON.parse on 32 KB body: ~5ms.
- Zod validation: <5ms.
- Response-flush + Retry-After header construction: ~50ms.

Cold-start total before the Resend call begins: 300–700ms. Resend timeout fires at 9s into the handler. So in the worst case, *wall-clock* time is cold-start + 9s = up to 9.7s. The 10s Vercel cap leaves ~300ms for the error-response path — not the 1s the spec advertises.

This is *probably* fine; 300ms is enough for a structured 503 + JSON body. But the spec's "9s/1s budget" is misleading. Either (a) cut the Resend timeout to 8s on cold-suspect requests (impossible to detect from the handler), (b) accept that the warm-path budget is 1s and cold-path is ~300ms, or (c) acknowledge Vercel may emit 504 on cold-start tail-latency requests, which Req 4.4 already handles. Option (c) is the cheapest; the spec should say so explicitly: "the 1s error budget assumes warm; cold-start invocations may exceed 10s wall-clock, in which case Vercel emits 504, which the client error path already handles."

---

### 5. Function-invocation budget DoS (distinct from Resend quota DoS)

**Finding 5.1 — Vercel Hobby's 100K invocations/month cap is the actual funnel-killer, not Resend's 100/day. (Novel)**

NFR Security acknowledges Resend's 100/day quota as a residual DoS. It misses Vercel's separate 100,000 function-invocations/month cap on Hobby tier. Critical asymmetry: Resend's quota only counts **successful sends**, but Vercel's cap counts **every invocation**, including ones rejected at zod, honeypot, origin check, or 32KB cap.

Concrete attacker scenario: a 1-req/sec bot spraying invalid payloads (rejected at the size cap) consumes 86,400 invocations/day = ~2.6M/month. That's 26× the Hobby cap. After ~28 hours of spray, Vercel throttles the project. The throttle returns 429 from the **platform layer**, before the route handler runs. Concretely:

- The handler doesn't execute, so no structured 503 JSON response is emitted.
- Req 4.4's client error handler doesn't recognize 429 (only 502/503/504 are listed).
- The user sees a Vercel-branded error page or a raw network-failure state.
- The Req 4.4 LinkedIn recovery CTA only renders if the form's submit handler receives a structured error response. Platform 429 may have no body or a Vercel-formatted body the client doesn't handle.

Worst part: this is a **month-long outage** triggered by 28 hours of cheap spray. Cost-to-attacker: trivial (any commodity bot). Cost-to-Matthew: total funnel outage for the rest of the calendar month, no email, no obvious failure signal in any dashboard he checks (Resend dashboard shows zero attempts because the function never runs).

Remedy options the spec should at least enumerate:
- Add 429 to Req 4.4's handled-error set (fixes the UX-degradation symptom but not the root cause).
- Vercel's edge firewall / WAF rate limit (~10 lines of Vercel config, available on Hobby for basic rate limits).
- Edge middleware doing in-memory rate limiting per-IP per-request-burst (cheap, blunt, doesn't require external state).

The spec's stance is currently "Resend quota DoS is acceptable; LinkedIn is the fallback." That stance assumed the failure mode was a slow degradation visible to clients. The function-invocation DoS is a faster failure with worse UX (no LinkedIn fallback CTA renders). The spec should either accept this consciously or acknowledge it explicitly.

---

### 6. Honeypot extraction on edge-case JSON bodies

**Finding 6.1 — `JSON.parse('null')` returns `null`; `null.url_secondary` throws TypeError → unhandled exception → 500. (Novel)**

Req 3.5(c) handles JSON parse failure → 400. Req 3.5(d) reads `parsed.url_secondary` "off the parsed object." There is no clause requiring `parsed` to be a plain object. Failure cases:

| Body | `JSON.parse` result | `parsed.url_secondary` | Outcome |
|---|---|---|---|
| `null` | `null` | **TypeError: Cannot read properties of null** | **Unhandled 500** |
| `[]` | `[]` (Array) | `undefined` | passes honeypot; zod `.object().strip()` rejects → 400 |
| `"string"` | `"string"` | `undefined` | passes honeypot; zod rejects → 400 |
| `42` | `42` | `undefined` | passes honeypot; zod rejects → 400 |
| `true` | `true` | `undefined` | passes honeypot; zod rejects → 400 |

The `null` case is a direct violation of Req 3.5(c)'s "the handler SHALL NOT throw or allow an unhandled exception." A bot can DoS-noise the function logs (and consume Hobby invocations — see Finding 5.1) by spraying `null` bodies; each one becomes a 500 in Vercel logs.

Remedy: one clause between (c) and (d): *"After JSON parse, the handler SHALL verify the parsed result is a non-null plain object (e.g., `typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)`). If not, respond HTTP 400 with `{ error: "Malformed request." }`."*

---

### 7. Preview-deploy semantics

**Finding 7.1 — Preview env-var split for `from`, `to`, and `RESEND_API_KEY` is not specified. (Compounding)**

Req 3.6 says preview/local "MAY use Resend's sandbox domain" and "from is env-driven," but doesn't say *how* the env split between Production / Preview / Development is configured on Vercel. Concrete failures the spec doesn't prevent:

- **Failure A:** The implementer adds a single `RESEND_API_KEY` env var scoped to "All Environments" (Vercel's default). Preview deploys use the production key. PR previews with valid `from` config send real email to Matthew's real inbox during QA — every preview deploy round-trip = real email. Annoying but not catastrophic.
- **Failure B:** Same setup, but a preview deploy gets shared externally (e.g., shown to a stakeholder). Stakeholder fills the form. Real email arrives in Matthew's inbox stamped with `source: undefined` (because the preview's source didn't match the prod enum… wait, both 'profile' and 'contact' are valid for previews too) — so the email looks indistinguishable from a real submission. Matthew thinks it's a recruiter; it's a stakeholder QA test.
- **Failure C:** Mock Resend in preview. NFR Security's CSP test says "matching production" CSP — fine. But the spec implies preview *deploys* (Vercel previews) use sandbox Resend, while preview *tests* (Playwright in CI) use the mock. Three Resend modes — production, sandbox, mock — and the spec only loosely enumerates which mode runs where. Nothing enforces it.

Remedy: requirements should specify the Vercel env-var scoping pattern: production scope holds prod `RESEND_API_KEY`/`from`/`to`/`RESEND_BASE_URL` (default `api.resend.com`); preview scope holds sandbox `RESEND_API_KEY` and `onboarding.resend.dev` `from`; development scope (or `.env.example`) documents `RESEND_BASE_URL=http://127.0.0.1:<port>` for the test mock. Three lines.

**Finding 7.2 — `metadataBase` hardcoded to production confuses preview-deploy review. (Compounding, prior memory)**

Memory flagged this. New angle: not just SEO confusion. If a stakeholder shares a preview URL and the recruiter clicks the canonical `<link>` (or a search result that learned the canonical), they land on production — which doesn't have the preview's content. For a *stakeholder review* workflow this is a footgun ("I shared the preview, why are they seeing the old content?"). The spec accepts this; it should at minimum surface it as a documented quirk in the README or a comment in `metadataBase` config so future-Matthew doesn't burn 30 minutes debugging it.

---

### 8. `source` enum extensibility and downstream coupling

**Finding 8.1 — Hardcoded `z.enum(['profile', 'contact'])` requires a code change for every future source. (Compounding)**

Memory acknowledged this. The spec's stance is implicitly "two sources is fine, YAGNI on extensibility." That's defensible. But the spec doesn't *say* it's defensible; it just hardcodes the enum without an annotation, and the next implementer who adds `<ContactForm source="landing">` (per a future spec for the landing-page hero) will get a silent normalize-to-`undefined` and only notice during QA when emails arrive without source attribution.

Argue both sides:

- **Pro hardcoded enum**: bounded, type-checked, secure-by-construction, makes the test contract trivial.
- **Con hardcoded enum**: every new contact-form callsite is a coupled code change to `/api/contact`. The route becomes a centralized chokepoint for what should be a broadcast-pattern field.

Cheap fix that preserves safety: `z.string().regex(/^[a-z]+$/).max(20).optional().catch(undefined)`. Same length-bounded, char-bounded, CRLF-impossible, but generalized. Trades a closed enum for an open vocabulary with the same security envelope.

Or — minimum viable fix — keep the enum and add one sentence: "Adding a new submission source SHALL update both this enum and the smoke test's per-source assertions; failure to update results in silent normalize-to-`undefined`." Names the lock-in for the next implementer.

---

### 9. Headshot responsive layout undefined

**Finding 9.1 — Req 1.5 "fixed position adjacent to the headline" is ambiguous on three axes. (Compounding)**

Three interpretations of "fixed position adjacent":

1. CSS `position: fixed` (anchored to viewport) — almost certainly not the intent, but technically what "fixed" means in CSS.
2. Fixed location in DOM, side-by-side with headline at all breakpoints.
3. Fixed location in DOM, stacked above headline on mobile, side-by-side on desktop.

The spec's NFR Usability says "name and email fields render side-by-side at `sm:` breakpoint" — establishing the precedent that the spec is willing to name breakpoints. Yet for headshot it says only "adjacent."

Concrete tasks-phase failure: implementer chooses interpretation (3), reviewer expected (2), PR cycles through 2–3 design rounds. On a CV page the headshot layout *is* the design — small ambiguity = large rework.

Remedy: one breakpoint line. e.g., "stacked vertically below `sm:`, headshot to the left of headline at `md:` and above, headshot ~96–128px square." Or explicitly: "Headshot layout deferred to Design; this spec guarantees only the data plumbing." Either is fine; the spec should make a choice.

---

### 10. Layout shift on email reveal (horizontal)

**Finding 10.1 — `react-obfuscate` reveal swaps text width on click; horizontal CLS not addressed. (Compounding)**

NFR Performance reserves vertical space. Horizontal reservation is not mentioned. `react-obfuscate` typical pre-click value is the reversed-string `ac.dleif-wehttam@olleh` (~22 chars); revealed value is `mailto:hello@matthew-field.ca` rendered as `hello@matthew-field.ca` (~22 chars). Counts roughly the same — so width swap is small in this specific case. Not a critical finding; partially mitigates itself.

But: if Matthew renames the alias to a different length (e.g., `m@matthew-field.ca` post-launch), the reveal will swap to a wider/narrower string and shift surrounding inline content. On mobile narrow viewports this can shift the SocialLinks component a few pixels at click-time.

Web Vitals excludes user-input shifts within 500ms from CLS — Lighthouse won't flag it. But the user-perceived experience is jarring.

Remedy: spec should require `min-width` on the wrapper sized to the longer of the two strings, OR explicitly accept horizontal shift as out-of-scope. One sentence either way. Lower priority than Findings 1, 5, 6.

---

### 11. `role="status"` placement vs. axe `region` rule

**Finding 11.1 — axe-core's `region` rule may flag a status region depending on where it mounts. (Compounding)**

Req 4.10 runs axe with default WCAG 2.1 AA, which includes `region` (all content within landmarks). The success and server-error status regions (Req 4.1, Req 4.4) live "inside `role="status"`" — but the spec doesn't say where the `role="status"` mounts in the DOM.

Three placements:

1. Inside the `<form>`, replacing or adjacent to it on success → form is inside `<main>` (Next.js convention) → axe is fine.
2. At the page level, sibling to the form, conditionally rendered when state is "submitted" → also inside `<main>` if the page wraps content in `<main>` → fine.
3. Global toast-style at the root layout, outside any landmark → axe flags it.

The spec is silent. If the implementer reaches for a global toast pattern (intuitive default for "success message"), Req 4.10's axe pass fails — for a structural reason that has nothing to do with the form's correctness.

Remedy: spec should require status regions to live inside `<main>` (or inside the form's containing landmark). One sentence.

---

### 12. "Sanitized log line" definition gap (Req 3.5b)

**Finding 12.1 — "Sanitized" is undefined; Vercel's 1-day log retention turns this into an unbounded persistence channel. (Recurring, escalated)**

Memory flagged this. Escalation: imagine the spec ships and the implementer logs `console.log("origin_absent_referer_absent path=/api/contact ip=" + req.headers.get('x-forwarded-for'))`. That's the obvious thing to do. Now:

- Vercel Function Logs retain captured output for ~1 day on Hobby.
- The IP is captured for every request that has both Origin and Referer absent — i.e., every legitimate Lockdown-Mode Safari user, every privacy-browser user, plus a stream of bots that strip headers.
- IP collection becomes an undisclosed practice that contradicts Req 3.9's "no persistence of form data" *intent* even though it's technically not form data.
- For an EU recruiter, this is a GDPR-adjacent concern (IP is personal data under GDPR Article 4). The spec is silent → the implementer chooses → the implementation diverges from intent.

Remedy: spec should name what the log line contains *exactly*. e.g., a single immutable string `"contact_origin_referer_absent_allow"` and nothing else. No IP, no UA, no path (Vercel logs the path implicitly), no form fields. Even simpler: drop the log line entirely (the metric of interest — "how often does this fallback fire" — is observable from request count vs. body-validation success count downstream).

---

### 13. content/profile.mdx as a CI prerequisite

**Finding 13.1 — Order-of-operations between Velite schema and content file is unspecified. (Recurring)**

Memory flagged. The smoke test (Req 3.13) renders `/profile`, which requires `content/profile.mdx`. Req 1.2 fails the build if the file is missing. Req 1.4's git transform fails the build if the file's commit history is empty.

If implementation lands the schema in commit A and the content file in commit B, every CI run between A and B is broken. If the file lands first (commit A), Velite ignores it (no schema yet) — that build succeeds but no `profile` collection exists. If schema lands first (commit A), build fails until B.

The spec defers this to Tasks-phase by silence. Two defensible choices:

1. Add a one-line clause: "Implementation SHALL land the new Velite collection schema and `content/profile.mdx` in the same commit, or stage the content file first followed by the schema."
2. Explicitly defer: "Order-of-operations is owned by Tasks; implementer SHALL ensure CI is green between commits."

Pick one. Right now the spec is ambiguous and Tasks will inherit a discoverable-only-via-CI-failure ordering constraint.

---

### Bonus finding (not in the analysis dimensions but surfaced during repo grounding)

**Finding B.1 — `form-action 'self'` directive may not be exercised by the smoke test. (Novel)**

NFR Security says the Playwright CSP test "ALSO submits the form to the mock Resend server (Req 3.13's sidecar) so that `form-action` is exercised, not just `script-src`." Grounding this against Req 3.4: "the client SHALL POST the payload as JSON to a Next.js route handler." That's a `fetch()` call, which goes through CSP `connect-src` — **not** `form-action`. CSP `form-action` only governs native `<form>` submissions where the browser handles navigation (no preventDefault, action attribute on form, etc.).

If the form is `<form onSubmit={handler}>` where `handler` does `e.preventDefault()` + `fetch()` (the canonical React pattern), the browser never evaluates `form-action`. The smoke test exercises `connect-src 'self'` (which already covers same-origin POST), not `form-action`.

The defense-in-depth value of `form-action 'self'` is real — it catches a future regression where someone removes the JS handler or changes to native form submission. But the spec's claim that the smoke test exercises it is wrong as stated.

Remedy: either (a) downgrade the spec language to "form-action is *declared*; future regressions to native form submission are protected by it; the smoke test does not actively exercise this directive in the JS-submit path"; or (b) add a second test variant that nulls out the JS handler and asserts native submission targets only `'self'`. (a) is the honest minimum.

---

## Closing Deliverables

### Top 5 Risks / Gaps (ranked by inbound-funnel impact)

1. **Function-invocation budget DoS** (Finding 5.1, Novel). NFR Security. Concrete failure: 28-hour spray of invalid bodies exhausts the 100K/month Hobby invocation cap; funnel goes dark for the rest of the month with no Req-4.4 LinkedIn CTA rendered (Vercel platform 429 fires before the handler). **Minimum remedy:** add 429 to Req 4.4's handled-error set so at least the user-facing degraded UI activates; ideally add edge-level rate limiting via Vercel firewall config (one short clause naming the mitigation, even if it's a follow-up).
2. **DNS verification has no automated gate** (Finding 3.2, Recurring escalated). Req 3.6. Concrete failure: launches with broken DKIM/SPF, all delivered mail goes to spam, recruiters never hear back, Matthew sees no submissions and assumes low traffic. **Minimum remedy:** require a CI preflight job (`dig` against `_dmarc` and `resend._domainkey` records) that fails the production deploy if DNS isn't set up correctly; ~20 lines of bash, swapping a 6-month silent funnel outage for a noisy CI red.
3. **Honeypot extraction on `null` body throws unhandled 500** (Finding 6.1, Novel). Req 3.5(c)/(d). Concrete failure: any bot spraying `JSON.parse('null')`-bodied requests creates a stream of unhandled 500s in Vercel logs — directly contradicts Req 3.5(c) and burns invocation budget without triggering any 4xx-bot signal. **Minimum remedy:** insert one clause between (c) and (d): "After JSON parse, the handler SHALL verify `parsed` is a non-null plain object (else 400)."
4. **Email subject contract undefined; CRLF re-opens if `name` is interpolated** (Findings 2.1 + 2.2, Novel). Req 3.6/3.13. Concrete failure: implementer puts `name` in subject for "context"; CRLF in `name` injects headers (vendor sanitization assumed but not required by spec — the same assumption the spec rejected for `reply_to`). **Minimum remedy:** name the literal subject string in the spec, restricted to constants and the validated `source` enum; explicitly forbid interpolation of `name`/`email`/`message`.
5. **Playwright env-var sequencing + parallel-worker mock cross-contamination** (Findings 1.1 + 1.2, Novel). Req 3.13. Concrete failure: smoke test flakes on every CI run because (a) `globalSetup` exports `RESEND_BASE_URL` *after* `webServer` boots, so the Next server doesn't see it; (b) "exactly two calls across the test run" is asserted on a global counter that Playwright's parallel workers + retries inflate. **Minimum remedy:** require port allocation + env-var export to happen in a wrapper script that precedes both `webServer` and `globalSetup`; scope the call-count assertion to per-test, not per-run.

### Top 3 Conclusions to Challenge or Reverse

1. **"Origin/Referer absent → allow with sanitized log line" (Req 3.5b)** is hiding a Vercel-log-persistence channel. The "sanitized" qualifier is undefined; the implementer's natural choice (log the IP) violates Req 3.9's no-persistence intent and creates GDPR-adjacent data collection. **Reverse position:** drop the log line entirely. The signal of interest ("how often does this fallback fire") is reconstructable from request counters; the cost of leaving a vague log clause in the spec is an unbounded persistence channel.
2. **"Hardcoded `z.enum(['profile', 'contact'])` is the safer default" (Req 5.5)** is true on the security axis but ignores the coupling cost: every future contact-form callsite requires a code change to `/api/contact`. Spec doesn't acknowledge this lock-in. **Reverse position:** `z.string().regex(/^[a-z]+$/).max(20).optional().catch(undefined)` — equivalent length/charset bounds, CRLF-impossible, no per-source code change. Or, if keeping the enum, add a single sentence naming the lock-in for future implementers.
3. **"`form-action 'self'` is exercised by the smoke test" (NFR Security)** is wrong as stated. The form submits via `fetch()` after `preventDefault()`; CSP `form-action` only evaluates on native form-navigation submissions; the smoke test exercises `connect-src`, not `form-action`. **Reverse position:** downgrade the language to "declared as defense-in-depth against a future regression to native form submission; not actively exercised by the JS-submit smoke test." Honesty about what the test covers prevents false confidence.

### What's Missing — grouped by remedy category

**CI infrastructure**
- Per-worker mock isolation strategy (port allocation, env-var sequencing relative to `webServer` boot, retry semantics for the call-count assertion) — Finding 1.1, 1.2.
- DNS verification preflight CI step (or explicit acknowledgement that it remains a manual launch checklist) — Finding 3.2.
- Resend client construction inside the route handler, not at module top — Finding 1.3.

**Vendor semantics**
- Email subject literal value (or rule that forbids user-controlled values in subject) — Findings 2.1, 2.2.
- DMARC alignment mode named explicitly (relaxed) with "do not change" annotation — Finding 3.1.
- Resend SDK module-import cold-start cost noted in budget math, OR cold-path acknowledgement that 504 (already handled by Req 4.4) covers cold-start tail-latency — Finding 4.1.
- Vercel env-var scoping pattern (production / preview / development split for `RESEND_API_KEY`, `from`, `to`, `RESEND_BASE_URL`) — Finding 7.1.

**Edge-case input handling**
- "Parsed body MUST be a non-null plain object" clause before honeypot extraction — Finding 6.1.
- CSP `form-action` smoke-test claim downgraded to honest scope — Finding B.1.

**Operational mitigations**
- Function-invocation DoS acknowledgement and at-minimum 429 in Req 4.4's handled-error set — Finding 5.1.
- Optional dead-man's-switch idea for DMARC tightening reminder (GitHub Actions monthly cron) — Finding 3.3.
- Optional fallback for `siteConfig.links.email` plaintext in source — already accepted; no action.

**Definitions and contracts**
- "Sanitized log line" enumeration: route + outcome only, no IP/UA/fields — Finding 12.1.
- Headshot responsive layout: breakpoint contract OR explicit "deferred to Design" — Finding 9.1.
- `role="status"` mounting position constraint (must be inside `<main>`) — Finding 11.1.
- Horizontal layout shift on email reveal: `min-width` on wrapper OR explicit out-of-scope — Finding 10.1.

**Order-of-operations**
- Velite schema and `content/profile.mdx` landing in same commit (or explicit Tasks-phase deferral) — Finding 13.1.

### Classification tally

**6 Novel, 7 Compounding, 3 Recurring (plus 1 Novel bonus = 7 Novel, 7 Compounding, 3 Recurring — 17 findings total).**

The remaining attackable surface lives in **operational mitigation patterns** (CI gates for DNS, function-invocation rate limiting) and **definition gaps** (subject string, sanitized log line content, headshot layout, status-region placement). The form-handler hot path — JSON parsing, honeypot, zod, header injection, CSP, source normalization, build-time content pipeline, force-static directive — is closed; round 5 (if any) should focus on the operational/CI surface above, not on the request lifecycle.

The spec is one consolidated edit pass away from being shippable. Most of these findings are one-clause additions; none require structural rework. The two findings that genuinely warrant a design conversation rather than a one-line edit are **5.1 (function-invocation DoS)** and **3.2 (DNS verification CI gate)** — both because their remedy is "add a CI/edge mechanism" rather than "tighten a clause."
