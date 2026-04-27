# Adversarial Review — professional-profile Requirements (Round 2)

You are a principal staff engineer with deep experience shipping transactional-email pipelines, WCAG 2.1 AA accessibility audits, Next.js App Router edge deployments, and long-lived content-driven sites. You have been asked to tear apart a requirements document that has already been through one round of adversarial review. Your job is to find what the first reviewer missed, what the revision handled poorly, and what the authors have quietly accepted as "deferred" when it should be blocking.

You are not here to validate work or to balance tradeoffs politely. Find gaps. Stress-test decisions. Surface the failure scenarios the document pretends don't exist.

## Documents in scope

**Target**: `/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/professional-profile/requirements.md`

**Steering**:
- `/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/product.md`
- `/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/tech.md`
- `/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/structure.md`

Read all of these before beginning.

## Prior Review Context

This is **review v2**. A prior adversarial review (v1) has already been executed against an earlier draft of the requirements. The authors have revised the document in response. A cumulative findings memory is available at:

`/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/professional-profile/reviews/adversarial-memory-requirements.md`

Read it before generating findings. It classifies v1 findings as **Accepted**, **Partially Accepted**, **Rejected**, or **Unresolved**, and names areas that have been well-covered vs. areas that remain novel territory. Use it to avoid re-discovering known issues and to focus your energy on genuinely new angles.

### Your findings classification

For every finding you raise, tag it explicitly as one of:

- **Novel** — Not identified in v1 and not implied by any v1 finding. A fresh issue.
- **Compounding** — Builds on or deepens a v1 finding (whether accepted, partial, or rejected). Explain what is new about the angle.
- **Recurring** — Same issue v1 raised that was rejected or deferred. Severity should escalate only if you supply a concrete scenario, threat, or consequence that v1 did not articulate. Do not re-raise a recurring finding at the same severity with the same reasoning — that is noise.

Findings without a classification will be discarded.

### Do not re-raise (already well-covered)

These are settled. Do not re-probe them unless you have a genuinely new angle, and even then, tag as Compounding and justify what is new:

- Honeypot hiding technique (display:none + tabindex=-1 + aria-hidden + autocomplete=off — Req 3.2)
- Field length caps (name 1–100, email ≤254, message 10–5000 — Req 3.4e)
- Component composition / layout-agnostic pattern (Req 5.3)
- `aria-required` vs native `required` (Req 4.5)
- 44×44 mobile tap target (Req 4.8)
- Site config single source for links (Req 2.5)
- rehype-slug heading anchors at the tooling level (Req 1.8) — *but see §2 below, which probes an interaction with Req 1.3*

### Do not re-litigate accepted tradeoffs at the same level

The authors have accepted certain tradeoffs after v1 (no CAPTCHA, manual Lighthouse review, no required MDX body sections, no content-negotiation for no-JS, no Resend sandbox e2e test). You may challenge these only with a novel concrete scenario that v1 did not name.

## Analysis Dimensions

Attack the requirements along each of the following dimensions. Go deep on at least four of them. Do not treat them as a checklist — where a dimension doesn't apply, skip it and say so.

### 1. Testability and executability of "SHALL" clauses

Several new requirements assert verification behavior without specifying the harness. Pick them apart:

- **Req 3.11 (Playwright mocks Resend `fetch`)**: Playwright drives a browser; the `fetch` to Resend happens inside a Next.js Route Handler running server-side. There is no native Playwright API for mocking a server-side outbound `fetch`. Options — MSW with a Node interceptor, a test-only environment flag that swaps the Resend client, a dependency-injection seam, a Resend client factory — each with different production-code pollution. Spec names none. What gets built? Does the test actually prove what it claims?
- **NFR Security → CSP compliance test**: Loads `/contact` under `Content-Security-Policy-Report-Only` and asserts "zero CSP violation reports." CSP violations dispatch `SecurityPolicyViolationEvent` to the page; there is no `report-uri` endpoint specified to capture them. Does the test hook `window.addEventListener('securitypolicyviolation', ...)` before react-obfuscate mounts? What if the violation fires before the Playwright page is listening? This is a race, not a test.
- **Req 4.7 (`axe-core/playwright` color-contrast assertion)**: Does it run against the contact form on `/contact` only, or also on `/profile`? Does it run under both themes? The rule name is given but no theme-switch harness is specified. A dark-mode regression slips past a light-mode-only run.
- **NFR Performance Lighthouse ≥ 90**: "Verified manually against the Vercel preview deploy" is prose, not a gate. Who is the reviewer? Matthew is the sole maintainer. Manual review by the author of the PR is not review.

