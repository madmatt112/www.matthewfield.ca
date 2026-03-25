# Adversarial Analysis: Technology Stack Steering Document (Round 3)

---

## 1. Internal Consistency and Contradictions

### `@layer` + CSS Modules vs. iframe decision rule: gap between isolation levels

The default isolation spec (line 53) says playground items use `all: initial` with explicit overrides for `display`, `box-sizing`, and `unicode-bidi`, plus `isolation: isolate`, plus `@layer playground`, plus CSS Modules. The iframe decision rule (lines 57-66) then lists patterns that require iframe isolation — `@keyframes` with generic names is one of these triggers.

**The gap**: two playground items rendered on the same page are never discussed, but the architecture implies it's possible (they're "separate Next.js routes" — each gets its own page). If playground items are always on separate routes, `@keyframes` collision between items is impossible because they never share a document. The `@keyframes` collision entry in the iframe decision rule only matters if multiple playground items could coexist on a single page (e.g., a playground listing page that renders previews). The document never clarifies whether same-page co-rendering is in scope. If it isn't, the `@keyframes` collision trigger is dead letter. If it is, the isolation spec needs to address the multi-item case explicitly. **Classification: Compounding** (R2 identified `@keyframes` collision; the trigger was added to the iframe rule but the architectural precondition — same-page rendering — is unresolved).

### CSP spec vs. playground architecture: internally consistent but with an unstated dependency

The CSP section (line 117) says content pages use `script-src 'self' 'unsafe-inline'` and playground routes "effectively opt out of CSP." The playground architecture section (line 56) says iframe items point to "a dedicated route." The CSP spec includes `frame-src 'self'`.

This is internally consistent: iframe playground items load from same-origin routes, `frame-src 'self'` permits this, and the permissive CSP applies to `/playground/*` routes including those served inside iframes. **No contradiction here.**

However, the CSP section specifies the policy in prose but doesn't address the mechanism for applying different policies to different route groups. It says "route-scoped Content Security Policy configured via path-based headers in `next.config.js`" — this works, but `next.config.js` `headers()` config uses path pattern matching. A playground item's iframe route must live under `/playground/` for the permissive policy to apply automatically. If someone creates an iframe route at `/api/playground/[item]/render` (following the API route convention from line 68), it would NOT match the `/playground/*` CSP pattern and would inherit the strict content-page CSP. **Classification: Novel.** The iframe route path convention and the CSP path pattern need to agree, and neither section references the other.

### Known Limitations accuracy check

The Known Limitations section (lines 140-149) lists 8 items. Cross-checking against the current spec:

- **Playground dependency conflicts** (line 142): Accurately reflects current spec. Fine.
- **Search scope** (line 143): Accurate. Fine.
- **Contact form delivery** (line 144): Accurate. Fine.
- **Velite ecosystem longevity** (line 145): Claims migration is "~200 lines of utility code." This is examined in Section 4 below.
- **Next.js baseline JavaScript** (line 146): Now includes TBT/INP impact — addressed from R2 feedback. Accurate.
- **CSP limitations** (line 147): Accurately reflects the `'unsafe-inline'` requirement. Fine.
- **Contact form rate limiting deferred** (line 148): Accurately reflects deferred status. Fine.
- **Turbopack/Webpack divergence** (line 149): Accurately reflects the risk and mitigation. Fine.

**Missing limitation**: The document doesn't list the convention-based enforcement gap as a known limitation. Line 53 says "Enforced by authorship convention; no automated check. Acceptable because all playground items are first-party." This is an acknowledged constraint but isn't in the Known Limitations section. Minor, since the constraint is documented inline, but the Known Limitations section would be the natural place to look for it.

### Decision Log rationale check

Decision #1 (Next.js over Astro, line 124) now acknowledges the JS baseline and Vercel coupling as accepted tradeoffs. It does NOT mention the CSP complexity that Next.js introduces — specifically, that Next.js forces `'unsafe-inline'` for scripts, which would not be necessary with Astro (Astro ships zero inline scripts on static pages and can use `script-src 'self'` without breakage). The CSP limitation is a direct consequence of the Next.js decision and should be acknowledged in the rationale, not just in the Known Limitations section. **Classification: Novel.**

---

## 2. Steering Document vs. Implementation Specification

### `all: initial` with specific property overrides: implementation detail

