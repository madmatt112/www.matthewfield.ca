# Adversarial Analysis — site-foundation Requirements (Round 3)

## 1. R11 CSS Isolation Spike — Architectural Coherence

### 1.1 The spike is structurally overloaded (Novel)

R11 packs seven ACs into one spike, but they form a dependency chain, not independent tests. AC1 (container setup) must succeed before AC2 (basic isolation) is testable. AC2 must succeed before AC3 (shadcn/ui rendering). AC3 must succeed before AC6 (portal behavior). AC5 (bundler divergence) is orthogonal but depends on AC1-AC4 producing something to compare.

**Failure scenario**: AC2 passes but AC3 fails. The spike result is ambiguous — is same-page isolation viable for items that don't use shadcn/ui? AC7's go/no-go criteria ("any of AC2-AC6 fail without a viable mitigation") treats this as a binary decision, but the real answer is "it depends on the item." The spike doesn't produce a graduated result — it produces pass/fail for the entire approach.

**Recommendation**: AC7 should define a graduated outcome: (a) full same-page isolation works (all ACs pass), (b) same-page isolation works for items without shadcn/ui or overlays (AC2+AC4 pass, AC3 or AC6 fail with mitigation), (c) same-page isolation does not work (AC2 fails). This directly maps to the playground spec's `iframeIsolated` decision rule.

### 1.2 `all: initial` resets `isolation` itself (Novel)

`all: initial` resets **every** CSS property to its initial value, including `isolation`. The initial value of `isolation` is `auto`, not `isolate`. If the declaration order in AC1 is `all: initial; isolation: isolate;` this works — the explicit `isolation: isolate` overrides the reset. But if the `all: initial` and `isolation: isolate` are applied via separate stylesheet rules or layers, cascade resolution determines which wins. The requirements don't specify whether these are on the same element in the same rule block or composed from different sources.

**Failure scenario**: A refactor splits the playground container styles across a CSS Module (for the `all: initial` reset) and the `@layer playground` stylesheet (for `isolation: isolate`). Depending on layer order, `all: initial` could win and silently remove the stacking context. No AC tests for stacking context specifically — AC2 only tests style inheritance.

**Recommendation**: AC1 should specify that `all: initial`, `isolation: isolate`, `display`, `box-sizing`, and `unicode-bidi` MUST be declared in a single rule block on the container element to prevent cascade conflicts.

### 1.3 `all: initial` resets inherited properties on all descendants (Compounding — builds on R1/R2 finding about `all: initial` scope)

`all: initial` on the container resets inherited properties on the container itself. Child elements then inherit the *initial* values from the container. This means **every** element inside the playground container inherits `direction: ltr` (fine), `visibility: visible` (fine), but also `pointer-events: auto` (fine), `cursor: auto` (fine), `color: canvastext` (browser default, not theme-aware). The base stylesheet re-establishes `color` via a CSS custom property, but only on the container — deeply nested elements that rely on inheritance from `<body>` or `:root` (which many Radix UI components do for computed colors) will get the container's re-established value, not the `:root` value.

**Failure scenario**: A Radix UI Tooltip reads a CSS variable from `:root` for its background color. Inside the playground container, `:root` variables are unreachable because `all: initial` broke the inheritance chain. The tooltip renders with a transparent or default background. AC3 tests Button and Card, not overlay primitives — this goes undetected until a downstream playground item uses a Tooltip.

**Recommendation**: AC3 should test at least one overlay-free component (Button) and one component with internal computed styles (Tooltip or Popover), not just "Button or Card."

### 1.4 `@layer playground` ordering is specified but mechanism is unclear (Recurring — escalated)

AC1 now says "The `@layer playground` declaration order relative to Tailwind v4's internal layers... must be explicitly defined and documented." But it doesn't say *what* the order should be or *how* it's defined. Tailwind v4 controls its own layer declarations. Inserting a custom layer into Tailwind's cascade requires either:

