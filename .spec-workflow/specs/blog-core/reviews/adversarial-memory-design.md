# Adversarial Review Memory — design
Last updated: 2026-05-19 (after v3 review)

## Cumulative Findings Summary

### Accepted
- Velite v0.3.1 API surface (`s.markdown()`, top-level `markdown` config, `meta.content`, `MarkdownOptions`): v1 → v2 audit cites `.d.ts` line numbers. Resolved.
- `feed` CDATA-wrapping launch-gate test: v1 demanded, v2 added substring assertion, v3 upgraded to strict-parse via `fast-xml-parser` (parses XML, locates `<content:encoded>` element, asserts both element placement AND CDATA wrapping). Resolved at the assertion-shape level.
- `feed` exact version pin: v2 partially accepted (`^4.2.2` was range-pinning); v3 pinned to literal `"4.2.2"` with documented dependabot/renovate bump flow. Resolved.
- Shiki CSS cascade: variable-bridge per v1 Conclusion #2. Resolved at v2.
- `verify-production-build.mjs` path discovery: v1 → v2 glob + hit-count gate; v3 replaced "or equivalent" with literal expected-file shapes (post-page, index-page, taxonomy, sitemap, feed). Resolved at the shape-enumeration level — see Novel #4 in v3 for the launch-state failure mode this introduces.
- Velite cache clean between builds: `rm -rf .velite .next` pinned at v2. CI job-topology pin added at v3 (single job, sequential steps, MUST NOT split). Topology pinned in prose; see Recurring/Escalated #3 below for structural-enforcement gap.
- ESLint chokepoint-bypass rule (`no-restricted-imports`): v1 → v2. Resolved.
- `rehypeAbsolutizeUrls` placement: v1 → v2 (moved inline). Resolved.
- `NEXT_PUBLIC_SITE_URL` dead-code fallback: v1 → v2 dropped. Resolved.
- `shouldShowUpdatedBadge` helper: v1 → v2. Resolved.
- Public `getPostNeighbors` integration test: v1 → v2. Resolved.
- CI "independent" framing for `verify-production-build.mjs`: v1 → v2. Resolved.
- Reading-time AST walk MDX-node recursion (v2 Unresolved #1): v3 dropped the recursion, pinned "markdown + GFM only" contract, documented that MDX syntax is rejected upstream. Resolved.
- `s.markdown()` pipeline divergence beyond raw HTML (v2 Unresolved #2): v3 extended rejection visitor to cover `mdxFlowExpression`, `mdxTextExpression`, `mdxJsxFlowElement`, `mdxJsxTextElement`, and top-level `import`/`export`. Rejection visitor now uses a separate `remark-mdx` parser stack. Resolved at the rejection-coverage level — see v3 Attack 1 for parse-failure UX gap.
- Two-visitor ordering pin (v2 Attack 1 bullet 2): rejection → reading-time → bodyHtml pinned at v3. Resolved.
- `includeImageAlt: true` consequence (v2 Attack 1 bullet 3): pinned at v3 with decoupled-assertion strategy. Resolved at the strategy level — see Compounding #5 in v3 for ±10% band breakpoint.
- Build-ordering between page-compile and feed-emission (v2 Unresolved #8): v3 recast as a structural argument via the rejection visitor's transform-time throw (Reversal #2). Resolved at the happy path — see v3 Attack 1 bullet 1 for the parse-failure path that remains.
- Local-dev footgun on `VERCEL_ENV=preview` (v2 Unresolved #4): v3 added `VERCEL === '1'` gate to the Req 7.12(a)/(b) guards. Resolved at the guard logic — see v3 Attack 6 bullet 3 for the missing positive test.
- Cross-spec `THEME_STORAGE_KEY` source pin (v2 Unresolved #5): v3 pinned import from `@/components/layout/theme-provider` + added a unit test asserting `THEME_STORAGE_KEY === 'theme'` matches the `next-themes` blocking script. Verified live: `src/components/layout/theme-provider.tsx:6` exports `THEME_STORAGE_KEY = "theme"`. Resolved.
- `validate-feed.mjs` glob-extension filter (v2 Unresolved #7): v3 separated the feed-emit glob (no extension filter, content-inspection based) from the production-build glob. Resolved.
- Reading-time integer-clamp test fragility (v2 Compounding #3 / Recurring): v3 decoupled into word-count + conversion-fidelity + end-to-end identity assertions. Resolved at the rounding boundary — band-edge breakpoint remains (Compounding in v3).

### Partially Accepted
- CI job-topology pin (v2 → v3): v3 wrote prose to design.md:260 forbidding job splits. No CI lint, no YAML comment, no structural defense (BUILD_ID hash or sentinel). Stance: documentation-only enforcement; one casual workflow edit still breaks draft isolation silently.
- Operator-facing Vercel error UX (v2 Attack 4 bullet 1): v3 added a launch-time manual verification step. Stance: one-shot verification against a third-party log UI that changes without notice; no scheduled re-verification, no structural fallback (`headers()`-callback throw rejected without weighing the env-var-only path).
- Reading-time word-count ±10% band (v3 decoupling): structurally better than the rounding-boundary integer-clamp, but still has a fixture-coupled fragile assertion that fails on legitimate ≥110-word alt-text additions on a 1000-word fixture.

### Rejected
- (None identified across v1 → v2 → v3 — the design has been consistently responsive.)

### Unresolved (raised in v3)
- **Rejection-visitor parser-failure UX is unspecified.** The `try { parse } catch` wrapping is not pinned; a half-formed JSX tag (`<div foo=>`) that fails the `remark-mdx` parse produces a stack trace, not the named-error UX the node-rejection path produces.
- **Error Scenarios #3 and #4 in design.md contradict each other** after the v3 rejection-visitor extension. A `<Callout>` now triggers Scenario #3's rejection error, not Scenario #4's `s.mdx()` `ReferenceError`. The design tells the author two stories about which error they see.
- **`fs.glob` (Node 22 experimental) is treated as a stable API.** No `engines.node` pin, no `.nvmrc` pin, no `ExperimentalWarning` handling. CI on Node 20 fails to start both verify scripts with `TypeError: fs.glob is not a function`.
- **`fast-xml-parser` version is unpinned** despite being load-bearing for the launch-gate test. A silent minor bump can change the path the test traverses (e.g., `parsed.rss.channel.item['content:encoded']` vs `content_encoded`) and the test silently passes against the wrong tree shape.
- **`verify-production-build.mjs` taxonomy hit-count gates fail on launch state.** With `content/posts/` empty (or all real posts removed), `getAllTags()` returns `[]`, no tag/category pages emit, hit-count gate fires, Build 2 fails CI. The script blocks the intended green-state launch.
- **Substring-collision risk for `fixture-draft` slug and the fixture title.** Script greps for both as literal substrings. A common word in the title (`Draft`) or any unrelated future use of "fixture-draft" produces false positives.
- **Velite cache-surface audit not performed.** `rm -rf .velite .next` is pinned, but Velite v0.3.1's full cache topology (beyond `.velite/posts.json` and `.next/cache/`) is not enumerated the way the `.d.ts` audit enumerated the API surface.
- **Word-count walk duplicated in test code vs Velite transform.** Assertion #1 of the decoupled reading-time strategy re-implements the walk in the test, separate from the transform's instance. Drift between the two breaks assertion #3's identity check.
- **No positive test for the `VERCEL === '1'` gate.** Test suite covers throw paths; no test asserts `VERCEL` unset → no throw. A regression that drops the gate revives the local-dev footgun unguarded.
- **Build 1 failure cascading to Build 2 unconditionality.** Design assumes Build 1 → clean → Build 2. If Build 1's `pnpm test:e2e` step fails, does Build 2 still run? Not pinned. A PR with both an axe regression and a draft-leak regression can ride the axe fix to merge without Build 2 ever executing.
- **Per-post parser-instantiation cost claim "negligible at launch volume" is not backed by numbers.** Four parser instantiations per post per Velite cycle (reading-time + rejection + s.mdx + s.markdown) running on every `pnpm dev` watcher tick; no target pinned, no measurement.
- **CDATA-split visible-artifact acceptance** for non-conformant feed readers is hand-waved as "no mitigation wired." The trade-off is launch-acceptable but the design provides no path to detect the affected reader population in practice.

## Patterns & Themes

- **Procedural-vs-structural enforcement.** The pattern continues: v1's chokepoint-bypass was procedural → v2 added the lint rule. v2's build-ordering was procedural → v3 added the rejection visitor. v3's CI job-topology is procedural again (prose only). When a guarantee depends on a configuration file that lives separately from the design doc and has no automated enforcement, the guarantee is one careless edit away from breaking.
- **Hedge language reappearing in new forms.** v1/v2 had "or equivalent" and "verified at implementation time." v3 has "negligible at launch volume" (without numbers), "verified by code review at implementation time" (`rehypeAbsolutizeUrls` statelessness), and "called out, not automated" (operator-UX verification). Pattern: when the design needs to commit to a constraint it can't easily prove, hedge language reappears at the new abstraction.
- **Test-coverage gaps for the structural defenses.** v2 → v3 added structural defenses (rejection visitor, `VERCEL === '1'` gate, fixture-shape enumeration), but the corresponding test surface lags. v3 has no positive test for the `VERCEL` gate, no test catching a future drop of the rejection-visitor `mdxJsxFlowElement` coverage, no test asserting `verify-production-build.mjs` correctly fails on a planted draft slug. Structural defenses without test coverage erode silently.
- **Breakpoint migration, not elimination.** The reading-time fragility moved from integer-clamp rounding (v1/v2) to ±10% word-count band (v3). The dependency-pin discipline migrated from `feed` (now exact-pinned) to `fast-xml-parser` and Node version (unpinned). The pattern is that each tightening exposes the next-most-load-bearing slack point.
- **Scripts whose hit-count gates fail on the design's own happy paths.** `verify-production-build.mjs`'s taxonomy assertions fail at launch state. This is the second instance of a defensive script that fires on a state the design explicitly carved out as supported (v2 had the symmetric concern with `VERCEL_ENV=preview` + no `BLOG_INCLUDE_DRAFTS` firing on `pnpm dev`). Pattern: defensive checks need to be tested against the design's documented green-state scenarios, not just the failure scenarios they target.
- **Self-contradiction across error-scenario prose after structural change.** v3's rejection-visitor extension obsoleted Error Scenario #4 in the design's Error Handling section, but the prose was not updated. Pattern: when a structural change collapses two failure modes into one, the prose documenting both can drift out of sync with the implementation.

## Guidance for Next Review

**Focus areas (likely productive for v4+ attacks):**
- Structural enforcement of the remaining procedural pins (CI job topology, `rehypeAbsolutizeUrls` statelessness, build-ordering corner cases). These are the last procedural-only contracts.
- Test-coverage matrices against the structural defenses already in place: every guard, every rejection node-type, every gate predicate should have a positive AND negative test pinned in the design.
- Dependency-pin discipline extended beyond `feed`: `fast-xml-parser`, `unist-util-visit`, `mdast-util-to-string`, `remark-mdx`, `reading-time`, `shiki` peer dep. The design pinned the load-bearing one; the launch-gate test depends on the others without acknowledgment.
- Runtime-version pins: `engines.node`, `.nvmrc`, pnpm version, Vercel's Node selection. `fs.glob` is experimental; nothing in the design treats it as such.
- Defensive-script behavior on the design's own green-state scenarios (empty `content/posts/`, all-real-posts state, single-post state). v3 enumerated shapes that fail at launch state.
- Error-scenario prose vs structural-defense surface: every time the design adds a rejection or a guard, audit which Error Scenarios it now subsumes and update or delete them.

**Well-covered, deprioritize:**
- Velite API existence claims (audit cites `.d.ts` lines).
- Shiki cascade structure (variable-bridge at v2).
- `feed` package CDATA-wrapping at the contract AND assertion-shape level (strict-parse at v3, exact-pinned at v3).
- Path-discovery globs (literal shapes enumerated at v3 — but see Novel #4 in v3 for the launch-state gap).
- `THEME_STORAGE_KEY` cross-spec dependency (pinned, verified, unit-tested at v3).
- Velite cache clean step (exists at v2, topology-pinned in prose at v3; see Recurring #3 for the structural-enforcement gap).
- `rehypeAbsolutizeUrls` placement and basic statelessness (inline at v2, documented constraint at v3 — though statelessness enforcement is still procedural).
- `shouldShowUpdatedBadge` helper (added at v2).
- Reading-time decoupling at the rounding-boundary level (v3 decoupling solves the rounding issue; band-edge breakpoint is a different concern).
