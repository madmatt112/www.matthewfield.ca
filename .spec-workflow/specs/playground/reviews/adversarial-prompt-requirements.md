# Adversarial Review — Playground Requirements (v1)

You are a principal frontend architect with deep, scar-tissue experience shipping Next.js App Router applications: route groups, dynamic routes, `generateStaticParams`, `next/dynamic`, CSS cascade layers (`@layer`), CSS Modules, Turbopack-vs-Webpack divergence, iframe sandboxing, and Content-Security-Policy. You have been handed a requirements document for a "playground" feature — a sandbox section of a personal website that hosts self-contained mini-apps, each rendered either inline (same-page, CSS-isolated) or inside an iframe.

Your job is to **tear this document apart**. Find every gap, ambiguity, untestable acceptance criterion, hidden assumption, contradiction, and scope risk. Do not validate it. Do not praise it. Assume the author was over-confident and that anything not nailed down will break in production or during implementation. Where the document is genuinely fine, say so in one line and move on — spend your effort on what's wrong.

## Context you must read first

- The target document: `.spec-workflow/specs/playground/requirements.md`
- The decomposition entry for spec #8 (playground) and the cross-spec conventions: `.spec-workflow/spec-decomposition/decomposition.md`
- The steering docs: `.spec-workflow/steering/product.md` (§7 Playground), `.spec-workflow/steering/tech.md` (Playground Architecture, CSP, bundler divergence), `.spec-workflow/steering/structure.md`
- The spike outcome this spec builds on: `.spec-workflow/specs/site-foundation/spike-results.md` (outcome (b), mitigations M1/M2, the overlay containment matrix, the "Test-file fallout" guidance)
- The **actual code** the document makes claims about. Verify the document's "Current state" section against reality — do not take it on faith:
  - `src/app/(playground)/layout.tsx`, `src/styles/playground.css`, `src/styles/globals.css`
  - `src/app/(playground)/playground/page.tsx` (the placeholder)
  - `e2e/tests/playground-isolation.test.ts` (the `INTENDED_PLAYGROUND_FONT_FRAGMENT` / `HOST_FONT_FAMILY_FRAGMENTS` markers)
  - `next.config.ts` (the CSP negative-lookahead source, the `frame-src`/`frame-ancestors`/`X-Frame-Options` story)
  - `src/app/sitemap.ts`, `src/config/site.ts`
  - `scripts/check-authoring-docs.mjs` and `scripts/check-authoring-docs.test.mjs`

Anywhere the requirements assert a file path, symbol, or current behavior, **open the file and confirm it**. Flag every claim that is wrong, stale, or unverifiable. A requirements doc that misdescribes the code it builds on will mislead the implementer.

## Attack dimensions

### 1. The same-page-vs-iframe routing model (Req 3, 4; Decision #3)

- Challenge the claim that "every item has a `/playground/[slug]` landing route" works cleanly. For an iframe item, the landing route renders an `<iframe>` *inside* `.playground-container` (the layout wraps all `(playground)` routes). Does double-wrapping (host container + iframe document) cause problems — sizing, scroll, focus, the `all: initial` reset applying to the iframe element itself? Is the iframe's dimensioning specified at all? "sensible default size/aspect" (Req 4.4) is not testable.
- The embed route is `/playground/[slug]/embed`. But `(playground)/layout.tsx` wraps the embed page in `.playground-container` too — is that wanted inside an iframe whose whole point is a fresh browsing context? Is there a missing requirement to bypass or nest layouts for the embed route?
- `generateStaticParams` exists in two places (Req 3.4 enumerates all slugs; Req 4.5 enumerates iframe slugs for the embed route). What happens when a same-page slug's `/embed` URL is hit directly? Req 4.5 says it 404s — is that actually what `generateStaticParams` + App Router does by default, or does it dynamically render? Is `dynamicParams = false` required and unstated?
- Is there a contradiction: Req 3.1 says same-page renders inline; Req 4.1 says iframe renders an iframe — both at `/playground/[slug]`. The single `[slug]/page.tsx` must branch on `isolation`. Is the branching's failure mode (manifest entry missing `isolation`, or an unknown isolation value) covered? It is not.

### 2. The manifest + dynamic-import contract (Req 1, 3.3; Decision #2)

- The manifest `load` field is "a `() => import(...)` thunk consumed by `next/dynamic`." Challenge whether a server component (`[slug]/page.tsx`) can pass a *dynamic, per-slug* import to `next/dynamic` and still statically generate + code-split. `next/dynamic` and the bundler need a statically analyzable import specifier; `manifest[slug].load` resolved at runtime may not be. This is the load-bearing technical assumption and it may be false — if so, every same-page item either fails to load or all items get bundled together.
- Req 1.2 says the gallery, `generateStaticParams`, and the loader all derive from the manifest. If the manifest statically imports each item's component (even lazily), does importing the manifest pull all item code into the gallery bundle, defeating Req 3.3 and the NFR performance claim? Probe the tension between "single manifest module" and "code-split per item."
- product.md and the decomposition describe galleries with **visual preview cards**. Req 2.1 cards show only title + description — no thumbnail/preview. Is a visual playground gallery with no imagery a silent under-delivery against the product vision? Is the `PlaygroundItem` contract missing a preview/thumbnail field?

