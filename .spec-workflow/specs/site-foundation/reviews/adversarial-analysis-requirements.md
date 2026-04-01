# Adversarial Analysis: site-foundation Requirements

## 1. Scope Boundaries and Scope Creep Risk

### R11 (CSS Isolation Spike) — Inconclusive Outcome Risk

R11 AC6 says: "IF the spike determines that same-page isolation does not work acceptably THEN the finding SHALL be documented and the playground spec (spec 8) SHALL default to iframe-only isolation." The word "acceptably" is doing heavy lifting. AC2 tests basic `all: initial` with a plain div. AC3 tests a single shadcn/ui component. AC4 tests Tailwind utilities. AC5 tests both themes and both bundlers. These are necessary conditions but not sufficient — the spike doesn't test the *interactions* that actually break in practice: z-index stacking across layers, focus-trap behavior from Radix UI dialogs, scroll locking, or CSS custom property inheritance across the isolation boundary. A spike that passes all five ACs could still produce a "works for trivial cases, breaks for real playground items" outcome. The go/no-go decision criteria should specify what "not work acceptably" means — otherwise an implementer will pass the spike, the playground spec will assume same-page rendering works, and the first non-trivial playground item will discover it doesn't.

### R6/R4 Section List — Cross-Reference Check

R4 AC2 lists navigation links: "Professional Profile, Projects, Contributions, Blog, Resources, Playground." R6 AC2 lists hero cards: "Professional Profile, Projects, Contributions, Blog, Resources, Playground." These match each other. The product doc's landing page description (section 1) lists hero cards for "Professional Profile, Project & Contribution Showcase, Blog, Playground" — only four items, combining Projects and Contributions, and omitting Resources. This is a divergence: the requirements spec has six section links/cards, the product doc describes four. The product doc's section 6 (Resources) and section 4 (Contributions Gallery) exist as distinct features, so the requirements' expansion to six cards is defensible, but the product doc's landing page description hasn't been updated to match. This creates a risk that someone consulting the product doc directly will question whether Resources and Contributions deserve hero cards.

Additionally, the product doc's landing page says "All visible without scrolling." Six hero cards on mobile will almost certainly require scrolling. This constraint is absent from R6 and is likely unachievable on small screens without sacrificing card content or readability.

### R13/Tech Doc CSP — Contradiction Check

R13 AC1 specifies: `script-src 'self' 'unsafe-inline'`, `style-src 'self' 'unsafe-inline'`, `img-src 'self' data:`, `object-src 'none'`, `base-uri 'self'`, `frame-src 'self'`, restrictive `connect-src`. The tech doc's security section specifies the same directives verbatim. No contradiction on the CSP content itself. However, R13 AC3 says headers are defined in `next.config.ts`. The tech doc says `next.config.js`. This is a direct contradiction on file extension. Given that R1 establishes TypeScript throughout and the structure doc shows `next.config.ts`, the requirements doc is correct and the tech doc has a stale reference. An implementer following the tech doc would create the wrong file. Low severity but confirms copy-paste drift between documents.

### R9 (Global Styles) — Design Task Masquerading as a Requirement

R9 AC1 says global CSS "SHALL define theme variables for colors, fonts, spacing, and other design tokens." There is no design spec, no token inventory, no color palette, no typography decision anywhere in the steering documents. The product doc says "wide and spacious" and "approachable and human" but doesn't define what that looks like. An implementer of R9 must invent design tokens from scratch. This requirement is a design task disguised as a development task. It's implementable only if interpreted as "set up the Tailwind/shadcn/ui default theme variables and verify they work in both themes" — but the acceptance criteria don't say that. If interpreted literally ("define *the* design tokens for the site"), it requires design decisions not made in any document. R9 should either explicitly state that shadcn/ui defaults are the initial baseline, or depend on a design spec that doesn't exist.

## 2. Acceptance Criteria Testability and Completeness

### R1 AC4 — "Without Warnings" Is Untestable

