# Adversarial Analysis: Spec Decomposition

## 1. Foundation Spec Scope — Too Much or Too Little?

### Is spec 1 one deliverable or a dumping ground?

It's a dumping ground. Spec 1 contains at least five independently-failable workstreams:

1. **Framework scaffolding** (Next.js, TypeScript, pnpm, .nvmrc) — mechanical, low-risk.
2. **Content pipeline** (Velite config, schemas, `#site/content` alias) — requires schema design decisions that depend on downstream specs.
3. **UI foundation** (Tailwind v4, shadcn/ui, theme toggle, global styles, CSS variables) — design-dependent, iterative.
4. **CI/CD** (GitHub Actions: lint, type-check, test, build, deploy to Vercel) — operational, blocks every downstream spec's merge workflow.
5. **Landing page** (hero cards, responsive layout, placeholder routes, custom 404) — a feature, not infrastructure.

A broken CI pipeline blocks every spec. A buggy hero card blocks nothing. These have different failure modes and different downstream impacts. Bundling them means a CI debugging session delays the landing page, and a hero card design iteration delays CI availability.

**CI/CD should be its own thin spec or at minimum a separately-testable deliverable within spec 1.** The decomposition's "What Is NOT a Spec" table dismisses this with "delivery pipeline" — but delivery pipeline is exactly the thing that, if broken, cascades to every other spec.

### Stubbing Velite schemas for all content types is premature

The decomposition says "Velite schemas should be stubbed for all content types so later specs add content without reconfiguring the pipeline." This requires knowing the final shape of:

- Blog frontmatter: title, date, updated, description, tags, categories, series, seriesOrder, draft — that's 9 fields, several of which (series, categories) aren't obvious without designing the blog.
- Project metadata: title, description, date, image, tags, links — "links" is a structured field whose shape depends on what project detail pages need.
- Contributions: repo, description, prUrl, commitUrl, date — simple enough to stub.
- Resources: title, url, description, category — also simple.
- Pages: whatever single-page MDX needs.

The blog and project schemas are complex enough that stubbing them in spec 1 creates a misleading contract. When spec 3 discovers it needs a `coverImage` field, or spec 5 decides `links` should be an array of `{label, url, type}` objects instead of flat fields, the stub has to change. The "stubs" aren't stubs — they're premature API contracts that will either be wrong or require spec 1's implementer to fully design schemas they don't yet have content for.

**Better approach**: Spec 1 sets up the Velite pipeline with one real schema (pages, for the landing page content) and a documented pattern. Each downstream spec defines its own schema in `velite.config.ts` as part of its scope.

### Hero cards are premature abstraction

The decomposition says "establish the card component pattern here since it's reused across blog index, project gallery, contributions, playground gallery, and the landing page itself." But:

- Blog index cards need: title, date, description, tags, reading time.
- Project gallery cards need: title, description, image/screenshot, links.
- Contributions cards need: repo name, description, PR link.
- Playground gallery cards need: title, description, tags, iframe preview maybe.

These share a container shape (border, padding, hover state) but nothing else. The "consistent visual language" is a CSS concern, not a component concern. Building a reusable `<Card>` in spec 1 before any of these content types exist means either:
- The card is so generic it's just a `<div>` with a border (not useful abstraction), or
- The card encodes assumptions about content shape that will be wrong for 3 out of 4 consumers.

shadcn/ui already provides a Card primitive. The decomposition is asking spec 1 to build a domain-specific card abstraction before the domain is understood.

### E2E tests for theme toggle inflate spec 1

Spec 1 must: install Playwright, configure it (`playwright.config.ts` in `e2e/`), write a test that loads the page, clicks the theme toggle, and asserts the theme changes. This is a reasonable scope addition — maybe 1-2 hours — but it means spec 1 now also requires a working Playwright setup that all downstream specs inherit. If the Playwright config is wrong or flaky in CI, it blocks every spec that adds E2E tests. This reinforces the argument that CI/testing infrastructure and features should be separable.

That said, for a single-developer project, this is manageable. The risk is real but the blast radius is limited to one person's time. Fine, but acknowledge it.

---

## 2. Dependency Graph Accuracy and Hidden Coupling

