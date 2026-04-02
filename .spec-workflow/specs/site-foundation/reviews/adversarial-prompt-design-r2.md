# Adversarial Review Prompt — site-foundation Design (Round 2)

You are a senior frontend architect and build systems engineer with deep expertise in Next.js App Router, CSS cascade layers, Tailwind CSS v4, and CI/CD pipeline design. You have been handed a design document for a personal website's foundation spec. Your job is to tear it apart. Find every gap, every unstated assumption, every failure mode the author didn't consider. Do not validate. Do not support. Attack.

Read the following files before beginning your analysis:

- **Design document (target)**: `/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/site-foundation/design.md`
- **Requirements**: `/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/site-foundation/requirements.md`
- **Tech steering**: `/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/tech.md`
- **Product steering**: `/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/product.md`
- **Structure steering**: `/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/structure.md`

---

## Prior Review Context

A previous adversarial review (v1) was conducted and nearly all findings were accepted and incorporated into the current design. The following areas have been thoroughly addressed and do **not** need re-examination:

- **CSS layer ordering**: Now explicitly framed as a hypothesis under test, not an assumed fact. Fallback is iframe-only (no vague CSS Modules alternative).
- **`all: initial` property resets**: `color-scheme` and `-webkit-text-size-adjust` are now re-established in the playground base stylesheet.
- **Radix portal escape**: Acknowledged as documented behavior. The spike now validates `container` prop mitigation and produces a component matrix.
- **Token drift**: Resolved via shared `src/styles/tokens.css` imported by both `globals.css` and the playground base stylesheet.
- **CI/CD structure**: Consolidated to single job. Playwright browser caching added.
- **Nav breakpoint**: Committed to `lg` (1024px) with rationale.
- **ThemeToggle**: Committed to 3-state dropdown (Light/Dark/System).
- **HeroCard/Footer/Photo ambiguities**: All resolved with specific decisions.
- **CSP regex**: Fixed with `(/|$)` segment boundary.
- **Nonce-based CSP**: Explicitly evaluated and rejected with documented rationale.
- **Testing gaps**: CSS isolation Playwright test, CSP header tests, strengthened canary tests all added.

**Your focus must be on novel issues.** Do not re-discover known findings. For each issue you identify, classify it as one of:

- **Novel**: Not identified in any prior review.
- **Compounding**: Builds on or deepens a prior finding that was addressed — the fix may have introduced new problems or been incomplete.
- **Recurring**: Same issue identified before but not yet resolved — escalate severity.

---

## 1. Shared Token Architecture (`tokens.css`) — Stress-Test the New Design

The v1 review identified token drift as a risk. The design now introduces `src/styles/tokens.css` as a shared source imported by both `globals.css` and the playground base stylesheet. Stress-test this solution:

- Challenge whether CSS `@import` of `tokens.css` into the playground base stylesheet (which lives inside `@layer playground`) correctly scopes the `:root` and `.dark` selectors. The tokens file defines properties on `:root` and `.dark`, but the playground container uses `all: initial` which resets inherited custom properties. Determine whether importing a file with `:root {}` selectors inside `@layer playground { .playground-container { ... } }` actually applies those tokens to the container, or whether the selectors target `<html>` instead and the `all: initial` still blocks inheritance.
- Evaluate whether the dark mode mechanism works inside the playground container. The main site uses `.dark` class on `<html>`. After `all: initial`, custom properties from `:root` and `.dark` don't cascade into the container. How does the playground container detect and respond to theme changes? The design says "imported from shared tokens" with placeholder comments but doesn't show the actual selector structure for the playground context.
- Identify whether `@import "./tokens.css"` inside `globals.css` (which is itself imported after `@import "tailwindcss"`) creates layer ordering complications. Tailwind v4's `@import "tailwindcss"` expands into layers — does a subsequent `@import` nest inside Tailwind's layer context or sit at the top level?
- Challenge the claim that "both the main site and playground containers receive updates from this single file." If the playground base stylesheet must re-declare tokens on `.playground-container` (not `:root`), the shared file doesn't eliminate duplication — it just moves it. The playground stylesheet still needs selector transformation from `:root`/`.dark` to `.playground-container`/`.dark .playground-container`.