pnpm routinely emits peer dependency warnings on Next.js projects. The `@radix-ui/*` packages that shadcn/ui depends on trigger peer dependency notices. `pnpm install` completing "without warnings" on a project with Next.js + shadcn/ui + Radix would require suppressing warnings via `.npmrc` overrides, which hides legitimate problems alongside noise. This criterion as written would fail on first install and is not meaningfully testable. It should be reworded to "without errors or unresolved version conflicts" — `pnpm install` exiting 0 is the testable criterion.

### R3 AC3 — Deferred Research Question

"IF Velite requires at least one file per collection THEN the system SHALL include placeholder content files." This is knowable now — Velite's behavior with empty collections is deterministic and testable. The AC embeds a research question into an acceptance criterion. An implementer doesn't know whether they've met the AC until they determine Velite's behavior, at which point they implement whichever branch applies. A reviewer can't confirm the AC is met without re-running the same investigation. This should be resolved before implementation: test Velite with an empty collection, determine the behavior, and write a concrete AC. Five minutes of research eliminates the ambiguity.

### R3 AC4 — "Documented" Is Vague

"The system SHALL document the schema pattern (in code comments or a README section) for adding schemas to `velite.config.ts`." The parenthetical offers two options without choosing. A reviewer could pass or fail a PR that has code comments but no README section. Additionally, the structure doc explicitly says "No README files per module. The structure.md (this document) is the project-level structural reference." If an implementer writes a README section, they contradict the structure doc. If they write a code comment, is `// Add new schemas here` sufficient? The AC needs a specific deliverable: "code comments in `velite.config.ts` explaining the pattern for adding a new schema" would be verifiable and consistent with the structure doc.

### R5 AC5 — Untestable Without Design Decisions

"WHEN CSS theme variables are defined THEN both light and dark themes SHALL have sufficient color contrast to meet WCAG 2.1 AA requirements." This is a constraint on values that don't exist yet. R9 establishes that theme variables will be defined, but doesn't specify what they are. You cannot test color contrast of undefined colors. If the implementer uses shadcn/ui defaults, those defaults meet AA — but the AC doesn't say that. This should be restated as: "Theme variable values chosen during implementation SHALL meet WCAG 2.1 AA color contrast ratios (4.5:1 normal text, 3:1 large text), verified via automated tooling or manual check."

### R12 — "Configured and Ready to Use" Is Tautological

R12 AC1: "WHEN Vitest is configured THEN `pnpm test` SHALL run unit tests and report results." With zero test files, Vitest exits 0 with "no tests found." Technically that's "running unit tests and reporting results." AC2 has the same problem for Playwright. AC3 says tests "SHALL be runnable both locally and in CI" — vacuously true with zero tests.

The real verification that the infrastructure works is: a test can be added, imported, and executed successfully — which requires at least one canary test proving the configuration resolves path aliases, transforms TSX, and integrates with the test runner. Without that canary, an implementer could install Vitest with a broken config, meet all three ACs (exits 0, no tests found), and the first downstream spec that adds a real test discovers the configuration doesn't work.

## 3. Missing User Stories and Unstated Assumptions

### Font Loading Strategy — Missing

The structure doc specifies `public/fonts/` for self-hosted fonts. R9 references "fonts" as a design token. But no requirement specifies: what fonts, how they're loaded (`@font-face` vs. `next/font`), what the fallback chain is, or whether font files need to be committed. Next.js has `next/font` which handles font loading with zero layout shift — but it requires explicit configuration. If an implementer uses `next/font/google`, fonts aren't self-hosted (contradicting `public/fonts/`). If they use `next/font/local`, they need font files. If they use neither, font swap causes layout shift that degrades the 90+ Lighthouse target. The absence of a font requirement means this decision is made ad hoc during implementation with no acceptance criteria to validate against.

### Development Server — Implicit, Untested

No requirement says "`pnpm dev` starts a working development server with hot reload." R1 covers scaffolding. R2 covers CI. The most basic developer workflow is assumed but never specified. Low risk — Next.js scaffolding provides this by default — but if Velite integration breaks the dev server (postinstall hook doesn't run before `next dev`, Turbopack can't resolve `#site/content`), there's no AC that catches it.

### Contact Form Infrastructure — Scope Ambiguity

