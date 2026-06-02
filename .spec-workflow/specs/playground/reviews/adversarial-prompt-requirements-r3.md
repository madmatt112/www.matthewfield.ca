# Adversarial Review — Playground Requirements (v3, round 3)

You are a principal frontend architect with deep App Router scar tissue: route groups, nested layouts, server/client component composition, dynamic imports, `generateStaticParams`/`dynamicParams`, CSS cascade layers + CSS Modules, Turbopack↔Webpack divergence, sitemaps/robots, and iframe isolation.

This is the **third and likely final** round of review on a requirements doc that has already absorbed two rounds of findings. Your job is to find anything that would **materially mislead the design phase** — genuinely new problems, or prior findings the v3 author claims fixed but didn't. Do not re-litigate settled issues. Do not invent nitpicks to look thorough. If the document has converged, **say so plainly and stop** — a clean "this is ready for design" is a valid and valuable round-3 outcome. Spend effort only where there is real risk.

## Context you must read first

- The target document: `.spec-workflow/specs/playground/requirements.md` (v3 — read "Revision notes (v3)" and the Decisions section).
- The cumulative review memory: `.spec-workflow/specs/playground/reviews/adversarial-memory-requirements.md` — this lists everything found in rounds 1-2 (all accepted) and what is **settled / must not be re-litigated**.
- `.spec-workflow/steering/structure.md` (route-group split, embed prose line 277, project-root `playground/` tree) and `.spec-workflow/steering/tech.md`.
- The **actual code**, to verify v3's NEW claims:
  - `src/app/(playground)/layout.tsx`, `src/app/layout.tsx`, `src/styles/playground.css`, `src/styles/globals.css`
  - `src/app/(playground)/spike/page.tsx`, `src/app/(playground)/spike/spike-overlays.tsx`, `e2e/tests/playground-isolation.test.ts`, `e2e/spike-summary.txt` (what does removing the spike orphan?)
  - `src/app/sitemap.ts`, `next.config.ts`, `e2e/tests/csp.test.ts`

## Prior Review Context (do NOT re-discover)

Rounds 1-2 found ~19 issues; **all were accepted and applied** (round 1 in v2, round 2 in v3). Settled and verified-fine — **do not raise again**: file locations vs structure.md, client/server boundary, "data + lazy thunks only" + server-import-safe manifest invariant, `dynamicParams = false`, CSP regex correctness, no `X-Frame-Options`, M1 unlayered-typography fix, M2 matrix, empty-manifest/unique-slug checks, the chrome-less→themed gallery decision, the `robots.txt` removal, production-scoping of indexability, the leak-guard narrowing to `:global`, the iframe `frame` sizing field, embed-document a11y, named sample categories.

The recurring meta-pattern flagged across both rounds was **"asserting an outcome without mechanizing it."** v3's job was to mechanize the two under-specified v2 fixes (the layout refactor and iframe sizing). Your highest-value task is to check whether v3's mechanisms are actually sound and complete, and whether the large number of v3 edits introduced any **new contradiction or drift**.

**Classify each finding:** Novel (new), Compounding (deepens an unfixed prior point), or Recurring (a prior fix that v3 botched — escalate). Skip anything already settled.

## Attack dimensions (v3's new surface only)

### 1. The `<PlaygroundFrame>` extraction (Decision #9, Req 5.1, NFR Single Responsibility)

- v3 removes `.playground-container` from `(playground)/layout.tsx` and re-homes it into a shared `<PlaygroundFrame>` **server component** that wraps only same-page item surfaces in `[slug]/page.tsx`. Verify this composes: a server component (`<PlaygroundFrame>`) wrapping a dynamically-imported **client** item is fine in App Router — but confirm the doc's own client/server story (Req 3.1) stays consistent now that the wrapper is a separate component rather than the layout.
- With the wrapper gone from the layout, the **gallery** and **embed** routes render with no `.playground-container` at all. Does anything in the current code besides `/spike` depend on the layout-level container existing on every `(playground)` route? Check `playground.css`, `globals.css` (`@layer playground` ordering), and whether `color-scheme: light` / token re-declaration being absent from the gallery is actually what v3 wants (the gallery is supposed to be themed — so yes — but confirm no token resolves to undefined on the gallery).
- Does `(playground)/layout.tsx`, once it no longer wraps in the container, still have a reason to exist (it currently imports `playground.css`)? If the layout becomes a near-empty pass-through, is there an unstated question about whether `playground.css` should be imported by `<PlaygroundFrame>` instead? Flag only if it would mislead design.

