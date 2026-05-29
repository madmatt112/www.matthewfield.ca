# Adversarial Analysis: contributions-and-resources requirements (v1)

Source: `.spec-workflow/specs/contributions-and-resources/requirements.md`

Method: read the document end-to-end against the steering docs, decomposition, sibling specs (project-showcase v4, blog-core), live code in `velite.config.ts`, `src/lib/projects.ts`, `src/lib/blog.ts`, and the bundled Velite 0.3.1 source (the actual loader pipeline at `velite/dist/chunk-4HFW4XPZ.js:37800-38090`). Concrete failure modes are cited below; passes are noted briefly.

---

## 1. Velite + YAML mechanics — partly verifiable, badly described

### 1.1 The `s.yaml()` claim is wrong (Intro line 16; cascading into Reqs 1 & 4)

The Introduction states:

> Two Velite collections (`contributions`, `resources`) using `s.yaml()` as the entry type, with full schema validation.

**There is no `s.yaml()` primitive in Velite 0.3.1.** Velite's `s.*` namespace re-exports zod plus a small set of velite-specific schemas (`s.image()`, `s.mdx()`, `s.markdown()`, `s.path()`, `s.isodate()`, `s.metadata()`, `s.toc()`, `s.raw()`, `s.slug()`). YAML is not a schema primitive — it is handled at the **loader** layer, not the schema layer.

The actual mechanism (verified at `velite/dist/chunk-4HFW4XPZ.js:37827-37835`):

```js
var yaml_default = defineLoader({
  test: /\.(yaml|yml)$/,
  load: (file) => ({ data: yaml.parse(file.toString()) })
});
```

The yaml loader is in the **built-in loader list** (`json_default, yaml_default, matter_default`). A collection's `schema` is then applied to that parsed `data`. If the loader returns an array, Velite iterates entries against the schema (line 38005-38006: `const isArr = Array.isArray(file.records)`).

**Why this matters**: an implementer reading the Intro will go hunting for `s.yaml()`, find nothing, and either (a) waste an afternoon, or (b) wrongly conclude this design needs a custom loader registered in `defineConfig({ loaders })`. The correct schema shape is `s.array(s.object({...}).strict())` — never `s.yaml()`. This needs to be **fixed in the requirements doc**, not deferred to design. The phrase "using `s.yaml()` as the entry type" must be deleted or replaced with "using Velite's built-in YAML loader plus an `s.array(s.object({...}).strict())` schema."

### 1.2 Req 1.6 / Req 4.6 — "does NOT exist OR `[]`" is half-right; "empty file" is a third case the doc misses

Behavior I verified by reading the loader:

| File state | `yaml.parse()` output | `file.records` | Schema input | Result |
|---|---|---|---|---|
| File does not exist | n/a — fast-glob returns no paths | n/a | n/a | `collection = []` ✓ |
| `[]` (empty list literal) | `[]` | `[]` | `s.array(...)` with len=0 | `collection = []` ✓ |
| `""` (zero bytes) | `null` | `null` (not array) | wrapped as `[null]`, schema parses `null` | **build error: "Expected object, received null"** |
| `~` / `null` literal | `null` | `null` | same as above | **build error** |

The doc asserts the first two cases succeed (they do) but is silent on the third. A first-time editor saving an empty file is a realistic mis-use. The acceptance criterion needs either:
- "an empty or null YAML payload SHALL also be treated as `[]`" (requires a `prepare`-time normalization or a custom loader override), **or**
- "an empty/null YAML payload SHALL be a build error citing the file name" (requires explicit assertion in a velite transform on the collection wrapper).

Either is fine; silence is not.

### 1.3 `pattern: "contributions.yaml"` — works, but not for the reason the doc implies

Req 1.1 hedges:

> the file's top-level is a list of entries — Velite handles list-of-entries-from-one-file via array-shaped schema

This is true: `fast-glob("contributions.yaml")` returns the single matching file (or empty), the yaml loader returns `data: array`, `file.records` is the array, Velite iterates. But the doc never **proves** this — the existing precedent (`profile`) uses `single: true` with a single OBJECT. Req 1.1 should reference the `posts`/`projects` precedent for `single: false` schemas, OR cite the loader + record-iteration behavior explicitly. Without one of these, the design phase will either re-derive the same analysis or introduce wrong assumptions.

