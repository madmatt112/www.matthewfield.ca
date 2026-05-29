# Adversarial Review: contributions-and-resources requirements (v1)

You are a senior staff engineer with deep experience shipping content-driven static sites in Next.js + Velite, and a reviewer's instinct sharpened by a decade of catching half-baked requirements before they reach implementation. Your job is **not** to validate this document. Your job is to **tear it apart**, find every gap, every contradiction, every untestable acceptance criterion, every scope hole the author waved past, and every place where "obvious to the author" is going to cost a future implementer hours.

Read the target document in full before starting:
`/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/contributions-and-resources/requirements.md`

Read these steering docs to ground your attack in the project's actual constraints:
- `/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/product.md`
- `/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/tech.md`
- `/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/structure.md`
- `/home/mcf/repo/matthew-field.ca/.spec-workflow/spec-decomposition/decomposition.md`

Cross-check against the already-shipped sibling specs and live code for tone, rigor, and convention compliance:
- `/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/project-showcase/requirements.md`
- `/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/blog-core/requirements.md`
- `/home/mcf/repo/matthew-field.ca/velite.config.ts`
- `/home/mcf/repo/matthew-field.ca/src/lib/projects.ts`
- `/home/mcf/repo/matthew-field.ca/src/lib/blog.ts`

The document covers two YAML-driven pages — `/contributions` and `/resources` — plus their Velite collections, helpers, sitemap wiring, and editorial workflow. Ten numbered requirements, sub-requirements with EARS-style acceptance criteria.

## Attack Dimensions

### 1. Velite + YAML collection mechanics (Reqs 1, 4, 7)

- Challenge the claim that Velite's `defineCollection` natively supports `pattern: "contributions.yaml"` (a single, non-MDX file at the content root) **with a top-level array as the entry shape**. Velite's "single: true" is for one object — but the document is silent on whether `single: false` plus a non-glob single-file pattern is even a supported configuration. Verify by reading `velite.config.ts` (the `profile` collection uses `single: true` for one object — there is no precedent for a top-level array load). Surface the gap.
- The document references `s.yaml()` only in the introduction prose and **never specifies the schema-level loader mechanism in any acceptance criterion**. Velite's documented primitives are `s.string()`, `s.array()`, `s.object()`, `s.mdx()`, `s.image()`, `s.path()`, etc. There is no public `s.yaml()` primitive. If the actual mechanism is something else (e.g. Velite's `loaders` config picking up the `.yaml` extension and then a regular `s.array(s.object(...))` schema validating the parsed structure), the schema requirements will fail to translate to a working config. Call this out concretely.
- Challenge Req 1.6 / Req 4.6: "WHEN `content/contributions.yaml` does NOT exist OR exists with `[]` THEN Velite SHALL succeed." Velite's globbing semantics on a missing single-file pattern have not been verified. Is the build going to succeed silently or fail with "no files matched"? The doc asserts a behavior without citing where it's verified.
- Req 7.4 ("`#site/content` chokepoint") talks about extending an existing eslint rule but ends with "verify in design." This is a requirement that defers the actual contract to a later phase. Requirements should state the contract, not punt.
- Req 1.2 says `links` min 1, max 6; Req 3 doesn't restate the cap. A contradiction risk if the design phase only reads Req 3.

### 2. Closed enums vs. scaling reality (Reqs 3.1, 4.2)

- The `contributions` link-kind enum is `pr | commit | issue | release | discussion`. Challenge each omission: where does a `blog-post-writeup` go? A `talk-recording` or `slide-deck`? A `forum-thread` from a non-GitHub forge (GitLab MR, Codeberg, Sourcehut patch)? The author lists "discussion" — was Discourse considered, or only GitHub Discussions? A `package-release` link (e.g. crates.io / npm / PyPI version) doesn't fit `release` cleanly. Is the kind list driving icons (per Req 3.1's "default-label table" reference) deferred to design — and if so, the requirements have over-specified the enum without specifying the visual contract.
- Resource categories: `devops-tools | blogs-and-feeds | reading | fun-stuff`. The product steering doc gives "DevOps Tools, Blogs & Feeds, Reading, Fun Stuff" as examples — examples, not a closed set. The author has converted examples to canon. Surface the tradeoff: is locking the schema worth the merge friction every time Matthew bookmarks a podcast?
- Closed enum with build-time error on unknown values means a typo in YAML breaks the entire deploy, including blog posts and projects. Acceptable failure mode? The doc doesn't say. Compare to project-showcase's `status` enum which has the same property and consider whether the precedent is being followed consistently or just borrowed selectively.

### 3. Sort-order semantics and tiebreakers (Reqs 2.1, 5.3)

- Req 2.1: contributions sort by `date` DESC, `repo` ASC tiebreak. What if two contributions to the same repo on the same day exist? The tiebreaker collapses, and the doc is silent. Should there be a third tiebreaker (array index? `title`?). Reasonably common when Matthew lands multiple PRs to the same upstream in one session.
- Req 5.3: resources sort by `added` DESC, `title` ASC tiebreak, with absent-`added` entries sorted AFTER. The doc says "preserving their YAML-declared array order among themselves" — but `byAddedDescTitleAsc` as a pure comparator can't preserve declaration order without an injected index. The acceptance criterion is **untestable** as written unless the comparator receives a pre-indexed input. Force the author to specify how.
- Req 5.3's "entries WITHOUT `added` sort AFTER entries WITH `added`" — what's the rationale? In a "what's new" reading order, an entry the author added a year ago without a date is buried. The doc doesn't justify why undated entries are deprioritized rather than treated as e.g. "added on a sentinel zero date."
- Req 5.3 conflicts subtly with Req 4.3 which says "Default: absent" for `added`. If `added` defaults to absent, the canonical pattern Matthew will use for *new* resources is to omit `added`, which means new resources will sort to the BOTTOM. The intended editorial workflow is internally inconsistent.

