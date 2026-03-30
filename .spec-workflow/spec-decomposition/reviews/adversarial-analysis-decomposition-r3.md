# Adversarial Analysis — Spec Decomposition Round 3

---

## 1. Risk Transfer to Spec 4 — Did the Rebalancing Create New Problems?

### 1.1 Spec 4 coherence as a single deliverable

Spec 4 spans three unrelated implementation domains: CI pipeline work (Pagefind crawl mode), rehype/remark plugin integration (TOC, footnotes), and UI components (series grouping, related posts, social sharing, progress bar, copy-to-clipboard). These domains share no code, no dependencies on each other, and no common failure mode. The only thing unifying them is "blog stuff that isn't core."

This is a grab-bag spec. The decomposition acknowledges this ("bundles several unrelated blog enhancement features for pragmatic reasons") and offers a weak mitigation: "consider splitting it out." That's not a mitigation — it's a deferred decision with no trigger. Under implementation pressure, "consider" means "won't happen." The spec will be attempted as a monolith, and if rehype plugin debugging takes three days, six unrelated features wait.

**Concrete failure scenario**: Footnote rendering via remark-footnotes interacts badly with rehype-pretty-code (Shiki). Both plugins manipulate the HAST tree. Debugging takes several days. Meanwhile, Pagefind integration, series UI, related posts, social sharing, progress bar, and copy-to-clipboard — all ready to ship — are held hostage.

**Severity**: Medium. The mitigation exists conceptually but lacks an actionable trigger.

**Classification**: Compounding. Prior reviews identified the blog scope imbalance. The rebalancing moved risk rather than reducing it.

### 1.2 Rehype/remark plugin dependency on spec 3's pipeline

Spec 3 configures Shiki syntax highlighting via rehype-pretty-code in Velite's unified pipeline. Spec 4 adds remark-footnotes, a rehype TOC plugin, and copy-to-clipboard behavior to the same pipeline. Plugin ordering in unified pipelines is load-bearing — remark plugins run before rehype plugins, and within each phase, order matters.

The decomposition correctly notes "plugin ordering in the unified pipeline matters" but does not specify what ordering constraints exist. Specifically:

- rehype-pretty-code must run before any plugin that wraps or modifies `<code>` elements (copy-to-clipboard adds a button sibling; if it runs first, rehype-pretty-code may not recognize the code block structure).
- A rehype TOC plugin that extracts headings must run after any plugin that modifies heading content (e.g., rehype-autolink-headings adds anchor elements inside `<h2>` tags — the TOC plugin must decide whether to include or strip those anchors).

The decomposition does not capture these ordering constraints in cross-spec conventions. Spec 4's implementer must discover them experimentally.

**Concrete failure scenario**: Copy-to-clipboard implementation wraps code blocks in a container div. rehype-pretty-code, which was configured in spec 3, no longer matches the expected HAST structure and silently produces unhighlighted code blocks. The E2E verification ("confirm TOC generates from headings, footnotes render correctly, and code blocks have a working copy button") checks each feature independently but doesn't test *interaction* — highlighted code with a copy button, a footnote inside a code-containing section.

**Severity**: Medium. Plugin interaction bugs are subtle and time-consuming to debug.

**Classification**: Novel. Prior reviews didn't examine plugin pipeline ordering across spec boundaries.

### 1.3 Pagefind as a blocking risk within spec 4

The decomposition says to "consider splitting [Pagefind] out" if it proves complex. This is the same non-actionable language from 1.1. Pagefind's crawler mode requires `next build && next start` + crawl — a running server during CI. This is architecturally different from every other CI step (which operates on static artifacts). If the CI modification is tricky (port conflicts, timing issues, Vercel build pipeline incompatibility), debugging it blocks everything else in spec 4.

The `continue-on-error: true` mitigation handles CI *failures* gracefully but doesn't help if the *implementation work* of getting the crawl step working takes days.

**Severity**: Low. Pagefind's crawler mode is well-documented, and the `continue-on-error` approach is sound. The risk is real but bounded.

