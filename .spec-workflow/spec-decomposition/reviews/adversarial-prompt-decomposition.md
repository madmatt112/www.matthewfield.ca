# Adversarial Review: Spec Decomposition

You are a senior software architect with 15+ years of experience shipping personal and commercial web projects, with deep expertise in Next.js, static site generators, and incremental delivery planning. You have seen dozens of spec decompositions fail — scope creep disguised as "foundation" specs, specs that look independent but share hidden coupling, vertical slices that aren't actually vertical, and decompositions that optimize for parallelism on paper but create integration nightmares in practice.

Your job is to tear apart the spec decomposition below. Find every gap, every unstated assumption, every spec that violates INVEST principles, every dependency that's missing from the graph, and every cross-spec convention that will fall apart during implementation. Do not validate. Do not praise. If something is actually fine, say so in one sentence and move on.

---

## 1. Foundation Spec Scope — Too Much or Too Little?

Spec 1 (site-foundation) absorbs an enormous surface area: Next.js scaffolding, Tailwind v4, shadcn/ui, Velite pipeline with stubbed schemas for all content types, root and site layouts, header/nav/footer, theme toggle, landing page with hero cards, global styles, CSS theme variables, CSP headers, custom 404, TypeScript strict mode, ESLint + Prettier, .nvmrc, pnpm pin, CI/CD via GitHub Actions, XML sitemap, Vitest config, and Playwright config.

- Challenge whether this is truly one atomic deliverable or a dumping ground for "everything before real work starts." Identify which items could fail independently and block different downstream specs.
- Stress-test the claim that stubbing Velite schemas for all content types belongs in spec 1. Velite schema design requires knowing the final shape of each content type — blog frontmatter fields, project metadata, contribution structure. If those schemas change during their own specs, the stub was wasted work or worse, a misleading contract.
- Evaluate whether CI/CD (GitHub Actions with lint, type-check, test, build, deploy) belongs in spec 1 or should be its own thin spec. A broken CI pipeline blocks every other spec. A buggy landing page blocks nothing.
- Assess the risk of the hero card component being designed in spec 1 before the content that populates cards in specs 3, 5, 6, and 8 is understood. The decomposition says "establish the card component pattern here since it's reused" — challenge whether this creates premature abstraction.
- The "What Is NOT a Spec" table says E2E tests for the theme toggle belong in site-foundation. But the theme toggle is also built in site-foundation. This means spec 1 must set up Playwright, configure it, write tests, and build the feature. Evaluate whether this balloons spec 1 further.

---

## 2. Dependency Graph Accuracy and Hidden Coupling

The dependency graph shows a simple fan-out: spec 1 feeds specs 2, 3, 5, 6, 7, 8, and spec 3 feeds spec 4. Six specs allegedly parallelizable after foundation.

- Identify hidden dependencies not captured in the graph. For example: the contact form (spec 2) and the contact slash page (spec 7) share the same contact components. Spec 7 says it's "best implemented after other content specs are complete" for sitemap coverage. Is this a soft or hard dependency? If spec 7's /contact reuses components from spec 2, shouldn't spec 7 formally depend on spec 2?
- The decomposition states /contact is "already built in the professional-profile spec." But /contact is listed under spec 7 (slash-pages). Determine whether this is a contradiction — is /contact delivered in spec 2 or spec 7? If spec 2, why is it listed under slash-pages scope? If spec 7, the professional-profile spec's contact components have no consuming page until spec 7 ships.
- Evaluate whether blog-enhanced (spec 4) has a hidden dependency on site-foundation's CI pipeline. Pagefind requires `next build && next start` + crawl in CI. The decomposition recommends deferring Pagefind CI setup to spec 4, but spec 1 owns CI/CD. Spec 4 must modify spec 1's CI configuration. Is this an undeclared reverse dependency?
- Challenge whether specs 5 (project-showcase) and 6 (contributions-and-resources) are truly independent of each other. Both display "cards" on gallery pages. Both are portfolio evidence. If they share visual patterns, implementing them in parallel risks divergent card designs unless the card component from spec 1 is sufficiently specified.

---

## 3. Vertical Slice Integrity — Are These Specs Independently Valuable?

INVEST requires each spec to be independently valuable. Stress-test this claim for each spec.

- Spec 6 (contributions-and-resources) bundles two unrelated features: open-source contributions and a bookmarks/resources page. These share no UI components, no data source, and no user journey. Challenge why they're one spec instead of two. If the justification is "both are small," evaluate whether that's a valid reason to violate single-responsibility.
- Spec 7 (slash-pages) bundles five pages: /about, /colophon, /now, /sitemap, /slashes. These have no shared logic beyond "MDX page rendering" (which is a framework capability, not spec-specific work). /sitemap is component-only and queries all routes programmatically — architecturally different from the MDX-driven pages. Challenge whether this is a coherent vertical slice or a catch-all for "leftover pages."
- Spec 4 (blog-enhanced) bundles search, RSS, series UI, related posts, social sharing, and reading progress bar. These are six distinct features with no shared implementation. Evaluate whether any of these should be split out or absorbed into blog-core, particularly RSS (which is a standard blog expectation, not an "enhancement").
- Spec 8 (playground) delivers architecture and two sample items. Challenge whether the sample items are sufficient to validate the architecture. The decomposition acknowledges two isolation modes (same-page and iframe) — but the playground also requires a manifest system, dynamic imports, a gallery page, and a permissive CSP override. Evaluate whether this spec is testable without real content.

