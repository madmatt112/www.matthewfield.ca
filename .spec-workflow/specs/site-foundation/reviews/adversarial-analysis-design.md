# Adversarial Analysis: site-foundation Design Document

## 1. CSS Isolation Spike: Cascade Layer Ordering and `all: initial` Consequences

### Layer ordering is underspecified and relies on fragile assumptions

The design declares `@layer playground` before `@import "tailwindcss"` and assumes this establishes `playground` at the lowest cascade priority. This relies on the CSS spec's "first declaration wins" rule for layer ordering — layers are ordered by their first `@layer` declaration in document order.

However, Tailwind v4's `@import "tailwindcss"` is not a simple stylesheet inclusion. It expands into its own internal `@layer` declarations (`base`, `components`, `utilities`). The critical question is whether Tailwind v4's import emits its `@layer` declarations as top-level declarations in the importing stylesheet's context.

Per the CSS spec, layers from imported stylesheets are interleaved based on the import position. If `@import "tailwindcss"` internally declares `@layer base, components, utilities`, those layers appear after `playground` in the order — which is the desired behavior. This should work correctly **if** Tailwind v4's import emits its `@layer` declarations at the top level after expansion.

**The actual risk**: The design treats this as established architectural fact, but it is the primary hypothesis the spike must verify. Tailwind v4's internal implementation could change how it emits layer declarations between minor versions. The design relies on this as a stable contract with no version pinning strategy for Tailwind beyond the lockfile. A Tailwind update that changes layer emission order would silently break playground isolation.

Additionally, Turbopack and Webpack handle CSS `@import` expansion differently. The tech steering doc explicitly warns: "CSS `@layer` ordering and CSS Modules class name hashing may differ between bundlers." The spike verification (AC5) checks computed styles but doesn't isolate *why* a style resolved the way it did. If both bundlers happen to produce the same computed output for different reasons, the spike would pass while the architecture remains fragile.

The design should explicitly flag layer ordering as a hypothesis under test, not a known architectural property.

### `all: initial` resets far more than the design accounts for

The design re-establishes `font-family`, `font-size`, `line-height`, `color`, `box-sizing`, and shadcn/ui CSS custom properties. But `all: initial` resets *every* CSS property to its initial value — roughly 350 properties. Properties whose reset will cause subtle failures that the design does not address:

- **`color-scheme`**: Initial value is `normal`. The `color-scheme` property tells the browser which color schemes the element supports, affecting form controls, scrollbars, and system UI. Without `color-scheme: light dark` on the playground container, browser-native elements (scrollbars, `<select>`, `<input>`) inside playground items will always render in the browser's default light scheme regardless of the theme tokens being re-established. The design says playground items "do not inherit the site's dark/light mode," but shadcn/ui components rendered inside the playground (AC3) rely on `.dark` class and CSS variables. Native form elements within those components will always look light-themed even when dark tokens are active.

- **`text-size-adjust` / `-webkit-text-size-adjust`**: Initial value is `auto`. On iOS Safari, this allows the browser to inflate font sizes on narrow viewports independently. The typical reset is `text-size-adjust: 100%`. Without this, text inside playground items on mobile Safari may render at unexpected sizes compared to the rest of the site.

- **`tab-size`**: Initial value is `8`. If any playground item renders code or preformatted text, tabs will be unusually wide (8 spaces instead of the typical 4). The site's global stylesheet likely sets a shorter tab-size, but that won't cascade into the reset container.

- **`accent-color`**: Initial value is `auto`. Checkboxes, radio buttons, and range inputs inside the playground lose any custom accent color. shadcn/ui components with Radix primitives and custom styling are probably fine, but native form elements will look browser-default.

- **`-webkit-text-fill-color`**: Resets, which can cause color inconsistencies on WebKit browsers if any parent had set this.

