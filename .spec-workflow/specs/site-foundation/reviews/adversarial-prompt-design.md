# Adversarial Review: site-foundation Design Document

You are a senior frontend architect with deep expertise in Next.js App Router, CSS cascade layers, build-time content pipelines, and CI/CD for static-first sites. You have shipped multiple production sites using Tailwind v4, shadcn/ui, and Velite. Your job is to tear apart the design document below and find every gap, inconsistency, unaddressed failure mode, and questionable decision. Do not validate or praise. Find weaknesses.

Read the following files before beginning your analysis:

- **Design doc (target):** `/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/site-foundation/design.md`
- **Requirements:** `/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/site-foundation/requirements.md`
- **Tech steering:** `/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/tech.md`
- **Structure steering:** `/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/structure.md`
- **Product steering:** `/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/product.md`

---

## 1. CSS Isolation Spike: Cascade Layer Ordering and `all: initial` Consequences

The spike design is the highest-risk section. Attack it:

- Challenge the assumption that `@layer playground` declared before `@import "tailwindcss"` will reliably sit below Tailwind v4's internal layers. Tailwind v4 generates its own `@layer base`, `@layer components`, `@layer utilities` — the interaction between a pre-declared `@layer playground` and Tailwind's own layer declarations is underspecified. Identify what happens if Tailwind v4's import re-orders layers or if the CSS spec's "first declaration wins" rule produces a different order than expected.
- Stress-test `all: initial` beyond the five listed properties. `all: initial` resets *every* inherited CSS property to its initial value — including `direction`, `writing-mode`, `visibility`, `cursor`, `pointer-events`, `tab-size`, and accessibility-relevant properties like `forced-color-adjust`. The design re-establishes only typographic properties and shadcn tokens. Identify specific properties whose reset would cause subtle, hard-to-debug failures in playground items.
- Challenge the fallback plan ("high-specificity selectors via CSS Modules without layers"). This is mentioned as a single sentence with no design detail. If the primary approach fails, there is no designed fallback — just a hand-wave. Determine whether this fallback is actually viable given that CSS Modules class names differ between Turbopack and Webpack.
- Examine the Radix UI portal escape issue (AC6). The design says "Document the result as a known limitation with mitigation path if portals escape." But Radix portals *always* render to `document.body` by default — this is not an "if." The design should already account for this as a certainty, not a contingency. Assess whether this undermines the graduated outcome model.
- Probe the playground base stylesheet's re-establishment of shadcn/ui tokens. The design copies token values from `globals.css` into the playground container. This creates a maintenance coupling: any change to theme tokens in `globals.css` must be manually mirrored in the playground stylesheet. Identify the failure mode when these drift apart.

## 2. CI/CD Pipeline: Build Redundancy, Caching, and E2E Architecture

The pipeline does two full `pnpm install` + `pnpm build` cycles. Dissect the waste:

- The `e2e` job re-runs `pnpm install` and `pnpm build` from scratch despite `needs: build`. There is no artifact passing between jobs. This means the entire Next.js build runs twice per CI run. Calculate the cost in CI minutes and identify whether the design intentionally chose this or simply didn't consider artifact reuse.
- Challenge the Playwright configuration's `reuseExistingServer: !process.env.CI`. In CI, this means Playwright starts a fresh server via `pnpm start`. But `pnpm start` requires a built `.next/` directory. The config assumes the build step preceding it in the same job produced `.next/` — if the build step is ever moved or parallelized, E2E silently breaks. Identify this coupling.
- The `postinstall: velite build` hook runs on every `pnpm install`, including in CI where Velite build is already an explicit step. Determine whether this causes a double Velite build and whether the second build could produce different output (e.g., if content files change between steps — unlikely but architecturally sloppy).
- Examine the absence of any caching strategy for Velite's `.velite/` output, Playwright browsers, or Next.js `.next/cache`. The design specifies `cache: "pnpm"` for node_modules but nothing else. Quantify the CI time wasted.

## 3. Velite Pipeline: Schema Gaps, Error Paths, and Downstream Contract

The Velite configuration is presented as a template for all downstream specs. Scrutinize the contract:

- The `pages` schema uses `s.path()` for slug derivation. `s.path()` strips the file extension and directory prefix. But the design doesn't specify what happens with nested paths (e.g., `content/pages/foo/bar.mdx` — does this produce slug `foo/bar` or `bar`?). Downstream specs that add blog posts with subdirectory organization will hit this ambiguity. Identify the failure scenario.
- The design says "Code comments in `velite.config.ts` document how to add a new schema." Code comments are not a design artifact — they're an implementation detail. The design should specify the *pattern* that downstream specs follow, not defer to comments. Challenge whether this is adequate documentation for a foundational contract.
- Examine the `#site/content` path alias pointing to `.velite/`. This directory is gitignored and doesn't exist until `velite build` runs. The design mentions `postinstall` handles this, but what about fresh clones where a developer opens their editor before running `pnpm install`? TypeScript will show errors on every content import. This is a DX issue that the design doesn't address.
- The VeliteWebpackPlugin integration in `next.config.ts` triggers content rebuilds during dev. But the design also uses `postinstall` for initial builds. Identify the race condition: if `next dev` starts before `postinstall` completes (e.g., in a CI environment or fast machine), the webpack plugin may try to process content before `.velite/` exists.