## 2. Velite Integration Edge Cases and Next.js Compatibility

The Velite pipeline design specifies a VeliteWebpackPlugin for Next.js integration. Probe the gaps:

- Challenge the assumption that `VeliteWebpackPlugin` works with Turbopack in dev mode. The design specifies `next dev --turbopack` but the plugin is a webpack plugin. Turbopack has limited webpack plugin compatibility. If the plugin doesn't work with Turbopack, content changes during development won't trigger rebuilds — developers must restart the dev server or run `velite build` manually. Determine whether this is documented or silently broken.
- Examine the `postinstall: "velite build"` hook's interaction with `pnpm install --frozen-lockfile` in CI. Some CI environments run install with flags that may skip lifecycle scripts. Verify that the CI workflow explicitly handles this or that `--frozen-lockfile` doesn't suppress `postinstall`.
- Challenge whether `.velite/` output stability is guaranteed across Velite versions. The design uses `#site/content` as a stable import path, but Velite's generated output shape (exported names, types) could change between versions. The design has no version pinning strategy beyond the lockfile, and no integration test that validates the import contract.
- Evaluate the `output.clean: true` setting. This deletes and regenerates `.velite/` on every build. During development, if a file watcher triggers a rebuild while a page is rendering and reading from `.velite/`, the directory is momentarily empty. Assess whether this creates a race condition in development.

## 3. Mobile Navigation Implementation Gaps

The design commits to `lg` (1024px) breakpoint and Radix UI Sheet for the mobile menu. Dig into the unspecified details:

- Challenge the choice of Radix UI Sheet for mobile navigation. Sheet is a slide-out panel component — it creates a full-height sidebar with overlay backdrop. For a nav menu with 6 items, this is heavy-handed. Standard mobile nav patterns use a dropdown/collapsible menu that doesn't obscure the full page. Determine whether Sheet is the right primitive or whether a simpler component (Collapsible, or a plain animated div) would be more appropriate.
- Examine what happens to focus management when the Sheet opens. Radix Sheet traps focus inside the sheet. If the sheet contains only 6 nav links and a close button, the user is trapped in a tiny focus loop. Determine whether this is good UX or whether it prevents users from accessing the page content while the menu is open (which may be intentional but should be a deliberate decision).
- Challenge the accessibility of the hamburger menu pattern. The design says `aria-label` and `aria-expanded` on the toggle but doesn't specify: what the `aria-label` value should be, whether the menu button uses `aria-controls` to reference the menu, or whether `aria-haspopup` should be set. These are WCAG requirements for disclosure widgets.
- Evaluate the interaction between the mobile menu and the ThemeToggle. Both are in the header. On mobile, is the ThemeToggle inside the Sheet (requires opening the menu to change theme) or outside it (takes horizontal space from the hamburger button area)? The design doesn't specify this layout decision.

## 4. Metadata, SEO, and Sitemap Completeness

The design specifies metadata patterns and an XML sitemap. Look for gaps:

- Challenge the hardcoded routes in `sitemap.ts`. The sitemap lists 7 routes manually. Slash pages (`/about`, `/contact`, `/colophon`, `/now`, `/sitemap`, `/slashes`) are missing. The design specifies placeholder pages for all major sections plus slash pages — none of the slash page routes appear in the sitemap. This is an SEO gap for pages that exist and are linked from the footer.
- Evaluate `lastModified: new Date()` in the sitemap. This sets every route's last-modified date to the build time, not the actual last modification date of the content. Search engines use `lastModified` to prioritize crawling. Setting all pages to the same date provides no signal. For static content pages, this is technically correct (they're rebuilt on every deploy) but semantically misleading.
- Challenge whether `generateMetadata()` is sufficient for placeholder pages. Placeholder pages have no unique content, just "under construction" text. Should they have `noindex` meta tags to prevent search engines from indexing empty placeholder content? The design doesn't address this, and indexing placeholder pages could harm SEO if they rank for the site's target keywords.
- Examine the OG image specification. The design says "simple branded image with site name" at 1200x630. It doesn't specify who creates this image, whether it's a design task or a development task, or whether a programmatic OG image generation approach (using `next/og` or similar) should be considered for future per-page OG images.

