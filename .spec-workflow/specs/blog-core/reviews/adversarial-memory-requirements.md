# Adversarial Review Memory — requirements
Last updated: 2026-05-16 (after v3 review)

## Cumulative Findings Summary

### Accepted
- **NODE_ENV draft coupling** (v1 #1, #C1): replaced with `BLOG_INCLUDE_DRAFTS=1` env var (Req 7.1–7.4), Vercel preview scoping (Req 7.3), visible `[DRAFT]` body banner (Req 7.7), `[DRAFT]` title prefix (Req 7.8), Playwright test (Req 7.13).
- **Tag/category slug enforcement** (v1 #2, #C2): regex `^[a-z0-9]+(?:-[a-z0-9]+)*$` enforced at parse time (Req 4.6). Build fails on violations with named error. Display=slug trade-off explicit (Req 4.7).
- **Reading-time input contract** (v1 #3, v2 unresolved): now AST-based via `remark-parse` + `mdast-util-to-string` (Req 6.4) — closes the v2 regex-brittleness class entirely.
- **RSS HTML rendering architecture** (v1 #4): Velite emits `bodyHtml` via `s.markdown()` (Req 11.7). Parity fixture test (Req 11.11). CDATA `]]>` handling (Req 11.10). Image/link absolutization (Req 11.8).
- **`updated ≤ date` hard rule** (v1 #5, #C3): renders nothing instead of failing the build (Req 8.3).
- **Publishing-workflow consequence of `dynamicParams=false`** (v1 What's-Missing): explicit in Req 1 intro.
- **Req 8.4 ↔ Req 3.10 contradiction** (v2 #1): Req 8.4 now drops the `console.warn` entirely — no year-typo build-time check.
- **Vercel preview drafts public-internet** (v2 #2): explicit threat model (Req 7.10) + per-page noindex on draft post pages (Req 7.11). NOTE: v3 raises that the per-page directive misses the `/blog` and taxonomy leak surface — still a gap, see Unresolved.
- **No-JS Shiki theme parity** (v2 #3): two-selector union committed in Req 9.2 + Playwright no-JS test in Req 13.7. NOTE: v3 raises that the cascade rule between the selectors is unpinned and the fix introduces a JS-on edge-case regression — see Unresolved.
- **`s.markdown()` plugin alignment** (v2 #4): shared `sharedRehypePlugins` constant registered on both `mdx.rehypePlugins` and `markdown.rehypePlugins` (Req 11.7a). NOTE: v3 raises that the `markdown.rehypePlugins` API existence is deferred-to-Design and the shared-instance/Shiki-cost claim is unverified — see Unresolved.
- **Req 6.4 regex misses tilde/nested fences** (v2 #5): retired entirely via AST extraction.
- **Req 4.6 excluded-tag-classes enumeration incomplete** (v2 #6): expanded to iOS, macOS, JavaScript, TypeScript, Node.js, npm, ESLint, GraphQL, OAuth2, JWT, PostgreSQL, Kubernetes with explicit launch trade-off statement.
- **Req 7.10 CI orchestration unpinned** (v2 #7): single-build CI strategy pinned (Req 7.14) — one `pnpm build` with `BLOG_INCLUDE_DRAFTS=1`, Vitest covers the excluded path. Fixture location pinned (`content/posts/fixture-draft.mdx`). NOTE: v3 raises the production-mode E2E coverage gap and the symmetric guard absence — see Unresolved.
- **No build-time guard against "All Environments" misconfig** (v2 #8): Req 7.12 throws when `BLOG_INCLUDE_DRAFTS=1 + VERCEL_ENV=production`.

### Partially Accepted
- **RSS namespace collapse** (v1 #2 last bullet): tag+category dedup-union in Req 11.5 with rationale, not fix.

### Rejected
- (none recorded.)

### Unresolved (raised in v3, awaiting response)
- **Req 9.2 two-selector cascade unpinned**: the fix added `@media (prefers-color-scheme: dark)` alongside `.dark` attribute. With both active and no precedence rule, a JS-on dark-system user who toggles light gets dark code blocks on a light body — a regression worse than the bug it solved.
- **Req 7.11 per-page noindex misses index/taxonomy leak surfaces**: `/blog` and `/blog/tags/<tag>` etc. render draft titles + descriptions on preview deploys with no noindex. Recommend a `VERCEL_ENV === 'preview'`-scoped site-wide `X-Robots-Tag` header instead.
- **Req 11.7a `markdown.rehypePlugins` API existence deferred to Design**: if the Velite key does not exist in the installed version, the shared-plugins mechanism — the structural fix for v2's plugin-alignment finding — is unimplementable. Verify in requirements, not Design.
- **Req 11.7 build-time cost claim unbacked**: "~30ms per post" assumes a shared Shiki highlighter across pipelines. Plugin instance sharing does not guarantee highlighter sharing. Cold-cache cost may be off by an order of magnitude.
- **Req 7.12 guard is asymmetric**: catches `BLOG_INCLUDE_DRAFTS=1 + VERCEL_ENV=production` but not the Preview-misconfigured-without-`BLOG_INCLUDE_DRAFTS` case. Drafts silently missing on preview is the opposite failure mode and equally costly to debug.
- **Req 7.14 single-build leaves production-exclusion without E2E coverage**: Vitest unit test covers `getPublishedPosts()` in isolation, but a future consumer that bypasses the helper ships drafts to production undetected. Recommend a lightweight production-mode build smoke check (Node script over `.next/` route manifest + feed.xml + sitemap.xml — no second Playwright run).
- **Req 6.4 remark-gfm parity unpinned**: page MDX uses remark-gfm (`velite.config.ts:79`); AST extraction does not — GFM tables inflate reading time silently. Need a `sharedRemarkPlugins` analog to the Req 11.7a shared rehype array.
- **Req 6.4(b) raw-HTML node silent drop**: `type: 'html'` nodes (e.g. `<aside>`, `<details>`) are dropped entirely; the page renders them as prose, so reading time underreports. Either forbid raw HTML in Req 3.7 or recurse into text content.
- **Req 6.4(b) self-closing JSX tag alt-text drop**: `<Image alt="diagram">` has no children to recurse into; alt-text prose is silently discarded. Becomes meaningful once future-spec MDX components land.
- **Req 6.5 tolerance fixture has no length floor**: ±1-min floor swamps ±20% bound on short fixtures. Set a ≥1000-prose-word floor so the percentage bound actually exercises the contract.
- **mdast-util-to-string visitor configuration unpinned**: `includeImageAlt` and footnote/link-reference behavior are version-dependent. Pin the visitor config.
- **Plugin instances in `sharedRehypePlugins` may carry per-file state across pipelines**: especially `rehypeAbsolutizeUrls` (Req 11.8) if hand-rolled with closure state. Add a stateless-instance acceptance criterion to Req 11.7a.
- **Fixture roster never enumerated**: Req 13.2 axe pass, Req 6.5 tolerance test, Req 11.11 parity test, Req 13.7 no-JS test, and Req 7.13 draft test all reference fixtures with unspecified slugs/tags/categories. Pin the roster (which fixtures, what frontmatter, what body shape). Also pin: are non-draft fixtures real public production content or a separate test-only class?
- **`fixture-draft` slug not formally reserved**: spec accepts the slug occupation as a trade-off but does not capture it as a durable constraint. One-line note that the slug is reserved against future publish-time collisions.

## Patterns & Themes
- **Fix-introduces-new-bug cycle**: each v2 fix landed (the two-selector union, the per-page noindex, the shared-plugins array, the single-build CI) closed its target finding but opened a new adjacent one. Theme: **structural fixes need their cascade/scope/precedence rules pinned alongside the mechanism itself.**
- **"Pin during Design" deferrals on requirements-blocking questions**: Req 11.7a defers the `markdown.rehypePlugins` API existence check; Req 6.4 defers the `remark-gfm` inclusion decision. Both are *contract-load-bearing* — if the answer goes one way, the contract is unimplementable or silently wrong. Treat such deferrals as requirements bugs.
- **Per-consumer discipline replacing structural enforcement**: Req 7.4 ("single chokepoint helper") and Req 7.14 ("Vitest covers the excluded path") both rely on every future consumer remembering to call the helper. Structural alternatives (a build-output smoke check, a `VERCEL_ENV`-scoped site-wide header) cover the failure mode that discipline alone cannot.
- **Test thresholds and fixture sizing are still under-tuned**: v2 raised that Req 6.5's ±1-minute tolerance was wide; v3 raises that the same threshold makes regression detection decorative on short fixtures because the floor wins. Pattern: acceptance criteria add tests but under-tune the parameters that determine sensitivity.
- **Fixture infrastructure is implied but not enumerated**: tests across five requirements reference "the fixture" / "the code-fixture" / "a-known-fixture-slug" without a roster anywhere. Decomposition tasks will hit a setup-ordering wall.

## Guidance for Next Review
- **Focus on**: design-phase deliverables IF this requirements doc is signed off without resolving the cascade/scope/API-existence Unresolveds above. In particular: the actual Velite version's API for the markdown pipeline, the actual CSS-selector cascade for the dual-theme code blocks, the actual fixture roster and how the axe-pass routes resolve.
- **Well-covered, don't re-discover**: draft env-var mechanism; slug-regex enforcement and excluded-class enumeration; reading-time AST architecture (the architecture is right, the parity/visitor pins are the remaining work); RSS architecture commitment + parity-fixture mechanism; `updated ≤ date` rule retirement; `console.warn`/CI-gate contradiction. These are structurally settled.
- **Cross-spec verification during Design**: verify `ThemeProvider` writes paired `.light`/`.dark` classes if the cascade-pinning answer relies on it; verify Velite's `defineConfig` API matches the shared-plugins mechanism on the installed version; verify Shiki highlighter is genuinely shared across both pipelines (check plugin source or add a build-time-cost smoke test).
- **Out-of-scope candidates worth re-checking against scope creep**: site-wide preview-deploy robots header (currently only per-page on draft posts); paired `.light` class on ThemeProvider (cross-spec touchpoint); `sharedRemarkPlugins` analog (currently only `sharedRehypePlugins` is pinned).
