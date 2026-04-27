# Adversarial Review — professional-profile Requirements (Round 3)

You are a senior staff engineer with deep experience in: operating a Vercel-hosted Next.js App Router application in production, shipping Velite content pipelines, running Playwright CI against non-trivial route handlers, Resend / SMTP / DMARC deliverability, and accessibility review of click-to-reveal and form-feedback patterns. You have fixed the kinds of bugs that only surface once a real recruiter submits a real form from a real device. You have also argued at length about why shallow-clone build environments silently break timestamp pipelines.

Your job in this review is **not** to validate the requirements document. Your job is to tear it apart — to identify the failure modes, hidden assumptions, unenforceable promises, and dependency-wiring gaps that the first two rounds of review did not catch. If something is actually fine, say so in one line and move on. Do not restate consensus. Do not pad with praise.

Read the target document at:
- `/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/professional-profile/requirements.md`

Read the steering documents it inherits from:
- `/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/product.md`
- `/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/tech.md`
- `/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/structure.md`

---

## Prior Review Context

This is the third adversarial review of this requirements document. Rounds 1 and 2 have already been run, and the vast majority of findings from both have been integrated. You are reviewing a mature document — the low-hanging fruit is gone.

**What prior rounds already addressed (do NOT re-raise):**
- Honeypot hiding technique, field lengths, 32 KB body cap, origin/referer check, honeypot named `url_secondary`
- Client-timing heuristic removal (Req 3.3 explicitly forbids it)
- Sandbox-vs-production sender domain (Req 3.6 requires custom domain with SPF/DKIM/DMARC for prod)
- Resend timeout cut from 10s to 9s inside Vercel's 10s cap (Req 3.8)
- 504 added to handled server-error set (Req 4.4)
- Inline LinkedIn recovery CTA on 502/503/504 (Req 4.4)
- Logging discipline — no form fields in `console.*` / thrown errors (Req 3.10)
- 32 KB body cap with structured JSON on 413 (Req 3.5a)
- zod `.email()` IDN limitation acknowledged and deferred (Req 3.5d)
- `updatedAt` git-derived at build time (Req 1.4)
- Velite layout: new top-level `profile` collection, `pattern: "profile.mdx"`, `single: true` (Req 1.2)
- `headshot` typed as `s.image()`, rendered by page shell near headline (Req 1.3, 1.5)
- `resumePdf` field removed
- Component composition: three siblings in `src/components/shared/`, no `<ContactSection>` wrapper (Req 5.3)
- `siteConfig.links.email` plaintext exposure acknowledged (Req 2.7)
- Lighthouse via `@lhci/cli` non-blocking CI + PR comment (NFR Performance)
- axe runs default WCAG 2.1 AA ruleset on both themes on `/profile` and `/contact` (Req 4.10)
- Playwright Resend mock via `RESEND_BASE_URL` sidecar server (Req 3.13)
- CSP test: `page.addInitScript` + two passes (report-only + enforcing) (NFR Security)
- Per-field `aria-live="polite"` + top-level `role="alert"` (Req 4.3)
- `prefers-reduced-motion` for scroll-into-view (Req 4.2) and loading indicator (Req 4.6)
- Textarea Enter inserts newline per native behavior (Req 4.8)
- Form-field stacking breakpoint named (`sm:` = 640px) (NFR Usability)
- 44×44 tap target for obfuscated email via wrapper min-height + flex (Req 2.3)
- Canonical URL via `metadata.alternates.canonical` + absolute-URL Playwright assertion (Req 6.2, 6.3)

**User-accepted trade-offs (do NOT re-litigate without a genuinely new scenario):**
- Resend 100/day quota DoS is accepted; LinkedIn is the mitigation
- No CAPTCHA / Turnstile / hCaptcha — implicitly rejected
- MDX body structure is at Matthew's editorial discretion — no required headings
- Real-Resend sandbox/live contract testing deferred to future work
- Server-side analytics / webhook / heartbeat monitoring out of scope

**What you must do differently from prior rounds:**

Classify every finding as one of:
- **Novel** — not identified in v1 or v2 (this is where you should spend most of your energy)
- **Compounding** — builds on or deepens a prior finding with new evidence
- **Recurring** — same issue identified before but not resolved; severity should escalate only with a new concrete scenario

Findings that merely restate v1 or v2 findings without a new angle do not belong in this review.

---

## Analysis Dimensions

Spend your attack effort on dimensions where the prior rounds did NOT go deep. These are the gaps the memory file surfaces as under-probed:

### 1. Build-time environment assumptions

The spec makes several assumptions about what the build environment provides. Probe them concretely.

