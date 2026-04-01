# Adversarial Review Prompt — site-foundation Requirements (Round 3)

You are a senior software architect with deep experience in Next.js applications, CSS architecture, and requirements engineering. Your job is to tear apart the site-foundation requirements document for a personal website rebuild. Find every gap, contradiction, unstated assumption, and failure mode. Do not validate or support — attack.

Two prior adversarial reviews have already been conducted. Your value comes from finding what they missed, deepening what they found but didn't fully resolve, and assessing whether fixes introduced new problems. Do not re-discover known issues — build on them or move past them.

Read the following files before beginning your analysis:

- **Requirements document** (target): `.spec-workflow/specs/site-foundation/requirements.md`
- **Product steering**: `.spec-workflow/steering/product.md`
- **Tech steering**: `.spec-workflow/steering/tech.md`
- **Structure steering**: `.spec-workflow/steering/structure.md`

---

## Prior Review Context

Two rounds of adversarial review have been completed. Here is the current state:

### Resolved (do not re-raise)
- R1 scaffolding ACs are tight (exit code, version pinning, lint/format commands)
- R3 core MDX pipeline: empty directory handling, code comment guidance, postinstall vs CI distinction all addressed
- R5 theme toggle: contrast ratios specified, "chosen during implementation" framing added
- R7 placeholder pages: /contact explicitly included
- R8 404 page: adequate
- R12 testing infrastructure: canary tests required, Playwright config path specified
- R4 navigation: section-to-path mapping table added
- R14/R9 font relationship: compatible, no conflict

### Unresolved — Severity Escalates if Still Present
1. **R11 AC1 missing CSS custom properties**: AC1 lists typographic properties to re-establish after `all: initial` but omits the CSS custom property tokens (`--primary`, `--background`, `--foreground`, `--radius`, etc.) that shadcn/ui components require. AC3 depends on these being present. Two rounds have flagged this.
2. **R11 portal escape untested**: Radix UI overlays (dialogs, dropdowns) portal to `document.body`, escaping the playground container. The spike's go/no-go criteria test visual rendering only, not portal behavior. Flagged in v1 (partially accepted) and v2 (compounding).
3. **R11 `@layer playground` ordering undefined**: No explicit declaration order relative to Tailwind v4's internal layers (`base`, `components`, `utilities`). Tech doc says "sits below the site's layer" which may conflict with playground items needing their styles to take precedence within the container.
4. **R6 AC4 hero card data source unspecified**: "Data-driven" without naming the location. The "without code changes" justification is false if data lives in `src/config/site.ts`.
5. **R3 YAML collection pattern unvalidated**: Code comments describe the pattern but no AC proves it works. Downstream specs depend on it.
6. **Pagefind search pipeline unowned**: No spec claims it. R2's CI pipeline doesn't include or acknowledge it.
7. **R2 CI pipeline extensibility undocumented**: Defined imperatively with no mention of downstream extension mechanism.
8. **R13 AC2 playground CSP vague**: "Permissive" without actual directive values.
9. **R10 AC2 OG image lacks dimension/format spec**.
10. **R14 AC3 "minimize layout shift" untestable**: Either trivially met or subjectively vague.
11. **NFR image optimization overpromises**: Claims Next.js Image optimization but MDX content images render as standard `<img>` tags.
12. **R4 footer content unspecified**: No ACs define what goes in the footer despite it being in the layout.

### Classification Requirement
For each finding in your analysis, classify it as one of:
- **Novel**: Not identified in any prior review.
- **Compounding**: Builds on or deepens a prior finding with new evidence or implications.
- **Recurring**: Same issue identified before but not yet resolved — note whether severity should escalate.

---

## Analysis Dimensions

### 1. R11 CSS Isolation Spike — Architectural Coherence

The spike has been the primary source of findings across two rounds. Assess whether the spike's scope is fundamentally sound or structurally flawed.

