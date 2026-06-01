# Adversarial Review: slash-pages requirements (v1)

You are a senior staff engineer who has shipped many content-driven static sites on Next.js App Router + Velite, and a reviewer whose instinct is to catch half-baked requirements before they cost an implementer hours. Your job is **not** to validate this document. Your job is to **tear it apart** — find every gap, contradiction, untestable acceptance criterion, hidden assumption, and scope hole the author waved past. Be specific and concrete: cite failure scenarios, not abstract risks. If something is genuinely fine, say so in one line and move on.

Read the target document in full before starting:
`/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/slash-pages/requirements.md`

Ground your attack in the project's actual constraints by reading:
- `/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/product.md` (esp. §8 Slash Pages, §10 Dark/Light Mode)
- `/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/structure.md` (esp. Content File Organization, Module Boundaries)
- `/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/tech.md`
- `/home/mcf/repo/matthew-field.ca/.spec-workflow/spec-decomposition/decomposition.md` (spec #7 entry and Cross-Spec Conventions)

**Verify the document's claims against live code — do not take its "Current state" section on faith.** Specifically inspect:
- `velite.config.ts` — the `pages` collection (claimed at lines 47-58) and the `profile` collection's git `updatedAt` transform (claimed at lines 74-87). Confirm the schema fields, the slug transform, and whether the `pages` collection currently has any `.transform` that an additive change must compose with.
- `src/app/(site)/about/page.tsx` — the `getAboutPage()` guard and the `robots: { index: false }` claim.
- `src/app/(site)/{now,colophon,sitemap,slashes}/page.tsx` — confirm they are placeholders.
- `src/app/sitemap.ts` — the hardcoded `routes` array and the dynamic-entry logic the spec promises to "preserve unchanged."
- `src/config/site.ts` — `siteConfig` shape, `navItems`, `links`; confirm no existing page registry.
- `src/components/layout/site-shell.tsx` (and any footer component it renders) — **does a footer even exist today, and does it have a link region?** Req 10 assumes one.
- `src/lib/format-date.ts`, `src/lib/blog.ts` (`getVisiblePublishedPosts`), `src/lib/projects.ts` (`getPublishedProjects`) — confirm the helper names and signatures the spec cites.
- `vercel.json` — the `git fetch --deepen` build command Req 4 depends on.

## Analysis dimensions

Attack at least these, naming actual requirement numbers and claims:

### 1. The git-`updatedAt` decision (Req 2, Req 4)
- Stress-test reusing the `profile` collection's `execFileSync("git", …)` transform on the `pages` collection. `profile` is `single: true` with one file; `pages` is `pattern: "pages/*.mdx"` (many files). Does running a synchronous `git log` per page at build time scale, and does it interact badly with Turbopack dev rebuilds or local uncommitted/new files? A brand-new `now.mdx` not yet committed returns an empty git log → the spec says *fail the build*. Walk the scenario where the author creates `now.mdx`, runs `pnpm dev`, and the page throws because there's no commit yet. Is that acceptable DX? The spec never addresses the uncommitted-file case.
- Challenge the claim (Req 4.2) that adding a `.transform` is "additive and backward-compatible" when the `pages` collection **already has a `.transform`** (the slug-prefix strip). You cannot attach two `.transform` calls naively and keep both behaviours — verify how Velite composes transforms and whether the existing slug logic must be merged into the new one. The spec hand-waves this.
- Challenge whether `updatedAt` from git commit date is even the *right* semantic for `/now` — a typo-fix commit bumps the date without the focus actually changing. Is "last committed" a lie to the reader?

### 2. Scope boundary: is `/about` real work or already done? (Req 1)
- The spec admits `/about` is "already wired." Pin down exactly what this spec *adds*: flipping one `robots` flag and writing prose. Challenge whether Req 1 is mostly a no-op dressed up as a requirement, and whether "real seed content" is testable or just editorial.
- Challenge the in/out-of-scope line on prose authoring. The spec says it owns "the files' existence" but not "the prose," yet Req 1.3 requires "real seed content." Where is the line, and how does a reviewer verify it's met? Flag any untestable acceptance criterion.

### 3. The registry / single-source-of-truth (Req 5, Req 8) — over-engineering risk
- The user's standing instruction is "DO NOT over-engineer; keep solutions simple, direct, boring." Challenge whether a new `src/config/pages.ts` registry + refactoring `sitemap.ts` to consume it + three parity tests is proportionate to building five mostly-static pages. Argue the simpler alternative (hand-write `/slashes` and `/sitemap`, leave `sitemap.ts` alone) and force the document to justify the registry's cost.
- Stress-test Req 5.2's registry contents vs Req 8.3's promise. The registry lists `/contributions` and `/resources` as static entries, but `sitemap.ts` currently emits those as *dynamic* entries with `lastModified` from collection dates (`contributionsEntry`/`resourcesEntry`). If the static set now includes them, do they get emitted twice, or does "preserve dynamic unchanged" collide with "derive static from registry"? Find the double-emission / lastModified-regression bug.
- Req 5.5 / Req 11.1 promise a test that "every in-scope route is present in the registry" and "every registry href maps to an existing route." How is route existence asserted in a unit test with no running server — filesystem globbing of `src/app/(site)/*/page.tsx`? The spec never says, making the test unimplementable as written.

### 4. HTML `/sitemap` ↔ XML `sitemap.ts` parity (Req 6.4, Req 11.2)
- Enumerate what's actually in the XML sitemap (posts, projects, tags, categories, contributions, resources, static routes) vs what Req 6 puts in the HTML sitemap. The carve-out is hand-wavy: is it *only* tags/categories that differ, or also `/playground` items, draft handling, `hiddenFromLists` posts, fixture-slug posts (`getVisiblePublishedPosts` filters these — does the HTML sitemap use the same filter)? A naive parity test will be red on day one.
- Challenge indexability coherence (Req 8.2 vs Req 6.1/11.2): Req 8.2 excludes `index: false` pages from the XML sitemap, but Req 6.1 lists *all* registry pages on the HTML sitemap regardless of `index`. The two sitemaps now deliberately diverge on `index: false` pages — yet Req 11.2 asserts parity. Direct contradiction. Find it and state which requirement must give.

### 5. Indexability flip — unjustified SEO decision (Req 9.2, Decision #3)
- The spec flips `/sitemap` and `/slashes` to `index: true`. Challenge this: thin, link-only pages are commonly `noindex`'d to avoid diluting crawl budget / duplicate-content signals. The "they're in the XML sitemap so they should be indexable" reasoning is circular — the spec controls both. Force a real justification or a reversal.
- `/now` is flipped to indexable but is frequently-changing and often sparse. Is indexing a near-empty `/now` good for the professional brand a recruiter sees?

### 6. Missing requirements / unstated assumptions
- **Footer existence**: Req 10 assumes a footer with a link region in `SiteShell`. If it doesn't exist (or is a bare copyright line), Req 10 is secretly a "build a footer nav" requirement smuggled in without acceptance criteria for layout, mobile behaviour, or which links belong there. Verify and call it out.
- **Frontmatter authoring contract**: the sibling `contributions-and-resources` spec ships a `docs/*-authoring.md`. This spec mentions no authoring doc for `/about`, `/now`, `/colophon` frontmatter — inconsistent with project convention. Flag it.
- **`/sitemap` route-name collision**: there is both `src/app/sitemap.ts` (XML at `/sitemap.xml`) and `src/app/(site)/sitemap/page.tsx` (HTML at `/sitemap`). Confirm these don't collide in Next.js routing and that the spec's "XML `sitemap.ts`" vs "HTML `/sitemap`" naming isn't papering over a real conflict.
- **404 / unknown behaviour**, **empty-collection rendering on `/sitemap`**, and any **theme-toggle assumption** on these routes — check each is addressed or flag the gap.

## Prior review context
This is the first review (v1). All findings are Novel. Classify each finding's severity (Critical / Major / Minor) and, where you assert the document is wrong about the codebase, cite the file and line you checked.

## Closing deliverables
- **Top 5 risks/gaps**, ranked, each with a concrete failure scenario.
- **Top 3 conclusions to challenge or reverse**, with specific reasoning (candidates: the git-`updatedAt` choice, the registry-as-single-source-of-truth, the indexability flip).
- **What's missing** — the work that should be added to or cut from this document before it goes to design.

Write your complete analysis to:
`/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/slash-pages/reviews/adversarial-analysis-requirements.md`
