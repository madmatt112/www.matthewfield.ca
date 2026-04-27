# Adversarial Review Memory — professional-profile Requirements
Last updated: 2026-04-25 (after v3 review)

## Cumulative Findings Summary

### Accepted (addressed in current requirements.md)

**From v1 — Contact form hardening**
- Honeypot hiding technique mandated (`display: none` + `tabindex="-1"` + `aria-hidden="true"` + `autocomplete="off"`); off-screen positioning forbidden (Req 3.2). (v1)
- Field length caps: `name` 1–100, `email` ≤254, `message` 10–5000 (Req 3.5e). (v1)
- Request body size cap → HTTP 413 before validation (v1: 16 KB → Req 3.5a; v2 raised to 32 KB). (v1→v2)
- Origin/Referer header check → HTTP 403 (Req 3.5b). (v1)
- `reply-to` attacker-controlled risk acknowledged (Req 3.12). (v1)

**From v1 — MDX content schema**
- Frontmatter requires `headline`, `location`, `availability`; optional `headshot` (Req 1.3). (v1)
- `max-w-5xl` (1024px) layout width (Req 1.8). (v1)
- MDX build-fail classes enumerated (Req 1.12). (v1)
- Heading anchors via rehype-slug for deep linking (Req 1.11). (v1)

**From v1 — Progressive enhancement**
- No-JS claim dropped (Req 3.4); no-JS fallback is LinkedIn/GitHub/email server-rendered (Req 2.1). (v1)
- react-obfuscate CSP compliance verified by Playwright (NFR Security). (v1)

**From v1 — Accessibility**
- Req 4.1 success: `<h2>` with `tabindex="-1"` inside `role="status"`, scroll-into-view, visible focus ring. (v1)
- `aria-required` forbidden on native required inputs (Req 4.7). (v1)
- Mobile tap target 44×44 CSS px (Req 4.11). (v1)

**From v1 — Component composition**
- Three sibling components in `src/components/shared/`, no `<ContactSection>` wrapper, layout-agnostic (Req 5.3). (v1)
- `src/config/site.ts` single source for LinkedIn/GitHub/email via `links` object (Req 2.7). (v1)

**From v1 — Integration & error handling**
- HTTP 502 on Resend 4xx/5xx (Req 3.7); HTTP 503 + `Retry-After: 60` on Resend timeout (Req 3.8). (v1)
- Client "Try again" button, no auto-retry (Req 4.4). (v1)
- `/profile` vs `/about` SEO disambiguation (Req 6). (v1)

**From v2 — Testability**
- Playwright Resend mock via env-configurable `RESEND_BASE_URL` pointing at a sidecar mock server (Req 3.13; NFR Security). (v2)
- CSP test: `page.addInitScript` to install violation listener before hydration; two passes (report-only + enforcing) (NFR Security). (v2)
- axe runs default WCAG 2.1 AA ruleset (not just `color-contrast`) on both light and dark themes on `/profile` and `/contact` (Req 4.10). (v2)
- Lighthouse via `@lhci/cli` as non-blocking CI job posting scores as a PR comment (NFR Performance). (v2)

**From v2 — Editorial vs anchors / SEO**
- Req 1.11 now explicitly states "deep-link *targets* are the author's responsibility; the spec guarantees the *mechanism*, not specific anchors." (v2)
- Req 6.1 acknowledges `description` is minimum disambiguation; structural differentiation is authorial. (v2)

**From v2 — Bot defense**
- Req 3.3 explicitly forbids client-stamped timing heuristic ("rejected because trivially bypassable + autofill silent-drop trap"). (v2)
- Honeypot name constrained to `url_secondary` (Req 3.2). (v2)
- Origin/Referer absence policy specified: Origin present → check; absent → fall back to Referer; both absent → log + allow (Req 3.5b). (v2)

**From v2 — Resend / deliverability**
- Production `from` MUST be at a verified custom domain with SPF/DKIM/DMARC enumerated; sandbox allowed only for preview/dev (Req 3.6). (v2)
- Resend timeout cut from 10s to 9s to preserve ~1s error-path budget inside Vercel 10s cap (Req 3.8). (v2)
- 504 added to client-side handled error set (Req 4.4). (v2)
- Req 3.10 enumerates logging discipline: no form fields in `console.*` / thrown errors; sanitized error codes only. (v2)
- Req 4.4 mandates inline LinkedIn recovery CTA in degraded-mode UX (not just "Try again"). (v2)