1. A `@layer` declaration before Tailwind's import in `globals.css` (pre-declaring the order)
2. Using Tailwind v4's `@layer` plugin API (if it exists)
3. Declaring `@layer playground` in a separate stylesheet loaded after Tailwind

The requirements treat this as a spike deliverable (document it), which is acceptable — but the risk is that the *answer* is "you can't reliably control this" and there's no fallback. This has been flagged twice. The spike should have an explicit sub-criterion: "IF `@layer playground` cannot be ordered predictably relative to Tailwind's layers THEN document the alternative (e.g., high-specificity selectors, CSS Modules without layers)."

### 1.5 AC5 bundler comparison lacks threshold (Compounding)

AC5 now says "compare computed style values for key properties." Good — but no tolerance is defined. Font rendering can produce sub-pixel differences in computed values between Turbopack and Webpack (e.g., `15.996px` vs `16px`). Is that a pass or fail? Without a tolerance or exact-match expectation, the implementer makes a judgment call that the spike is supposed to eliminate.

**Recommendation**: AC5 should specify: "Computed values for `color`, `background-color`, `font-family`, and `padding` SHALL match exactly (string equality of `getComputedStyle()` values). `font-size` and `line-height` SHALL match within 1px."

---

## 2. Cross-Document Consistency After Two Rounds of Changes

### 2.1 Product doc sections don't match R4/R6 mapping table (Novel)

The product doc's Key Features §1 (Landing Page) lists hero cards for: "Professional Profile, Project & Contribution Showcase, Blog, Playground." That's 4 cards (with Projects and Contributions possibly combined).

R4 AC2's mapping table lists 6 sections: Professional Profile, Projects, Contributions, Blog, Resources, Playground.

The product doc's section list omits **Resources** from the hero card list entirely. It also ambiguously combines "Project & Contribution Showcase" — is that one card or two?

**Failure scenario**: An implementer follows the product doc and creates 4 hero cards. R6 AC2 says "same sections and paths as the R4 AC2 mapping table" — 6 cards. The two documents disagree. Resources is either a hero card or it isn't.

**Impact**: Low — the requirements doc is authoritative over the product doc. But the inconsistency could confuse an implementer who reads both.

### 2.2 R13 CSP directives match tech doc exactly (No issue)

R13 AC1's directive list matches the tech doc's CSP section verbatim: `script-src 'self' 'unsafe-inline'`, `style-src 'self' 'unsafe-inline'`, `img-src 'self' data:`, `object-src 'none'`, `base-uri 'self'`, `frame-src 'self'`, restrictive `connect-src`. R13 AC2's playground opt-out matches the tech doc's playground CSP description. No contradiction found.

### 2.3 R13 AC1 `connect-src` is unspecified (Novel)

R13 AC1 says "restrictive `connect-src`" without defining the actual value. Every other directive has an explicit value. What does "restrictive" mean? `'self'`? `'self' https://api.resend.com`? The contact form (spec 2) will need to hit Resend's API — if `connect-src` is `'self'` only, the form submission will be blocked by CSP on content pages. The contact route is under `(site)/`, not `(playground)/`.

**Failure scenario**: Site-foundation ships `connect-src: 'self'`. Spec 2 implements the contact form. The form's `fetch()` to `/api/contact` works (same origin), but if any client-side analytics or external resource is ever added to content pages, it silently fails with a CSP violation. More immediately: if any shadcn/ui component fetches an external resource (font, icon CDN), it breaks.

**Recommendation**: Define `connect-src` explicitly. `'self'` is likely correct for site-foundation's scope, but state it explicitly rather than using a subjective adjective.

### 2.4 Tech doc says `next.config.js`, requirements say `next.config.ts` (Novel)

The tech doc's CSP section references `next.config.js` (JavaScript). R13 AC3 and the structure doc both use `next.config.ts` (TypeScript). The structure doc's directory listing shows `next.config.ts`. The tech doc has a stale file extension.