Properties that are fine after reset: `cursor: auto` (correct initial), `pointer-events: auto` (correct), `visibility: visible` (correct), `direction: ltr` (correct for English), `writing-mode: horizontal-tb` (correct), `forced-color-adjust: auto` (correct — preserves Windows High Contrast Mode accessibility).

**Actionable gap**: `color-scheme` and `text-size-adjust` should be re-established in the playground base stylesheet alongside the typographic properties. The design's re-establishment list is incomplete.

### The fallback plan is not a plan

The design says: "If `@layer playground` ordering cannot be controlled predictably relative to Tailwind v4's internal layers, the spike will document the alternative approach: high-specificity selectors via CSS Modules without layers."

This is one sentence with no design detail. The fallback is not viable as described:

1. **CSS Modules don't inherently provide "high specificity."** A CSS Modules class selector has specificity `(0, 1, 0)` — the same as any other class selector. "High-specificity selectors via CSS Modules" doesn't increase specificity over Tailwind utilities (also class selectors at `(0, 1, 0)`). You'd need doubled selectors (`.playground.playground`), `:is()` wrappers, or `!important` — each with different implications for composability that the design doesn't address.

2. **CSS Modules class name hashing differs between Turbopack and Webpack.** The tech doc explicitly warns about this. The generated names differ, but this doesn't affect specificity (it's cosmetic). However, if the fallback strategy involves targeting specific generated class names for overrides, it won't work consistently across bundlers.

3. **Without layers, the fallback relies purely on source order and specificity.** Playground styles must always appear *after* Tailwind utilities in the cascade, which is hard to guarantee when Next.js chunks and concatenates CSS differently between dev and production builds.

A real fallback would need to specify: what selectors are used, how specificity is managed, how source order is controlled, and acceptance criteria for the fallback path. None of this exists.

### Radix UI portal escape is a certainty, not a contingency

The design says (AC6): "Verify whether the portal renders within the isolation boundary or escapes to `document.body`. Document the result as a known limitation with mitigation path if portals escape."

Radix UI renders all overlay components (Dialog, DropdownMenu, Popover, Tooltip, Select, AlertDialog, Sheet, HoverCard, ContextMenu, Menubar) to `document.body` by default using React portals. This is documented, intentional Radix behavior — not an edge case to discover.

The design should:
- State that portals **will** escape the playground container as a known fact.
- Evaluate whether Radix's `container` prop (available on some primitives) can redirect portal rendering into the playground container.
- Pre-commit to outcome (b) of the graduated model since portal escape is certain.
- Produce a matrix of which shadcn/ui overlay components can be contained via `container` prop and which cannot.

Currently the spike wastes effort "discovering" something documented in Radix's API reference. The spike should validate a *mitigation*, not discover a *problem*.

### Token duplication creates silent drift

The playground base stylesheet copies theme token values from `globals.css`:

```css
--background: /* value from globals.css */;
--foreground: /* value from globals.css */;
```

This creates a maintenance coupling with no enforcement. When theme tokens in `globals.css` change — which the design explicitly anticipates ("Downstream specs extend theme tokens") — the playground stylesheet becomes stale. The failure mode: shadcn/ui components render correctly on the main site but with stale colors/spacing on playground routes. This is easy to miss during development because playground routes are a separate visual context.

The design has created a fundamental tension: `all: initial` is needed for isolation, but it breaks CSS custom property inheritance — the exact mechanism that would prevent token drift. The design doesn't acknowledge this tension or propose a resolution.

Viable mitigations the design should specify:
- (a) Define tokens in a shared source (CSS file or Tailwind plugin) imported by both `globals.css` and the playground stylesheet.
- (b) Add a Playwright test comparing computed token values between site and playground containers.
- (c) Use PostCSS to generate the playground stylesheet from the same source of truth.

The design picks none of these.

---

## 2. CI/CD Pipeline: Build Redundancy, Caching, and E2E Architecture

### The site builds twice per CI run with no artifact sharing