Challenge each clause: if CI can't actually execute the check, the clause is aspirational.

### 2. Editorial-discretion body structure vs. deep-link and SEO promises

Req 1.3 says "The MDX body structure SHALL be at Matthew's editorial discretion — no required section headings enforced by the spec." Req 1.8 promises `/profile#experience` works. Req 6 promises SEO distinction from `/about` based on the content being a "resume/CV."

- Attack the inconsistency: if Matthew ships a profile with no `## Experience`, `## Skills`, or `## Education` headings, the deep-link promise in Req 1.8 is undeliverable for those fragments.
- Attack the SEO claim: "description focused on professional experience, skills, role fit" (Req 6.1) is a frontmatter constraint, but Google surfaces headings too. With no heading structure contract, two recruiters searching "matthew field experience" and "matthew field skills" may land on an unstructured blob.
- Attack the heading hierarchy: no requirement enforces h1 → h2 → h3 sequential order. Matthew can legally write `# Title` then `### Subsection` skipping h2 — fails WCAG 1.3.1.
- Consider: is this genuinely Matthew's call (in which case say so in the acceptance criterion), or is it a latent bug?

### 3. Bot defense that cannot actually defend

The layered abuse defense (Req 3.4 a–e) replaced v1's honeypot-only approach. Stress each layer:

- **Req 3.4c timing check**: client-stamps a timestamp at form mount. A bot that reads the form HTML sets the timestamp to `now - 5000` before submitting and bypasses the check trivially. Client-stamped means client-controlled. What defense does this actually provide? (Server-issued or HMAC-signed timestamps would raise the bar; the spec asks for neither.)
- **Req 3.4b origin/Referer**: browsers in strict privacy modes (Firefox ETP, Brave, some iOS configurations) strip or null the Referer. Does "matches the site's own origin" reject null-Referer same-origin submissions? If yes, legitimate users fail. If no, a bot spoofing origin passes.
- **Req 3.4c "silent 200 + no email"**: a human who autofills all three fields in <1s (modern password managers do this on focus), or tabs fast, triggers silent-drop. Req 4.1 success UX runs: "Message sent!", fields cleared, focus moved. The user leaves thinking they contacted Matthew. V1 identified this for the honeypot path; Req 3.2's hiding technique fixed *that*. But the timing path has the same failure mode and was not addressed by Req 3.2's fix.
- **Honeypot field `name` attribute**: Req 3.1/3.2 specify hiding but not the `name` of the honeypot field. Password managers and browser autofill pattern-match on names like `email`, `phone`, `website`, `address`. If an implementer picks `email_confirm` or `website`, autofill triggers the honeypot on legitimate users. Should be an obscure name (`nickname`, `url_secondary`) or the spec should require the implementer to pick a name that password managers won't target.

Classify as Compounding where applicable — these build on the v1 layered-defense proposal that was accepted in a weaker form.

### 4. Resend, sender identity, and Vercel execution-limit collisions