The product doc describes `/contact` as a slash page reusing contact components. The tech doc specifies Resend, zod validation, honeypot fields. The structure doc shows `src/app/(site)/contact/page.tsx` and `src/app/api/contact/route.ts`. But the security NFR says "contact form is spec 2." Contact infrastructure is out of scope — but `/contact` as a route exists in the structure doc's site-foundation file tree. The `/contact` route should be a placeholder page under R7, with form infrastructure delivered in spec 2. This isn't stated. An implementer creating the directory structure per the structure doc would create an `api/contact/` directory that has no requirement backing it in this spec.

### Image Optimization — Gap Between Next.js Image and MDX Content Images

The NFR says "Images SHALL be optimized via Next.js Image component." R6 specifies "photo(s)" on the landing page. But content images referenced in MDX via `![alt](./image.png)` go through Velite's copy pipeline to `public/static/`, not through the Next.js `<Image>` component. Standard markdown image syntax produces `<img>` tags, not `<Image>` components. There's a gap between the NFR's promise (optimized via Next.js Image) and the actual MDX rendering pipeline (standard `<img>` tags). This gap surfaces when blog posts with large images are added — they won't get WebP/AVIF conversion, lazy loading, or responsive sizes unless a custom MDX component overrides the default `img` element.

### Pagefind Search — Ownership Unclear

The tech doc describes Pagefind's crawl-then-index build step. The structure doc shows `public/pagefind/` as a gitignored build artifact. No requirement in this spec mentions search. The CI pipeline (R2) doesn't account for `next build && next start && pagefind crawl`. If search is a downstream spec, it must modify the CI pipeline established here — the Pagefind workflow requires a running server to crawl, which is a fundamentally different CI step than a standard `next build`. This should be explicitly deferred to a named spec with a note that CI modifications will be needed.

## 4. Contradictions and Tension Between Steering Docs and Requirements

### next.config.ts vs. next.config.js

R13 AC3 and the structure doc use `.ts`. The tech doc's security section uses `.js`. The tech doc has a stale reference. No ambiguity in practice — TypeScript is correct — but it confirms the documents aren't fully synchronized.

### Playground Spike Depth vs. Tech Doc Architecture

The tech doc specifies: `all: initial` with explicit overrides for `display`, `box-sizing`, and `unicode-bidi`; `isolation: isolate`; `@layer playground`; CSS Modules for scoped class names; a playground base stylesheet re-establishing CSS custom properties. The structure doc adds that `all: initial` resets inherited typographic properties and a playground base stylesheet "must" re-establish them for shadcn/ui compatibility.

R11 AC1 specifies only `all: initial` + `isolation: isolate` + `@layer playground`. Missing: explicit property overrides, CSS Modules verification, and the playground base stylesheet. R11 AC3 says shadcn/ui should render correctly "either by re-establishing required CSS custom properties via a playground base stylesheet or by functioning without them." This "or" contradicts the structure doc, which says the base stylesheet "must" re-establish these properties. The spike allows an outcome the structure doc says won't work. A result of "shadcn/ui renders without custom properties" would pass the spike AC but produce a false positive — the component may render but look wrong (wrong fonts, wrong spacing, wrong colors).

### Playwright Config Location

The structure doc puts `playwright.config.ts` at `e2e/playwright.config.ts`. Standard Playwright setup puts it at the project root. R12 says nothing about config location. An implementer running `pnpm create playwright` gets a root-level config. Moving it to `e2e/` requires `--config e2e/playwright.config.ts` on every Playwright invocation and in CI. Neither R12 nor the CI pipeline (R2) acknowledges this. The structure doc should be authoritative, but the discrepancy with Playwright defaults means extra configuration that isn't captured in any requirement.

### Resources Content Format — Schema Gap

The structure doc shows `content/resources.yaml` as YAML. R3 defines a `pages` schema "for landing page and slash page content as the initial working pattern." Resources is structured data, not a page. R3 doesn't define YAML schemas. Velite supports YAML collections, but R3's acceptance criteria only cover the `pages` schema.

