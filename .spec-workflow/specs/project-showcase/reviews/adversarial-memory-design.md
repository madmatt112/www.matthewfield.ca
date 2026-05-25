# Adversarial Review Memory — design
Last updated: 2026-05-25 (after v3 review)

## Cumulative Findings Summary

### Accepted (closed by v3)
- **v1 Risk 1 → v2 per-tag modifiers → v3 two-div pattern**: Layout primitive flipped to outer/inner two-div with media-escape CSS rule. v3 closes the per-tag enumeration concern; new mechanism opens math/geometry concerns (see Unresolved).
- **v1 Risk 2 / v2 Attack 2 — stderr noise per call**: v3 added module-scope `Set<string>` memoization (`__warnedDraftSlugs`) with `__resetWarnedDraftSlugs()` test reset. Closes the per-call duplication for single-process builds (multi-worker case raised fresh in v3 — see Unresolved).
- **v2 Attack 4 — blog vs. projects guard asymmetry**: v3 backported the `VERCEL_ENV=development` narrowing to `src/lib/blog-errors.ts` (Component 15 + Component 5). Closed.
- **v2 Attack 1 — iframe zero-height under wide-media rule**: v3 added `aspect-ratio: 16/9` default to the iframe rule. Closed; author doc §6 documents the inline-style override.
- **v2 Attack 3 — `isContentSpecifier` policy unspecified**: v3 specified exact equality `=== "#site/content"`. Sub-path imports out of scope. Closed.
- **v2 Attack 3 — canary fixture mutation safety**: v3 added regex-pattern assertions in the canary test before invoking scanner. Closed.
- **v2 Attack 2 — `getProjectBySlug` body unspecified**: v3 specified body as `getPublishedProjects().find((p) => p.slug === slug) ?? null`. Closed (semantic specification); v3 review raises new cost concern (see Unresolved).
- **v2 Attack 2 — `next.config.ts` could kill Vitest**: v3 added `VITEST` gate (Component 15). Closed at the gate level; the *prevention* layer (preventing import in the first place) remains doc-only — see Unresolved.
- **v2 Attack 2 — `VERCEL=1` precondition / non-Vercel deploy**: v3 documented as Vercel-only scope with a Deferral (#11). Accepted as scope limit.
- **v2 Attack 3 — destructure-through-alias bypass**: v3 documented in coverage matrix as out of scope + author doc §9. Accepted as scope limit.
- **v2 Attack 3 — computed-string destructure bypass**: v3 documented in coverage matrix as out of scope + Deferral #12. Accepted.
- **v2 Attack 4 — parity-test triangle missing third edge**: v3 added the `formatPostDate === formatProjectDate` assertion. Closed (though v3 review questions whether the third edge adds value beyond transitivity).
- **v2 Attack 4 — error message wording for unknown env**: v3 changed wording to "production-or-unknown" with `VERCEL_ENV` interpolation. Closed.
- **v2 Attack 5 — CSS import location ambiguity**: v3 picked the per-route layout (`src/app/(site)/projects/layout.tsx`, Component 16). Closed.
- **v2 Attack 5 — inline SVG `viewBox` requirement**: v3 documented in author doc §6. Closed.
- **v2 Attack 6 — empty-state fixture purpose unclear**: v3 clarified as documentation-only artifact next to the literal `vi.mock(...)`. Closed (though discoverability raised fresh in v3 review).
- **v2 Attack 6 — E2E N-count env-coupling**: v3 documented the dual-build CI controls the env consistently. Accepted; v3 review notes the mechanism for "expected N" is still unstated.
- **v2 Attack 7 — Velite version-pin operator unenforced**: v3 added `pnpm-overrides` exact pin (Component 17). Mechanism closed but RATIONALE is wrong (see Unresolved).
- **v2 Attack 7 — `s.path()` return value uncited**: v3 cited declaration near line 6897 of `node_modules/velite/dist/index.d.ts`. Closed.
- **v2 Attack 1 — `prose-picture:` may not exist**: v3 removed from class list; `<picture>` styled via the `media-escape` CSS rule directly. Closed.
- **v2 Attack 1 — `>` direct-child combinator misses nested wide-media**: v3 switched to descendant selector; documented trade-off. Closed (caveat: `<figure>` now ALSO escapes — see v3 Attack 1).
- **v2 Reversal 3 — `dynamicParams = false`**: v3 removed. `notFound()` from `getProjectBySlug() === null` is the 404 path. Closed.

### Partially Accepted
- **v2 Attack 4 — parity-test triangle**: v3 added the third edge as requested. v3 review notes the assertion is transitively redundant; consider replacing with a `toString()`-body-identity test for stronger guarantee.

### Rejected
- (None explicitly rejected in v3.)

### Unresolved (raised in v3 review, not yet responded to)
- **v3 Risk 1 — `translate-X(-50%)` math is wrong relative to nested-container geometry**: `margin-left: 50%` references the immediate `.prose` parent (~700px), not the outer container (1024px). `max-width: min(100%, var(--outer-width, 1024px))` falls back to 700px because `--outer-width` is never declared and `100%` inherits the narrow parent. The wide-media element never spans 1024px in practice. **Novel, critical.**
- **v3 Risk 2 — `pnpm-overrides` rationale factually wrong**: pnpm does not hoist transitively to violate root `package.json`. The override is a no-op safety net adding maintenance cost. A plain exact pin + `--frozen-lockfile` is the entire enforcement. **Novel, high.**
- **v3 Risk 3 — multi-worker memoization**: module-scope `Set<string>` is per-process; Next.js forks workers; warning emit is N × W, not N. **Novel, medium.**
- **v3 Risk 4 — `getProjectBySlug()` O(N×M) filter+sort cost**: every detail page calls it twice; each call runs the full filter+sort. **Novel, low at current scale.**
- **v3 Risk 5 — `__resetWarnedDraftSlugs` leaks test-only export into production module**: scanner doesn't enforce naming conventions; production code can call it. **Novel, medium.**
- **v3 Attack 3 — `next.config.ts` test-import prevention is doc-only**: VITEST gate is a safety net; the audit ("verify Vitest doesn't import next.config.ts") is one-shot human discipline. **Novel, medium.**
- **v3 Attack 3 — named-import contract drift between `next.config.ts` and `*-errors.ts`**: future `content-errors.ts` unification will rename exports; no contract test today. **Novel, low.**
- **v3 Attack 3 — `process.stderr.write(... + "\n")` manual newline**: fragile; should be `console.error`. **Novel, low.**
- **v3 Attack 3 — guard wiring is copy-pasted twice**: a `runGuard()` helper would DRY this. **Novel, low.**
- **v3 Attack 5 — "scoped per-route" CSS claim is load-time not specificity-scoped**: future shared layout import could leak. **Novel, low.**
- **v3 Attack 5 — page snippet in Component 10 still contains the CSS import line**: contradicts "imported via layout instead." **Novel, doc consistency.**
- **v3 Attack 5 — layout file vs. page-level import alternative**: page-level import achieves the same scoping without a new file. **Novel, design alternative.**
- **v3 Attack 6 — JSON fixture has no comment mechanism**: JSON doesn't allow comments; the cross-reference to the `vi.mock` site can't live in the JSON. **Novel, doc consistency.**
- **v3 Attack 6 — empty-state mock returns only `projects: []`**: if test imports also touch `pages`/`profile`/`posts`, the mock returns `undefined`. **Novel, test design.**
- **v3 Attack 6 — E2E "expected N" mechanism unstated**: design says "BUILD-TIME content set" but not HOW the E2E knows the count. **Novel, test mechanism gap.**
- **v3 Attack 7 — line-range citations to `src/lib/blog.ts:81–94`/`82–86` become stale immediately**: replace with logical citations. **Novel, doc maintainability.**
- **v3 Attack 7 — parity test interacts poorly with `vi.resetModules()`**: identity comparisons cross modules become false on reset. **Novel, test isolation.**
- **v3 Attack 8 — coverage matrix is now a public menu of bypasses**: 17 rows including 6 documented bypasses. State the threat model and right-size. **Novel, design philosophy.**
- **v3 Attack 8 — sub-path-import follow-up trigger is invisible**: the "follow-up spec when Velite exposes sub-paths" has no forcing function. **Novel, process gap.**
- **v3 Attack 1 — `<figure>` escapes nested wide-media including `<figcaption>`**: caption renders at wide width, breaking caption rhythm. **Novel, layout edge case.**
- **v3 Attack 2 — `vitest` `VITEST=true` claim cites `.d.ts`**: declaration files don't set runtime env vars; cite the actual source. **Novel, citation error.**
- **v3 Attack 4 — `<exact-current-patch-version>` placeholder in design**: design ships a placeholder; should pin to an actual number or state the resolution rule. **Novel, doc concreteness.**
- **v3 Attack 4 — regression-test re-run is what CI does anyway**: the "upgrade gate" isn't a mechanism, it's an editorial policy. State the policy. **Novel, doc clarity.**
- **v3 Attack 4 — pnpm-overrides JSON deep-merge with existing `pnpm` block**: must check whether repo already has an `onlyBuiltDependencies` or similar block. **Novel, mechanical risk.**

## Patterns & Themes
- v3 closed every v2 finding with concrete code, but the concrete code introduces new attack surface (the same pattern v2 exhibited toward v1). Each iteration converges on a narrower set of issues but never reaches zero.
- The layout mechanism (now two-div + escape CSS) keeps generating issues across all three reviews. The fundamental concern is unchanged: nobody has rendered the page. Specifying CSS in prose without an empirical render is the failure mode — v3's `translate-X(-50%)` math bug would have been caught immediately by a real render.
- Symmetry concerns (blog vs. projects) finally resolved in v3 by backporting; the unification (`content-errors.ts`) remains deferred.
- Scanner coverage matrix is now a documentation surface rather than a working enforcement boundary — 6 of 17 rows are documented bypasses. The matrix has become a menu.
- Citation discipline regressed in v3: `vitest` `.d.ts` citation is wrong, line-range citations to `blog.ts` will go stale, version pin placeholder isn't resolved in the design.
- New theme: process forking. Module-scope state assumes single process; Next.js builds with workers. The memoization design hasn't grappled with this.

## Guidance for Next Review
- **Focus areas**:
  - Empirical render of the detail page at `lg` breakpoint before accepting v4. The math bug in v3 Risk 1 is invisible without one.
  - `getPublishedProjects()` memoization (the O(N×M) cost AND the multi-worker emit issue) — pick one resolution for both.
  - `pnpm-overrides` rationale: empirically test pnpm hoisting OR drop the override.
  - Citation hygiene: replace line-range citations with logical citations; fix the `vitest` `.d.ts` citation.
  - Whether the test-only `__resetWarnedDraftSlugs` export is the right pattern.
- **Well-covered areas (less attention needed)**:
  - Velite API citations beyond the `vitest` slip.
  - Error message wording (closed in v3).
  - Empty-state fixture purpose (the design is consistent; the open issues are downstream — discoverability, mock surface).
  - Sitemap / OG / CSP / eager-load threshold.
  - Iframe aspect-ratio rule.
- **Avoid re-discovering**:
  - Scanner coverage matrix shape (it's now bloated; further attacks on coverage rows are diminishing returns).
  - The blog/projects guard asymmetry (closed by backport).
  - The CSS-import location ambiguity (closed by layout decision; the open question is "layout vs. page-import," not "where in which file").
  - Per-tag prose modifier discussions (the design has moved on to two-div).