A concrete missing acceptance criterion: **what is the literal shape of the `schema` value?** It must be `s.array(s.object({...}).strict()).min(0)` (or similar). Nowhere in Reqs 1-3 is this contract spelled out. Compare to project-showcase Req 1.1-1.2 which fully specifies the schema shape including the `s.object({...}).strict().transform(...)` envelope.

### 1.4 Req 7.4 punts the chokepoint contract — but the chokepoint is already in production

Req 7.4 says:

> If the existing rule is "anything in `src/lib/` may import"; no rule change is needed — verify in design.

The existing rule's contents are knowable now. From the project-showcase task-28-4 work (most recently shipped), there's a CI step exempting intentional `#site/content` callsites — see commit `df5aacb`. That commit's title and the existing `src/lib/projects.ts:1` / `src/lib/blog.ts:2` both import `#site/content` without ceremony. So the rule already exempts `src/lib/*.ts`; nothing in this spec needs to change it.

The requirement should state that as fact, not as "verify in design". Deferred verification is a smell in a requirements doc.

### 1.5 Req 1.2 caps `links` at 6 but Req 3 does not restate the cap

Req 1.2 lists "minimum 1 entry, maximum 6". Req 3.1 redefines `links` as "an array of objects of shape ...; ... Uniqueness per kind" but never restates the 1-6 cap. With 5 possible `kind` values plus unique-per-kind (Req 3.2), the effective max is **5**, not 6. The 6 is a stale number from an earlier draft where `discussion` was probably added without re-deriving the cap, OR the cap allows for headroom but the uniqueness constraint makes it dead. Either way: a contradiction-by-arithmetic that will quietly never trigger and rot.

Recommend: align cap with enum cardinality (max 5) OR explicitly document headroom for future kinds.

### 1.6 `.strict()` is documented but its rejection-message contract is not

Req 1.5 / Req 4.5 say "the schema SHALL use `.strict()` mode". The existing project-showcase `linkSchema` (velite.config.ts:252-282) goes further: it specifies a custom `errorMap` for the enum that emits an author-guidance message string. Reqs 3.1 and 4.2 just say "build-time error" without specifying that the error text must name the offending value AND list the valid values. Compare blog-core Req 4.6 which is similarly tight about tag/category errors.

For `kind` and `category` enums — both author-facing — the requirements should mandate the rejection message contract (e.g. "error message MUST include the offending value and the valid enum members"), not leave it to design. Authors will hit this; it's the entire point of using closed enums.

---

## 2. Closed enums vs reality — a future-tax the doc waves at

### 2.1 `links.kind` enum is incomplete in plausible ways

The enum is `pr | commit | issue | release | discussion`. Plausible cases not covered, with concrete examples:

- **Blog post writeup** for a contribution: `release` is the closest but wrong (release ≠ writeup). project-showcase has `writeup` in ITS link kinds (`velite.config.ts:255`) — there's an in-tree precedent the author ignored. Likely use case: a PR Matthew lands, then writes a "what I learned" post about; the post link belongs on the contribution card.
- **Package release**: a PR that ships in `cargo`/`npm`/`pypi` version X.Y.Z. The crates.io / npm / PyPI URL is neither a GitHub release nor a PR. Forcing it into `release` works but smells.
- **GitLab MR / Codeberg patch / Sourcehut**: the doc never says "GitHub-only", but the enum reads GitHub-flavored. `pr` is GitLab's `mr` — same semantic, different forge. Acceptable mapping, but the author doc (Req 8) needs to call it out.
- **Forum thread** (Discourse, mailing list archive): closest is `discussion` but the doc framing implies GitHub Discussions.
- **Slide deck / talk recording**: contribution-flavored but no kind fits.

