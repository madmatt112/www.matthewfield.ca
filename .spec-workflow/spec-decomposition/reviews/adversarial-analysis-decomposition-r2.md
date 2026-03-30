# Adversarial Analysis: Spec Decomposition (Round 2)

## 1. Spec 1 Checkpoint Strategy — Does It Actually Mitigate?

### Checkpoint (a) is not sufficient for most downstream specs

The decomposition claims "downstream specs can begin after checkpoint (a)" where checkpoint (a) is scaffolding + CI/CD. Let's trace actual checkpoint dependencies for each downstream spec:

- **Spec 2 (professional-profile)**: Needs the `(site)` route group layout with header/nav/footer, theme toggle, and the metadata/SEO convention (`generateMetadata()` pattern). That's checkpoint (c). Spec 2 cannot render a meaningful professional profile page against bare scaffolding — it needs the layout shell, theme support, and metadata pattern to produce a testable deliverable.
- **Spec 3 (blog-core)**: Needs the Velite pipeline configured with the `pages` schema as the reference pattern and the `#site/content` import alias working — checkpoint (b). Also needs layouts and theme toggle for blog pages to render within the site shell — checkpoint (c).
- **Spec 5 (project-showcase)**: Same as spec 3: Velite pipeline (b) + layouts/theme (c).
- **Spec 6 (contributions-and-resources)**: Same dependency profile: Velite (b) + layouts (c).
- **Spec 7 (slash-pages)**: Needs the `pages` Velite schema for MDX slash pages (b), plus layouts (c).
- **Spec 8 (playground)**: Depends on the CSS isolation spike — that's checkpoint (d), the very last checkpoint.

After checkpoint (a), a downstream spec can begin content authoring (writing MDX files) and schema design on paper. No spec can produce a working, testable page. "Begin" here means "start thinking about it," not "start building deliverable code." For a single developer working sequentially, this distinction is irrelevant — spec 1 will be complete before any downstream spec starts. The "start after checkpoint (a)" claim is technically true but operationally misleading; it creates the illusion of parallelism that does not exist in practice.

**Classification: Compounding.** V1 identified the spec 1 monolith. Checkpoints were added as mitigation. The mitigation is weaker than presented — it does not enable meaningful parallel work.

### The CSS isolation spike is in the wrong checkpoint

The spike is bundled with the landing page in checkpoint (d) — the last checkpoint. This inverts the purpose of a spike. A spike exists to retire architectural risk *before* dependent decisions are made.

Concrete failure scenario: The spike runs after checkpoints (b) and (c) are complete. Checkpoint (c) established `globals.css` with Tailwind v4's layer ordering (`@layer base, components, utilities`), theme CSS custom properties on `:root`, and shadcn/ui styles. The spike reveals that `all: initial` resets CSS custom properties that Tailwind v4's new engine propagates through the cascade, or that `@layer playground` must be declared *before* `@layer base` in the cascade order to avoid specificity conflicts. Either finding requires modifying `globals.css` — work from checkpoint (c) needs revision.

Worse: if any downstream spec has actually started work against checkpoint (a) (as the decomposition encourages), any layout-dependent CSS could also need adjustment.

The spike should be checkpoint (b) or earlier. It informs CSS architecture decisions rather than potentially contradicting them. The current ordering means: build the CSS architecture, then check if it works with the one feature that has the tightest constraints on it. That's backwards.

**Classification: Novel.** V1 recommended adding the spike; the decomposition added it. The checkpoint ordering issue is a new concern.

### Checkpoints are planning guidance, not architectural boundaries

There is no mechanism to enforce checkpoint ordering. Spec 1 is one spec, one branch, one PR. Nothing prevents the implementer from working on the landing page before CI is stable, or jumping between checkpoints based on what's interesting or unblocked. The checkpoints are a suggested implementation sequence within a monolith.

For a single developer, this is fine — solo development naturally flows between tasks. But the decomposition presents checkpoints as if they create real sequencing discipline ("downstream specs can begin after checkpoint (a)"), which overstates their power. They are a mental roadmap, not hard gates. The decomposition should describe them accurately: "recommended implementation order within spec 1" rather than implying they create shippable sub-deliverables.