---

## 4. Cross-Spec Convention Gaps

The decomposition defines four cross-spec conventions: MDX content pattern, card component pattern, page layout pattern, and Velite schema pattern. Stress-test whether these are sufficient.

- The card component pattern says cards "share a consistent visual language but vary in content." Challenge what "consistent visual language" means without a design system or visual spec. How will the implementer of spec 5 (projects) know their gallery cards should match the blog index cards from spec 3? The convention is too vague to enforce consistency.
- The Velite schema pattern says content query helpers live in `src/lib/content.ts`. But there's no convention for how specs add to this file. If specs 2, 3, 5, and 6 all add query helpers to the same file concurrently (since they're parallelizable), this creates merge conflicts. Identify whether the decomposition addresses concurrent modification of shared files.
- The contact component reuse convention says form, email, and social links live in `src/components/shared/`. But spec 2 (professional-profile) builds these components, and spec 7 (slash-pages) consumes them. There's no convention for the component API contract — what props the contact form accepts, what the email obfuscation component's interface looks like. Spec 7's implementer has to reverse-engineer spec 2's component API or coordinate out-of-band.
- There is no cross-spec convention for error handling patterns, loading states, or metadata/SEO (title, description, OG tags). Each spec will invent its own approach unless conventions are established. Evaluate whether this is a real risk or acceptable for a single-developer project.

---

## 5. Open Questions That Block Implementation

The decomposition lists four open questions. Evaluate whether they are actually open or whether the answers are already implied by the decomposition's own decisions.

- Open question 1 asks whether hero cards should use placeholder pages or iteratively update the landing page. The decomposition already recommends placeholder pages and spec 1's scope includes "hero cards linking to each major section." This isn't open — it's decided. If it's genuinely open, spec 1 can't be implemented without resolving it. Flag this as either a false open question or a blocker.
- Open question 2 asks whether the blog should be one or two specs. The decomposition already splits it into specs 3 and 4. This is decided. Remove it or explain what would change the decision.
- Open question 3 asks whether Pagefind CI belongs in site-foundation or blog-enhanced. The decomposition already recommends blog-enhanced. Same issue — decided but listed as open.
- Open question 4 asks whether sample playground items should be real or test fixtures. The decomposition already recommends test fixtures. Same pattern.
- Identify open questions that are actually unresolved and should be listed: How does the Velite `#site/content` import alias work before any content exists (spec 1 builds before content specs)? What happens to the landing page hero cards when a section's spec fails or is deferred? Is there a deployment strategy for shipping specs incrementally, or must all 8 land before the site goes live?

---

## 6. Spec Sizing and Estimability

- Spec 1 (site-foundation) is by far the largest spec. It includes framework setup, content pipeline, UI foundation, CI/CD, and a complete landing page. Compare its scope to spec 6 (contributions-and-resources), which is two YAML-driven pages. Challenge whether these specs are comparable in size and whether the decomposition has a spec sizing problem.
- Spec 3 (blog-core) includes: blog index, individual post pages, MDX rendering, Shiki syntax highlighting, copy-to-clipboard, tags and categories with filtering, reading time, TOC generation, prev/next navigation, draft exclusion, footnotes/sidenotes, last-updated display, and code block styling. That's 12+ distinct features in one spec. Evaluate whether this is actually "core" or whether it's an entire blog product crammed into one deliverable.
- Spec 8 (playground) requires solving CSS style isolation (`all: initial`, `@layer`, CSS Modules), a manifest system, dynamic imports, two isolation modes, and a permissive CSP. This is architecturally the most complex spec. Challenge whether its position as spec 8 (last in recommended order) means its architectural risks are discovered too late.

---

## Deliverables

After your analysis, conclude with:

### Top 5 Risks or Gaps
Rank the five most serious issues that could cause implementation failure, wasted work, or integration problems. Be specific — cite the spec numbers, the conflicting claims, and the failure scenario.

### Top 3 Conclusions to Challenge or Reverse
Identify three decisions in the decomposition that you believe are wrong or should be reconsidered, with specific reasoning for why the current conclusion is flawed.

### What's Missing
List concrete work that should be done before any spec implementation begins, based on gaps you identified above.

Be specific and concrete. Cite failure scenarios, not abstract risks. If something is actually fine, say so briefly and move on.

---

Write your complete analysis to: `/home/mcf/repo/matthew-field.ca/.spec-workflow/spec-decomposition/reviews/adversarial-analysis-decomposition.md`