This isn't a blocker for site-foundation — R7 placeholder pages for Resources don't need Velite content. But R3 AC4 ("document the schema pattern") should note that YAML collections follow a different pattern than MDX collections, so downstream specs adding Resources or Contributions schemas have guidance.

## 5. Non-Functional Requirements: Specificity and Enforceability

### "90+ Lighthouse Performance Score" — Unmeasured

No specification of: which pages, what network conditions, what throttling profile, CI-automated or manual, how run-to-run variance (5-10 points) is handled. The CI pipeline (R2) includes lint, type-check, test, build — not Lighthouse. Without a measurement mechanism, this is a wish. A fresh Next.js static page will likely score 95+ by default, so the NFR is probably satisfied without effort — but it can't be verified as written. Either add Lighthouse CI to R2 with a budget file, or reframe this as a design target rather than a pass/fail criterion.

### WCAG 2.1 AA Conformance — Premature Claim

This spec can deliver: semantic HTML structure (R4 AC5), keyboard-navigable interactive elements, ARIA attributes via Radix UI, no-FOUC theme handling. This spec cannot deliver: color contrast conformance (no finalized palette), image alt text coverage (no content beyond landing page photo), screen reader testing (no requirement for it). The NFR should be scoped to structural accessibility: "semantic HTML, keyboard navigation, and ARIA attributes for all interactive elements. Color contrast and content accessibility are constraints on downstream design and content phases."

### Responsive Breakpoints — Unspecified

"Responsive across desktop, tablet, and mobile breakpoints" — Tailwind v4 defaults are `sm: 640px`, `md: 768px`, `lg: 1024px`, `xl: 1280px`, `2xl: 1536px`. The requirements don't reference them. "Tablet" isn't a Tailwind breakpoint. If the requirements mean "use Tailwind's responsive defaults," they should say that. If they mean specific viewport widths, those should be listed. An E2E test verifying "responsive" has no defined viewport sizes to test against.

### Security Boundary — CSP Constrains Future Specs

R13 defines permissive CSP for `/playground/*`. The security NFR says "No user data is stored or processed in this spec." True for now, but the CSP decisions persist. If a playground item eventually processes user input, the permissive CSP is a vulnerability. The glob pattern `/playground/*` in `next.config.ts` headers doesn't support per-item overrides without additional header rules. This is acceptable given the stated threat model (playground items have no auth, no stored data) but should be documented as a constraint: individual playground items needing stricter security must add their own header overrides.

## 6. Dependency and Ordering Risks

### R11 Failure + R13 CSP Coupling

If R11's spike fails and playground goes iframe-only, embed routes at `/playground/[item]/embed` inherit the permissive CSP via the `/playground/*` glob. The parent page at `/playground/[item]` also gets the permissive CSP, which is wasteful but not harmful — it's just an iframe wrapper. **This coupling works correctly in both spike outcomes.** No issue.

### R2 AC4 vs. R3 AC5 — Dual Mechanism

R2 AC4: CI runs Velite build before type-checking. R3 AC5: postinstall generates `.velite/`. These are complementary — postinstall is for local dev ergonomics (editor type resolution after `pnpm install`); the CI step ensures content is fresh before build. The risk is if an implementer considers them redundant and implements only one. The requirements should clarify their distinct purposes: postinstall serves local development; the CI step is authoritative for builds.

### R4/R6/R7 — URL Paths Not in Requirements

R4 requires links to six sections. R6 requires hero cards for six sections. R7 requires placeholder pages. None specify URL paths. The structure doc defines paths (`/profile`, `/projects`, `/contributions`, `/blog`, `/resources`, `/playground`). An implementer must consult the structure doc to implement these requirements. If the structure doc changes paths, the requirements don't update. An implementer could create `/professional-profile` instead of `/profile` and be technically correct per the requirements but inconsistent with the structure doc. The requirements should either list the paths directly or explicitly reference the structure doc as authoritative for URL paths.

---

## Deliverables

### Top 5 Risks or Gaps

1. **R9 (Global Styles) has no design inputs.** Theme variables for colors, fonts, and spacing are required but no design spec, palette, or token inventory exists. Failure scenario: implementer picks arbitrary values; Matthew rejects them in review; rework delays the entire foundation spec. Alternatively, implementer uses shadcn/ui defaults, which is safe but wasn't stated — leading to confusion about whether R9 is "done."