The `e2e` job has `needs: build` but receives no artifacts from the `build` job. It runs `pnpm install` and `pnpm build` from scratch. This means:

- Two full `pnpm install` runs (mitigated by pnpm cache, ~10-15s each)
- Two full `next build` runs (~30-60s each for a site this size)
- Two Velite builds (via `postinstall`, ~5-10s each)
- One Playwright browser install (~30-60s)

Estimated redundant work: **~1-2 minutes per CI run**. The `needs: build` dependency creates a sequential bottleneck while providing zero benefit — no artifacts are passed, no data is shared. The second job repeats everything the first job did.

The design doesn't acknowledge this redundancy. It appears to be an oversight, not a deliberate simplicity-over-efficiency choice. The `needs: build` relationship implies the `e2e` job was intended to consume `build`'s output, but the artifact passing was never implemented.

**Fix**: Either consolidate into a single job (simplest — add Playwright steps after the build step) or use `actions/upload-artifact` / `actions/download-artifact` to pass `.next/` between jobs.

### `reuseExistingServer` creates a hidden coupling

```typescript
webServer: {
  command: "pnpm start",
  port: 3000,
  reuseExistingServer: !process.env.CI,
}
```

In CI, `reuseExistingServer` is `false`, so Playwright starts `pnpm start` → `next start`, which requires a built `.next/` directory. This works because `pnpm build` and `pnpm test:e2e` are sequential steps in the same job. But the coupling is implicit — if someone refactors the CI to pass build artifacts and forgets `.next/`, `next start` crashes with "Could not find a production build" — a clear error but not immediately traceable to a CI config issue.

Locally, the setting means Playwright expects a server already running on port 3000 (or will start one itself, requiring a prior build). The dev workflow assumes `pnpm build && pnpm test:e2e` or a running dev server, but this isn't documented anywhere.

This is a minor concern — the coupling is reasonable for the current architecture.

### Double Velite build assessment

The `postinstall: "velite build"` hook runs on every `pnpm install`. Within a single CI job, there is only one `pnpm install`, so Velite builds once per job — not twice. This is actually fine within a job.

Across the two jobs (`build` + `e2e`), Velite builds twice (once per `pnpm install`). The second build produces identical output since content files don't change between jobs. This is part of the general double-build waste noted above, not a separate issue.

The `postinstall` hook also runs on every local `pnpm install`, including when adding a single dependency. This is slightly annoying but fast for small content sets. As content grows, a conditional check (`if [ ! -d .velite ]; then velite build; fi`) would avoid unnecessary rebuilds, but that's an optimization, not a correctness issue.

### Missing caching strategy

The design caches only pnpm's package store (`cache: "pnpm"`). Missing caches:

- **Playwright browsers**: `pnpm exec playwright install --with-deps` downloads ~200-400MB of browser binaries on every E2E run. Caching `~/.cache/ms-playwright` keyed on Playwright version would eliminate this entirely. **This is the most impactful missing cache — 30-60+ seconds saved per CI run.**

- **`.next/cache/`**: Next.js incremental build cache. For a small site, the build is fast enough that this doesn't matter. As the site grows, caching this could save 20-40% of build time. Not critical at launch.

- **`.velite/`**: Small output, fast to regenerate. Not worth caching independently.

The Playwright browser cache is the most impactful omission. The others are minor for a site this size.

---

## 3. Velite Pipeline: Schema Gaps, Error Paths, and Downstream Contract

### `s.path()` behavior with nested paths is ambiguous

The `pages` schema uses `pattern: "pages/**/*.mdx"` and `slug: s.path()`. Velite's `s.path()` derives the slug from the file path relative to the collection's base directory, stripping the extension. For `content/pages/about.mdx`, the slug is `about`. For `content/pages/foo/bar.mdx`, the slug would be `foo/bar`.

The `**/*.mdx` glob matches nested files. If someone creates `content/pages/legal/privacy.mdx`, the slug becomes `legal/privacy`, which would need a catch-all `[...slug]` route instead of a single `[slug]` route to resolve.

