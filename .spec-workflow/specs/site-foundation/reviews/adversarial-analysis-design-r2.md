# Adversarial Analysis — site-foundation Design (Round 2)

## 1. Shared Token Architecture (`tokens.css`) — Stress-Test

### 1.1 `@import` of `tokens.css` inside `@layer playground` does NOT apply tokens to the container

**Classification**: Novel

The design says `tokens.css` is "imported by both `globals.css` and the playground base stylesheet" and shows a dependency diagram:

```
src/styles/tokens.css
  ├── imported by globals.css (applied to :root / .dark)
  └── imported by playground base stylesheet (applied to .playground-container)
```

But `tokens.css` defines its custom properties on `:root` and `.dark` selectors. When you `@import "./tokens.css"` inside a playground stylesheet that wraps everything in `@layer playground { .playground-container { ... } }`, the `@import` expands **before** the `@layer` block — CSS `@import` statements must appear at the top of the file per the CSS specification and are not nestable inside `@layer` rules. Even with CSS nesting proposals, `@import` inside `@layer` is not valid CSS. The imported `:root {}` and `.dark {}` selectors would target `<html>`, not `.playground-container`.

Meanwhile, the playground container uses `all: initial`, which resets all inherited CSS custom properties. So the tokens set on `:root` via the import don't cascade into the container — they're wiped by the reset.

The design's placeholder comments (`--background: /* from shared tokens */;`) in the playground base stylesheet hint that the actual values need to be copied or transformed, but the architecture diagram and prose claim the import itself handles this. It doesn't. The playground base stylesheet must either:

1. Re-declare every token on `.playground-container` with literal values (defeating the "single source of truth" claim), or
2. Use a build-time transform (PostCSS plugin, CSS preprocessor) to rewrite `:root`/`.dark` selectors to `.playground-container`/`.dark .playground-container` — which is not mentioned anywhere in the design.

**Concrete failure**: Implement as described → `all: initial` wipes custom properties → shadcn/ui Button inside playground renders with transparent background, no text color, broken border-radius. The "shared import" architecture does not work as described without selector transformation.

**Severity**: High — this is a foundational architecture claim that doesn't hold under CSS specification rules.

### 1.2 Dark mode has no mechanism inside the playground container

**Classification**: Novel

The main site's dark mode works by toggling `.dark` on `<html>`. `tokens.css` defines dark overrides on `.dark {}`. After `all: initial` on `.playground-container`, custom properties from both `:root` and `.dark` are wiped.

The design doesn't describe how the playground container detects or responds to theme changes. Possible approaches:

- A JavaScript hook that reads the current theme and applies a class or inline styles to `.playground-container` — not described.
- Duplicating the dark-mode token set on `.dark .playground-container` in the playground stylesheet — contradicts the "shared single file" claim and requires manually maintaining selectors.
- Using `color-scheme: light dark` — this only affects UA-stylesheet-level rendering (form controls, scrollbars), not custom properties.

Without an explicit mechanism, the playground container is always in light mode regardless of the site theme. The design says playground items "do not inherit the site's dark/light mode" per the tech doc, but the playground **base stylesheet** re-establishes shadcn/ui tokens (including `--background`, `--foreground`) — those tokens are theme-dependent. If the playground is always-light, the base stylesheet should declare only light-mode values. If it should respect the theme, it needs a dark-mode selector mechanism. The design is ambiguous on this point.

**Severity**: Medium — ambiguity that will cause implementation confusion. The spike fixtures test "both light and dark themes" (AC5) but the design provides no mechanism for the playground to actually switch themes.

### 1.3 `@import "./tokens.css"` after `@import "tailwindcss"` — layer context question

**Classification**: Novel

In `globals.css`:

```css
@layer playground;
@import "tailwindcss";
@import "./tokens.css";
```

Tailwind v4's `@import "tailwindcss"` expands into `@layer base`, `@layer components`, `@layer utilities`, and related declarations. The subsequent `@import "./tokens.css"` is a top-level import that expands to unlayered CSS (`:root {}` and `.dark {}` selectors without any `@layer` wrapper).