**From v2 — UTF-8 / i18n**
- Body size cap raised to 32 KB with structured JSON body on 413 (Req 3.5a). (v2)
- zod `.email()` IDN limitation explicitly acknowledged and deferred with LinkedIn/email fallback (Req 3.5e). (v2)

**From v2 — Velite / freshness**
- `updatedAt` now git-derived at build time via `git log -1 --format=%cI content/profile.mdx` — removes human-error class (Req 1.4). (v2)
- New top-level `profile` collection with `pattern: "profile.mdx"`, `single: true`, at `content/profile.mdx`; `pages` collection unchanged (Req 1.2). (v2)
- `headshot` typed as `s.image()` with relative path; rendered by page shell near headline (Req 1.3, Req 1.5). (v2)
- `resumePdf` field removed. (v2)

**From v2 — A11y**
- Req 4.8 now scopes Enter-submits-from-input behavior correctly; textarea inserts newline per native behavior. (v2)
- Req 4.3 now per-field `aria-live="polite"` + top-level `role="alert"` (not per-field alert). (v2)
- Req 4.2 scroll-into-view honors `prefers-reduced-motion`. (v2)
- Req 4.4 specifies focus moves to status region on server error. (v2)
- Req 4.6 loading indicator honors `prefers-reduced-motion`. (v2)

**From v2 — Mobile / cross-req**
- Form-field stacking breakpoint named (`sm:` = 640px) (NFR Usability). (v2)
- `<ObfuscatedEmail />` wrapper must enforce `min-height: 44px` + padding + flex to guarantee 44×44 tap target (Req 2.3). (v2)
- Req 6.2 canonical set via `metadata.alternates.canonical = '/profile'` (Next.js resolves to absolute via `metadataBase`). (v2)
- Req 6.3 Playwright assertion that rendered `<link rel="canonical">` is absolute. (v2)
- `siteConfig.links.email` plaintext exposure acknowledged; defense is mail-provider per-address filtering (Req 2.8). (v2)

**From v3 — Build-time environment**
- Shallow-clone remedy: `vercel.json` `buildCommand` (or pre-build hook) SHALL invoke `git fetch --deepen=1000` / `git fetch --unshallow` before `velite build`; transform fails with named error on empty `git log` output (Req 1.4 sub-bullets). (v3)
- Local-build-with-uncommitted-edits quirk acknowledged (Req 1.4). (v3)
- `export const dynamic = 'force-static'` mandated on BOTH `/profile/page.tsx` AND `/contact/page.tsx` to prevent silent dynamic-rendering degradation (Req 1.9). (v3)
- Velite `single: true` missing-source-file path: build SHALL fail with named error, not emit `undefined` (Req 1.2). (v3)

**From v3 — `source` field hardening**
- `source` server-side normalized via `z.enum(['profile', 'contact']).optional().catch(undefined)` AFTER body schema, BEFORE email construction (Req 3.5g, Req 5.5). (v3)
- Req 3.10 logging discipline explicitly extended to cover `source` (no `source` in console / errors). (v3)
- All user-influenced fields (`name`, `email`, `message`, `source`) SHALL go to Resend's `text` parameter only — never `html` (Req 3.6). (v3)

**From v3 — Header injection**
- `reply_to` SHALL be set to the submitter's bare email address only — no display-name wrapper. Eliminates `name` CRLF injection vector at the source (Req 3.6). (v3)

**From v3 — Honeypot / control flow**
- Req 3.5 preamble names the order: raw body → size cap → JSON parse (with 400 on parse failure) → honeypot check on parsed object → zod with `.strip()` on `{name, email, message}` sub-object → source normalization. (v3)
- zod schema explicitly REQUIRED to use `.strip()` so `url_secondary` and `source` don't cause validation failure (Req 3.5e). (v3)
- JSON parse failure → 400 with structured body, never unhandled exception → 500 (Req 3.5c). (v3)