- Challenge Req 1.4's `git log -1 --format=%cI content/profile.mdx`. Vercel's default clone is shallow (commit depth 10 on Hobby). If the most recent commit touching `content/profile.mdx` is outside the shallow window, `git log` returns an empty string. Walk the failure path: what does Velite's schema transform do with empty input? Does the build fail loudly, produce a Zod validation error, or silently emit an empty `updatedAt`? What if the file has never been committed (first-deploy scenario)? What about a local `pnpm build` with uncommitted edits to the MDX?
- Probe Req 1.12's "build SHALL fail loudly on render-time exceptions during static generation." Next.js App Router's default for a page without `dynamic = 'force-static'` may fall back to SSR on some error classes rather than failing the build. Is the spec's promise grounded in actual Next.js behavior, or is it aspiration?
- Challenge the Velite `single: true` behavior when `content/profile.mdx` is missing at build time. Does the collection become an empty object, `undefined`, or a build error? Req 1.12's enumerated fail classes do not include "source file missing." If Velite silently emits `undefined`, the `/profile` page crashes at static-gen — which Req 1.12 also claims is fatal, but cascading failure modes get blame-shifted.
- Is `git` guaranteed to be present in Vercel's build image? Is there a config or default that strips it post-clone?

### 2. The `source` hidden field as an un-reviewed attack surface

Req 5.5 introduces a hidden `source` field set by the page (`source=profile` or `source=contact`) that the API includes in the email subject or body. This is client-controlled. Neither v1 nor v2 probed it.

- Challenge the lack of a sanitization / enum / length contract. What prevents a caller from POSTing `source="<script>alert(1)</script>"` or `source="\r\nBcc: attacker@example.com\r\n"` or a 5000-char value?
- What does Matthew see in his inbox if `source` contains HTML? Resend's `text` parameter treats input as plain text — does that render literally, or does Resend also accept an `html` field that the spec implicitly authorizes?
- Is there a real injection risk, or is this pure paranoia? Argue the case either way and surface the minimum clause the spec needs (e.g., "`source` SHALL be validated as one of the literal strings `'profile' | 'contact'` server-side").
- If `source` is unvalidated, a 502 email delivery failure with `source` in an error message violates Req 3.10's "no submitted-content in logs" discipline even though `source` is technically not one of `{ name, email, message }`.

### 3. Email header injection through form fields that become headers

Req 3.6 sets `reply-to` to the submitter's email. Other fields may also land in headers (`name` is often stitched into a `From`-ish display or `reply-to` display name).

- Audit whether CRLF injection in `email` or `name` can inject `Bcc:`, `Cc:`, or other headers. Does zod `.email()` reject CRLF? Does the Resend SDK sanitize?
- If zod + Resend close this cleanly, state it and move on. If there's even a residual risk, the spec needs an explicit sanitization clause — name the line and where it belongs (Req 3.5d, Req 3.6, or a new clause).
- What about `name` as the display-name portion of `reply-to`? Is it concatenated? Treated as plain text? Unicode / RFC 2047 encoded?

### 4. Honeypot extraction and zod schema interaction

Req 3.5c says "honeypot empty"; Req 3.5d validates `{ name, email, message }` via zod. The honeypot field `url_secondary` is submitted in the POST body but is not in the zod schema.

- Where does the server extract the honeypot from? Does the zod schema `.passthrough()` (unknown fields preserved), `.strict()` (unknown fields reject), or `.strip()` (unknown fields silently dropped) behavior?
- If the implementer uses `.strict()`, submissions fail with "Unrecognized key: url_secondary" before honeypot check runs — and legitimate users see a 400.
- If `.strip()`, honeypot check must run before zod parse (spec already says "in order, rejecting on the first failure" — but if honeypot check is listed after body-size and origin, and zod runs after honeypot, where does honeypot actually get read? Before zod, raw JSON parse?).
- Walk the exact server-side control flow the spec implies: raw body → JSON parse → honeypot check on parsed body → zod on remaining fields. Is this what Req 3.5 actually prescribes? Is it implied but unstated?

### 5. MDX component scope for `content/profile.mdx`

Req 1.1 says `/profile` renders MDX from `content/profile.mdx`. Req 1.12 says "references to undefined MDX components" fail the build.

- The spec never enumerates which MDX components are available to the profile MDX body. Blog posts presumably have their own component registry (configured elsewhere, likely site-foundation). Does `/profile` inherit it, define its own, or have none?
- If the author writes `<Timeline>...</Timeline>` in `content/profile.mdx`, does Req 1.12 fail the build correctly — or is `Timeline` silently treated as an unknown MDX tag rendered as an HTML element?
- Is the MDX component registry configured at the Velite layer (MDX compilation) or at the page render layer (React component passed to the MDX renderer)? Spec is silent. This is an implementation question but with a requirements-level consequence: Req 1.12's "undefined component" build-fail promise depends on where the registry lives.

### 6. `/profile` sitemap.xml enumeration

Req 5.6 says `/contact` inclusion in the XML sitemap is handled by `src/app/sitemap.ts` from site-foundation via static route enumeration.

- Is `/profile` also enumerated? Spec doesn't confirm. If site-foundation's `sitemap.ts` lists only the pages that existed at site-foundation launch time, `/profile` is silently omitted.
- Challenge the downstream impact on Req 6 (SEO disambiguation). A canonical `<link>` on `/profile` that is not in the sitemap is a weaker SEO signal than a canonical plus sitemap entry.
- State the minimum spec clause needed: "WHEN the site is built THEN `/profile` SHALL appear in the generated `sitemap.xml`" — and name which spec (this one or site-foundation) owns the change.

