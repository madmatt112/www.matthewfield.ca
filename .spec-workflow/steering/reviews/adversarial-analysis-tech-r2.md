# Adversarial Analysis: Technology Stack Steering Document (Round 2)

---

## 1. CSS `@layer` + CSS Modules Isolation

The specification has three components: `@layer playground` at lower cascade priority, CSS Modules for scoped class names, and a container that resets inherited styles. Each has a specific failure boundary.

**`@layer` does not prevent outward style leakage.** Layers control cascade priority when multiple rules match the same element — they determine which rule *wins*, not which elements a rule can *reach*. A rule in `@layer playground` that selects `body`, `html`, `*`, or any tag selector will still match those elements. It will lose to a competing rule in a higher-priority layer, but if no competing rule exists for that property, the playground rule applies globally. CSS Modules mitigate this for class-based selectors, but they do not scope tag selectors, pseudo-element selectors, or `@keyframes` names. `@keyframes` identifiers are global in CSS Modules unless explicitly configured — two playground items defining `@keyframes spin` will collide regardless of CSS Modules scoping. **Classification: Novel.**

**The inherited-style reset is underspecified.** "Resets inherited styles" requires setting every inheritable CSS property to a known value. The CSS spec defines ~30 inheritable properties including `color`, `font-family`, `font-size`, `line-height`, `letter-spacing`, `word-spacing`, `text-align`, `text-indent`, `text-transform`, `visibility`, `cursor`, `direction`, `writing-mode`, `list-style`, `quotes`, and more. The practical approach is `all: initial` on the container, but `all: initial` resets `display` to `inline`, `box-sizing` to `content-box`, and strips `unicode-bidi` — all requiring explicit overrides. The document should name the reset mechanism rather than leaving it ambiguous. This is solvable (~15 lines of CSS) but should be specified. **Classification: Compounding** (v1 identified undefined isolation; the mechanism was added but not specified precisely enough to implement without ambiguity).

**Convention enforcement is trust-based.** The constraint "playground items must not write global CSS rules or unscoped selectors" has no build-time enforcement — no ESLint plugin, no stylelint rule, no build check. For a solo developer, this is acceptable. The document should say so explicitly: "Enforced by authorship convention; no automated check. Acceptable because all playground items are first-party." One sentence closes the gap. **Classification: Novel.**

**Creative-coding patterns that escape the container.** Several common patterns break this isolation model:

- `position: fixed` elements position relative to the viewport, not the container. A playground item with a fixed overlay covers the site nav.
- Viewport units (`vh`, `vw`, `dvh`) reference the viewport, not the container.
- `z-index` on positioned elements can stack above site chrome unless the container establishes its own stacking context via `isolation: isolate`.
- CSS animations on `:root`/`html`/`body` affect the entire page — CSS Modules don't scope pseudo-class selectors on global elements.

The stacking context issue is solvable with `isolation: isolate` on the container. `position: fixed` and viewport units are not containable without an iframe. The document's decision rule says "when in doubt, use iframe" — correct, but the criteria for "doubt" should explicitly list these patterns as iframe triggers. **Classification: Novel.**

---

## 2. Route-Scoped CSP

**`script-src 'self'` will break Next.js hydration on every page. This is a showstopper.**

Next.js App Router injects inline `<script>` tags on every page: RSC payload serialization, hydration bootstrap, chunk preload hints. `script-src 'self'` blocks all inline scripts. Every page will render as static HTML but fail to hydrate — the client router won't initialize, theme toggle won't work, search won't work, contact form won't work.

The options:
1. **Nonce-based CSP** (`script-src 'nonce-{random}'`): Next.js 13.4+ supports this via middleware. But nonces must be unique per request, requiring dynamic header generation — incompatible with pure static generation. Every page becomes SSR'd for the header alone.
2. **`script-src 'self' 'unsafe-inline'`**: Allows inline scripts. Weak XSS protection but functional. This is what most Next.js sites actually ship.
3. **Hash-based CSP**: Brittle — Next.js generates different inline scripts per page and per build. Maintenance nightmare.

For a statically generated site, the realistic choice is `'unsafe-inline'` or no `script-src` restriction on inline scripts. The document's specification is not achievable with Next.js static generation. **Classification: Novel.** Severity: **High** — if implemented as written, breaks every page on first deploy.

**Relaxed playground CSP is effectively no CSP.** If "relaxed" means `script-src 'self' 'unsafe-inline' 'unsafe-eval'` plus `style-src 'self' 'unsafe-inline'` plus `connect-src *`, that opts out of all meaningful CSP protection. For playground items with no auth, no stored data, and no sensitive operations, this is acceptable. The document should be explicit that playground routes effectively opt out of CSP. **Classification: Novel.**

