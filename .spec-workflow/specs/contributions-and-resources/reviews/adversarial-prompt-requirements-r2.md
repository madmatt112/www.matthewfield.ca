# Adversarial Review: contributions-and-resources requirements (v2, post-r1)

You are a senior staff engineer with deep experience shipping content-driven static sites in Next.js + Velite. You are paired with an accessibility / semantic-HTML reviewer instinct and a product-manager allergy to "we'll figure it out later." Your job is **not** to validate this document. Your job is to **tear it apart**, find every gap, every contradiction, every untestable acceptance criterion, every place where v2's tightening pushed the friction elsewhere or introduced fresh ambiguity. The v1 review already caught the obvious surface mistakes; v2 has addressed all of them. **Your bar is higher**: surface SECOND-ORDER problems — the new ambiguities introduced when v1's loose contracts were locked, the new failure modes that v2's stricter rules create, and any contradictions between v2's now-locked decisions.

Read the target document in full before starting:
`/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/contributions-and-resources/requirements.md`

## Prior review context

This is review v2. Before attacking the target document:

1. Read the rolling memory file at `/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/contributions-and-resources/reviews/adversarial-memory-requirements.md`. It catalogues which v1 findings were accepted, partially accepted, rejected, or unresolved, and ends with explicit "Guidance for Next Review" focus areas.
2. Read the v1 analysis at `/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/contributions-and-resources/reviews/adversarial-analysis-requirements.md` — know what was already found so you do not waste cycles re-discovering.
3. **Classify each finding you produce** as one of:
    - **Novel** — not identified in v1.
    - **Compounding** — deepens a v1 finding (e.g., v1 said "comparator untestable", v2 added tiebreakers, but the helper unit-test set fails to cover the new tiebreaker case).
    - **Recurring** — same issue as v1, NOT actually fixed in v2. Severity ESCALATES.
4. Focus on novel and compounding issues. Do not re-discover already-resolved v1 findings.

Read these steering docs to ground your attack in the project's actual constraints:
- `/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/product.md`
- `/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/tech.md`
- `/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/structure.md`
- `/home/mcf/repo/matthew-field.ca/.spec-workflow/spec-decomposition/decomposition.md`