**Impact**: Trivial — an implementer will use the TypeScript extension. But it's a consistency defect.

### 2.5 R2 omits lychee link checker (Compounding)

The tech doc's "Code Quality Tools" section describes a CI-time link checker (lychee) with specific behavior: internal links as hard errors, external links as warnings, fragment checking enabled, validates image references. R2's CI pipeline ACs (AC1-AC6) don't mention link checking at all. AC6 describes extension by downstream specs, but link checking is described in the tech doc as a site-foundation-level tool, not a downstream addition.

**Status**: This was noted in the unresolved list as item 7 (CI pipeline extensibility). The deeper issue is that lychee isn't a downstream extension — it's infrastructure the tech doc says should exist in the foundation. Either the tech doc is aspirational and lychee belongs in a later spec, or R2 is missing an AC. The requirements doc should explicitly state which.

### 2.6 R14 font loading and CSP font-src (Novel)

R14 AC2 allows either `next/font/local` (self-hosted from `public/fonts/`) or `next/font/google` (auto-self-hosted at build time). Both approaches serve fonts from the same origin, so CSP's `font-src` isn't a concern — there's no cross-origin font fetch. However, R13 AC1 doesn't define `font-src` at all. The default CSP behavior when `font-src` is absent is to fall back to `default-src`, which R13 also doesn't define.