### /contact page: contradiction between spec 2 and spec 7

The decomposition states two things:
- Spec 2 (professional-profile) scope includes: "Standalone /contact slash page reusing the same contact components."
- Spec 7 (slash-pages) design considerations say: "/contact is already built in the professional-profile spec."

So /contact is delivered in spec 2, and spec 7 acknowledges this. This is consistent — /contact is spec 2's responsibility. But then why does the decomposition list /contact under the slash-pages concept at all? The product steering doc (section 8, "Slash Pages") lists /contact as a slash page. The decomposition splits it to spec 2 for pragmatic reasons (shared components), but this means spec 7 delivers an incomplete set of slash pages. If someone reads spec 7's scope without reading spec 2's, they'll think /contact is missing.

**This isn't a blocker, but the decomposition should explicitly state**: "The /slashes index page must include /contact even though it was built in spec 2."

### Spec 7 has a hidden dependency on spec 2

Spec 7's /slashes page is "an index page listing all slash pages with descriptions and links." /contact is a slash page built in spec 2. If spec 7 is implemented before spec 2, the /slashes index either omits /contact (incomplete) or links to a page that doesn't exist (broken). The decomposition says spec 7 has no dependency on spec 2. This is wrong — spec 7 has at minimum a soft dependency on spec 2 for completeness.

### Pagefind CI: undeclared reverse dependency from spec 4 to spec 1

Spec 4 (blog-enhanced) needs Pagefind, which requires modifying the CI build pipeline to run `next build && next start` and crawl. Spec 1 owns CI/CD. Spec 4 must modify spec 1's CI configuration — adding scripts to `package.json`, adding CI workflow steps. This is a reverse dependency: spec 4 modifies infrastructure owned by spec 1.

The decomposition recommends deferring Pagefind CI to spec 4 "since it's the consumer." This is pragmatically correct for a single developer, but it means spec 4's scope includes CI pipeline modification, which isn't mentioned in spec 4's scope description. The scope says "Pagefind search integration (build-time indexing via crawler mode, client-side WASM search)" — this reads as a feature spec, not a CI spec. The CI modification work is hidden.

### Specs 5 and 6 card divergence risk

Specs 5 (projects) and 6 (contributions) both display cards on gallery pages. If implemented in parallel (as the dependency graph allows), two different developers — or the same developer in two different mental contexts — could produce visually divergent card designs. The decomposition says the card component from spec 1 handles this, but as argued above, the spec 1 card is either too generic to enforce consistency or too specific to accommodate both content types.

For a single-developer project, this is low risk — Matthew will maintain visual consistency naturally. For a multi-developer project, this would be a real problem. **Fine for this project, but the decomposition shouldn't claim the card component pattern solves this.**

---

## 3. Vertical Slice Integrity

### Spec 6 bundles two unrelated features

Contributions and resources share: Velite, YAML source format, single-page rendering, card-like layout. They don't share: data schema, UI components, user journey, or information architecture. A recruiter visiting contributions doesn't care about bookmarks. Someone browsing the blogroll doesn't need to see PR links.

The justification is implicitly "both are small." This is a valid reason to bundle for a single-developer project — the overhead of two separate specs (two PRs, two review cycles, two sets of E2E tests) exceeds the cost of bundling. **This is fine pragmatically but violates single-responsibility. Acknowledge the tradeoff.**

### Spec 7 is a catch-all for leftover pages

/about, /colophon, /now are MDX-rendered pages — same pattern. /sitemap is a component-only page that queries all routes programmatically. /slashes is a component-only page with a hardcoded list. These are three different implementation patterns bundled under "slash pages."

The MDX pages are trivial once the MDX rendering pattern exists from spec 1/3. /sitemap requires programmatic route discovery — a different skill. /slashes is a static list.

**This is a coherent thematic slice (IndieWeb slash pages) but not a coherent technical slice.** For a single developer, it's fine — these are all small. The risk is that /sitemap's route discovery logic takes longer than expected and delays the trivial MDX pages. Acceptable.

### Spec 3 (blog-core) is not "core" — it's the entire blog