### 2. Spike removal — orphans and lost coverage (Decision #7, Req 7.2/10.2)

- v3 removes `src/app/(playground)/spike/` and migrates isolation assertions onto the same-page sample. Check what the spike currently covers that the sample must reproduce: `playground-isolation.test.ts` reads `data-testid="playground-container"` and several `spike-*` descendants, AND `spike-overlays.tsx` exercises the **M2 overlay-containment matrix** (Dialog/Popover/Tooltip/Select/DropdownMenu portal behavior). Does v3's sample-item migration (Req 7.2 mentions `data-testid` hooks for isolation, Req 3.6 mentions M2 per-item) actually preserve the **overlay-containment** regression coverage, or is that silently dropped when the spike goes? If dropped, is that acceptable (overlays are now a per-item authoring choice, not a guaranteed-present fixture) or a coverage gap the requirements should name?
- Does removing the spike orphan `e2e/spike-summary.txt` or any cross-reference the requirements still cite (Req 5.3 cites `spike-summary.txt:365-398` for the `applyDarkMode` re-audit)? Confirm the artifacts Req 5.3 depends on survive spike removal.

### 3. Sitemap / production-scoping consistency (Req 8.1-8.3, Decision #6)

- v3 scopes indexability to production but the **XML sitemap is emitted in all environments** (`sitemap.ts` runs at build regardless of env). So on a preview deploy the sitemap lists `/playground` + item routes while `X-Robots-Tag: noindex` is applied to everything. Is that an actual problem (a noindex'd sitemap is harmless; bots ignore it on preview) or fine? Decide — don't just raise it.
- Req 8.3 says add **all** `/playground/[slug]` landing routes to the sitemap, including iframe items whose landing page is a thin shell + description (Req 4.1/8.5). Is listing the thin iframe-landing in the sitemap consistent with v3's own anti-thin-content reasoning, or mildly self-contradictory? Confirm the title+description text (Req 4.1) is enough to make the landing non-thin for sitemap purposes.

### 4. New contradictions / drift from the many v3 edits

- Cross-check Req numbers, Decisions, and NFRs for drift introduced by v3's edits. Specifically: does any requirement still say "wrapped in `.playground-container`" for the gallery (it shouldn't after Decision #9)? Does Req 2.2 (gallery uses shadcn `Card`) still hold now the gallery is themed and outside the reset (Card needs site tokens — which it now has, good — confirm)? Does the `frame` field (Req 4.4, Shared Definitions) appear consistently, and is it clearly iframe-only?
- Req 3.5 vs Req 4: the `[slug]` segment's single `loading.tsx`/`error.tsx` covers both modes. Does any other requirement contradict that (e.g. Req 4 implying the iframe host is a different segment)? Confirm the host route and the same-page route are the **same** `[slug]/page.tsx` branching on `iframeIsolated`.
- Is the `<noscript>` requirement (Req 3.5) sensible for an iframe-mode landing (whose visible content is server-rendered title/description + an iframe that itself needs JS only if the embed does)? Minor — flag only if genuinely confusing.

### 5. Final completeness sweep

- Is there any acceptance criterion in v3 that is still **not testable** (vague verbs, no observable outcome)? Name them or confirm none remain.
- Is there a missing requirement that a *non-trivial* design would need and that neither round surfaced (e.g. how the gallery's "back to site" + theme toggle chrome is shared/implemented; whether the playground appears in the site nav at all; build-time behavior when an item module's dynamic import fails at build vs runtime)? Raise only if it would block or mislead design.

## Deliverables

Conclude with:
- **Top risks/gaps** (up to 5; fewer is fine if the doc has converged), each labeled Novel/Compounding/Recurring with a concrete failure scenario.
- **Conclusions to challenge or reverse** (up to 3; "none — converged" is acceptable), with reasoning.
- **What's missing** before design — or an explicit statement that nothing material remains.

Be specific and concrete. Cite failure scenarios, not abstract risks. If v3 has converged and is ready for the design phase, say so directly. Do not manufacture findings.

Write your complete analysis to: `.spec-workflow/specs/playground/reviews/adversarial-analysis-requirements-r3.md`
