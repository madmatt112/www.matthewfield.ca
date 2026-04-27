# Adversarial Review Prompt — professional-profile Requirements (Round 4)

You are a **senior staff engineer with deep operating experience on Vercel-hosted Next.js apps, Resend deliverability, MDX/Velite content pipelines, and Playwright CI infrastructure**. You have shipped contact-form funnels at small and large scale, debugged DMARC alignment failures in production, and watched test suites melt under parallel-worker race conditions. Your job here is to **tear apart** the requirements document for the `professional-profile` spec, NOT to validate it. Find what will break, what will silently degrade, what will work in dev and fail in prod, and what the spec is *quietly* assuming without saying so.

The first three rounds of review have already filed and resolved the obvious gaps. The document is mature. Your job is to attack the **second-order seams** — operational mechanics, CI infrastructure, vendor-side semantics, and edge cases that survive zod, the honeypot, and the CSP. Surface what slips through.

**Target document:** `/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/professional-profile/requirements.md`

**Supporting context to read before you start:**
- `/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/product.md`
- `/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/tech.md`
- `/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/structure.md`

You may also `Read` the working repo directly to ground your attacks (e.g., `next.config.ts`, `velite.config.ts`, `src/app/sitemap.ts`, `src/components/shared/mdx-content.tsx`). Cite file:line when you do.

---

## Prior Review Context

This is the **fourth** adversarial review. Rounds 1, 2, and 3 produced ~30+ findings, the vast majority of which were accepted and integrated into the current requirements. **Do not re-litigate settled territory.** A consolidated memory of accepted/rejected/unresolved findings lives at:

`/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/professional-profile/reviews/adversarial-memory-requirements.md`

**Read it before writing your analysis.** It is your shortest path to knowing what NOT to repeat.

### What's already addressed (do not re-attack without a genuinely new angle):

- Honeypot hiding mechanics, name choice (`url_secondary`), control flow with `.strip()`
- Field length caps (`name` 1–100, `email` ≤254, `message` 10–5000), 32 KB body cap, HTTP 413 with structured JSON
- Origin/Referer check with absence policy, HTTP 403 on mismatch
- `reply_to` set to bare email (no display-name) — closes CRLF-in-name injection at source
- `source` server-side validated as `z.enum(['profile', 'contact']).optional().catch(undefined)`
- `export const dynamic = 'force-static'` on both `/profile` and `/contact`
- Shallow-clone remedy: `git fetch --deepen=1000` in build, named-error transform on empty output
- Velite `single: true` missing-file → named build failure (Req 1.2)
- MDX component scope explicitly documented as "no registry at launch" (Req 1.13)
- `form-action 'self'` added to production CSP, Playwright CSP test extended to exercise form submit
- `aria-label` on `<ObfuscatedEmail />` wrapper for SR users
- Smoke test exercises BOTH `/profile` and `/contact`, asserting `source` value in mock Resend payload
- Resend SDK no-debug-mode clause (Req 3.10)
- DMARC tightening as Matthew's calendar-bound operational duty (Req 3.6)
- Lighthouse via `@lhci/cli` non-blocking CI job posting PR comments
- axe runs default WCAG 2.1 AA ruleset on light AND dark themes on both routes
- 9s Resend timeout, 504 included in client-handled error set, Retry-After: 60
- Inline LinkedIn recovery CTA in degraded-mode UX (Req 4.4)

If you find yourself drafting a finding that maps to one of the above, either **drop it** or escalate it with a *concretely new failure path* the prior rounds did not consider.

### Classify every finding

For each issue you raise, label it as:

- **Novel** — not identified in v1, v2, or v3.
- **Compounding** — builds on or deepens a prior finding with new evidence or a new angle.
- **Recurring** — same issue identified before but not yet resolved; severity should escalate with a new concrete scenario.

If you produce no Novel findings, that is a legitimate result — the spec may be done. Say so.

---

## Analysis Dimensions

Attack these specific surfaces. They were chosen because the prior three rounds did not probe them in depth.

### 1. CI test infrastructure under parallel execution

Req 3.13 mandates a sidecar mock Resend server (`RESEND_BASE_URL=http://127.0.0.1:<port>`) started in `global-setup.ts`, with assertions like "the mock received exactly two calls across the test run."