However, site-foundation doesn't use dynamic routing for pages — each slash page has its own explicit route file (`about/page.tsx`, `now/page.tsx`, etc.). So this ambiguity doesn't affect this spec directly. But the `pages` collection is documented as "the initial working pattern" for downstream specs to follow, and the structure doc doesn't constrain `content/pages/` to be flat (unlike `content/blog/` which is "intentionally flat").

**The design should either**: (a) change the glob to `pages/*.mdx` (no subdirectories), (b) document that `s.path()` preserves directory structure and consuming components must handle nested slugs, or (c) add an explicit note that this collection pattern assumes flat file organization.

### Code comments as documentation is pragmatically adequate but architecturally weak

The design says: "Code comments in `velite.config.ts` document how to add a new schema." For the foundational contract that all downstream specs depend on:

- The design specifies the MDX pattern (copy the `pages` schema) but doesn't show what a YAML collection looks like in Velite config. The requirements note "YAML patterns are documented guidance; downstream specs are responsible for validating their specific YAML schemas work end-to-end."
- Code comments are an implementation detail that can become stale. They're not a design artifact.

For a single-developer project where Matthew is both author and implementer, this is adequate. The design should include a brief YAML collection example (3-5 lines) alongside the MDX example, but this isn't blocking.

### Fresh clone TypeScript errors are a real but minor DX issue

When a developer clones the repo and opens VS Code before running `pnpm install`, `.velite/` doesn't exist. Every import from `#site/content` shows TypeScript errors. The design's error handling section mentions this but frames it as a CI concern, not a DX concern.

**Pragmatic impact**: Low. Any developer's first action on a fresh clone is `pnpm install`. The red squigglies disappear quickly. The structure doc notes: "Velite must run before type-checking or editor use — `.velite/` does not exist until the first build." This is documented, just not prominently.

### Race condition between `next dev` and `postinstall` is not real

The prompt asks about this scenario, but it doesn't exist in practice:

1. `pnpm install` runs `postinstall` synchronously before returning.
2. `next dev` is started by the developer *after* `pnpm install` completes.
3. In CI, steps are sequential.

A developer would have to intentionally run `next dev` in a separate terminal while `pnpm install` is still running. The VeliteWebpackPlugin handles content *changes* during development — it's not meant to handle initial `.velite/` generation. No race condition exists in any normal workflow.

---

## 4. Component Design: Missing States, Accessibility Gaps, and Configuration Coupling

### Nav breakpoint is unspecified

The Nav component says "responsive — full links on desktop, collapsed menu on mobile" but doesn't specify the breakpoint. With 6 nav items (Profile, Projects, Contributions, Blog, Resources, Playground) plus site title and theme toggle, horizontal space is a real constraint:

- At `md` (768px): 6 nav items plus chrome would likely overflow. iPad portrait gets hamburger.
- At `lg` (1024px): More room but iPad landscape gets hamburger, which feels aggressive.

This is a layout decision that should be made in the design. The implementer will pick whichever breakpoint they test first and it'll stick. That said, it's easy to change later, so severity is low.

### ThemeToggle behavior is ambiguous

"Cycles or toggles theme" — these are different behaviors:

- **Toggle** (2 states): light ↔ dark. System preference is only used on first visit.
- **Cycle** (3 states): light → dark → system → light. Allows returning to system preference.

The requirements say "switch between dark and light themes" (implies 2-state) but also "respect the visitor's OS color scheme preference" (implies system is a reachable state). The component section says "switch between light, dark, and system themes" which implies 3-state.

The design should commit to 3-state cycling because: next-themes supports it natively, it's the only way to return to system preference after overriding, and shadcn/ui's default theme toggle implements this pattern. Leaving it ambiguous means the implementer makes a UX decision.

### HeroCard icon type inconsistency

The component interface has `icon?: React.ReactNode`. The `HeroCardConfig` type in the design's code block:

```typescript
type HeroCardConfig = {
  title: string
  description: string
  href: string
}
```

No `icon` field in the config type. The earlier prose mentions `icon?: string`. So there are three conflicting definitions:

1. Component props: `icon?: React.ReactNode`
2. Config type (authoritative code block): no `icon` field
3. Prose mention: `icon?: string`

This is inconsistent but not blocking. The component receives `undefined` for `icon` when mapping from config, so icons simply won't render. If icons are intended for hero cards, the design needs to specify how string icon names in config map to React components (an icon registry, dynamic import, or Lucide icon lookup). If icons aren't planned for launch, remove the `icon` prop from the component interface to avoid confusion.

### Landing page photo location is unspecified

The design says the landing page renders "intro section with photo (Next.js `Image` component)" but doesn't specify:
- Where the photo file lives (likely `public/images/` per structure doc)
- Whether the photo path is in `site.ts` config or hardcoded in the component
- Responsive behavior (circular avatar? wide banner? sidebar?)
- The product doc says "photo(s)" — singular or plural?

The photo source (config vs. hardcoded) affects the component interface and should be specified. The visual layout is reasonably deferred to implementation.

### Footer link ambiguity is unresolved

The design parrots the requirements: "Links to slash pages (or link to `/slashes`)." The design should resolve this "or" — it exists specifically to make decisions the requirements left open.

For a footer with 6 slash pages, listing them all creates visual bulk. A single link to `/slashes` is cleaner and the slash pages index exists specifically for discoverability. **Recommendation**: Link to `/slashes` in the footer.

---

## 5. CSP Headers: Directive Gaps and Playground Exclusion Pattern

### `font-src 'self'` is correct

`next/font/google` downloads fonts at build time and serves them from `/_next/static/media/` — same-origin. `font-src 'self'` correctly covers this. No issues.

### Playground exclusion regex has edge cases

The regex `/((?!playground).*)` uses a negative lookahead anchored at the start of the path after `/`. Testing edge cases:

- `/playground` → lookahead sees "playground" → fails → **no CSP**. Correct.
- `/playground/item` → same → **no CSP**. Correct.
- `/playground-tips` → lookahead at position after `/` sees "playground-tips" which starts with "playground" → lookahead fails → **no CSP applied**. **This is a bug.** `/playground-tips` is not a playground route and should receive CSP headers.
- `/api/playground/foo` → lookahead sees "api" → succeeds → **CSP applied**. Correct.

**Fix**: Change to `/((?!playground(/|$)).*)` — require either `/` after "playground" or end of path segment. The bug is unlikely to manifest (no such routes are planned) but trivial to fix.

### Nonce-based CSP was not evaluated

Next.js 14+ supports nonce-based CSP which eliminates `'unsafe-inline'` for scripts. The design uses `'unsafe-inline'` without evaluating this alternative.

However, nonce-based CSP requires dynamic header generation — a new nonce per request — which conflicts with fully static pages served from CDN. For a static-first site on Vercel, this means every request goes through middleware (edge function), which:
- Adds latency (~1-5ms per request)
- Uses Vercel edge function invocations (free tier: 1M/month)
- Complicates the deployment model

For a personal site with no user authentication and no stored data, `'unsafe-inline'` is an acceptable risk. **The decision is defensible, but the design should document this evaluation explicitly** rather than leaving the reader to wonder if nonce-based CSP was overlooked or deliberately rejected.

### `connect-src 'self'` blocks future analytics

The product doc lists analytics as a "Potential Enhancement" (Plausible, Umami). Vercel Analytics/Speed Insights are commonly auto-enabled. All of these make requests to external endpoints that `connect-src 'self'` would silently block.

The failure mode: analytics appears installed correctly, the dashboard shows zero data, browser console logs CSP violations, but there's no visible UI error. The developer doesn't notice until they check the analytics dashboard.

