# Adversarial Analysis: site-foundation Requirements (Round 2)

## 1. Internal Consistency of the Revised Requirements

### R11 AC1 omits CSS custom properties that AC3 depends on — Novel

AC1 specifies that the playground base stylesheet re-establishes `font-family`, `font-size`, `line-height`, `color`, and `box-sizing` after the `all: initial` reset. AC3 then requires that shadcn/ui components "render correctly using CSS custom properties re-established by the playground base stylesheet." But AC1's list doesn't include CSS custom properties at all. shadcn/ui components depend on `--primary`, `--background`, `--foreground`, `--radius`, and dozens of other custom properties defined in `globals.css`. After `all: initial`, these are gone. The base stylesheet described in AC1 re-establishes typographic properties but not the custom property tokens that shadcn/ui actually needs. AC3 asserts something AC1 doesn't deliver.

**Impact**: An implementer following AC1 literally will build a base stylesheet that doesn't include CSS custom properties. AC3 will then fail. They'll add the custom properties ad hoc, but the scope of "playground base stylesheet" is undefined — does it duplicate all of shadcn/ui's variables? A subset? This needs to be explicit in AC1.

### R4 AC2 nav table vs slash pages — consistent but implicit — Novel

R4 AC2's mapping table lists 6 sections. Slash pages (/about, /contact, /colophon, /now, /sitemap, /slashes) are absent from the nav table, which is correct — they're secondary pages. But neither R4 nor R7 specifies how visitors discover slash pages. The /slashes page exists per the product doc but isn't linked from the nav. The footer is mentioned in R4 AC1 but has no ACs defining its content. If slash pages are footer-linked or discoverable only via /slashes, that's a design decision that should be documented, not left implicit.

**Impact**: Low — an implementer will likely put these in the footer. But the requirements are silent on footer content entirely, which is unusual given how thoroughly nav is specified.

### R6 AC4 hero card data source is unspecified — Novel

R6 AC4 requires hero cards to be "data-driven (defined in a data structure, not hardcoded JSX)" but doesn't specify where the data structure lives. Three plausible locations exist:

1. A content file processed by Velite (e.g., a YAML file or pages MDX)
2. `src/config/site.ts` (the structure doc lists this for "nav items, social links")
3. A const array in the page component

