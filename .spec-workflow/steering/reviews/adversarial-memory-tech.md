# Adversarial Review Memory — tech
Last updated: 2026-03-24 (after v3 review)

## Cumulative Findings Summary
### Accepted
- Style-reset boundary undefined: v1 identified no concrete isolation mechanism. Document now specifies CSS `@layer` + CSS Modules with `all: initial` reset, `isolation: isolate`, and explicit constraint against global CSS. (v1)
- No content validation beyond frontmatter: v1 identified missing link/image checking. Document now includes CI-time link checker (lychee) with fragment checking, internal=error/external=warning policy. (v1)
- Contact form input unsanitized: v1 identified missing sanitization spec. Document now specifies zod schema, plain text via Resend `text` parameter, honeypot field. Rate limiting deferred to post-launch. (v1, updated v2)
- CSP will break playground: v1 identified single-policy conflict. Document now specifies route-scoped CSP with permissive playground policy. (v1)
- Playground dependency extraction understated: v1 called it a casual escape hatch. Document now frames workspace extraction as deliberate architectural decision. (v1)
- Next.js justification overstated SSR need: v1 challenged SSR rationale. Document now leads with DX benefits. (v1)
- "No unnecessary JavaScript" claim false: v1 identified structural contradiction. Document now acknowledges ~60-85KB baseline JS with TBT/INP impact throughout. (v1, updated v2)
- Missing playground server-side convention: v1 identified gap. Document now specifies API route pattern. (v1)
- Missing iframe decision rule: v1 identified gap. Document now includes explicit decision rule listing `position: fixed`, viewport units, `:root`/`html`/`body` styles, third-party global styles, and custom CSP directives as iframe triggers. (v1, expanded v2)
- CSP `script-src 'self'` breaks Next.js hydration: v2 identified showstopper. Document now specifies `'unsafe-inline'` and acknowledges limitation. (v2)
- Per-IP rate limiting has no implementation path: v2 identified missing state store. Document now defers rate limiting to post-launch with honeypot at launch and Resend dashboard monitoring. (v2)
- Contact form failures invisible: v2 identified no monitoring. Document now includes Playwright CI smoke test. (v2)
- Internal vs external link policy unspecified: v2 identified gap. Document now specifies internal=hard errors, external=warnings. (v2)
- Inherited-style reset underspecified: v2 identified ambiguity. Document now names `all: initial` with explicit overrides for `display`, `box-sizing`, `unicode-bidi`. (v2)
- Convention enforcement trust-based: v2 identified no automated check. Document now explicitly states "Enforced by authorship convention; no automated check. Acceptable because all playground items are first-party." (v2)
- Playground escape patterns (fixed, viewport units, stacking): v2 identified patterns that escape container isolation. Document now lists these as explicit iframe triggers and uses `isolation: isolate` for stacking context. (v2)
- Relaxed playground CSP effectively no CSP: v2 identified ambiguity. Document now states playground routes "effectively opt out of CSP." (v2)
- `frame-src` missing from CSP: v2 identified gap. Document now includes `frame-src 'self'`. (v2)
- HTML-escaping ambiguity ("or"): v2 identified non-committal spec. Document now commits to plain text via Resend's `text` parameter. (v2)
- Honeypot limitations unstated: v2 identified gap. Document now states "stops ~90% of naive bot submissions; does not stop targeted or headless-browser attacks." (v2)
- Turbopack/Webpack divergence: v2 identified risk. Document now acknowledges divergence and names preview deploys as mitigation. (v2)
- Next.js baseline JS impact understated (TBT/INP): v2 identified gap. Document now mentions TBT/INP impact on budget devices with target audience justification. (v2)
- Frontmatter validation beyond types: v2 identified gap. Document now mentions "Future enhancement: build-time assertions for duplicate slugs and inconsistent tag casing." (v2)
- Anchor link validation gap: v2 identified missing fragment checking. Document now specifies fragment checking enabled. (v2)

### Partially Accepted
- (none)

### Rejected
- (none)