If the answer is "those don't exist for Matthew, push them down the road", say so. The bigger issue: **the schema enum drives the rendered icon/label** (per Req 3.1's "default-label table"), so adding `writeup` later requires a schema change + a design change + a doc update — three coordinated edits per category. That cost is fine if disclosed; the requirements should disclose it.

### 2.2 `category` enum locks the four steering-doc *examples* as canonical

`product.md` line 55:

> Entries are grouped by category (e.g., "DevOps Tools", "Blogs & Feeds", "Reading", "Fun Stuff").

The parenthetical "e.g." is illustrative. Req 4.2 makes those four the entire universe:

> Initial set: `devops-tools`, `blogs-and-feeds`, `reading`, `fun-stuff`. New categories require a schema update.

There's no "initial" about it — there's no migration path documented; "initial" is a polite fiction unless the doc adds a path. Realistic future categories that don't fit: **Podcasts**, **Newsletters**, **Tools (non-DevOps)**, **Talks**, **Videos**, **Datasets**. Adding any of them is now a schema-change PR; this stacks merge friction onto trivial bookmark adds, which is the opposite of "simple to maintain" (product principle #3).

Reasonable mitigation: keep the closed enum but **document the enum-extension workflow** in the author doc explicitly. The author doc deliverable (Req 8) is silent on this.

### 2.3 Closed enum → typo blocks the whole build

A `category: redaing` typo on one resource entry now fails the build, which fails the deploy, which blocks unrelated changes (blog post, profile edit). This is the documented project-showcase precedent and a reasonable failure mode — but the doc never **acknowledges** the blast radius. The user-facing consequence is: "my YAML typo blocks Matthew's blog deploy." The requirements should explicitly accept this tradeoff (precedent: project-showcase Req 10's tradeoff discussion) and document the "fix forward" runbook (revert the YAML, redeploy).

---

## 3. Sort-order semantics — Req 5.3 is untestable as written

### 3.1 Req 5.3's "preserving YAML-declared order" cannot be done by a pure comparator

Req 5.3:

> Entries WITHOUT `added` sort AFTER entries WITH `added`, preserving their YAML-declared order among themselves. Comparator `byAddedDescTitleAsc` lives once in `src/lib/resources.ts`.

A `(a, b) => number` comparator has no access to the original array index. JavaScript's `Array.prototype.sort` is stable since ES2019, so returning `0` for two entries both lacking `added` preserves their input order — **but only if the input was YAML-declared order**. If the pipeline ever sorts on something else first (e.g., a stable sort by `title` before applying the comparator), order is lost.

Untestable as written. Either:
- Tighten the contract: "the comparator returns `0` for any pair of entries both lacking `added`; callers SHALL pass entries in YAML-declaration order; this MUST be unit-tested with a fixture verifying stable-sort semantics," OR
- Inject the index at parse-time (e.g., add a hidden `_idx` field in a Velite transform) so the comparator can deterministically tiebreak. This is robust but adds schema cruft.

The doc picks neither.

### 3.2 Req 5.3 + Req 4.3 are internally inconsistent on the editorial workflow

Req 4.3:

> `added` (ISO 8601 date ... used as a secondary sort key within category — see Req 5.3). Default: absent.

Req 5.3:

> Entries WITHOUT `added` sort AFTER entries WITH `added`.

So the **default authoring pattern** (omit `added`) is also the **demoted-to-bottom pattern**. If Matthew adds a fresh "I found this last night" bookmark without `added`, it sorts after every dated entry — including ancient ones that DO have `added`. The "what's new" reading order is exactly inverted from intent.

Two cheap fixes:
1. Make `added` required for new entries (mark "Default: absent" as legacy-only).
2. Flip the sort: entries without `added` sort FIRST (treated as "freshly added, not yet dated") or use the entry's git-commit date as a fallback.

Either way the current contract is incoherent. The doc should pick.

### 3.3 Req 2.1 tiebreaker collapses for multi-PR-per-repo-per-day

Req 2.1 sorts by `date` desc then `repo` asc. If Matthew lands two PRs to `prometheus/prometheus` on the same day (realistic — he says "low tens, growing slowly", but bursts happen during a hackathon or sprint), the comparator returns 0. Stable-sort means YAML-declaration-order survives, but the doc never says callers must preserve that. Same issue as 3.1 — fix by adding `title` as a third tiebreak or `links[0].url` as a deterministic final discriminator.

---

## 4. Page rendering, semantics, and a11y — Reqs 2.3-2.5 and 5.4

### 4.1 `<h3>` per card with no `<h2>` on the page violates heading order

Req 2.3:

> The `repo` string rendered as plain text in a heading element (`<h3>`) ... each card has only one heading level — the repo.

There's no `<h2>` mentioned anywhere in Req 2 between the page `<h1>` ("Contributions") and the card `<h3>`s. WCAG 2.1 Success Criterion 1.3.1 (Info and Relationships) plus common interpretation calls this a heading-order violation — h1 → h3 skips h2. Compare project-showcase, where Req 6.9 enforces h2-first within MDX bodies; the analogous concern here is the **gallery's** heading structure.

Two fixes:
- Add an invisible `<h2>` like "Card list" or "Recent contributions" as a screen-reader landmark.
- Promote card titles from `<h3>` to `<h2>`. Visually nothing has to change.

The doc picks neither. Resources has the same issue (Req 5.4 uses `<h2>` per category — fine; but then the contributions page is inconsistent with the resources page's level convention).

### 4.2 Card with multiple links → no card-as-anchor → keyboard tab-stop explosion

Req 2.4 mandates no whole-card-as-link because each card has multiple link destinations. Correct decision. But the consequence is unstated: 30 cards × ~3 links each = ~90 tab stops on `/contributions`. Compare project-showcase which is one card = one anchor (because each card has a "primary" destination, the detail page).

The doc never addresses keyboard navigation strategy. Concrete missing requirements:
- Whether the card itself receives focus (e.g., `tabindex="0"` for visual feedback) — if not, the user has no notion of "I am on card 7 of 30."
- Whether there's a "skip to next card" affordance.
- Whether the links inside a card are grouped (e.g., as a `role="group"` with `aria-labelledby="contrib-N"`) so screen readers announce the card context once.

Resources has the same problem (Req 5.4: each entry = one link, less severe, but still unstated).

### 4.3 Req 5.4 under-specifies entry HTML structure

> each entry is a `<li>` containing: the title as a link (`<a>` with `href=url`, `rel="noopener"`, same-tab) and the description as adjacent text.

"adjacent text" is ambiguous. Three plausible structures:

```html
<!-- A: text node directly in <li> -->
<li><a>Title</a> — Description here</li>

<!-- B: nested <p> -->
<li><a>Title</a><p>Description here</p></li>

<!-- C: nested <span> with em-dash separator -->
<li><a>Title</a> <span>— Description here</span></li>
```

Each reads differently to a screen reader and behaves differently for CSS. Acceptance test "the description appears next to the title" passes for all three but tells you nothing about the correct one. Lock the structure.

### 4.4 Req 2.9 / 5.8 depend on a Pagefind hook that doesn't ship until blog-enhanced

Req 2.9:

> the cards container SHALL be wrapped ... so that the Pagefind crawler from blog-enhanced indexes the contribution text

Two problems:
- **Cross-spec dependency on a sibling that may not exist at the time this spec lands**: the decomposition's recommended order is contributions-and-resources after site-foundation only. blog-enhanced is a separate dependency tree (`blog-core → blog-enhanced`). There is no requirement that blog-enhanced ship before contributions-and-resources.
- **blog-enhanced's Pagefind scope is "blog posts"**: from the decomposition note (line 78), Pagefind uses `data-pagefind-body` to limit indexing to **blog post body**. There is no documented commitment from blog-enhanced to extend the Pagefind crawl to `/contributions` or `/resources` URLs.

So Req 2.9 / 5.8 read as: "this spec ships with a marker that does nothing unless an unrelated future spec extends its scope." That's a defect. Either:
- This spec adds the Pagefind crawl extension (out of scope at decomposition).
- This spec lists the data-pagefind-body marker as **forward-prep, dormant at launch**, and explicitly notes the crawler doesn't index these pages yet.

Currently the requirements imply the indexing works at launch, which it won't.

### 4.5 Req 2.7 / Req 5.6 empty-state messages are untestable

"polite message" is not a contract. Both should specify:
- Approximate text (e.g., "No contributions are listed yet. Check back later.")
- Semantic landmark (`<p role="status">` vs `<section>` with `aria-label`)
- Whether the meta description still resolves (does Next.js render a blank `<meta>` if the curated string isn't set?)

---

## 5. Cross-spec coupling and scope leakage — Reqs 6.2, 8.2, 9

### 5.1 Req 8.2 hides a build script vs. extend-existing decision

> A build-time check (lightweight, similar to `checkProjectHeadings` for projects) SHALL verify that the doc still contains each expected section heading

`checkProjectHeadings` (project-showcase, `src/lib/build/check-project-headings.ts`) checks MDX project bodies, not authoring docs. The proposed analog must be a different mechanism — either:
- A new build script in `src/lib/build/check-authoring-doc.ts` invoked from `velite.config.ts` or CI, with its own tests, OR
- An extension of an existing script (which one? `checkProjectHeadings` operates on MDX content, not docs).

The doc punts with "similar to". An implementer will face a fork-in-the-road and pick one of:
- New script + new test surface + new wiring → more code than the doc implies.
- Vague heuristic with `grep` in CI → fragile and undocumented.

Force the choice in the requirements: name the file, name the trigger, name the failure mode (warning per Req 8.2).

### 5.2 Req 9.1 — hero card placeholders may or may not already exist

> If the existing hero-card data structure already lists these as placeholder routes ... no schema change is needed — only the placeholder is replaced with the real route. If not, this spec adds them.

"If the existing structure already... if not, this spec adds them" — that's two distinct deliverables masquerading as one acceptance criterion. The author can verify NOW whether the hero cards exist (decomposition Decision 1 says they're data-driven and removable; site-foundation must have shipped them as placeholders). This should be a single declarative requirement: "this spec replaces placeholders X and Y" OR "this spec adds new hero card entries A and B".

This affects task estimation, code review surface, and whether landing-page tests change. Don't punt.

### 5.3 Req 9.2 — "top-nav OR landing-page" is two different products

> The top-nav (header) SHALL include direct links to `/contributions` and `/resources`, OR they SHALL be reachable from one click on the landing page.

The "discoverable in one click" criterion is already met by Req 9.1 (hero cards). Mentioning top-nav as a possibility within requirements isn't constraining; it's punting on a UX decision into design. The two outcomes have different implications:
- Top-nav inclusion: changes the site-foundation header component, adds responsive-collapse considerations.
- Landing-page-only: keeps top-nav stable, but `/contributions` is a click away from any non-landing page (e.g., from `/blog/some-post` it's two clicks).

Pick one. If the answer is "design decides", drop Req 9.2 entirely — Req 9.1 already provides the one-click guarantee.

### 5.4 Req 6.2 references a spec that does not yet exist

> The HTML sitemap page (`/sitemap`, owned by the slash-pages spec) SHALL list both pages once it is implemented. **This spec does NOT modify `/sitemap`** — that integration is the slash-pages spec's responsibility.

Two issues:
- The slash-pages requirements have not been written (verified by the absence of `.spec-workflow/specs/slash-pages/`).
- An acceptance criterion that says "another spec will do this" is not a requirement of THIS spec. It's a note. Move it out of Reqs into the Introduction or a "Cross-spec notes" section.

The XML sitemap update (Req 6.1) IS testable here; keep that. The HTML sitemap note belongs in slash-pages's eventual `tasks.md`.

---

## 6. Editorial workflow + NFRs — Reqs 1.4, 4.4, 10, NFR Performance

### 6.1 Reqs 1.4 / 4.4 — error-message structure under malformed required fields

> errors cite "by `repo`/`title` if present, else by array index"

If `repo` is malformed (e.g. a number, or wrong format), the parser has the *raw* value but it doesn't pass the schema. The error message logic must consult the raw input pre-validation. In Zod, that means using `.refine()` on the outer object or a `.transform()` after a relaxed parse — both non-trivial patterns. The project-showcase precedent (`velite.config.ts:252-282`) uses a custom `errorMap` for the enum case but does NOT solve this "error-message-from-raw-on-failure" pattern.

Concretely: a YAML entry like `- repo: 12345 title: bad date: ...` will Velite-fail at the schema layer with Zod's default message "expected string at .repo" — the index identifier hops through the parse failure, but the doc claims "named error citing the offending entry by repo if present". If `repo` failed validation, "if present" is undefined — is the raw value "present"? The doc never says.

Tighten to: "error messages SHALL include the file name AND either (a) the entry index if the validation error is on a required-identifier field, or (b) the validated identifier value otherwise." Force the implementation to handle the asymmetry.

### 6.2 Req 10.4 doesn't address anchor-link breakage

`/resources#cat-reading` is a stable deep link (Req 5.4 / 5.10). If the enum drops `reading` (or renames it `books`), every external link to `#cat-reading` 404s silently — Next.js serves the page, the browser scrolls to nothing. No redirect, no error.

Realistic? Matthew might not link `#cat-reading` from anywhere — but the requirements explicitly call out the deep-link convention as a feature. Either:
- The enum is treated as URL-stable contract → removals require a 301 or a stable anchor synonym. The doc doesn't say.
- The enum is internal → the deep-link convention is best-effort. The doc shouldn't claim deep-linking as a feature.

### 6.3 Req 10.5 — "No draft state" forecloses a realistic workflow

> An entry is either in the YAML (published next deploy) or not. Authors working on an entry locally can hold it in a feature branch.

This is fine for resources. For contributions, there's a realistic case: Matthew lands a PR upstream and wants the contribution card to go live **only when** the related "what I learned" blog post drops two weeks later. With no draft flag, the workflow is:
1. Hold the YAML entry on a feature branch for two weeks.
2. Risk merge conflicts every time `main`'s `contributions.yaml` changes.
3. Coordinate the YAML merge with the blog post's merge.

A `draft: true` flag (parity with `posts` / `projects`) would let him commit the entry, gate visibility, and ship together. The doc forecloses this without acknowledging it. Note that this is EXACTLY the precedent blog-core and project-showcase set. Why does contributions/resources diverge? The doc doesn't say.

If "no draft" is the right call, document why this collection is different. Otherwise add the flag.

### 6.4 NFR Performance — weaker bar than project-showcase

> Lighthouse performance target: 90+ on both pages, verified manually at launch.

project-showcase Req 12 has a documented **re-verification cadence** (verified by recent commit `72462c5` re-tightening the cadence guard) — the showcase project decided manual-at-launch was insufficient. Why is contributions/resources allowed to backslide? Two plausible answers:
- These pages are simpler (no images at launch, no MDX bodies). True for now.
- The cadence guard is the wrong tool for these pages.

The requirements should justify the divergence or copy the showcase pattern. Currently it's just weaker without explanation.

### 6.5 i18n / non-ASCII silence

The schema regexes accept ASCII letters/digits for `repo` (`^[a-zA-Z0-9]...`) but `title` and `description` are unconstrained — fine for Unicode. However:
- `category` slug is kebab-case ASCII (`reading`, `fun-stuff`). What if a category needs an accented term? Not realistic for Matthew (English-only), but worth a single-line statement so future-Matthew doesn't have to re-derive.
- The `repo` regex EXCLUDES underscores at the front of the owner segment: `^[a-zA-Z0-9][a-zA-Z0-9._-]*`. GitHub usernames can start with a hyphen-prefix? Actually no — GitHub restricts but historical accounts may differ. Low risk, but stating "GitHub-compatible owner/name format" would make the regex's intent legible.

---

## Top 5 risks/gaps

1. **`s.yaml()` is invented** (Intro line 16). Velite has no such primitive; YAML is loader-layer. The schema shape `s.array(s.object({...}).strict())` is never specified in Reqs 1-3 or 4. Cost in design phase: hours of false starts. **Fix in requirements, not design.**

2. **Empty file (`""`) is undefined behavior** (Reqs 1.6, 4.6). The doc handles "missing" and "`[]`" but not zero-byte or `null` payloads, which deserialize to `null` and fail schema. Realistic editor mistake; needs explicit handling.

3. **Resource sort order contradicts the editorial workflow** (Reqs 4.3 + 5.3). The DEFAULT pattern for new entries is to omit `added`, but omitted-`added` sorts last. The "what's new" reading order is inverted from authorial intent.

4. **Comparator-based "preserving YAML order" is untestable** (Req 5.3). A `(a,b) => number` comparator has no access to original index. ES2019 stable-sort only preserves order if the caller didn't re-sort first. Lock the contract or inject an index field.

5. **Pagefind hook depends on blog-enhanced extending its crawler scope** (Reqs 2.9, 5.8). blog-enhanced's documented scope is blog posts only; no commitment to crawl `/contributions` or `/resources`. The marker is dormant at launch unless this spec or blog-enhanced ships an explicit Pagefind config extension.

## Top 3 conclusions to challenge or reverse

1. **Drop `s.yaml()` and the implication that it exists.** Replace Intro line 16 with the actual mechanism (built-in YAML loader + `s.array(s.object({...}).strict())` schema). Add an acceptance criterion in Req 1 and Req 4 spelling out the schema envelope. This is a documentation correctness fix, not a design negotiation.

2. **Either drop the "no draft" foreclosure (Req 10.5) or justify it.** Both sibling content collections (`posts`, `projects`) carry a `draft` flag with `PROJECTS_INCLUDE_DRAFTS` / `BLOG_INCLUDE_DRAFTS` env-var gating and dual-layer Vercel-env guards. Diverging from that precedent demands a stated reason. The current rationale ("Authors curate by editing YAML directly") applies equally to `posts` and `projects` and yet they have drafts. If the answer is "these are simpler collections", say so; if there's no good answer, add the flag.

3. **Reverse the resources sort order, OR make `added` required.** The current contract guarantees new entries sort to the BOTTOM by default. Either flip the comparator (no-`added` sorts FIRST, treated as "newest, just added, no date yet") or change Req 4.3 to require `added` on every entry. The current state is incoherent.

## What's missing — work needed before this is acted on

1. **Explicit schema envelope** in Req 1 and Req 4. State: `schema: s.array(s.object({ ... }).strict())`. Reference the project-showcase `linkSchema` pattern (velite.config.ts:252-282) for the per-link sub-schema.

2. **Empty/null YAML handling** acceptance criterion (Reqs 1.6, 4.6).

3. **Schema-error message contract** — what the error message MUST include when a required identifier field (`repo`/`title`) is the one that failed. Resolve Req 1.4 / 4.4 ambiguity.

4. **Heading-order strategy for `/contributions`** — promote card heading to `<h2>` OR add an intermediate landmark. Resolve the WCAG 2.1 SC 1.3.1 implication of `<h1>` → `<h3>` skip.

5. **Keyboard navigation contract** for card-rail multi-link gallery — `role="group"`, `aria-labelledby`, tab-stop strategy. Acceptance test that exercises 30+ cards with screen reader output assertion (or at least keyboard-tab-sequence assertion).

6. **Lock the resources `<li>` internal structure** (Req 5.4) — pick one of the three plausible HTML shapes.

7. **Resolve Pagefind cross-spec dependency**: either commit blog-enhanced to extend crawl scope to `/contributions` and `/resources` (out of this spec), or document that the `data-pagefind-body` marker is forward-prep with no launch-time search functionality.

8. **Author-doc build-check** — name the file (`scripts/check-authoring-doc.ts`?) and the trigger (Velite `prepare` hook? CI step? pre-commit? package.json `scripts.lint`?). Resolve Req 8.2 fork-in-the-road.

9. **Pick a single landing-page integration deliverable** (Req 9.1) — already-placeholder vs. new-card. Verifiable by reading `src/app/(site)/page.tsx` today.

10. **Drop Req 9.2 (top-nav optionality) or commit to it.** Req 9.1 already satisfies one-click discoverability.

11. **Move Req 6.2 (HTML sitemap)** out of acceptance criteria into a cross-spec note. It is not a contribution-and-resources requirement; it is a future slash-pages task.

12. **Performance verification cadence** — either copy the project-showcase Req 12 pattern (post-launch re-verification with a documented schedule and a guard like `task-28-4`'s runs-log entry) or justify the manual-at-launch-only bar.

13. **`links` cap reconciliation** — Req 1.2 says max 6; Req 3.2 uniqueness-per-kind plus a 5-member enum means max effective 5. Pick one number.

14. **Tiebreaker hardening** — add a third sort key to both comparators (`byDateDescRepoAsc` and `byAddedDescTitleAsc`) so multi-PR-per-repo-per-day and same-title-same-`added` cases are deterministic without depending on stable-sort + caller discipline.