- **Req 3.5 production sender domain**: "Resend sandbox sender domain as the `from` address." Sandbox domains in Resend (e.g., `onboarding.resend.dev`) are intended for development, have aggressive recipient whitelisting, and may carry deliverability warnings. Using sandbox in production likely means real recruiter emails land in spam or are rejected by corporate mail gateways. Is this a placeholder? If so, the spec must mandate "verified sender domain configured in Resend" for production, plus DMARC/SPF/DKIM posture.
- **Req 3.6 / 3.7 timeouts vs Vercel Hobby 10s function cap**: tech.md establishes Vercel Hobby tier. Hobby functions have a 10s execution ceiling (Vercel's limit, not Resend's). Req 3.7 says "e.g. 10s ceiling" for Resend itself. Race condition: if Resend takes 9.8s to respond with 5xx, Vercel kills the function at 10s and emits its own 504 before Req 3.6's 502 path runs. Client receives Vercel's 504. Req 4.3 only handles 502/503/network — not 504. What does the user see?
- **Req 3.8 data persistence exception "beyond Resend itself"**: Resend retains message content in their delivery logs per their retention policy. Vercel function logs capture accepted request bodies by default (Next.js logs requests; error logging may echo user input). Is this truly "relay-only"? GDPR/PIPEDA posture for inbound email addresses?
- **Resend 100/day free tier recurrence**: Accepted as risk in v1. Do NOT re-raise at same severity. But: is there a monitoring story if the quota is exhausted? The spec says "LinkedIn is always the primary CTA" — how does Matthew know the quota is exhausted? No Resend webhook, no alert, no status endpoint. A silent funnel outage is worse than a loud one.

### 5. UTF-8 / multibyte / i18n collisions with byte-based caps

- **Req 3.4a 16 KB body cap vs Req 3.4e message 10–5000 characters**: 5000 UTF-8 characters of Latin text fit in ~5 KB. 5000 CJK (Japanese, Chinese, Korean) or emoji-heavy characters can be 15–20 KB. A Japanese recruiter submitting a zod-conformant 5000-char message may exceed 16 KB bytes and receive HTTP 413 before zod even runs. The cap must either be raised to ~24 KB or stated in characters.
- **Email validation**: zod's `.email()` does not validate internationalized email addresses (RFC 6532, IDN domains). A recruiter at `山田@example.co.jp` fails validation.
- **Name field 1–100 chars**: multibyte names (Arabic, CJK) in 100 chars are fine; but Unicode combining marks (Zalgo text) may exceed display expectations. Probably fine in practice; flag only if you see a concrete attack scenario.

### 6. Stale profile, `updatedAt`, and single-document Velite assumptions

- **`updatedAt` staleness**: Req 1.2 requires `updatedAt: ISO 8601 date`. Matthew edits the MDX body and forgets to bump the field. Recruiters see "Last updated 2024." No auto-derivation from git, no CI check. The field is worse than no field because stale values imply untrustworthiness.
- **Velite single-document schema support**: NFR Code Architecture says "adds a `profile` single-document schema." Verify this is a real Velite API pattern, not a convention. Does `s.path()` work on a single-document schema? Does image colocation (Req 1.2) work the same way as for collection schemas? If Velite's single-document support is limited, the spec may be assuming a feature that requires a fallback (e.g., `content/pages/profile.mdx` under the existing collection).
- **`headshot` path semantics**: Req 1.2 says "path to image, colocated with the MDX file and copied by Velite to `public/static/`." Relative to MDX file or to project root? What is the final `src` URL? The MDX body references it as `![](...)` or as a frontmatter-driven `<Image>` — which?
- **`resumePdf` reserved for future use**: schema pollution. A field that exists but is never rendered invites confusion. If the affordance isn't in scope, delete the field from the schema and reintroduce it when the feature is built.

### 7. Accessibility failure modes that weren't in v1's scope