**From v3 — MDX component scope**
- Req 1.13 explicitly states profile MDX has NO custom component registry at launch; capitalized-tag references would `ReferenceError` and Req 1.12(c)/(d) catches it as a build failure. Matthew SHALL author plain-markdown-equivalent MDX. (v3)

**From v3 — CSP**
- `form-action 'self'` SHALL be added to production CSP in `next.config.ts` as part of THIS spec (closes CSP-Level-3 inheritance gap) (NFR Security). (v3)
- Playwright CSP test extended: under enforcing-CSP pass, ALSO submits the form to mock Resend so `form-action` is exercised (NFR Security). (v3)

**From v3 — A11y**
- `<ObfuscatedEmail />` wrapper SHALL carry an `aria-label` (e.g., "Reveal Matthew's email address") so SR users encounter a meaningful accessible name independent of the obfuscated visible text (Req 2.4). (v3)

**From v3 — Smoke test coverage**
- Req 3.13 now requires the smoke test to exercise BOTH `/profile` AND `/contact`, asserting the mock Resend received `source: 'profile'` and `source: 'contact'` respectively + payload shape (`from`, `to`, `reply_to`, `subject`, `text`). (v3)

**From v3 — Operational risk acknowledgements**
- DMARC tightening explicitly recast as Matthew's calendar-bound operational duty (14-day post-launch review), not a CI gate; failure-to-tighten is a named residual launch risk (Req 3.6). (v3)
- Resend SDK SHALL be instantiated without debug/verbose logging; if a future SDK version adds non-disableable logging, the handler SHALL wrap to suppress stdout/stderr (Req 3.10). (v3)

### Partially Accepted

- **Resend 100/day quota DoS**: v1 raised; v2 escalated the no-monitoring angle. Req 4.4 includes inline LinkedIn CTA on 502/503/504 (addressing "user doesn't know to use fallback"). No alerting/heartbeat/degraded-mode monitoring added. User's stance: funnel downtime is acceptable; LinkedIn is always the primary fallback; error UX now signals it explicitly.
- **Observability**: Client-side `contact_submit_success` event reserved for future analytics spec; server-side logging, Resend webhook handlers, delivery heartbeats still out of scope.

### Rejected (not to re-litigate without a novel angle)

- Required MDX body sections (e.g., `## Experience` / `## Skills`) — Req 1.6 explicitly editorial discretion.
- Content-negotiation POST-redirect for no-JS — Option B (drop no-JS claim) chosen.
- CAPTCHA / Turnstile / hCaptcha — still not referenced; implicitly rejected.
- Resend sandbox e2e nightly test — Req 3.13 explicitly defers sandbox/live Resend testing.
- Drop Resend timeout to 8s (v3 §8) — explicitly weighed against Resend tail-latency and kept at 9s.

### Unresolved / not yet probed

