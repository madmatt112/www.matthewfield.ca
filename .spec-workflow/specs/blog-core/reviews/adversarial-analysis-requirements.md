# Adversarial Analysis — blog-core/requirements.md (v1)

**Reviewer stance:** senior technical PM, directive, no validation. Primary attack surface: completeness, ambiguity, scope.

---

## Targeted attacks

### 1. Req 7 — Draft handling and the `NODE_ENV` toggle

- Challenge the assumption that `process.env.NODE_ENV === 'production'` cleanly separates "publish" from "preview." Vercel preview deploys (which is how a normal Next.js PR-review workflow operates) run `next build` and therefore set `NODE_ENV=production`. Under this spec, drafts are invisible on preview deploys — defeating the entire stated use case of "commit unfinished posts so I can preview them" beyond `pnpm dev` on Matthew's laptop. The user story is misaligned with where review actually happens.
- Stress-test Req 7.3's claim that reading `NODE_ENV` at call time "removes a class of test-harness foot-gun." Next.js inlines `process.env.NODE_ENV` at build time via webpack `DefinePlugin`, so any reads in code reachable from a client bundle are replaced with a literal. Call-time vs. module-time reads make no difference in the bundled output; the requirement is performative rather than functional.
- Attack Req 7.5's `[DRAFT]` prefix as half-measure. The prefix appears only in `<title>` and meta description, not in any visible page header or watermark. A screenshot of the article body is indistinguishable from a published post — exactly the leak scenario the prefix purports to guard against.
- Challenge the absence of any preview mechanism aside from local dev. There is no opt-in for an authenticated preview route, no Vercel preview branch toggle, no environment variable like `BLOG_INCLUDE_DRAFTS=1`. Once Matthew wants a second reviewer (editor, friend) to see a draft, this spec offers nothing.
- Stress-test Req 7.6's "preserves static-only deployment posture" reasoning. The cost of `dynamicParams = false` is that publishing a post requires a full redeploy. This is fine for low-volume blogs but is not flagged as a constraint in the user story for Req 1 ("I never edit React code to publish writing") — the implicit assumption is that publishing is `git commit && git push`, but the spec elsewhere assumes Vercel rebuilds on push. Make the deploy dependency explicit, or admit you cannot publish without a successful CI run.

### 2. Req 4.6–4.7 — Tag/category "normalization" is not URL-safe

- Challenge the claim that `.toLowerCase()` + trim is sufficient normalization. The route is `/blog/tags/[tag]` and `[tag]` becomes a URL path segment. Author writes `tags: ['C++', 'C#', '.NET Core']`. Post-normalization values are `c++`, `c#`, `.net core` — every one of which either breaks URL encoding, becomes an invalid Next.js dynamic segment, or produces a literal space in the path. The spec has no slugification step (no `kebab-case` enforcement, no character whitelist) despite Req 1.2 *describing* the field as "lowercase-kebab."
- Stress-test the gap between Req 1.2 ("lowercase-kebab") and Req 4.6 (which only performs lowercase + trim). These two clauses contradict: one *describes* an authoring convention, the other *implements* a transform that does not enforce it. An author who writes `tags: ['blog core']` produces a tag `blog core` with a space — Req 1.7's `.strict()` does not catch this because the type is `array of strings`, not a regex-constrained string.
- Attack the unicode case. Author writes `tags: ['Café']`. `.toLowerCase()` yields `café`, which Next.js will percent-encode in the URL but the page heading "Posts tagged café" will display correctly only if every consumer handles encoding consistently. There is no test for non-ASCII tag round-trips.
- Challenge Req 4.7's "pretty-display casing is incidental complexity" reasoning by extension to its logical conclusion: if display casing follows slug casing, then `tags: ['DevOps']` becomes a tag chip reading "devops" — which Matthew will see, dislike, and want to change. The spec then forces him to rewrite every post's frontmatter to `devops-tooling` to get acceptable display. This is the "rigid simplicity creates author friction" trap, not a clean simplification.
- Stress-test deduplication of tags vs. categories across the union in Req 11.5 (`tags and categories arrays concatenated and de-duplicated`). If a post has `tags: ['rust']` and `categories: ['rust']` (same slug in both namespaces, which is legal), the RSS `<category>` element is de-duplicated — but the site's own tag and category pages remain distinct routes. The RSS contract silently collapses a distinction the rest of the spec maintains.

### 3. Req 6 — Reading time is computed against the wrong input