### 3. CSS isolation, M1, and the test-marker flip (Req 5, 6, 10.2)

- Verify M1 against `playground.css` and `globals.css` as they exist now. Is the document's description of *why* M1 happens (unlayered beats layered) correct, and will the proposed fix (Req 5.2: "move typography to a second unlayered rule") actually work without re-introducing a leak? Challenge whether an unlayered typography block could be beaten by, or could itself leak into, descendants — and whether the spike actually recommended exactly this.
- Req 5.3 requires inverting `INTENDED_PLAYGROUND_FONT_FRAGMENT` from `not.toContain` to `toContain`. Open the test file and confirm that constant and assertion exist where claimed. Also: is inverting one assertion sufficient, or does the spike's "Test-file fallout" note list *more* required edits (e.g. the `applyDarkMode` re-audit after next-themes) that this requirement silently drops?
- CSS Modules (Req 6): the doc says class names are "hashed and collision-free" — but tech.md warns CSS Modules **hashing differs between Turbopack and Webpack**. Does any requirement or test depend on a stable class name? Selection-by-class would be brittle; is selection-by-`data-testid` mandated anywhere? It is not.
- Req 6.2 explicitly declines an automated linter for the no-global-CSS constraint. Challenge this for a feature whose entire safety story is "items don't leak." One careless `:global{}` or unscoped selector silently breaks isolation site-wide and no test catches it. Is "first-party only" sufficient, or is a cheap guard (grep for `:global`) warranted?

### 4. Indexing, SEO, and the sitemap consistency rule (Req 8; Decision #6)

- Req 8.4 forbids advertising any `noindex` route in the XML sitemap. Req 8.2 makes every `/playground/[slug]` indexable; Decision #6 keeps them OUT of the XML sitemap. So there will be indexable pages absent from the sitemap (fine) plus `noindex` embed routes that are still crawlable real URLs. A `noindex` page still gets crawled — is `nofollow` / robots.txt disallow considered for embeds? Probe whether `noindex` alone meets the stated goal.
- Challenge Decision #6's "harmless, mirrors slash-pages." Items are *content destinations* the product wants discovered. Is dropping them from the sitemap an SEO own-goal vs. the marginal cost of feeding the manifest to `sitemap.ts`? Argue both sides and pick.

### 5. CSP, iframe framing, and the embed route (Req 9, 10.5)

- Verify in `next.config.ts`: does the playground actually serve **no** CSP header (Req 9.1/10.5)? Test the negative-lookahead regex `/((?!playground(?:/|$)).*)` mentally against `/playground`, `/playground/foo`, and `/playground/foo/embed` — confirm all three are excluded. A regex that excludes `/playground` but not the deeper nested path would be a silent CSP-applies-to-embed bug.
- The host page frames the embed via same-origin `<iframe>`. Is there an `X-Frame-Options` or CSP `frame-ancestors` that blocks same-origin framing? The doc claims "no framing error" (Req 9.2) — verify nothing in `next.config.ts` or Next defaults sets `X-Frame-Options: DENY`. If it does, the iframe path is dead on arrival.
- Req 9.3 asserts items have "no stored data, no auth." Is that a requirement the architecture can *enforce*, or an aspiration an item author can violate (the relaxed CSP permits third-party fetches and cookies)? Is the security posture honestly stated?

### 6. Scope, completeness, and the chrome-less gallery decision

- Req 7 sample items are vague ("exercise a pattern that justifies iframe isolation"). Is there enough to build and test them, or will the implementer invent scope?
- Missing requirements: loading/error states for a dynamically-imported same-page item that throws or is slow (no `loading.tsx` / error boundary requirement); JS-disabled behavior (interactive item shows nothing — noscript fallback?); navigation back into the site from a deep item (playground is chrome-less; only the gallery has a "return home" link).
- Highest-leverage architectural question: the doc inherits the chrome-less `(playground)` layout and pins the *gallery* to light-theme-only tokens. Stress-test whether a gallery (a site-section navigation surface, not an item) should be theme-pinned and chrome-less, or whether the gallery should live under `(site)` with chrome/theme and only *items* be isolated. The doc treats this as settled — challenge it.
- Cross-spec convention: structure.md / decomposition put content query helpers in `src/lib/{type}.ts`, but the manifest lives at `src/app/(playground)/playground/manifest.ts`. Confirm whether Decision #2's justification holds against structure.md's module-boundary rules.

## Deliverables

Conclude your analysis with:

- **Top 5 risks/gaps**, ordered by severity, each with a concrete failure scenario (what breaks, when, and for whom) — not an abstract concern.
- **Top 3 conclusions to challenge or reverse**, with specific reasoning grounded in the code and steering docs.
- **What's missing** — the work that should be done to the requirements before design begins.

For every finding, classify it as **Novel** (this is v1, so all findings are novel) and tie it to the specific requirement number(s) it affects. Be specific and concrete. Cite failure scenarios, not abstract risks. If something is actually fine, say so briefly and move on.

Write your complete analysis to: `.spec-workflow/specs/playground/reviews/adversarial-analysis-requirements.md`