Option 3 is technically "data-driven" (it's a data structure, not JSX) but defeats the intent of the AC. The AC says "so that sections can be added or removed without code changes" — but option 3 requires code changes. Option 1 requires R3's pipeline to handle hero card data, which R3 doesn't specify. Option 2 is the most likely intent but isn't stated.

**Impact**: Ambiguity that an implementer will resolve arbitrarily. If they choose option 1, they may extend Velite's schema without guidance. If they choose option 3, they meet the letter of the AC but not the spirit.

### R3 pages schema sufficiency for R6 — Compounding

R3 AC1 defines a `pages` schema "for landing page and slash page content." R6 needs hero card data. If hero card data is meant to come from the content pipeline (option 1 above), R3 doesn't define a schema for it. If it's meant to come from code (option 2), R3 is uninvolved. Either way, the coupling between R3 and R6 is undefined.

### R14 and R9 font relationship — fine

R14 AC2 says system font stack is an acceptable baseline. R9 AC1 says shadcn/ui defaults are the baseline. shadcn/ui defaults use `font-sans` which maps to a system font stack. These are compatible. R14's font loading wraps whatever font is chosen in `next/font` for CLS prevention. No conflict.

### R7 AC3 /contact vs structure doc api/contact/route.ts — fine

These are different routes (/contact page vs /api/contact API endpoint). R7 AC3 correctly scopes /contact as a placeholder page. The API route is out of scope. No conflict.

---

## 2. R11 CSS Isolation Spike: Behavioral Gaps

### `all: initial` and CSS custom properties — Novel

`all: initial` resets every CSS property to its initial value. The behavior for CSS custom properties under `all: initial` has been subject to spec evolution — the CSS Properties specification indicates that `all` includes custom properties. In practice, `all: initial` will wipe custom properties inherited from ancestor elements. The spike should explicitly verify custom property inheritance behavior across target browsers (last 2 versions of Chrome, Firefox, Safari, Edge per the tech doc's compatibility requirements).

The more immediate concern: the base stylesheet described in AC1 re-establishes five properties. shadcn/ui depends on dozens of CSS custom properties. The gap between "what AC1 says to restore" and "what shadcn/ui needs" is the primary implementation risk. See Section 1 finding above.

### Spike doesn't test JavaScript-driven behavior — Compounding

This was identified in v1 and acknowledged as "partially addressed." The spike tests visual rendering but not:

- Radix UI portals (dialogs, dropdowns render into `document.body`, escaping the playground container entirely — `all: initial` and `@layer playground` don't apply)
- Focus trap behavior inside the playground container
- Scroll locking when a dialog opens inside the playground

The spike's go/no-go decision (AC6) is based on visual rendering criteria. But if a playground item uses a Radix dialog, the dialog portal renders outside the playground container. The dialog will pick up the site's global styles, not the playground's isolated styles. This is a behavioral failure mode that AC6 doesn't catch.

**Impact**: The spike could produce a "go" decision for same-page rendering, but downstream playground items using Radix dialogs will break. The playground spec (spec 8) would then need to retrofit iframe isolation or portal containment, potentially after implementation work has been done under the assumption that same-page works.

**Recommendation**: AC6 should include a portal escape test — render a Radix dialog inside the playground container and verify it either (a) renders within the isolation boundary or (b) document this as a known limitation with a mitigation path.

### AC5 "verified in both builds" lacks comparison criteria — Compounding

AC5 says the spike "SHALL be verified in both light and dark themes, and in both dev (Turbopack) and production (Webpack) builds." The tech doc warns about CSS `@layer` ordering divergence between bundlers. But AC5 doesn't specify:

- What is compared between dev and production builds?
- What level of divergence triggers the iframe fallback?
- Is visual comparison sufficient, or does it require identical computed styles?

A subtle `@layer` ordering difference could cause Tailwind utilities to lose specificity against playground styles in one bundler but not the other. AC5 as written would pass if someone eyeballs both builds and says "looks the same" — but the divergence might only manifest with specific utility/layer combinations not tested in the spike.

**Recommendation**: AC5 should specify that the comparison includes computed style values for the test components, not just visual inspection.

### @layer playground vs Tailwind v4 cascade layers — Novel

Tailwind CSS v4 uses CSS cascade layers internally. The Tailwind v4 output wraps utilities in `@layer utilities`, base styles in `@layer base`, and components in `@layer components`. The requirements specify `@layer playground` for playground styles but don't define its ordering relative to Tailwind's layers.

CSS cascade layer ordering is determined by the first `@layer` declaration order. If `@layer playground` is declared after Tailwind's layers, playground styles will have higher cascade priority than Tailwind utilities — which means playground CSS could override Tailwind utilities even when the utility has higher specificity. If declared before, the opposite applies.

The tech doc says "all playground CSS is authored in a dedicated `@layer playground` that sits below the site's layer in cascade priority." This implies playground styles should have LOWER priority than site styles. But that's the opposite of what you want — playground items need their styles to override the site's defaults within the playground container. The `all: initial` reset is meant to wipe the slate, and then playground styles rebuild from scratch. If playground styles have lower cascade priority than site styles, any site style that somehow penetrates the `all: initial` barrier (e.g., via a portal, or an `!important`) will override playground styles.

**Impact**: Layer ordering needs explicit specification. The current language in the tech doc ("sits below the site's layer") may be intentionally defensive (playground styles don't leak out) but creates a trap (site styles leak in if `all: initial` doesn't fully contain them).

---

## 3. R14 (Font Loading) — New Requirement Completeness

### Font choice deferral affects CSP, build config, and directory structure — Compounding

R14 AC2 defers the specific font choice to "a design-phase decision" and offers two options: `next/font/local` with self-hosted files in `public/fonts/`, or `next/font/google` with automatic self-hosting. Both options result in fonts served from the same domain at build time, so CSP `font-src` doesn't need an external domain. This is actually fine for CSP.

However, the deferral creates uncertainty about whether `public/fonts/` should exist in the scaffolding (R1). If `next/font/google` is chosen, `public/fonts/` is unnecessary. If `next/font/local` is chosen, font files must be committed to the repo. R1 doesn't mention `public/fonts/` in its ACs. The structure doc lists `public/fonts/` as "Self-hosted fonts (if any)" — the "(if any)" hedging suggests awareness of this ambiguity but doesn't resolve it.

**Impact**: Low. The directory can be created when needed. But this is a case where the deferral is acceptable precisely because both options serve fonts from the same origin — the requirements should state this invariant explicitly so downstream decisions (CSP, build config) don't need to re-analyze font loading.

### AC3 "minimizes layout shift" is not testable — Novel

R14 AC3 requires the fallback font stack to "minimize layout shift before the primary font loads." There's no CLS threshold, no measurement method, and no pass/fail criterion. `next/font` provides `adjustFontFallback` which automatically adjusts fallback font metrics — if the implementer uses this, AC3 is met by default. If they don't, AC3 is subjective.

**Impact**: If the implementer uses `next/font`'s built-in fallback adjustment (which is the default behavior), this AC is automatically satisfied. The AC is either trivially met or untestably vague, depending on implementation choices. Consider tightening to: "the fallback font SHALL use `next/font`'s automatic font metric adjustment (or equivalent size-adjust/ascent-override declarations)."

### System font stack vs "approachable and human" — acceptable tension — Novel, low severity

R14 AC2 says "system font stack is an acceptable initial baseline." The product doc principle says "approachable and human." System fonts are functional and familiar — they're not cold or corporate, they're literally the fonts the user sees everywhere on their OS. This is a design taste question, not a requirements contradiction. The deferral is reasonable for a foundation spec.

### R14 and R13 CSP interaction — undocumented but safe — Novel, low severity

Both `next/font/local` and `next/font/google` serve fonts from the same domain at build time. No `font-src` CSP directive is needed for external domains. If someone later adds a Google Fonts CDN `<link>` tag instead of using `next/font`, CSP would block it — but that would be a deviation from R14, not a gap in R14. The coupling exists but is self-reinforcing rather than fragile.

---

## 4. Cross-Spec Boundary Hazards

### Pagefind search has no owner — Recurring

This was identified in v1 and remains unresolved. The tech doc describes Pagefind's crawl-based indexing pipeline (`next build && next start` → Pagefind crawls → index included in deploy). This pipeline:

- Differs fundamentally from R2's CI pipeline (which runs lint, type-check, test, build)
- Requires a running server, which the current CI pipeline doesn't start
- Needs to run after the build but before deployment
- Isn't claimed by any spec in the decomposition

The structure doc lists `public/pagefind/` as "gitignored, built via post-export script in package.json" — suggesting it's handled by a package.json script. But no requirement specifies this script, and R2's CI pipeline doesn't include it.

**Impact**: When the blog spec (or whichever spec implements search) needs Pagefind, they'll need to modify the CI pipeline established by site-foundation. This means site-foundation's R2 is not the complete CI pipeline — it's a partial pipeline that will be extended. This is fine if documented as intentional; it's a gap if R2 is presented as the definitive CI pipeline.

### R2 CI pipeline extensibility — Compounding

R2 defines the CI pipeline as: lint, type-check, unit tests (Vitest), build, and E2E tests (Playwright). Downstream specs need to add:

- Pagefind indexing (requires `next start` + crawl)
- Link checking (tech doc mentions lychee)
- Lighthouse audits (NFR mentions manual audit)
- Content validation beyond Velite schemas

R2's ACs describe specific steps but don't mention extensibility. The pipeline is defined imperatively ("SHALL run lint, type-check, unit tests, and build") rather than as an extensible workflow. An implementer will likely create a GitHub Actions workflow file with these steps. Adding Pagefind later requires modifying that workflow — which means modifying site-foundation's deliverable.

**Impact**: Not a bug in the requirements, but a documentation gap. R2 should acknowledge that the CI pipeline is a foundation that downstream specs extend, and specify whether extensions are additional workflow steps, additional jobs, or separate workflow files.

### R3 YAML guidance is untested — Compounding

R3 AC4 says code comments in `velite.config.ts` "SHALL explain the pattern for adding a new schema, covering both MDX and YAML collection types." But R3's other ACs only validate the `pages` (MDX) schema. The YAML guidance is unvalidated documentation — there's no AC that proves the YAML pattern actually works.

The structure doc shows `content/contributions.yaml` and `content/resources.yaml` as real files that downstream specs need. If the code comments describe a YAML pattern that doesn't work (e.g., wrong Velite API for YAML collections, incorrect import path), the downstream spec discovers the error, not site-foundation.

**Impact**: Moderate. The risk is that code comments describe an untested pattern. Consider adding a minimal YAML collection (even a placeholder) to validate the pattern end-to-end, or explicitly document that YAML patterns are unvalidated guidance.

### MDX images as standard `<img>` vs Next.js Image — Recurring

The NFR says "Images SHALL be optimized via Next.js Image component." But MDX content images go through Velite's copy pipeline to `public/static/` and render as standard `<img>` tags. Every content spec downstream (blog, projects) will have this gap. This was identified in v1 and remains unresolved.

**Impact**: Content images won't get automatic WebP/AVIF conversion, lazy loading, or responsive sizing. For a personal site, this is acceptable but the NFR overpromises. Either the NFR should say "site chrome images SHALL use Next.js Image; content images use standard tags with manual optimization" or site-foundation should specify a custom MDX `img` component that wraps `next/image`.

---

## 5. Acceptance Criteria Precision for Edge Cases

### R2 AC2: Vercel handles the re-check concern — fine

R2 AC2 says deployment happens "WHEN code is pushed to main and all checks pass." In practice, Vercel's GitHub integration triggers a new build on every push to main regardless of PR check status. Vercel runs its own build, which includes the same lint/type-check/build steps. The PR checks and the deployment build are independent. This AC is describing Vercel's default behavior, which is correct.

### R4 AC4: "persist without full-page reloads" is imprecise but testable — Novel, low severity

The AC says the layout shell "SHALL persist without full-page reloads (Next.js App Router behavior)." This is App Router's default for client-side navigation (Link component). Direct URL access (bookmark, external link) always does a full page load — but the layout still "persists" in the sense that it renders consistently. The parenthetical "(Next.js App Router behavior)" scopes this to client-side navigation. An E2E test can verify this by clicking a nav link and asserting no full-page reload occurs. Acceptable as written.

### R10 AC2: OG image has no dimension spec — Novel

R10 AC2 says "a default Open Graph image SHALL be available in `public/images/`." No format, no dimensions. The Open Graph protocol recommends 1200×630 pixels. An implementer could place any image there and satisfy the AC. Facebook/LinkedIn will crop or distort non-standard dimensions.

**Impact**: Low for a foundation spec — the OG image is a placeholder. But the AC should specify minimum dimensions (1200×630) and format (PNG or JPG) to prevent a 100×100 pixel image from passing the AC.

### R13 AC2: Playground CSP is dangerously vague — Novel

R13 AC1 specifies exact CSP directives for content pages. R13 AC2 says playground routes get a "permissive" CSP "allowing inline styles, external resources, and dynamic code execution" — but doesn't specify the actual directive values. The tech doc says playground routes "effectively opt out of CSP." But "effectively opt out" could mean:

- `default-src *` (truly permissive)
- `script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' *` (somewhat permissive)
- Just removing the content page restrictions (slightly permissive)

These have very different security profiles. An implementer choosing interpretation 1 would disable all CSP protections for playground routes. Interpretation 3 would still block some external resources.

**Impact**: An implementer will need to make a security decision that the requirements don't guide. Given that the tech doc says this is acceptable ("playground items have no auth, no stored data, and no sensitive operations"), the requirements should either specify the exact directives or explicitly state "no CSP headers for playground routes."

### R6 AC4: "without code changes" contradicts the data source options — Novel

R6 AC4 says hero cards should be data-driven "so that sections can be added or removed without code changes." But if the data structure is in `src/config/site.ts` (the most likely location), adding a section requires editing a TypeScript file — which is a code change. The AC's stated purpose ("without code changes") only holds if the data lives in a content file (MDX/YAML) processed by Velite.

This creates a hidden requirement: if the intent is truly "no code changes to add sections," the hero card data must be in the content pipeline, which means R3 needs a schema for it. If the intent is just "no JSX changes" (a const array in config is acceptable), the AC's justification is misleading.

---

## 6. NFR Enforceability and Measurement

### "Server Components by Default" has no enforcement mechanism — Novel

The NFR says page components are React server components and client components are used "only for interactive elements." There's no lint rule, no test, and no automated check. An implementer could add `"use client"` to a page component unnecessarily and nothing catches it. This is a convention, not a requirement.

**Impact**: Low for a solo-developer project. Matthew will enforce this by authorship convention. But if the NFR is going to specify this, it should either acknowledge it's a convention or specify a mechanism (e.g., a lint rule that flags `"use client"` in `src/app/` page files).

### "Single Responsibility" is a code review heuristic — Novel

"Each file has one purpose" is not testable or enforceable. It's a design guideline. This belongs in the structure doc (which already has code size guidelines) rather than in requirements NFRs.

**Impact**: None practically — it's aspirational guidance. But requirements should be verifiable. Consider moving this to the structure doc.

### Contrast verification has no owner or timing — Compounding

R5 AC5 says theme values "SHALL meet WCAG 2.1 AA color contrast ratios (4.5:1 normal text, 3:1 large text), verified via automated tooling or manual check." R9 AC1 says shadcn/ui defaults are the baseline. The accessibility NFR says "Color contrast conformance depends on finalized theme values (R9 uses shadcn/ui defaults which meet AA)."

The parenthetical "(R9 uses shadcn/ui defaults which meet AA)" is an unverified assertion. shadcn/ui's default theme does generally meet AA, but this depends on which background/foreground combinations are used. The requirements assume shadcn/ui defaults pass AA without specifying verification.

**Impact**: If shadcn/ui defaults do meet AA (they generally do), this is fine. But the claim should be verified during implementation, and R5 AC5 should specify when — during implementation of R5, during R9, or as a cross-cutting check at the end of site-foundation.

### Performance 90+ Lighthouse has no owner — Compounding

The NFR says "design target verified via manual Lighthouse audit after deployment." After deployment of which spec? Who runs it? The decomposition mentions a "cross-spec convention" but the requirements don't reference it. This is aspirational without accountability.

**Impact**: 90+ Lighthouse is easily achievable for a mostly-static Next.js site. The risk isn't failure — it's that no one ever runs the audit because no one owns it.

---

## Deliverables

### Top 5 Risks or Gaps

1. **R11 AC1 doesn't specify CSS custom properties needed by AC3.** AC1's base stylesheet re-establishes typographic properties but not the CSS custom property tokens (`--primary`, `--background`, etc.) that shadcn/ui components depend on. AC3 asserts shadcn/ui renders correctly "using CSS custom properties re-established by the playground base stylesheet" — but AC1 doesn't include them. An implementer following AC1 will fail AC3, then need to reverse-engineer which custom properties to include. **Fix**: AC1 should explicitly state that the base stylesheet must re-establish the CSS custom properties required by shadcn/ui components used in the playground.

2. **R11 spike doesn't test Radix portal escape.** Radix UI dialogs, dropdowns, and tooltips render into `document.body` via portals, escaping the playground container entirely. The spike tests visual rendering inside the container but not portal behavior. A "go" decision for same-page rendering could be invalidated when a playground item uses any Radix overlay component. **Fix**: Add a portal escape test to R11's ACs — render a Radix dialog inside the playground container and verify either containment or document the limitation.

3. **R6 AC4 hero card data source is unspecified and the "no code changes" justification is potentially false.** The most likely data location (`src/config/site.ts`) requires code changes to modify, contradicting AC4's stated purpose. If the intent is truly content-pipeline-driven, R3 needs a hero card schema it doesn't currently have. **Fix**: Specify the data source location explicitly. If it's `src/config/site.ts`, reword the AC justification to "without modifying JSX component code."

4. **R3 YAML collection pattern is documented but unvalidated.** R3 AC4 requires code comments explaining YAML collection patterns, but no AC validates that the pattern works. Downstream specs (contributions, resources) depend on YAML collections. If the documented pattern is wrong, the error surfaces in a downstream spec, not here. **Fix**: Either add a minimal YAML collection placeholder with a validating AC, or explicitly document that YAML patterns are guidance-only and downstream specs are responsible for validation.

5. **Pagefind search pipeline has no owner.** The build pipeline for Pagefind (start server → crawl → generate index → include in deploy) differs fundamentally from R2's CI pipeline and no spec claims it. When search is implemented, the CI pipeline must be modified — but R2 doesn't acknowledge extensibility. **Fix**: Either claim Pagefind CI in a specific downstream spec or add an AC to R2 acknowledging the pipeline is extensible and specifying the extension mechanism.

### Top 3 Conclusions to Challenge or Reverse

1. **R14 AC3's testability is insufficient.** "Minimize layout shift" is either trivially met (by using `next/font`'s default `adjustFontFallback`) or untestably vague. If the intent is to use `next/font`'s built-in fallback adjustment, say so. If the intent is a CLS threshold, specify one. The current AC is a feel-good statement that doesn't constrain implementation.

2. **R11's go/no-go criteria (AC6) are scoped to visual rendering, but the decision affects behavioral correctness.** The spike's purpose is to determine whether same-page rendering works for the playground. The go/no-go criteria only check visual rendering (fonts, colors, spacing). A "go" decision based on these criteria doesn't account for portals, focus management, or scroll locking — all of which are Radix UI behaviors that playground items using shadcn/ui will exercise. The spike could produce a "go" that is correct for simple items but wrong for interactive ones, requiring a retroactive architecture change.

3. **The NFR's "Images SHALL be optimized via Next.js Image component" overpromises.** This applies to site chrome images but not to MDX content images, which go through Velite's copy pipeline as standard `<img>` tags. Every content spec downstream inherits this gap. The NFR should either scope the claim to site chrome or require a custom MDX `img` component — deferring the decision silently guarantees every content spec will independently discover the limitation.

### What's Missing

1. **R11 AC1 needs a complete list of properties the playground base stylesheet must re-establish**, including CSS custom properties required by shadcn/ui. The current list (font-family, font-size, line-height, color, box-sizing) is incomplete for AC3 to pass.

2. **R11 needs a portal behavior test.** A single AC testing a Radix dialog inside the playground container would determine whether portals escape isolation — this is the most likely behavioral failure mode for same-page rendering.

3. **R6 AC4 needs a specified data source location.** "Data-driven" without specifying where the data lives is ambiguous enough to produce implementations that meet the letter but not the intent.

4. **R13 AC2 needs specific CSP directive values for playground routes**, matching the specificity of AC1's content page directives. "Permissive" is not a security policy.

5. **R10 AC2 needs minimum OG image dimensions** (1200×630) and accepted formats.

6. **R2 should acknowledge CI pipeline extensibility** — a sentence stating that downstream specs add steps to the workflow, and whether they do so as additional steps, jobs, or separate workflow files.

7. **The NFR's image optimization claim needs scoping** — either constrain it to site chrome images or specify the MDX `img` → `next/image` bridge as a requirement.