- **Req 4.6 textarea Enter-to-submit contradiction**: "submission SHALL work with Enter from any focused input." Enter in a `<textarea>` inserts a newline universally. If the spec is taken literally, the implementer either forces Ctrl+Enter/Cmd+Enter in the textarea (which must be documented) or breaks textarea newline handling. As written the clause is a trap.
- **`role="alert"` vs the spec's "cooperative" framing (Req 4.2)**: The spec says "screen readers announce cooperatively, not as an interruption." `role="alert"` has implicit `aria-live="assertive"` semantics and *does* interrupt screen reader speech in most engines (NVDA, JAWS, VoiceOver). If the author wanted cooperative, they should use `aria-live="polite"` on the error region (not `role="alert"`). The spec is internally inconsistent about what it wants.
- **`prefers-reduced-motion` and scroll-into-view (Req 4.1)**: Focus move + scroll-into-view is motion. Users with `prefers-reduced-motion: reduce` may get jump-cut or browser-default behavior. Scroll behavior (smooth/instant) is not specified.
- **Focus management on server error (Req 4.3)**: Req 4.2 sends focus to the first invalid field on 400. Req 4.3 describes 502/503/network but doesn't say where focus goes. The "Try again" button? The status region? Undefined behavior.
- **Reduced motion for `<ContactForm />` loading-state spinner (Req 4.4)**: "submit button SHALL show a loading state" — if it's an animated spinner, it must respect `prefers-reduced-motion`. Not specified.

### 8. Mobile, responsiveness, and viewport specifics the requirements gloss over

- No breakpoint specification for `/profile` between mobile (<640px) and `max-w-5xl` (1024px). Is the layout fluid, stepped, or fixed at specific breakpoints?
- NFR Usability says "form fields stack on narrow viewports" — at what width? Default Tailwind breakpoint? Container-query-based? Not specified.
- Obfuscated email click-to-reveal on mobile: tap target is the email link (Req 4.8 says 44×44). But the obfuscated state may show only a "click to reveal" string — is that string alone 44×44? What about a tap on the obscured text?
- Landscape phone (667×375 logical): `max-w-5xl` profile page is effectively full-bleed. Is that intentional? The "wide layout" rationale doesn't apply in landscape phone where the viewport is already the limit.

### 9. Observability and recovery gaps (accepted in r2, but probe the consequences)

The spec reserves a client-side `CustomEvent` on success and defers server-side logging, Resend webhooks, and delivery heartbeats. Probe the consequence:

- Concrete scenario: Matthew deploys a `next.config.ts` CSP change that breaks `/api/contact` for real browsers. The Playwright smoke test runs under Playwright's own CSP and passes. For 14 days no recruiter successfully submits. Matthew has no signal. Is this acceptable? Does the spec document "Matthew checks Resend dashboard weekly"?
- Concrete scenario: Resend silently rolls their API contract. Mocked test passes indefinitely. First real submission fails. Matthew sees a 502 in the browser — but Matthew isn't the submitter.
- Is "funnel downtime is acceptable" actually captured as an acceptance criterion, or is it buried in NFR prose? The spec should name the degraded-mode contract explicitly: "If Resend is non-functional for > N hours, the contact form SHALL display [X]."

### 10. Cross-requirement inconsistencies introduced by the revision

Spot any places where v2's additions collide with each other or with what already exists:

- Req 1.3 (editorial discretion) vs Req 1.8 (heading anchors work) — already called out in §2.
- Req 4.2 (`role="alert"`) vs the "cooperative not interruption" claim — already called out in §7.
- Req 3.4a (16 KB cap) vs Req 3.4e (5000 chars) — already called out in §5.
- Req 3.5 ("sandbox sender domain") vs production deliverability — already called out in §4.
- Any others?

## Closing Deliverables

Conclude your analysis with:

1. **Top 5 risks or gaps**, ranked by impact to the primary business objective (inbound professional funnel). Tag each as Novel / Compounding / Recurring.
2. **Top 3 conclusions to challenge or reverse**, with specific reasoning and classification.
3. **What's missing** — concrete additions the requirements must include before implementation. Organize by topic.

Be specific and concrete. Cite failure scenarios, not abstract risks. Cite requirement numbers. If something is actually fine, say so briefly and move on — do not pad.

Do not praise the document. Do not summarize its strengths. Do not thank anyone. Your job is oppositional analysis.

## Write your analysis to

`/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/professional-profile/reviews/adversarial-analysis-requirements-r2.md`
