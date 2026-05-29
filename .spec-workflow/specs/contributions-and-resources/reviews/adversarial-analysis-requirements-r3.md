# Adversarial Analysis: contributions-and-resources requirements (v3, post-r2)

Source: `.spec-workflow/specs/contributions-and-resources/requirements.md` (v3)
Prior reviews: `adversarial-analysis-requirements.md` (v1), `adversarial-analysis-requirements-r2.md` (v2)
Memory: `adversarial-memory-requirements.md` (state-of-v2)

Method: read v3 end-to-end against the v2 memory's "Guidance for Next Review" focus areas; verified every v3 precedent claim against live source; classified each finding as Novel / Compounding / Recurring per the prompt.

Verification log:
- `velite.config.ts:417-459` — confirmed `prepare(data)` hook signature receives collection-keyed data; confirms v3 Req 8.2's retraction of the v2 `prepare`-hook wiring claim is factually grounded.
- `velite.config.ts:400` — confirmed `checkProjectHeadings` is invoked inside the per-entry `projects` `transform()`, not in `prepare`. v3's footnote text is now correct.
- `src/config/site.ts:33-72` — verified hero-card and nav-item entries for both `/contributions` and `/resources` still exist. v3 Req 9.1's evidence range is still accurate.
- `src/lib/projects.ts:1` and `src/lib/blog.ts:1-4` — confirmed both import from `#site/content` directly. v3 Req 1.8 / 7.4 "exemption already exists" claim is grounded.
- `scripts/` directory listing — confirmed dense `.mjs` script convention (verify-*, check-velite-output.mjs + .test.mjs, etc.). v3's `scripts/check-authoring-docs.mjs` path convention aligns with current precedent.
- `package.json scripts` — confirmed sibling `lint`, `test`, `test:e2e`, `build:search` slots; a `check:authoring-docs` script entry is structurally plausible.
- `.github/workflows/ci.yml` — read end-to-end. The pattern v3 invokes ("alongside `pnpm lint` and `pnpm test`") needs grounding in the actual step ordering (see Finding 4 below).
- `scripts/check-vercel-auto-deploy.mjs:128` and `scripts/warn-no-pagefind.mjs:103` — both use the bare `::warning::<message>` form, NOT the `::warning file=...::` form v3 prescribes. There is NO precedent in this repo for the file-scoped GHA annotation form.
- `.spec-workflow/specs/project-showcase/requirements.md:347` — **the cited "Req 12 pattern" is "every Nth project addition, N=3", NOT a time-based "quarterly" cadence**. v3 Performance NFR cites a quarterly cadence and claims it "mirrors the project-showcase Req 12 pattern" — these are DIFFERENT mechanisms. See Finding 1 below — HIGH-SEVERITY.
- `docs/projects-showcase-lighthouse-runs.md` — confirmed the runs-log file exists and the "append below" convention is operational. v3's reference to "the existing runs-log file convention" is grounded as long as v3 actually plans count-based-not-time-based cadence (which it does not — see Finding 1).
- Commit `72462c5` — verified: it is the cadence-guard parser fix, not the original cadence introduction. v3 cites the commit hash as the "pattern" reference; the commit's actual content is a parser-bug fix, which makes it a strange citation for a pattern reference.

---

## 1. NFR Performance — false-precedent claim about cadence

**Classification**: **Recurring (HIGH-SEVERITY)**.

v3 NFR Performance says: "Re-verified on a documented **quarterly cadence** using the existing site-wide cadence guard infrastructure (see commit `72462c5`'s pattern)."

The cited project-showcase Req 12 mechanism is verbatim: "the Lighthouse check SHALL be re-run on every Nth project addition, with **N = 3** at launch (i.e. after the 3rd, 6th, 9th, … published project)." (`project-showcase/requirements.md:347`). The script at `scripts/check-lighthouse-cadence.mjs` enforces a **count-delta gate**, NOT a time-based gate. The runs-log file structure stores per-run counts, not per-quarter timestamps. The cadence guard fires based on counted project additions; nothing in the existing infrastructure parses calendar quarters.