**This isn't a bug today** — the design is correct for current scope. But the CSP config should include a comment noting that `connect-src` must be updated when analytics are added.

---

## 6. Testing Design: Coverage Gaps and Infrastructure Assumptions

### No automated tests for CSS isolation spike

This is the most significant testing gap. R11 requires verification "in both dev (Turbopack) and production (Webpack) builds." The design describes this verification narratively in the "Spike Verification" section but does not include it in the testing design. The Playwright tests listed are: smoke, theme toggle, navigation, landing page — no test verifies CSS isolation.

Without automated tests, the spike results are a point-in-time finding. Any change to `globals.css`, Tailwind configuration, Next.js version, or Radix UI could regress isolation behavior without detection. The spike is the highest-risk technical element of this spec and it has zero automated regression coverage.

**The design should specify at least one Playwright test that**:
1. Navigates to a playground fixture page
2. Uses `page.evaluate(() => getComputedStyle(...))` to read computed values
3. Asserts that site global styles don't leak (e.g., `color` matches the fixture's explicit value, not the global theme's `--foreground`)

This is straightforward to implement and would run in CI against the production build.

### Vitest canary test validates almost nothing

The canary "imports from `@/lib/utils`, verifies `cn()` function works." `cn()` is `clsx` + `tailwind-merge`. A test like `expect(cn("a", "b")).toBe("a b")` proves:

1. Path aliases resolve (`@/lib/utils` works)
2. Vitest can run a test