### 4. Page rendering, semantics, and accessibility (Reqs 2.3–2.5, 5.4)

- Req 2.3 says "the `repo` string ... in `<h3>`" and "the `title` ... in `<p>`" with the rationale "each card has only one heading level — the repo." But if `/contributions` page has its own `<h1>` ("Contributions"), the cards' `<h3>` skips `<h2>`. That's a WCAG 2.1 AA heading-order violation. Confirm or deny.
- Req 2.4 mandates no card-as-anchor because cards have multiple link destinations. Fine — but what's the keyboard navigation experience then? Visitors tab through 30 cards × 3+ links = 90+ tab stops. The doc doesn't mention skip-links, in-card grouping, or any UX for navigating a card-heavy page with a keyboard. Compare to project-showcase's single-anchor-per-card pattern.
- Req 5.4: resources entry is `<li>` containing `<a>title</a>` + description text. Where does the description live structurally — inside the `<li>` after the `<a>`, in a nested `<p>`, in a `<span>`? Screen readers will read the title link, then the description as continuation; whether that's a single reading unit or two depends on structure. The acceptance criterion under-specifies.
- Req 2.9 / Req 5.8 invoke `data-pagefind-body` from blog-enhanced — but blog-enhanced is a *separate* spec. What happens if `/contributions` ships before Pagefind crawl is extended to non-blog pages? Cross-spec dependency that the doc treats as already satisfied. Decomposition shows blog-enhanced depends only on blog-core; nothing wires Pagefind to arbitrary site pages.
- Req 2.7 / Req 5.6 empty states say "polite message" but don't specify text, semantic landmark, or behavior. Untestable.

### 5. Cross-spec coupling and scope leakage (Reqs 6.2, 8, 9)

- Req 8.2 mandates a build-time check "similar to `checkProjectHeadings`" — but that check is owned by project-showcase. Either this spec adds a sibling build script (extra code, extra test surface) or it extends `checkProjectHeadings` (cross-spec coupling). The acceptance criterion doesn't pick. Force the choice.
- Req 9.1 says hero cards "include cards for /contributions and /resources" but punts on whether the existing structure already supports this. Either it does (verify) or it doesn't (this spec touches the landing page — out-of-scope expansion). The doc dodges.
- Req 9.2 says top-nav inclusion is "design-phase" while requirements should constrain reach. The "reachable in one click" criterion is met by hero cards alone; mentioning top-nav as a possibility muddies the contract.
- Req 6.2 says HTML sitemap (/sitemap) inclusion is the slash-pages spec's responsibility. But the slash-pages spec hasn't been written yet (per decomposition). The acceptance criterion can't be tested without that spec existing — should this be a TODO in `tasks.md` of slash-pages, or just dropped from this requirements doc?

### 6. Editorial workflow, error reporting, and hidden assumptions (Reqs 1.4, 4.4, 10, NFRs)

- Req 1.4 / Req 4.4 say errors cite "by `repo`/`title` if present, else by array index." But if a required field (`repo`/`title`) is malformed (wrong type, e.g. a number), the error message has to fall back to the index — and the implementation must therefore probe the raw value before validation. This is a non-trivial Velite/Zod pattern. The doc asserts behavior without engineering specificity, which is a flag for "this will be missed in design."
- Req 10.4 says rollback is `git revert`. Fine. But the doc never addresses **what happens to inbound traffic that bookmarked a particular `/resources#cat-reading` anchor when the author renames or removes the category from the enum.** Anchor links break silently. Stated trade-off?
- Req 10.5: "No draft state." This conflicts with the editorial reality that Matthew may want to stage an entry on `main` but suppress it until a related blog post drops. The doc forecloses this without acknowledging the workaround (feature branch).
- NFR Performance section asserts "Lighthouse 90+" verified manually at launch. Compared to project-showcase's Req 12 which has a documented re-verification *cadence*, this is weaker. Either copy that pattern or justify the weaker bar.
- Reqs are silent on i18n / non-ASCII chars in `repo`, `title`, or `description`. Realistic? (Matthew likely uses ASCII; but locking that assumption in unstated is a future tax.)

## Closing Deliverables

After running the analysis, write your findings to:

`/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/contributions-and-resources/reviews/adversarial-analysis-requirements.md`

The analysis MUST conclude with:

1. **Top 5 risks/gaps** — concrete, specific, with file/section references.
2. **Top 3 conclusions to challenge or reverse** — what should the author rethink, with reasoning.
3. **What's missing** — work that should be done before this document is acted on. Be ruthless about scope.

Be specific and concrete. Cite failure scenarios, not abstract risks. If something is actually fine, say so briefly and move on. Do not pad. Do not include praise.