**Classification: Compounding.** Same underlying monolith issue from v1, now with checkpoints that sound more rigorous than they are.

---

## 2. Spec 3 (blog-core) Size and Failure Isolation

### Genuinely coupled vs. bundled by convention

These features form the irreducible core blog — they cannot ship independently:

- Blog index page (reverse-chronological listing)
- Individual blog post pages
- MDX rendering with Shiki syntax highlighting
- Tags and categories with filtering
- Draft/unpublished status exclusion
- Reading time (trivial Velite transform, essentially free)
- Previous/next post navigation
- Last-updated date display
- Code block styling (inseparable from Shiki integration)
- RSS/Atom feed (moved here from spec 4 per v1 review — defensibly core since it's a standard blog expectation for the tech audience)

These features are polish that could ship later without breaking the blog's core value proposition:

- **Footnotes/sidenotes** (rehype/remark plugin): A blog post without footnotes is fully readable. Footnote syntax renders as bracketed references `[^1]` — ugly but not broken. No reader will refuse to read a post because footnotes aren't rendered.
- **Copy-to-clipboard on code blocks**: Code blocks display and highlight correctly without it. This is a UX convenience, not a functional requirement.
- **Auto-generated table of contents**: Useful for long posts, but a blog post is complete and navigable without one. Many successful blogs have no auto-TOC.

Three features are polish bundled into "core" by convention. All three involve rehype/remark plugin integration — the highest-risk implementation work in the spec — and none are required for a reader to consume a blog post.

**Classification: Recurring.** V1 flagged spec 3's size. RSS was moved in (correctly). Nothing was moved out. The spec grew from ~12 to ~13 features. Severity escalates.

### Failure scenario: rehype plugin debugging blocks the entire blog

The blog's content pipeline requires multiple rehype/remark plugins working together: rehype-pretty-code (or equivalent) for Shiki integration, a rehype plugin for TOC generation from headings, remark-gfm for GitHub Flavored Markdown, and a footnote plugin (remark-footnotes or rehype-footnotes). These plugins interact in the unified pipeline, and ordering matters — a plugin that transforms HTML nodes can break a downstream plugin's assumptions about AST structure.

Known pain point: Shiki's rehype integration wraps code blocks in custom HTML structures. A footnote plugin that injects `<sup>` or `<aside>` elements may interact badly with Shiki if both attempt to transform the same AST region. The debugging involves: identifying which plugin ordering works, finding which plugin's output breaks another's input, and potentially vendoring or patching a plugin.

If this debugging session takes 2-3 days, the blog index, post pages, tags, reading time, RSS feed, prev/next navigation, and draft exclusion are all complete and working — but cannot ship because spec 3 is one deliverable. Spec 4 is blocked behind spec 3. The blog, the second-highest business priority after the professional profile, sits unreleased while a polish feature is debugged.

A partial blog (everything except footnotes/TOC/copy-to-clipboard) is fully usable. No reader will notice these features are absent. The current decomposition does not allow shipping a partial spec 3.

**Classification: Compounding.** Same finding as v1, worsened by RSS being added without anything being moved out. The risk profile of the spec increased.

### The blog split ratio is indefensible

Spec 3: ~13 features. Spec 4: ~5 features (Pagefind search, series UI, related posts, social sharing, reading progress bar).

The split was described as "core vs. enhanced" but the actual division is "everything vs. leftovers." Moving footnotes, copy-to-clipboard, and auto-generated TOC to spec 4 produces:

- **Spec 3** (~10 features): All genuinely coupled core blog functionality. Lower plugin risk — Shiki integration remains but the other rehype/remark plugins move out. Ships a fully functional, subscribable blog.
- **Spec 4** (~8 features): Discovery + polish. Pagefind search, series UI, related posts, social sharing, reading progress bar, footnotes/sidenotes, TOC, copy-to-clipboard. Coherent theme: "make the blog better after it already works."

The current 13:5 split is the most lopsided boundary in the decomposition. Rebalancing to 10:8 reduces spec 3's risk profile (fewer plugins), enables the core blog to ship sooner, and makes spec 4 a coherent "blog polish" spec rather than a grab-bag.

**Classification: Recurring.** V1 identified the lopsided split. The decomposition acknowledged it, added RSS to spec 3, and removed nothing. The ratio worsened from 12:6 to 13:5. Severity escalates.

---

## 3. Dependency Graph Completeness After Restructuring

### Checkpoint-level dependencies are invisible in the graph but harmless

The Mermaid graph shows `S1 → S2`, `S1 → S3`, etc. The real dependency map is:

| Downstream spec | Actually depends on checkpoint |
|---|---|
| S2 (professional-profile) | (c) — layouts + theme toggle + metadata |
| S3 (blog-core) | (b) + (c) — Velite pipeline + layouts |
| S5 (project-showcase) | (b) + (c) — same as S3 |
| S6 (contributions-and-resources) | (b) + (c) — same as S3 |
| S7 (slash-pages) | (b) + (c) — pages schema + layouts |
| S8 (playground) | (d) — CSS isolation spike |

For a single developer working sequentially, this imprecision is harmless. Spec 1 will be fully complete before any downstream spec begins. The graph is accurate at spec granularity, which is the only granularity that matters operationally. The imprecision only matters as evidence that "start after checkpoint (a)" is misleading (see section 1).

**Classification: Novel.** Not a risk, but supports the finding that checkpoint parallelism claims are overstated.

### `velite.config.ts` concurrent modification is still unresolved

Specs 3, 5, and 6 all add schemas to `velite.config.ts`. (Spec 2 uses the existing `pages` schema — it does not add a new one.) The decomposition resolved `src/lib/content.ts` conflicts with per-type files (`src/lib/blog.ts`, `src/lib/projects.ts`, etc.) but did not apply the same pattern to `velite.config.ts`.

For sequential development: trivial. Each spec adds its schema definition, the file grows, no conflicts.

For the "parallelizable" framing: the dependency graph shows specs 3, 5, and 6 as parallel after spec 1. If developed on parallel branches (e.g., Matthew context-switches between specs while waiting on feedback or debugging), merging any two produces a conflict in `velite.config.ts`. The conflict is trivial to resolve manually — it's additive (two different schema objects being added to the same config). But the decomposition presents parallelism without acknowledging this serialization point.

Two possible fixes, neither of which is urgent:
1. **Acknowledge it**: Add a sentence to cross-spec conventions: "`velite.config.ts` is a shared file modified by multiple specs. If developing on parallel branches, expect trivial merge conflicts in this file."
2. **Restructure**: Import schemas from per-type files (`src/schemas/blog.ts`, `src/schemas/projects.ts`) so each spec touches a different file. Cleaner but adds indirection for minimal benefit.

**Classification: Recurring.** Identified in v1, explicitly listed as unaddressed in the review context. Still unaddressed.

### Spec 4's CI modification has no rollback or failure containment

Spec 4 modifies the GitHub Actions workflow to add `next build && next start` + Pagefind crawl. The decomposition surfaces this in spec 4's scope (good) and design considerations (good). What's missing is a strategy for when this breaks.

Concrete failure scenario: The Pagefind crawl step starts `next start` on port 3000. The CI runner already has something on port 3000 (a parallel job, a cached process). The step fails. Or: `next start` serves a page with a client-side redirect loop that Pagefind follows infinitely, hanging the crawl step until CI times out at 10 minutes. Every subsequent push to main encounters the same failure. No deployments land until the CI issue is fixed.

Mitigation: introduce the Pagefind crawl step as non-blocking during initial integration (`continue-on-error: true` in GitHub Actions). Promote it to blocking after it has been verified stable for several deploys. This is a one-line CI config change that eliminates the cascading failure risk entirely.

**Classification: Novel.**

---

## 4. Open Questions — Are They the Right Ones?

### Open question 3 is already decided

Open question 3: "Should the landing page dynamically show only sections that have real content, or is a static list with placeholders acceptable?"

The decomposition already answers this in at least three places:
- Spec 1's design considerations: "Hero cards should be data-driven so sections can be added/removed without code changes."
- Spec 1's design considerations: "If a section's spec is deferred or cut, the hero card should be removable without breaking the page."
- Decisions section, item 1: "Use styled placeholder pages. They're trivial, and the landing page should be complete from spec 1. Hero cards should be data-driven so sections can be added/removed without code changes."

The answer is: data-driven hero cards with styled placeholder pages, removable without code changes. This is a decision, not an open question. It should be moved to the decisions section.

**Classification: Compounding.** V1 identified that the original four open questions were already decided. The decomposition converted those to decisions but introduced a new "open question" that is also already decided. The pattern repeats.

### Missing question: content migration strategy

The product steering doc says the site "replaces an existing WordPress.com site." Replacement implies one of:

1. **Content migration**: Existing blog posts, pages, or other content from the WordPress site are ported. This requires: WordPress XML/WXR export, HTML-to-MDX conversion, frontmatter mapping, image asset migration, and redirect rules for old URL patterns in `next.config.ts`. This affects spec 3 (blog content), spec 1 (redirects), and the implementation timeline.
2. **Clean break**: Starting fresh. Old URLs may still be indexed by search engines — either set up 301 redirects from known old paths or deliberately let them 404. A one-sentence decision closes this.
3. **Overlap period**: Both sites coexist during transition. DNS cutover happens at a specific milestone.

None of these are addressed in the decomposition, the steering documents, or the open questions. If the WordPress site has blog posts indexed by Google, launching the new site without redirects means those URLs 404 — search traffic to existing content drops to zero. If the WordPress site has no meaningful content, this is a non-issue. Either way, the decision should be documented.

The absence of any mention is the most consequential gap in the decomposition. Not because migration is necessarily complex, but because not deciding means the decision gets made implicitly (by whatever happens during implementation) rather than explicitly.

**Classification: Novel.**

### Open question 1 is a task, not a question

"Does Velite handle empty content directories gracefully?" has a factual yes/no answer obtainable in under 5 minutes: create a Velite config with a schema pointing at an empty directory, run `npx velite build`, observe whether it produces an empty array or throws. This is not a design question requiring judgment or stakeholder input. It's an implementation task.

It belongs in spec 1's scope: "Verify Velite handles empty content directories gracefully (empty array, not build error). If it requires at least one file per collection, add placeholder content files." Moving it there ensures it gets done during implementation rather than sitting as an unresolved question.

**Classification: Novel.**

---

## 5. Cross-Spec Convention Sufficiency

### UI primitives convention provides zero guidance against drift

The convention says: "Visual consistency across gallery cards (blog, projects, contributions, playground) is maintained by the single developer's judgment, not by a shared domain-specific card abstraction."

This is honest. It is also not a convention — it's an explicit abdication of convention. A convention constrains future decisions so they're consistent. This one explicitly declines to constrain anything.

Concrete failure scenario: Matthew builds spec 5's project gallery cards using shadcn Card with `rounded-lg`, `p-6`, and a `border-muted` style. Three weeks later, building spec 6's contribution cards, he uses `rounded-md`, `p-4`, and a `ring-1 ring-border` style because the smaller data density felt better. Three weeks after that, spec 3's blog cards use `rounded-xl` with `p-5` and `shadow-sm` because blog cards felt different. None are wrong individually. Together, the site has three subtly different card treatments across four gallery pages.

A minimal visual contract prevents this without over-engineering: "All gallery cards use the shadcn `Card` component with its default props. Content-specific layout inside the card varies, but the card container itself is visually consistent." One sentence, one actual constraint, zero shared abstractions.

This is not high-severity for a personal site — slightly inconsistent cards are a cosmetic issue, not a functional one. But the convention section should either provide guidance or not claim to address the concern. "Consistency by vibes" is not a convention; it's a non-answer.

**Classification: Compounding.** V1 flagged the card consistency gap. The decomposition dropped the shared abstraction (correct) but replaced it with an explicit non-constraint. The convention section grew but the guidance decreased.

### Velite schema ownership convention is sufficient but should acknowledge the serialization point

The convention says each spec adds its schema directly to `velite.config.ts`. For a single developer working sequentially, this works fine. The convention doesn't need to specify where in the file each schema goes or what the ordering pattern is — there's one developer, they'll follow whatever pattern they start.

What the convention should acknowledge: `velite.config.ts` is a shared file modified by multiple specs. If specs 3, 5, and 6 are ever developed on parallel branches, this file will conflict. The convention should note this as a serialization point, even if the resolution is "merge conflicts in this file are trivial and expected."

An alternative structure — importing schemas from per-type files so each spec touches a different file — would eliminate the issue entirely but adds indirection that isn't justified for a single-developer project.

**Classification: Recurring.** Same `velite.config.ts` gap from v1, viewed through the convention lens. Still unaddressed.

### Contact component reuse convention is likely adequate but could be tighter

Spec 2 builds contact components in `src/components/shared/`. Spec 7 reuses them on /contact. The convention says spec 7 has a "soft dependency" on spec 2.

The critical question: are the contact components self-contained or configurable?

- **Self-contained** (likely): `<ContactForm />` handles its own state, validation, and submission via `/api/contact`. `<ContactEmail />` renders the obfuscated email. `<SocialLinks />` renders the links. Spec 7's /contact page renders them in a layout. No props, no API contract needed.
- **Configurable** (unlikely but possible): Components accept callbacks or configuration props. Spec 7 needs to know the API.

Given that (a) the same developer builds both specs, (b) the contact form is a standard pattern that naturally encapsulates its own submission logic, and (c) sequential implementation means the API is known when spec 7 begins, the "soft dependency" convention is adequate.

One sentence would make it bulletproof: "Contact components should be self-contained (own state, validation, and submission logic) so consuming pages render them without configuration." This costs nothing and eliminates the edge case where someone decides `<ContactForm>` needs an `onSubmit` prop.

**Classification: Compounding.** V1 identified the gap. The decomposition added "soft dependency" but not the API expectation. Low severity but the pattern of partially addressing feedback continues.

---

## 6. INVEST Violations and Spec Independence

### Spec 8 is conditionally scoped, not independent

Spec 8's entire architectural approach — same-page rendering with `all: initial` + `isolation: isolate` + `@layer playground` — depends on the CSS isolation spike in spec 1 succeeding. The dependency is acknowledged: "site-foundation (including the CSS isolation spike from spec 1)."

What's missing is the failure path. If the spike fails, spec 8's scope is undefined. Three outcomes are possible:

1. **Iframe-only playground**: Drop same-page isolation entirely. All playground items use iframe embedding. Spec 8's scope simplifies dramatically — no CSS reset architecture, no `@layer` management, just iframe routes and a manifest system.
2. **Alternative CSS isolation**: Shadow DOM, CSS Modules alone without `all: initial`, or a different reset approach. Spec 8's scope changes but doesn't collapse.
3. **Playground cut**: If no isolation approach is viable at acceptable complexity, the playground feature is cut entirely. Spec 8 is removed.

The decomposition does not document any of these paths. A spike without a documented failure path is not a spike — it's an experiment with undefined consequences. One sentence would fix this: "If the CSS isolation spike fails, the playground defaults to iframe-only isolation (all items set `iframeIsolated: true` in the manifest) and spec 8's scope is reduced to: manifest system, dynamic imports, iframe embed routes, gallery page."

This is an INVEST violation — the "I" (Independent) is conditional on a spec 1 outcome. It's an *acceptable* violation because the spike is designed to resolve the condition early. But the failure path should still be documented.

**Classification: Compounding.** V1 identified the late-discovery risk. The spike was added (good). The spike failure path was not documented.

### Spec 4 is not a coherent deliverable — it's a feature dump

With RSS moved to spec 3, spec 4 contains:

1. **Pagefind search**: CI pipeline modification, WASM loader integration, build-time indexing, search UI component.
2. **Series UI**: Frontmatter-based grouping, series navigation banner/sidebar.
3. **Related posts**: Tag/category overlap scoring algorithm, related posts component.
4. **Social sharing**: External link generation for Twitter/LinkedIn/etc., share buttons component.
5. **Reading progress bar**: Scroll event handler, visual progress indicator.

These five features share no implementation code, no components, no data model, and no user journey. A reader who uses search doesn't need a progress bar. A reader navigating a series doesn't need social sharing. The only connection is "blog stuff that didn't fit in spec 3."

This violates INVEST's "V" (Valuable as a coherent unit). Spec 4 is not a product increment with a theme — it is a collection of independently-valuable features that happen to be blog-adjacent. Any single feature could ship independently.

For a single developer, this is pragmatically acceptable — the spec functions as a "blog polish" checklist. The risk is that one feature proves unexpectedly complex (Pagefind CI integration is the most likely candidate) and blocks four unrelated features. If the Pagefind crawl step has the CI issues described in section 3, series UI, related posts, social sharing, and the progress bar all wait for no reason.

That said, the overhead of five separate specs (five scope descriptions, five PRs) versus one is non-trivial even for a solo developer. The bundling is defensible as pragmatism. The decomposition should acknowledge it: "Spec 4 bundles unrelated blog enhancement features for pragmatic reasons. If any feature proves unexpectedly complex, consider splitting it out."

**Classification: Novel.** V1 noted the grab-bag nature but focused on RSS misplacement. With RSS moved, the incoherence is more visible.

### Spec 6's bundling is defensible but the stated justification is wrong

The decomposition says contributions and resources are bundled because "both are small, YAML-driven, single-page features. The overhead of separate specs exceeds the coupling cost."

The overhead claim doesn't hold. For a single developer, a "spec" is a markdown file describing scope. There is no approval committee, no separate CI pipeline per spec, no sprint planning ceremony. The overhead of two specs over one is: writing two paragraphs instead of one.

The coupling cost: if contribution card layout design takes longer than expected (e.g., deciding how to compactly present repo name + description + PR link + commit link), the resources page — which is a trivial YAML-to-grouped-list rendering — is blocked.

However, the bundling is still defensible for a different reason: both features are genuinely trivial. A contribution card is: repo name, description, PR link. A resource entry is: title, URL, description, category. Neither has subpages, complex components, or architectural risk. The realistic time for both combined is a day or less. The probability of one feature blocking the other for meaningful time is near-zero.

The correct justification: "Both are trivially small. Neither has enough complexity to block the other." The stated justification about spec overhead is wrong — the actual justification is about risk, not overhead.

**Classification: Novel.**

---

## Top 5 Risks or Gaps

### 1. Spec 3 is a 13-feature monolith with the highest-risk plugin work bundled with core functionality

**Affected specs**: 3, 4.
**Failure scenario**: Footnote/sidenote rehype plugin conflicts with Shiki's code block transformation in the unified pipeline. Debugging the plugin interaction takes 3 days — determining ordering, finding which plugin's AST output breaks another's input, potentially vendoring a fix. During this time, the blog index, post pages, tags, reading time, RSS feed, prev/next navigation, and draft exclusion are all complete and deployed to a Vercel preview — but cannot merge to main and ship because spec 3 is one deliverable. Spec 4 (search, series, etc.) is blocked. The blog — the second-highest business priority — sits unreleased while a polish feature is debugged.
**Severity**: High. This is the most likely multi-day delay in the project. The rehype/remark plugin ecosystem is well-known for unexpected interactions.
**Classification**: Recurring — severity escalating. V1 flagged this. RSS was added, nothing removed. The spec grew.

### 2. Content migration strategy is completely unaddressed

**Affected specs**: 1, 3, 5, potentially all.
**Failure scenario**: Spec 1 deploys the new site to matthew-field.ca. The old WordPress.com site had blog posts indexed by Google. Those URLs now 404. Search traffic to existing content drops to zero. Months later, Matthew decides he wants to preserve those posts — now requiring retroactive WordPress export, HTML-to-MDX conversion, frontmatter mapping, image migration, and redirect rules. Work that would have been a straightforward spec becomes a disruptive retrofit across an already-built site.
**Severity**: High if the WordPress site has meaningful content. Zero if starting fresh. The decomposition addresses neither case, which is the actual problem — not the answer, but the absence of the question.
**Classification**: Novel.

### 3. CSS isolation spike is positioned after the CSS architecture it should inform

**Affected specs**: 1, 8.
**Failure scenario**: Spec 1 completes checkpoints (a) through (c). CSS architecture is established: `globals.css` with Tailwind v4's `@layer base, components, utilities`, theme CSS custom properties on `:root`, shadcn/ui component styles. Checkpoint (d) runs the spike. The spike reveals that `all: initial` resets CSS custom properties in a way that conflicts with Tailwind v4's cascade model, or that `@layer playground` must be declared in a specific position relative to Tailwind's layers. Fixing this requires modifying `globals.css` and potentially the Tailwind configuration — revising checkpoint (c)'s work. If any downstream spec has started against the layout (unlikely but claimed possible), its work may also need adjustment.
**Severity**: Medium-high. The spike's entire purpose is to retire risk before dependent decisions are made. Placing it last within spec 1 partially defeats that purpose.
**Classification**: Novel.

### 4. `velite.config.ts` concurrent modification remains unaddressed across two reviews

**Affected specs**: 3, 5, 6.
**Failure scenario**: Matthew starts spec 5 (projects) on a feature branch. While waiting on design feedback for project card layout, he context-switches to spec 6 (contributions/resources) on another branch. Both branches add schema definitions to `velite.config.ts`. Merging the second branch produces a conflict. The conflict is trivial — two additive schema blocks in the same config object — but the decomposition presents these specs as parallelizable without acknowledging this serialization point.
**Severity**: Low. The conflict is easy to resolve. But it contradicts the parallel-ready framing and has persisted unaddressed through two reviews.
**Classification**: Recurring. Identified in v1, explicitly listed in v1's findings as unaddressed, and still unaddressed.

### 5. Spec 4's CI modification has no failure containment strategy

**Affected specs**: 4, and every spec deployed after it.
**Failure scenario**: Spec 4 adds `next build && next start` + Pagefind crawl to the GitHub Actions workflow. The `next start` server doesn't shut down cleanly after the crawl (common with Next.js's dev/start servers in CI), leaving a zombie process that holds the port. Or the Pagefind crawl encounters a page with a client-side redirect loop and hangs until CI timeout. The step fails. Every subsequent push to main encounters the same failure. No deployments land until someone diagnoses and fixes the CI issue.
**Severity**: Medium. A single developer can fix this quickly, but the blast radius is total — zero deployments during the fix window. Other completed specs sitting on branches can't merge.
**Classification**: Novel.