**`frame-src` is not mentioned.** If playground items are loaded via iframe, the parent page's CSP must include `frame-src 'self'`. Since both parent and iframe are same-origin, this is standard — but it needs to be in the spec. **Classification: Novel.**

**Path-based headers in `next.config.js` work** for the granularity needed (`/playground/:path*` vs other routes). This part is implementable. No issue.

---

## 3. Contact Form Security

**Per-IP rate limiting has no state store.** Vercel serverless functions are stateless — no shared memory between invocations. Per-IP rate limiting requires:
- Vercel KV / Upstash Redis: adds a dependency and billing dimension
- Edge Middleware with KV: still requires KV
- In-memory state: does not work across function instances

The document specifies the behavior without the infrastructure. This will either require an unplanned dependency or be silently dropped during implementation. **Classification: Compounding** (v1 identified missing rate limiting; it was added without implementation path).

**"HTML-escaped before passing to Resend, or sent as plain text" — pick one.** "Or" is not a specification. If using Resend's React email templates, JSX auto-escapes user input. If using the `text` parameter, no escaping is needed. Either works; the document should commit to one. Recommendation: plain text via Resend's `text` parameter at launch; if HTML email formatting is added later, use React's JSX auto-escaping. **Classification: Compounding** (v1 identified unsanitized input; the fix was added with ambiguity).

**Honeypot limitations are unstated but acceptable.** Stops ~90% of spam bots (naive form-fillers). Does not stop headless browser automation or targeted attacks. For a personal site's threat model, this is adequate. The document should add one sentence making the tradeoff conscious. **Classification: Novel.**

**Rate limit UX is unspecified.** When triggered: clear message or generic 429? Shared-IP scenarios (corporate NAT)? At 5/hour per IP, shared-IP exhaustion is unlikely for a personal site, but the error response should be specified. **Classification: Novel.**

---

## 4. Content Validation Pipeline

**Lychee against built output is solid for the high-probability failures.** Broken `<a href>` and `<img src>` in rendered HTML — the failures that actually happen when you rename a slug or move an image. This is the right approach.

**Anchor link validation is a gap.** Lychee checks fragment links (`#heading-id`) only with `--include-fragments` enabled (not default in all configurations). Cross-page anchor links (`/blog/post#section`) require resolving the target page. Renaming a heading breaks deep links from other posts — a real failure mode. **Classification: Novel.**

**External link flakiness needs a policy.** External links break transiently (rate limiting, outages, geo-blocking). Without distinguishing internal from external, the link checker either blocks deploys on link rot or lets internal breakage through. Policy needed: internal links are hard failures, external links are warnings with periodic audit. Lychee supports this configuration. **Classification: Novel.**

**Image path validation is fine as specified.** Running against built HTML checks final rendered `<img src>` — the path that matters after Velite/Next.js transforms. No gap here.

**Frontmatter validation beyond types.** Velite validates field types via zod, but doesn't catch: duplicate slugs across content types (silent route conflicts), future-dated posts appearing in listings (accidental draft publication), inconsistent tag casing creating separate tag pages. Low probability for a solo author but easy to catch with a build-time assertion. Worth a mention. **Classification: Novel.**

---

## 5. Build System and Operational Concerns

**Build time scaling is a non-issue.** At personal-blog scale, even 200 posts with code blocks build in under 2 minutes. Next.js ISR is the natural escape hatch if it ever matters. Not a real risk for years.

**Turbopack/Webpack dev-prod divergence is real but mitigated.** CSS `@layer` ordering and CSS Modules hashing may differ between bundlers. The most likely failure: playground style isolation works in dev but breaks in production due to different stylesheet concatenation order. Vercel preview deploys (already specified) catch this before merge. The document should acknowledge the divergence and name preview deploys as the mitigation. **Classification: Novel.**

**No monitoring for the contact form.** If the form API route fails (Resend outage, schema rejection, rate limit misconfiguration), Matthew doesn't know until someone reports it through another channel. For a job-seeking professional, silent contact form failures have real professional cost. The document should specify a minimum: periodic Vercel function log review, or a Playwright E2E smoke test in CI. **Classification: Novel.**

**Dependency maintenance burden is real but standard.** Next.js annual breaking changes, Tailwind v4 ecosystem maturity, Velite's niche status — this is the cost of a framework-heavy stack. The document covers Velite risk but not the broader burden. Acknowledged but not a specification gap — it's an operational reality of the chosen stack. **Classification: Novel.**

---

## 6. Known Limitations — Completeness Check

The document lists 5 limitations. Missing:

1. **CSP incompatibility with Next.js inline scripts.** The specified `script-src 'self'` is unimplementable. If the decision is to ship permissive CSP, it should be listed as a known limitation.

