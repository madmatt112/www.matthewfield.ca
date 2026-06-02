# Adversarial Review — slash-pages/design (v1)

You are a staff engineer. Your job is to tear apart this document and find every weakness — gaps, ambiguities, contradictions, unstated assumptions, failure modes that have not been considered. Do not validate or support. Use directive framing throughout.

## Target document
/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/slash-pages/design.md

## Analysis approach

Before writing your analysis, read the target document. Then identify **3–6 specific topics, decisions, or sections** to attack — name actual headings, claims, or structures from the document. For each, list **3–5 directive bullets** grounded in the document's concrete content. Frame bullets as directives ("Challenge the claim that…", "Stress-test the assumption that…"), not questions. Do not write generic advice.

**Primary attack surface for this phase:** Feasibility, consistency, edge cases

**Example attack angles to consider:** Conflicts with steering docs, unaddressed failure modes, scaling bottlenecks, missing error paths, alternatives not considered

## Suggested attack dimensions (verify each against live code — cite file:line)

These are starting points; add your own. Read `velite.config.ts`, `src/lib/format-date.ts`, `src/app/(site)/about/page.tsx`, `src/config/site.ts`, `src/app/sitemap.ts`, `scripts/check-authoring-docs.mjs` + `.test.mjs`, `e2e/tests/*.test.ts`, and the in-repo Next.js/Velite/zod versions before asserting anything.

1. **The central `formatContentDate` UTC fix — blast radius and correctness.** The design claims `timeZone: "UTC"` fixes `/now`, `/blog`, `/projects` with a "benign" blast radius. Verify: are there OTHER callers of `formatContentDate` (or its re-exports `formatPostDate`/`formatProjectDate`/etc.) that render a date the author intends in *local* time, not UTC (e.g. a "published at" timestamp, an RSS date, a profile `updatedAt`)? Does `s.isodate()` actually emit `…T00:00:00.000Z`, or could some consumer pass a full datetime where UTC-pinning shifts a real time-of-day? Is the single UTC unit-test assertion really TZ-independent, or does the Vitest runner's `TZ` still leak through `new Date(iso)` parsing of the *date-only* (non-`Z`) `"2026-05-29"` form the test also asserts?

2. **`getNowPage()` return-type assertion.** The design returns `entry as Page & { updated: string }`. Challenge: is `entry.updated` actually typed `string | undefined` after the optional schema field, and does the `as` cast hide a real null at runtime if `s.isodate()` ever yields an empty/edge value? Does evaluating `getNowPage()` at module load run during `next build` page-data collection AND during `generateMetadata`, and could the throw fire at an unexpected time (e.g. during a Velite-less unit import of the route, or before `.velite/` exists on a cold checkout)?

3. **The parameterized `check-authoring-docs` + self-test rewrite.** This was the v3/r3 *blocking* finding for the requirements. Stress-test the design's fix: does changing `checkHeadings(docText)` → `checkHeadings(docText, headings)` break any other caller of the exported signature? Will the "write every managed doc into the fixture dir" approach actually preserve all five CLI assertions — especially "doc missing → no annotation" now that there are TWO docs and the aggregate exit/annotation logic changed? Is `CANONICAL_HEADINGS` still exported with the same meaning the test imports? Does aggregating exit codes across docs change any single-doc test's observed stdout/stderr?

4. **`/sitemap` E2E link-resolution (Req 10.5).** The design asserts every static `/sitemap` link 200s via `page.request.get(href)`. Verify feasibility against `e2e/playwright.config.ts`: are hrefs root-relative so `request.get` resolves against `baseURL`? Will `/contact` (owned by another spec) actually 200 in the E2E server, and is the contact form's CSP compatible with the cleanliness assertion? Does the console/CSP-cleanliness check have a false-positive surface (favicon 404s, next-themes hydration warnings, dev-only React logs, Pagefind index-not-found) that would make it flaky?

5. **Inline-vs-component and config-as-editorial decisions.** The design renders `/sitemap` and `/slashes` inline (no `src/components/*`) and puts slash-page descriptions in typed config. Challenge whether that contradicts structure.md component conventions or the requirements' "Clear Interfaces / exported `SlashPage` type used by both" NFR. Also: does adding `slashPages` to the `SiteConfig` *type* (not just the object) force any existing consumer or test of `siteConfig` to change, and is the literal assignable to the type without a cast?

6. **Scope/requirements fidelity.** Cross-check the design against every numbered requirement and Decision. Find any acceptance criterion with no design home (e.g. Req 7.1 title-template resolution, Req 1.5 image colocation, Req 5.4 `noindex`, NFR external-link `rel`, Req 7.5 canonical), and any place the design silently deviates from or over-builds beyond the deliberately-minimal requirements.

## Closing deliverables
- Top N risks/gaps (3 for short docs, 5 for long)
- Top 3 conclusions to challenge or reverse, with reasoning
- What's missing — work that should be done before acting on this document

Be specific and concrete. Cite failure scenarios, not abstract risks. If something
is actually fine, say so briefly and move on.

## Output
Write your analysis to: /home/mcf/repo/matthew-field.ca/.spec-workflow/specs/slash-pages/reviews/adversarial-analysis-design.md
