# Adversarial Review: Product Overview — matthewfield.ca

You are a senior product manager and technical architect with 15+ years of experience shipping developer-facing products and personal brand platforms. Your job is to tear apart the product overview document below, find every gap, challenge every assumption, and stress-test every decision. Do not validate. Do not praise. Find what's wrong, what's missing, and what will cause pain later.

Read the document at `/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/product.md`, then perform the following analysis.

---

## 1. Target User Analysis — Challenge the Prioritization and Completeness

- Challenge the claim that "potential employers and recruiters" are the primary audience. The feature set (playground, blog with RSS/series/footnotes, resources page as blogroll) skews heavily toward peer/community engagement. Identify where the stated user priority conflicts with the actual feature investment.
- Stress-test whether the four user segments are actually distinct. A recruiter scanning the site and a peer evaluating a project card have overlapping needs — surface where the document fails to resolve competing UX priorities between these groups.
- Identify missing user journeys. The document never describes how a recruiter actually flows through the site to reach a hiring decision. There is no mention of mobile behavior despite recruiters frequently browsing on phones. Find every unstated assumption about how users will actually navigate.
- Challenge the inclusion of "Matthew himself" as a target user. This conflates authoring ergonomics with product audience. Determine whether this muddies the product thinking or whether it's actually the most important user that deserved more depth.

## 2. Feature Scope and Prioritization — Find the Bloat and the Gaps

- The blog feature list contains 14 distinct sub-features (RSS, search, reading progress bar, series grouping, footnotes/sidenotes, related posts, social sharing, etc.). Attack this scope: which of these are actually necessary for a personal site that doesn't exist yet? Identify features that add implementation cost with minimal value for any stated user segment.
- Challenge the Playground concept's feasibility. "Potentially with its own architecture, dependencies, and even small backends" is an enormous scope statement buried in a single paragraph. Stress-test what "independent thing" actually means for build tooling, deployment, routing, and maintenance burden.
- The Project Showcase has dedicated subpages while the Contributions Gallery does not. Challenge whether this distinction is justified or arbitrary. What happens when a contribution is significant enough to warrant a full writeup?
- Surface the gap between the Professional Profile and the /about slash page. Both describe Matthew as a person. The document says they're distinct ("visual resume" vs. "who is Matthew") but doesn't resolve what content goes where or how a visitor understands the difference. Find the confusion this will cause.

## 3. Success Metrics and Business Objectives — Expose What Can't Be Measured

- "Contact form submissions" is the only metric tied to the primary business objective (professional inbound). Challenge whether a contact form is actually how recruiters reach out in 2026, or whether this is a vanity metric that will show near-zero activity while LinkedIn DMs do the real work.
- "Content velocity" is defined as "able to add new blog posts by editing markdown files." This is a capability, not a metric. Attack the lack of any actual measurement: how many posts per month? What's the threshold for success vs. an abandoned blog?
- "Performance" says "pages load fast" with no target. No Lighthouse score, no LCP target, no bundle size budget. Identify how this vagueness will lead to scope debates during implementation.
- The business objectives mention "independence from platforms" but the success metrics don't measure it. Challenge whether this is a real objective or a philosophical preference masquerading as a business goal.

## 4. Product Principles — Stress-Test for Internal Contradictions

- "Wide and spacious — use the viewport generously" directly conflicts with readability best practices for long-form blog content, which is a core feature. Research consistently shows 50-75 characters per line is optimal. Challenge how this principle will be applied to blog posts, project writeups, and the professional profile without harming readability.
- "Markdown-first content" is stated as a principle but the document also describes React components rendering that markdown, a contact form, dark/light toggle, code syntax highlighting with copy buttons, reading progress bars, and search. Identify where the "simple to maintain" principle will collide with the JavaScript complexity required to deliver these interactive features.
- "Progressive complexity" claims the main site is static/pre-rendered while the playground allows dynamic architectures. Challenge whether this boundary will actually hold. Blog search, contact form submission, and dark/light mode persistence all require client-side behavior. Determine if the static/dynamic boundary is clearly drawn or wishful thinking.

## 5. Missing Concerns — What the Document Doesn't Address

- There is no mention of SEO strategy despite the blog being a primary content channel and "general visitors via search results" being a stated user segment. Find every SEO-relevant gap: meta tags, Open Graph, structured data, canonical URLs, sitemap XML (only HTML sitemap is mentioned).
- There is no mention of accessibility (WCAG compliance, screen reader support, keyboard navigation). For a professional site from an infrastructure engineer, this is a notable omission. Identify the risk.
- There is no discussion of content migration from the existing WordPress.com site. If there are existing blog posts, projects, or pages, the document is silent on whether they transfer, redirect, or get abandoned. Surface the 404/SEO/link-rot implications.
- There is no mention of email delivery infrastructure for the contact form. Where do submissions go? What prevents spam? The document describes the UI but not the backend.
- There is no discussion of responsive design or mobile layout beyond the implied "full-viewport" landing page. Given that recruiters (the primary user) are likely on mobile, this is a critical gap.

---

## Deliverables

After completing your analysis, conclude with:

1. **Top 5 risks or gaps** — ranked by likelihood of causing real problems during implementation or after launch. Be specific: name the feature, the conflict, or the missing piece.
2. **Top 3 conclusions to challenge or reverse** — decisions in the document that may be wrong and should be reconsidered, with concrete reasoning for each.
3. **What's missing** — work that should be completed before this product document is used to drive requirements or design.

Be specific and concrete. Cite failure scenarios, not abstract risks. If something is actually fine, say so briefly and move on.

---

Write your complete analysis to `/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/reviews/adversarial-analysis-product.md`.