2. **Stateless rate limiting on serverless.** Per-IP rate limiting requires an external state store not in the dependency list. Either the dependency should be added or this should be listed as deferred.

3. **Turbopack/Webpack behavioral differences.** CSS ordering bugs that only appear in production builds. Mitigated by preview deploys.

4. **No production alerting.** Contact form failures are invisible without active log checking.

**Resend limitation is incomplete.** Beyond "service is down": free tier (100 emails/day) exhaustible by spam, pricing changes (startup risk), DNS/SPF/DKIM configuration for custom domain email. The first is mitigated by honeypot + rate limiting; the rest are standard operational risks.

**Next.js baseline JS impact is understated.** The document says it "does not block initial paint" — true for LCP. But hydration JS affects TBT (Total Blocking Time) and INP (Interaction to Next Paint) on low-powered devices. React hydration is synchronous main-thread work: 50ms on modern devices, 200-400ms on budget Android. For the target audience (recruiters, tech professionals on modern devices), this is unlikely to cause real issues. Lighthouse 90+ remains achievable. A brief mention of TBT/INP impact would make the limitation complete. **Classification: Novel.**

---

## Deliverables

### Top 5 Risks or Gaps

1. **CSP `script-src 'self'` will break Next.js hydration on every page.** Next.js injects inline scripts for RSC payloads and hydration. `script-src 'self'` blocks them all. Every interactive feature fails. This is not a theoretical risk — it triggers on first deploy. Fix: specify the achievable CSP (`'unsafe-inline'` or nonce-based with SSR). **Classification: Novel. Severity: High.**

2. **Per-IP rate limiting has no implementation path on stateless serverless.** Vercel functions share no state between invocations. The specified rate limiting requires Vercel KV / Upstash Redis — an unspecified dependency. Will either cause scope creep or be silently dropped. **Classification: Compounding. Severity: Medium.**

3. **`position: fixed` and viewport units in playground items escape CSS container isolation.** Common creative-coding patterns that `@layer` + CSS Modules cannot contain. First playground item using `position: fixed` overlays the site header. The iframe decision rule needs these as explicit triggers. **Classification: Novel. Severity: Medium.**

4. **Internal vs. external link failure policy is unspecified in CI.** Without distinguishing them, the link checker either blocks deploys on external link rot or allows internal link breakage through. Needs explicit policy: internal = errors, external = warnings. **Classification: Novel. Severity: Medium.**

5. **Contact form failures are invisible without monitoring.** No alerting when the API route fails. Silent failures mean missed professional opportunities. Needs minimum monitoring plan. **Classification: Novel. Severity: Medium.**

### Top 3 Conclusions to Challenge or Reverse

1. **Reverse: `script-src 'self'` for content pages.** Not achievable with Next.js static generation. Replace with the achievable CSP: `script-src 'self' 'unsafe-inline'` with strict `connect-src`, `object-src 'none'`, `base-uri 'self'`, and `frame-src 'self'`. Weaker than claimed but still provides meaningful protection against resource injection. Be honest about the tradeoff.

2. **Challenge: Per-IP rate limiting as a launch requirement.** Replace with staged approach: honeypot only at launch, monitor Resend usage via their dashboard, add KV-backed rate limiting reactively if spam exceeds threshold. Avoids an unplanned dependency for a threat that may never materialize.

3. **Challenge: The iframe decision rule's criteria are incomplete.** Add explicit triggers: third-party libraries that inject global styles, `position: fixed` elements, full-viewport layout (`100vw`/`100vh`), `:root`/`html`/`body` style modifications. These are concrete patterns that escape `@layer` + CSS Modules isolation and will be encountered in real playground items.

### What's Missing

1. **A revised, achievable CSP specification.** Deliverable: concrete CSP header configuration for `next.config.js` that works with Next.js static generation, tested against a built page. Replaces the current unimplementable policy.

2. **A rate limiting implementation decision.** Deliverable: either (a) add Vercel KV / Upstash Redis to the dependency list with configuration spec, or (b) remove per-IP rate limiting from launch scope and replace with "honeypot at launch, KV-backed rate limiting added if spam exceeds N/day."

3. **Expanded iframe decision rule criteria.** Deliverable: 3-4 additional bullet points in the playground architecture section naming the CSS/JS patterns that require iframe isolation.

4. **CI link checker configuration spec.** Deliverable: lychee configuration that treats internal links as errors, external links as warnings, enables fragment checking, and scans RSS/XML output.

5. **Minimum contact form monitoring plan.** Deliverable: periodic check cadence (weekly Vercel function log review) and/or Playwright E2E smoke test in CI that submits the form and verifies a 200 response.
