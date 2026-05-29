# Adversarial Review: contributions-and-resources requirements (v3, post-r2)

You are a senior staff engineer specializing in shipping content-driven static sites in Next.js + Velite, paired with an accessibility / semantic-HTML reviewer reflex and a product-manager allergy to "we'll figure it out later." Your job is **not** to validate this document. Your job is to **tear it apart** — find every gap, contradiction, untestable acceptance criterion, every place where v3's tightening pushed the friction sideways or introduced fresh ambiguity. v1 caught the surface; v2 deepened to ARIA semantics, false precedent claims, and identifier asymmetries. **v3 is the last revision before this document is committed to.** The bar is "what would a hostile reviewer flag in a public design-review meeting where you don't get to revise."

Read the target document in full before starting:
`/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/contributions-and-resources/requirements.md`

## Prior review context

This is review v3. Before attacking the target document:

1. Read the rolling memory file at `/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/contributions-and-resources/reviews/adversarial-memory-requirements.md`. It catalogues v1 and v2 findings (accepted, partially accepted, rejected, unresolved) and ends with explicit "Guidance for Next Review" focus areas. It also has a "Severity escalation log" at the bottom — the v2 Req 8.2 wiring issue was high-severity.
2. Read the v2 analysis at `/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/contributions-and-resources/reviews/adversarial-analysis-requirements-r2.md`. Know what v2 already found so you do not waste cycles re-discovering.
3. **Classify each finding you produce** as:
    - **Novel** — not identified in v1 or v2.
    - **Compounding** — deepens a v1 or v2 finding (e.g., v2 said "card heading should be `title` not `repo`"; v3 swapped them, but maybe the `repo` sub-line now has its own a11y bug).
    - **Recurring** — same issue as v1 or v2, NOT actually fixed in v3. **Severity ESCALATES** — recurring findings after two prior reviews are launch-blockers.
4. Focus on novel and compounding issues. **Do not re-discover already-resolved findings** unless they remain unresolved in v3.

After completing the analysis, update the memory file at `/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/contributions-and-resources/reviews/adversarial-memory-requirements.md` to reflect v3 review state.

Read these to ground your attack in the project's actual constraints:
- `/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/product.md`
- `/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/tech.md`
- `/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/structure.md`
- `/home/mcf/repo/matthew-field.ca/.spec-workflow/spec-decomposition/decomposition.md`

Verify against live code (especially v3's precedent claims — v2 review caught one that didn't exist):
- `/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/project-showcase/requirements.md`
- `/home/mcf/repo/matthew-field.ca/velite.config.ts` (verify the v3 Req 8.2 wiring claim that decouples from Velite)
- `/home/mcf/repo/matthew-field.ca/src/lib/projects.ts`
- `/home/mcf/repo/matthew-field.ca/src/lib/blog.ts`
- `/home/mcf/repo/matthew-field.ca/src/config/site.ts:33-72` (verify the hero-card / nav-item claim still holds)
- `/home/mcf/repo/matthew-field.ca/package.json` (verify a `scripts.check:authoring-docs` slot is plausible alongside existing scripts)
- The existing CI workflow under `.github/workflows/` (verify the GHA annotation format `::warning file=...::...` is consistent with how other CI annotations are emitted)

## Attack Dimensions

### 1. The new "Shared Build-Time Error-Message Contract" section

