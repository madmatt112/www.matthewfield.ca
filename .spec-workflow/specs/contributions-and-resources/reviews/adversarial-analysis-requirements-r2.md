# Adversarial Analysis: contributions-and-resources requirements (v2, post-r1)

Source: `.spec-workflow/specs/contributions-and-resources/requirements.md` (v2)
Prior review: `adversarial-analysis-requirements.md` (v1)
Memory: `adversarial-memory-requirements.md`

Method: read v2 end-to-end against prior memory; cross-checked Req 8.2's "prepare hook" claim against the actual `checkProjectHeadings` wiring at `velite.config.ts:400` (it is invoked from the **per-entry projects transform**, NOT from `prepare`); cross-checked Req 9.1's hero-card / nav-item claim against `src/config/site.ts:33-72` (verified — both lists already include `/contributions` and `/resources`); cross-checked the `prepare`-hook precedent at `velite.config.ts:437-458` (it's a global cross-post hook, runs once, takes `data` keyed by collection name). Findings below carry Novel / Compounding / Recurring classification.

---

## 1. Semantic HTML — Req 5.5 `<dl>/<dt>/<dd>` is the wrong structure

**Classification**: Novel.

Req 5.5 locks each resource entry as `<dt>` (title link) + sibling `<dd>` (description). The HTML spec defines `<dl>` as a list of **name-value groups** where each `<dt>` is a "term being defined" and each `<dd>` is its definition. A bookmarked resource is not a "term being defined" — its title is the resource's name, not a vocabulary term whose meaning is being explained by the description. The description is a **why-this-matters annotation**, not a definition.

Concrete consequence: screen-reader announcement patterns. NVDA + Firefox announces a `<dl>` as "definition list with N items," then for each pair reads "term: <title link>" "definition: <description>." That phrasing is wrong for editorial intent ("here's a link, and here's why I think it's interesting"). JAWS' default verbosity is similar. VoiceOver on macOS is more forgiving but still uses "definition" framing. Compare to `<ul><li>` semantics: "list with N items," then "<title link> — <description>" — closer to what a sighted reader sees and to author intent.

Additionally — see finding 3 below — Pagefind's HTML extractor treats `<dl>` differently from `<ul>`; that interacts badly with the forward-prep marker locked in Req 5.9.

Recommendation: replace `<dl>/<dt>/<dd>` with `<ul>/<li>` where each `<li>` carries the link followed by the description, structurally locked as either `<a>` + `<p>` or `<a>` + adjacent `<span class="resource-note">`. Pick one and lock it in v3.

---

## 2. Req 2.3's "hidden `<h2>Card list</h2>`" is half-locked

**Classification**: Compounding (v1 raised heading-skip; v2 fixed h1→h3 by adding the intermediate h2 but left the intermediate's text and visibility unspecified).

v2 Req 2.3 introduces "a hidden-but-screen-reader-available `<h2>Card list</h2>` (or visually styled equivalent — design phase picks the exact text and visibility)." The doc has locked a heading STRUCTURE while explicitly punting on the heading TEXT and VISIBILITY. Two failure modes:

- **Text drift**: if "the design phase" picks "Recent contributions" or "Contribution list" or similar, the heading text is not nailed in requirements and a test fixture cannot pin it. Acceptance test for Req 2.3 reduces to "an h2 exists between h1 and the first card's h2" — a trivial DOM-shape assertion with no editorial-intent verification.
- **Visibility footgun**: `sr-only` Tailwind utility classes (`.sr-only`, `.visually-hidden`) have known behavioral edge cases:
  - NVDA + Chrome announces sr-only headings as part of the heading navigation list, then re-announces them when the visitor's focus passes by the position — perceived double-read.
  - JAWS' virtual cursor sometimes skips sr-only headings depending on user-tuned verbosity.
  - Some screen-magnification users still want to perceive headings; a pure `sr-only` heading is invisible to them by definition.

The "design phase picks the exact text and visibility" punt is a requirements smell. A requirements doc that locks the heading STRATEGY but not the heading's user-visible properties is half-locked.

Recommendation: v3 names the exact text (e.g., "Contributions" already used in the h1; the intermediate h2 should NOT duplicate that — pick "Cards" or "Listing" and lock it) and visibility (recommend visible subtitle styled as a section label, not sr-only — avoids the known sr-only screen-reader pathologies).

---

## 3. Req 2.4's heading slot — `repo` vs `title`

**Classification**: Novel.

Req 2.4 mandates `repo` (the `owner/name` slug) as the card's `<h2>` content, with the human-readable PR `title` rendered as a `<p>` below. Compare blog cards (project-showcase precedent at v4): the **post title is the heading**, not the slug. The contribution analogue would be `title` (PR/contribution title) as the h2, with the `repo` as a sub-line.

Concrete consequence:
- A visitor scanning the contributions page's heading list (via screen-reader heading navigation or via the page's outline) sees `prometheus/prometheus`, `kubernetes/kubernetes`, `prometheus/prometheus`, ... — repo names, not contribution narratives. The contribution narrative ("Fixed RA tail-handling on shard fan-out") is the editorially interesting bit.
- Three contributions to the same repo all show identical h2 text. Heading-jump navigation can't distinguish them.
- The link-rail `aria-labelledby="contrib-<index>"` (Req 2.6) announces the repo as the rail's accessible name; for screen-reader users, the rail "Pull request" link is announced as "prometheus/prometheus, Pull request" rather than "Fixed RA tail-handling, Pull request" — which is the louder editorial signal.

Recommendation: swap. Make `title` the h2 and `repo` a sub-line (code-styled). The card grows by zero pixels; semantics improve substantially.

---

## 4. Req 2.9 / Req 5.7 — `role="status"` is wrong for a permanent-empty page

**Classification**: Novel.

`<aside role="status">` maps to an ARIA `status` live region with `aria-live="polite"` implied. This is intended for **transient updates** to a page already in view (e.g., "5 items loaded," "form saved"). When a visitor LANDS on `/contributions` and it is empty, two screen-reader behaviors are documented:

- NVDA on initial page load: announces the page heading first, then announces live-region content. The empty-state message is announced TWICE — once because it's in the main reading flow, once as a live-region update.
- JAWS: similar double-read in default verbosity. Some users tune verbosity to suppress live regions, in which case the empty-state message may be SKIPPED entirely on initial load.

The semantically correct structure for a "this page has no entries to show" landing state is a plain `<section>` (or `<div>`) with a clear `<p>` and optionally an `aria-labelledby` reference to a sub-heading. `role="status"` is for dynamic updates, not static landing copy.

Additional gap: Req 2.9 says "the meta description SHALL still resolve (use the same curated string as the non-empty case)" — but does not require the empty-state component to include the page's h1. A landing visitor on an empty page hears the page's title from `<title>`, then... what? The current spec doesn't say the h1 is rendered in the empty state. If the h1 is omitted in the empty branch, the page has no heading at all, and the `role="status"` aside floats unanchored.

Recommendation: drop `role="status"` and use a plain `<section>` with a heading and explanatory `<p>`. Lock that the h1 renders in BOTH the populated and empty branches.

---

## 5. Req 8.2's "Velite `prepare` hook" claim is factually wrong

**Classification**: Compounding (v1 raised "name the file, name the trigger"; v2 named both but picked the WRONG trigger).

Req 8.2 says the author-doc check is "invoked from `velite.config.ts`'s `prepare` hook (the same wiring pattern as `checkProjectHeadings`)." This is doubly wrong:

1. **`checkProjectHeadings` is NOT in the `prepare` hook.** Verified at `velite.config.ts:400` — `checkProjectHeadings` is invoked **inside the `projects` collection's per-entry `.transform()` callback**, fires once per MDX file as that file is parsed. The actual `prepare` hook at `velite.config.ts:437-458` is a global cross-post invariant (series-order collision check), runs ONCE per build with `data` keyed by collection name. v2 invents a precedent that does not exist.

2. **`prepare` is the wrong hook for an author-doc check anyway.** The author doc (`docs/contributions-and-resources-authoring.md`) is not associated with any Velite collection — it is a sibling docs file. Mounting an author-doc check on a collection's `transform` is asymmetric ("which collection? what if the user only edits resources content?"). Mounting on `prepare` runs once per build but `prepare` receives data keyed by collection — it has no notion of "check this file on disk." The right place is either:
   - A global side-effect at the **top of `velite.config.ts`** at module-load time (which is how Velite v0.3.x file-system reads happen for the `siteConfig` import at line 12). This runs once per build, doesn't depend on any collection, and surfaces errors at the same point the rest of the config is evaluated.
   - A separate CI step entirely (e.g., a pretest script or a `package.json` `scripts.lint:docs`).
   - A standalone `node --experimental-strip-types` invocation in CI, decoupled from Velite.

A "Velite `prepare` hook" wiring as currently written is unimplementable: `prepare` has no access to arbitrary files, only collection data. The implementer will have to invent a different wiring at design time and the requirements claim will be wrong.

Recommendation: rewrite Req 8.2 to name the actual wiring (top-of-config side-effect OR CI script) and verify against `velite.config.ts`'s actual hook surface. Drop the "same pattern as `checkProjectHeadings`" claim — that pattern does not exist.

---

## 6. Req 8.2 — "build warning (not error)" is invisible in CI

**Classification**: Novel.

Req 8.2 says missing canonical headings emit a build WARNING. Two failure modes:

- **Vercel build output does not fail on warnings.** Vercel's build log surfaces stdout/stderr but the deploy promotes on a non-zero exit, not on the presence of "warning" strings. A `console.warn` from a Velite hook is buried in build logs that nobody reads after a green deploy. The warning is a no-op for the typical Matthew-pushes-and-walks-away workflow.
- **Dev fast-fire**: the check fires on every `velite build`, including watch-mode dev. A text editor with autosave (most modern editors — VS Code's default is autosave-after-delay) will trigger the check on every keystroke pause. Acceptance criterion is silent on whether the dev fast-fire is acceptable.

Recommendation: pick one of (a) upgrade to error so it actually blocks deploys, (b) require the warning to be a GitHub Actions annotation (`::warning::` line prefix) so it surfaces in PR UI, or (c) scope the check to CI-only by gating on `process.env.CI === "true"`.

---

## 7. Req 8.2's unit test does not exercise the integration

**Classification**: Compounding (v1 raised "name the file, name the trigger"; v2 named a test surface that exercises the helper but not the wiring).

Req 8.2 says "the check has its own unit test." A Vitest unit test against `check-authoring-doc.ts` exercises the heading-detection logic against a string input. It does NOT exercise:
- That the check is actually invoked during `velite build`.
- That a missing heading surfaces in the Velite build log (vs. being silently swallowed).
- That the file-not-found case actually causes a non-zero exit (vs. being caught and logged).

The integration is exactly where this kind of check breaks (see r3 reviews of project-showcase task-28-4 for precedent — the cadence guard's integration was broken in a way the unit test couldn't detect). Acceptance criterion needs an integration test that runs `velite build` against a fixture where the author doc is missing a heading, then asserts on the build log.

---

## 8. Req 4.2 + Req 5.3 — required `added` creates a seed-date pathology

**Classification**: Novel.

The memory file frames Req 4.2's required-`added` as "free because there are no legacy entries yet." Wrong framing. Matthew (per his project history) has been mentally tracking bookmarks for years; when he sits down to seed `resources.yaml`, he'll need to assign `added` dates to (estimate) 30+ entries pulled from browser bookmarks, RSS reader, README "awesome" lists, etc. There is no git history of the YAML file (it doesn't exist yet), so no archival source for these dates.

Three outcomes:
- He fabricates `added: 2026-05-28` (today) for every legacy entry. Req 5.3's `added desc, title asc, url asc` then sorts the 30 entries alphabetically by title within category — defeating the documented "most recently added first" intent. The first deploy presents the bookmarks in alphabetical order; the "recency" signal is dead until new entries are added.
- He spends an afternoon date-archaeology on each (looking up his browser bookmark timestamps, RSS subscription dates, etc.) — a friction the spec doesn't acknowledge.
- He fabricates plausible-but-fake dates (e.g., "this looks ~2023-vintage to me, call it 2023-03-15"). Internally inconsistent and not defensible.

The doc has no acceptance criterion saying "for the initial seed, all entries MAY share a single `added` date (e.g., the seed date) without violating intent." Req 8.1 lists "## Resources YAML shape" covering "the `added` semantics, why it is mandatory" but doesn't mandate that the author doc cover the **seed-date pattern**. This will surprise Matthew at the seeding step.

Recommendation: add to Req 8.1 a required section "## Seeding `added` for legacy bookmarks" or similar, OR weaken Req 5.3's intent statement ("most recently added first") to acknowledge the seed-date degenerate case explicitly.

---

## 9. Req 4.2 — `added` has no upper bound (future-dated entries are legal)

**Classification**: Novel.

The schema accepts any ISO 8601 date for `added`. Nothing forbids `added: 2027-01-15` on a 2026 entry. Realistic? Matthew uses an AI tool to seed entries and the AI hallucinates a future date in the `added` field. Schema accepts it. Sort order pushes the entry to the top of its category forever (until 2027 catches up).

Two cheap fixes:
- Add `.refine((d) => new Date(d) <= new Date(), { message: "added must be on or before today" })`.
- Accept the gap with a documented note: "future-dated `added` is permitted (e.g., for embargoed announcements)."

Currently silent.

---

## 10. Req 1.4 / Req 4.4 — error-message contract has a parametric gap

**Classification**: Compounding (v1 raised "error-message identifier vs. index fallback"; v2 contractualized it for contributions but the resources analog (Req 4.4) is hand-waved with "substituting `title` for `repo`").

Req 4.4 says the Req 1.4 contract applies, "substituting `title` for `repo` as the entry identifier." But Req 1.4 has a contribution-specific clause: "if `repo` parses as a string..." — checks that `repo` is at least a parseable string before using it as identifier. The substitution glosses over the asymmetry:

- For contributions, `repo` is an identifier in the formal sense (regex-constrained `owner/name`).
- For resources, `title` is a free-form 2–80-char string — not an identifier in the regex sense. It can be (for example) the literal title of a blog post including punctuation, quotes, em-dashes, Unicode. If `title` validation fails (length out of range, e.g.), the raw value might be a multi-line string or include characters that break the error message line.

Concrete: a resource entry with `title: "  "` (whitespace-only) violates the 2-char min. Is `"  "` "present" for the message contract? The Req 1.4 contract says "if `repo` parses as a string" — applied verbatim to resources, " " parses as a string, so the contract uses it as the identifier. The resulting error message is something like `resources.yaml entry '  ': title length 2 < min 2` — garbage from the author's perspective.

Recommendation: parameterize the contract: "if the identifier field validates as a non-empty string of length >= MIN_DISPLAY (suggested: 2), use it as the identifier; else use the array index." Lock MIN_DISPLAY. Or just always use array index for both collections and surface the validated identifier as a separate hint — simpler, but breaks v2's compatibility.

---

## 11. Req 1.2 — the cap rationale is mathematically wrong

**Classification**: Compounding (v1 raised the 6-vs-5 cap mismatch; v2 changed the cap to 5 but the prose rationale is still off-by-one).

Req 1.2 says "minimum 1, maximum 5 entries; the cap aligns with the link-kind enum cardinality so the schema-level cap and the unique-per-kind constraint (Req 3.2) are mutually consistent and there is no dead headroom."

But the enum cardinality in v2 (Req 3.1) is **six**: `pr | commit | issue | release | writeup | discussion`. The "cap aligns with enum cardinality" rationale is stale from v1 (where the enum was 5 members). The actual v2 state is "cap = enum - 1 = 5, leaving headroom of 1 unused slot." Req 3.2 acknowledges this correctly: "With 6 enum members and a per-entry cap of 5, ... at most one slot is unused."

So Req 1.2 and Req 3.2 contradict each other on the rationale. Fix the Req 1.2 prose to match Req 3.2.

---

## 12. Req 2.4 — `id="contrib-<index>"` is an unstable anchor contract

**Classification**: Novel.

Req 2.4 says the card heading carries `id="contrib-<index>"` where `<index>` is the **sorted-output index** ("zero-based index of the sorted output, NOT YAML index — sort first, then assign"). Req 2.6 says the link rail's `aria-labelledby` points at `contrib-<index>` for the same card. Internally consistent at a single deploy.

But `id="contrib-3"` is a deep-linkable anchor (`/contributions#contrib-3`). The sorted-output index is **unstable across deploys**: if Matthew adds a new contribution that lands between two existing ones by date, every later contribution's index changes by one. External links to `#contrib-3` resolve to different cards before and after the new entry.

Compare to Req 10.6's category-anchor non-stability disclaimer — Req 10.6 explicitly disclaims `/resources#cat-<slug>` URL stability. There is no analogous disclaimer for `/contributions#contrib-<index>`. Either:
- Add a disclaimer mirroring Req 10.6.
- Use a stable anchor form: `id="contrib-<repo-slug>-<date>"` (e.g., `contrib-prometheus-prometheus-2026-03-15`). Stable across deploys; deep-linkable usefully.

The current contract is between unstable-and-implicitly-stable — the worst combination.

---

## 13. Req 2.10 — the Pagefind marker test is a tautology

**Classification**: Compounding (v1 raised the dormant-marker cross-spec dependency; v2 acknowledged "dormant at launch" but specified an acceptance test that verifies nothing useful).

Req 2.10's acceptance test: "the marker is in the rendered HTML; acceptance test does NOT verify search results include contributions content." This is a non-test. It verifies a DOM attribute is present on a page that was just rendered by the test. The test would pass if `data-pagefind-body` were typo'd `data-pagefind-bdoy` (assuming the typo was applied uniformly to both the renderer and the assertion). The test gives near-zero confidence that the marker functions when crawl extension lands.

Two failure modes when a future Pagefind-extension spec lands:
- The future spec uses a DIFFERENT convention (`data-pagefind-index="resources"` with a scope identifier, or per-section markers). The current page-level marker is wrong and needs migration.
- The future spec uses a FINER granularity (per-card markers). The current page-level marker accidentally indexes nav/chrome/empty-state copy into the contribution corpus.

Recommendation: drop the marker entirely from v3 and add it in the future spec that owns Pagefind crawl extension. The cost saved: one DOM attribute and one no-op acceptance test. The cost imposed: a future no-op PR. Net win — and the future spec has access to the actual Pagefind config, so it can pick the right marker convention.

---

## 14. Req 5.5 + Req 5.9 — `<dl>` conflicts with Pagefind's body extractor

**Classification**: Novel.

Pagefind's default HTML extractor treats `<dl>/<dt>/<dd>` differently from `<ul>/<li>`:
- `<dt>` content is extracted as a separate phrase/segment from its `<dd>`. The implicit "title — description" pairing is broken in the search index — Pagefind sees two separate ranked chunks.
- Some Pagefind configurations skip `<dl>` content entirely if no explicit body marker is set (the `data-pagefind-body` marker exists on the wrapper but not on each `<dt>/<dd>` pair).

The forward-prep `data-pagefind-body` (Req 5.9) is dormant at launch, but when a future spec wires Pagefind, the dual decision (v3's `<dl>` semantics + dormant marker) is in tension. A future spec wiring Pagefind extension to `/resources` will inherit a DOM shape it may want to reject — leading to either (a) refactoring the `<dl>` to `<ul>` in the future spec, or (b) adding per-entry `data-pagefind-body` markers, doubling the marker surface.

Recommendation: lock `<ul>/<li>` (per finding 1) AND drop the dormant marker (per finding 13). Solves two problems in one pass.

---

## 15. Req 10.7 — "no draft" rationale misses the quick-takedown case

**Classification**: Compounding (v1 raised "no draft forecloses the embargo workflow"; v2 acknowledged that case but missed the takedown case).

Req 10.7 lists "the workflow where Matthew stages an entry alongside an unreleased blog post" as the known limitation. But there's a worse case the rationale doesn't address: **quick takedown**.

Concrete scenario: Matthew lists a PR to project X. Six months later:
- Project X is taken over by malicious maintainers (supply-chain attack precedent: event-stream, color.js, etc.).
- His contribution introduced a regression he learns about months later and wants the card gone immediately.
- The contribution is to a project whose license changed and he no longer wants to be associated.

He wants the card down in 5 minutes. Options:
- `draft: true` toggle → 1-line YAML edit + commit + wait for CI + wait for Vercel deploy. Same total latency as removal.
- Delete from YAML → 1-line YAML edit + commit + same CI/deploy wait. Same latency.

Both are bottlenecked on CI+deploy, not on the workflow choice. So a `draft` flag doesn't actually solve the quick-takedown case **for this site's deployment model**. The real gap is the takedown latency itself.

But the conclusion in v2 — "draft flag is a low-cost follow-up addition" — is half-right. It's true (a draft flag IS cheap to add later) but it misframes the cost comparison. The draft flag's value-add is:
- Quietly staging an entry locally without a long-lived feature branch (Matthew's stated use case).
- NOT quick takedown — that requires a separate mechanism (e.g., an environment-variable-gated dynamic exclude list, or a static "takedown list" YAML).

Recommendation: either accept "removal latency = one full CI+deploy cycle" as an explicit limitation in Req 10.7 (current state) OR add a quick-takedown mechanism (out of scope at launch but listed as a future addition).

Additionally, Req 10.7's framing of feature-branch staging vs. `draft: true` as cost-comparable is a misframe. A `draft: true` flag is **one line, one commit on `main`** — no rebase friction. A feature branch is **multiple commits, rebase risk every time `main`'s YAML changes, requires coordination with companion blog post merge**. These are not cost-comparable; v2's "this trade-off is acceptable on simplicity grounds" understates the asymmetry.

---

## 16. Req 1.4 → Req 3.1 / Req 4.4 cross-reference fragility

**Classification**: Novel.

The error-message contract in Req 1.4 is inherited by Req 3.1 ("inherited from Req 1.4") and Req 4.4 ("Req 1.4 message contract applies, substituting `title` for `repo`"). Three risks:

- **Silent change-cascade**: any future tightening of Req 1.4 (e.g., adding a "for nested objects, include the parent path") silently changes Req 3.1 and Req 4.4. Test fixtures pinned to v2's phrasing will break without warning. Compare project-showcase Req 5's `linkSchema` error contract — that one is locked in the schema source itself (the `errorMap` callback), not in cross-referenced prose.
- **Inherited-contract gap**: if Req 3.1 needs a contract Req 1.4 doesn't supply, the inheritance has a silent gap. Currently no gap visible (the messages mostly track), but the doc has no contract-completeness check.
- **One-way arrow**: Req 3.1 inherits from Req 1.4 but doesn't extend it. Req 4.4 inherits with a substitution but doesn't extend. The contract has no "extension point" for new requirements that need richer error context.

Recommendation: collapse the three contracts into one shared section ("## Build-time error message contract") at the top of the requirements, then have Req 1.4, 3.1, 4.4 reference that section by anchor. Document the contract's extension point (e.g., "Collections MAY extend the message contract by appending forge-specific guidance").

---

## Top 5 risks/gaps

1. **Req 8.2's `prepare` hook claim is factually wrong** (`requirements.md:275-280` vs. `velite.config.ts:400` and `velite.config.ts:437-458`). `checkProjectHeadings` is invoked inside the per-entry projects `transform`, not in `prepare`. `prepare` cannot read arbitrary files. The Req 8.2 wiring is unimplementable as described. **Compounding.**

2. **Req 5.5's `<dl>/<dt>/<dd>` structure is the wrong semantic** for "resource title + annotation." HTML spec defines `<dl>` as name-value pairs for term-definition; resources are link-annotation pairs. Screen-reader announcement is awkward; Pagefind body extractor handles `<dl>` poorly. **Novel.**

3. **Req 4.2's required `added` field creates a seed-date pathology** for the initial bookmark-import session. 30+ legacy entries with no archival source for dates → either alphabetical-by-fabricated-today-date sort (defeats intent) or afternoon of date-archaeology. Req 8.1 doesn't require the seed-date pattern to be documented. **Novel.**

4. **Req 2.3's intermediate `<h2>Card list</h2>` is half-locked**: structure mandated, text and visibility punted to design. `sr-only` headings have known double-read pathologies on NVDA/JAWS. Test fixture cannot pin the heading's editorial content. **Compounding.**

5. **Req 2.4's `id="contrib-<index>"` is an unstable deep-link anchor** with no Req 10.6-style disclaimer. Adding a contribution that sorts between two existing ones shifts every later card's anchor. External `#contrib-3` links resolve to different cards across deploys. **Novel.**

## Top 3 conclusions to challenge or reverse

1. **Rewrite Req 8.2** to specify the actual wiring (top-of-velite.config.ts side-effect OR CI `package.json` script), drop the false "same pattern as `checkProjectHeadings`" claim, and upgrade the warning-on-missing-heading to either an error or a `::warning::` GHA annotation so it actually surfaces. The current Req 8.2 will fail at implementation time.

2. **Replace Req 5.5's `<dl>` with `<ul><li>`** with the link followed by description text. Screen-reader semantics improve; Pagefind body extraction (the dormant marker's eventual scope) works correctly; the structure matches author intent.

3. **Swap Req 2.4's heading content**: make `title` (PR/contribution title) the h2 and `repo` a sub-line. The contribution narrative becomes the heading-jump-navigable signal instead of the repo slug. Three-contributions-to-the-same-repo no longer present as three identical h2s in the page outline.

## What's missing — work needed before v3

1. **Resolve Req 8.2's wiring**: name the actual hook (verified against `velite.config.ts` not against a misremembered precedent), name the CI surface for the warning (or upgrade to error).

2. **Lock the empty-state structure** in Reqs 2.9 / 5.7 to a non-`role="status"` semantic. Specify that the page's h1 renders in BOTH populated and empty branches.

3. **Lock the intermediate-h2 text and visibility** in Req 2.3. Drop the "design phase picks" punt.

4. **Add a seed-date acceptance pattern** to Req 8.1 (resources author doc must cover the "initial bookmark import shares one `added` date" pattern).

5. **Add an upper-bound `.refine()` to `added`** in Req 4.2 (or document the future-date acceptance explicitly).

6. **Fix Req 1.2's cap rationale prose**: it says "cap aligns with enum cardinality" but with v2's 6-member enum and cap-of-5 there is one unused slot — the prose should mirror Req 3.2's correct description.

7. **Lock card-anchor stability** in Req 2.4: either pick stable anchors (e.g., `contrib-<repo-slug>-<date>`) or add a Req 10.6-style disclaimer for `#contrib-N`.

8. **Drop the dormant `data-pagefind-body` marker** (Reqs 2.10, 5.9) and the no-op acceptance test that goes with it. Add it in the future Pagefind-extension spec.

9. **Parameterize the Req 1.4 error-message identifier-vs-index fallback** so the contract is collection-agnostic (Req 4.4's "substituting `title` for `repo`" gloss hides an asymmetry — `title` is a free-form 2–80-char string, `repo` is a regex-constrained identifier).

10. **Collapse Reqs 1.4 / 3.1 / 4.4 into a single shared error-contract section** at the top of the requirements, referenced by anchor from each Req. Document the contract's extension point.

11. **Add an integration test acceptance criterion to Req 8.2** that exercises a missing-heading scenario through a real `velite build`, not just the helper's unit tests.

12. **Decide on Req 10.7's quick-takedown gap**: either accept "removal latency = one CI+deploy cycle" as an explicit limitation, or list a quick-takedown mechanism as a future enhancement.
