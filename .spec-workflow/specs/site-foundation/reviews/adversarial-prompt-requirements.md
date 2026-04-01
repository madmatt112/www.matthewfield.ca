# Adversarial Review: site-foundation Requirements

You are a senior software architect with deep experience in static-site infrastructure, Next.js at scale, and developer tooling. You have been handed a requirements document for a personal website rebuild. Your job is to tear it apart. Find every gap, ambiguity, contradiction, untestable criterion, and missing consideration. Do not validate or support — stress-test.

Read the following files before beginning your analysis:

- `/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/site-foundation/requirements.md` (the target document)
- `/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/product.md`
- `/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/tech.md`
- `/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/structure.md`

---

## 1. Scope Boundaries and Scope Creep Risk

The introduction claims this is "the largest spec by scope" — challenge whether that scope is actually bounded:

- Identify requirements that bleed into downstream specs. R11 (CSS Isolation Spike) is explicitly a research task whose outcome determines another spec's architecture. Assess whether the spike's acceptance criteria are sufficient to produce a clear go/no-go decision, or whether they leave room for an inconclusive result that blocks spec 8.
- R6 (Landing Page) specifies hero cards for every major section. The product steering doc lists sections not mentioned in R4's navigation links (e.g., "Resources" appears in R6 but R4 says "Professional Profile, Projects, Contributions, Blog, Resources, Playground"). Cross-check the section lists across R4, R6, and the product doc for inconsistencies.
- R13 (CSP Headers) defines specific directives. The tech steering doc also specifies CSP policy. Check for contradictions or divergence between the two — if they disagree, the requirements doc has an ambiguity that an implementer will have to resolve on the fly.
- Assess whether R9 (Global Styles) is a requirement or a design task. The acceptance criteria reference "design tokens" without specifying what tokens exist. Challenge whether this is implementable without a design spec or token inventory.

## 2. Acceptance Criteria Testability and Completeness

For each requirement, evaluate whether the acceptance criteria are actually verifiable:

- R1 AC4 ("all dependencies SHALL install without warnings or version conflicts") — challenge the "without warnings" clause. pnpm routinely emits peer dependency warnings that are informational, not errors. This criterion as written would fail on first install of most Next.js projects. Identify whether this is aspirational or testable.
- R3 AC3 specifies behavior when a content directory is empty, then hedges with "IF Velite requires at least one file." This is knowable now — determine whether the AC is specifying a requirement or deferring a research question into implementation.
- R3 AC4 asks for documentation of the schema pattern. Challenge what "documented" means here — a code comment? A section in a README? An example file? This is vague enough to be unverifiable.
- R5 AC5 mandates WCAG 2.1 AA color contrast "WHEN CSS theme variables are defined." The requirement doesn't specify what the theme colors are, making this untestable until design decisions are made. Identify whether this should be a constraint on the design phase rather than an acceptance criterion here.
- R12 (Testing Infrastructure) has three acceptance criteria that amount to "tools are configured." Challenge whether "configured and ready to use" is meaningfully different from "installed." What does a passing test of R12 look like when there are no tests to run?

## 3. Missing User Stories and Unstated Assumptions

Surface requirements that should exist but don't:

- There is no requirement for font loading strategy. The structure doc references `public/fonts/` for self-hosted fonts. The tech doc mentions no font library. Who decides what fonts are used, how they're loaded, and what the fallback chain is? This affects both performance (Lighthouse) and visual consistency.
- There is no requirement for the development experience itself. R1 covers scaffolding, but there's no story for "as a developer, I want `pnpm dev` to start a working dev server with hot reload." This is implicit but untested.
- The product doc mentions a `/contact` slash page that reuses contact components from the Professional Profile. The site-foundation spec includes placeholder pages (R7) but no contact form infrastructure. Is contact form delivery in scope or out of scope for this spec? The tech doc specifies Resend, zod validation, honeypot fields — but none of this appears in the requirements.
- There is no requirement addressing image optimization strategy beyond the non-functional note about Next.js Image component. R6 specifies "photo(s)" on the landing page. What format? What dimensions? What happens if someone drops a 5MB PNG into `public/images/`?
- The Pagefind search integration is mentioned in the tech steering doc but has no requirement in this spec. Is search infrastructure part of site-foundation or a downstream spec? If downstream, which spec owns it? If it's deferred, the CI pipeline (R2) may need adjustment later to accommodate the crawl-then-index build step.