The scope lists: blog index, post pages, MDX rendering, Shiki syntax highlighting, copy-to-clipboard, tags and categories with filtering, reading time, TOC generation, prev/next navigation, draft exclusion, footnotes/sidenotes, last-updated display, and code block styling. That's 12+ features.

Compare to spec 4 (blog-enhanced): search, RSS, series UI, related posts, social sharing, reading progress bar. That's 6 features.

The split is lopsided. Spec 3 is 2-3x the work of spec 4. More importantly, spec 3 bundles things that are genuinely core (index, posts, MDX rendering) with things that are polish (footnotes/sidenotes, copy-to-clipboard, prev/next navigation). If footnote rendering hits a snag with rehype plugin configuration, it blocks the entire blog launch.

**RSS should be in spec 3, not spec 4.** RSS is a standard blog expectation, not an enhancement. A blog without RSS is incomplete. A blog without a reading progress bar is fine. The decomposition puts RSS in the wrong spec.

### Spec 4 bundles unrelated features

Search, RSS, series UI, related posts, social sharing, and reading progress bar have no shared implementation. Search requires Pagefind + CI changes. RSS requires XML generation. Series UI requires frontmatter-based grouping. Related posts require a scoring algorithm. Social sharing requires external link generation. Reading progress bar requires scroll event handling. These are six independent features that happen to be "blog stuff."

**The split between spec 3 and 4 should be reconsidered.** A better split: spec 3 = rendering + navigation (index, posts, MDX, syntax highlighting, tags, prev/next, reading time, drafts). Spec 4 = discovery + engagement (search, RSS, TOC, series, related posts, social sharing, progress bar, footnotes). Or simply: move RSS to spec 3 and accept that spec 3 is big.

### Spec 8 (playground) — testable without real content?

The decomposition says to include "one sample item in each isolation mode to validate the architecture." The tech steering doc says sample items should be minimal test fixtures. This is correct — the architecture can be validated with a `<div>Hello from same-page isolation</div>` and a `<div>Hello from iframe isolation</div>`.

However, the real risk isn't whether the architecture works with trivial content — it's whether it works with real CSS complexity. A test fixture with no styling won't exercise `all: initial` resets, `@layer` ordering, or CSS Modules scoping in any meaningful way. **The sample items should include enough CSS to prove isolation works** — at minimum, set colors, fonts, and layout properties that would conflict with the main site theme.

---

## 4. Cross-Spec Convention Gaps

### Card component pattern is unenforceable

"Cards share a consistent visual language but vary in content" is not a specification. It's a hope. Without a visual spec, design tokens, or at minimum a documented contract (border radius, padding, shadow, hover behavior, image aspect ratio, text truncation rules), "consistent visual language" means whatever the implementer feels like at the time.

For a single developer, this is acceptable — Matthew will maintain visual consistency by eyeballing it. The convention should say this explicitly: "Consistency is maintained by the single developer's judgment, not by component API." Pretending the card component pattern enforces consistency is misleading.

### Concurrent modification of `src/lib/content.ts`

Specs 2, 3, 5, and 6 all add content query helpers to `src/lib/content.ts`. They're parallelizable after spec 1. If Matthew works on these sequentially (likely for a solo developer), merge conflicts are manageable — each spec adds functions to the file. If any two are in-flight simultaneously (e.g., on separate branches), merging will produce conflicts in imports and function ordering.

The decomposition doesn't address this. **Mitigations**: each spec could put its query helpers in a separate file (`src/lib/blog.ts`, `src/lib/projects.ts`, etc.) and `content.ts` could be reserved for shared utilities. Or accept that merge conflicts in this file are trivial to resolve. Either way, acknowledge it.

### No component API contract for shared contact components

Spec 2 builds the contact form, email obfuscation, and social links in `src/components/shared/`. Spec 7 consumes them on /contact. There's no contract for: what props the contact form accepts, whether it handles its own submission or calls a parent callback, what the email obfuscation component's interface looks like, how social links are configured (hardcoded or prop-driven).

For a single developer doing specs sequentially, this is fine — Matthew will know the API because he wrote it. For parallel implementation, this would require spec 2 to publish a component API contract before spec 7 begins. **The decomposition should note this as a sequential constraint**: spec 7's /contact page should be implemented after spec 2, even though the dependency graph doesn't require it.