---

## Top 3 Conclusions to Challenge or Reverse

### 1. The blog split should be rebalanced — move footnotes, TOC, and copy-to-clipboard from spec 3 to spec 4

**Current decision**: Spec 3 has ~13 features including footnotes/sidenotes, auto-generated TOC, and copy-to-clipboard on code blocks. Spec 4 has ~5 features.
**Why it's wrong**: The three features are polish, not core. A blog post renders correctly without footnotes (footnote syntax appears as `[^1]` — ugly but readable). A blog is fully usable without auto-generated TOC. Code blocks work without a copy button. More importantly, these three features involve rehype/remark plugin integration — the highest-risk implementation work in spec 3. Bundling the highest-risk work with core blog functionality means a plugin debugging session blocks the entire blog launch, including the RSS feed, the index page, tag filtering, and everything else that's already working.
**Recommendation**: Move footnotes/sidenotes, auto-generated TOC, and copy-to-clipboard to spec 4. Spec 3 becomes ~10 features (all genuinely coupled, lower plugin risk, ships a fully functional blog). Spec 4 becomes ~8 features (discovery + polish, coherent "blog enhancement" theme). The core blog ships sooner with lower risk.

### 2. Open question 3 should be a decision, and content migration should be an open question

**Current decision**: Three open questions: Velite empty collections, incremental deployment, landing page behavior when sections are deferred.
**Why it's wrong**: Open question 3 is already decided — the decomposition's own text specifies data-driven hero cards removable without code changes, with styled placeholder pages. Open question 1 is a verifiable implementation task, not a design question — "run Velite with an empty directory and see what happens" is a 5-minute task, not a question to ponder. Meanwhile, the most consequential unresolved question — what happens to existing WordPress.com content — appears nowhere.
**Recommendation**: Move open question 3 to decisions. Move open question 1 to spec 1's implementation scope as a verification task. Add content migration as an open question: "Content migration: does existing WordPress.com content (blog posts, pages) need to be migrated? If yes, which spec handles export/conversion/redirects? If no, document the 'starting fresh' decision and evaluate whether old URL redirects are needed."

