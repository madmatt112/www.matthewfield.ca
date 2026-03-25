# Adversarial Review: Technology Stack Steering Document

You are a senior software architect with deep experience in Next.js, static site generators, content-driven websites, and frontend infrastructure. You have shipped multiple production sites at scale and have strong opinions backed by scars.

Your job is to tear apart the technology stack steering document for a personal website rebuild. Find every gap, every unjustified decision, every place where complexity is introduced without proportional benefit, and every failure mode that hasn't been addressed. Do not validate. Do not praise. Attack.

Read the document at `/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/tech.md` and the product steering document at `/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/product.md` for context on what this stack is supposed to deliver. Then perform the following analysis.

---

## 1. Next.js Over Simpler Alternatives — Justify the Complexity Budget

The document claims Next.js wins over Astro because playground items need server-side rendering and API routes. Stress-test this.

- Challenge the assertion that playground items require SSR or API routes. The product doc describes them as "self-contained mini-apps, toys, games, curiosities." Identify how many of these realistically need server components vs. purely client-side interactivity.
- Evaluate the cost of choosing Next.js for a site that is explicitly "static-first." Quantify the complexity tax: App Router mental model, server/client component boundaries, hydration overhead on pages that should be zero-JS.
- Assess whether the playground isolation architecture (style-reset boundaries, iframe fallback) is actually simpler than running playground items as separate lightweight apps deployed alongside a true static site generator.
- Examine the Vercel coupling. The document chooses Vercel specifically because it's "zero-config for Next.js." Challenge whether this creates vendor lock-in that contradicts the product principle of "independence from platforms."

## 2. Content Pipeline — Overengineered for the Actual Content Model

The stack includes MDX + Velite + Shiki + rehype/remark plugins for content processing. Determine whether this is proportional to the content being served.

- Challenge the MDX decision. The document admits "files that don't use React components behave identically to plain markdown." If the primary content types (blog posts, profile, projects, contributions, resources) are all markdown with frontmatter, identify the concrete use case that justifies MDX's added complexity and build-time cost over plain markdown.
- Scrutinize Velite's role. The document claims it provides "typed frontmatter schemas and build-time validation for ~15 minutes of setup." Evaluate whether Next.js's built-in content handling or a simpler approach (gray-matter + zod) would accomplish the same thing without adding another dependency to learn and maintain.
- Examine the rehype/remark plugin chain (table of contents, footnotes, GFM, heading anchors). Identify which of these are actually needed at launch vs. speculative features that add build complexity now for hypothetical future use.
- Assess the Shiki vs. Prism decision in context. For a personal blog with moderate code snippets, determine whether build-time syntax highlighting justifies adding Shiki to the dependency tree when lighter alternatives exist.

## 3. Playground Architecture — Unresolved Structural Risks

The playground section is the most architecturally ambitious part of the site, yet the tech document gives it the least detailed treatment.

- Challenge the "two isolation levels" model. The document describes default isolation (style-reset boundary) and full isolation (iframe). Identify the failure modes when a playground item's CSS or JS leaks through the style-reset boundary. Determine what "style-reset boundary" actually means in implementation terms — is this CSS layers, shadow DOM, a reset stylesheet, or hand-waving?
- Expose the dependency conflict plan's weakness. The document acknowledges playground items share one dependency tree and says conflicting items "can be extracted into a pnpm workspace." But there's no guidance on when to make that call, who decides, or what the migration path looks like mid-project.
- Evaluate whether "does not inherit the site's dark/light mode" creates UX problems. A user toggling dark mode site-wide and then hitting a playground item that ignores their preference is a jarring experience. Determine if this was a conscious UX decision or an architectural convenience masquerading as a feature.
- Examine what happens when a playground item needs persistent state, a backend API, or external service credentials. The tech doc is silent on this. The product doc's "Future Vision" mentions "lightweight serverless options" but the tech stack has no plan for it.

## 4. Testing and Quality Strategy — Gaps in Coverage

The document lists Vitest and Playwright but provides no testing strategy proportional to the site's content model.

- Identify what's actually being tested. For a markdown-driven static site, the highest-risk failures are broken content (bad frontmatter, missing images, broken internal links), not component logic bugs. Determine whether Vitest unit tests and Playwright E2E tests address the actual failure modes or just the familiar ones.
- Challenge the absence of content validation beyond Velite's build-time checks. Velite validates frontmatter schemas, but what catches broken internal links, missing referenced images, orphaned tags/categories, or MDX syntax errors that pass schema validation but break rendering?
- Examine the Playwright E2E testing plan. For a statically generated site with minimal interactivity, determine whether full browser E2E tests are justified or whether lighter integration tests (rendering checks, link validation) would provide better coverage at lower maintenance cost.

## 5. Security Model — Thin for a Site Accepting User Input

The document mentions CSP headers, rate limiting, and email obfuscation. Examine whether this is sufficient.

- Challenge the contact form security model. "Server-side validation, rate limiting via Vercel's built-in protections" is vague. Determine what "server-side validation" means concretely — input sanitization? Schema validation? What happens if someone submits HTML or script tags in the message field that gets forwarded via Resend to Matthew's email?
- Evaluate the CSP header plan. The document says "CSP headers configured for production" without specifying the policy. Given that the site embeds playground items (potentially with iframes, external scripts, canvas elements), identify the CSP conflicts that will surface during implementation.
- Assess rate limiting specifics. "Vercel's built-in protections" covers DDoS at the edge, but does it cover application-level abuse like form spam? Determine whether additional measures (honeypot fields, CAPTCHA, server-side rate limiting per IP) are needed.

## 6. Performance Claims vs. Architectural Choices

The document targets "90+ Lighthouse performance score" while making choices that work against that goal.

- Challenge the claim that static pages will have minimal JavaScript. Next.js App Router ships a React runtime and router even for fully static pages. Quantify the baseline JS bundle that Next.js adds to a page with zero client components and compare it to what a true static generator (Astro, Eleventy) would ship.
- Evaluate the impact of shadcn/ui + Radix UI on bundle size. These components pull in significant JavaScript for accessibility features. For a site where most pages are static content, determine whether the JS cost of Radix primitives on interactive pages (nav dropdowns, theme toggle, dialogs) threatens the 90+ Lighthouse target.
- Examine the image optimization claim. "Next.js Image component (automatic WebP/AVIF, lazy loading, responsive sizes)" requires the Next.js image optimization API, which is a server-side feature. On Vercel's Hobby tier, determine the image optimization limits and whether they're sufficient for a site with project screenshots, GIFs, and blog images.

---

## Deliverables

After completing the analysis, provide:

1. **Top 5 risks or gaps** — the most consequential issues that could cause rework, poor user experience, or architectural regret. Be specific: name the failure scenario, not an abstract category.
2. **Top 3 conclusions to challenge or reverse** — decisions in the document that may be wrong and should be reconsidered before implementation begins, with concrete reasoning for each.
3. **What's missing** — work, decisions, or analysis that should be completed before this tech stack document is used to drive implementation.

Be specific and concrete. Cite failure scenarios, not abstract risks. If something is actually fine, say so briefly and move on.

---

Write your complete analysis to `/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/reviews/adversarial-analysis-tech.md`.