So v3's "mirroring the project-showcase Req 12 pattern" claim is **structurally false** — it names an existing infrastructure that does not support the cadence semantics v3 wants:
- A quarterly cadence is **time-based**; the existing guard is **delta-based on per-build counts**.
- For "contributions" and "resources" pages, count would be `contributions.length + resources.length` — a viable analog. v3 picked the wrong primitive.
- The cited commit `72462c5` is the **parser-bug fix** to the cadence guard, not the introduction of the cadence mechanism. Pointing at a fix commit as "the pattern" suggests the author didn't verify what `72462c5` actually does.

This is the **same class of error** as v2's `prepare`-hook claim — "same pattern as X" cited without verifying X. Recurring across v2 → v3.

Concrete consequence at implementation time:
- An implementer reading "mirroring the project-showcase Req 12 pattern" will look at `check-lighthouse-cadence.mjs` and find no quarterly logic — they will either (a) invent their own quarterly-timer mechanism, (b) refactor v3 to a count-delta cadence (different semantics from what v3 says), or (c) ship a no-op cadence claim that never actually fires.
- The "documented quarterly cadence" with no implementation is a launch-blocker: there is no CI mechanism to enforce a quarterly retest, only a habit-and-runs-log-doc convention. The existing infrastructure cannot be reused without being rewritten.

Fix options for v4:
1. Switch to a count-based cadence (e.g., "re-verify Lighthouse every 10 added contributions OR every 10 added resources, whichever comes first"). Matches the existing infrastructure pattern; cite `scripts/check-lighthouse-cadence.mjs` and the runs-log doc.
2. Keep the quarterly cadence and explicitly note "no CI enforcement; manually triaged from a calendar reminder." Drop the "mirroring Req 12" claim.
3. Build a real time-based cadence guard (new script, new runs-log, new CI step) — but this is new work, not pattern reuse.

**This finding alone is sufficient to block v3 as-is.** A future review where this is unresolved escalates to a launch-blocker per the prompt's "Recurring after two prior reviews" rule.

---

## 2. Shared Build-Time Error-Message Contract — formatting underspecified for several payload shapes

**Classification**: Compounding (deepens v2 finding 16; v3 centralized but did not fully lock the serialization rules).

v3 moved the contract to a top-level section, eliminating the cross-reference cascade fragility. Good. But the contract introduces new ambiguities the attack-prompt called out:

- **JSON-stringification of non-string values renders ambiguously**. JSON-stringifying the number `42` yields `"42"` — quoted. After the contract's "render its JSON-stringified form" rule, an error reporting "offending value `\"42\"`" is visually indistinguishable from a string offending value of `42`. The implementer needs a custom serializer (e.g., wrap strings in `"…"`, render numbers/booleans/null bare); v3 does not spec this. Acceptable for v3 to defer to design, but the contract should call out "non-string serialization detail" as a design-phase task.

- **80-char truncation doesn't handle multi-line / newline-bearing strings**. A YAML block-scalar description like `description: |\n  line one\n  line two` parses to `"line one\nline two"`. Truncating to 80 chars without stripping/escaping `\n` produces error messages that break terminal output mid-line. Spec a newline-handling rule: either replace `\n` with `\\n` before truncation, OR truncate at the first newline.