- **Playwright sidecar mock concurrency**: parallel test workers each spawning a mock Resend server — port allocation strategy still undefined. The "mock received exactly two calls" assertion presumes serialized execution or per-worker mock isolation, neither stated.
- **Email subject construction**: Req 3.13's smoke test asserts payload shape including `subject`, but no requirement defines what the subject string looks like. The test contract is shaped without a spec contract for the value.
- **`metadataBase` on preview deploys**: Req 6.3 asserts `<link rel="canonical">` is absolute starting with `https://matthew-field.ca/`, but preview deploys live at `*.vercel.app` URLs — the canonical will point to production from preview pages. Test passes; recruiters Googling a preview URL get redirected via SEO to production. Probably fine; not addressed.
- **`source` enum extensibility**: hardcoded `['profile', 'contact']` will require a code change to add a future source (e.g., `'landing'` widget on the landing page). Tradeoff worth surfacing; current design treats this as fine.
- **Cold-start budget math vs. 9s Resend timeout**: cold starts on Vercel Hobby add ~200–500ms before any handler code runs. Combined with body parsing, zod validation, header checks, the actual response-flush budget is closer to 700ms than 1s on cold starts.
- **`role="status"` placement vs. axe `region` rule**: the success `<h2>` lives inside `role="status"`; axe's default ruleset includes `region` (all content in landmarks). If the `role="status"` is mounted outside `<main>`, axe may flag it. Not specified.
- **Headshot responsive layout**: Req 1.5 says "adjacent to the headline" but doesn't name desktop-vs-mobile behavior (stack? sidebar?). Deferred to Design but worth flagging as an unstated assumption.
- **Vercel Hobby function invocation budget (100K/month)**: a low-and-slow valid-looking spam pattern could exhaust function invocations even with Resend's 100/day cap intact. Not addressed.
- **Layout shift on email reveal**: react-obfuscate swaps content width on click; NFR Performance addresses vertical reservation only. Horizontal width shift not specified.
- **DKIM alignment with Resend**: DMARC requires DKIM domain alignment with the `From:` domain. Resend signs with their own key on a CNAME pointing into your domain; alignment is "relaxed" by default. Not explicitly verified in the spec for `from: hello@matthew-field.ca`.
- **Honeypot extraction on malformed-but-parseable JSON**: spec says "Read `parsed.url_secondary` off the parsed object". If the body is `null`, `[]`, `"string"`, or a number, `parsed.url_secondary` either throws (null) or returns undefined (array/string/number). Spec doesn't enumerate these.
- **"Sanitized log line" definition**: Req 3.5b mentions "single sanitized log line" when both Origin and Referer are absent. "Sanitized" is undefined. Logging IP would conflict with Req 3.9's no-persistence claim (Vercel logs persist 1 day on Hobby).
- **DNS verification as launch gate**: Req 3.6 says "DNS verification is a launch prerequisite". No CI gate or merge block enforces this — manual checkbox.
- **content/profile.mdx prerequisite for CI**: the smoke test (Req 3.13) targets `/profile` which requires `content/profile.mdx` to exist or the build/route fails. If implementation lands the schema before the file (or a CI run happens against an interim commit), the test fails for an unrelated reason. Order-of-operations risk.

## Patterns & Themes

- **r3 was nearly fully accepted.** All 12 r3 findings led to concrete spec amendments. The doc is now mature; Round 4 should focus on second-order seams and operational friction, not re-attack the form-handler hot path.
- **Implementation-wiring assumptions are now mostly closed.** What remains is operational/CI-mechanics surface: parallel test isolation, preview-deploy semantics, cold-start budget math, DNS verification as a non-CI gate.
- **The `source` field is now well-protected on the server.** Any further `source`-related finding must show a path BYPASSING zod normalization or attacking through a side-channel (e.g., logging).
- **Build-time and static-gen edge cases were comprehensively addressed in r3.** Re-attacking shallow-clone, force-static, or Velite single-mode failure modes requires a concretely new failure path.
- **The CSP/CSP-test surface is closed.** `form-action` directive added, test extended. New CSP findings need to attack a different directive or a non-form CSP path.

## Guidance for Next Review

**Primary focus (novel or under-probed territory):**

