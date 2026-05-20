# Adversarial Review Memory — requirements
Last updated: 2026-05-20 (after v3 review)

## Cumulative Findings Summary

### Accepted (resolved in v2)
- **Vercel deployment topology** (v1 Section D, top risk #1): promoted from NFR-defer to Req 0 with `vercel deploy --prebuilt` pinned.
- **PROD_LIKE_PORT single source of truth** (v1 Section A): centralized via `src/config/site.ts` constant per Req 1.2 v2.
- **Pagefind crawl "promote to blocking after 3+ deploys" mechanism** (v1 Section A, top risk #4): dropped entirely. Ships blocking from day 1 per Req 1.4 v2.
- **Tag-indexing contradiction** (v1 Section A, Req 1.6 vs 1.7): resolved — tags indexed via `data-pagefind-meta` only; chip UL is ignored.
- **Draft-leak smoke check duplicated slug logic** (v1 Section A, top risk #2): centralized via `src/lib/build/derive-post-slug.ts`.
- **Related-posts tag/category equal weighting** (v1 Section B): changed to 2:1 in v2, then escalated to 3:1 in v3.
- **Cross-series exclusion dead-zone** (v1 Section B, series-of-1): refined — exclusion only when navigator will render.
- **PostMeta extension typed-API decision** (v1 Section B): committed to `RelatedPostMeta` sibling type in v2, then redefined via type composition in v3.
- **Related-posts empty-state UX rationale** (v1 Section B): rationale removed; mechanism only.
- **TOC `github-slugger` re-instantiation parity claim** (v1 Section C, top risk #5): mechanism changed to HAST-parse of `bodyHtml`.
- **TOC in-flow vs. sticky-rail Design defer** (v1 Section C): pinned in-flow only; scroll-spy dropped.
- **TOC vs. body heading-text dedup** (v1 Section C): clarified — Pagefind dedups per-page records already.
- **Corpus heading-depth audit** (v1 "what's missing" #4): h2/h3-only confirmed.
- **Series-name slugging forward-compat** (v1 "what's missing" #3): Req 3.4 v2 documents kebab-slug transform.
- **Fixture cross-pollution via shared `category: fixture`** (v1 Section E, top risk #3): resolved by dedicated `related-fixture` category.
- **`fixture-search` draft-vs-published contradiction** (v1 Section E): resolved by publishing.

### Accepted (resolved in v3)
- **Req 0.3 merge-sequencing race** (v2 Section A novel): replaced with `DEPLOY_VIA_CI` feature flag — atomic single-action migration. Residual race surface noted in v3 unresolved.
- **`vercel build` artifact-preservation** (v2 Section A novel): `sha256sum` check on `pagefind-entry.json` added in Req 0.2 v3. Partial-copy gap remains — see Unresolved.
- **Build 1 preview deploy ambiguity** (v2 Section A novel): Req 0.4 v3 pins Build 2 as sole deploy producer; Build 1 is CI-verification only.
- **Vercel CLI version pinning policy** (v2 Section B compounding): exact-version pin + dependabot routing per Req 0.2 v3.
- **Vercel secret ownership/rotation** (v2 Section A novel): Req 0.8 v3 adds ownership (Matthew) + 30-day rotation cadence. Monitoring mechanism still ambiguous — see Unresolved.
- **Pagefind rollback multi-step claim** (v2 Section B novel): replaced with `PAGEFIND_ENABLED` feature flag in Req 1.4 v3. New silent-deploy concern — see Unresolved.
- **Missing-index degradation behavior** (v2 Section B novel): Req 1.9a v3 adds Pagefind script-load failure handling + Playwright route-mock test. Test scope is narrow — see Unresolved.
- **Related-rail 2:1 tie behavior** (v2 Section C novel): escalated to 3:1 in Req 4.1 v3. Monotone dominance conditional on category-count cap — see Unresolved.
- **Silent-absence of related rail at launch corpus size** (v2 Section C novel): Req 4.6 v3 makes the no-rail expectation explicit. No re-evaluation trigger added — see Unresolved.
- **`RelatedPostMeta` type duplication** (v2 Section C recurring/escalated): Req 4.4 v3 redefines via `PostMeta & Pick<Post, 'description' | 'date'>`. SHALL-style coding-pattern prescription is unenforceable — see Unresolved.
- **Req 7.4 slug-parity test tautological** (v2 Section D novel): Req 7.4 v3 sources ground-truth from Playwright DOM read against Build 1 server. Test environment ≠ production — see Unresolved.
- **Future h4 silent-flatten** (v2 Section D novel): Req 7.10 v3 replaces with build-blocking loud-failure. No escape hatch — see Unresolved.
- **Orphan-h3 TOC behavior** (v2 Section D compounding): Req 7.5 v3 pins flat-list rendering. `TocEntry` shape still ambiguous — see Unresolved.
- **`fixture-search` permanently visible in production** (v2 Section E novel): `isVisibleInLists()` slug-pattern filter added. Consumer-by-consumer application is a drift vector — see Unresolved.

### Partially Accepted
- **`fixture-search` body content polluting search results** (v2 Section E compounding): v3 mitigates with unique high-signal phrase + short body, but explicitly accepts the residual indexing trade-off. Two-index architecture alternative not considered.

### Rejected
(none — v3 made structural changes; no explicit rejections.)

### Unresolved (raised in v3)
- **`PAGEFIND_ENABLED=false` deploy state is silently persistent** (v3 Section B novel): no CI warning when deploying without index; operator forgetfulness ships broken search indefinitely.
- **`isVisibleInLists()` per-consumer filter is a drift vector** (v3 Section E novel): same anti-pattern v2 fixed for `derivePostSlug`, reintroduced for list filtering. Consolidation via `getVisiblePublishedPosts()` not adopted.
- **`sha256sum` artifact preservation check verifies one file, not the directory** (v3 Section A compounding): partial-copy regressions pass the check.
- **Req 7.10 v3 h4-rejection has no escape hatch** (v3 Section D novel): build-blocking failure with no `BLOG_ALLOW_H4` flag; high friction for author-is-spec-owner setup.
- **Req 0.3 v3 "Pre-deploy auto-deploy detection" warning-only is a quiet failure mode** (v3 Section A novel): future re-enable of dashboard auto-deploys re-introduces race silently.
- **Req 0.3 v3 "either order is safe within a single browser session" overclaim** (v3 Section A novel): artifact difference between Vercel-auto and CI deploys (with/without Pagefind) makes the race observably different, not safe.
- **Req 0.3 v3 "Pre-merge feasibility check as merge precondition" not technically enforced** (v3 Section A novel): `workflow_dispatch` is not a native merge-blocking check; enforcement is social.
- **Req 0.8 v3 rotation monitoring "AND/OR" defer** (v3 Section A novel): calendar reminder vs scheduled workflow choice is load-bearing; calendar reminder does not prevent silent-expiry.
- **Req 1.9a v3 Playwright test scope is narrow** (v3 Section B novel): only 404 simulated; CSP block, partial-file 404, index corruption not covered.
- **Req 1.4 v3 rollback "single click" undersells operator wait time** (v3 Section B compounding): flag flip + wait for next CI run + verify deploy is the actual procedure.
- **Req 4.1 v3 3:1 dominance is conditional on undocumented category-count cap** (v3 Section C novel): no schema constraint preventing 4+ categories per post.
- **Req 4.4 v3 SHALL-style coding-pattern prescription** (v3 Section C novel): "compose, don't widen" is not testable; belongs in design.md or needs a mechanical check.
- **Req 4.6 v3 corpus-size threshold for re-evaluation missing** (v3 Section C compounding): no trigger to revisit the no-rail decision when corpus grows.
- **Req 7.4 v3 parity test runs against Build 1 only, not production** (v3 Section D novel): test environment ≠ deploy environment; production-only divergence escapes the test.
- **Req 7.5 v3 `TocEntry` shape ambiguity** (v3 Section D compounding): flat vs nested data structure not pinned; rendered-indentation contract derives from it.
- **Fixture slug-pattern `/^fixture-/` is over-broad** (v3 Section E novel): a legitimate post slug starting with "fixture-" is silently excluded from lists; no schema enforcement of fixture convention.
- **Single-index Pagefind architecture choice unjustified** (v3 Section E compounding): two-index (prod + test) split would eliminate fixture-in-real-search-results; spec does not document why rejected.

## Patterns & Themes
- **v3 was a targeted response to v2's top 5 risks**: feature flags for migration + kill-switch, type composition for the type-zoo, Playwright DOM read for parity, `isVisibleInLists()` for fixture visibility, h4 loud-failure. Each top-5 risk got an addressed answer.
- **Feature flags solve coordination but introduce monitoring debt**: `DEPLOY_VIA_CI` and `PAGEFIND_ENABLED` both have "flag-flipped-once-and-forgotten" failure modes that no CI surface alerts on.
- **Per-consumer filters are the new drift vector**: v2 fixed slug-derivation drift via a shared module; v3 introduced list-visibility filtering via per-consumer calls — same anti-pattern in a new domain.
- **Author-is-spec-owner friction**: v3 added build-blocking failures (h4 rejection) and SHALL-prescribed coding patterns (type composition discipline) that assume separate author/spec-owner roles. On this codebase those are the same person, which changes the cost-benefit.
- **Test-environment vs. production-environment gap**: Req 7.4 v3's parity test runs against Build 1 (drafts), which never deploys. Production heading-ID generation is not directly verified.
- **Verification claims that don't fully verify**: `sha256sum` on one file, Playwright test for one failure mode, slug-parity against one pipeline server. v3 added verification mechanisms but each is narrower than its rhetoric.

## Guidance for Next Review (v4)
- **Focus areas**:
    - The `getVisiblePublishedPosts()` consolidation question — does v4 adopt the encapsulation or reject it with a documented rationale?
    - Operator-forgetfulness monitoring for `PAGEFIND_ENABLED` and `DEPLOY_VIA_CI` — does v4 add CI warnings when deploys ship in non-default states?
    - The `BLOG_ALLOW_H4` escape hatch decision — adopted, rejected with rationale, or still deferred?
    - The Pagefind two-index architecture question — explicitly evaluated and documented, or still implicit?
- **Well-covered (do NOT re-discover)**:
    - Vercel topology placement (Req 0 — done).
    - Pagefind promotion mechanism (dropped — done).
    - Slug-derivation duplication (centralized — done).
    - Related-posts category dominance (3:1 with conditional caveat — done).
    - Fixture cross-pollution via shared category (dedicated category — done).
    - PostMeta type duplication (composition — done).
    - TOC scroll-spy and sticky-rail decisions (in-flow only, scroll-spy dropped — done).
    - Vercel CLI pinning policy (exact-pin + dependabot routing — done).
- **Watch for new surface area**:
    - Any new "Design SHALL pin" clauses introduced by v3 that create new defer surface (especially `TocEntry` shape, rotation-monitoring AND/OR).
    - Whether v4's structural changes preserve the v3-introduced feature-flag patterns or replace them.
    - Whether the `RelatedPostMeta` composition spawns other type-composition prescriptions that also lack enforcement.
