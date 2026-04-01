# Adversarial Review: site-foundation Requirements (Round 2)

You are a senior software architect with 15 years of experience shipping production web applications and a particular focus on developer experience, build systems, and specification rigor. You have no attachment to this document — your job is to tear it apart. Find every gap, contradiction, unstated assumption, and failure mode. If something is solid, say so briefly and move on. Spend your time on what's broken.

You are reviewing a requirements specification for the foundational spec of a personal website rebuild. The site is a Next.js App Router project with TypeScript, Tailwind CSS v4, shadcn/ui, Velite (build-time content pipeline), and Vercel deployment. This spec covers project scaffolding, CI/CD, content pipeline, site layout, theming, landing page, placeholder pages, 404, global styles, metadata/SEO, a CSS isolation spike for a playground feature, testing infrastructure, CSP headers, and font loading.

Read the following files before beginning your analysis:

1. **Requirements document** (the target): `/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/site-foundation/requirements.md`
2. **Product steering**: `/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/product.md`
3. **Tech steering**: `/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/tech.md`
4. **Structure steering**: `/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/structure.md`

---

## Prior Review Context

A previous adversarial review (v1) identified significant issues. Most were accepted and addressed — the requirements doc has been substantially revised. The following is a summary of what was found and what happened:

**Addressed (do not re-discover these):**
- R1 AC4 reworded from "without warnings" to "without errors or unresolved version conflicts"
- R3 AC3 resolved — now specifies behavior for empty collections
- R3 AC4 now specifies code comments in velite.config.ts as the deliverable
- R5 AC5 restated with specific contrast ratios and implementation-time framing
- R9 AC1 now explicitly uses shadcn/ui defaults as baseline
- R11 AC1 now includes explicit property overrides and base stylesheet
- R11 AC6 now defines "not acceptably" with concrete failure criteria
- R12 AC4 now requires canary tests per runner
- R4 AC2 now has an explicit section-to-path mapping table
- R7 AC3 now lists /contact as a placeholder
- R2 AC4 and R3 AC5 now clarify their distinct purposes
- R14 (Font Loading) was added as a new requirement
- R12 AC2 now specifies Playwright config location

**Partially addressed (may warrant deeper examination):**
- R11 spike was strengthened but still doesn't test complex interaction patterns (z-index stacking, Radix dialog focus traps, scroll locking). The "not acceptably" criteria cover visual rendering but not behavioral failures.
- 90+ Lighthouse reframed as "design target" with manual audit, but no specific pages or conditions defined.
- WCAG 2.1 AA accessibility NFR now scopes structural vs. content accessibility, but the boundary could be sharper.

**Unresolved (still present in the document):**
- Product doc says landing page hero cards should be "all visible without scrolling" — impossible with six cards on mobile. Requirements don't address this contradiction.
- next.config.ts vs .js inconsistency between requirements and tech doc.
- R3 only covers `pages` schema — no guidance for YAML collection patterns (resources.yaml, contributions.yaml) needed by downstream specs.
- Pagefind search not claimed by any spec; CI pipeline doesn't account for crawl-then-index.
- CSP `/playground/*` glob constrains future per-item security without documenting this as a limitation.
- Image optimization gap: NFR promises Next.js Image optimization, but MDX content images render as standard `<img>` tags through Velite's pipeline.

**Classify each finding in your analysis as:**
- **Novel**: Not identified in any prior review.
- **Compounding**: Builds on or deepens a prior finding.
- **Recurring**: Same issue identified before but not yet resolved — escalate severity.

---

## Analysis Dimensions

### 1. Internal Consistency of the Revised Requirements

The v1 review triggered substantial changes across R1, R3, R4, R5, R7, R9, R11, R12, and the addition of R14. Stress-test whether these changes are internally consistent:

- Verify that R4 AC2's section-to-path mapping table is consistent with R6 AC2's hero card list, R7's placeholder scope, and the structure doc's route tree. Look for any section present in one list but missing from another.
- Check whether R11's expanded AC1 (explicit overrides, base stylesheet) is consistent with AC3 (shadcn/ui rendering) and AC6 (failure criteria). Does the failure definition in AC6 actually cover all the things AC1 now requires?
- Examine whether R14 (Font Loading) creates any tension with R9 (Global Styles) or the NFR performance target. Does the font requirement adequately specify the relationship between font loading and theme variables?
- Verify R7 AC3's `/contact` placeholder doesn't conflict with the structure doc's `api/contact/route.ts` — is it clear that the API route is out of scope for this spec?
- Check whether R3's "pages schema for landing page and slash page content" is sufficient for R6's data-driven hero cards. Where does hero card data live — content pipeline or code?

### 2. R11 CSS Isolation Spike: Behavioral Gaps

The spike was strengthened after v1 but the core concern about testing depth persists. Attack the behavioral completeness:

- The spike tests visual rendering (colors, fonts, spacing) but not interactive behavior. Challenge whether a spike that validates CSS isolation without testing JavaScript-driven behavior (Radix UI portals, focus management, scroll locking) can produce a reliable go/no-go decision for spec 8.
- Examine what happens when `all: initial` resets `pointer-events`, `cursor`, `user-select`, and other interaction-affecting CSS properties. The base stylesheet re-establishes typographic properties — does it also need to re-establish interaction properties?
- The spike tests in "both dev (Turbopack) and production (Webpack) builds" per AC5. The tech doc warns about CSS `@layer` ordering divergence between bundlers. Challenge whether AC5's "verified in both builds" is specific enough — what exactly should be compared, and what constitutes a divergence that triggers the iframe fallback?
- Scrutinize the relationship between the spike's `@layer playground` and Tailwind CSS v4's own layer structure. Tailwind v4 uses CSS cascade layers internally. Does the requirements doc account for layer ordering conflicts between Tailwind's layers and `@layer playground`?

