# Adversarial Review Prompt — Spec Decomposition (Round 3)

You are a senior software architect with 15+ years of experience shipping personal and commercial web projects through multi-spec delivery pipelines. You have deep expertise in Next.js, static site generation, content pipelines, and solo-developer workflow optimization. Your job is to tear apart this spec decomposition and find every gap, false assumption, and hidden risk. Do not validate. Do not praise. Attack every weak point.

Read the following files before beginning your analysis:

1. **Target document**: `/home/mcf/repo/matthew-field.ca/.spec-workflow/spec-decomposition/decomposition.md`
2. **Product steering**: `/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/product.md`
3. **Tech steering**: `/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/tech.md`
4. **Structure steering**: `/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/structure.md`

---

## Prior Review Context

Two prior adversarial reviews have been conducted. The decomposition has been highly responsive — essentially every finding from v1 and v2 was addressed. Key changes already made:

**Structural improvements (do not re-raise these):**
- CSS isolation spike reordered to checkpoint (b), before the CSS architecture is finalized
- Spike failure path documented (iframe-only fallback)
- Blog split rebalanced from 13:5 to ~10:8 (footnotes, TOC, copy-to-clipboard moved to spec 4)
- Content migration added as open question 2
- velite.config.ts concurrent modification acknowledged in cross-spec conventions
- Pagefind CI introduced as non-blocking (`continue-on-error: true`) with promotion path
- Contact components specified as self-contained (own state, validation, submission)
- UI primitives convention strengthened (shadcn Card with default container props)
- Checkpoints honestly framed as "suggested sequence, not hard gates"
- Velite empty directory handling moved to spec 1 scope as verification task

**What persists and should be examined with fresh eyes:**
- Spec 1 is still the largest spec by far — checkpoints mitigate but don't eliminate monolith risk
- Spec 4 now contains the highest-risk implementation work (rehype/remark plugins for TOC, footnotes, copy-to-clipboard) that was moved from spec 3 — the risk transferred, it didn't disappear
- The decomposition operates under implicit assumptions about testing, performance validation, and cross-spec integration that are never stated

**Classification requirement:** For each finding, classify it as one of:
- **Novel**: Not identified in any prior review.
- **Compounding**: Builds on or deepens a prior finding.
- **Recurring**: Same issue identified before but not yet resolved — severity should escalate.

Do not re-discover findings that have already been addressed. Focus on novel issues, risk transfer consequences, and gaps that become visible only after prior issues were fixed.

---

## 1. Risk Transfer to Spec 4 — Did the Rebalancing Create New Problems?

The blog rebalancing moved footnotes/sidenotes, auto-generated TOC, and copy-to-clipboard from spec 3 to spec 4. This was the right call for spec 3's risk profile. Now stress-test what happened to spec 4:

- Spec 4 now has 8 features spanning three distinct implementation domains: CI pipeline modification (Pagefind), rehype/remark plugin integration (TOC, footnotes), and UI components (series, related posts, social sharing, progress bar, copy-to-clipboard). Evaluate whether spec 4's scope is coherent enough to ship as one deliverable, or whether it's become a higher-risk grab-bag than before the rebalancing.
- Assess whether the rehype/remark plugin features (TOC, footnotes) have any dependency on spec 3's MDX pipeline configuration that isn't captured. Spec 3 sets up Shiki syntax highlighting via rehype-pretty-code. Spec 4 adds more rehype/remark plugins to the same unified pipeline. Challenge whether spec 4 can modify the plugin pipeline without risking regression in spec 3's already-shipped syntax highlighting.
- The Pagefind CI modification and the rehype plugin work are completely unrelated. If Pagefind CI debugging blocks the spec, six unrelated features wait. Evaluate whether the decomposition's acknowledgment ("consider splitting it out") is sufficient mitigation or just a deferred decision that will be forgotten under implementation pressure.
- Evaluate whether spec 4's end-to-end verification criteria are sufficient to catch plugin interaction failures — specifically, whether "confirm TOC generates from headings, footnotes render correctly" catches the case where footnotes work in isolation but break Shiki's code block rendering when both plugins are active in the same post.

## 2. Implicit Assumptions and Unstated Decisions

The decomposition has matured through two review rounds. Many explicit decisions are well-documented. Now find the implicit ones — things the decomposition assumes without stating, which could cause problems during implementation:

- Challenge the assumption that Velite's MDX compilation and Shiki's rehype integration will work together without configuration friction. The tech steering doc specifies Shiki for syntax highlighting and Velite for content processing. Velite compiles MDX internally using its own unified pipeline. How does Shiki's rehype plugin get injected into Velite's pipeline? Is this a Velite configuration option, or does it require forking Velite's MDX compilation? If the latter, it's a significant architectural risk that the decomposition treats as trivial.
- The decomposition assumes `next-themes` and the playground's `all: initial` CSS reset are compatible. `next-themes` typically works by setting a `data-theme` or `class` attribute on `<html>` or `<body>`, which propagates via CSS custom properties or cascade. `all: initial` resets inherited properties. Evaluate whether the playground's CSS reset could interfere with `next-themes`'s mechanism — particularly if a playground item is rendered same-page (not iframe) and the theme toggle is used while viewing it.
- Evaluate whether the decomposition assumes a specific Tailwind CSS v4 feature set that may not be stable. Tailwind v4 is a major rewrite with a new engine, new configuration model (`@config` directive, CSS-first config), and new `@layer` behavior. The decomposition specifies `@layer playground` alongside Tailwind's layers. Verify whether the decomposition accounts for the fact that Tailwind v4's layer model differs from v3's — specifically, whether custom `@layer` declarations interact correctly with Tailwind's implicit layer ordering.
- The structure steering doc specifies `#site/content` as the import alias for Velite output (`.velite/`). The decomposition says Velite must run before type-checking. Challenge whether this creates a chicken-and-egg problem in CI: the GitHub Actions workflow runs `type-check` before `build`, but `.velite/` doesn't exist until build time. How does type-checking pass if the content types don't exist yet? Is there a `prebuild` or `postinstall` script that generates Velite types? This is an implementation detail that could block the very first CI run in spec 1.

## 3. End-to-End Verification Gaps

Each spec lists "end-to-end verification" criteria. Stress-test whether these criteria would actually catch the failure modes that matter:

- Spec 1's verification says "verify the playground route group renders a styled test div without inheriting site styles in both dev and prod builds." Challenge whether this is sufficient. A test div with a background color proves CSS property isolation. It does not prove that `all: initial` doesn't break CSS custom properties, CSS variables used by shadcn/ui, or Tailwind's utility classes when a playground item tries to use `@/components/ui/` primitives (which the structure doc explicitly allows). The spike should verify that a shadcn Button renders correctly inside the playground reset — not just a plain div.
- Spec 2's verification says "submit the contact form, verify email delivery via Resend." In CI, there is no Resend API key (or there shouldn't be — secrets in CI for a contact form test is a security/cost concern). How does the E2E contact form test work? The tech steering doc mentions "Playwright CI test submits the contact form and verifies a 200 response." A 200 response with a mocked or missing Resend key is not the same as verified email delivery. Evaluate whether the verification criteria conflate local manual testing with automated CI testing.
- Spec 4's verification says "Build the site, verify Pagefind index is generated, search for a known post and find it." This tests the happy path. It does not test: Pagefind indexing a site with zero blog posts (spec 4 could be implemented before any real blog content exists), Pagefind's search UI rendering in both light and dark themes, or Pagefind's WASM loader working behind the site's CSP headers (`script-src 'self' 'unsafe-inline'` — does Pagefind's WASM `eval` or `WebAssembly.instantiate` require `'wasm-unsafe-eval'`?).
- No spec's verification criteria include accessibility testing. The tech steering doc targets WCAG 2.1 AA. The product principles list accessibility. But no spec says "verify keyboard navigation works," "verify color contrast in both themes," or "run an accessibility audit." Evaluate whether accessibility is a cross-cutting concern that should be addressed in cross-spec conventions rather than per-spec verification.
- No spec's verification criteria include performance testing. The tech steering doc targets 90+ Lighthouse. But no spec says "run Lighthouse and verify score." Evaluate whether performance is being deferred to "we'll check later" without a specific "later."

## 4. The Two Remaining Open Questions — Are They Well-Framed?

Only two open questions remain after two rounds of refinement. Evaluate their quality:

- **Open question 1 (incremental deployment comfort)**: The question asks whether placeholder pages visible to the public are acceptable. Challenge the framing: this isn't a yes/no question — it's a spectrum. The real decision is when to point the custom domain. Options include: (a) point domain immediately at spec 1 deploy, (b) point domain after spec 2 (professional profile — the primary business value), (c) point domain after all content specs are complete, (d) use Vercel's generated URL until ready. The open question should present these options and their tradeoffs, not ask a vague "is this acceptable?"
- **Open question 2 (content migration)**: Evaluate whether this question provides enough context for a decision. Does the decomposition need to specify what content exists on the current WordPress site? Without knowing whether there are 5 blog posts or 500, 0 images or 200, the migration question can't be answered. The question should either link to a content inventory or explicitly state that one needs to be done before deciding.

## 5. Cross-Spec Integration Points That Could Break Silently

Prior reviews focused on individual spec quality and cross-spec conventions. Now examine the seams — places where separately-built specs must integrate and could fail silently:

- **Sitemap completeness**: Spec 1 builds the XML sitemap (`sitemap.ts`). Spec 7 builds the HTML sitemap page. Both must enumerate all routes. As new specs add routes (spec 2 adds /profile, spec 3 adds /blog and /blog/[slug], etc.), both sitemaps must pick up the new routes automatically. Challenge whether this is guaranteed by the architecture or requires manual updates. If `sitemap.ts` uses `generateSitemaps()` with hardcoded paths rather than dynamic route discovery, every new spec must remember to update it. The decomposition doesn't specify the sitemap generation strategy.
- **Navigation consistency**: The site header/nav is built in spec 1. It links to sections that don't exist yet (placeholder pages). As each spec is implemented, the nav links become real. But the nav itself is built once in spec 1. If spec 5 decides to rename /projects to /work, or spec 3 adds /blog/tags as a top-level nav item, the nav must be updated. Challenge whether the nav is data-driven (configuration-based, easy to modify) or hardcoded (requires editing the layout component). The decomposition specifies data-driven hero cards but says nothing about data-driven navigation.
- **Theme consistency across specs**: Each spec is built independently. The dark/light theme toggle is built in spec 1. Each downstream spec must ensure its components look correct in both themes. Challenge whether there's any mechanism to prevent a spec from shipping components that look fine in light mode but have invisible text or broken contrast in dark mode. The cross-spec conventions don't mention theme testing.
- **RSS feed scope expansion**: Spec 3 builds the RSS feed for blog posts only. The product steering doc doesn't mention RSS for projects or contributions. But if Matthew later wants to add projects to the feed, the feed route in spec 3 needs modification. Challenge whether the feed route's architecture is extensible or hardcoded to blog posts. This is a minor point but illustrates whether specs are built for their own scope or for reasonable future extension.
- **Pagefind indexing scope**: Spec 4's Pagefind crawls the built site. It will index everything — blog posts, project pages, the professional profile, slash pages, even placeholder pages if they still exist. Challenge whether Pagefind's default indexing behavior is desirable. Should the professional profile be searchable alongside blog posts? Should placeholder pages appear in search results? The decomposition doesn't specify Pagefind's indexing scope or exclusion rules (`data-pagefind-ignore`).

## 6. Spec 1's Internal Complexity After Two Rounds of Additions

Spec 1 has absorbed additions across two review rounds: the CSS isolation spike (v1), the metadata/SEO convention (v1), Velite empty directory verification (v2), and the spike was reordered within checkpoints (v2). Evaluate its current state:

- Enumerate the distinct deliverables now in spec 1. Count them. Compare to any other spec. Spec 1 was already the largest — has it grown to the point where its size is itself a risk, independent of the checkpoint mitigation?
- The recommended implementation order is (a) scaffolding + CI/CD, (b) CSS isolation spike + Velite pipeline + pages schema, (c) layouts + theme toggle + metadata convention, (d) landing page + hero cards. Checkpoint (b) now combines an architectural spike (CSS isolation) with infrastructure work (Velite pipeline). These are unrelated — a spike failure doesn't affect Velite, and Velite issues don't affect the spike. Challenge whether combining them in one checkpoint obscures their independence and makes checkpoint (b) itself a mini-monolith.
- Evaluate whether the CSS isolation spike's scope is well-defined enough to be time-boxed. The decomposition says "time-boxed" but doesn't specify the time box. A spike without a time limit is just "try it and see." What happens after 2 days of debugging `all: initial` interactions with Tailwind v4's new engine? The failure path says "default to iframe-only" but the trigger for declaring failure is unspecified.

---

## Deliverables

Conclude your analysis with:

### Top 5 Risks or Gaps
For each: name the risk, identify affected specs, describe a concrete failure scenario, assign severity (high/medium/low), and classify as novel, compounding, or recurring.

### Top 3 Conclusions to Challenge or Reverse
For each: state the current decision, explain why it may be wrong with specific reasoning, and provide a concrete recommendation.

### What's Missing
Work that should be done before acting on this decomposition — things that are absent, not things that are wrong.

Be specific and concrete. Cite failure scenarios, not abstract risks. If something is actually fine, say so briefly and move on.

---

Write your analysis to: `/home/mcf/repo/matthew-field.ca/.spec-workflow/spec-decomposition/reviews/adversarial-analysis-decomposition-r3.md`