- v3 added a top-level "Shared Build-Time Error-Message Contract" section that Reqs 1.4, 3.1, and 4.4 reference. Verify that the cross-reference cascade fragility from v2 finding 16 is actually resolved, or whether the centralization just moved the fragility (now Req 1.4 is a wrapper around the shared section, with its own additional clauses — does the shared section + Req 1.4's local additions ever conflict?).
- The contract introduces the "identifier-display-eligibility rule" with `MIN_DISPLAY = 2` chars after trimming. Stress-test: what happens for a contribution with `repo: "a/b"` (exactly the minimum length per the regex `^[a-zA-Z0-9]...`)? `"a/b"` is 3 chars, passes the eligibility. But what about a resource with `title: " a  "` — after trim it's `"a"` (1 char), which fails the 2-char floor; the message falls back to array index. Is this what v3 intended? The 2-char floor seems arbitrary.
- The contract says "If the offending value is a string longer than 80 chars, truncate to 80 with a `…` suffix." How does this interact with multi-line strings or strings containing newlines (e.g., a YAML block-scalar `description`)? The 80-char truncation doesn't address line-break handling, which can mangle terminal-displayed error messages.
- The contract says "render its JSON-stringified form" for non-string offending values. JSON-stringifying a number gives `"42"` — quoted — which is now visually identical to a quoted string. The implementer will need a custom serializer. Spec the serializer or pick a different unambiguous form.
- The "extension point" clause says future requirements MAY append forge-specific or per-collection guidance. But there's no mechanism for ordering or formatting the appendix. A future requirement could insert hints that contradict an earlier requirement's hints. Lock the appendix structure.

### 2. Req 8.2 — the new CI-script wiring

- v3 swapped Velite-`prepare`-hook wiring for a `package.json` `scripts.check:authoring-docs` invoking `node scripts/check-authoring-docs.mjs`. Verify the script path is consistent with the project's existing convention (does `scripts/` exist? does it already contain `.mjs` files? compare to `src/lib/build/check-project-headings.ts` which is `.ts` under `src/lib/build/`, NOT under `scripts/`). v3 picked a different location convention than the existing precedent. Justify or align.
- v3 says the script runs in CI "alongside `pnpm lint` and `pnpm test`." Verify that pattern matches the actual `.github/workflows/` setup. If CI runs `pnpm lint && pnpm test && pnpm build` and the new script needs to slot in, where does it go in the ordering? Before build (catches drift before deploy) or after (informational)? v3 is silent.
- The GHA annotation format `::warning file=docs/contributions-and-resources-authoring.md::Missing canonical heading: <heading>` is plausible but unverified. Annotations have known parsing quirks — the heading value MAY contain colons (`## Resource categories` does not, but a future addition might). Are colons escaped? Are line breaks legal in the message body? Spec the escape rules.
- The local-dev behavior (no CI env → exit 0, warning to stderr) creates a silent-fail path. If Matthew runs `pnpm check:authoring-docs` locally and forgets a heading, he sees a warning, the exit code is 0, his pre-commit hook (if any) doesn't fire. The check passes locally and fails in CI — exactly the dev-vs-CI divergence pattern that's frustrating to debug. Pressure-test the dev/CI asymmetry.
- The unit test list is "all-headings-present → exit 0; one-heading-missing-with-CI-true → exit 1 + GHA annotation; one-heading-missing-with-CI-unset → exit 0 + warning; doc-file-missing → exit 1 + stderr error regardless." Missing case: what if the doc file exists but is empty (zero bytes)? Empty file passes the "file exists" check but fails every heading check. Is the behavior the same as missing? v3 is silent.
- The "integration coverage" line says "a single small CI smoke test exercises the path where the script is invoked from the workflow against the actual `docs/` directory." This is half-locked — what does the smoke test assert? The smoke test in CI tests "CI does the right thing in CI" which is tautological unless it asserts on specific log output or exit codes.

### 3. Heading-slot swap and the new sub-line slot (Req 2.4)

- v3 swapped the card heading from `repo` to `title`, with `repo` rendered as a `<span class="contrib-repo">` sub-line. Verify the swap is fully propagated:
    - Req 2.6 says the link rail's `aria-labelledby="contrib-<n>"` points at the card heading. With the heading now being `title`, the rail's accessible-name context is the contribution title — good. But Req 2.4 says the heading carries `id="contrib-<n>"`. Where is the `<span class="contrib-repo">` anchored for screen-reader navigation? If the repo identity is a visual sub-line with no semantic landmark, screen-reader users have no way to navigate to a specific contribution by repo. Acceptable tradeoff or gap?
    - Req 2.10's previous "responsive breakpoints" was numbered as the 10th item; verify v3's renumbering (with one item dropped between 2.9 and the responsive breakpoints) is consistent — is "Responsive breakpoints" now Req 2.10? The doc says 2.10 but verify there's no off-by-one.
- The visual styling of the repo sub-line is "left to design phase; the structural slot is locked." This is the half-locked pattern v2 review flagged. The structural slot is `<span class="contrib-repo">` — but is `<span>` the right element? A `<code>` would semantically indicate the repo identifier is a code-like string. v3 picks `<span>` without justification.
- Repo identity as a sub-line means three contributions to the same repo (which was v2's argument FOR `title` as heading) no longer appear identical in the heading-jump nav. Good. But for visually scanning the page (sighted, non-AT user), the page now reads: [Title 1] [repo X] [date], [Title 2] [repo X] [date], [Title 3] [repo X] [date] — three identical sub-lines stacking. Is this visually noisier than three identical headings? v3 doesn't compare.
- Stable-anchor disclaim: Req 2.4 says `#contrib-<n>` is unstable per Req 10.6. But Req 10.6's actual disclaimer text says "the schema MAY change `<n>` for any card on any deploy." That's stronger than "MAY shift when a new contribution is added that sorts between two existing ones" — it implies `<n>` could change for any reason, on any deploy, without semantic cause. Is that the intent? If so, the anchor is effectively useless for any deep-link purpose.

### 4. Empty-state structure (Reqs 2.9, 5.7)

- v3 replaced `<aside role="status">` with `<section aria-labelledby="empty-state-heading">` containing `<h1>` (page) → `<h2 id="empty-state-heading">` (empty state) → `<p>` (explanatory). Verify the heading-order chain: `<h1>Contributions</h1>` → `<h2>No contributions yet</h2>` — two h2s on the empty page (the empty-state h2 and... wait, no card h2s exist when empty, so only one h2). Fine.
- But when the page is POPULATED, the structure is `<h1>` → `<h2 id="contrib-0">First contribution title</h2>` → next card's `<h2>`. When empty, it's `<h1>` → `<h2 id="empty-state-heading">No contributions yet</h2>`. Both structures use `<h2>` for different purposes. Acceptable, but a future Req that adds a "card list" `<h2>` (the one v3 just removed in Req 2.3) would break the symmetry. Note this as a forward-compat risk.
- v3 mandates the literal text "No open-source contributions are listed here yet. Check back soon." but the same paragraph also says "or near-identical author-revised wording" — locking and unlocking in the same sentence. Test fixtures cannot assert on the exact phrasing if "near-identical revision" is allowed. Same problem v2 had with the intermediate h2 text.
- Req 2.9 says "the meta description SHALL still resolve" but doesn't specify what the meta description IS in the empty state. Same curated string as the non-empty case, per v2's wording — but v3 dropped this. Now the meta description is unspecified for the empty branch.

### 5. The `added` upper-bound `.refine()` and edge cases (Req 4.2)

- v3 added `.refine((d) => new Date(d) <= now())` with `now()` = build-start timestamp. Stress-test:
    - **Timezone**: ISO 8601 dates without time components (`2026-05-28`) parse to midnight UTC. If the build runs at 23:55 UTC on May 28, an entry with `added: 2026-05-28` parses as May 28 00:00 UTC and passes — fine. If the build runs at 00:05 UTC on May 29, an entry with `added: 2026-05-29` parses as May 29 00:00 UTC and fails (5 minutes before build start). Matthew adding an entry at his local time of "today" (e.g., May 28 in Eastern time when UTC is already May 29) could trip this. The "negligible" caveat in Req 4.2 doesn't engage with the timezone failure mode.
    - **Future-date-as-intentional**: if Matthew wants to seed an entry for a resource that becomes interesting on a future date (e.g., a conference that hasn't happened), the refine blocks it. The "no future dates" rule is universal but may not always serve.
    - Compare to the `date` field on contributions (Req 1.2): contributions can be future-dated (representing PRs not yet merged). The asymmetry between `contributions.date` (future-allowed) and `resources.added` (future-blocked) is editorially defensible but should be called out.

### 6. The `category` enum is still tied to four steering-doc examples (Reqs 4.2, 10.6)

- The category enum (`devops-tools`, `blogs-and-feeds`, `reading`, `fun-stuff`) hasn't changed across v1, v2, or v3. The closed-enum tradeoff is acknowledged. But Req 10.6 says category renames break `/resources#cat-<slug>` deep links — and the four-category set is overwhelmingly likely to grow. Three concrete additions Matthew has talked about in product steering: Podcasts, Newsletters, Tools-non-DevOps. Each addition is a schema change + label-map change + author-doc change PR. That friction is fine for occasional additions; document the expected cadence in the author doc OR plan for the enum to grow to a manageable bound (10? 15?) before any rebalancing.
- Req 4.2 says category typos break the entire build. v3 still accepts this on project-showcase precedent. But project-showcase's `status` enum has 3 members; resources' `category` enum will plausibly grow to 8–12. Typo-blast-radius scales with enum size — at 12 categories, the probability of a typo per YAML edit is meaningfully nonzero. Should v3 add a CI-only "did you mean?" suggestion (Levenshtein distance ≤ 2) to the error message?

### 7. Acceptance-test pinnability

- Stress-test which v3 acceptance criteria can be turned into automated tests with binary pass/fail outcomes:
    - Req 2.3's "directly inside `<main>`" — testable via DOM query.
    - Req 2.9 / 5.7's "near-identical author-revised wording" — NOT testable as written.
    - Req 4.2's "no optional fields" — testable via schema introspection.
    - Req 8.2's GHA annotation format — testable via stdout-capture test.
    - Req 5.5's `<ul>/<li>` structure with `<a>` + `<p class="resource-note">` — testable via DOM.
    - Req 2.4's "code-styled `<span class="contrib-repo">`" — partially testable (DOM check for the span; styling is design-phase).
- v3 has tightened many ambiguities but the "or near-identical" hedge on empty-state text is the surviving ambiguity. Force the choice: either lock the text exactly OR document that the page component owns the text and the acceptance test verifies the structural slot only.

### 8. Cross-document consistency between v3 and the project-showcase precedent

- v3 NFR Performance says quarterly cadence "mirroring the project-showcase Req 12 pattern" and references commit `72462c5`. Verify the actual project-showcase Req 12 still says "quarterly" (not monthly, not bi-annual) and that the runs-log file convention v3 refers to actually exists in the repo. If `72462c5`'s state has been changed in subsequent commits, v3's reference is stale.
- v3 Req 9.1 verifies `src/config/site.ts:33-72` from v2. v3 may carry the same line range but the file may have changed. If the range is now wrong, the requirements doc has stale evidence.

## Closing Deliverables

After running the analysis:

1. Write your findings to `/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/contributions-and-resources/reviews/adversarial-analysis-requirements-r3.md`. Classify every finding as Novel / Compounding / Recurring. Recurring findings escalate severity.

2. Update the memory file at `/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/contributions-and-resources/reviews/adversarial-memory-requirements.md`. Move every v2 unresolved finding into one of Accepted / Partially Accepted / Rejected based on v3's response. Add v3 findings to Unresolved. Update Patterns & Themes and Guidance for Next Review. Keep the Severity escalation log entries.

3. Conclude with:
    - **Top 5 risks/gaps** — concrete, with file/section references, classified.
    - **Top 3 conclusions to challenge or reverse** — what should v4 rethink.
    - **What's missing** — work that should be done before v4 is acted on.

Be specific and concrete. Cite failure scenarios. Pad nothing. No praise. The bar: "what a hostile reviewer flags in a public design-review where you can't revise on the spot."