This is actually fine — unlayered CSS has higher specificity than layered CSS in the cascade, so the tokens override any conflicting declarations from Tailwind's layers. However, the design doesn't acknowledge or document this ordering dependency. If someone later wraps the tokens import in a layer (e.g., `@layer tokens { @import "./tokens.css"; }` — noting that nested `@import` doesn't work, but a future refactor might restructure this), the cascade priority changes silently.

**Severity**: Low — works correctly by accident, but the reason it works is not documented. A comment in `globals.css` explaining that `tokens.css` is intentionally unlayered to override Tailwind's layered base would prevent future confusion.

### 1.4 "Single source of truth" claim is misleading

**Classification**: Compounding (builds on v1 token drift finding)

The v1 review identified token drift. The fix was `tokens.css` as a shared source. But the design's own playground base stylesheet shows:

```css
@layer playground {
  .playground-container {
    --background: /* from shared tokens */;
    --foreground: /* from shared tokens */;
    --primary: /* from shared tokens */;
    --radius: /* from shared tokens */;
  }
}
```

These placeholder comments imply that the actual values will be manually copied from `tokens.css`. This is not an import — it's manual duplication with a comment pointing to the source. Token drift is reduced (developer knows where to look) but not eliminated (developer must remember to update both locations).

The design should honestly acknowledge that the playground requires a selector-transformed copy of the tokens, and either:
- Accept the duplication as a maintenance cost, or
- Specify a build-time mechanism (PostCSS, CSS preprocessor, or a script) to generate the playground-scoped version from `tokens.css`.

**Severity**: Medium — the claimed architecture doesn't match the implementation pattern shown in the same document.

---

## 2. Velite Integration Edge Cases and Next.js Compatibility

### 2.1 VeliteWebpackPlugin does not work with Turbopack

**Classification**: Novel

The design specifies `"dev": "next dev --turbopack"` and adds a `VeliteWebpackPlugin` to `next.config.ts` via the `webpack` config key. Turbopack does not execute webpack plugins — the `webpack` configuration callback in `next.config.ts` is entirely ignored when Turbopack is the bundler.

This means during `next dev --turbopack`, content file changes (adding/editing MDX files in `content/`) will **not** trigger Velite rebuilds. The developer must either:
- Manually run `velite build` after every content change, or
- Restart the dev server, or
- Remove `--turbopack` from the dev script.

The design presents the webpack plugin integration as solving dev-time content rebuilds but doesn't acknowledge that it's inert under the specified dev configuration. This is not a theoretical edge case — it's the default development experience.

Velite's documentation may offer a Turbopack-compatible integration (e.g., a file-watcher mode via `velite dev` run alongside `next dev`), but the design doesn't mention this. The standard workaround is running `velite dev` as a parallel process (e.g., via `concurrently` in the dev script), but this adds a dependency and changes the dev script.

**Concrete failure**: Developer edits `content/pages/about.mdx` → saves → page doesn't update → confusion → developer discovers Turbopack ignores webpack plugins → must restart dev server on every content change.

**Severity**: High — directly impacts the primary development workflow on every content edit.

### 2.2 `postinstall` and `--frozen-lockfile` interaction is fine

The `pnpm install --frozen-lockfile` flag does not suppress lifecycle scripts (`postinstall`). It only prevents lockfile modifications. The CI workflow runs `pnpm install` without `--frozen-lockfile` explicitly (the `pnpm/action-setup` action handles this), and even if added, `postinstall` would still execute. This is actually fine. Moving on.

### 2.3 `.velite/` output contract has no validation

**Classification**: Novel

The `#site/content` path alias maps to `.velite/`. The design relies on Velite generating specific exports (e.g., `pages` collection) that TypeScript code imports. But there's no integration test that validates "Velite generates output → TypeScript can import it → the data shape matches expectations."

TypeScript compilation (`tsc --noEmit`) catches type errors if Velite's generated types change in a breaking way. However, this depends on Velite generating accurate TypeScript declarations in `.velite/`. If a Velite update changes the generated type declarations without changing the runtime output (or vice versa), the mismatch could slip through type-checking.

The canary test renders a Button — it doesn't import from `#site/content`. No test validates the Velite → TypeScript import contract.

**Severity**: Low — the TypeScript compiler provides reasonable coverage, and Velite version changes are lockfile-controlled. But a single integration test that imports from `#site/content` and asserts the shape would catch regressions that `tsc` misses (e.g., runtime data shape diverging from generated types).

### 2.4 `output.clean: true` race condition in development

**Classification**: Novel

The `output.clean: true` setting deletes `.velite/` before regenerating it. During development, if Velite rebuilds (triggered by content file changes — assuming a working watcher, see 2.1) while Next.js is serving a page that imports from `.velite/`, the import target temporarily doesn't exist.

In practice, this manifests as a transient build error in the dev server: "Module not found: Can't resolve '#site/content'". The dev server recovers on the next request after Velite finishes writing, so this is an annoyance, not a data loss scenario. But for a developer who doesn't know about `clean: true`, the intermittent "module not found" errors are confusing.

**Severity**: Low — transient dev-time annoyance, not a correctness issue. Noting it because the design doesn't mention this tradeoff. Setting `clean: false` avoids this at the cost of stale files accumulating (which is also acceptable since `.velite/` is gitignored).

---

## 3. Mobile Navigation Implementation Gaps

### 3.1 Radix Sheet is appropriate but the design should commit to it explicitly

**Classification**: Novel

The design says "Uses a Radix UI primitive (e.g., `Sheet`) for the mobile menu" — the parenthetical "e.g." suggests this is a tentative choice. For 6 nav items, Sheet (a slide-out panel) works. A collapsible dropdown would also work. The tradeoff:

- **Sheet**: Full-height overlay with backdrop. Blocks interaction with page content while open. Provides a clear "you're in the menu" state. Heavier visually but standard for mobile nav.
- **Collapsible**: Pushes content down or overlays without a backdrop. Lighter, but can cause layout reflow and doesn't prevent accidental clicks on page content behind the menu.

Sheet is the more common pattern for site navigation and is fine for 6 items. But the "e.g." should be removed — the design should commit to Sheet or specify the alternative. Implementation shouldn't be choosing the component primitive.

**Severity**: Low — the choice is reasonable, but the design should make it definitive.

### 3.2 Focus trapping is correct behavior

Sheet's focus trapping is the correct accessibility pattern for a modal navigation menu. When a modal overlay is open, focus should be trapped inside it — this is WCAG 2.1 SC 2.4.3 (Focus Order) compliance for modal dialogs. Users close the menu (Escape key, close button, or backdrop click) to return to page content. The design doesn't need to defend this — it's standard behavior. Moving on.

### 3.3 Missing ARIA attributes on hamburger button

**Classification**: Novel

The design specifies `aria-label` and `aria-expanded` on the mobile menu toggle but omits:

- **`aria-controls`**: Should reference the `id` of the menu container so assistive technology can announce the relationship. Required by WAI-ARIA Authoring Practices for disclosure widgets.
- **`aria-haspopup`**: Signals that the button opens a menu/dialog. For a Sheet (dialog role), `aria-haspopup="dialog"` is appropriate.

If using Radix Sheet's `Trigger` component, `aria-controls` is handled automatically (Radix generates matching IDs). But `aria-haspopup` is not added by Radix Sheet by default — it must be explicitly set.

The design should specify these attributes or note that Radix Sheet handles them automatically (and verify that it does).

**Severity**: Low — Radix likely handles most of this, but the design should verify rather than leaving it to implementation discovery.

### 3.4 ThemeToggle placement on mobile is unspecified

**Classification**: Novel

On desktop, both the nav and ThemeToggle are in the header. On mobile, the nav collapses into a Sheet. The design doesn't specify where the ThemeToggle goes:

- **Option A**: ThemeToggle stays in the header bar, visible at all times. The header bar contains: site title, ThemeToggle button, hamburger button. This works but crowds the header on narrow screens (three elements competing for horizontal space).
- **Option B**: ThemeToggle moves inside the Sheet alongside nav links. User must open the menu to change themes. This is less discoverable but cleaner.

The design should make this decision. Common pattern is Option A (always visible in header), but the design shows `Header` containing both `Nav` and `ThemeToggle` without distinguishing mobile behavior.

**Severity**: Medium — affects both mobile UX and implementation. Without a decision, the implementer must choose, and the choice may not match design intent.

---

## 4. Metadata, SEO, and Sitemap Completeness

### 4.1 Sitemap missing slash page routes

**Classification**: Novel

The sitemap hardcodes 7 routes:

```typescript
const routes = ["/", "/profile", "/projects", "/contributions", "/blog", "/resources", "/playground"]
```

Missing routes that exist in the structure document:
- `/about`
- `/contact`
- `/colophon`
- `/now`
- `/sitemap` (the HTML sitemap page — meta, but valid)
- `/slashes`

These are real pages with real routes. They're linked from the footer (`/slashes`) and navigable from the site. Omitting them from `sitemap.xml` means search engines may not discover them via the sitemap (they'll still be found via link crawling, but the sitemap exists specifically to ensure complete coverage).