- Challenge Req 6.4's claim that counting code blocks "as prose" is acceptable for "a rough estimate." For a technical blog (which this site explicitly targets — see the Shiki requirement existing at all), a typical post is 40–70% code by line count. `reading-time` at 238 WPM applied to raw MDX inflates the estimate 2–4× compared to actual reading-of-prose-only. A 3-minute essay reads as "11 min read," which actively misleads scanners.
- Stress-test the "raw MDX body" input. The body passed to the transform includes frontmatter delimiters (`---`), import statements (if any), JSX tag names (`<Callout>`), and Velite metadata. `reading-time` will count every JSX attribute name as a word. The requirement acknowledges this in passing ("strip JSX tags from the post-compile output if pre-compile access is awkward — implementation detail deferred to Design") but does not specify a contract for what *must* be excluded.
- Attack the lack of any acceptance criterion that pins the reading-time output. The spec defines the formatter (`"N min read"`) but not a tolerance bound. A regression where reading-time silently doubles (e.g., counts HTML entities as words after a rehype plugin change) ships unnoticed.
- Challenge the choice of 238 WPM as a "future-spec adjustment." Per Req 9, the typical post will be code-heavy; per Req 6.2, the wpm is calibrated for English prose. The spec is internally inconsistent: it deliberately optimizes for technical readers (Shiki, code fixture in Req 9.6) while measuring reading time as if the audience were reading a novel.
- Stress-test the formatter contract in Req 6.3 ("'1 min read' floor"). For empty posts (zero-word body — possible at launch if a fixture is a stub), `reading-time` returns 0 minutes, and the formatter must clamp to 1. The requirement says "minimum 1" in 6.1 but does not specify the clamp's location (transform vs. formatter), so two implementations are possible and one will be wrong.

### 4. Req 11.7 — RSS HTML rendering punts the hardest problem to Design

- Attack the "implementation detail deferred to Design" framing. Rendering the MDX body to a plain HTML string is not a deferrable detail; it is the load-bearing complexity of this entire requirement. The existing `<MDXContent />` at `src/components/shared/mdx-content.tsx` uses `new Function(code)(runtime)` to construct a React component — feeding that into `renderToString` requires a JSX runtime, the same `@mdx-js/react` provider tree, and any registered components, none of which run cleanly outside a React server context. The "OR via a Velite transform that emits a separate `bodyHtml` field" alternative is meaningfully different in dependencies, build cost, and output fidelity — these are two different architectures, not interchangeable detail choices.
- Stress-test the absolutization claim in Req 11.8. "Any `<img src>` or `<a href>` with a relative or root-relative URL SHALL be rewritten." But Shiki's highlighted output (Req 11.9) wraps tokens in `<span style="color:#…">` — no relative URLs. Image-heavy posts use markdown `![](path)` syntax, which the spec elsewhere says will emit a plain `<img>` (Performance section on image optimization). The rewriter must traverse rendered HTML *after* Shiki and *after* MDX — the order is unspecified.
- Challenge the assumption that CDATA-wrapping (Req 11.7) is sufficient escaping. RSS 2.0 `content:encoded` inside CDATA blocks fails if the body contains the literal substring `]]>` — which a code block demonstrating XML or CDATA usage could legitimately contain. The spec offers no escape strategy for this.
- Attack the absence of a test fixture for the RSS body. Req 11.10 covers structural validity (it parses as XML), but not semantic correctness (does the rendered HTML in `<item>` match the rendered HTML on the post page?). A regression where the RSS body silently omits code blocks or images is invisible until a subscriber complains.
- Stress-test the `feedLinks.rss` (Req 11.4) hard-coded `https://matthewfield.ca/feed.xml` against Req 11.5's "composed via `siteConfig.url`, NOT hard-coded." Why does the spec demand `siteConfig.url` for item links but accept hard-coded URLs for channel links? Either both should compose or both can be literal; mixing creates the exact drift the rule is trying to prevent.

### 5. Req 8.3 — "Updated ≤ date fails build" is over-aggressive

- Challenge the rule. Authors edit a post, set `updated: 2026-05-16T09:00:00Z`, then realize the original `date: 2026-05-16T14:00:00Z` (published later that afternoon). The "updated before published" condition is true by 5 hours and the build fails. This is not a typo — it is a same-day correction with timezone-naive comparison.
- Stress-test the timezone handling. Velite's `s.isodate()` accepts both `2026-05-16` (date-only) and `2026-05-16T09:00:00Z` (with time). If `date` is date-only and `updated` is datetime, the comparison `updated <= date` evaluates against midnight of the date — making *any* same-day update appear as `updated > date` regardless of intent. The rule's behavior depends on author formatting choices that the schema does not constrain.
- Attack the spec's framing of this as catching "the class of typo where `updated` is set earlier than `date`." A more common typo is `updated: 2025-05-16` (wrong year) when the author meant 2026 — and `updated < date` correctly catches that. But the build fails for a real reason (the date *is* wrong) by a coincidence (the year is implausibly old). The rule conflates legitimate and illegitimate cases.
- Challenge the absence of the inverse rule. Nothing in the spec catches the more dangerous typo: `updated: 3026-05-16` (year typo in the future), which produces a tag chip and OpenGraph `modifiedTime` projecting a thousand years forward without comment. Strict validation in one direction without the other is asymmetric without reasoning.
- Stress-test interaction with Req 1.5's "absent `updated` means no meaningful update since publication." The spec offers no mechanism to remind the author to *set* `updated` when they actually do edit a post meaningfully. The realistic failure mode is not "updated set incorrectly" but "updated never set despite the post having been rewritten" — which Req 8.3 does nothing to prevent.