It does NOT prove:
- TSX/JSX transforms work (no component rendering — it's a `.ts` file test)
- `jsdom` environment is functional
- React component imports resolve
- Content imports (`#site/content`) work

The design says the canary "proves path aliases and TSX transforms resolve correctly" but there's no TSX in the described test. A stronger canary would render a minimal React component via `@testing-library/react` to verify the full test infrastructure. The current canary proves path aliases work and nothing more.

### Playwright smoke test doesn't verify rendered content

"Navigates to `/`, asserts page loads with expected title." A Next.js page can return 200 with a correct `<title>` but an empty body if the server component throws during rendering and an error boundary catches it, or if CSS makes all content invisible. The test should assert on visible content:

```typescript
await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
```

Title-only assertions prove the server is up, not that the page renders.

### No test for CSP headers

R13 specifies exact CSP directives. No test verifies they're present in responses. A Playwright test can check response headers:

```typescript
const response = await page.goto('/')
const csp = response.headers()['content-security-policy']
expect(csp).toContain("default-src 'self'")
```

A second test should verify playground routes do NOT receive CSP headers. Without these tests, a refactor of `next.config.ts` headers could silently drop CSP protection — a security regression with no detection.

---

## Top 5 Risks/Gaps (ranked by severity × likelihood)

### 1. No automated regression tests for CSS isolation spike (High severity, Medium likelihood)
The spike is the highest-risk technical element of this spec. It's verified manually during implementation but has no Playwright tests for ongoing regression. Any dependency update (Tailwind minor version, Radix UI, shadcn/ui component refresh) could break isolation without detection. **Failure scenario**: Tailwind v4.x update changes `@layer` emission order. Playground styles gain unintended cascade priority. Site global styles leak into playground items. Nobody notices until a playground item looks wrong weeks later.

### 2. `all: initial` resets `color-scheme` and `text-size-adjust` without re-establishment (Medium severity, High likelihood)
`color-scheme: normal` means native form elements inside the playground (scrollbars, selects, inputs) always render in light mode even when dark theme tokens are active. `text-size-adjust: auto` means mobile Safari may independently enlarge text inside playground items. **Failure scenario**: Dark mode is toggled. shadcn/ui Button renders correctly (uses CSS custom properties), but a `<select>` dropdown renders with white background and light scrollbars inside a dark-themed playground container.

### 3. Token drift between globals.css and playground base stylesheet (Medium severity, High likelihood)
Theme token values are manually duplicated with no enforcement mechanism. Downstream specs will modify theme tokens. **Failure scenario**: Theme colors are customized during a design pass. Developer updates `globals.css` token values. Playground base stylesheet is not updated. shadcn/ui components on playground routes render with stale colors — subtle visual regression on routes that aren't frequently tested.

### 4. Playwright browser binaries downloaded on every CI run (Low severity, 100% likelihood)
~200-400MB download, 30-60+ seconds, on every push. No `actions/cache` configured for `~/.cache/ms-playwright`. **Not a correctness issue**, but at 10 pushes/day, that's ~5-10 minutes of daily CI time wasted on downloads. Trivial to fix with a 3-line cache step.

### 5. CSP playground exclusion regex matches unintended paths (Low severity, Low likelihood)
The regex `/((?!playground).*)` excludes any path starting with the string "playground", not just the `/playground/` route prefix. **Failure scenario**: A future route like `/playground-tips` or `/playgrounds` silently lacks CSP headers. Low likelihood (no such routes planned), trivial fix: `/((?!playground(/|$)).*)`.

---

## Top 3 Conclusions to Challenge or Reverse

### 1. Treating Radix portal escape as an unknown to discover

Radix UI portals render to `document.body` by default. This is documented, known behavior — not a hypothesis to test. The design should acknowledge portal escape as a certainty and use the spike to validate a *mitigation* (Radix `container` prop, portal containment strategy), not to discover a *problem*. The spike should produce a matrix of which shadcn/ui overlay components can be contained and which cannot. The graduated outcome model should pre-commit to outcome (b) since portal escape makes outcome (a) impossible.

### 2. Duplicating token values instead of sharing them

`all: initial` breaks CSS custom property inheritance, creating a tension: isolation requires the reset, but the reset breaks the mechanism that prevents token drift. The design resolves this by manual duplication — the weakest option. The stronger alternative: define theme tokens in a shared source (a CSS file, Tailwind plugin, or PostCSS transform) that generates both `globals.css` token declarations and the playground base stylesheet. This adds build-time coupling (traceable, enforceable) instead of runtime inheritance (broken by `all: initial`) or manual duplication (error-prone).

### 3. Two separate CI jobs with full rebuild in the second

The `e2e` job repeats `pnpm install` and `pnpm build` from scratch despite `needs: build`. The `needs` relationship provides ordering but no data. This doubles build cost while providing zero parallelism benefit (jobs are sequential). The simpler alternative: a single job with sequential steps (`lint` → `typecheck` → `test` → `build` → `playwright install` → `test:e2e`). This eliminates the double build, reduces CI time by ~1-2 minutes, and removes the false implication that the `build` job provides something to `e2e`. If parallelism is desired later, it can be designed explicitly with artifact passing.

---

## What's Missing

1. **Playwright tests for CSS isolation spike outcomes.** At least one E2E test asserting computed styles on playground container elements. Without this, the spike has no regression protection.

2. **A Playwright test for CSP response headers.** Verify directives are present on content pages and absent on playground pages. Without this, CSP can be silently dropped by config changes.

3. **A decision on playground token synchronization strategy.** The design needs to specify how playground base stylesheet tokens stay in sync with `globals.css`. Manual duplication is a known maintenance trap.

4. **A decision on ThemeToggle behavior.** Commit to 2-state toggle or 3-state cycle. Specify the states, icons, and accessibility labels.

5. **A decision on footer links.** Resolve the "or" — link to `/slashes` or list all slash pages. The design should make this call, not parrot the requirements' ambiguity.

6. **A decision on nav collapse breakpoint.** Specify `md` or `lg`. Count the nav items and estimate their rendered width.

7. **CSP regex fix.** Change `/((?!playground).*)` to `/((?!playground(/|$)).*)`.

8. **`color-scheme` and `text-size-adjust` in playground re-establishment list.** Either add these to the base stylesheet or document that native form elements in the playground will not respect dark mode and text-size-adjust.
