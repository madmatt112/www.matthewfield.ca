# Adversarial Review — slash-pages/design (v3)

You are a staff engineer. Your job is to tear apart this document and find every weakness — gaps, ambiguities, contradictions, unstated assumptions, failure modes that have not been considered. Do not validate or support. Use directive framing throughout.

## Target document
/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/slash-pages/design.md

## Prior review context

This is review v3. Before attacking the target document:

1. Read the rolling memory file at /home/mcf/repo/matthew-field.ca/.spec-workflow/specs/slash-pages/reviews/adversarial-memory-design.md (it may not exist yet — the file is created/updated by each v2+ review).
2. Read the latest prior analysis at /home/mcf/repo/matthew-field.ca/.spec-workflow/specs/slash-pages/reviews/adversarial-analysis-design-r2.md to understand what was found most recently.
3. Classify each finding you produce as one of:
   - **Novel**: not identified in any prior review.
   - **Compounding**: builds on or deepens a prior finding.
   - **Recurring**: same issue identified before but not yet resolved — escalate severity.
4. Focus on novel and compounding issues. Do not re-discover known findings unless they remain unresolved.
5. After completing your analysis, write an UPDATED memory file to /home/mcf/repo/matthew-field.ca/.spec-workflow/specs/slash-pages/reviews/adversarial-memory-design.md using this format:

```markdown
# Adversarial Review Memory — design
Last updated: <today's date> (after v3 review)

## Cumulative Findings Summary
### Accepted
- <finding>: <brief description, which version identified it>

### Partially Accepted
- <finding>: <brief description, user's stance>

### Rejected
- <finding>: <brief description, reason for rejection>

### Unresolved
- <finding>: <not yet responded to>

## Patterns & Themes
- <high-level observations about recurring issues>

## Guidance for Next Review
- Focus areas based on what's been found
- Areas that have been well-covered and don't need re-examination
```

## Analysis approach

Before writing your analysis, read the target document. Then identify **3–6 specific topics, decisions, or sections** to attack — name actual headings, claims, or structures from the document. For each, list **3–5 directive bullets** grounded in the document's concrete content. Frame bullets as directives ("Challenge the claim that…", "Stress-test the assumption that…"), not questions. Do not write generic advice.

**Primary attack surface for this phase:** Feasibility, consistency, edge cases

**Example attack angles to consider:** Conflicts with steering docs, unaddressed failure modes, scaling bottlenecks, missing error paths, alternatives not considered

## Suggested attack dimensions for v3 (this is the THIRD round — be decisive about convergence)

v1 and v2 findings were all accepted. v3's edits are concentrated in the seven r2 fixes. Your job: (a) verify each v3 fix actually lands against live code, and (b) reach the ground prior rounds did not. If the document has converged, **say so explicitly and stop manufacturing marginal nits** — a third round should distinguish a real remaining blocker from cosmetic polish. Read the live source before asserting.

1. **Did the v3 fixes actually land? (verify, do not re-litigate the originals.)** Confirm against live code, citing `file:line`:
   - The `!/T/.test(updated)` assertion is now in the Req 10.3 seed test, and the refine-rejection rationale is re-scoped to the pages-only refine (not the posts-wide strawman). Is the test's frontmatter-parse actually able to read `updated` as a raw string (YAML parse vs `s.isodate()` transform — the test reads raw `.mdx`, so it sees the author's literal string, good — but confirm the parser the design implies actually yields the raw value, not a `Date`).
   - The Pagefind carve-out is **removed** and the E2E now cites `site-search.tsx:55-83` (dialog-open-only fetch) rather than the axe comment. Verify `site-search.tsx` really gates the fetch on dialog-open and the suite never opens the dialog.
   - The colophon `rel` selector is `http(s)`-only; real `description` strings replace `"…"`; the zero-byte self-test assertion is pinned to ONE form (`=== <subjectDoc>.headings.length`) with the `writeDocs` body shown; the XML line citations are `19-20`; the footer focus-ring source is stated (no global `:focus-visible`).
   - Flag any fix that is **claimed but not actually consistent** across all sections (Revision notes vs Architecture vs Testing Strategy).

2. **The actual seed content does not exist yet (likely the highest-value remaining gap).** `content/pages/` contains only the `about.mdx` placeholder — `now.mdx` and `colophon.mdx` do **not** exist. Stress-test the consequences the design does not call out: the seed-sentinel test (Req 10.2), the `!/T/` test, the `getNowPage()`/`getColophonPage()` module-load throws, and the build itself all go RED until those files are authored with real bodies + (for `now`) a date-only `updated`. Does the design sequence this — i.e. does it make clear that authoring the three MDX files is a prerequisite within this spec, not a downstream assumption? Is there a chicken-and-egg where the tests/build can't pass until content the spec calls "authored by Matthew" exists?

3. **`writeDocs` generalization and the two-doc CI coupling.** The v3 `writeDocs` derives each doc's dir from `rel` via `path.dirname`. Both managed docs live under `docs/`. Challenge whether the helper, the `AUTHORING_DOCS` export, and the production `main(AUTHORING_DOCS)` wiring introduce any real coupling risk (e.g. the contributions self-test now depends on the slash doc's heading set being importable; a change to `SLASH_PAGES_HEADINGS` could turn a contributions-focused test red). Is the `node --test` self-test still hermetic?

4. **Anything genuinely new across requirements/steering the prior two rounds missed.** Examples to probe: the `(site)` shell's baseline client JS vs the "zero added client JS" claim (tech.md notes ~60-85KB Next baseline — is the design's "zero added client JS" wording honest?); the `MDXContent` `new Function(code)(runtime)` eval path and CSP (`/now`/`/colophon` now render real MDX bodies — does the CSP allow the Velite function-string eval, and is that a console/CSP-violation risk the E2E would catch?); whether `dynamic = "force-static"` on `/sitemap` is correct given it reads `getVisiblePublishedPosts()` (draft-guard env reads at call time).

## Closing deliverables
- Top N risks/gaps (3 for short docs, 5 for long)
- Top 3 conclusions to challenge or reverse, with reasoning
- What's missing — work that should be done before acting on this document

Be specific and concrete. Cite failure scenarios, not abstract risks. If something
is actually fine, say so briefly and move on.

## Output
Write your analysis to: /home/mcf/repo/matthew-field.ca/.spec-workflow/specs/slash-pages/reviews/adversarial-analysis-design-r3.md