**Severity**: Medium — SEO gap for 6 pages. Easy fix: add the routes to the array.

### 4.2 `lastModified: new Date()` is semantically correct for static builds

For a fully static site rebuilt on every deploy, `lastModified: new Date()` (build time) is accurate — every page is regenerated on every build. Search engines handle this fine. Setting per-page dates based on git history or content modification times would be more precise but is unnecessary complexity for a personal site. This is fine. Moving on.

### 4.3 Placeholder pages should use `noindex`

**Classification**: Novel

Placeholder pages render "This section is under construction" with no meaningful content. If search engines index these pages, they provide no value to searchers and may associate the site with low-quality content during the critical early-crawl period (when search engines form initial quality assessments).

The design should specify that placeholder pages include `<meta name="robots" content="noindex">` via their `generateMetadata()` function. When a section is built out (downstream spec replaces the placeholder), the `noindex` is removed. This is a one-line addition to each placeholder's metadata:

```typescript
export function generateMetadata(): Metadata {
  return {
    title: "Projects",
    robots: { index: false },
  }
}
```

**Severity**: Medium — indexing empty placeholder pages during the initial launch window could harm the site's search quality signals. Easy to add, meaningful to get right.

### 4.4 OG image creation is unspecified

**Classification**: Novel

The design says "simple branded image with site name" at 1200×630 but doesn't specify:
- Who creates it (designer? developer? AI tool?)
- Whether it's a static file committed to the repo or generated at build time
- Whether `next/og` (dynamic OG image generation) should be set up now for future per-page images