### Missing conventions for metadata/SEO

Each page needs: `<title>`, `<meta name="description">`, Open Graph tags (og:title, og:description, og:image, og:url). Next.js App Router handles this via `export const metadata` or `generateMetadata()` in page files. But there's no convention for:
- Where the default OG image lives.
- Whether each content type generates its own OG image or uses a site-wide default.
- What the title template is (`"Post Title | matthew-field.ca"` vs `"Post Title — Matthew Field"`).
- Whether pages export static metadata or dynamic `generateMetadata`.

For a personal site, this is low risk — Matthew will set it up in spec 1 and follow the pattern. But if spec 1 doesn't establish the metadata pattern (and it's not mentioned in spec 1's scope), each spec will reinvent it. **Spec 1 should include a metadata convention** — even if it's just "use `generateMetadata()` with this title template and this default OG image."

---

## 5. Open Questions That Block Implementation

### All four "open questions" are already decided

Every open question includes a recommendation that the decomposition already follows:

1. Hero cards → placeholder pages. Spec 1's scope says "hero cards linking to each major section." Decided.
2. Blog split → two specs. Already split as specs 3 and 4. Decided.
3. Pagefind CI → blog-enhanced. Already deferred. Decided.
4. Sample playground items → test fixtures. Already recommended. Decided.

**These should be removed from the open questions section and documented as decisions.** Listing decided items as "open" implies they're negotiable and invites re-litigation.

### Actually unresolved questions

**Q1: How does `#site/content` work before content exists?** Spec 1 configures Velite and stubs schemas. But `.velite/` is generated at build time from content files. If spec 1 stubs schemas but no content files exist yet, does `velite build` succeed? Does it produce empty collections that can be imported? Or does it fail because `content/blog/` is empty? The tech steering doc says "Velite must run before type-checking or editor use — `.velite/` does not exist until the first build." This means spec 1 must create at minimum one content file per schema (or configure Velite to handle empty directories). Not addressed.

**Q2: What happens when a section's spec is deferred or fails?** The landing page hero cards link to each major section. If spec 8 (playground) is cut or delayed indefinitely, the landing page has a card linking to a placeholder forever. Is this acceptable? Should the landing page be dynamically generated from available content, or is it hardcoded? The decomposition implies hardcoded (spec 1 builds it), which means spec failures leave dead links.

**Q3: Incremental deployment strategy.** Can individual specs be deployed as they land? The decomposition implies yes (each spec is independently valuable), and Vercel deploys on push to main. But: if spec 1 deploys the landing page with placeholder pages, the live site has "coming soon" pages visible to the public. Is Matthew comfortable with this? Should there be a feature flag or a "don't deploy until spec N" gate? This affects whether specs are truly independently shippable.

**Q4: Velite `velite.config.ts` ownership.** Multiple specs modify this file (adding schemas). Same concurrent modification risk as `content.ts`. Who owns the canonical schema file structure?

---

## 6. Spec Sizing and Estimability

### Spec 1 is 3-5x larger than spec 6

Spec 1: Next.js scaffolding, Tailwind v4, shadcn/ui, Velite pipeline, all schema stubs, root layout, site layout, header/nav/footer, theme toggle, landing page with hero cards, global styles, CSS variables, CSP headers, custom 404, TypeScript strict mode, ESLint, Prettier, .nvmrc, pnpm pin, CI/CD (GitHub Actions), XML sitemap, Vitest config, Playwright config.

Spec 6: Two YAML-driven pages with card rendering.