Cross-check against live code and sibling specs:
- `/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/project-showcase/requirements.md`
- `/home/mcf/repo/matthew-field.ca/velite.config.ts`
- `/home/mcf/repo/matthew-field.ca/src/lib/projects.ts`
- `/home/mcf/repo/matthew-field.ca/src/lib/build/check-project-headings.ts` (precedent for Req 8.2's check)
- `/home/mcf/repo/matthew-field.ca/src/config/site.ts` (verify v2's claim that hero cards and nav items already exist)
- `/home/mcf/repo/matthew-field.ca/src/app/sitemap.ts` (precedent for Req 6.1)

## Attack Dimensions

### 1. The newly-locked HTML structures (Req 2.3-2.6, Req 5.4-5.5) — semantic correctness

- Challenge the use of `<dl>/<dt>/<dd>` for resources (Req 5.5). A description list is for "term + definition" pairs (HTML spec). A "resource link + why-this-matters note" is closer to a list of links with annotations. WCAG / screen-reader behavior: many screen readers announce "list of N entries" for `<ul>` but only "definition list of N items" for `<dl>` — and several (NVDA in particular) have historically had patchy `<dl>` support. Cite the actual screen-reader semantics; surface whether `<ul>` with annotated `<li>` is closer to author intent. The doc has now locked a structure that may not be semantically right.

- Req 2.3 introduces a "hidden-but-screen-reader-available `<h2>Card list</h2>`" between the `<h1>` and the per-card `<h2>` series. Two problems: (a) hidden `<h2>`s with sr-only utility classes are a known anti-pattern in some screen-reader contexts (NVDA/JAWS may announce twice or misread), and (b) the doc punts on "the exact text and visibility (design phase picks)." A requirements doc that locks a heading-order strategy but doesn't lock the heading text is half-locked. Force a decision: name the text, name the visibility (`sr-only` Tailwind class? a visible subtitle?).

- Req 2.4 says the card heading is `<h2>` containing the **`repo` string** — but `repo` is `owner/name` like `prometheus/prometheus`, which is rendered as code-like identifier text. Is "repo identity" actually the right primary card heading, or is the human-readable `title` (PR title) the more screen-reader-useful heading? Compare to blog cards (post title is the heading, not the slug). Pressure-test the choice.

- Req 2.9 / Req 5.7 lock empty states to `<aside role="status">`. `role="status"` is for **live updates** (it's an ARIA live region with `aria-live="polite"` implied), e.g. "5 items loaded." For a permanently-empty page that a visitor *lands on*, `role="status"` may cause some screen readers to announce the message twice (once as page load, once as live-region update) or to announce it in an unexpected order. The more correct semantics for a static empty-state message are `<p>` inside a labeled `<section>` (e.g., `aria-labelledby` pointing at a hidden heading) or a plain `<p>` with the page's `<h1>` providing context. Pressure-test.

- Req 5.5's `<dl>` structure may conflict with Pagefind body-extraction. Pagefind's default crawler treats `<dl>/<dt>/<dd>` as "definition list" content; some configurations skip them or de-prioritize them in indexing. Even if the marker is dormant at launch, a future spec that wires Pagefind will inherit this DOM shape. Surface whether v2's locked structure is forward-compatible with the dormant marker's eventual scope.

### 2. The `added` field is now required — but legacy/historical bookmarks reality (Req 4.2, 4.3)

- Req 4.2 makes `added` required as of v2. Req 4.3 says there are no optional fields. The memory file claims this is "free because there are no legacy entries yet." Challenge that: Matthew (per `src/config/site.ts` and the existing site) has bookmarks he's been mentally tracking for years. When he sits down to seed `resources.yaml`, he'll need to assign an `added` date to ~30+ entries. Without git history of the YAML (it doesn't exist yet), he has no archival source. Two outcomes:
    - He fabricates `added: 2026-05-28` for every legacy entry — defeating the sort order's "what's new" intent.
    - He spends an afternoon date-archaeology on each.
    The doc has no acceptance criterion saying "for the initial seed, all entries MAY share the same `added` date (e.g. seed date) without violating intent." This omission is going to surprise him at implementation time.

- Req 5.3's tiebreaker chain is `added desc, title asc, url asc`. If 30 entries share the same `added` date (the legacy-seed scenario), they sort by `title asc` within category — which means alphabetical, which means "Awesome thing 1" comes before "Best thing 2". This is fine but it's *not* the documented intent of "most recently added first." Surface this consequence of v2's choice.

- The doc never says `added` MUST be on or before today. A future-dated `added` is legal in v2. Realistic? Matthew uses an AI tool to seed entries and the AI hallucinates `added: 2027-01-15`. Schema allows it. Sort order pushes it to the top forever. Tighten or accept the gap.

- Required `added` removes the v1 "optional with absent-sorts-last" pathology — but introduces a new one: every batch-import workflow now has to invent dates. The author doc (Req 8.1's `## Resources YAML shape` section) is going to have to explain this. Currently Req 8.1 lists "the `added` semantics, why it is mandatory" but doesn't mandate that the doc cover the **seed-date pattern**. Add it or accept the omission.

### 3. The `data-pagefind-body` "forward-prep, dormant at launch" pattern (Reqs 2.10, 5.9)

- Shipping inert DOM attributes whose semantics depend on a not-yet-written spec is a smell. The marker exists on `/contributions` and `/resources` but Pagefind's crawler is scoped to `/blog/**` only (per blog-enhanced decomposition). If the future Pagefind-extension spec never lands, the marker sits in production HTML forever, adding no value but signaling intent. Three failure modes:
    - The future spec lands with a *different* convention (e.g., `data-pagefind-index="resources"` with a scope identifier) and the markers need a rename. Now this spec's choice creates migration work.
    - The future spec uses a *finer* granularity (e.g., per-card markers) and the page-level marker indexes nav/chrome accidentally.
    - The future spec is cancelled and the markers rot.
- Recommend: **drop the markers entirely from v3** and add them in the future spec that owns Pagefind crawl extension. Or, if shipping them now is a constraint (e.g., it avoids a future no-op PR), document the exact crawl semantics the marker is intended to enable so a future spec MUST conform.

- Acceptance test in Req 2.10 says "the marker is in the rendered HTML; acceptance test does NOT verify search results include contributions content." That's a *non*-test — it verifies a DOM attribute is present. The test gives near-zero confidence that the marker will actually function when crawl extension lands. Drop it or make it forward-prep-only with a TODO.

### 4. Req 8.2's build-time author-doc check — Velite `prepare` hook semantics

- Req 8.2 says the check is "invoked from `velite.config.ts`'s `prepare` hook (the same wiring pattern as `checkProjectHeadings`)." Verify the precedent: `checkProjectHeadings` is invoked in velite.config.ts at top-level (file-loading time), not strictly a "prepare hook." Velite's `prepare` is a per-collection hook that runs after the collection's data is built. An author-doc check is **not** tied to either content collection — it's about a sibling docs file. Mounting it on the contributions collection's `prepare` is asymmetric (why this collection? what if the user only edits resources content?). Mounting on both collections runs the check twice per build.
- The correct hook is probably Velite's global `complete` hook (runs once after all collections finish) or a `dev`-only watcher. The v2 doc gestures at "same pattern as `checkProjectHeadings`" without verifying that pattern is correct here. Force the design phase to confirm or correct.

- Req 8.2 says "missing canonical heading: emit a build WARNING (not error)." Velite's logging surface is `console.warn`-flavored. Will a build warning actually surface in CI output? Vercel's build log displays stdout but doesn't fail on warnings. A "warning" that nobody sees is a no-op. Either require the warning to be on a specific channel (e.g., GitHub Actions annotation) or upgrade to a build error.

- The check fires on every `velite build` — including dev. An author editing the doc in a text editor with autosave will trigger many fast-fire warnings during a partial edit. Is that acceptable, or should the check be CI-only? Acceptance criterion silent.

- Acceptance criterion in Req 8.2 says "the check has its own unit test." Vitest tests run against the function, not against velite-integrated behavior. The integration (the check actually firing in a velite build) is untested. Surface the integration-test gap.

### 5. The "no draft state" rationale (Req 10.7) — pressure-test the boundary

- Req 10.7 says contributions / resources lack "the publish vs. unpublish risk surface that motivated `draft` on `posts`/`projects`." Challenge: **archived or wrong-attribution contributions are exactly the kind of thing one wants to unpublish quickly.** Concrete scenario: Matthew lists a PR to project X; six months later project X is taken over by malicious maintainers, or his contribution turns out to have introduced a regression he's embarrassed by. He wants the card down in 5 minutes, not "open a PR removing the YAML entry, wait for CI, wait for Vercel deploy." The "no draft" policy doesn't help here, but `draft: true` wouldn't either — both require a commit-and-deploy.
- The REAL gap is a "quick-takedown" affordance, which the doc doesn't address. Either acknowledge "removal latency is one full CI+deploy cycle" as an accepted limitation, or surface it as a missing requirement.

- The "feature-branch workaround" in Req 10.7 only works for entries that haven't been committed to `main` yet. For an entry that IS on `main` and needs to be quietly held back (e.g., it referenced an unreleased blog post), the workaround is "git revert, then re-add later" — TWO commits and a coordination dance. The doc claims this is acceptable; pressure-test against the actual workflow Matthew uses.

- Req 10.7 conflates `draft` (per-entry flag) with feature-branch staging. These are different mechanisms with different costs. The doc treats them as equivalent. They are not — a `draft: true` flag is *trivial* (one line change, no rebase risk) compared to a multi-week feature branch with rebase friction. The cost comparison in Req 10.7 is misframed.

### 6. Cross-reference fragility and contradiction loops

- The doc has heavy cross-referencing: Req 1.4's error-message contract is inherited by Req 3.1 ("inherited from Req 1.4") and Req 4.4 ("Req 1.4 message contract applies, substituting `title` for `repo`"). Three risks:
    - If Req 1.4 changes, Req 3.1 and Req 4.4 silently change too — and any test fixture that pinned the v2 phrasing will need updating.
    - Req 4.4 says "substituting `title` for `repo`" — but Req 1.4's "if `repo` parses as a string" check is contribution-specific. The substitution glosses over the asymmetry: contributions have `repo` as identifier; resources have `title` as identifier. The check's logic must be parameterized, not just text-substituted. Specify.
    - Req 3.1's "inherited from Req 1.4" is one-way. If Req 3.1 needs a contract Req 1.4 doesn't supply, the inheritance has a gap. Currently no gap visible, but the doc has no contract-completeness check.

- Req 1.2 says `links` cap is 5; Req 3.1 enum has 6 members; Req 3.2 says uniqueness-per-kind. So the maximum unique-kind selection from 6 enum members, capped at 5, leaves exactly 1 unused. Acceptable. But the doc's stated rationale in Req 1.2 ("the cap aligns with the link-kind enum cardinality") is wrong by one — enum cardinality is 6 in v2 (writeup was added), not 5. The phrasing is stale from when the enum had 5 members. Tighten or drop.

- Req 2.4 says card heading carries `id="contrib-<index>"` based on **sorted-output index** ("sort first, then assign"). Req 2.6 says the link rail's `aria-labelledby` points at `contrib-<index>`. Fine — but the sorted-output index is unstable across deploys (if Matthew adds a new contribution that lands between two existing ones by date, every later contribution's index changes). Stable IDs are a SEO/accessibility convention (deep-linking `#contrib-3` should mean a specific entry, not "whatever was 4th at deploy time"). Cite the broken contract; recommend `id="contrib-<repo-slug>-<date>"` or similar stable form.

## Closing Deliverables

After running the analysis:

1. Write your findings to `/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/contributions-and-resources/reviews/adversarial-analysis-requirements-r2.md`. Use Novel / Compounding / Recurring classification on every finding.

2. Update the memory file at `/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/contributions-and-resources/reviews/adversarial-memory-requirements.md` to reflect what v2 review found. Categorize: Accepted (if v2 addressed v1 findings well), Partially Accepted, Rejected, Unresolved (v2 review's new findings, pending v3). Add Patterns & Themes and Guidance for Next Review (v3).

3. Conclude the analysis with:
    - **Top 5 risks/gaps** — concrete, with file/section references, classified.
    - **Top 3 conclusions to challenge or reverse** — what should v3 rethink.
    - **What's missing** — work that should be done before v3 is acted on.

Be specific and concrete. Cite failure scenarios. Pad nothing. The bar is "what would a hostile reviewer call out in a public design-review meeting" — that's what you write.