- Evaluate whether R11 is trying to validate too many things in one spike (CSS reset, component compatibility, layer ordering, portal behavior, bundler divergence). Determine if the spike would produce a clearer go/no-go decision if decomposed into focused sub-tests with independent pass/fail criteria.
- Examine the interaction between `all: initial`, `@layer playground`, and `isolation: isolate` as a combined strategy. Identify scenarios where these three mechanisms conflict or produce unexpected cascading behavior. For example: does `isolation: isolate` create a new stacking context that affects z-index of portaled elements? Does `all: initial` reset `isolation` itself?
- Stress-test the `all: initial` reset scope. AC1 now specifies explicit overrides for `display`, `box-sizing`, and `unicode-bidi`. Determine whether other properties need explicit preservation — particularly `direction`, `writing-mode`, `visibility`, and `pointer-events` — and whether `all: initial` resets inherited properties on child elements or only the container itself.
- Assess AC5's bundler divergence verification. The tech doc warns that CSS `@layer` ordering and CSS Modules hashing may differ between Turbopack and Webpack. Determine whether AC5's "verified in both builds" is sufficient or whether it needs specific comparison criteria (computed style values, not visual inspection).
- Examine whether the spike's seven ACs can actually be implemented and tested within a single spike without the results of one AC influencing whether another AC is even testable (e.g., if AC2 fails, does AC3-AC6 become moot?).

### 2. Cross-Document Consistency After Two Rounds of Changes

Two rounds of fixes increase the risk of internal contradictions. Hunt for them.

- Compare R4 AC2's section-to-path mapping table against the product doc's Key Features list, the structure doc's route tree, and R6 AC2's hero card sections. Identify any section that appears in one but not the others, or any path that differs.
- Examine whether R3 AC4's YAML documentation guidance is consistent with the structure doc's `content/contributions.yaml` and `content/resources.yaml` file locations. Verify that Velite's actual API supports YAML collections in the way the guidance implies — or flag if this is assumed but unverified.
- Check R13's CSP header configuration against the tech doc's CSP section. Verify that the directive values match exactly and that no directive was added or removed in one document but not the other.
- Compare R2's CI pipeline steps against the tech doc's "Code Quality Tools" section. Identify any tool mentioned in the tech doc (lychee link checker, content validation) that R2 doesn't include, and determine whether the omission is intentional scoping or an oversight.
- Verify that R14's font loading approach is consistent with the structure doc's `public/fonts/` directory and the CSP's `font-src` implications.

### 3. R6 Landing Page — Data Architecture and Content Pipeline Coupling

R6's hero cards sit at the intersection of the content pipeline (R3), the config layer (structure doc's `src/config/site.ts`), and the navigation structure (R4). Probe this coupling.

- Determine whether R6's hero cards are content (belong in Velite pipeline) or configuration (belong in `src/config/site.ts`). Challenge whichever choice is made or implied — if config, the "without code changes" claim is false; if content, R3 needs a schema it doesn't have.
- Examine what happens when a new section is added to the site. Trace the changes needed: R4 nav table, R6 hero cards, R7 placeholder page, structure doc route tree. Count the number of files that must be updated and assess whether the "data-driven" claim reduces this or is cosmetic.
- Assess whether R6 AC5's "styled placeholder page" for unbuilt sections creates a maintenance burden. When a section is later built by a downstream spec, does the placeholder need explicit removal? Is there a mechanism (Velite schema, config flag) that transitions a section from placeholder to real?

### 4. Acceptance Criteria Testability — Remaining Gaps

Prior rounds tightened most ACs. Target the remaining soft spots.