- **Identifier-display-eligibility `MIN_DISPLAY = 2`** is arbitrary. The attack prompt noted: `repo: "a/b"` (3 chars, passes) vs `title: "a"` (1 char, fails — falls back to index). Why 2 and not 1? Why not "non-empty after trim"? The 2-char floor reads as "we want to avoid single-char garbage" but a valid resource title COULD be (e.g.) the literal `"Q"` (a known short-form title — `2`-char schema min for resources says no, but contributions' `repo` regex permits 3-char minimum). The `MIN_DISPLAY = 2` is set without engagement with the schema mins (resources `title` is 2–80 after trim; the floor equals the schema min, which means the floor is effectively never triggered for resources unless the value FAILED schema validation on length — but in that case, by the eligibility rule's "AND the validation failure being reported is on a NON-identifier field" clause, the identifier path doesn't apply anyway). The floor is dead code for resources; for contributions, `repo` 1-char would fail schema regex before eligibility evaluates. **The MIN_DISPLAY clause never fires under any valid schema configuration.** Drop it or document its purpose.

- **Extension-point clause is unstructured**. "Future requirements MAY append forge-specific or per-collection guidance" — but no ordering rule (does the appendix come after the enum-members list, or before?), no formatting rule (newline-separated? parenthesized?), no limit. A future Req could insert hints that visually conflict with the core message. Lock the appendix structure: e.g., "Appended guidance MUST follow the enum-members list, prefixed with `Hint: `, one line per appendix."

---

## 3. Req 2.4 — heading swap propagation; sub-line semantic choice; `<span>` vs `<code>`

**Classification**: Compounding (resolves v2 finding 3 by swapping `repo` and `title`, but introduces a new structural-element question).

v3 swapped: `<h2>` carries `title`, `<span class="contrib-repo">` carries `repo`. The swap is good per v2 finding 3.

But:

- The `<span>` choice is unjustified. A repo identifier `prometheus/prometheus` is a code-like string — file/repo path, monospace-formatted in practically every developer-facing rendering. The semantic HTML choice for "this is code-formatted text" is `<code>`. `<span>` is the generic neutral wrapper; `<code>` carries the "this is code" semantic and triggers default monospace rendering across user-agent stylesheets. v3 explicitly leaves "visual styling left to design phase" but locks `<span>` as the structural slot — the half-locked pattern v2 flagged returns. Either lock `<code class="contrib-repo">` (semantically correct, structurally locked) or document why `<span>` is chosen over `<code>`.

- **Screen-reader navigation for the repo sub-line has no anchor**. The card's `<h2 id="contrib-<n>">` carries the title. The `<span class="contrib-repo">` has no id, no aria attributes. A screen-reader user navigating by headings hears titles, fine. A screen-reader user looking for "the repo that contribution X is against" can only get there by navigating into the card body and reading sequentially — there is no heading-jump or landmark route to the repo identity. This is an accessibility regression vs. v2's `repo`-as-heading choice (where the repo was a heading-list landmark). Acceptable tradeoff (titles are the editorial signal) but not called out as one in v3 — should be acknowledged.

- **Visual repetition for same-repo cards**. For sighted users scanning the page, three contributions to `prometheus/prometheus` now show three identical sub-lines: `[Title 1]\n[prometheus/prometheus]\n[date]\n...`, `[Title 2]\n[prometheus/prometheus]\n[date]\n...`, etc. The visual noise is the inverse of the v2 problem (where three identical headings were the issue). v3 doesn't compare. Probably fine — the title differentiates — but worth a one-line acknowledgement.

- **Req 2.10's renumbering**: v3 dropped the v2 "intermediate h2" item entirely; the responsive-breakpoints item moved up to slot 10. The numbering reads consistently — 2.1 through 2.10. Verified no off-by-one.

- **Stable-anchor disclaim is stronger than necessary**. v3 Req 10.6 now says: "the schema MAY change `<n>` for any card on any deploy." This is broader than the originally-motivated "MAY shift when a contribution sorts between two existing ones." Under v3's wording, `<n>` could change for unrelated reasons (e.g., a non-sorting refactor), which makes external `#contrib-3` links effectively useless for any purpose. Either narrow the disclaim to the actual instability cause (sort-position drift) or drop the anchor entirely. Currently the disclaim is "we promise NOTHING about this anchor" which is so loose that maintaining the anchor in the DOM is performative — keep it if the disclaim narrows; drop it if not.

---

## 4. Req 8.2 — CI-script wiring needs ordering, escape rules, and dev/CI asymmetry resolution

**Classification**: Novel (the wiring concept is new in v3; v2's `prepare`-hook claim is retracted).

v3's `scripts/check-authoring-docs.mjs` + `package.json scripts.check:authoring-docs` is structurally sound and matches existing precedent (the scripts/ dir is full of `.mjs` files; package.json scripts already follow this convention). But the requirement is half-locked on three fronts:

(a) **Where in CI does it run?** v3 says "alongside `pnpm lint` and `pnpm test`." Reading `.github/workflows/ci.yml`: the actual step order is **Lint → Format check → Typecheck → Verify getPublishedPosts callers → Unit tests → (Playwright setup) → Verify CI topology → Verify paired-merge → Verify canary↔regex-list → Check velite output self-tests → Verify CI wiring → Build 1**. There is no single "alongside lint and test" slot — there are 11 steps between Lint and Build 1, and the script could plausibly sit at any of:
  - Right after Lint (cheap, fast, fail-early signal).
  - With the other `verify-*` script steps (semantic grouping).
  - After Unit tests (but before Build 1) — but doc drift doesn't depend on build state, so this is wasteful.
  - As part of a pre-Build 1 batch (after the verify-*-paired-merge cluster).

v3 doesn't specify, and "alongside `pnpm lint` and `pnpm test`" is ambiguous given the real workflow. v4 should either name the exact step position OR explicitly say "any position before Build 1; failing early is fine but not required."

(b) **GHA annotation file-path escape rules**. v3 prescribes the format `::warning file=docs/contributions-and-resources-authoring.md::Missing canonical heading: <heading>`. Existing precedent in this repo (`scripts/check-vercel-auto-deploy.mjs:128`, `scripts/warn-no-pagefind.mjs:103`) uses the bare `::warning::<message>` form — NO file-scoped annotations in the repo today. v3's file-scoped form is valid GHA syntax, but:
  - Annotations with a `file=` parameter use `,` as the parameter separator. If a heading string contained a comma (`## Foo, bar`), the comma would terminate the file= parameter or the parser would misinterpret. v3 doesn't enumerate which characters are allowed in heading text.
  - The message body following `::` can contain colons (`## Resource categories: extension workflow`), which is unproblematic per GHA's parser, but v3 should call this out.
  - **The current canonical headings (Req 8.1) do not contain commas or special characters** — so today this is theoretical. But v3 "MAY append" extension-point logic for canonical headings means future additions could break the annotation form silently. Spec the escape rule.

(c) **Dev/CI asymmetry is a footgun**. v3 says: local-dev runs (no `CI` env) print to stderr, exit ZERO. CI runs (with `CI=true`) emit GHA annotation AND exit non-zero. So:
  - Matthew adds a canonical heading to Req 8.1 (the requirements doc) WITHOUT updating `docs/contributions-and-resources-authoring.md`.
  - He runs `pnpm check:authoring-docs` locally: warning to stderr, exit 0. He misses it.
  - He commits. CI fires the script with `CI=true`: it fails. PR blocked.
  - He fixes it. PR unblocked.

This is the **dev/CI silent-fail pattern** the prompt explicitly flagged. The justification ("no friction during local dev for unrelated workflows") is weak: the only consumer of this script is the author doc check; there are no unrelated workflows. Either:
  - Make the local-dev exit also non-zero, OR
  - Document that the script SHOULD be wired into a pre-commit hook (with the same exit behavior as CI) so local-dev divergence is bridged.

Currently v3 ships a path where Matthew can ship a missing heading, see the warning locally, dismiss it, push, and get CI-blocked. This is exactly the friction the dev/CI parity argument tries to avoid.

(d) **Empty-doc-file edge case**. v3 specifies "doc-file-missing → exit 1 + stderr error regardless." It does NOT specify "doc-file-exists-but-is-zero-bytes." An empty file passes the existence check, fails every heading check, and produces the maximum-cardinality warning output. Is that the intended behavior? Either explicitly say "treat zero-byte file as missing" OR enumerate the empty-file branch with the documented exit code.

(e) **Integration test asserts on what, exactly?** v3 says: "a single small CI smoke test exercises the path where the script is invoked from the workflow against the actual `docs/` directory." This is tautological — the CI workflow already invokes the script against the actual `docs/` directory. The "smoke test" would have to either (a) assert on the script's output format / exit code in a controlled scenario (e.g., a fixture doc with a missing heading), OR (b) be redundant with the unit tests + CI invocation itself. Pick one.

---

## 5. Req 4.2 — `added` upper-bound timezone semantics and the contributions/resources asymmetry

**Classification**: Novel (v2 raised the upper-bound gap; v3 added the `.refine()` but the refine introduces its own edge cases).

v3 added `.refine((d) => new Date(d) <= now())` with build-start `now()`. The "negligible" caveat is too quick:

- **Timezone-shift failure**. An ISO date `2026-05-29` parses to `2026-05-29T00:00:00.000Z` (midnight UTC). Matthew adds an entry at 19:00 Eastern (= 00:00 UTC May 29 ≈ Vercel build kickoff time variance). If the build runs at 00:05 UTC on May 29, an entry `added: 2026-05-29` parses as May 29 00:00 UTC, build start is May 29 00:05 UTC, so `2026-05-29 <= 2026-05-29 00:05` → passes. But if the build runs at 23:55 UTC on May 28 (Matthew's "today" is May 28), an entry `added: 2026-05-29` (because Matthew is using his local "tomorrow" rolling over) would parse as May 29 00:00 UTC, build start May 28 23:55 UTC → FAILS, even though Matthew's wall-clock said "today is May 29." The "negligible" caveat doesn't engage with timezone semantics — Vercel deploys are in UTC, Matthew is in a non-UTC timezone, and the failure mode is "I added today's entry and it failed because UTC says it's tomorrow." v4 should specify the comparison anchor more precisely (e.g., "comparison uses the build's UTC date, with no timezone offset; author dates are treated as UTC midnight"), and explicitly accept this can produce surprise failures around UTC midnight.

- **Future-date intent rejected without consideration**. A resource that becomes interesting on a specific future date (a conference scheduled for 2026-11-12, an embargoed launch) cannot be pre-seeded with the eventual `added` date. v3 frames the future-date rejection as "prevents AI-tool hallucinations" — fair, but the no-pre-seeding consequence isn't called out. The asymmetry with contributions (Req 1.2 `date` can be a not-yet-merged PR submission date, future-allowed) is real and editorially defensible (resources are "when I added this"; contributions are "when this happened or will happen") but the spec doesn't flag the asymmetry. One-line acknowledgement would close this gap.

- **Build-time non-determinism**. `now()` evaluated at schema build means the schema's `.refine()` callback closes over a value that changes every build. This is fine for a one-shot CI build but matters for caching: a Velite layer that caches `.refine()` results between builds would silently re-pass entries that previously failed. v3 doesn't engage with whether Velite caches refine results (it doesn't, currently); the fragility is forward-compat against a future caching layer. Acceptable, but call it out — same way Req 2.4's anchor disclaim does.

---

## 6. Empty-state structure — text-lock vs revision-allowance contradiction

**Classification**: Recurring (Compounding) — v2 had this same problem (intermediate h2 text + visibility punted); v3 re-introduces it for empty-state text.

v3 Reqs 2.9 and 5.7 lock the literal text: `"No open-source contributions are listed here yet. Check back soon."` and `"No bookmarks are listed here yet. Check back soon."`. Both paragraphs are immediately followed by "or near-identical author-revised wording."

This is the same half-lock v2's intermediate h2 had. Either:
- Lock the text exactly. Test fixtures can pin literal phrasing. Future revisions go through requirements amendments.
- Lock ONLY the structural skeleton (h1, h2, p), and let the page component own the actual prose. Test fixtures assert structure not phrasing.

"Or near-identical revision" is the worst-of-both — tests cannot pin the literal text (the hedge defeats that), and the spec gives the false impression of locked text (the literal string is named). A future review will re-discover this if v4 keeps it.

Forward-compat risk: when the page is populated, the heading structure is `<h1>Contributions</h1>` → cards' `<h2>`. When empty, `<h1>Contributions</h1>` → empty-state `<h2>No contributions yet</h2>`. Both branches use `<h2>` for different semantic purposes. If a future requirement re-introduces a "card list" `<h2>` (which v3 explicitly removed for accessibility reasons), the symmetry breaks. Flag as a forward-compat watchpoint.

v3 also dropped one v2-era clause: "the meta description SHALL still resolve" for the empty state no longer specifies whether the meta description text is the same as the non-empty case. v2 said "use the same curated string as the non-empty case"; v3 says only "the meta description SHALL still resolve." A test cannot assert on whether the empty-state branch uses the same string as the populated branch — v3 silently weakened the contract. Either re-add the "same curated string" requirement or accept that empty-state meta text is unspecified.

---

## 7. Category-enum extension friction underspecified

**Classification**: Novel (the prompt explicitly raised this; v3 doesn't address it).

The closed-enum tradeoff for `category` is acknowledged across v1/v2/v3. The enum is 4 members today (`devops-tools`, `blogs-and-feeds`, `reading`, `fun-stuff`). Plausible near-term additions Matthew has signaled in product steering: `podcasts`, `newsletters`, `tools-non-devops`. Each addition is a 3-file change (schema, label map, author doc) per the documented extension workflow.

Three friction concerns v3 doesn't engage with:

(a) **Typo-blast-radius at higher cardinality**. Today: 4 categories. At 12 categories, a YAML edit has a meaningfully nonzero per-edit typo probability. The error message contract surfaces the offending value and the parenthesized valid-enum list — but at 12 members, the parenthesized list is long and visually busy. A CI-only "did you mean?" hint (Levenshtein distance ≤ 2 from a valid member) would dramatically reduce typo-fix friction at low implementation cost. v3 accepts the typo-blast-radius without engaging with mitigation.

(b) **Category-rename anchor breakage**. Req 10.6 disclaims `/resources#cat-<slug>` URL stability. But Req 4.2 says renaming a category is a schema change + label-map change + author-doc change. v3 doesn't acknowledge a fourth concern: external deep-linkers to the OLD slug get nothing — no 404 redirect, no soft fallback. This is consistent with Req 10.6's disclaim, but the rename workflow should explicitly call out "external `#cat-<old-slug>` links will silently no-op" as an expected outcome of the rename PR.

(c) **Category-add cadence guidance**. v3 doesn't document the expected addition cadence (one per quarter? one per year? unbounded?). If the enum grows to 15+ members, the page's category-section layout (Req 5.4: each category is a `<h2>` section, sections stack vertically) becomes a vertical wall. The Reqs don't engage with what "too many categories" looks like or when the closed-enum model becomes the wrong choice.

---

## 8. Acceptance-test pinnability — one surviving ambiguity

**Classification**: Recurring (matches the v2 pattern).

Stress-test v3 acceptance criteria for binary pass/fail testability:

- Req 2.3's "directly inside `<main>`" — testable via DOM query. ✓
- Req 2.9 / 5.7's "or near-identical author-revised wording" — NOT testable as written (see Finding 6 above).
- Req 4.2's "no optional fields" — testable via schema introspection. ✓
- Req 8.2's GHA annotation format — testable via stdout-capture test (the unit test list includes this case). ✓
- Req 5.5's `<ul>/<li>` structure with `<a>` + `<p class="resource-note">` — testable via DOM. ✓
- Req 2.4's "code-styled `<span class="contrib-repo">`" — partially testable (DOM check for the span); styling is design-phase. The half-lock returns; see Finding 3.

The surviving untestable hedges are the "or near-identical" pattern (Finding 6) and the "design phase finalizes the table" defaults for `kind` labels (Req 3.1) — both are accepted ambiguity but should be acknowledged in v4 as "out of acceptance-test scope, owned by the page component."

---

## 9. Cross-document consistency — Req 9.1 line-range claim

**Classification**: Novel (the attack prompt explicitly asked to verify the `src/config/site.ts:33-72` claim).

Verified at review time: lines 33-72 of `src/config/site.ts` contain the `navItems` and `heroCards` arrays with `/contributions` and `/resources` entries. v3's claim is currently accurate.

**Forward-compat risk**: Req 9.1 cites a line range, not a stable anchor. Any edit to `src/config/site.ts` that shifts line numbering invalidates the citation without invalidating the underlying claim. Future requirements documents shouldn't cite line numbers — cite the symbol name (`siteConfig.navItems`, `siteConfig.heroCards`) which is stable across line reordering.

Minor recommendation: v4 should drop the `:33-72` suffix and cite by symbol. Not a launch-blocker.

---

## Classification Summary

- **Recurring (HIGH-SEVERITY)**: 1 (false-precedent claim on cadence, Finding 1)
- **Compounding**: 3 (error-message contract gaps, heading-swap sub-line semantics, dev/CI silent-fail) — Findings 2, 3, 4
- **Novel**: 3 (timezone semantics, category-enum friction, line-range citation) — Findings 5, 7, 9
- **Recurring**: 1 (empty-state text half-lock) — Finding 6
- **Recurring (acceptance-test)**: 1 (Finding 8 — the half-lock pattern surviving in v3)

The **single recurring high-severity finding** (Finding 1) is the same class of error as v2's `prepare`-hook claim — citing existing infrastructure as "the pattern" without verifying that the infrastructure supports the semantics being claimed. **Two consecutive reviews surfacing the same class of error escalates to a launch-blocker** per the prompt's "Recurring after two prior reviews" rule.

---

## Top 5 risks / gaps

1. **NFR Performance cites a "quarterly cadence" that no existing infrastructure enforces** (`requirements.md:350` vs. `project-showcase/requirements.md:347` count-based, vs. `scripts/check-lighthouse-cadence.mjs` count-delta). The cited Req 12 "pattern" is count-based, not time-based. This is the **same class of false-precedent claim as v2 finding 5** (the `prepare`-hook claim). **Recurring HIGH-SEVERITY — launch-blocker.**

2. **Req 8.2 dev/CI asymmetry is a silent-fail path** (`requirements.md:291-292`). Local-dev exits 0 on missing heading; CI exits non-zero. Matthew can ship a missing heading after seeing the local warning and dismissing it. **Compounding.**

3. **Req 4.2's `added` upper-bound has unaddressed UTC-timezone semantics** (`requirements.md:187`). Wall-clock "today" in non-UTC timezones can land in the future per UTC; entries fail the refine even when the author's local date matches. **Novel.**

4. **Empty-state text half-lock returns** (`requirements.md:142` for contributions, `requirements.md:221` for resources). "Or near-identical author-revised wording" defeats literal-text acceptance tests; same pattern as v2's intermediate-h2 half-lock. **Recurring.**

5. **Shared error-message contract under-specifies serialization for non-string + newline-bearing values** (`requirements.md:65`). JSON-stringified numbers render with quotes, visually indistinguishable from quoted strings; multi-line string values may break terminal output mid-line on truncation. **Compounding (Novel sub-aspects on serialization).**

---

## Top 3 conclusions to challenge or reverse for v4

1. **Replace the "quarterly cadence" claim with a count-based cadence** (e.g., "every 10 added contributions or 10 added resources, whichever comes first") that ACTUALLY reuses `scripts/check-lighthouse-cadence.mjs`'s mechanism. Drop the commit `72462c5` citation — it's a parser-fix commit, not a pattern introduction. Closing this avoids escalating Finding 1 to a recurring-recurring (3rd-review) launch-blocker.

2. **Force the empty-state text decision**: either lock the literal text and require tests to assert on it, OR drop the literal text from requirements entirely and document "page component owns empty-state copy; acceptance test asserts only h1 + h2 + p structure." "Or near-identical revision" is the worst-of-both option; v4 must pick one.

3. **Resolve the Req 8.2 dev/CI asymmetry** — either upgrade local-dev to also exit non-zero on missing heading (the script's only purpose is the author-doc check; there are no "unrelated local workflows" to protect from friction), OR require a pre-commit hook integration so the local-dev divergence is bridged. The current state ships the friction the asymmetry is supposed to avoid.

---

## What's missing — work needed before v4 is acted on

1. **Replace the "quarterly cadence" framing entirely** in NFR Performance. Cite the actual mechanism (count-based, every-N-additions) and the actual reuse path (`scripts/check-lighthouse-cadence.mjs`, runs-log doc convention).

2. **Specify GHA annotation escape rules** for the `::warning file=...::<heading>` form: at minimum, document that canonical headings MUST NOT contain commas (the file= parameter separator); document newline handling (or assert headings are single-line by construction).

3. **Specify where in `ci.yml` the new step runs** — name the position (e.g., "between the Verify-canary step and Build 1") OR explicitly say "any position before Build 1."

4. **Specify the non-string serialization detail** for the shared error contract (numbers/booleans/null rendered bare; strings rendered with explicit quotes; or pick a different unambiguous form).

5. **Specify newline handling** for the 80-char truncation rule (replace `\n` with `\\n` before truncation, or truncate at first newline).

6. **Lock or drop the empty-state literal text**. Pick one.

7. **Resolve the Req 8.2 dev/CI asymmetry**. Pick one.

8. **Document UTC-timezone semantics for the `added` refine** (acknowledge the wall-clock-vs-UTC failure mode; specify the comparison's timezone anchor).

9. **Cite `src/config/site.ts` by symbol, not by line range** (Req 9.1).

10. **Drop or document the `MIN_DISPLAY = 2` clause** in the identifier-display-eligibility rule. As analyzed, no valid schema configuration triggers the floor (the floor is dead code).

11. **Choose `<code>` or document why `<span>`** for the `contrib-repo` sub-line in Req 2.4. `<code>` is the semantic match for a code-formatted identifier; v3 left `<span>` locked without engaging with the alternative.

12. **Acknowledge the `added`-future-block / `date`-future-allowed asymmetry** between resources and contributions, with one line of editorial rationale. The current asymmetry is defensible but uncalled-out.

13. **Document expected `category` enum cadence and the `category`-rename external-link consequence** (Finding 7). Optional: add a Levenshtein "did you mean?" hint to the error message for category typos at cardinality > 8.