1. **Playwright sidecar mock concurrency.** Req 3.13 mandates `RESEND_BASE_URL=http://127.0.0.1:<port>` and "the mock received exactly two calls". With Playwright's default parallel workers, multiple test files (or repeated runs) racing one mock server cross-contaminate. Port allocation strategy, per-worker mock isolation, and the "exactly two" assertion need specification.
2. **Email subject contract.** Req 3.13 asserts `subject` shape but no requirement defines the subject text. Test author has to invent. What does `subject` look like? Does it include `source`, `name`, both, neither?
3. **Cold-start budget math.** Spec's 9s/1s budget assumes warm function. Vercel Hobby cold start ~200–500ms BEFORE handler runs. Combined with JSON parse on 32 KB body + zod + headers, the actual response-flush budget shrinks. Worth a sanity check or one acknowledgement clause.
4. **Preview-deploy canonical confusion.** Req 6.3 asserts canonical starts with `https://matthew-field.ca/`. Test passes on preview deploys *because* `metadataBase` is hardcoded to production. So the canonical link on a preview deploy points to production — confusing for QA, fine for SEO. Worth surfacing as a note.
5. **Vercel function-invocation budget DoS.** 100K invocations/month on Hobby. A low-rate valid-looking spam pattern exhausts function invocations long before Resend's 100/day. Spec acknowledges Resend quota DoS; doesn't acknowledge function-invocation DoS.
6. **Honeypot extraction on edge-case JSON bodies.** `JSON.parse('null')` returns `null`. `parsed.url_secondary` on `null` throws. Same for arrays / strings / numbers. Spec enumerates "JSON parse failure" but not "JSON parses to non-object". One-line robustness clause likely warranted.
7. **DKIM alignment with Resend's CNAME-based signing.** DMARC enforces DKIM/SPF alignment to the `From:` domain. Resend's CNAME-based DKIM works in relaxed alignment mode by default; spec says SPF/DKIM/DMARC must be configured but doesn't name alignment mode. If Matthew (or someone reading the spec) configures strict alignment, mail bounces.
8. **`source` enum extensibility.** Hardcoded `['profile', 'contact']` requires code changes for future sources (landing-page widget, blog post inline, etc.). Worth surfacing the implicit "every new source needs a code change" — current design is fine for two sources, brittle for ten.
9. **Headshot responsive layout undefined.** Req 1.5 says "adjacent to the headline" without naming mobile-vs-desktop behavior. Implementation defers to Design without a stated breakpoint or stack/sidebar contract.
10. **Layout shift on email reveal (horizontal).** NFR Performance reserves vertical space; react-obfuscate swaps content width on click. CLS impact possible on narrow viewports.
11. **`role="status"` placement vs axe `region` rule.** Default axe rules include `region` (all content within landmarks). Where the success `role="status"` mounts (inside `<main>` vs outside) determines whether axe flags it. Not specified.
12. **DNS verification as a non-CI launch gate.** Req 3.6 says "launch prerequisite" but nothing in CI verifies SPF/DKIM/DMARC resolve. Manual checkbox; risk of shipping with stub DNS.
13. **content/profile.mdx prerequisite for CI smoke test.** The smoke test requires `/profile` to render. `/profile` requires `content/profile.mdx`. If implementation lands schema first, CI breaks; if file lands first, schema doesn't exist. Order-of-operations not addressed in the spec (acceptable to call out as a Tasks-phase concern, but worth surfacing).
14. **"Sanitized log line" definition (Req 3.5b).** What does "sanitized" cover? IP? UA? Referer value? Without definition, this clause is the seam through which Req 3.9's no-persistence promise leaks.

**Secondary focus (compounding):**
- Resend quota DoS — only re-raise if a NEW scenario (e.g., function-invocation DoS as distinct from email DoS) shows additional unaddressed impact.
- DMARC tightening — only if the calendar-reminder mechanism shows a new failure mode (e.g., what if Matthew misses the reminder? Acceptable per Req 3.6, but worth a CI-side mitigation idea).

**Areas well-covered (down-prioritize unless a genuinely novel angle):**
- Honeypot mechanics, control flow, zod `.strip()`
- `source` field validation
- CRLF in `name` (closed via bare-email `reply_to`)
- Force-static directive on both routes
- Velite single-mode missing file
- Shallow-clone unshallow step
- MDX component scope
- form-action CSP directive + test
- aria-label on obfuscated email
- Smoke test on both routes
- Resend SDK no-debug clause
- DMARC operational duty
- Field length caps, 32 KB body cap
- react-obfuscate CSP test mechanics
- Component composition / layout-agnostic pattern
- `aria-required` / native `required`
- 44×44 tap target size
- `updatedAt` freshness mechanism
- Sandbox-vs-prod sender domain
- Timing-heuristic removal

**Recurring with escalated severity (only with a genuinely new angle):**
- Resend quota DoS — only with a path bypassing the inline LinkedIn CTA
- No CAPTCHA — only if a concrete bot-scenario shows the layered defenses (honeypot + origin + zod + 32 KB cap + 100/day quota) demonstrably fail at low cost-to-attacker

**For each finding, require classification:**
- **Novel** — not identified in v1, v2, or v3
- **Compounding** — builds on or deepens a prior finding
- **Recurring** — same issue identified before but not yet resolved; escalated severity with a new angle