## 4. Contradictions and Tension Between Steering Docs and Requirements

Identify places where the requirements diverge from or incompletely implement the steering documents:

- The tech doc specifies `next.config.js` for CSP headers. R13 AC3 says `next.config.ts`. This is a minor inconsistency but signals copy-paste drift between documents — look for others.
- The tech doc's playground architecture section describes a detailed `@layer` + CSS Modules approach with specific property overrides (`display`, `box-sizing`, `unicode-bidi`). R11's acceptance criteria reduce this to "create a route group with `all: initial` + `isolation: isolate` + `@layer playground`." Assess whether the spike requirements are detailed enough to actually validate the tech doc's architecture, or whether they test a simplified version that won't surface real integration problems.
- The structure doc specifies `e2e/playwright.config.ts` as the Playwright config location. Standard Playwright setup puts this at the project root. R12 says nothing about config location. Check whether this creates an ambiguity an implementer must resolve.
- The product doc lists "Resources" as a major section. R4 includes it in navigation. But the structure doc shows `content/resources.yaml` as a YAML file, not MDX. R3 defines a `pages` schema for "landing page and slash page content as the initial working pattern." Is resources content covered by R3's Velite pipeline, or does YAML content need its own schema? This is an unstated dependency.

## 5. Non-Functional Requirements: Specificity and Enforceability

Challenge whether the NFRs are actionable or aspirational:

- "90+ Lighthouse performance score" — on which page? With what network conditions? Lighthouse scores vary by 5-10 points between runs. Is this measured in CI, manually, or not at all? Without a measurement mechanism in the requirements, this is a wish, not a requirement.
- "WCAG 2.1 AA conformance" appears in both functional (R5 AC5) and non-functional sections. Challenge whether this spec can meaningfully deliver AA conformance when there are no design mockups, no color palette, no typography decisions, and no content. At best, this spec can deliver semantic HTML structure and keyboard navigation — the color contrast and visual accessibility claims require design decisions that aren't in scope.
- "Responsive across desktop, tablet, and mobile breakpoints" — what breakpoints? The tech doc doesn't specify them. Tailwind v4 has defaults, but the requirements don't acknowledge or override them. An implementer has to pick breakpoints with no guidance.
- The security NFR says "No user data is stored or processed in this spec (contact form is spec 2)." But R13 defines CSP headers for the entire site including playground routes. If playground items eventually process user data, the CSP decisions made here constrain those items. Challenge whether the security boundary is correctly drawn.

## 6. Dependency and Ordering Risks

Assess whether this spec can be implemented without circular dependencies or blocking unknowns:

- R11 (CSS Isolation Spike) is a research task. Its outcome determines whether the playground spec uses same-page rendering or iframes. But R13 (CSP Headers) already defines separate CSP policies for playground routes. If the spike fails and everything goes iframe, do the CSP header decisions in R13 still hold? The iframe embed routes are under `/playground/` per the structure doc, so they'd inherit the permissive policy — but this coupling isn't acknowledged in the requirements.
- R2 AC4 says "WHEN Velite content processing is required THEN the CI pipeline SHALL run Velite build before type-checking." R3 AC5 says postinstall should generate `.velite/`. These are two different mechanisms (CI step vs. postinstall hook) for the same goal. Which one is authoritative? Both? If both, what happens when they conflict?
- R4 specifies navigation links to "all major sections" including sections that are placeholder pages (R7). R6 specifies hero cards linking to the same sections. R7 specifies placeholder pages. But there's no requirement specifying what URL paths these placeholder sections live at. The structure doc defines paths (`/profile`, `/projects`, etc.) but the requirements don't reference them. An implementer must consult the structure doc to implement R4, R6, and R7 — this is an implicit dependency that should be explicit.

---

## Deliverables

After your analysis, conclude with:

1. **Top 5 risks or gaps** — the most likely issues to cause implementation problems, rework, or blocked downstream specs. Be concrete: name the requirement, the gap, and a plausible failure scenario.

2. **Top 3 conclusions to challenge or reverse** — decisions or assumptions in the requirements that may be wrong, with specific reasoning for why they should be reconsidered.

3. **What's missing** — work that should be completed before an implementer acts on this document. Be specific about what artifact, decision, or clarification is needed.

Be specific and concrete. Cite failure scenarios, not abstract risks. If something is actually fine, say so briefly and move on.

---

Write your complete analysis to: `/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/site-foundation/reviews/adversarial-analysis-requirements.md`