**Failure scenario**: If `default-src` is eventually set to `'none'` or `'self'` (common hardening), fonts continue to work (they're same-origin). No actual failure here — but the omission of `font-src` and `default-src` from R13 means the CSP is incomplete as a security specification. An implementer might add `default-src 'none'` as a best practice and then need to enumerate every other directive to avoid breaking the site.

**Recommendation**: R13 AC1 should include `default-src 'self'` as the CSP baseline fallback, preventing surprise breakage if a new resource type is added.

---

## 3. R6 Landing Page — Data Architecture and Content Pipeline Coupling

### 3.1 Hero cards in `src/config/site.ts` falsifies "without code changes" — but it's the right call (Recurring — re-assessed)

R6 AC4 says hero cards are in `src/config/site.ts` "so that sections can be added or removed without modifying page component JSX." This is true — the JSX doesn't change. But `src/config/site.ts` is a TypeScript file that requires a build and deploy. The "without code changes" framing is misleading: you're editing code, just not component code.

However, putting hero cards in Velite would be worse. A hero card is a route reference (path, label, icon, description) — it's configuration, not content. It has no prose body, no MDX rendering, no frontmatter. Forcing it into the content pipeline creates a schema with no content field, which is an abuse of the pipeline's purpose.

**Recommendation**: Accept `src/config/site.ts` as the correct location. Reword AC4 to say "defined in `src/config/site.ts` so that sections can be added or removed by editing the config file rather than modifying page component JSX." Drop any implication of "without code changes."

### 3.2 Adding a section requires 4+ file changes (Compounding)

Adding a new section (e.g., "Talks") requires:

1. `src/config/site.ts` — add hero card entry
2. R4 nav mapping table — conceptually, but actually `site.ts` likely drives nav too
3. New route directory — `src/app/(site)/talks/page.tsx`
4. Structure doc — update route tree (doc maintenance, not code)

If nav is driven by `site.ts`, the actual code changes are 2 files (config + route page). This is reasonable for a static site. The "data-driven" architecture does reduce the blast radius — without it, you'd also edit the landing page JSX and the nav component. The claim is valid, just modestly so.

### 3.3 Placeholder-to-real transition has no mechanism (Compounding)

R7 creates placeholder pages. R6 AC5 links hero cards to them. When a downstream spec implements the real section, the placeholder page must be replaced. There's no config flag or Velite schema field that marks a section as "placeholder." The transition is: delete the placeholder `page.tsx`, create the real one. This works but is entirely manual and undocumented.

**Failure scenario**: A downstream spec implements `/contributions` but forgets to remove the placeholder. Now there's a build conflict (two `page.tsx` files in the same route). Actually, Next.js App Router would just use the new one — the placeholder would be overwritten. So the failure mode is actually: the downstream spec doesn't realize a placeholder exists and creates the page from scratch rather than evolving it.

**Impact**: Low. This is a developer coordination issue, not an architectural flaw.

---

## 4. Acceptance Criteria Testability — Remaining Gaps

### 4.1 R9 ACs are infrastructure specs, not testable requirements (Novel)

R9's three ACs are all vague:

- **AC1**: "establish theming infrastructure using shadcn/ui defaults." Testable interpretation: after running `npx shadcn@latest init`, the generated `globals.css` contains CSS custom properties for all shadcn/ui theme tokens. But the AC doesn't say "run shadcn init" — it says "establish." An implementer could hand-write variables and claim they're "shadcn/ui defaults."

- **AC2**: "integrate with the CSS theme variables." Testable interpretation: Tailwind's `@theme` directive (v4) maps design tokens to CSS variables, and `bg-primary` produces `background-color: var(--primary)`. But "integrate" could also mean "doesn't break them."

- **AC3**: "render correctly in both light and dark themes." Testable interpretation: install a shadcn/ui Button, render it, and visually confirm it looks right. But "correctly" has no reference image or computed style expectation.

**Failure scenario**: R9 is implemented. A reviewer asks "is AC2 met?" The implementer says "yes, Tailwind is configured." The reviewer says "but `bg-primary` doesn't resolve to the theme variable." The implementer says "it wasn't supposed to — AC2 says 'integrate,' not 'utility classes resolve to CSS variables.'" Ambiguity creates disagreement.

**Recommendation**: Rewrite R9 ACs with concrete verification:
- AC1: "`globals.css` SHALL contain CSS custom properties matching shadcn/ui's default theme (as generated by `npx shadcn@latest init`)."
- AC2: "Tailwind utility classes (`bg-primary`, `text-foreground`, etc.) SHALL resolve to the CSS theme variables defined in AC1."
- AC3: "At least one shadcn/ui component (Button) SHALL be installed and visually verified in both themes during implementation."

### 4.2 R4 AC3 mobile nav is non-normative (Recurring — unchanged)

"(e.g., hamburger menu or collapsed navigation)" remains advisory. An implementer could use `display: none` on the nav below 768px and claim the nav "adapted" by disappearing. The AC needs a positive constraint: "navigation SHALL remain accessible and fully functional at all breakpoints."

### 4.3 R6 AC1 photo source is implicit but traceable (No issue)

R6 AC1 says "photo(s)." The structure doc says `public/images/` contains "profile photos." R10 AC2 says OG images are in `public/images/`. The chain is: R6 AC1 → implementer puts photo in `public/images/` → done. There's no gap — the structure doc is sufficient. The photo doesn't need its own AC.

### 4.4 R2 AC5 / R12 dependency is ordered, not circular (No issue)

R2 AC5 says "WHEN Playwright E2E tests are configured" — this is a conditional. R12 configures Playwright. R2 AC5 activates after R12 is implemented. The ordering is: R12 creates the test infrastructure, then R2's pipeline step becomes active. Since both are in the same spec, the implementer does R12 first. No circularity.

---

## 5. Non-Functional Requirements — Measurement and Ownership

### 5.1 NFR audit against the four-property test

| NFR | Measurable threshold | Verification method | Owner | Failure consequence |
|-----|---------------------|--------------------|---------|--------------------|
| Performance (Lighthouse 90+) | Yes (90+) | Manual Lighthouse audit | Cross-spec convention | None — "design target" not gate |
| Performance (server components) | No — "by default" is subjective | None specified | R1 (architecture) | None |
| Performance (image optimization) | No — "optimized" is subjective | None specified | Component usage | None |
| Security (CSP) | Yes (explicit directives) | Response header inspection | R13 | None specified |
| Reliability (CI gates) | Yes (fail = no deploy) | R2 pipeline | R2 | Blocked deployment |
| Reliability (Velite validation) | Yes (schema errors = build fail) | Build step | R3 | Build failure |
| Usability (responsive) | No — "adapt gracefully" is subjective | None specified | R4, R6 | None |
| Accessibility (semantic HTML) | Yes (specific elements listed) | DOM inspection | R4 | None |
| Accessibility (keyboard nav) | Partially (listed elements) | Manual testing | R5, R4 | None |
| Accessibility (ARIA) | No — "all interactive elements" is unbounded | None specified | Unowned | None |
| Accessibility (color contrast) | Yes (4.5:1, 3:1) | Automated tooling | R5 | None |

**Findings**:
- Performance (server components, image optimization) and Usability (responsive) have zero of the four properties — they're aspirations, not requirements. **(Novel)**
- The ARIA NFR says "all interactive elements" but site-foundation only delivers: nav links, theme toggle, and hero card links. Standard `<a>` and `<button>` elements don't need custom ARIA beyond what semantic HTML provides. The NFR is either over-scoped (implies future ARIA work that belongs to downstream specs) or precisely scoped but trivially satisfied. **(Compounding)**
- No NFR has a defined failure consequence beyond CI gates. If Lighthouse is 85, nothing happens. If responsive design breaks on tablet, nothing happens. These are intentions, not enforceable requirements.

### 5.2 Lighthouse 90+ is likely achievable without effort (Novel)

Site-foundation delivers: static pages, server components, `next/font` loading, minimal client JS (theme toggle only). The main risks to Lighthouse are:

- **Unoptimized hero images**: R6 AC1 includes photos. If served as raw JPGs without Next.js Image, LCP and performance score drop. The NFR says "site chrome images SHALL be optimized via Next.js Image" — this covers landing page photos. Likely fine.
- **Unused CSS**: Tailwind v4 purges unused utilities. Not a concern.
- **Render-blocking resources**: `next/font` preloads fonts. Tailwind is processed at build time. No render-blocking external stylesheets.
- **Next.js baseline JS (~60-85KB)**: Loads async, doesn't block LCP. Affects TBT but not enough to drop below 90 on modern devices.

**Assessment**: 90+ is likely a freebie for site-foundation's scope. The NFR adds no value for this spec — it becomes meaningful when downstream specs add search (Pagefind WASM), syntax highlighting (Shiki CSS), and dynamic playground items. The NFR should specify that the 90+ target applies to content pages, not playground items.

### 5.3 Reliability NFR is entirely redundant with R2 (Recurring — unchanged)

"The CI pipeline SHALL prevent deployment of code that fails lint, type-check, or build steps" is literally R2 AC1 + AC2. The NFR adds zero information. Either delete it or make it say something R2 doesn't (e.g., "rollback on failed health check after deploy").

---

## 6. Scope Boundary and Dependency Hazards

### 6.1 Extension point inventory (Novel)

| Infrastructure | Created by | Extended by | Extension mechanism | Documented? |
|---------------|-----------|------------|-------------------|-------------|
| CI pipeline | R2 | spec 4 (Pagefind) | "Additional steps or jobs" (AC6) | Partially — says what, not how |
| Velite schemas | R3 | specs 3-7 | Code comments in `velite.config.ts` (AC4) | Yes |
| Layout components | R4 | None — consumed, not extended | N/A | N/A |
| CSS variables | R9 | Design spec (future) | Override values in `globals.css` | No — no guidance on how to customize |
| CSP headers | R13 | spec 8 (playground) | Path-based headers in `next.config.ts` | Yes (R13 AC2 scopes playground separately) |
| `@layer playground` | R11 | spec 8 | Playground items write CSS in this layer | Partially — convention, not contract |
| Test infrastructure | R12 | All downstream specs | Add test files to existing directories | Yes (by convention) |

**Key gap**: CSS variables (R9) have no documented extension mechanism. When a downstream spec needs a new design token (e.g., `--card-hover-bg`), do they add it to `globals.css`? To a separate file? Is there a naming convention? R9 says "shadcn/ui defaults as the initial baseline" but doesn't say how the baseline evolves.

### 6.2 R11 spike result has no documented remediation path (Recurring — escalated)

If the spike says "go" for same-page rendering, but a downstream playground item later discovers a CSS conflict the spike didn't test (e.g., a CSS Grid item that needs `display: grid` on the container but `all: initial` resets it to `inline`), the remediation is unclear. Does the item switch to iframe? Does the playground container get patched? Who decides?

The tech doc's decision rule says "when in doubt, use iframe." This is sufficient in principle — but the requirements doc doesn't reference this decision rule. An implementer working from requirements alone wouldn't know it exists.

**Recommendation**: R11 AC7 should reference the tech doc's iframe decision rule explicitly: "Items encountering isolation issues not covered by the spike's mitigations SHALL use iframe isolation per the tech doc's decision rule."

### 6.3 R3 `pages` schema sufficiency for site-foundation content (Novel)

R3 AC1 defines a `pages` schema for "landing page and slash page content." Site-foundation needs content for:

- Landing page intro text (R6 AC1) — could be in `pages` schema or hardcoded in JSX
- Placeholder page text (R7) — "coming soon" message could be in `pages` schema or hardcoded
- 404 page text (R8) — could be in `pages` schema or hardcoded
- About, now, colophon pages — structure doc says these are in `content/pages/`

The structure doc says: "Component-only pages (contact, sitemap, slashes) render entirely from code and have no content file." But it doesn't classify placeholder pages, 404, or the landing page intro as component-only or content-driven.

**Failure scenario**: The product principle says "markdown-first content." An implementer hardcodes the 404 message and placeholder text in JSX. A reviewer flags this as violating the product principle. The implementer points out that a 3-word "coming soon" message doesn't warrant an MDX file with frontmatter. Both are right.

**Recommendation**: R7 and R8 should explicitly state whether their text content is hardcoded or content-pipeline-driven. For short, fixed strings ("Coming soon", "Page not found"), hardcoded JSX is pragmatic and not a violation of "markdown-first" — that principle applies to regularly-updated content, not UI chrome text.

### 6.4 Pagefind is correctly scoped to spec 4 (No issue)

R2 AC6 explicitly says "spec 4 (blog-enhanced) adds the Pagefind crawl step." The unresolved item about Pagefind being "unowned" is resolved — it's owned by spec 4. The CI pipeline extension mechanism (additional steps or jobs in the existing workflow file) is sufficient for adding a Pagefind step.

---

## Deliverables

### Top 5 Risks or Gaps (Ranked by Likelihood × Impact)

1. **R11 `all: initial` resets `isolation` and other properties that the spike depends on.** If container styles are refactored into separate rule sources, `all: initial` silently removes `isolation: isolate`, breaking the stacking context. No AC tests for this. The spike could pass in its initial implementation and break on any CSS refactor. *Likelihood: Medium. Impact: High (silent playground breakage in production).* **(Novel)**

2. **R9 ACs are untestable as written.** "Establish theming infrastructure," "integrate," and "render correctly" have no concrete verification criteria. An implementer and reviewer will disagree on whether R9 is complete. This blocks sign-off. *Likelihood: High. Impact: Medium (blocks progress, creates rework).* **(Novel)**

3. **R11 `@layer playground` ordering remains undefined after three rounds.** The requirement says "must be explicitly defined" but doesn't define it, deferring to the spike. If the spike discovers it can't be controlled, there's no fallback specified. *Likelihood: Medium. Impact: High (playground CSS architecture is undefined).* **(Recurring — severity escalated, third round.)**

4. **R11 spike produces binary go/no-go but real answer is graduated.** Some playground items need shadcn/ui, some don't. Some use overlays, some don't. A binary "same-page works / doesn't work" loses nuance that the playground spec needs to make per-item decisions. *Likelihood: High. Impact: Medium (playground spec makes suboptimal architectural choices).* **(Novel)**

5. **R13 `connect-src` undefined.** "Restrictive" has no value. This could silently break fetch requests from content pages when downstream specs add client-side functionality. *Likelihood: Medium. Impact: Medium (silent CSP violations in production).* **(Novel)**

### Top 3 Conclusions to Challenge or Reverse

1. **"The spike validates CSS isolation" — it validates one specific configuration, not the approach.** R11 tests `all: initial` + `isolation: isolate` + `@layer playground` with two specific components (Button, Card) in one specific nesting depth. A downstream playground item with different DOM structure, different Radix primitives, or CSS Grid layout could hit completely different isolation failures. The spike proves feasibility for the tested case only. The conclusion should be "the spike validates the baseline isolation mechanism" — not "same-page isolation works." The playground spec should treat the spike as reducing risk, not eliminating it, and every new playground item should be verified against isolation in its PR preview deploy.

2. **"shadcn/ui defaults as initial baseline" (R9) means the design system is deferred, not delivered.** R9 AC1 frames shadcn/ui defaults as infrastructure. But shadcn/ui defaults are a complete design system — colors, spacing, border radii, typography. By shipping them as the "initial baseline," site-foundation implicitly makes a design decision (shadcn/ui's default gray/blue theme). If a downstream design spec changes the theme significantly, every component may need visual QA. R9 should acknowledge that the "baseline" is also the visual default until explicitly overridden, and downstream specs that change theme values must re-verify all existing components.

3. **"Placeholder pages are temporary" — they might be permanent.** R7 assumes all placeholder sections will eventually be built. But what if Matthew never builds the Resources section? The placeholder page remains indefinitely as the production page. R7 AC1 says "content is coming soon" — this is a lie if the section is never built. The placeholder should be styled as a real page with minimal content ("This section is under construction" or even a brief description of what will go here), not a "coming soon" splash that implies imminent delivery.

### What's Missing — Concrete Changes Needed

1. **R11 AC1**: Add constraint — `all: initial`, `isolation: isolate`, `display`, `box-sizing`, and `unicode-bidi` MUST be declared in a single CSS rule block on the playground container element. Add `@layer playground` fallback criterion: "IF `@layer playground` cannot be ordered predictably relative to Tailwind v4's internal layers, THEN the spike SHALL document the alternative approach and update AC4 accordingly."

2. **R11 AC7**: Replace binary go/no-go with graduated outcome: (a) full same-page isolation viable, (b) same-page isolation viable with restrictions (list which AC failures constrain usage), (c) same-page isolation not viable. Reference the tech doc's iframe decision rule as the fallback for items hitting unresolved isolation issues.

3. **R9 ACs 1-3**: Rewrite with concrete verification criteria. AC1: presence of specific CSS custom properties in `globals.css`. AC2: Tailwind utility classes resolve to those CSS variables. AC3: at least one shadcn/ui component visually verified in both themes.

4. **R13 AC1**: Define `connect-src` explicitly (likely `'self'`). Add `default-src 'self'` as the CSP baseline. Fix tech doc reference from `next.config.js` to `next.config.ts`.

5. **R7 and R8**: Add a note clarifying that short, fixed UI text (placeholder messages, 404 text) may be hardcoded in JSX. The "markdown-first" product principle applies to regularly-updated authored content, not static UI chrome.

6. **R6 AC4**: Reword from "without code changes" to "by editing the site config file rather than modifying page component JSX."