The spec (line 53) prescribes `all: initial` with explicit overrides for `display`, `box-sizing`, and `unicode-bidi`, plus `isolation: isolate`. This is a concrete CSS implementation. The steering-level concern is "playground items must be visually isolated from the site's design system." The mechanism (`all: initial` vs. Shadow DOM vs. a reset stylesheet) is an implementation choice that could change based on what actually works during development.

**However**, this specificity was added in response to R2's finding that the isolation mechanism was underspecified. The R1 review correctly identified that "style-reset boundary" was too vague to act on. The current level of detail is a reasonable steering-level constraint: it names the approach and its known limitations without prescribing every property value. The three named properties (`display`, `box-sizing`, `unicode-bidi`) are the ones that break visibly with `all: initial` — listing them prevents a predictable implementation stumble. **This is acceptable steering-level detail. Not a finding.**

### Iframe decision rule: the criteria list will rot

The iframe decision rule (lines 57-66) lists 7 specific CSS/JS patterns that require iframe isolation. This is useful now, but it's a closed list in a steering document. When implementation reveals that `pointer-events: none` on the container breaks a playground item, or that a Web Audio API item needs `AudioContext` which is blocked by a restrictive CSP, the steering document needs revision.

A steering document should set the decision *principle*, not enumerate every trigger. The current phrasing "When in doubt, use iframe" (line 66) is the correct steering-level guidance. The enumerated list is useful as *examples*, not as an exhaustive ruleset. The document should frame it as such: "Use iframe if the playground item requires any of the following (non-exhaustive):" Adding "(non-exhaustive)" prevents the list from being treated as definitive. **Classification: Novel.**

### CSP header values: implementation detail that will drift

The CSP specification (line 117) lists exact directive values: `script-src 'self' 'unsafe-inline'`, `style-src 'self' 'unsafe-inline'`, `img-src 'self' data:`, etc. These are implementation details that depend on the specific Next.js version's behavior. Next.js 15 may change its inline script injection strategy; a future version could support nonce-based CSP for static pages. When that happens, the steering document's CSP spec becomes wrong.

The steering-level decision is: "Content pages have a restrictive CSP; playground routes have a permissive CSP. The CSP must be compatible with Next.js's hydration requirements." The specific directive values belong in implementation documentation or `next.config.js` comments. **Classification: Novel.** This isn't wrong today, but it creates a maintenance burden where the steering document must be updated for Next.js version changes.

### Contact form security: mixed steering and implementation

The contact form spec (line 115) mixes steering concerns (input validation, spam prevention, no HTML rendering of user input) with implementation details (zod schema, Resend `text` parameter, honeypot field). The steering-level requirements are:

- Server-side input validation with type and length constraints
- User-provided content must not be rendered as HTML in emails
- Baseline spam prevention that doesn't require external state stores at launch
- Rate limiting deferred with a reactive trigger

