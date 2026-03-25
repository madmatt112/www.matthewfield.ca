# Adversarial Review: Technology Stack Steering Document (Round 2)

You are a senior staff engineer with 15 years of experience building and maintaining production web applications, including extensive work with Next.js, static site generators, and content-driven sites. You have a low tolerance for hand-waving and specifications that sound complete but collapse under implementation pressure.

Your job is to tear apart the technology stack steering document below. Find every gap, unstated assumption, internal contradiction, and failure mode. Do not validate. Do not praise. If something is actually solid, say so in one sentence and move on.

---

## Prior Review Context

A previous adversarial review (v1) identified significant issues that have since been addressed in the document. The following findings were all accepted and incorporated:

- **Style isolation was undefined** → now specifies CSS `@layer` + CSS Modules with a no-global-CSS constraint.
- **No content validation** → now includes CI-time link checker (lychee) and image reference validator.
- **Contact form unsanitized** → now specifies zod schema, HTML-escaping, honeypot, per-IP rate limiting.
- **CSP would break playground** → now specifies route-scoped CSP (strict for content, relaxed for playground).
- **Playground dependency extraction understated** → now has an explicit decision rule; iframe is first-line isolation.
- **Next.js justification overstated SSR** → now leads with DX benefits as primary rationale.
- **"No unnecessary JS" claim was false** → now acknowledges ~60-85KB baseline as accepted tradeoff.
- **Missing playground server-side convention** → now specifies API route pattern and client-only launch constraint.
- **Missing iframe decision rule** → now included with concrete criteria.

**Do not re-discover these issues.** They are resolved. Focus on novel weaknesses, and on stress-testing the *new specifications* added in response to the v1 review. If you identify something related to a prior finding, classify it as:
- **Novel**: Not identified in any prior review.
- **Compounding**: Builds on or deepens a prior finding that was addressed but incompletely.
- **Recurring**: Same issue identified before but not yet resolved — severity should escalate.

---

## 1. CSS `@layer` + CSS Modules Isolation — Stress-Test the New Specification

The document now specifies that playground items use CSS `@layer playground` below the site's layer in cascade priority, with CSS Modules for scoped class names, inside a container that resets inherited styles. Tear this apart:

- Challenge whether `@layer` actually prevents style leakage in the direction that matters. Layers control *cascade priority* — a playground rule in a lower-priority layer can still match elements outside the playground container if the selector reaches them. Identify concrete scenarios where scoped class names via CSS Modules are insufficient (e.g., playground items using third-party libraries that inject their own global styles, or items that style pseudo-elements on `html`/`body`).
- Examine what "resets inherited styles" means in practice. CSS inheritance applies to properties like `color`, `font-family`, `line-height`, `letter-spacing`. A reset container must explicitly set all inheritable properties. Identify which properties are commonly missed and what visual breakage results.
- Probe the constraint "playground items must not write global CSS rules or unscoped selectors." This is a convention, not an enforcement mechanism. Determine what happens when this convention is violated — is there a build-time check, a linter rule, or is this purely trust-based? For a solo developer writing their own playground items this may be acceptable, but the document should be explicit about the enforcement boundary.
- Consider whether this isolation model works with common creative-coding patterns: CSS animations on `:root`, viewport-relative units (`vh`, `vw`), `position: fixed` elements, `z-index` stacking contexts that escape the container.

## 2. Route-Scoped CSP — Verify the Specification is Actually Implementable

The document now specifies route-scoped CSP: strict for content pages (`script-src 'self'`), relaxed for `/playground/*`. Stress-test this:

- Determine whether Next.js App Router supports per-route CSP headers via `next.config.js` path-based headers in a way that actually works with static generation. Next.js middleware can set headers per-request, but statically generated pages have their headers set at build time via `next.config.js` `headers()` config. Verify that path-matching in `headers()` supports the granularity needed (e.g., `/playground/:path*` vs `/blog/:path*` vs `/`).
- Challenge the `script-src 'self'` claim for content pages. Next.js injects inline scripts for the RSC payload, hydration data, and chunk loading. These require either `'unsafe-inline'` or nonce-based CSP. A strict `script-src 'self'` policy will break Next.js hydration on every page. This is a fundamental compatibility issue — determine whether the document's CSP spec is actually achievable with Next.js.
- Examine what "relaxed policy for `/playground/*`" means concretely. If relaxed means `script-src 'self' 'unsafe-inline' 'unsafe-eval'`, that's effectively no CSP protection. Identify what the minimum viable relaxation is for common playground use cases (canvas, WebGL, external API calls, dynamic style injection).
- Consider the iframe isolation path: playground items loaded via iframe get the `/playground/*` CSP. But what about the parent page that renders the iframe? It needs `frame-src` directives. Is this covered?

## 3. Contact Form Security Spec — Find the Implementation Gaps

The document now specifies zod validation, HTML-escaping, honeypot, and per-IP rate limiting. Probe the details:

