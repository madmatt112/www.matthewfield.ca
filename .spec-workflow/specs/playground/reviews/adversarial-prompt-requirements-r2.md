# Adversarial Review — Playground Requirements (v2, round 2)

You are a principal frontend architect with deep, scar-tissue experience shipping Next.js App Router applications: route groups, **nested layouts**, dynamic route segments, `generateStaticParams`, `dynamicParams`, `next/dynamic`, server/client component boundaries, CSS cascade layers (`@layer`), CSS Modules, Turbopack-vs-Webpack divergence, static `robots.txt`/sitemap generation, iframe sandboxing, and Content-Security-Policy.

Your job is to **tear this document apart**. This is the **second round** of review on a requirements doc that was substantially revised after round 1. Do not validate it. Do not praise it. Focus your fire on **new problems introduced by the v2 changes** and on anything the v2 author asserted as resolved but didn't actually mechanize. Where the document is genuinely fine, say so in one line and move on.

## Context you must read first

- The target document: `.spec-workflow/specs/playground/requirements.md` (now v2 — read its "Revision notes (v2)" and "Decisions" sections to see what changed)
- The steering docs, especially `.spec-workflow/steering/structure.md` (route-group split, module boundaries, embed-route prose at line 277, the project-root `playground/` tree) and `.spec-workflow/steering/tech.md` (CSP, bundler divergence)
- The spike outcome: `.spec-workflow/specs/site-foundation/spike-results.md`
- The **actual code** — verify the v2 author's NEW claims against reality:
  - `src/app/(playground)/layout.tsx` (currently wraps ALL `(playground)` routes in `.playground-container` — v2 says this must be refactored)
  - `src/app/layout.tsx` (the shared root layout — confirm where the theme/font providers live)
  - `src/styles/playground.css`, `src/styles/globals.css`
  - `src/app/sitemap.ts` (v2 says feed the manifest into it — check whether importing a manifest of client-component thunks into this build/server module is safe)
  - `next.config.ts` (the preview-deploy `X-Robots-Tag: noindex` block — check consistency with the new `robots.txt` requirement; confirm static export / output mode)
  - any existing `robots.txt` or robots route (v2 says there is none — confirm, and check how robots.txt would be generated: static `public/robots.txt` vs `app/robots.ts`)
  - `e2e/tests/csp.test.ts`, `e2e/tests/playground-isolation.test.ts`
  - `src/app/(playground)/spike/` (does the layout refactor break this fixture?)

## Prior Review Context

Round 1 (against v1) found 10+ issues; **all were accepted and applied in v2**. The cumulative record is in `.spec-workflow/specs/playground/reviews/adversarial-memory-requirements.md` — read it. In summary, v1's findings (now FIXED in v2, do not re-discover them) were: file locations vs structure.md, client/server boundary + manifest invariant, embed double-wrapping + iframe collapse, missing `dynamicParams = false`, SEO sitemap/crawl issues, chrome-less light-pinned gallery, incomplete test-fallout list, no leak guard, no `data-testid` mandate, loading/error states, missing preview decision, nested-path CSP test.

**Already verified fine in r1 (do NOT re-litigate):** the CSP negative-lookahead regex correctly excludes all three playground paths; no `X-Frame-Options: DENY` exists; the M1 unlayered-typography fix matches the spike's recommendation; the M2 overlay matrix is faithful; the manifest-is-code decision is sound; the empty-manifest and unique-slug checks are well-formed.

**Classify every finding** as:
- **Novel** — not raised in round 1; a genuinely new issue (ideally one the v2 changes introduced).
- **Compounding** — builds on / deepens a round-1 finding that v2 only partially resolved.
- **Recurring** — a round-1 issue v2 claims to have fixed but did NOT actually fix (escalate severity).

Spend your effort on Novel and Recurring. If v2 genuinely closed a round-1 issue, do not re-raise it.

## Attack dimensions (focused on v2's new surface)

### 1. The layout refactor — the single biggest new claim (Decision #9, Req 5.1, 2.2, 4.3)

- v2 says `.playground-container` must wrap **only same-page item render surfaces**, not the gallery and not the embed route, and that the existing blanket `(playground)/layout.tsx` "must be refactored." But all three route types (`/playground`, `/playground/[slug]`, `/playground/[slug]/embed`) live under the **same** `(playground)` route group with **one** `layout.tsx`. Challenge whether this selective wrapping is even achievable without restructuring the route groups. In App Router a single segment layout wraps all its children; you cannot conditionally skip it per-child. Does v2 implicitly require a new route-group split (move the gallery to `(site)`, items to a nested layout, or the reset down into the same-page item host component) — and if so, is that restructuring stated as a requirement or hand-waved as "design decides"?
- If the reset moves out of `layout.tsx` into the `[slug]` same-page render path, does the existing `/spike` fixture (which relies on the layout-level container) break? Decision #7 says the spike "may be removed" — but Req 10.2 says isolation regression coverage "must not regress." Stress-test whether retaining the spike fixture and doing the refactor are mutually compatible, or a latent contradiction.
- v2 Req 2.2 puts a **themed** gallery in the `(playground)` group. Confirm the theme provider is in the shared root layout (so this works) — then challenge: does the gallery now need site nav/header to be genuinely "themed and navigable," and if it deliberately omits them (Req 2.4 only requires a back-link + theme toggle), is that a coherent middle state or an awkward half-chrome page?