For site-foundation, a static PNG in `public/images/og-default.png` is sufficient. But the design should explicitly say "create a static PNG" rather than leaving the format/process ambiguous. `next/og` integration is a downstream concern — unnecessary complexity for a default OG image.

**Severity**: Low — the implementer will likely just create a static image, but the design should confirm this is the intent.

---

## 5. Error Handling and Failure Mode Gaps

### 5.1 No `error.tsx` boundaries specified

**Classification**: Novel

The design specifies server components by default and lists 5 error scenarios. None involve a runtime rendering error. If a server component throws during rendering (e.g., Velite data is valid per schema but a component has a bug processing it), Next.js shows its default error page — a white page with "Application error: a server-side exception has occurred."

For a personal site, this is acceptable for the initial launch — there's no user-facing error that needs graceful degradation when the developer is the only content author. Adding `error.tsx` files is cheap, but the design should explicitly decide: "no `error.tsx` in site-foundation; add when needed" rather than omitting the topic.

**Severity**: Low — acceptable risk for a solo-developer personal site. The default Next.js error page is ugly but functional. Worth a one-line design decision: "error boundaries deferred."

### 5.2 CSS syntax error in `tokens.css` — silent partial failure

**Classification**: Novel

If `tokens.css` has a CSS syntax error (e.g., missing semicolon, invalid `oklch()` value), the behavior depends on the error type:

- **Parse-level error** (invalid syntax): The CSS parser ignores the malformed rule and all subsequent rules until it recovers. This means some tokens silently become undefined, and components using those tokens render with browser defaults (transparent backgrounds, black text, no border-radius). The build succeeds — CSS syntax errors are not build errors in any bundler.
- **Value-level error** (valid syntax, invalid value like `oklch(2 0 0)`): The property is silently ignored by the browser. Same visual outcome.

Neither produces a build failure or warning. The site deploys with broken styling.

Mitigation options:
- **Stylelint** in CI — catches syntax and some value errors. Not mentioned in the design.
- **Visual regression testing** — overkill for site-foundation.
- **Accepting the risk** — reasonable for a solo developer who will see the broken styling in preview deploys before merging.

**Severity**: Low — the Vercel preview deploy workflow catches this visually before production. But the design's error handling section should acknowledge CSS errors as a "silent failure" category.

### 5.3 VeliteWebpackPlugin failure characteristics are unknown

**Classification**: Novel

The design covers Velite CLI failures ("exits with non-zero code"). But the `VeliteWebpackPlugin` is a webpack plugin invoked during `next build`. Its failure behavior depends on the plugin's implementation:

- If it throws, webpack catches the error and the build fails with a webpack error stack trace (not a Velite error message).
- If it swallows errors silently, the build succeeds with stale `.velite/` content from the last `postinstall` run.

However: the CI workflow runs `pnpm install` (which triggers `postinstall` → `velite build`) **before** `pnpm build`. So the `.velite/` directory is always freshly generated by the CLI before the webpack build starts. The webpack plugin's role during `next build` is only relevant for dev-time rebuilds — and per finding 2.1, it doesn't work with Turbopack anyway.

**Severity**: Low — in CI, the CLI-based build is authoritative. The webpack plugin is redundant in the build pipeline and only matters for dev (where it doesn't work with Turbopack).

### 5.4 `next/font/google` build-time font download failure

**Classification**: Novel

`next/font/google` downloads fonts from Google Fonts during `next build` and self-hosts them. If the download fails:

- Next.js build **fails** with an error like "Failed to fetch font". The build does not silently fall back to system fonts.
- In CI (GitHub Actions on `ubuntu-latest`), Google Fonts is reliably accessible. This is not a realistic failure scenario.
- If network restrictions exist (corporate proxy, air-gapped CI), `next/font/local` with committed font files is the solution. The design mentions this as an alternative ("either `next/font/local` with self-hosted font files in `public/fonts/` or `next/font/google`") but doesn't make a decision.

The design should commit to one approach. `next/font/google` is simpler and appropriate for GitHub Actions on public runners. The fallback to `next/font/local` is only needed if the deployment environment changes.

**Severity**: Low — `next/font/google` works reliably on GitHub Actions. The design's listing of both options without choosing is a minor ambiguity, not a risk.

---

## 6. Implementation Order and Dependency Risks

### 6.1 CSS spike (R11) and Velite (R3) are independent — grouping is fine

**Classification**: Not an issue

The design groups R11 and R3 in phase 2. These are independent work streams. Grouping them in the same phase doesn't imply they must be sequential — it means they're both done during phase 2. The spike must complete before phase 3 (it informs CSS architecture), and Velite can complete whenever. The grouping is "both happen in phase 2, both must be done before phase 3." This is correct sequencing. No issue.

### 6.2 Phase 3 scope is large but the internal ordering is implied

**Classification**: Novel

Phase 3 combines R4 (layouts), R5 (theme), R9 (styles), R10 (metadata), R13 (CSP), R14 (fonts). The design lists them in one group without specifying sub-ordering. The natural dependency chain is:

1. R9 (global styles/tokens) — foundation for everything visual
2. R14 (font loading) — configured in root layout
3. R4 (layouts + nav) — uses styles and fonts
4. R5 (theme toggle) — requires layout to exist
5. R10 (metadata) — can be done alongside any of the above
6. R13 (CSP headers) — independent, done whenever

This ordering is inferable by a competent implementer. But Phase 3 is 6 requirements — more than any other phase. If implementation hits a snag on any one (e.g., the spike outcome changes the playground layout approach), the entire phase is at risk.

The design should either:
- Specify the sub-ordering within phase 3 (takes one paragraph), or
- Split phase 3 into two phases: "styles + fonts + theme" and "layouts + metadata + CSP".

**Severity**: Medium — the scope is manageable for a solo developer but the design should make the dependency chain explicit rather than relying on inference.

### 6.3 Testing infrastructure (R12) in phase 4 is problematic

**Classification**: Novel

R12 (testing infrastructure) is in phase 4, the last phase. This means:

- Phase 1 (scaffolding + CI/CD) has no test runner. The CI workflow includes `pnpm test` and `pnpm test:e2e` but these fail if Vitest and Playwright aren't configured yet. Either the CI workflow is incomplete in phase 1 (those lines are commented out and added in phase 4), or the CI workflow fails until phase 4.
- Phases 2-3 have no test coverage. The CSS isolation spike (R11, phase 2) specifies Playwright tests (AC5: computed style comparison). These tests can't be written until R12 is done in phase 4. So either the spike tests are deferred (weakening the spike's validation), or R12 is partially done in phase 2 (contradicting the phase plan).
- The spike's Playwright test (`e2e/tests/playground-isolation.test.ts`) is described in the Testing Design section as part of the R12 deliverables, but it validates R11 findings. If R12 is in phase 4 and R11 is in phase 2, when does this test actually get written?