## 4. Component Design: Missing States, Accessibility Gaps, and Configuration Coupling

The component interfaces are thin. Find what's missing:

- The Nav component specifies "responsive — collapsed menu on mobile" using a Radix UI primitive but doesn't specify the breakpoint. Tailwind's default breakpoints are `sm` (640px), `md` (768px), `lg` (1024px). The choice of breakpoint affects whether tablet users see the hamburger menu. The design defers this entirely.
- The ThemeToggle says "Cycles or toggles theme." These are two different UX behaviors — cycling through light/dark/system is three states; toggling is two. The design doesn't commit to either. This ambiguity will produce different implementations depending on who reads the spec.
- The HeroCard interface includes `icon?: React.ReactNode` but the `HeroCardConfig` type in site config uses `icon?: string`. These are incompatible types. A React node can't be serialized in a config file as a string without a lookup mechanism (icon registry, dynamic import). The design has a type mismatch between the component interface and its data source.
- The landing page specifies "photo(s)" with Next.js `Image` component but doesn't address where the photo lives (is it in `public/images/`? referenced from site config? hardcoded in the page component?). The product doc says "wide and spacious" with "short personal intro with photo(s) at the top" — the design doesn't specify the photo layout, sizing constraints, or responsive behavior.
- Challenge the Footer's "links to slash pages (or link to `/slashes`)." The design can't decide which. This "or" will produce inconsistent implementations. The requirements (R4 AC6) say "links to slash pages or a link to `/slashes`" — the design should resolve this ambiguity, not parrot it.

## 5. CSP Headers: Directive Gaps and Playground Exclusion Pattern

The CSP configuration has specific technical weaknesses:

- The CSP uses `font-src 'self'` but `next/font/google` with automatic self-hosting downloads fonts at *build time* and serves them from the same origin. Verify that the built output actually serves fonts from `'self'` and not from a CDN subdomain or `/_next/static/` path that might be treated differently by some browsers.
- The playground exclusion uses a negative lookahead regex: `/((?!playground).*)`. Test this pattern against edge cases: does `/playground-tips` match the CSP (it should, it's not under `/playground/`)? Does `/api/playground/` match (it shouldn't, but it does based on the regex)?
- `script-src 'self' 'unsafe-inline'` is documented as necessary for Next.js hydration. But Next.js 14+ supports nonce-based CSP via `next.config.js` `experimental.cspNonce`. The design doesn't evaluate this alternative, which would eliminate `'unsafe-inline'` and provide meaningfully stronger XSS protection. Challenge whether this was dismissed or simply overlooked.
- `connect-src 'self'` will break Vercel Analytics, Vercel Speed Insights, or any future third-party integration. The design doesn't mention whether these services are planned. If they're added later, the CSP silently blocks their requests without visible errors in the UI.

## 6. Testing Design: Coverage Gaps and Infrastructure Assumptions

The testing strategy has blind spots:

- There are no Playwright tests for the CSS isolation spike outcomes. R11 requires verification "in both dev (Turbopack) and production (Webpack) builds" — but the testing design only includes tests for theme toggle, navigation, and landing page. The spike verification is described narratively ("compare computed style values") but not as an actual test. Without automated tests, spike regressions will be invisible.
- The Vitest canary test imports from `@/lib/utils` and tests `cn()`. But `cn()` is a shadcn/ui utility that combines `clsx` and `tailwind-merge`. If the canary test is just `expect(cn("a", "b")).toBe("a b")`, it proves almost nothing about the infrastructure. Specify what the canary actually validates.
- The Playwright smoke test "navigates to `/`, asserts page loads with expected title." This doesn't verify that the page *renders content* — a Next.js page can return a 200 with an empty body if the component throws during server rendering and the error boundary catches it. The test should assert on visible content, not just the title.
- There is no test for CSP headers. R13 specifies exact directives, but no test verifies they're present in the response. A config change in `next.config.ts` could silently drop CSP headers.

---

## Deliverables

Conclude your analysis with:

1. **Top 5 risks/gaps** — ranked by severity and likelihood. Be concrete: name the failure scenario, not just the risk category.
2. **Top 3 conclusions to challenge or reverse** — specific design decisions that should be reconsidered, with reasoning for why the alternative is stronger.
3. **What's missing** — work that should be done before this design is implemented. Specific artifacts, decisions, or analyses that are absent.

Be specific and concrete. Cite failure scenarios, not abstract risks. If something is actually fine, say so briefly and move on.

---

Write your complete analysis to: `/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/site-foundation/reviews/adversarial-analysis-design.md`