### 2. Manifest → sitemap → server/client import hazard (Req 8.3, 1.3)

- v2 Req 8.3 requires `src/app/sitemap.ts` to import the manifest and derive landing-route URLs. The manifest's entries contain `() => import("./[slug]")` thunks pointing at **client components** (`"use client"` `index.tsx`). `sitemap.ts` runs in a build/server context. Challenge whether importing the manifest module into `sitemap.ts` is safe: even though the thunks are lazy, the manifest module itself is evaluated. If the manifest imports anything client-only at the top level, this breaks the build. Is the "data + lazy thunks only" invariant (Req 1.3) sufficient to guarantee `sitemap.ts` can import it cleanly? Is there a missing requirement that the manifest be free of any `"use client"`/React-runtime top-level dependency?

### 3. robots.txt mechanism and consistency (Req 8.4)

- v2 mandates a `robots.txt` with `Disallow: /playground/*/embed`. Verify the repo has no robots mechanism today. Then challenge the **mechanism**: Next App Router generates robots via `app/robots.ts` (a `MetadataRoute.Robots`) or a static `public/robots.txt`. `robots.txt` `Disallow` does **not** universally support `*` wildcards mid-path — wildcard support is a Google/Bing extension, not part of the original standard. Is `Disallow: /playground/*/embed` actually going to match `/playground/foo/embed` across crawlers, or is the pattern wrong/non-portable?
- Consistency: `next.config.ts` already sets `X-Robots-Tag: noindex, nofollow` for ALL routes on preview deploys. Does the new per-embed `robots.txt`/`noindex` requirement interact correctly with that, or is it redundant/conflicting in preview vs production? Is the production-vs-preview distinction addressed at all?
- A `robots.txt` `Disallow` on the embed *prevents crawling* — but the embed is loaded as an iframe `src` by an indexable landing page. Does disallowing the embed in robots.txt cause "indexed page loads a blocked resource" warnings, or interfere with Google rendering the landing page for indexing? Probe the second-order effect, and whether `noindex` (via `X-Robots-Tag`/meta, which still allows fetch) vs `Disallow` (blocks fetch) is the right tool here — they are not interchangeable.

### 4. iframe sizing rule — is it actually testable now? (Req 4.4, 7.3)

- v2 replaced "sensible default size/aspect" with "width 100% of content column, a default min-height or aspect-ratio, overridable per item via the manifest **in a later iteration**." Challenge: "overridable in a later iteration" means at launch every iframe item shares one fixed height regardless of content. Is that acceptable for the iframe SAMPLE (Req 7.3), which is supposed to demonstrate viewport-escaping behavior? A fixed-height iframe clips viewport-unit content. Is the sizing rule still under-specified for a doc that just claimed to make it "assertable"? What exactly does the E2E (Req 10.3) assert — that height ≠ 150px? That is a weak assertion that a broken layout could still pass.

### 5. Loading/error/dynamicParams interaction with the dual-mode `[slug]` segment (Req 3.2, 3.5, 4.5)

- Req 3.5 adds a `loading` state + `error` boundary for same-page items via segment files under `[slug]/`. But the same `[slug]` segment serves BOTH same-page (inline) and iframe (renders an `<iframe>`) items. Does a single `[slug]/error.tsx`/`loading.tsx` correctly cover both modes, and is a loading state meaningful for the trivially-fast iframe-shell render? Is there a mismatch between "segment-level loading/error" and "behavior branches on `iframeIsolated` inside the same segment"?
- `dynamicParams = false` everywhere: confirm the doc never elsewhere implies items can be added dynamically (it says client-side, code-defined — probably consistent, but verify no contradiction between "easy to extend" and the build-time-frozen param set).

### 6. Residual scope / completeness / new ambiguities

- Req 7.3 says design must "name the specific" iframe sample so the implementer doesn't invent scope — but the requirements doc itself still doesn't name either sample, nor even the *category*. Is deferring the concrete sample to design acceptable, or should requirements pin at least the category to be verifiable?
- The CI leak guard (Req 10.6) greps `playground/**/*.module.css` for "`:global` or unscoped global selector." Challenge the conflation: a bare element selector inside a CSS Module (e.g. `div { … }`) is **scoped by CSS Modules** and does NOT leak globally — only `:global(...)` actually escapes. So "fails if it contains an unscoped global selector" is ambiguous and risks false positives on legitimate element selectors. Is the guard over-broad, or should it target `:global` specifically?
- Accessibility: Req 4.4 gives the iframe a `title`, but is there a requirement that the embed *document* inside the iframe has its own `<title>`, `lang`, and a single `<h1>`? An embedded document with no title is an a11y gap that the host iframe `title` does not cover.

## Deliverables

Conclude with:
- **Top 5 risks/gaps**, ordered by severity, each with a concrete failure scenario — labeled Novel / Compounding / Recurring.
- **Top 3 conclusions to challenge or reverse**, with reasoning grounded in code/steering.
- **What's missing** — work to do before design.

Be specific and concrete. Cite failure scenarios, not abstract risks. If v2 genuinely resolved something, say so in one line. Do not re-discover round-1 findings.

Write your complete analysis to: `.spec-workflow/specs/playground/reviews/adversarial-analysis-requirements-r2.md`
