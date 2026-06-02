# Adversarial Review — Playground Design (v3, round 3)

You are a principal Next.js / React platform engineer doing the **third and likely final** adversarial pass on a technical design before approval. Deep current (2026) expertise in the Next.js 16 App Router (async `params`, `generateStaticParams`/`dynamicParams`, `next/dynamic` SSR rules, route groups, `_components` private folders, single-root-layout/`<body>`), the CSS cascade (`@layer`, `all: initial`, layered-vs-unlayered, CSS Modules, `color-scheme`), Vitest/Playwright, TS strict, and SSR-prerender failure modes. Find every remaining weakness — **do not** validate. Two prior rounds closed two hard blockers and ten softer findings; your job is to (a) verify the **v3 deltas** actually resolve round 2's findings without introducing new ones, and (b) determine whether the design is genuinely converged or still hiding an implementation-blocking gap. Verify against the live repo (`/home/mcf/repo/matthew-field.ca`, Next 16.2.2 / React 19.2.4).

Target: `/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/playground/design.md`.
Approved requirements (fixed — flag only contradictions): `.spec-workflow/specs/playground/requirements.md`.
Steering: `.spec-workflow/steering/{product,tech,structure}.md`.

## Prior review context

Rounds 1–2 are recorded in the rolling memory file `.spec-workflow/specs/playground/reviews/adversarial-memory-design.md` and the analyses `adversarial-analysis-design.md` (r1) and `adversarial-analysis-design-r2.md` (r2). **Read all three before attacking.**

- **Round 1** found 2 blockers (sync `params`; `expectLabClose` on a real `color`) + F3–F9. All accepted, fixed in v2. Round 2 **verified** every v2 fix landed.
- **Round 2** found no new blocker — three Novel findings (r2-N1 tautological integrity test; r2-N2 SSR-prerender safety of samples; r2-N3 embed body-theming) + two honesty caveats (`[10,10,10]` provenance; `#playground` subpath precedent). All accepted, fixed in **v3** (see the "Revision notes (v3)" section).

Round 2's own bottom line: "v2 fixed everything round 1 raised; what remains is precision on the *new* surfaces … If these four notes are folded in, the design is implementation-ready."

**Your mandate:** classify each finding **Novel** / **Compounding** / **Recurring**. Do **not** re-mine what rounds 1–2 confirmed sound (CSP opt-out, root-layout providers, M1 cascade reality, `@layer` ordering surviving the import relocation, `dynamic(it.load)` typing, theme-toggle coupling, async-params correctness, the `../../_components/` path math, the iframe ratio E2E, `notFound()`/`error.tsx`). Re-examine those **only** if v3 changed them. **If the design is converged, say so plainly — do not manufacture a fourth-round objection to justify the review.** But verify the v3 deltas hard first.

## Analysis dimensions