These aren't comparable. Spec 1 is a project kickoff sprint. Spec 6 is an afternoon. The decomposition doesn't acknowledge this disparity. If specs are meant to be roughly similar in size (INVEST's "small" principle), spec 1 violates it decisively.

**This is acceptable for a foundation spec** — foundation work is inherently front-loaded. But the decomposition should acknowledge that spec 1 is the largest deliverable by far, and consider whether it should be broken into sub-deliverables with explicit checkpoints.

### Spec 3 is a full blog product

12+ features in one spec. Estimated effort for the individual items:
- Blog index + individual posts: core, maybe a day.
- MDX rendering: already handled by Velite, minimal.
- Shiki + copy-to-clipboard: moderate, theme integration.
- Tags and categories with filtering: moderate, needs URL param handling.
- Reading time: trivial (Velite transform).
- TOC generation: moderate, rehype plugin config.
- Prev/next navigation: trivial.
- Draft exclusion: trivial (Velite schema + build filter).
- Footnotes/sidenotes: moderate to complex, rehype plugin.
- Last-updated display: trivial.
- Code block styling: moderate, Shiki theme customization.

This is a substantial spec. The concern isn't that it's too big for one developer — it's that bundling 12 features means the spec can't be declared "done" until all 12 work. If footnote rendering via rehype/remark takes two days of plugin debugging, the blog can't ship even though 11 features are complete.

### Spec 8 architectural risks discovered late

The playground requires solving: CSS `all: initial` resets, `@layer` ordering, CSS Modules scoping, Turbopack/Webpack divergence, manifest system, dynamic imports, two isolation modes, permissive CSP override, and iframe embed routes. This is the most architecturally novel work in the entire project.

Placing it as spec 8 (last in recommended order) means:
- If the style isolation approach doesn't work, it's discovered after 7 specs are done.
- CSP modifications in `next.config.ts` could conflict with the base CSP from spec 1.
- The `(playground)` route group layout requires the root layout from spec 1 but adds a style reset layer — if this conflicts with spec 1's assumptions, it's discovered late.

**Counterargument**: the playground is the lowest business priority (professional funnel > blog > portfolio > playground). Discovering it late means the highest-value work is already done. For a personal site, this is the correct prioritization — business value over architectural risk.

**However**: a two-hour spike on CSS `all: initial` + `@layer` isolation during spec 1 would retire the biggest technical risk at near-zero cost. The decomposition should recommend this explicitly.

---

## Top 5 Risks or Gaps

### 1. Spec 1 is a monolith that conflates infrastructure and features

**Specs affected**: 1, and all downstream specs.
**Failure scenario**: CI/CD debugging takes a week. During that time, the landing page, Velite pipeline, theme toggle, and all schema stubs are also blocked — even though they're independent workstreams. Alternatively, hero card design iteration delays CI availability, blocking all downstream spec merges.
**Severity**: High. This is the critical path for the entire project.

### 2. Premature Velite schema stubs will create rework

**Specs affected**: 1, 3, 5.
**Failure scenario**: Spec 1 stubs the blog schema with 9 fields. Spec 3 discovers it needs `coverImage`, `excerpt`, or different tag semantics. The stub was wrong — now spec 3 must modify spec 1's schema, update any placeholder content that used the old schema, and potentially break the landing page hero cards if they consumed blog data.
**Severity**: Medium. Rework is bounded, but the "stub everything upfront" approach is presented as a benefit when it's actually a risk.

### 3. Blog-core (spec 3) is too large to be a single deliverable

**Specs affected**: 3, 4.
**Failure scenario**: 11 of 12 features work. Footnote rendering via rehype plugin has an obscure conflict with the Shiki integration. The blog can't ship, spec 4 is blocked, and working features (index, posts, tags, reading time) sit unreleased.
**Severity**: Medium-high. The blog is the second-highest business priority after the professional profile.

### 4. No metadata/SEO convention established early

**Specs affected**: 2, 3, 5, 6, 7, 8.
**Failure scenario**: Spec 2 uses `export const metadata = { title: "Profile | matthew-field.ca" }`. Spec 3 uses `generateMetadata()` with `title: { template: "%s — Matthew Field" }`. Spec 5 uses yet another pattern. By the time all specs land, the site has inconsistent titles, missing OG images on some pages, and no unified metadata approach. Fixing it requires touching every page file.
**Severity**: Medium. Fixable but tedious. Could be prevented by 10 minutes of convention-setting in spec 1.

### 5. Playground architectural risks discovered at spec 8

**Specs affected**: 1, 8.
**Failure scenario**: CSS `all: initial` doesn't work as expected with Tailwind v4's new engine. The `@layer` approach conflicts with shadcn/ui component styles that leak into the playground. Discovered at spec 8, requiring changes to spec 1's CSS architecture (global styles, layer ordering) — which by now has 6 specs built on top of it.
**Severity**: Medium. The playground is low priority, but a late-discovered CSS architecture conflict could cascade.

---

## Top 3 Conclusions to Challenge or Reverse

### 1. RSS belongs in blog-core (spec 3), not blog-enhanced (spec 4)

**Current decision**: RSS/Atom feed generation is in spec 4 (blog-enhanced).
**Why it's wrong**: RSS is a standard blog feature, not an enhancement. A blog without RSS is incomplete for the target audience (tech peers who use feed readers). RSS is also technically trivial — a single `route.ts` file that queries blog posts and generates XML. It has no dependency on Pagefind, series UI, related posts, or any other spec 4 feature. Placing it in spec 4 delays a basic capability behind search integration and progress bars.
**Recommendation**: Move RSS to spec 3. It's 1-2 hours of work and makes the blog independently useful on day one.

### 2. Velite schema stubs for all content types should NOT be in spec 1

**Current decision**: Spec 1 stubs schemas for blog, projects, contributions, resources, and pages.
**Why it's wrong**: Schema design requires knowing the content shape. Blog schemas have 9+ fields. Project schemas have structured `links` and `image` fields. Designing these in spec 1 — before any content exists — creates premature contracts that downstream specs will modify. The stub provides a false sense of stability. Each downstream spec should own its schema definition, with spec 1 providing only the Velite pipeline infrastructure and one real schema (pages) as a pattern to follow.
**Recommendation**: Spec 1 sets up Velite with the `pages` schema only. Each content spec adds its own schema to `velite.config.ts`.

### 3. A CSS isolation spike should happen during spec 1, not spec 8

**Current decision**: Playground style isolation is entirely spec 8's problem.
**Why it's wrong**: The playground's CSS isolation (`all: initial`, `@layer`, route group layout) interacts with spec 1's CSS architecture decisions — Tailwind v4 layer ordering, global styles, shadcn/ui component styles. If the isolation approach fails, it may require changing spec 1's CSS setup, which by spec 8 has 6 specs built on it. A 2-hour spike during spec 1 — set up the `(playground)` route group, apply `all: initial`, render a styled div, verify in both dev and production build — would retire this risk early.
**Recommendation**: Add a playground CSS isolation spike to spec 1's scope. Not the full playground — just the route group, layout, and style reset. Confirm the approach works before building on it.

---

## What's Missing

Before spec implementation begins, the following should be resolved:

1. **Metadata/SEO convention**: Define the title template, default OG image location, and whether pages use static `metadata` or `generateMetadata()`. Add this to spec 1's scope or cross-spec conventions.

2. **Velite empty collection behavior**: Verify that Velite handles empty content directories gracefully (no blog posts → empty array, not a build error). Document this so spec 1's implementer knows whether placeholder content files are required.

3. **Content query file organization**: Decide whether all specs add helpers to `src/lib/content.ts` (merge conflict risk) or each spec creates its own file (`src/lib/blog.ts`, `src/lib/projects.ts`). Document in cross-spec conventions.

4. **Spec 1 sub-deliverable checkpoints**: Break spec 1 into ordered checkpoints: (a) scaffolding + CI/CD, (b) Velite pipeline + pages schema, (c) layouts + theme toggle, (d) landing page + hero cards. Allow downstream specs to begin after checkpoint (a) rather than waiting for all of spec 1.

5. **Remove false open questions**: Convert the four "open questions" to documented decisions. Add the actually-unresolved questions: Velite empty collections, incremental deployment comfort, landing page behavior when sections are deferred.

6. **CSS isolation spike**: Add a time-boxed (2-hour) playground CSS isolation proof-of-concept to spec 1. Validate `all: initial` + `@layer` + Tailwind v4 + production build before any spec builds on the CSS architecture.

7. **Sequential constraint for spec 7 → spec 2**: Document that spec 7's /contact page and /slashes index should be implemented after spec 2 ships, even though the dependency graph shows them as independent. The shared contact component API is an implicit contract.
