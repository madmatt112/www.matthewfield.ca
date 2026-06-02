# Adversarial Review — slash-pages/design (v2)

You are a staff engineer. Your job is to tear apart this document and find every weakness — gaps, ambiguities, contradictions, unstated assumptions, failure modes that have not been considered. Do not validate or support. Use directive framing throughout.

## Target document
/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/slash-pages/design.md

## Prior review context

This is review v2. Before attacking the target document:

1. Read the rolling memory file at /home/mcf/repo/matthew-field.ca/.spec-workflow/specs/slash-pages/reviews/adversarial-memory-design.md (it may not exist yet — the file is created/updated by each v2+ review).
2. Read the latest prior analysis at /home/mcf/repo/matthew-field.ca/.spec-workflow/specs/slash-pages/reviews/adversarial-analysis-design.md to understand what was found most recently.
3. Classify each finding you produce as one of:
   - **Novel**: not identified in any prior review.
   - **Compounding**: builds on or deepens a prior finding.
   - **Recurring**: same issue identified before but not yet resolved — escalate severity.
4. Focus on novel and compounding issues. Do not re-discover known findings unless they remain unresolved.
5. After completing your analysis, write an UPDATED memory file to /home/mcf/repo/matthew-field.ca/.spec-workflow/specs/slash-pages/reviews/adversarial-memory-design.md using this format:

```markdown
# Adversarial Review Memory — design
Last updated: <today's date> (after v2 review)

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

## Suggested attack dimensions for v2 (focus on the deltas — verify against live code, cite file:line)

v1's findings were all accepted; v2's edits are concentrated in the areas below. Attack the **fixes**, not the already-resolved originals. Read the relevant source (`scripts/check-authoring-docs.test.mjs`, `velite.config.ts`, `src/lib/format-date.ts`, `e2e/playwright.config.ts`, `e2e/tests/blog-axe.test.ts`, `src/app/layout.tsx`) before asserting.

1. **The authoring-doc date-only rule as the SOLE mitigation (Revision notes v2 §1, "## Page frontmatter contract").** v2 rejected a schema refine and relies entirely on a prose authoring rule to prevent a time-of-day in `updated`. Challenge: is a documentation rule actually sufficient given Decision #1 already concedes Matthew may forget to bump the date? If an author pastes `2026-05-29T18:30:00-04:00`, nothing fails — the build succeeds and `/now` silently shows the wrong day. Was rejecting the refine the right call, or does "field addition only" (Req 4.1) actually permit a non-mutating `.refine` that rejects a `T` in the string without changing the stored value? Stress-test whether the unit test or seed-sentinel could cheaply catch a time-bearing `now.mdx`.

2. **The literal diff spec for the self-test rewrite (Architecture → CI authoring-doc check).** v2 replaced loose prose with an enumerated spec. Re-verify it against the *actual* `check-authoring-docs.test.mjs`: does the per-doc `writeDocs` helper description actually map onto the existing `writeDoc`/`ALL_PRESENT`/`runScript` structure, or did v2 introduce a NEW inconsistency while fixing the old? Is the "choose contributions as the zero-byte subject so the count stays 9" reasoning sound, or does it secretly hardcode a fragile coupling? Does the corrected report-all `main()` actually keep the "doc missing → no annotation" assertion green when BOTH docs are absent (two stderr lines)?

3. **The new E2E additions (Testing Strategy → E2E).** v2 added `toHaveTitle(/\| matthewfield\.ca$/)`, a colophon `rel` assertion, and Pagefind/error-level carve-outs. Challenge each as a NEW flake or correctness risk: does `toHaveTitle` resolve before client title-mutation settles? Is "external `<a>` where host ≠ site host" a reliable way to find colophon external links (what about protocol-relative or mailto links)? Is the Pagefind-index-404 "substring filter" specified precisely enough to not also swallow a real error? Does the `(site)` shell actually mount a search trigger on these pages, or is the carve-out guarding a non-existent risk (over-mitigation)?

3b. **Internal consistency after v2 edits.** v2 touched many sections. Hunt for any surviving contradiction between the Revision-notes summary, the Architecture body, the Error Handling table, and the Testing Strategy — e.g. a claim in one section that another now contradicts, or a Req cited in the notes but missing from the body.

4. **Requirement coverage r1 did not reach.** r1 focused on the date fix, the self-test, the E2E, and three NFRs. Cross-check the requirements r1 did NOT scrutinize: Req 8.2/8.4 (footer `/about`+`/now` placement, focus states, both themes), Req 5.3 (empty-state vs omit for zero posts/projects — which does the design actually pick?), Req 5.1 (the mandated explicit Home link), Req 7.3 (component-page metadata description sourced in code — is a real description specified or left as `"…"`?), Req 6.2 (the exact six-href set in the config literal).

## Closing deliverables
- Top N risks/gaps (3 for short docs, 5 for long)
- Top 3 conclusions to challenge or reverse, with reasoning
- What's missing — work that should be done before acting on this document

Be specific and concrete. Cite failure scenarios, not abstract risks. If something
is actually fine, say so briefly and move on.

## Output
Write your analysis to: /home/mcf/repo/matthew-field.ca/.spec-workflow/specs/slash-pages/reviews/adversarial-analysis-design-r2.md