### 3. The CSS isolation spike should be checkpoint (b), not checkpoint (d)

**Current decision**: Spec 1 checkpoints are (a) scaffolding + CI/CD, (b) Velite pipeline + pages schema, (c) layouts + theme toggle + metadata convention, (d) landing page + hero cards + CSS isolation spike.
**Why it's wrong**: The spike validates assumptions that the CSS architecture depends on. Checkpoint (c) establishes the CSS architecture (global styles, Tailwind v4 layers, theme variables). Checkpoint (d) tests whether that architecture is compatible with the playground's isolation requirements. If it isn't, checkpoint (c) needs rework. Running the validation after the dependent work inverts the risk-retirement timeline. A spike should inform decisions, not discover that decisions were wrong.
**Recommendation**: Reorder to (a) scaffolding + CI/CD, (b) CSS isolation spike + Velite pipeline + pages schema, (c) layouts + theme toggle + metadata convention, (d) landing page + hero cards. The spike runs before the CSS architecture is finalized, so its findings inform checkpoint (c) rather than potentially invalidating it. The spike needs minimal prerequisites — just the Tailwind v4 installation from checkpoint (a) and an empty route group.

---

## What's Missing

### 1. Content migration decision

The site replaces a WordPress.com site. The decomposition does not address whether existing content is migrated, whether URL redirects from old paths are needed, or whether the old site is deliberately abandoned. This should be a documented decision before implementation begins — even if the answer is "starting fresh, no migration needed." If migration is needed, it affects spec 3 (blog content to port), spec 1 (redirect rules in `next.config.ts`), and potentially the implementation timeline. If starting fresh, the decision should note whether old URLs will be redirected or allowed to 404.