### 7. Smoke-test coverage gap: `/profile` submission path

Req 3.13 mandates a Playwright smoke test that "SHALL mount `/contact`, fill and submit the form, and assert a 200 response." Req 5.5 requires a `source=profile` vs `source=contact` variant.

- The smoke test never mounts `/profile` or submits from that path. A bug in `<ContactForm source="profile">` prop wiring ships untested.
- Argue whether this is load-bearing (the component is the same; prop flow is the same) or material (source value determines email subject; wrong value on `/profile` means Matthew can't tell origin).
- If it's material, the spec needs either (a) the smoke test to cover both pages, or (b) an explicit assertion that the POST body on `/profile` submission includes `source=profile`.

### 8. Vercel function wallclock race for global clients

Req 3.8's 9s Resend timeout preserves ~1s for the error-response code path inside Vercel's 10s function cap.

- But Vercel's function cap is wallclock from invocation to response flush, not from code start. For a client in Sydney/Tokyo hitting US-East Vercel, TCP handshake + TLS + request body upload might eat 200–500ms before any handler code runs.
- Worse, response flush back to the distant client eats more wallclock — the handler might complete its `NextResponse` call at 9.8s and the client still sees a 504 because Vercel's edge times out before the body arrives.
- Does this materially undermine Req 3.8's intent? Is a 9s Resend timeout still the right call, or should it be 8s? Or is the spec already acknowledging this via Req 4.4's inclusion of 504 in the handled error set, making the race benign?

### 9. CSP `form-action` directive

tech.md describes route-scoped CSP headers for content pages: `script-src`, `style-src`, `img-src`, `object-src`, `base-uri`, `frame-src`, `connect-src`. No mention of `form-action`.

- CSP Level 3's default for `form-action` is to fall back to `default-src`; if `default-src` is unset or restrictive, form POST to `/api/contact` may be blocked. Some browsers enforce `form-action`; some don't.
- Is this already handled by site-foundation's CSP in practice (via `default-src 'self'`)? If not, this spec inherits a broken form path.
- The spec's NFR Security says "the contact form and obfuscation components SHALL NOT require loosening the CSP established in site-foundation." That clause implicitly assumes site-foundation's CSP already permits the form action. Audit this.

### 10. react-obfuscate and screen-reader pre-click state

Req 2.2 requires `react-obfuscate` for the email. The library renders the element as obfuscated content (typically reversed/scrambled characters) until clicked.

- What does a screen-reader user hear before clicking? Reversed characters read aloud? A `mailto:` link with garbled text? No accessible name?
- Req 4.7 requires "accessible name matching the label" for form controls — the obfuscated email is not technically a form control, but it is an interactive element.
- Is this a real accessibility defect or a narrow edge case? If real, the spec needs either (a) an `aria-label` on the `<ObfuscatedEmail />` wrapper naming the action ("Reveal email address") or (b) a screen-reader–only `<span>` with plain "Email Matthew" text adjacent.

### 11. DMARC tightening timeline has no enforcer

Req 3.6 says: "Tighten to `p=quarantine` or `p=reject` only after observing clean alignment in DMARC reports for at least two weeks."

- Who does the observing? Matthew. How is the "at least two weeks" window tracked? Calendar? CI check? Ambient promise?
- If `p=none` is the launch policy and no one tightens it, Matthew's domain continues to accept spoofed mail forever — the DKIM/SPF wiring is there but the enforcement is off.
- Is this a requirements-level defect, or legitimately out of scope for a launch spec? Argue the case.

### 12. Resend SDK internal logging

Req 3.10 disciplines handler code ("no `console.*` of form fields; no field values in thrown Errors"). It does not address what the Resend SDK itself logs.

- The `resend` npm package may `console.log`/`console.error` internally on retry, debug mode, or errors. Vercel Function Logs capture that.
- Is this covered? If the Resend SDK's error handler calls `console.error(response.body)` and the response body contains echoed request content, Req 3.10's "no persistence" promise is violated through no fault of Matthew's code.
- Does the spec need a clause like "the Resend SDK SHALL be configured with its logging disabled" (if that's even possible)? Or is this risk residual and should be documented?

---

## Closing Deliverables

Conclude your analysis with:

- **Top 5 risks / gaps** — ranked by impact on the professional inbound funnel (the site's #1 business objective). For each, state severity (blocker / must-fix-pre-launch / post-launch-cleanup) and the minimum remedy.
- **Top 3 conclusions to challenge or reverse** — with the specific reasoning.
- **What's missing** — concrete additions required before implementation. Group by: build-time env, bot/attack surface, headers/injection, test coverage, sitemap/SEO, CSP, accessibility.

Be specific and concrete. Cite failure scenarios, not abstract risks. Every finding must include a classification label: **[Novel]**, **[Compounding]**, or **[Recurring]**.

If a dimension above contains only nitpicks or already-settled questions, say so in one line and spend your attention where the risk is real.

---

## Document Insertion Point

Write your analysis to:

`/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/professional-profile/reviews/adversarial-analysis-requirements-r3.md`