### 1. Did the v3 deltas actually resolve round 2's findings?
- **r2-N1 (integrity test):** v3 adds `fs.existsSync` that every slug has a `playground/[slug]/index.tsx`, and states a coverage handoff. Verify: (a) does the Vitest test (jsdom, `src/**`) have working `fs`/`path` access and a correct project-root-relative path to `playground/[slug]/index.tsx`? (b) Does checking `index.tsx` existence actually catch the failure r2-N1 named (a *missing embed directory*)? The embed route is a single `[slug]/embed/page.tsx` dir, not per-slug — so item-module existence and embed-dir existence are different things. Does v3's check close the *stated* gap or a different one? (c) Is the handoff sentence honest about what's still only covered by `next build`?
- **r2-N2 (SSR safety):** v3 adds the SSR-prerender constraint to the sample section, Error Scenario 1, and the authoring doc. Verify it's internally consistent and correct: is `dynamic()` SSR really on by default in a server component on Next 16, and is `ssr:false` really illegal there (so there's genuinely "no opt-out")? Does the constraint correctly identify *which* scopes throw (module/render vs `useEffect`)? Is there a subtlety the design still misses (e.g. a `useState` lazy initializer running on the server, or `next/dynamic`'s `loading` prop, or hydration mismatch from the canvas)?
- **r2-N3 (embed theming):** v3 now says the embed inherits root `<body>` theming/fonts/providers but no header/footer chrome. Verify this is consistent everywhere the embed is described (Steering Alignment bullet, embed-route detail, Decision references) — find any remaining "standalone/no-chrome" phrasing that still contradicts the inheritance. Confirm `globals.css:37-40` actually themes `body` as cited.

### 2. Did the v3 edits introduce any NEW inconsistency or error?
- Cross-read the Revision-notes blocks (v2, v3) against the Architecture/Testing/Error-Handling bodies. Find any place where a v3 wording change (the `[10,10,10]` provenance, the alias fallback, the embed reconciliation, the integrity handoff) updated one location but left a stale contradictory statement elsewhere.
- The integrity-test `fs.existsSync` path: trace the actual relative path from the test file location (`src/app/(playground)/playground/manifest-integrity.test.ts`) to a project-root `playground/[slug]/index.tsx`. Vitest runs from the project root (`process.cwd()`), so the check likely uses `process.cwd()` + `playground/${slug}/index.tsx` — confirm the design's wording doesn't imply a test-file-relative path that would be wrong, and that a `.tsx` (vs `.ts`/`.jsx`) assumption isn't brittle.
- The `first-of-kind verification gate` lists `_components`, `next/dynamic`, `#`-subpath alias. Is any *other* first-of-kind mechanism still unlisted (e.g. `error.tsx`/`loading.tsx` at a dynamic segment, or the same-origin `<iframe>` embed pattern)?

### 3. Requirement-coverage convergence sweep
- Pick the requirement acceptance criteria least elaborated in the design and confirm each has a concrete mechanism + test: Req 9.4 (`rel="noopener noreferrer"` on item `target="_blank"`), Req 2.3 (empty gallery state), Req 4.6 (embed `<title>`/`lang`/single `<h1>`), Req 7.4 (sample renders with no leakage, asserted by `data-testid`), Req 10.4 (prod-build Webpack run + Vercel preview re-check). Find any criterion the design only *mentions* without a mechanism or test.
- Confirm the design does not silently drop anything the requirements pin: the `<noscript>` notice (Req 3.5), the M2 authoring decision-rule retirement of the overlay matrix (Req 10.2), the production-scoping of indexability (Req 8), the `data-testid`-not-hashed-class rule (Req 10.3).

### 4. Genuine convergence check
- If, after verifying the v3 deltas and sweeping coverage, the only remaining items are (a) things explicitly deferred to the tasks/implementation phase by design (verify-by-build, exact RGB re-confirm, alias run-check) and (b) cosmetic wording, then **state that the design is converged and implementation-ready**, and list which deferred items the tasks phase must carry forward. Do not invent a structural objection.
- Conversely, if any v3 delta is wrong, incomplete, or introduced a new contradiction, name it precisely with a `file:line`/section citation and a concrete failure scenario.

## Deliverables

- **Top risks/gaps** (as many as are real — likely fewer than prior rounds), each ranked, with a concrete failure scenario, a `file:line`/section citation, and a Novel/Compounding/Recurring tag.
- **Top conclusions to challenge or reverse** (or an explicit statement that none remain).
- **What's missing** before implementation — or an explicit "nothing blocking; carry these deferred items into tasks."

Be specific and concrete. Cite failure scenarios, not abstract risks. If something is fine, say so briefly and move on. A converged verdict is an acceptable and expected outcome of a third round if the evidence supports it — do not pad.

After the analysis, **write the updated rolling memory file** to `.spec-workflow/specs/playground/reviews/adversarial-memory-design.md` (cumulative, round-3 dated), then write your analysis to `/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/playground/reviews/adversarial-analysis-design-r3.md`.