- Challenge per-IP rate limiting on Vercel's serverless infrastructure. Vercel functions are stateless — there is no shared memory between invocations. Per-IP rate limiting requires external state (a KV store like Vercel KV/Upstash Redis, or an edge middleware with rate-limit headers). The document doesn't specify where rate-limit state lives. If this is hand-waved as "we'll figure it out in implementation," it will either be dropped or require an unplanned dependency.
- Examine whether the honeypot approach is sufficient against modern bots. Honeypot fields stop naive bots that fill all form fields. They do not stop targeted bots or headless browser automation (Playwright/Puppeteer) that can detect hidden fields. For a personal site, this may be acceptable — but the document should be explicit about what the honeypot does and doesn't protect against, so the tradeoff is conscious.
- Probe the "HTML-escaped before passing to Resend, or sent as plain text" specification. "Or" is doing heavy lifting here. Which is it? If the email template uses HTML formatting (styled layout, clickable links), HTML-escaping user input within that template is the correct approach. If it's plain text, escaping is unnecessary. The implementation needs one answer, not two options.
- Consider what happens when rate limiting triggers: does the user get a clear error message, or a generic 429? What about legitimate users behind a shared IP (corporate NAT, university networks)?

## 4. Content Validation Pipeline — Verify Coverage and Failure Modes

The document now includes CI-time link checking and image reference validation. Dig into gaps:

- Determine whether lychee (or equivalent) running against built static output catches all the failure modes that matter. Lychee checks URLs in rendered HTML — it catches broken `<a href>` links and `<img src>` references. But does it catch: broken anchor links (`#heading-that-was-renamed`), links in MDX that aren't rendered because the component conditionally hides them, references in RSS/Atom XML output, links in `<meta>` tags or structured data?
- Probe what happens when the link checker finds failures in CI. Is the build blocked? Are failures warnings or errors? External link checking is inherently flaky (the target site may be temporarily down). The document needs a policy: internal links are hard failures, external links are warnings with a periodic audit.
- Challenge whether image reference validation covers the Next.js Image component's behavior. `<Image>` with a relative `src` resolves differently than a markdown `![alt](path)` reference. Velite may transform image paths during content processing. The validator needs to understand the transformed paths, not just the raw MDX source.
- Consider frontmatter validation beyond schema types. Velite validates field types, but does it catch: duplicate slugs across content types, future-dated posts appearing in listings, tags with inconsistent casing (`DevOps` vs `devops` creating separate tag pages)?

## 5. Build System and Operational Concerns — What Happens After Launch

The document specifies tools and architecture but is largely silent on operational realities. Probe:

- Challenge the build-time story as content scales. Velite processes all MDX at build time. Shiki highlights all code blocks at build time. Pagefind indexes all pages at build time. Next.js statically generates all pages at build time. For 10 blog posts this is fast. For 200 blog posts with code blocks, estimate the build time. Is there a point where full-site rebuilds become painful? Does Next.js ISR or on-demand revalidation become needed, and if so, does that conflict with the "static-first" architecture?
- Examine dependency upgrade strategy. The stack includes: Next.js (major releases annually with breaking changes), Tailwind v4 (new major version, ecosystem still catching up), Velite (niche tool, uncertain maintenance), shadcn/ui (rolling updates to owned source code), Shiki, Pagefind. What happens when Next.js 16 ships with breaking App Router changes? Is there a policy for staying current vs. pinning? The document's known limitations mention Velite longevity but ignore the broader dependency maintenance burden.
- Probe monitoring and error visibility. The site is deployed to Vercel. If the contact form API route starts failing (Resend outage, rate limit misconfiguration, zod schema rejecting valid input), how does Matthew know? Vercel provides function logs, but is anyone watching them? Is there an alerting mechanism, or do failures go unnoticed until someone reports "I tried to contact you and nothing happened"?
- Consider the development-to-production parity gap. The document mentions Turbopack in dev and Webpack in production. These are different bundlers with different behavior. CSS `@layer` ordering, module resolution, and chunk splitting may differ. Is there a risk that playground isolation works in dev (Turbopack) but breaks in production (Webpack)?

## 6. Known Limitations — Completeness Check

The document lists 5 known limitations. Verify this list is complete given the expanded specification:

- Identify limitations that exist in the architecture but aren't listed. Examples to probe: the Turbopack/Webpack dev-prod gap, the stateless rate-limiting challenge on serverless, the CSP compatibility with Next.js inline scripts, the build-time scaling ceiling.
- Challenge whether "Contact form delivery: Relying on Resend means form submissions fail if the service is down" is the complete picture. What about: Resend rate limits being hit by spam before legitimate users, DNS propagation issues with custom email domains, Resend's free tier being discontinued or pricing changed?
- Examine whether the Next.js baseline JS limitation adequately communicates the tradeoff. The document says it "does not block initial paint" — but does it affect Core Web Vitals metrics beyond LCP? Specifically, does the hydration JS affect Total Blocking Time (TBT) or Interaction to Next Paint (INP) on low-powered mobile devices?

---

## Deliverables

Conclude your analysis with:

1. **Top 5 risks or gaps** — ranked by likelihood of causing implementation problems or production incidents. Be specific: name the failure scenario, not just the category.

2. **Top 3 conclusions to challenge or reverse** — specific decisions in the document that should be reconsidered, with concrete reasoning.

3. **What's missing** — work that should be done before acting on this document. Specify what the deliverable would be, not just "think more about X."

For each finding, classify it as **Novel**, **Compounding**, or **Recurring** per the definitions above.

Be specific and concrete. Cite failure scenarios, not abstract risks. If something is actually fine, say so briefly and move on.

---

Read the technology stack steering document at `/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/tech.md`, then write your complete analysis to `/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/reviews/adversarial-analysis-tech-r2.md`.