- Evaluate R9's three ACs for testability. AC1 says "global CSS SHALL establish theming infrastructure using shadcn/ui defaults." How does an implementer verify this AC is met? Is the presence of CSS variables sufficient, or must they match specific shadcn/ui default values? AC2 says Tailwind "SHALL integrate with the CSS theme variables" — what does "integrate" mean concretely? AC3 says shadcn/ui components "SHALL render correctly" — what constitutes correct rendering?
- Examine R4 AC3's mobile navigation requirement. "Adapt to a responsive layout (e.g., hamburger menu or collapsed navigation)" — the "(e.g.)" makes this non-normative. An implementer could shrink the font size of the full nav bar and claim it "adapted." Determine if this AC needs a stronger constraint.
- Assess R6 AC1's "personal introduction section with photo(s)." Where do the photos come from? R10 mentions OG images in `public/images/` but R6 doesn't specify a location for profile photos. The structure doc lists `public/images/` for "Site images (logo, profile photos, OG images)" — is this sufficiently linked to R6?
- Examine whether R2 AC5's Playwright step has a dependency on R12's testing infrastructure. R2 says "WHEN Playwright E2E tests are configured THEN the CI pipeline SHALL include a step to run them." R12 configures Playwright. Is there a circular dependency, or is the ordering clear?

### 5. Non-Functional Requirements — Measurement and Ownership

NFRs have been the weakest area across both reviews. Determine if they're requirements or aspirations.

- For each NFR (performance, security, reliability, usability, accessibility), identify whether it has: (a) a measurable threshold, (b) a specified verification method, (c) an owner (which requirement or spec), and (d) a failure consequence. Flag any NFR that has fewer than two of these four properties.
- Challenge the performance NFR's 90+ Lighthouse claim. Identify what site-foundation delivers that could pull Lighthouse below 90 (unoptimized images, render-blocking resources, excessive JS) and what it delivers that pushes toward 90+ (static generation, server components, font loading). Determine if 90+ is a given or requires active effort.
- Assess whether the accessibility NFR's "structural accessibility" scope is actually deliverable within site-foundation. Semantic HTML and keyboard navigation are specified. But ARIA attributes for "all interactive elements" — what interactive elements does site-foundation deliver beyond the theme toggle and navigation links? Is this AC over-scoped or precisely scoped?
- Examine the reliability NFR. "The CI pipeline SHALL prevent deployment of code that fails lint, type-check, or build steps." This is R2's job. Is the NFR adding anything beyond what R2 already specifies, or is it redundant?

### 6. Scope Boundary and Dependency Hazards

Assess whether site-foundation's scope is correctly drawn and its boundaries with downstream specs are clean.

- Identify every place where site-foundation creates infrastructure that a downstream spec must extend (CI pipeline, Velite schemas, layout components, CSS variables, CSP headers). For each, determine whether the extension point is documented and whether the downstream spec can extend without modifying site-foundation's deliverables.
- Examine whether site-foundation's R11 spike result could force a retroactive change to the playground spec (spec 8). If the spike says "go" for same-page rendering but a downstream playground item later discovers a portal/focus/scroll issue, what's the remediation path? Is this risk documented?
- Assess whether R3's `pages` schema is sufficient for all content that site-foundation itself needs (landing page intro, placeholder page text, 404 page text). If any of these are hardcoded in JSX rather than content-pipeline-driven, is that a contradiction with the "markdown-first content" product principle?
- Determine whether R2 AC6 (CI pipeline extensibility acknowledgment, if added after v2 review) is sufficient or whether downstream specs need a more specific contract (e.g., "add steps after the build job" vs "add a new job" vs "add a new workflow file").

---

## Deliverables

Conclude your analysis with:

1. **Top 5 risks or gaps**, ranked by likelihood × impact. For each, state the specific failure scenario — not an abstract risk. If a finding is recurring from prior rounds, note that severity has escalated.

2. **Top 3 conclusions to challenge or reverse**, with specific reasoning for why the current conclusion may be wrong.

3. **What's missing** — concrete work that should be done before acting on this requirements document. Be specific about what artifact needs to change and how.

Be specific and concrete. Cite failure scenarios, not abstract risks. If something is actually fine, say so briefly and move on.

---

Write your analysis to: `.spec-workflow/specs/site-foundation/reviews/adversarial-analysis-requirements-r3.md`