---

## Top 5 risks/gaps

1. **Draft preview workflow does not work where reviews happen.** Vercel preview deploys run with `NODE_ENV=production`, hiding every draft. The only place drafts are visible is `pnpm dev` on Matthew's machine. The user story in Req 7 is satisfied technically but not operationally.
2. **Tag/category normalization will produce invalid URLs.** Lowercase + trim does not enforce URL-safety or kebab-case. `C++`, `C#`, `Foo Bar`, and unicode tags all break the routing contract. The spec describes (Req 1.2) a constraint it does not enforce (Req 4.6).
3. **Reading time is wrong by a factor of 2–4× for technical posts.** Counting raw MDX (including code blocks and JSX tags) at prose WPM is structurally mismatched with the spec's own technical-blog framing. No acceptance criterion bounds the error.
4. **RSS HTML rendering is the largest unresolved design question, marked as a deferred detail.** The choice between "render React to string at route-handler time" and "emit `bodyHtml` from Velite" is architectural, not implementational. Equally important, no fixture compares the RSS body to the post page body for parity.
5. **The "Updated ≤ date fails build" rule (Req 8.3) is timezone-naive and asymmetric.** It rejects legitimate same-day corrections and accepts implausibly-future `updated` values silently. It also does not catch the dominant real failure: authors editing a post without setting `updated` at all.

---

## Top 3 conclusions to challenge or reverse

1. **Reverse: "drafts are visible in dev only via `NODE_ENV`."**
   Replace with an explicit `BLOG_INCLUDE_DRAFTS=1` environment variable (or equivalent), independent of `NODE_ENV`. Vercel preview deploys can then opt in; production cannot. This restores the user story's intent (preview drafts before publishing) without coupling visibility to a build-tool default that points the wrong way for the actual review workflow.

2. **Reverse: "tag/category normalization is `.toLowerCase()` + `.trim()`."**
   Replace with explicit slugification (e.g., `github-slugger` or a hand-rolled `[a-z0-9-]+` enforcement) at parse time. Either enforce kebab-case as a schema constraint (Req 1.7's `.strict()` cannot do this; need a regex `s.string().regex(...)`) and fail the build on violations, or transform freely-typed tags into kebab-case slugs. Picking neither leaves a hole that ships.

3. **Reverse / soften: "Updated ≤ date fails build" (Req 8.3).**
   Either drop the rule entirely (it does not protect against the real failure mode) or replace it with a warning at build time rather than a hard failure. Pair it with the missing inverse check: warn loudly when `updated` is implausibly far in the future (e.g., > 30 days ahead of build time) which catches year typos.

---

## What's missing — work that should be done before acting on this document

- **A concrete preview-deploy story for drafts.** Either declare drafts un-previewable in Vercel and remove the user-story claim, or specify the env-var/branch mechanism that makes them previewable.
- **A slugification spec for tags and categories.** Pick a library or a regex, write acceptance criteria for boundary cases (`C++`, `C#`, unicode, spaces, leading/trailing hyphens, length cap), and pin them in Req 4.
- **A precise contract for what `reading-time` measures.** Specify (a) whether code blocks are excluded, (b) the input string passed (raw markdown body with frontmatter stripped, JSX tags stripped, code block contents either included/excluded — pick one), and (c) a tolerance bound against a hand-counted fixture.
- **An architectural decision for RSS HTML rendering, with a fixture-based parity test.** Pick `renderToString` or `bodyHtml` Velite transform — do not defer. Add an acceptance criterion that the rendered RSS body for the Req 9.6 code-fixture post contains the same `<pre><code>` structure as the post page.
- **An explicit publishing-workflow note.** State that publishing requires a successful deploy (consequence of `dynamicParams = false` + static-only), so the "I just commit a markdown file" user story is read with the understanding that "and wait for CI."
- **A test that exercises the `[DRAFT]` marker visibility.** If draft prefix in `<title>` is the safety mechanism, add an acceptance criterion that a visible on-page banner reads "DRAFT — not published" so a screenshot is self-identifying.
- **A test fixture and acceptance criterion for non-ASCII tag round-trips** (Velite transform → URL path → page title → RSS category).
- **A rule for the CDATA-collision case in Req 11.7** (`]]>` inside a code block) — either escape or fail-fast at build time.
- **Cross-spec dependency verification step.** Req 13.2 cites a "contact-form smoke test pattern" from professional-profile and Req 9.3 cites `tech.md`. Confirm both exist as cited, or update the references.