### 3. R14 (Font Loading) — New Requirement Completeness

R14 was added in response to v1 feedback. Examine whether it's actually complete:

- AC2 offers two options (`next/font/local` with self-hosted files OR `next/font/google` with automatic self-hosting) but defers the choice to "a design-phase decision." Challenge whether deferring this is acceptable when it affects build configuration, `public/fonts/` directory usage, and potentially CSP headers (if Google Fonts CDN is used as a fallback).
- Examine whether "system font stack is an acceptable initial baseline" in AC2 conflicts with the product doc's principle of "approachable and human" — system fonts are functional but not distinctive.
- Check whether AC3's fallback font stack requirement is testable. How would an implementer verify that the fallback "minimizes layout shift"? Is there a CLS threshold or is it subjective?
- Determine whether R14 interacts with R13 (CSP). If `next/font/google` downloads fonts at build time and serves them from the same domain, CSP `font-src` isn't needed. But if the implementation changes, CSP could block fonts. Is this coupling documented?

### 4. Cross-Spec Boundary Hazards

This spec is described as the largest and the one all downstream specs depend on. Examine whether the boundaries are clean:

- The Pagefind search integration requires `next build && next start` followed by a crawl, which fundamentally differs from the standard build pipeline in R2. No spec claims ownership. Challenge whether this creates a CI pipeline that can't be extended without modifying site-foundation's requirements.
- R3 defines a `pages` schema but downstream specs need `blog`, `projects`, `contributions`, and `resources` schemas — some MDX, some YAML. R3 AC4 says code comments explain the pattern for adding schemas "covering both MDX and YAML collection types." Verify this guidance is actually sufficient for the YAML case, given that R3's ACs only validate the `pages` (MDX) schema.
- Examine whether R2's CI pipeline is extensible. The pipeline runs "lint, type-check, unit tests (Vitest), and build." Downstream specs need to add Pagefind indexing, link checking (mentioned in tech doc), Lighthouse audits (mentioned in NFR), and potentially more. Is the pipeline designed for extension, or will each addition require reworking R2?
- The NFR says "Images SHALL be optimized via Next.js Image component" but MDX content images go through Velite's copy pipeline as standard `<img>` tags. This gap affects every content spec downstream. Challenge whether this should be addressed here (via a custom MDX `img` component requirement) or explicitly deferred with a documented limitation.

### 5. Acceptance Criteria Precision for Edge Cases

Examine ACs that appear correct but may fail on edge cases:

- R2 AC2: "WHEN code is pushed to main and all checks pass THEN the system SHALL deploy to Vercel automatically." What happens on a merge commit where main advances but the PR's checks ran against a different base? Is there a re-check on main, or does the PR check status carry forward?
- R4 AC4: "the layout shell SHALL persist without full-page reloads (Next.js App Router behavior)." This is App Router's default behavior for client-side navigation. But if a visitor navigates via a full URL (bookmark, external link), there IS a full page load. The AC doesn't distinguish between client-side navigation and direct URL access. Is it testable as written?
- R6 AC4: Hero cards "SHALL be data-driven (defined in a data structure, not hardcoded JSX)." Where is this data structure defined? In a content file processed by Velite? In `src/config/site.ts`? In the page component? The AC forbids hardcoded JSX but doesn't specify the data source, leaving room for an implementer to put a const array in the page component — which is "data-driven" technically but still hardcoded in code.
- R10 AC2: "a default Open Graph image SHALL be available in `public/images/`." What format? What dimensions? OG images have recommended dimensions (1200x630). An implementer could put a 100x100 PNG there and meet the AC. Is this sufficient, or should the AC specify minimum dimensions?
- R13 AC2: Playground CSP "allowing inline styles, external resources, and dynamic code execution." How permissive is "permissive"? Is it `*` for all directives? `unsafe-eval`? The AC doesn't specify the actual directive values for the playground policy, unlike AC1 which lists exact directives for content pages.

### 6. NFR Enforceability and Measurement

Examine whether non-functional requirements can actually be verified:

- "Server Components by Default" — how is this enforced? Is there a lint rule? A test? Or is it purely a convention? If an implementer adds `"use client"` to a page component unnecessarily, nothing catches it.
- "Single Responsibility: Each file has one purpose" — this is a code review heuristic, not a testable requirement. Challenge whether it belongs in requirements or should be a design/implementation guideline.
- The accessibility NFR now scopes structural accessibility to this spec and defers content accessibility. But who owns the color contrast verification for shadcn/ui defaults? R5 AC5 says theme values "SHALL meet WCAG 2.1 AA" and are "verified via automated tooling or manual check." R9 AC3 says shadcn/ui components "SHALL render correctly in both light and dark themes." Neither AC specifies who verifies contrast or when. Is contrast checked during this spec's implementation, or deferred?
- The performance NFR says "static pages should target 90+ Lighthouse performance score" and is a "design target verified via manual Lighthouse audit after deployment." After deployment of which spec? Site-foundation? Every spec? Who runs the audit? This is aspirational without an owner.

---

## Deliverables

Conclude your analysis with:

1. **Top 5 risks or gaps** — ranked by likelihood of causing implementation problems or downstream failures. Be specific: name the requirement, the failure scenario, and the concrete impact.

2. **Top 3 conclusions to challenge or reverse** — decisions or framings in the requirements that should be reconsidered, with specific reasoning for why the current approach is problematic.

3. **What's missing** — work that should be done before an implementer acts on this document. Be concrete about what the deliverable would be.

Be specific and concrete. Cite failure scenarios, not abstract risks. If something is actually fine, say so briefly and move on.

---

Write your analysis to: `/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/site-foundation/reviews/adversarial-analysis-requirements-r2.md`
