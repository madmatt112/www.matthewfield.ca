# Adversarial Review Memory — requirements
Last updated: 2026-06-01 (after v2/r2 review, preparing v3/r3 review)

## Cumulative Findings Summary

### Accepted
**Round 1 (v1) — all accepted, applied in v2:**
- File locations vs structure.md (manifest/items → project-root `playground/`, `iframeIsolated` flag).
- Client/server boundary + "data + lazy thunks only" manifest invariant.
- Embed double-wrapping + iframe collapse → reset scoped to item surfaces; explicit sizing.
- Missing `dynamicParams = false` → mandated on both segments.
- SEO sitemap/crawl → landing routes in XML sitemap, embeds excluded.
- Chrome-less light-pinned gallery → themed gallery, only items isolated.
- Incomplete test-fallout list → full spike set (invert marker, remove comments, re-audit `applyDarkMode`).
- No leak guard → CI grep added. No `data-testid` mandate → added. Loading/error states → added. Missing preview decision → deferred explicitly. Nested-path CSP test → added.

**Round 2 (v2) — all accepted, applied in v3:**
- **F1 (Compounding/escalated): Layout refactor needed a mechanism, not a rename.** App Router can't skip a parent layout per-child; a `usePathname` conditional would force a client-component layout (breaks SSG). → v3 extracts a shared `<PlaygroundFrame>` server component, removes the wrapper from the group layout, wraps only same-page item surfaces (Decision #9, Req 5.1).
- **F2 (Novel): Spike-vs-refactor hard contradiction.** → v3 firmly removes `/spike` and migrates assertions onto the same-page sample (Decision #7, Reqs 7.2, 10.2). `csp.test.ts` already uses `/playground`.
- **F3 (Novel): `robots.txt Disallow` wrong tool / non-portable / preview conflict.** → v3 drops robots.txt entirely (per-embed `noindex` + sitemap exclusion, matches slash-pages D#3); all Req 8 indexability scoped to production (preview `X-Robots-Tag` on `/(.*)`).
- **F4 (Compounding): Manifest server-import safety.** → v3 tightens Req 1.3 (no top-level `"use client"`/React-runtime/browser-global; cites `sitemap.ts` + `generateStaticParams`).
- **F5 (Recurring/escalated): iframe sizing still not assertable.** → v3 adds an `frame` manifest field available at launch, pins sample sizing, strengthens Req 10.3 (assert width+height, not just ≠150).
- **F6 (Novel): segment-level loading/error vs dual-mode `[slug]`.** → v3 states the boundary covers both modes, catches render-time throws/thunk rejections, not post-hydration handler throws (Req 3.5).
- **F7 (Novel): leak guard conflated `:global` with scoped element selectors.** → v3 narrows to `:global`/global `@import` (Reqs 6.2, 10.6).
- **F8 (Novel): embed-document a11y.** → v3 adds Req 4.6 (`<title>`, `lang`, `<h1>`) + Accessibility NFR.
- **F9 (minor): sample category unnamed.** → v3 pins categories (same-page = interactive canvas/drawing toy; iframe = viewport-fixed/full-bleed visualization).

### Partially Accepted
- (none)

### Rejected
- (none — both rounds were high-quality and grounded; all findings adopted)

### Unresolved
- (none)

## Patterns & Themes
- Recurring meta-pattern across both rounds: **asserting an outcome without mechanizing it** (404 without `dynamicParams`; "refactor the scope" without saying how; "assertable sizing" without a number; "noindex embeds" via the wrong tool). v3 has now pinned mechanisms for each.
- Both reviews verified every claim against the live repo; settled-fine items: CSP regex correctness, no `X-Frame-Options`, M1 fix approach, M2 matrix, manifest-is-code, empty-manifest/unique-slug, file locations (post-v2), client/server boundary (post-v2).
- The document is converging: r1 found a blocking architectural error (structure.md); r2 found two under-mechanized fixes; remaining surface is mechanism precision and small completeness gaps.

## Guidance for Next Review (r3, against v3)
- The big v3 changes to stress-test for **second-order** problems:
  - **`<PlaygroundFrame>` extraction (Decision #9, Req 5.1):** is removing the wrapper from `(playground)/layout.tsx` fully consistent — does anything else (besides `/spike`, now removed) rely on the layout-level container? Does the gallery rendering outside any reset now inherit the root `<body>` styles correctly (it should — it's a normal themed page)? Is `<PlaygroundFrame>` being a server component compatible with wrapping a dynamically-imported client item?
  - **Spike removal (Decision #7):** does removing `src/app/(playground)/spike/` orphan anything — the `spike-overlays.tsx`, the `playground-isolation.test.ts` references, `e2e/spike-summary.txt`? Does migrating assertions to the sample item fully preserve the M2 overlay-containment coverage the spike's overlay matrix provided, or is overlay coverage silently dropped?
  - **`frame` manifest field (Req 4.4):** now the manifest carries sizing data consumed by the host page — is that consistent with "manifest = data only, server-import-safe"? (It is data, so fine — but confirm no contradiction.)
  - **Production-scoping of Req 8:** is there now any internal inconsistency between "gallery indexable (production)" and the XML sitemap always listing it (sitemap is emitted in all envs)? Is the sitemap itself preview-suppressed or not — does listing routes in a sitemap that's served on a noindex preview cause any issue?
  - **Req 8.3 manifest→sitemap:** does deriving landing URLs from the manifest need to filter anything (e.g. should iframe-item landing routes be in the sitemap too)? v3 says all landing routes — confirm that's intended for iframe items whose landing page is a thin shell + description.
- Look for any NEW contradiction introduced by the many v3 edits (cross-reference Req numbers, Decisions, NFRs for drift).
- **Do NOT re-litigate** settled items listed above. If v3 is converged, say so plainly — escalate only genuinely Novel or Recurring (unfixed) issues. This is round 3; the bar for raising a finding is "would materially mislead the design phase."