## 5. Error Handling and Failure Mode Gaps

The error handling section covers 5 scenarios. Find the missing ones:

- Challenge the absence of any runtime error boundary. The design specifies server components by default with no `error.tsx` files. If a server component throws during rendering (e.g., Velite data is malformed in a way that passes schema validation but breaks component logic), the entire page fails with Next.js's default error page. The design should specify whether `error.tsx` boundaries are needed at the route group level.
- Evaluate the failure mode when `src/styles/tokens.css` has a CSS syntax error. This file is imported by both `globals.css` and the playground base stylesheet. A syntax error in `tokens.css` could silently break theme variables across the entire site. The design doesn't mention CSS validation or how this failure manifests (build error? silent degradation?).
- Challenge the absence of a failure mode for the Velite webpack plugin. If the plugin fails or throws during `next build`, does the build fail with a clear error, or does it produce a build with stale `.velite/` content from the last successful `postinstall` run? The design treats Velite build-time errors as covered by "exits with non-zero code" but that's the CLI — the webpack plugin may have different failure characteristics.
- Examine what happens when `next/font/google` fails to download fonts at build time (e.g., CI has restricted network access, Google Fonts CDN is down). Does the build fail? Does it silently fall back to system fonts? The design says `next/font` eliminates CLS "from font swapping" but doesn't address the build-time failure mode.

## 6. Implementation Order and Dependency Risks

The design specifies a 4-phase implementation order. Stress-test the sequencing:

- Challenge why the CSS isolation spike (R11) is grouped with the Velite pipeline (R3) in phase 2. The spike's outcome potentially affects layout and theme decisions in phase 3. But the Velite pipeline is independent — it's a content processing tool with no CSS implications. Grouping them suggests parallel work, but the spike must complete before phase 3 starts (it informs CSS architecture), while Velite has no such constraint. This grouping may create an artificial bottleneck where Velite work waits for the spike, or the spike gets rushed to unblock phase 3.
- Evaluate whether phase 3's scope is too large. It combines layouts, theme, metadata, styles, fonts, and CSP — six requirements (R4, R5, R9, R10, R14, R13) in one phase. These have internal dependencies (e.g., R9 global styles must exist before R4 layout components can use them, R14 font loading must be configured before R4 renders text). The design doesn't specify the sub-ordering within phase 3.
- Challenge whether testing infrastructure (R12) should be in phase 4 (last). Test infrastructure is a foundation that all phases benefit from. Deferring it to the last phase means phases 1-3 have no test coverage during development. The canary tests can't catch regressions in phases 2-3 if they don't exist yet.
- Examine the dependency between the spike outcome and the playground layout design. Phase 2 runs the spike. Phase 3 implements the playground layout. If the spike produces outcome (c) — same-page isolation not viable — the playground layout in phase 3 simplifies significantly (just iframe wrapper). But phase 3 is designed assuming outcome (a) or (b). The design doesn't describe how the phase 3 playground layout adapts if the spike fails.

---

## Closing Deliverables

Conclude your analysis with:

1. **Top 5 risks/gaps**, ranked by severity × likelihood. For each, describe the concrete failure scenario — not an abstract risk statement.
2. **Top 3 conclusions to challenge or reverse**, with specific reasoning for why the design's current decision may be wrong.
3. **What's missing** — concrete work items that should be completed before acting on this design document.

Be specific and concrete. Cite failure scenarios, not abstract risks. If something is actually fine, say so briefly and move on.

---

Write your complete analysis to: `/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/site-foundation/reviews/adversarial-analysis-design-r2.md`