- Challenge the implicit assumption that Playwright workers serialize. Default Playwright config runs tests in parallel across workers; the `RESEND_BASE_URL` env var is process-global, not per-worker. Two workers hitting one mock cross-contaminate the "exactly two calls" assertion.
- Probe the port allocation. A fixed port collides on developer machines that already use it; a dynamic port requires the env var to be set after the port is assigned, which `global-setup.ts` can do — but the Next.js dev server consumes the env var at boot. Sequencing matters and is not specified.
- Challenge whether the mock survives a Next.js cold start in CI. If Next.js spins up after `global-setup`, the env var is fine. If route handlers are pre-built and cached with the env var baked in (build-time vs runtime), the mock URL won't take effect.
- Examine retry mechanics. If a test flakes and retries, the mock now receives 3 calls — assertion fails.

### 2. Email subject contract

Req 3.13's smoke test asserts payload shape including `subject`, but **no requirement defines what the subject string looks like**.

- Surface this gap. The test author has to invent the subject contract; the implementer has to invent the value. They will diverge.
- If the subject embeds `source` (`"Contact form submission from profile"`), then `source` re-enters a header context — the validation in Req 3.5g protects body construction, but a subject containing `source` is now a header. CRLF in source is impossible (zod-normalized), but the spec hasn't *thought about* the subject as a sink.
- If the subject embeds `name`, the same `name`-CRLF concern that Req 3.6 closes for `reply_to` re-opens here. Subjects ARE headers per RFC 5322; CRLF in a Subject value injects raw headers if the API doesn't sanitize.
- Demand the spec name the subject contract or explicitly forbid user-controlled values in the subject.

### 3. Vendor-side semantics: Resend / DMARC / DKIM alignment

Req 3.6 enumerates SPF, DKIM, and DMARC requirements. It says "DMARC: a TXT record at `_dmarc.matthew-field.ca` with at minimum `v=DMARC1; p=none; ...`". It does NOT specify alignment mode.