### Unresolved
- **`@keyframes` collision risk**: v2 identified that CSS Modules don't scope `@keyframes` names by default. v3 deepened this: the collision only matters if multiple playground items co-render on one page, which the architecture doesn't clarify. If items are always on separate routes, this is a non-issue. (v2, compounded v3)
- **RSS/XML link checking**: v2 identified RSS/XML output not in lychee scope. v3 escalated as recurring — RSS link breakage is invisible and persistent. Still not addressed. (v2, recurring v3)
- **Pagefind cannot index Vercel-native Next.js build output**: v3 identified that Pagefind needs static HTML files but Vercel's Next.js build produces `.next/server/app/` format. Requires static export (`output: 'export'`), crawler mode, or a workaround. Document assumes Pagefind "builds a compressed index at build time" without addressing this. (v3)
- **Node.js 22 is in maintenance LTS, EOL April 2027**: v3 identified that starting on Node.js 22 guarantees a forced upgrade within 13 months. Node.js 24 is the current Active LTS. (v3)
- **CSP path pattern vs iframe route convention mismatch**: v3 identified that iframe playground routes under `/api/playground/` would inherit the strict content-page CSP, not the permissive playground CSP. The two conventions don't reference each other. (v3)
- **Next.js-over-Astro rationale omits CSP cost**: v3 identified that Decision #1 lists JS baseline and Vercel coupling as tradeoffs but omits that Next.js forces `'unsafe-inline'` in script-src. (v3)
- **Iframe decision rule list reads as exhaustive**: v3 identified that the 7-item trigger list reads as a closed set. Should be marked non-exhaustive with "when in doubt, use iframe" as the primary principle. (v3)
- **Velite migration estimate understated**: v3 identified the "~200 lines" claim omits watch mode, import path changes across ~20 files, and collection relationship resolution. Realistic scope: ~300-400 lines plus mechanical import changes. (v3)
- **Build reproducibility gaps**: v3 identified missing `.nvmrc` and `packageManager` field for version pinning. (v3)
- **CSP directive values are implementation detail**: v3 identified that exact CSP values in the steering doc will drift with Next.js version changes. Steering-level concern is the policy model, not the directive values. (v3)
- **shadcn/ui dependency framing**: v3 identified that "owned source code, not an opaque dependency" is misleading — Radix UI packages are real npm dependencies. The advantage is a smaller, more stable dependency surface, not the absence of dependencies. (v3)

## Patterns & Themes
- The document has been comprehensively updated through v1 and v2 — surface-level gaps are resolved.
- v3 shifted focus to internal consistency, specification-vs-implementation boundary, and dependency/operational concerns — finding mostly novel issues at a deeper level.
- A recurring theme: the document is ~30% over-specified for a steering document, embedding implementation details (exact CSP values, specific property overrides, library API references) that create a maintenance surface.
- The author addresses concrete findings precisely but hasn't yet responded to v3 findings.
- Two items from v2 (RSS/XML checking, `@keyframes` collision) remain unresolved through v3 — the RSS issue has escalated.
- The Pagefind integration gap is the highest-severity novel finding from v3 — it affects a core feature's viability.

## Guidance for Next Review
- v1 and v2 issues are comprehensively resolved. v3 introduced 8+ novel findings and escalated 1 recurring issue.
- The v4 review should **not re-examine** playground CSS isolation mechanics, contact form security, or CSP structure — these have been stress-tested across three rounds with diminishing returns.
- Focus areas for v4:
  - **Pagefind integration**: v3's highest-severity finding. Probe whether the document's Pagefind description is implementable as written, and whether the chosen approach (if updated) introduces new constraints.
  - **Cross-cutting consistency after potential v3 fixes**: if the document has been updated for v3 findings, verify that fixes don't introduce new contradictions.
  - **Scope and phase boundaries**: the document may have grown beyond steering-level concerns. Examine whether the level of detail helps or hinders the next phase (requirements/design).
  - **Gaps in the decision log**: are there decisions made implicitly in the document that aren't recorded in the Decision Log?
  - **What the document assumes about the implementer's knowledge**: are there places where the spec requires unstated expertise to implement correctly?