### 2. CSS isolation spike failure path

The spike has no documented failure mode. If `all: initial` + `@layer playground` does not work acceptably in production builds (Webpack), what is the fallback? Document one sentence: "If the CSS isolation spike fails, the playground defaults to iframe-only isolation. Spec 8's scope reduces to: manifest system, dynamic imports, iframe embed routes, and gallery page. Same-page rendering is cut." Without this, a spike failure creates an undefined state for spec 8's entire scope.

### 3. CI modification rollback strategy for spec 4

Spec 4 modifies the CI pipeline with `next build && next start` + Pagefind crawl. There is no strategy for what happens if this breaks the pipeline. Document in spec 4's design considerations: "Introduce the Pagefind crawl as a non-blocking CI step (`continue-on-error: true`) initially. Promote to blocking after the step has been verified stable for 3+ deploys." This eliminates the cascading deployment failure risk described in the findings.

### 4. Blog spec rebalancing

Footnotes/sidenotes, auto-generated TOC, and copy-to-clipboard should be moved from spec 3 to spec 4. This is the single most impactful structural improvement available. It reduces spec 3's risk profile (fewer rehype/remark plugins to integrate), balances the spec sizes (10:8 instead of 13:5), enables the core blog to ship without waiting on plugin debugging, and makes spec 4 a coherent "blog polish" spec rather than a grab-bag of unrelated features.