**Classification**: Compounding. Prior reviews identified Pagefind CI as a risk; `continue-on-error` was the response. The remaining risk is implementation time, not deployment failure.

### 1.4 Spec 4 verification criteria insufficiency

The E2E verification says: "Confirm TOC generates from headings, footnotes render correctly, and code blocks have a working copy button." This tests each feature in isolation. It does not test:

- A blog post containing *all three*: headings (TOC source), footnotes, and code blocks with syntax highlighting. This is the scenario where plugin interactions break.
- Footnotes inside a section that *also* contains a code block — does the footnote reference number render correctly adjacent to highlighted code?
- TOC generation when a heading contains inline code (e.g., `## Using \`async/await\``). Does the TOC entry include or strip the code formatting?

The verification criteria should require a single test post exercising all plugins simultaneously, not separate checks.

**Severity**: Medium. Plugin interaction bugs are the highest-risk items in this spec, and the verification doesn't test for them.

**Classification**: Novel.

---

## 2. Implicit Assumptions and Unstated Decisions

### 2.1 Velite + Shiki pipeline integration

The tech steering doc specifies Velite for content processing and Shiki (via rehype-pretty-code) for syntax highlighting. Velite compiles MDX using its own internal unified pipeline. The question is how rehype-pretty-code gets injected into that pipeline.

Velite does support a `mdx` configuration option that accepts rehype/remark plugins — this is documented in Velite's API. The decomposition implicitly assumes this works but never states it. The risk isn't that it's impossible; it's that Velite's plugin injection may have ordering constraints or limitations that differ from a standard unified pipeline. For example, Velite may apply its own rehype transforms (for image copying, slug generation) that interact with rehype-pretty-code.

**Concrete failure scenario**: Velite's internal MDX pipeline applies a rehype transform that wraps code blocks for its own purposes. rehype-pretty-code, injected via config, runs at a different pipeline stage than expected and produces double-wrapped or incorrectly structured code blocks.

**Severity**: Low-medium. Velite's rehype plugin support is a documented feature, but the interaction with a complex plugin like rehype-pretty-code should be verified early. Spec 3's implementer will discover this quickly, but the decomposition should acknowledge it as a verification point rather than treating it as zero-risk.

**Classification**: Novel.

### 2.2 next-themes vs. playground CSS reset compatibility

`next-themes` sets a `class` attribute (e.g., `class="dark"`) on `<html>`, which propagates via Tailwind's `dark:` variant through CSS custom properties and cascade inheritance. The playground's `all: initial` reset eliminates inherited CSS custom properties and resets any cascade-inherited values.

For same-page playground rendering (not iframe), this means:
- If a playground item imports a `src/components/ui/` primitive (which the structure doc explicitly allows), that primitive uses Tailwind classes including `dark:` variants.
- `dark:` variants depend on `class="dark"` being present on an ancestor. `all: initial` on the playground container doesn't remove `class="dark"` from `<html>` — it resets *CSS property values*, not HTML attributes. So `dark:` variants should still work.
- However, CSS custom properties defined on `:root` or `html` in `globals.css` (theme colors like `--background`, `--foreground`) will *not* be inherited through the `all: initial` boundary. If shadcn/ui components reference these CSS custom properties (and they do — `bg-background`, `text-foreground` compile to `var(--background)`, `var(--foreground)`), those variables will be undefined inside the playground container.

**Concrete failure scenario**: A playground item imports a shadcn Button. The button renders with transparent background and invisible text because `--background` and `--foreground` CSS custom properties are not inherited past the `all: initial` boundary. The spike in spec 1 tests "a styled test div" — it won't catch this unless it specifically tests a shadcn component.

**Severity**: High. The structure doc explicitly allows playground items to import `src/components/ui/` primitives, but the CSS isolation architecture breaks those primitives' styling. This is a fundamental conflict between two stated design decisions.

**Classification**: Novel. Prior reviews examined `all: initial` for general isolation but not for its interaction with CSS custom properties used by the shared component library.

### 2.3 Tailwind v4 custom @layer interactions