- Attack the alignment gap. DMARC requires DKIM domain alignment (or SPF, but with `p=none` we're permissive anyway). Resend signs DKIM with a CNAME pointing into your domain (`resend._domainkey.matthew-field.ca` → Resend-managed key). Default DMARC alignment is "relaxed," which makes this work. If anyone adds `adkim=s` (strict) to the DMARC record, mail bounces.
- Probe the launch-prerequisite enforcement. The spec says "DNS verification is a launch prerequisite" but no CI gate verifies SPF/DKIM/DMARC actually resolve from public DNS. Manual checkbox = potential for shipping a broken funnel.
- Examine the post-launch DMARC tightening. Req 3.6 says "Matthew SHALL set a 14-day post-launch calendar reminder." What enforces this? What's the failure mode if Matthew misses it? Spec acknowledges as residual risk; surface whether the residual is correctly priced.

### 4. Cold-start budget math vs. Vercel Hobby 10s cap

Req 3.8's 9s/1s budget assumes a warm function. Vercel Hobby cold starts add latency BEFORE the handler runs.

- Walk through the math: cold start ~200–500ms (Hobby has slower cold starts than Pro), JSON parse on a 32 KB body ~5ms, zod validation, header checks, then the 9s Resend call, then the response-flush path. The "1s budget" assumes warm; cold-start cuts it to ~500–800ms.
- Probe whether this ever actually exceeds 10s in practice. Median Resend latency is sub-second; the 9s timeout is for tail latency. But the tail of *cold start + Resend tail + response flush* on a Sydney→US-East round-trip is real.
- Consider whether the spec needs a clause acknowledging cold-start adds to wallclock, OR whether it's a wash because users on cold-started functions are equally screwed by either a structured 503 or Vercel's 504 (both handled by Req 4.4).

### 5. Function-invocation budget DoS (distinct from Resend quota DoS)

Req 173 (NFR Security) acknowledges Resend's 100/day quota DoS. Vercel Hobby has a separate constraint: **100,000 function invocations/month**.

- Surface the second DoS axis. A bot that submits at rate "Resend 100/day" (≤100 successful sends per day) consumes 3,000 successful function invocations/month. But if the bot submits invalid payloads (rejected at zod / honeypot / origin), each rejection ALSO consumes a function invocation — those don't count against Resend's quota but DO count against Vercel's invocation cap. A 1-req/sec bot eats ~2.6M invocations/month — 26x the Hobby cap.
- Examine the consequence: when Vercel's invocation cap hits, the function returns 429s (or the project is throttled). The contact form goes dark for the rest of the month even if Resend would still accept mail. The Req 4.4 LinkedIn CTA only renders if the route handler RUNS; if Vercel throttles before the handler, the user sees a Vercel error page.
- Demand: does the spec acknowledge this? If not, propose the minimum mitigation (CSP `connect-src` for `/api/contact` only? Edge-level rate limiting via Vercel's WAF/firewall rules? Either is one extra clause).

### 6. Honeypot extraction on edge-case JSON bodies

Req 3.5 step (d) reads `parsed.url_secondary` "off the parsed object." Req 3.5 step (c) handles "JSON parse failure" → 400. But the spec does not enumerate the case where JSON parses successfully to a **non-object**: `null`, `[]`, `"string"`, `42`, `true`.

- Attack each: `parsed.url_secondary` on `null` throws `TypeError: Cannot read properties of null`. On `[]`, returns `undefined` (passes honeypot). On `"string"`, returns `undefined`. On `42`, returns `undefined`.
- The `null` case is the immediate problem: unhandled exception → 500 → contradicts the spec's "no unhandled exceptions" intent.
- The `[]`/string/number cases pass honeypot and crash zod (`z.object().strip()` rejects non-objects with a 400, which is fine). But the `null` path is a real gap.
- Demand a single clause: parsed body MUST be a plain object before honeypot extraction; non-object → 400.

### 7. Preview-deploy semantics: canonical URL, env vars, mock Resend

Req 6.3 asserts `<link rel="canonical">` starts with `https://matthew-field.ca/`. `metadataBase` is hardcoded to that production URL.

- Surface the implication: on every preview deploy, the canonical points to production. If a stakeholder shares a preview URL for review, search engines (or anyone clicking) get redirected via SEO signals to production — which doesn't have the preview's content. Confusing for QA review even if technically correct for SEO.
- Probe the Req 3.6 sandbox/preview path: "preview and local-development `from` address MAY use Resend's sandbox domain." But preview deploys DO need a `from` address — is it expected to be wired via Vercel preview env vars? The spec says "from is env-driven" but doesn't say how preview vs. production env splits work. If a preview deploy accidentally uses the production `from`, real mail goes from previews — possibly to Matthew's real inbox.
- Probe the mock Resend in preview: NFR Security's CSP test says "matching production" CSP. Does the preview deploy run the mock Resend, the real Resend (production key), or the sandbox Resend (different key)? Three possible answers; spec implies sandbox; nothing enforces it.

### 8. `source` enum extensibility and downstream coupling

Req 3.5g and Req 5.5 hardcode `z.enum(['profile', 'contact'])`. The current product surface has exactly two contact-form callsites. The product roadmap (`product.md`) lists more pages that *could* host the form (landing page hero, blog post inline CTA, project showcase footer, etc.).

- Challenge the hardcoded enum as a foot-gun for future specs. Adding a third source = code change to the API handler, not just a new page. The spec doesn't acknowledge this coupling.
- Consider whether the spec should generalize: e.g., `z.string().regex(/^[a-z]+$/).max(20)` with the constraint that `source` is non-secret, length-bounded, character-bounded. More flexible without losing any safety.
- Argue the other side too: hardcoded enums are the safer default; YAGNI applies to extensibility. But the spec should at least *say* "if you add a source, update this enum" — otherwise the next implementer adds a `<ContactForm source="landing">` and gets a normalize-to-undefined that they only notice during QA.

### 9. Headshot responsive layout undefined

Req 1.5 says "rendered by the `/profile` page component in a fixed position adjacent to the headline (i.e. above the MDX body)."

- Probe "adjacent to the headline." Does that mean stacked on mobile, side-by-side on desktop? Both stacked? Both side-by-side? Spec doesn't say.
- Demand at least a breakpoint contract (e.g., "stacked vertically below `sm:`, side-by-side at `md:` and above") OR an explicit deferral to Design.
- This is small but it's a Design/Tasks ambiguity that creates churn. The wider "professional inbound funnel" depends on the page looking polished on phones; an undefined headshot layout is the kind of thing a reviewer will reject in PR.

### 10. Layout shift on email reveal (horizontal CLS)

NFR Performance says "No layout shift from obfuscation reveal or form state changes — the contact section reserves its vertical space up front."

- Probe the horizontal axis. `react-obfuscate` renders an obfuscated string (e.g., `ac.dleif-wehttam@olleh`) until clicked, then replaces with `mailto:hello@matthew-field.ca`. The two strings are different widths.
- On narrow viewports (mobile), the width swap shifts surrounding text. CLS metrics measure shift over time — a click-triggered reveal is "user input within 500ms" which Web Vitals excludes from CLS, BUT the user-perceived experience is still jarring.
- Demand the spec address horizontal reservation (e.g., `min-width` matching the longer revealed string) OR explicitly accept the horizontal shift as out-of-scope.

### 11. `role="status"` placement vs. axe `region` rule

Req 4.10 runs axe with default WCAG 2.1 AA rules. The default ruleset includes `region` (all content must be in landmarks like `<main>`, `<nav>`, `role="region"`, etc.).

- Probe Req 4.1: success message is `<h2>` with `tabindex="-1"` inside `role="status"`. Where does the `role="status"` mount in the DOM? If it's outside `<main>` (e.g., at the form's level, which may itself be inside `<main>`), axe is fine. If it's a sibling of the form mounted at the page-component level OUTSIDE any landmark, axe's `region` rule flags it.
- Probe Req 4.4: server-error status region — same question.
- Demand the spec name the mounting position OR explicitly require these regions to live inside `<main>`. Otherwise the axe pass fails for a structural reason, not a contrast reason.

### 12. "Sanitized log line" definition gap (Req 3.5b)

Req 3.5b says when both `Origin` and `Referer` are absent, the handler "SHALL fall back to allowing with a single sanitized log line noting the downgraded-trust signal." Req 3.9 says "no persistence of form data."

- Attack the seam. "Sanitized" is undefined. Logging the IP would be the obvious thing to log — but Vercel Function Logs persist 1 day on Hobby, putting IP into a persistence channel. Logging UA is similar.
- The spec's no-persistence claim (Req 3.9) is about *form data*, not *all submission metadata*. But "sanitized log line" is the seam through which metadata leaks to logs without being explicitly bounded.
- Demand the spec name what the log line contains: route + outcome + a coarse signal (e.g., "origin_absent_referer_absent_allowed"). NO IP, NO UA, NO form fields. One line.

### 13. content/profile.mdx as a CI prerequisite

Req 3.13 requires the smoke test to render `/profile` AND `/contact`. `/profile` will not render without `content/profile.mdx` existing. Req 1.2 requires Velite to fail if the file is missing.

- Probe the order-of-operations. If a PR lands the Velite schema before the file, build fails (and tests can't run). If a PR lands the file before the schema, Velite ignores it.
- Argue this is a Tasks-phase concern, not Requirements — but surface that the Requirements doc could pre-empt it with a one-line "implementation SHALL land schema and content file in the same commit / atomically" clause. Or it could be silent and let Tasks own it. Both are defensible; the spec should make a choice.

---

## Closing Deliverables

After completing your dimensional analysis above, conclude with:

### Top 5 Risks / Gaps

Rank by **inbound-funnel impact** (the spec exists to enable the professional inbound funnel — anything that breaks that primary purpose ranks highest). For each: cite the section number, name the concrete failure scenario (not abstract risk), and propose the minimum remedy (one to two sentences).

### Top 3 Conclusions to Challenge or Reverse

Pick the three places where the spec's stated decision is likely wrong or is hiding a tradeoff it doesn't acknowledge. For each: name the conclusion, give a specific reason, name what the reverse position would look like.

### What's Missing — grouped by remedy category

What clauses or contracts should exist in the spec but don't? Group by category (e.g., "CI infrastructure", "vendor semantics", "edge-case JSON handling"). For each missing item, name the minimum addition needed.

### Classification tally

End with a count: "X Novel, Y Compounding, Z Recurring. The remaining [adjective] surface lives in [where]."

---

**Be specific and concrete. Cite failure scenarios, not abstract risks. Cite file:line when grounding against the working repo. If something you considered turns out to actually be fine, say so briefly and move on — don't pad. If you find no Novel issues, that is a legitimate signal of maturity; report it.**

Write your completed analysis to:

`/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/professional-profile/reviews/adversarial-analysis-requirements-r4.md`
