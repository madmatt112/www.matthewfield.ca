# Adversarial Review: slash-pages requirements (v2)

You are a senior staff engineer who ships content-driven static sites on Next.js App Router + Velite, with a reviewer's instinct for catching half-baked requirements before they cost an implementer hours. Your job is **not** to validate this document. **Tear it apart** — find gaps, contradictions, untestable criteria, hidden assumptions, and new problems introduced by the v2 rewrite. Be specific and concrete: cite failure scenarios, not abstract risks. If something is genuinely fine, say so in one line and move on.

Read the target document in full first:
`/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/slash-pages/requirements.md`

Ground your attack in the project's actual constraints:
- `/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/product.md` (§8 Slash Pages, §10 Dark/Light)
- `/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/structure.md` (Content File Organization, Module Boundaries, Code Size Guidelines)
- `/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/tech.md`
- `/home/mcf/repo/matthew-field.ca/.spec-workflow/spec-decomposition/decomposition.md` (spec #7)

**Verify v2's claims against live code — do not take them on faith.** Inspect at least:
- `velite.config.ts` — confirm `s.isodate().optional()` is the right Velite API for an optional date and what its *output type/shape* is (string? Date? what does `formatContentDate` expect?). Cross-check against the existing `posts` collection's `updated: s.isodate().optional()` (around line 100) — does `posts` prove the pattern works, and what does it actually emit? (Note: there is a known historical caveat that `s.isodate()` emits a full ISO timestamp, not a plain date — check whether `formatContentDate`/`new Date()` handle that and whether the `/now` `<time datetime>` will show a sensible value.)
- `src/config/site.ts` — the `SiteConfig` type and `siteConfig` object. v2 adds a `slashPages` array here. Assess: does adding a 6-entry array with descriptions bloat this config file past the structure.md 300-line guideline? Is `src/config/site.ts` the right home, or does structure.md point elsewhere?
- `src/lib/blog.ts` (`getVisiblePublishedPosts`) and `src/lib/projects.ts` (`getPublishedProjects`) — confirm zero-arg signatures and that calling them from a new `/sitemap` server page is consistent with how other pages call them.
- `src/lib/format-date.ts` — confirm `formatContentDate` exists and its exact return/usage.
- `docs/projects-authoring.md`, `docs/contributions-and-resources-authoring.md`, `scripts/check-authoring-docs.mjs` — does the existing script support adding another doc "without modification" (Req 9.3), or is that an unverifiable hand-wave? Read the script.
- How would Req 10.2's seed-content test actually read `content/pages/*.mdx` bodies? Velite compiles MDX to a function-string `body`; the raw markdown isn't trivially importable. Determine whether the test must read the raw `.mdx` file from disk (frontmatter + body) and whether sentinel/word-count checks on raw MDX are sound.

## Analysis dimensions

Attack at least these. Name actual v2 requirement numbers.

### 1. The new `slashPages`-in-`siteConfig` decision (Req 6, Shared Definitions, NFR Architecture)
- v2 cut the registry but moved a 6-entry descriptive list into `src/config/site.ts`. Challenge whether this is meaningfully simpler or just the same coupling in a different file. Does it bloat `site.ts`? Does putting page *descriptions* (editorial copy) in a typed config violate the "markdown-first content" principle the doc elsewhere champions?
- Stress-test Req 6.2's "exactly the six" invariant against Req 6.3's test and Req 10.1's test — are these the same test described twice, or two tests? Find the redundancy/ambiguity.
- `/sitemap` (Req 5.1) lists section pages from `navItems` AND slash pages from `slashPages`. But `navItems` (6 entries: profile, projects, contributions, blog, resources, playground) and `slashPages` overlap with neither — except `/sitemap` itself will list `/contact`, `/about`, etc. from slashPages and the six sections from navItems. Does any page get listed twice or zero times? Is `/` (home) listed anywhere on `/sitemap`? It's in neither `navItems` nor `slashPages`. Find the omission.

### 2. The optional `updated` field — the OPPOSITE failure mode now (Req 2, Req 4)
- v1 killed git-date for being noise-prone; v2's manual field is now **stale-prone** — Matthew updates `/now`'s prose but forgets to bump `updated`, so the date silently lies in the other direction. For the one page whose entire value is recency honesty, a silently-stale date is arguably worse than a noisy-but-fresh one. Challenge whether v2 traded one lie for a worse lie, and whether the doc acknowledges this.
- Req 2.2: "IF `updated` absent THEN render no date." So a `/now` with no `updated` shows no recency at all — for a *now* page. Is "no date" actually acceptable, or does it defeat the page's purpose? Should `updated` be required, not optional?
- Verify `s.isodate()` output: if it emits a full ISO datetime (e.g. `2026-05-29T00:00:00.000Z`), what does `<time datetime="...">` and `formatContentDate` render — a sensible "May 29, 2026", or a midnight-UTC artifact that's off-by-one in some timezones? The `/now` date is user-facing; a timezone-shifted date is a visible bug.

### 3. The seed-content sentinel test (Req 10.2) — brittleness
- Challenge the sentinel list `{placeholder, under construction, TODO, lorem ipsum}` and the ≥40-word floor. Concrete false-positives: a legitimate `/colophon` that says "TODO: document the deploy pipeline" as honest content; an `/about` under 40 words by deliberate stylistic choice; the word "placeholder" appearing in legitimate prose. Is a content-quality gate enforced by substring matching a sound idea, or theatre that will be `eslint-disable`d the first time it false-positives?
- How does the test read the MDX body (raw file vs compiled Velite `body` function-string)? If it reads the compiled `body`, the sentinel/word-count logic runs against JS, not prose — broken. If it reads the raw `.mdx`, it must parse frontmatter out first. The spec says neither. Determine whether Req 10.2 is implementable as written.
- Is "≥40 words" a requirement masquerading as a number pulled from nowhere? Tie it to a rationale or cut it.

### 4. `/sitemap` non-parity (Req 5.5, Decision #4) — did v2 over-correct?
- v1 had a buggy parity requirement; v2 cut ALL consistency between `/sitemap` (HTML) and `/sitemap.xml`. Challenge the over-correction: now the HTML sitemap can silently omit a real page (e.g. a future `/uses` page added to neither `navItems` nor `slashPages`) and nothing catches it. Is "may silently drift" actually fine, or did v2 swing from over-engineered to under-specified? Propose the cheap middle ground (a single shared list of static routes, or a smoke test that every `navItems`+`slashPages` href 200s) and force the doc to choose deliberately.
- Req 5.1 lists posts and projects on `/sitemap` but the page is `noindex` (Req 5.4). Is a `noindex` HTML sitemap that lists every post worth building at all, or is it dead weight? Challenge whether `/sitemap` earns its place.

### 5. Authoring doc Req 9 — real or ceremony
- Req 9.3 makes CI wiring "optional ... if the existing script supports additional docs without modification." Read `scripts/check-authoring-docs.mjs`. If it hardcodes specific doc paths, "without modification" is false and Req 9.3 is dead words that will be skipped. If it's generic, then the optionality is a cop-out — why not just wire it? Either way the requirement is mush. Force a yes/no.
- The sibling authoring docs are *gated by tests* (per the contributions spec). v2 adds a doc but explicitly declines the gate. So `docs/slash-pages-authoring.md` can rot out of sync with the schema with zero CI signal. Is an ungated doc better than no doc, or just a maintenance liability that looks like diligence?

### 6. Residual gaps and contradictions introduced by the rewrite
- Cross-check every "(Verify-existing)" label against whether the criterion is truly already met — any mislabeled "new" work hiding as verify-existing, or vice versa?
- Req 10.5 makes the missing-entry build-failure test OPTIONAL and Req 10.2's seed test is the only hard content gate. Is there now NO automated test that `/now` and `/colophon` routes actually render (only `/about` has a proven guard)? E2E (Req 10.3) covers render, but confirm the unit-level guards for `now`/`colophon` are specified to mirror `getAboutPage()` and aren't left to the implementer's discretion.
- Does v2 anywhere still reference cut concepts (registry, git-date, parity, `group`, `index` flag) in a stale cross-reference that survived the rewrite? Hunt for internal inconsistency between the new Decisions list and the requirement bodies.

## Prior Review Context

A v1 review already ran. **Do not re-discover or re-litigate these — they are resolved in v2:**
- Registry over-engineering → **cut** (no `src/config/pages.ts`, no `group` enum, no `index` flag, XML `sitemap.ts` untouched).
- XML double-emission of `/contributions`+`/resources` → dissolved with the registry.
- Index-filter parity contradiction + unimplementable route-existence test → cut (no parity test).
- Git-`updatedAt` transform (uncommitted-file build failure; non-additive `.transform` merge) → **dropped** for an optional frontmatter `updated` field.
- `/sitemap`+`/slashes` indexability (circular reasoning) → both now `noindex`.
- `/about` ~no-op and footer-already-links-`/slashes` → reframed as verify-existing.
- Missing authoring doc → added (Req 9).
- "real seed content" untestable → sentinel test added (Req 10.2).

Classify each of YOUR findings as:
- **Novel** — not raised in v1.
- **Compounding** — deepens a v1 finding the v2 fix only partially addressed.
- **Recurring** — v2 secretly reintroduced a v1 problem (escalate severity if so).

Focus your energy on the **new v2 surface** (the `slashPages`-in-config move, the manual-`updated` stale-date failure mode, the sentinel test's brittleness/implementability, the `/sitemap` non-parity over-correction, and the authoring-doc gate question). Do not spend words re-praising the cuts.

## Closing deliverables
- **Top 5 risks/gaps**, ranked, each with a concrete failure scenario and a Novel/Compounding/Recurring tag.
- **Top 3 conclusions to challenge or reverse**, with reasoning.
- **What's missing** — work to add or cut before this goes to design.

Write your complete analysis to:
`/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/slash-pages/reviews/adversarial-analysis-requirements-r2.md`