The design has a sequencing contradiction: R11 requires Playwright tests for validation, but the Playwright infrastructure (R12) isn't set up until phase 4. The spike section says "verified in both dev and production builds" (AC5) — without Playwright, this verification is manual and unreproducible.

**Concrete failure**: Phase 2 runs the spike, manually verifies results (fragile), moves to phase 3. Phase 4 adds Playwright, writes the spike regression test, discovers a discrepancy the manual check missed. Phase 3 work may need revision.

**Severity**: High — testing infrastructure should be phase 1 or early phase 2 at the latest. The spike specifically depends on automated testing for its verification criteria.

### 6.4 Phase 3 playground layout adaptation for spike outcome (c) is unspecified

**Classification**: Novel

Phase 2 runs the CSS isolation spike. Phase 3 implements the `(playground)` layout. The design describes the playground layout assuming outcome (a) or (b) — `all: initial` container with `@layer playground`. If the spike produces outcome (c) — same-page isolation not viable — the playground layout simplifies to an iframe wrapper.

The design says "Spec 8 scope reduces accordingly" for outcome (c), but the playground layout is in site-foundation, not spec 8. The site-foundation design needs to describe what the `(playground)/layout.tsx` looks like under outcome (c):

- Does it still have a style-reset container? (No — that's the thing that failed.)
- Does it render an iframe pointing to the embed route? (Probably.)
- Does the playground index page change? (Maybe — the gallery of items still exists, but each item opens in an iframe.)

The design should have a brief "if spike outcome (c)" section for the playground layout.

**Severity**: Medium — without this, the implementer must make architectural decisions during phase 3 that should have been made in the design.

---

## Closing Deliverables

### Top 5 Risks/Gaps (Severity × Likelihood)

1. **VeliteWebpackPlugin is inert under Turbopack (2.1)**: The specified dev script (`next dev --turbopack`) ignores the webpack plugin. Every content edit during development requires a manual rebuild or dev server restart. This affects every development session. Likelihood: certain. Impact: constant developer friction on the core workflow. Fix: use `velite dev` as a parallel process or switch to `next dev` without Turbopack for content-heavy work.

2. **Shared token architecture doesn't work as described (1.1 + 1.4)**: CSS `@import` of `tokens.css` doesn't scope selectors to `.playground-container`. The `all: initial` reset wipes inherited custom properties. The playground base stylesheet requires either manual token duplication or a build-time selector transform. The "single source of truth" claim in the design is architecturally inaccurate. Likelihood: certain. Impact: playground shadcn/ui components render broken until the implementer discovers and solves the selector scoping problem ad-hoc.

3. **Testing infrastructure in phase 4 contradicts spike testing needs (6.3)**: The CSS isolation spike (phase 2) requires Playwright tests for computed style verification (AC5). Playwright isn't configured until phase 4. The spike must either rely on manual verification (fragile, unreproducible) or pull R12 forward (breaking the phase plan). Likelihood: certain. Impact: spike validation is weakened or the phase plan is abandoned.

4. **Placeholder pages indexed by search engines (4.3)**: Six placeholder pages with "under construction" content are deployed without `noindex`. During the site's initial launch — the period when search engine quality signals are most impactful — these empty pages are indexed. Likelihood: high (search engines will find them via sitemap and internal links). Impact: medium — diluted search quality for the site's target keywords during the launch window.

5. **ThemeToggle mobile placement unspecified (3.4)**: No decision on whether the theme toggle is in the header bar or inside the mobile Sheet. Likelihood: certain to cause implementation ambiguity. Impact: low-medium — the implementer makes a choice that may need to be revised when visual design review happens.

### Top 3 Conclusions to Challenge or Reverse

1. **"Shared `tokens.css` eliminates token drift" should be reversed to "shared `tokens.css` requires selector transformation for the playground."** The current design claims `@import` solves the problem. It doesn't. The design should either specify a PostCSS transform, accept manual duplication with a documented update process, or use CSS custom property inheritance through a mechanism other than `all: initial` (e.g., explicitly re-inheriting specific properties). The honest answer is that `all: initial` and shared tokens are in tension, and the design must choose which constraint to relax.

2. **Testing infrastructure (R12) should be moved from phase 4 to phase 1.** R12 is described as "foundation that all phases benefit from" in the prompt — and the design's own spike (R11, phase 2) requires Playwright for verification. Vitest and Playwright configuration is lightweight (~30 minutes) and has no dependencies on other phases. Deferring it to the last phase provides zero benefit and creates a clear sequencing problem. The canary tests should be the first thing that runs, not the last thing implemented.

3. **The `next dev --turbopack` default should be reconsidered or supplemented.** Turbopack provides faster HMR for React components, but the design's content pipeline integration (`VeliteWebpackPlugin`) is incompatible with it. For a content-driven site where the developer frequently edits MDX files, the inability to trigger content rebuilds in the default dev workflow is a significant friction. Either change the dev script to `next dev` (Webpack, slower HMR, working content rebuilds) or add `velite dev` as a parallel process via `concurrently` (adds a dependency but preserves both Turbopack speed and content watching).

### What's Missing

1. **Playground token scoping mechanism**: The design needs a concrete solution for applying `tokens.css` values to `.playground-container` after `all: initial` resets inheritance. Either specify manual re-declaration (with an update discipline) or introduce a build-time transform. The current placeholder comments are not a design.

2. **Dev-time content rebuild strategy**: Document how content changes trigger rebuilds during development given the Turbopack/webpack plugin incompatibility. Options: `velite dev` alongside `next dev`, drop `--turbopack`, or accept manual `velite build` after content edits. Choose one.

3. **Phase 3 sub-ordering**: List the 6 requirements in their implementation sequence to prevent the implementer from discovering dependency chains by trial and error.

4. **Playground layout under spike outcome (c)**: Brief description of what `(playground)/layout.tsx` contains if the spike determines same-page isolation is not viable.

5. **`noindex` directive for placeholder pages**: Add `robots: { index: false }` to the `generateMetadata()` specification for placeholder pages.

6. **Sitemap route completeness**: Add the 6 missing slash page routes (`/about`, `/contact`, `/colophon`, `/now`, `/sitemap`, `/slashes`) to the hardcoded routes array.