2. **R11 (CSS Isolation Spike) tests trivial cases, not the real architecture.** The spike tests `all: initial` with a plain div and one shadcn/ui component. The tech doc's architecture includes explicit property overrides, a playground base stylesheet, and CSS Modules. The spike can pass while the actual architecture fails. Failure scenario: spike passes; spec 8 builds on same-page rendering; first complex playground item (dialog with focus trap, positioned tooltip) breaks isolation; rework to iframes.

3. **R1 AC4 ("no warnings") will fail on first install.** pnpm peer dependency warnings are routine on Next.js + Radix UI projects. Failure scenario: implementer spends hours trying to suppress warnings, or adds `.npmrc` overrides that mask real conflicts, or ignores the AC — creating review ambiguity about whether the requirement is met.

4. **Font loading strategy is unspecified.** No document addresses font selection, loading method, or fallback chain. Directly impacts Lighthouse scores (CLS from font swap), visual identity, and theme variables. Failure scenario: implementer uses Google Fonts CDN (contradicting self-hosted intent) or `@font-face` without `next/font` optimization (causing layout shift), or system fonts (not matching desired visual identity). Decision made ad hoc, potentially reworked later.

5. **URL paths for sections are implicit.** R4, R6, and R7 reference sections by name but not by path. Structure doc defines paths. Failure scenario: implementer uses `/professional-profile` instead of `/profile`; downstream specs reference structure doc paths; links break across specs. Low probability but easily preventable.

### Top 3 Conclusions to Challenge or Reverse

1. **R11 should test the tech doc's actual architecture, not a simplified version.** The spike exists to validate whether the tech doc's playground approach works. Testing a simpler version proves a simpler approach works — it doesn't validate the architecture that spec 8 will build on. AC1 should include the explicit `display`/`box-sizing`/`unicode-bidi` overrides and require the playground base stylesheet. AC3 should require the base stylesheet approach (the structure doc says it's necessary) rather than allowing "functioning without them" as a valid outcome.

2. **R9 should require theming infrastructure, not design token definitions.** The current wording ("define theme variables for colors, fonts, spacing") implies design decisions no document has made. Reframe to: "establish CSS variable infrastructure and Tailwind integration using shadcn/ui defaults as the initial baseline." This decouples infrastructure work (in scope) from design work (not yet scoped) and gives the implementer a clear target.

3. **The "90+ Lighthouse" NFR should either be automated or removed as a pass/fail criterion.** Without a measurement mechanism (which pages, what conditions, CI or manual), it's unenforceable. Either add Lighthouse CI to R2 with a budget file and specific pages, or reframe it as "static pages should minimize client-side JavaScript; Lighthouse performance is a design target, not a gate."

### What's Missing

1. **Font loading decision.** A single line: "Use `next/font` with [font name] and system fallback stack" or "Use system font stack as the initial baseline." Needed before implementation — affects R9 theme variables, Lighthouse scores, and visual identity.

2. **Design token baseline or explicit "infrastructure only" scoping for R9.** Either provide initial values ("use shadcn/ui defaults") or state that R9 delivers infrastructure and actual design values are a separate task. Without this, the implementer doesn't know when R9 is done.

3. **Explicit URL path list.** R4, R6, and R7 should include a table mapping section names to paths (`Professional Profile → /profile`, etc.) or explicitly reference the structure doc. Low effort, prevents misalignment.

4. **R3 AC3 resolution.** Test Velite with an empty collection, determine the behavior, and write a concrete AC. Takes five minutes and removes ambiguity.

5. **Playwright config location decision.** The structure doc says `e2e/playwright.config.ts`. Standard Playwright uses project root. R12 should state the choice, because it affects every Playwright command, the `pnpm test:e2e` script, and CI configuration.

6. **Note that `/contact` is a placeholder page in this spec.** The structure doc shows the route; R7 doesn't list it; the NFR says contact form is spec 2. A one-line addition to R7 resolves the ambiguity.