Tailwind v4 uses CSS-native `@layer` declarations. The decomposition specifies `@layer playground` as a custom layer for playground CSS isolation. In Tailwind v4, the framework declares its own layers (`@layer theme, base, components, utilities`). Custom layers declared alongside Tailwind's layers participate in the same CSS cascade ordering.

The critical question: where does `@layer playground` sit in the cascade relative to Tailwind's layers? CSS `@layer` order is determined by first-occurrence order in the stylesheet. If `@layer playground` is declared after Tailwind's layers, it has higher cascade priority. If before, lower. The decomposition says playground CSS "sits below the site's layer in cascade priority" but doesn't specify how this ordering is established or maintained.

In Tailwind v4, layer ordering is controlled by the order of `@layer` declarations in the CSS entry point. The decomposition doesn't specify where `@layer playground` is declared relative to Tailwind's CSS import. If a future change to `globals.css` reorders imports, the playground isolation could silently break.

**Severity**: Low. This is a real ordering concern, but it's straightforward to specify and test. It becomes a problem only if undocumented.

**Classification**: Novel.

### 2.4 Velite type generation and CI type-checking chicken-and-egg

The structure steering doc states: `#site/content` → `./.velite` and "Velite must run before type-checking or editor use — `.velite/` does not exist until the first build. A `postinstall` or `dev` script should ensure it exists."

The CI pipeline in spec 1 runs: lint → type-check → test → build → deploy. The build step runs Velite (generating `.velite/`). Type-checking runs *before* build. If `.velite/` doesn't exist during type-check, every file importing from `#site/content` produces a TypeScript error.

The structure doc suggests a `postinstall` script. In CI, `pnpm install` runs `postinstall`, which would generate Velite types. But this means Velite runs twice: once during `postinstall` (for types) and once during `build` (for content). This works but is wasteful and, more importantly, the decomposition doesn't specify this — it's left as an implementation detail.

**Concrete failure scenario**: Spec 1's CI pipeline is built without a `postinstall` Velite step. The first CI run fails at type-check because `.velite/` doesn't exist. The implementer adds `velite build` before `tsc` in the GitHub Actions workflow. This works but means Velite runs twice per CI run. Alternatively, they reorder CI steps to run build before type-check, which changes the error detection order (build failures are caught before type errors).

**Severity**: Low. The failure is immediate, obvious, and easy to fix. But it should be specified in spec 1 to avoid wasted debugging time.

**Classification**: Novel.

---

## 3. End-to-End Verification Gaps

### 3.1 Spec 1 CSS isolation spike — test div is insufficient

The spike verification says "renders a styled test div without inheriting site styles." Per finding 2.2, this is insufficient. The spike must verify:

1. A plain div with conflicting colors/fonts (proves basic `all: initial` works).
2. A shadcn/ui Button or Card rendered inside the playground container (proves shared components work after the reset — specifically that CSS custom properties are either re-established or unnecessary).
3. A Tailwind utility class applied inside the playground container (proves Tailwind's utilities work within the `@layer playground` boundary).

Testing only (1) leaves the highest-risk interaction (shared components + CSS reset) unvalidated until spec 8, where it's much more expensive to discover and fix.

**Severity**: High. The spike exists specifically to retire architectural risk early. If it doesn't test the actual risk (shared component compatibility), it provides false confidence.

**Classification**: Compounding. Prior reviews ensured the spike exists and runs early. This finding deepens the requirement for what the spike must validate.

### 3.2 Spec 2 contact form — CI vs. manual testing conflation

The E2E verification says "submit the contact form, verify email delivery via Resend." The tech steering doc says "Playwright CI test submits the contact form and verifies a 200 response."

These are different claims. The verification criteria describe manual testing (actually send email, verify delivery). The CI test verifies an HTTP response code. A 200 response with a missing or test Resend API key means the API route returned success without sending email. This could happen if:

- The API route catches the Resend error and returns 200 anyway (defensive error handling gone wrong).
- A mock/stub is used in CI that returns 200 regardless.
- The Resend API key is present in CI secrets but pointed at a test domain that silently drops email.

The decomposition should distinguish between:
- **CI verification**: Playwright submits the form, receives a 200, verifies the response body contains a success indicator. This is a smoke test.
- **Manual verification**: Submit the form with a real Resend key, verify email arrives. This is a one-time deployment validation, not an automated test.

**Severity**: Low. The consequences of a false-positive contact form test are minor (missed emails, caught quickly via Resend dashboard). But the verification criteria should be honest about what CI can and cannot test.

**Classification**: Novel.

### 3.3 Spec 4 Pagefind — missing edge cases and CSP consideration

The verification tests the happy path only. Missing:

- **Pagefind WASM and CSP**: Pagefind loads a WASM module via `WebAssembly.instantiate`. The site's CSP specifies `script-src 'self' 'unsafe-inline'`. `WebAssembly.instantiate` from a fetched buffer should work under `script-src 'self'` (the WASM file is same-origin). However, some browsers (older Chrome versions) required `'wasm-unsafe-eval'` for WASM instantiation. Modern browsers (last 2 versions, per the tech steering doc) should be fine with `'self'`. This is likely a non-issue but worth a one-line verification note.
- **Pagefind with zero content**: If spec 4 is implemented before meaningful blog content exists (e.g., only a test post), Pagefind's index is trivially small. The test "search for a known post and find it" passes vacuously. The real test is whether Pagefind's UI handles zero-result queries gracefully and whether the index size is reasonable with real content.
- **Pagefind theming**: Pagefind ships default CSS for its search UI. This CSS may not match the site's dark/light theme. The verification should include "search UI renders correctly in both light and dark mode."

**Severity**: Low individually; collectively they represent a pattern of happy-path-only verification.

**Classification**: Novel.

### 3.4 No accessibility testing in any spec

The product principles target WCAG 2.1 AA. The tech steering doc specifies semantic HTML, keyboard navigation, color contrast, alt text, and screen reader support. Zero specs include accessibility verification.

This is a cross-cutting concern that should be addressed in cross-spec conventions, not per-spec. Recommendation: add to cross-spec conventions: "Every spec's E2E verification must include: (1) keyboard-navigate all interactive elements, (2) run axe-core or Lighthouse accessibility audit on new pages, (3) verify color contrast in both themes for new components."

Without this, accessibility becomes "we'll check at the end" — which means never, or an expensive retrofit.

**Severity**: Medium. WCAG AA is stated as a target. Targets without verification are aspirational, not architectural.

**Classification**: Novel.

### 3.5 No performance testing in any spec

The tech steering doc targets 90+ Lighthouse. No spec says "run Lighthouse." The decomposition assumes performance will be fine because Next.js static generation is inherently fast. This is probably true for content pages. It may not be true for:

- The landing page with hero card images (unoptimized images tank Lighthouse).
- The blog index with many posts (client-side hydration cost scales with DOM size).
- Pagefind's WASM loader (affects TTI/TBT).

Recommendation: add to cross-spec conventions: "After each spec's deployment, run Lighthouse CI against the new pages. Score below 90 is a blocking issue." This doesn't need to be in CI initially — a manual check documented in verification criteria is sufficient.

**Severity**: Low-medium. 90+ Lighthouse is very achievable with Next.js static generation and the Image component, but without measurement, regressions accumulate silently.

**Classification**: Novel.

---

## 4. The Two Remaining Open Questions — Are They Well-Framed?

### 4.1 Open question 1: incremental deployment comfort

The question asks "is this acceptable?" — a yes/no framing for a multi-option decision. The actual options are:

- **(a)** Point the custom domain at spec 1 deploy. Public sees placeholder pages. Pro: forces accountability, provides real-world testing. Con: "coming soon" pages visible to recruiters who may be evaluating Matthew right now.
- **(b)** Point the custom domain after spec 2 (professional profile). The primary business value (professional inbound funnel) is live. Remaining placeholder pages are secondary. Pro: the most important page is real. Con: blog/projects links lead to placeholders.
- **(c)** Point the custom domain after all content specs are complete. Pro: no placeholder pages visible. Con: delays all real-world testing and feedback; the site lives on a Vercel preview URL indefinitely.
- **(d)** Keep the existing WordPress site live until the new site is content-complete, then do a hard cutover with DNS change + 301 redirects. Pro: no downtime, no placeholder pages. Con: requires maintaining two sites and coordinating the cutover.

The open question should present these options with tradeoffs. Option (b) is likely the best answer (it's when the primary business value is live), but the decomposition should frame it as a decision, not a vague comfort check.

**Severity**: Low. This is a framing issue, not a technical risk.

**Classification**: Compounding. Prior reviews didn't address the quality of open questions.

### 4.2 Open question 2: content migration

The question asks whether existing content needs to be migrated but doesn't provide the information needed to answer it. Specifically:

- How much content exists on the current WordPress site? 5 blog posts or 50? 0 images or 200? This determines whether migration is a half-day task or a multi-day effort.
- Are there indexed URLs receiving organic search traffic? If yes, 301 redirects are non-negotiable regardless of whether content is migrated. If no, a clean break has no SEO cost.
- What's the URL structure of the current site? This determines the complexity of redirect rules.

Without this context, the question can't be answered. The question should either link to a content inventory or explicitly state: "Before deciding, conduct a content audit: count posts, pages, images, and check Google Search Console for indexed URLs with traffic."

**Severity**: Low. This is a planning gap, not a technical risk.

**Classification**: Compounding. The question was added in v2; this review challenges its completeness.

---

## 5. Cross-Spec Integration Points That Could Break Silently

### 5.1 Sitemap completeness

The XML sitemap (`sitemap.ts` in spec 1) and the HTML sitemap page (spec 7) must both enumerate all routes. Next.js's `sitemap.ts` convention supports two approaches:

- **Static**: Hardcoded array of URLs. Every new spec must add its routes. Forgettable.
- **Dynamic**: Query Velite collections + filesystem routes to generate the URL list. Automatically picks up new content.

The decomposition doesn't specify which approach to use. If static, every spec that adds a route must remember to update `sitemap.ts`. If dynamic, the implementation is more complex but maintenance-free.

The HTML sitemap in spec 7 has the same issue. If it hardcodes a list of sections, it's fragile. If it queries routes dynamically, it's robust.

Recommendation: cross-spec conventions should specify that both sitemaps use dynamic route discovery (Velite collections for content routes, a config-driven list for static routes).

**Severity**: Low. Missing sitemap entries are a minor SEO issue, not a user-facing bug.

**Classification**: Novel.

### 5.2 Navigation — data-driven or hardcoded?

The decomposition specifies data-driven hero cards but says nothing about data-driven navigation. The site header/nav is built in spec 1. If the nav links are hardcoded in the layout component, every spec that adds or renames a route must edit the nav. If the nav is driven by `src/config/site.ts`, changes are centralized.

The structure steering doc shows `src/config/site.ts` as containing "Site metadata, nav items, social links" — this implies data-driven navigation. But the decomposition doesn't reference this file or specify that the nav should be config-driven. The structure doc is a structural convention, not an implementation directive.

**Severity**: Low. The structure doc implies the right approach. But the decomposition should make this explicit to prevent a hardcoded nav from being built under time pressure.

**Classification**: Novel.

### 5.3 Theme consistency — no mechanism for cross-spec validation

Each spec is built independently. Each adds components. The theme toggle is built in spec 1. There is no mechanism — not even a convention — ensuring that components built in specs 2-8 look correct in both themes.

Shadcn/ui components use CSS custom properties that respect the theme. But custom components (hero cards, blog post layout, project gallery, series UI, etc.) may use hardcoded colors or Tailwind classes that look fine in light mode but have poor contrast in dark mode.

Recommendation: add to cross-spec conventions: "All new components must be visually verified in both light and dark themes. E2E tests for each spec should toggle the theme and screenshot new pages in both modes."

**Severity**: Medium. A dark-mode-broken component on the professional profile page — the primary business value page — would be embarrassing and potentially costly.

**Classification**: Novel.

### 5.4 RSS feed extensibility

The RSS feed in spec 3 generates a static XML file at `/feed.xml/route.ts` with blog posts only. The product steering doc confirms RSS is blog-only. This is fine.

The route.ts file will import blog posts from Velite and generate XML. If projects or other content types are later added to the feed, the route needs modification. This is a minor, well-understood change. Not a risk worth mitigating now.

**Severity**: Non-issue. Correctly scoped.

### 5.5 Pagefind indexing scope

Pagefind crawls the entire built site by default. It will index blog posts, the professional profile, project pages, the landing page, placeholder pages, slash pages — everything. This may produce undesirable search results:

- Searching for "Matthew" returns the professional profile, landing page, about page, and every blog post byline. Noisy.
- Placeholder "coming soon" pages appear in search results if they still exist when Pagefind is introduced.
- The /sitemap and /slashes pages are navigational, not content — indexing them pollutes search results.

Pagefind supports `data-pagefind-body` (limit indexing to marked elements) and `data-pagefind-ignore` (exclude elements). The decomposition doesn't specify an indexing strategy.

Recommendation: spec 4 should specify that Pagefind indexes only content regions (blog post body, project descriptions) via `data-pagefind-body`, not entire pages. This is a one-line attribute per layout but must be planned, not discovered during implementation.

**Severity**: Low. Bad search results are a UX annoyance, not a functional failure.

**Classification**: Novel.

---

## 6. Spec 1's Internal Complexity After Two Rounds of Additions

### 6.1 Deliverable count

Distinct deliverables in spec 1:

1. Next.js project scaffolding (App Router, TypeScript strict, tsconfig with aliases)
2. pnpm + .nvmrc + packageManager pin
3. Tailwind CSS v4 + globals.css + theme variables
4. shadcn/ui installation + base components
5. ESLint + Prettier configuration
6. Vitest + Playwright configuration
7. GitHub Actions CI/CD pipeline (lint, type-check, test, build, deploy)
8. Vercel deployment configuration
9. Root layout (`<html>`, `<body>`, providers)
10. Site layout (header, nav, footer) in (site) route group
11. Dark/light theme toggle (next-themes)
12. Landing page with hero cards
13. Placeholder pages for all sections
14. Custom 404 page
15. CSP headers in next.config.ts
16. XML sitemap (sitemap.ts)
17. Velite pipeline configuration + pages schema
18. Metadata/SEO convention (title template, OG image, generateMetadata pattern)
19. CSS isolation spike (playground route group, all: initial, @layer playground)
20. Velite empty directory verification

That's 20 distinct deliverables. For comparison, spec 2 has ~6, spec 3 has ~10, spec 5 has ~5. Spec 1 is 2-4x larger than any other spec.

The checkpoint mitigation (a→b→c→d) helps sequence the work but doesn't reduce the scope. A solo developer working through 20 deliverables in one spec will experience fatigue, context-switching overhead, and increasing difficulty tracking what's done vs. what's remaining.

That said, this is foundation work. Most of these deliverables are configuration, not implementation. Items 1-8 are largely automated (npx create-next-app, pnpm add, copy-paste configs). The real implementation work is in items 9-19. The checkpoint structure correctly sequences these.

**Severity**: Low-medium. The size is inherent to foundation work. The checkpoints are the right mitigation. But the decomposition should be honest that spec 1 will take significantly longer than any other spec — possibly 2-3x — and the implementer should expect this.

**Classification**: Compounding. Prior reviews flagged spec 1's size. Additions have increased it further.

### 6.2 Checkpoint (b) combines unrelated work

Checkpoint (b) is: CSS isolation spike + Velite pipeline + pages schema. The spike and Velite setup are completely independent. A spike failure doesn't affect Velite. Velite configuration issues don't affect the spike.

Combining them in one checkpoint means the checkpoint isn't a clean decision point. If the spike fails and Velite works, the implementer moves to checkpoint (c) with "spike failed, using iframe-only fallback" — but checkpoint (b) is neither fully passed nor fully failed.

This is a minor organizational issue. The checkpoints are "suggested sequence, not hard gates." Splitting (b) into (b1: CSS isolation spike) and (b2: Velite pipeline + pages schema) would be cleaner without adding overhead.

**Severity**: Low. Organizational clarity, not a functional risk.

**Classification**: Compounding.

### 6.3 CSS isolation spike lacks a defined time box

The decomposition says "time-boxed" but specifies no time box. Without a number, "time-boxed" is meaningless — it's a statement of intent without a commitment.

The failure trigger should be explicit: "If the CSS isolation spike is not passing all verification criteria (including shared component rendering — see section 3.1) within N hours of focused work, declare failure and proceed with iframe-only fallback."

What value of N? The spike involves: creating the route group, applying CSS reset, testing in dev and prod builds, testing shared component compatibility. For a developer familiar with CSS layers and Next.js, this is 2-4 hours. For someone encountering `all: initial` + Tailwind v4 interactions for the first time, it could be 1-2 days. A reasonable time box is 1 working day (8 hours). If the spike isn't working after a full day of focused effort, the interaction complexity is too high for reliable same-page isolation, and iframe-only is the correct call.

**Severity**: Low. The spike's scope is small enough that even without a formal time box, the implementer will naturally abandon it after a day or two. But making the time box explicit prevents the sunk-cost trap.

**Classification**: Compounding.

---

## Deliverables

### Top 5 Risks or Gaps

| # | Risk | Affected Specs | Failure Scenario | Severity | Classification |
|---|------|---------------|------------------|----------|----------------|
| 1 | **CSS custom property inheritance blocked by `all: initial`** | 1, 8 | Playground items import shadcn/ui components that depend on CSS custom properties (`--background`, `--foreground`). `all: initial` prevents inheritance of these properties. Components render with transparent backgrounds and invisible text. The spec 1 spike tests a plain div and doesn't catch this. Spec 8 discovers the incompatibility late. | High | Novel |
| 2 | **Rehype/remark plugin interaction across spec boundary** | 3, 4 | Spec 4 adds plugins (TOC, footnotes, copy-to-clipboard) to the unified pipeline configured in spec 3. Plugin ordering is load-bearing but unspecified. Copy-to-clipboard wraps code blocks, breaking rehype-pretty-code's HAST matching. Syntax highlighting silently disappears on posts with copy buttons. Verification criteria test features independently, not in combination. | Medium | Novel |
| 3 | **No accessibility verification anywhere** | All | WCAG 2.1 AA is a stated target. No spec includes keyboard navigation testing, color contrast verification, or accessibility auditing. The professional profile — a page recruiters view — ships with an inaccessible contact form (missing aria labels, broken focus management) that isn't caught until a user reports it. | Medium | Novel |
| 4 | **Spec 4 is an incoherent grab-bag** | 4 | Eight features spanning CI pipeline, rehype plugins, and UI components are bundled in one spec. Rehype plugin debugging blocks six unrelated features. The decomposition says "consider splitting" — a deferred decision that won't be made under implementation pressure. | Medium | Compounding |
| 5 | **Theme consistency has no cross-spec mechanism** | 2-8 | Each spec builds components independently. No convention requires verification in both themes. The professional profile page ships with a dark-mode contrast issue (light gray text on dark gray background) that isn't caught because the implementer tested only in light mode. | Medium | Novel |

### Top 3 Conclusions to Challenge or Reverse

**1. The CSS isolation spike should test "a styled test div."**

**Current decision**: Spec 1's spike verification is "renders a styled test div without inheriting site styles."

**Why it may be wrong**: The entire point of the spike is to determine whether same-page playground rendering is viable. The viability question isn't "does `all: initial` reset a div?" (it does, trivially) — it's "can playground items use shared components from `src/components/ui/` after the reset?" The structure doc explicitly allows playground items to import shadcn/ui primitives. Those primitives depend on CSS custom properties defined in `globals.css`. `all: initial` blocks inheritance of those properties. Testing a plain div proves nothing about the actual compatibility question.

**Recommendation**: The spike must verify: (1) a shadcn Button renders correctly inside the playground container with correct colors in both themes, (2) Tailwind utility classes work inside the playground container, (3) CSS custom properties are either re-established by the playground base stylesheet or unnecessary. If any of these fail, the spike has identified a real problem — not just a test-div false positive.

**2. Spec 4 should be treated as a single deliverable with a "consider splitting" caveat.**

**Current decision**: Eight features bundled in one spec. Splitting is suggested but not committed.

**Why it may be wrong**: The features span three unrelated domains. The rehype plugin work is the highest-risk item in the entire blog feature set. Bundling it with six other features creates unnecessary coupling. "Consider splitting" is not an actionable mitigation — it requires the implementer to make a project management decision while mid-implementation, which is the worst time to make such decisions.

**Recommendation**: Pre-split spec 4 into two specs now: (4a) rehype/remark plugins (TOC, footnotes, copy-to-clipboard) — the high-risk items that interact with spec 3's pipeline; (4b) blog enhancements (Pagefind, series, related posts, social sharing, progress bar) — the independent features. The overhead of two specs is minimal for a solo developer (two branches instead of one), and the benefit is that plugin debugging doesn't block everything else. If the implementer decides the split is unnecessary, they can merge the branches.

**3. Open question 1 should be a yes/no comfort check.**

**Current decision**: "Is it acceptable for placeholder pages to be visible to the public?"

**Why it may be wrong**: This is a spectrum with at least four options (point domain at spec 1, spec 2, completion, or keep WordPress until cutover). The yes/no framing hides the most practical option: point the custom domain after spec 2 (professional profile), when the primary business value is live. Placeholder blog/project pages are acceptable because they signal "more coming" — placeholder professional profile pages are not acceptable because they signal "this person's site doesn't work."

**Recommendation**: Replace the open question with a decision: "Point the custom domain after spec 2 is deployed. The professional profile is the primary business value. Prior to that, use Vercel's preview URL for testing. If the WordPress site is still live, keep it until spec 2 deploys, then switch DNS and add 301 redirects for any indexed WordPress URLs."

### What's Missing

1. **Cross-spec convention: accessibility verification**. Add to cross-spec conventions: "Every spec's E2E verification includes keyboard navigation of all interactive elements and a Lighthouse accessibility audit (or axe-core) of new pages. WCAG AA violations are blocking." This is absent, not wrong — it's a gap between the stated target (WCAG 2.1 AA) and the verification plan (nothing).

2. **Cross-spec convention: theme verification**. Add to cross-spec conventions: "All new components and pages must be visually verified in both light and dark themes. E2E tests toggle the theme and verify no contrast or rendering issues." Currently, theme correctness depends entirely on the implementer remembering to check.

3. **Cross-spec convention: performance baseline**. Add to cross-spec conventions: "After each spec's first deployment, run Lighthouse against new pages. Score below 90 performance is a blocking issue." The 90+ Lighthouse target exists in the tech steering doc but has no verification mechanism.

4. **Content audit for open question 2**. The content migration question can't be answered without knowing what content exists. Either link to an inventory of the current WordPress site (post count, image count, indexed URLs with traffic) or explicitly state that a content audit is a prerequisite for answering this question.

5. **Plugin ordering specification for the unified pipeline**. Spec 3 configures rehype-pretty-code. Spec 4 adds TOC, footnotes, and copy-to-clipboard plugins. The cross-spec conventions should specify the plugin ordering contract: which plugins run in which order, and what structural assumptions each plugin makes about the HAST/MDAST tree. Without this, spec 4's implementer must reverse-engineer spec 3's pipeline configuration to avoid regressions.

6. **Pagefind indexing scope specification**. Spec 4 should specify which content regions Pagefind indexes (via `data-pagefind-body`) and which pages/elements are excluded (via `data-pagefind-ignore`). Without this, Pagefind indexes everything — including navigational pages, placeholder content, and the professional profile — producing noisy search results.