The specific tools (zod, Resend's `text` parameter, honeypot) are implementation choices. If the email provider changes from Resend, the steering document's reference to Resend's `text` parameter is wrong. **This is a minor concern** — Resend is already named as the email provider, so referencing its API is reasonable. But "honeypot field" is the right level of abstraction; "zod schema" is arguably too specific (though zod is already in the stack via Velite).

**Overall assessment**: The document is about 30% over-specified for a steering document. The areas that cross into implementation spec are: exact CSP directive values, the `all: initial` property override list, and specific library API references (Resend `text` parameter). These are not harmful — they reduce ambiguity — but they create a maintenance surface where steering-doc updates are needed for implementation-level changes.

---

## 3. Specification Correctness Under Implementation

### `all: initial` reset: the override list is incomplete

The document specifies overrides for `display`, `box-sizing`, and `unicode-bidi`. Testing `all: initial` against practical container requirements:

- `display: initial` → `inline`. Override needed (specified). Correct.
- `box-sizing: initial` → `content-box`. Override needed (specified). Correct.
- `unicode-bidi: initial` → `normal`. Override needed for bidirectional text correctness (specified). Correct.
- `position: initial` → `static`. For a container, `static` is correct. No override needed.
- `overflow: initial` → `visible`. For a playground container, `visible` is usually correct (items control their own overflow). No override needed.
- `pointer-events: initial` → `auto`. Correct default. No override needed.
- `width: initial` → `auto` for block elements with `display: block` override. Correct — container fills parent. Fine.
- `height: initial` → `auto`. Correct — container sizes to content. Fine.
- `color: initial` → `canvastext` (browser default, typically black). This means playground content inherits browser-default black text, not the site's text color. This is the intended behavior (playground controls its own presentation). Fine.
- `font-family: initial` → browser default serif font (typically Times New Roman). Playground items will render in Times New Roman unless they set their own font. This is likely surprising but correct for full isolation — the playground item should declare its own fonts. Fine.

The three specified overrides are the ones that break container layout. The remaining reset behaviors are either correct defaults or intentionally isolated. **The override list is sufficient. Not a finding.**

### Lychee fragment checking against Next.js output

Lychee's `--include-fragments` flag checks that `href="#foo"` targets exist as `id="foo"` in the rendered HTML. Next.js with rehype-slug generates heading IDs from heading text (e.g., `## My Heading` → `id="my-heading"`). Lychee resolves fragments against the actual HTML DOM — it parses the rendered output and looks for matching `id` attributes. This works correctly regardless of how the IDs were generated, because Lychee operates on built HTML, not source markdown.

**One edge case**: if the document uses custom components that generate IDs differently than rehype-slug (e.g., a custom `<Callout id="warning">` component), Lychee will still find those IDs in the built HTML. No configuration needed for Next.js-specific ID generation. **This is fine.**

However, lychee by default only checks HTML files. The R2 review noted that RSS/XML output is not in scope — this is still unresolved. Lychee can check XML files with `--include '*.xml'` or by pointing it at the full output directory. RSS feeds contain `<link>` elements with URLs that could be broken. **Classification: Recurring.** This was identified in R2 and listed as unresolved in the prompt. Severity should escalate: RSS link breakage is invisible (no one browses the XML) and persistent (remains broken until manually discovered).

### Pagefind with Next.js App Router

Pagefind indexes static HTML by crawling the build output directory. Next.js App Router with `output: 'export'` (full static export) produces a standard directory of HTML files at predictable paths. With the default SSG output (deployed to Vercel), Next.js produces HTML files plus JSON data files (RSC payloads) in `.next/server/app/`.

**The issue**: Pagefind needs to be pointed at the correct output directory. For `next export`, it's the `out/` directory. For standard Next.js builds deployed to Vercel, the HTML is in `.next/server/app/` but this includes server-internal files that shouldn't be indexed. The standard approach is to use `next-sitemap` or a custom script to produce a crawlable output, or to run Pagefind against the live preview URL.

More practically: Pagefind's Next.js integration typically works by running Pagefind as a postbuild step against the `out/` directory (requiring `output: 'export'` in next.config.js) or by using Pagefind's `--site` flag against a running server. The document doesn't specify `output: 'export'`, and Vercel doesn't require it — Vercel handles Next.js builds natively.

**If the site uses Vercel's native Next.js deployment (not static export), Pagefind cannot index the build output directly.** The workaround is either: (a) configure `output: 'export'` and use Pagefind against `out/`, which loses API route support and SSR capability; or (b) use Pagefind's crawler mode against a deployed preview URL in CI; or (c) use a Pagefind plugin that hooks into Next.js's build process.

This is a real implementation friction point that the document doesn't address. **Classification: Novel.** Severity: Medium — it's solvable, but the "just run Pagefind at build time" assumption doesn't work without either static export or a workaround.

### Velite + MDX + Next.js pipeline conflicts

Velite processes MDX files at build time and outputs typed JSON collections. Next.js App Router can also process MDX via `@next/mdx`. The question is whether both try to handle the same `.mdx` files.

In practice, they serve different roles: Velite reads MDX frontmatter and produces collection metadata (typed JSON with title, date, slug, etc.), while the actual MDX-to-HTML rendering happens through the Next.js MDX pipeline (remark/rehype plugins configured in next.config.js or mdx-components.tsx). There's no conflict because Velite handles *data extraction* and Next.js handles *rendering*. Velite doesn't compile MDX to HTML; it extracts structured data from it.

The potential friction: if Velite is configured to also compile MDX body content (it can output `body.code` as compiled MDX), this overlaps with Next.js's own MDX compilation. The content would be compiled twice — once by Velite (for the collection output) and once by Next.js (for page rendering). This is wasteful but not a conflict; it just means the Velite compilation output is ignored for rendering. The efficient approach is to use Velite only for frontmatter/metadata and let Next.js handle MDX body compilation. **This is an implementation detail, not a specification gap.** The steering document doesn't need to address it.

---

## 4. Dependency Risk and Ecosystem Assumptions

### Velite migration: "~200 lines" is understated

The document (line 145) claims migration from Velite is "~200 lines of utility code" using gray-matter + zod. What Velite actually provides:

1. **Frontmatter extraction + zod validation**: gray-matter + zod replaces this. ~50 lines per content type, 4 content types = ~200 lines. Accurate for this part.
2. **Typed JSON output generation**: A script to glob MDX files, parse them, validate, and write JSON. ~50 lines.
3. **Watch mode for development**: File-watching + re-processing on change. ~30 lines with chokidar, but getting incremental rebuilds right (only reprocess changed files, update the collection) is more like 100 lines.
4. **Type generation**: Velite generates TypeScript types from zod schemas. With a hand-rolled pipeline, the zod schemas still produce types (that's what zod does), but the import paths and collection type interfaces change. Every file that imports from Velite's generated types needs updating. This is ~20 files of import changes, not utility code.
5. **Collection relationships**: If any content type references another (e.g., a project links to blog posts), Velite resolves these at build time. A hand-rolled pipeline needs this logic. ~50 lines per relationship.

Realistic migration scope: ~300-400 lines of utility code, plus ~20 files of import path changes, plus dev-mode watch/rebuild logic. Not a rewrite, but "~200 lines" understates it by roughly 2x. The import path changes are the tedious part — they're mechanical but touch many files. **Classification: Novel.** Severity: Low — the migration is still straightforward, but the estimate should be honest.

### shadcn/ui: Radix UI is the real dependency

The document (line 132) says "components are owned source code, not an opaque dependency." The shadcn/ui components in `components/ui/` are indeed source code. But they import from `@radix-ui/*` packages — these ARE npm dependencies:

- `@radix-ui/react-dialog`
- `@radix-ui/react-dropdown-menu`
- `@radix-ui/react-tooltip`
- `@radix-ui/react-slot`
- etc.

Each Radix primitive is a separate package. A typical shadcn/ui setup installs 5-15 Radix packages. If Radix UI ships a breaking change (they did between 0.x and 1.x), every shadcn/ui component using the affected primitive needs updating. The "owned source code" claim is true for the component *composition* layer but misleading about the dependency surface.

**Practical risk**: Radix UI is well-maintained (Workos-backed), follows semver, and breaking changes are infrequent. The actual risk is low. But the document's framing that shadcn/ui avoids dependency risk is inaccurate — it shifts the dependency from a component library (MUI, Chakra) to a primitives library (Radix). The dependency surface is smaller and more stable, which is the real advantage. **Classification: Novel.** Severity: Low — the risk is real but small.

### Pagefind index size claim

The document (line 27) says "~1-5KB initial load." Pagefind's architecture: a ~5KB WASM loader, then an index fetched on first search interaction. The index size depends on content volume: Pagefind reports ~1.5KB per 100 pages for the index metadata, with content chunks loaded on demand.

For a personal blog with 50-200 posts, the total index is 10-50KB, loaded incrementally (only chunks matching the search query are fetched). The "1-5KB initial load" refers to the WASM bootstrap, not the search index. The claim is accurate for initial page load (only the WASM is loaded; the index is fetched on first search interaction). It is misleading if read as "the entire search functionality costs 1-5KB" — but the document says "initial load," which is technically correct.

**This is fine.** The phrasing is precise enough. Minor improvement: saying "~5KB WASM loader; index fetched on demand" would be clearer, but the current text isn't wrong.

### Node.js 22 LTS: end-of-life timing

The document specifies Node.js 22 LTS (line 11). Node.js 22 entered Active LTS in October 2024 and enters Maintenance LTS in October 2025, with end-of-life in April 2027. Node.js 24 enters Active LTS in October 2025.

As of the current date (March 2026), Node.js 22 is in Maintenance LTS with ~13 months until EOL. Node.js 24 is the current Active LTS. For a project starting now, Node.js 22 means planning a mandatory runtime upgrade within a year. Node.js 24 gives ~2.5 years of support.

**The document should specify Node.js 24 LTS.** Starting a new project on a maintenance-phase runtime that goes EOL in 13 months is a poor choice. All specified dependencies (Next.js, Velite, Pagefind, etc.) support Node.js 24. **Classification: Novel.** Severity: Medium — not a blocking issue, but choosing an actively-supported runtime avoids a forced upgrade within the first year.

---

## 5. Missing Operational and Maintenance Concerns

### No dependency update strategy

The document specifies the initial stack but says nothing about keeping it current. Concrete scenarios:

- **Next.js 16** ships in late 2026 with breaking changes to App Router data fetching. The site is on Next.js 15. Does the site stay on 15 until it's unsupported, or upgrade proactively?
- **Tailwind CSS v4** has a different configuration model than v3. The site launches on v4, but shadcn/ui components may lag behind Tailwind updates.
- **Radix UI 2.0** ships with renamed APIs. Every shadcn/ui component needs updating.

For a solo-maintained personal site, the practical strategy is "upgrade when something breaks or when a feature is needed." The document doesn't need a formal update cadence, but it should acknowledge that the stack requires periodic maintenance and that major dependency updates (especially Next.js) should be budgeted as half-day to full-day tasks. **Classification: Novel.** Severity: Low — this is operational reality, not a specification gap, but a one-sentence acknowledgment prevents surprise.

### Build reproducibility

The document specifies pnpm (which uses a lockfile by default) and Node.js 22. Missing:

- **`.nvmrc` or `engines` field**: Without Node.js version pinning, a contributor (or Matthew on a new machine) could run a different Node.js version and get different build behavior. `engines` in `package.json` and `.nvmrc` are trivial to add and are steering-level decisions.
- **pnpm version pinning**: pnpm versions can produce different lockfile formats. `packageManager` field in `package.json` (used by Corepack) pins this.

These are small but affect reproducibility. **Classification: Novel.** Severity: Low — easy to add, prevents "works on my machine" issues.

### Monitoring beyond the contact form

The document specifies a Playwright smoke test for the contact form (line 82). For the rest of the site:

- **Build failures**: GitHub Actions CI will catch these. Covered.
- **Deploy failures**: Vercel reports deploy status. Covered.
- **Performance regressions**: Not monitored. A new dependency or large image could drop Lighthouse below 90. Vercel provides Speed Insights on paid plans; Hobby tier gets basic Web Vitals. No automated alerting.
- **Runtime errors**: For a mostly-static site, runtime errors are limited to client-side JS (theme toggle, search, playground items). No error tracking (Sentry, etc.) is specified. For a personal site, this is acceptable — client-side errors on a static site are rare and low-impact.

**The implicit assumption is "it's a static site, Vercel handles operational concerns."** This is largely correct for a Hobby-tier personal site. The one gap is performance regression detection, but the cost of monitoring (paid Vercel tier or third-party tool) outweighs the risk. **Not a finding** — the document's implicit model is reasonable.

### Vercel Hobby tier limits

100GB bandwidth/month, 1M edge requests/month. Consumption estimate for a personal site:

- Average page size (HTML + CSS + JS + images): ~500KB with optimized images
- Normal traffic: ~100-500 visits/day = 1.5-7.5GB/month. Well within limits.
- Viral scenario: a blog post hits Hacker News front page. 50,000 visits in a day × 500KB = 25GB in one day. Three viral posts in a month could exceed 100GB.

The viral scenario is unlikely but not impossible for a technical blog. Vercel's response to overage: the site stays up but you're billed for excess usage (Hobby tier has soft limits, not hard cutoffs — Vercel contacts you about upgrading).

**This is accepted risk, appropriately.** A personal site shouldn't over-provision for viral traffic. If it happens, upgrading to Pro ($20/month) is trivial. The document doesn't need to address this. **Not a finding.**

---

## Deliverables

### Top 5 Risks or Gaps

1. **Pagefind cannot index Next.js build output without static export or a workaround.** Pagefind indexes static HTML files. Vercel's native Next.js deployment doesn't produce a `out/` directory of static HTML — the build output is in `.next/server/app/` in a server-internal format. The document assumes Pagefind "builds a compressed index at build time" but doesn't address how Pagefind accesses the rendered HTML. This requires either `output: 'export'` (which sacrifices API routes and SSR), crawler mode against a preview deploy, or a build-step workaround. **Classification: Novel.** Failure scenario: Pagefind integration is attempted during implementation, doesn't work with the default Next.js build, and requires architectural decisions about static export vs. crawler mode that should have been made at steering level.

2. **Node.js 22 reaches end-of-life in April 2027 — 13 months from now.** Starting a new project on a maintenance-phase runtime guarantees a forced Node.js upgrade within the first year. Node.js 24 is the current Active LTS with support until April 2029. **Classification: Novel.** Failure scenario: Node.js 22 goes EOL, security patches stop, and the upgrade to 24 coincides with other maintenance work, creating a larger-than-necessary migration batch.

3. **Iframe route paths may not match CSP path patterns.** The playground server-side convention says API routes go under `/api/playground/[item]/`. If an iframe playground item's render route lives under `/api/` instead of `/playground/`, it inherits the content-page CSP, not the permissive playground CSP. The CSP path pattern and the iframe route convention need to reference each other explicitly. **Classification: Novel.** Failure scenario: an iframe playground item loads from `/api/playground/item/render`, the strict CSP blocks its inline scripts and styles, and it breaks in production.

4. **RSS/XML output is not included in link checking scope.** Identified in R2 and still unresolved. RSS feed `<link>` elements contain URLs that can break when slugs change. RSS readers cache feeds infrequently, so broken links persist for subscribers. Lychee can check XML files with configuration. **Classification: Recurring (escalated).** Failure scenario: a blog post slug is renamed, the RSS feed contains the old URL, and RSS subscribers get 404s that persist indefinitely.

5. **Velite migration estimate is understated by ~2x.** The claimed "~200 lines of utility code" covers frontmatter parsing and validation but omits watch mode, import path changes across ~20 files, and collection relationship resolution. Realistic scope is ~300-400 lines of utility code plus mechanical import changes. **Classification: Novel.** Failure scenario: Velite is abandoned, migration is planned as a half-day task based on the "200 lines" estimate, and actually takes 1-2 days including the import path changes and dev-mode watch rebuilds.

### Top 3 Conclusions to Challenge or Reverse

1. **Reverse: Node.js 22 LTS.** Node.js 22 is in maintenance phase and goes EOL in April 2027. Node.js 24 is the current Active LTS with support until 2029. There is no technical reason to choose 22 over 24 — all specified dependencies support Node.js 24. Starting on 22 creates a guaranteed forced upgrade within the project's first year. Change to Node.js 24 LTS.

2. **Challenge: The iframe decision rule's criteria list is implicitly exhaustive.** The list of 7 iframe triggers (lines 58-64) reads as a closed set. During implementation, additional patterns will emerge that escape `@layer` + CSS Modules isolation (Web Audio API needing permissive CSP, WebGL contexts with specific extension requirements, items using `document.body` manipulation). The list should be explicitly marked as non-exhaustive, and the "when in doubt, use iframe" guidance (line 66) should be elevated from a footnote to the primary decision principle.

3. **Challenge: The Next.js-over-Astro rationale doesn't acknowledge CSP cost.** Decision #1 (line 124) lists the JS baseline and Vercel coupling as accepted tradeoffs of choosing Next.js. It omits that Next.js also forces `'unsafe-inline'` in the CSP `script-src` directive — a security tradeoff that Astro's zero-inline-script output would not require. This doesn't change the decision (the DX argument still wins), but the rationale should be complete about what the decision costs.

### What's Missing

1. **Pagefind integration strategy for Vercel-deployed Next.js.** Deliverable: a decision on how Pagefind indexes the site — static export (`output: 'export'`), crawler mode against preview deploys, or a build-step workaround. This determines whether `output: 'export'` is required in `next.config.js`, which has implications for API routes and SSR capability.

2. **Node.js version update.** Deliverable: change "Node.js 22 LTS" to "Node.js 24 LTS" throughout the document. Add `.nvmrc` and `packageManager` field in `package.json` to the build reproducibility requirements.

3. **Non-exhaustive marker on iframe decision rule.** Deliverable: add "(non-exhaustive)" or equivalent language to the iframe trigger list, making clear that the "when in doubt, use iframe" principle takes precedence over the enumerated criteria.

4. **CSP path pattern and iframe route convention alignment.** Deliverable: a statement in the playground architecture section that iframe playground routes must live under `/playground/` (not `/api/playground/`) to inherit the permissive CSP, or alternatively, that the CSP path pattern must also cover iframe render routes.

5. **RSS/XML inclusion in link checking scope.** Deliverable: add RSS/XML output files to the lychee configuration scope. This was identified in R2 and remains unaddressed.
