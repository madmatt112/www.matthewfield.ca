# Adversarial Review Memory — Design
Last updated: 2026-04-02 (after v2 review)

## Cumulative Findings Summary
### Accepted
#### From v1
- CSS layer ordering flagged as hypothesis under test, not architectural fact (v1 §1.1)
- `all: initial` resets `color-scheme` and `-webkit-text-size-adjust` (v1 §1.2)
- All five CSS properties consolidated into single rule block (v1 §1.2)
- Radix portal escape acknowledged as documented behavior (v1 §1.4)
- Token drift resolved via shared `src/styles/tokens.css` (v1 §1.5)
- CI/CD consolidated to single job (v1 §2.1)
- Playwright browser caching added (v1 §2.4)
- `pages/*.mdx` glob changed to flat (v1 §3.1)
- YAML collection example added (v1 §3.2)
- Nav breakpoint specified as `lg` (1024px) (v1 §4.1)
- ThemeToggle committed to 3-state dropdown (v1 §4.2)
- HeroCard icon removed from interface (v1 §4.3)
- Landing page photo location specified (v1 §4.4)
- Footer link ambiguity resolved (v1 §4.5)
- CSP regex fixed with segment boundary (v1 §5.2)
- Nonce-based CSP evaluated and rejected with rationale (v1 §5.3)
- `connect-src` analytics comment added (v1 §5.4)
- Playwright tests for CSS isolation spike added (v1 §6.1)
- Vitest canary strengthened (v1 §6.2)
- Playwright smoke test checks visible heading (v1 §6.3)
- CSP header Playwright tests added (v1 §6.4)

#### From v2
- Token import architecture corrected — playground base stylesheet now manually re-declares literal values on `.playground-container` instead of claiming `@import` handles it (v2 §1.1 + §1.4): Design honestly states "This is a known maintenance coupling" and specifies Playwright regression test as enforcement
- Dark mode in playground resolved — playground container is explicitly light-mode only, `color-scheme: light` set, design states "playground items control their own presentation per the tech doc" (v2 §1.2)
- Unlayered `tokens.css` import documented — comment in `globals.css` explains tokens are intentionally unlayered to cascade above Tailwind's layers (v2 §1.3)
- VeliteWebpackPlugin removed, replaced with `concurrently "velite dev" "next dev --turbopack"` for dev-time content rebuilds (v2 §2.1)
- Radix Sheet committed as definitive choice (no more "e.g.") (v2 §3.1)
- ARIA attributes specified — `aria-haspopup="dialog"`, `aria-controls` handled by Radix Sheet Trigger (v2 §3.3)
- ThemeToggle mobile placement specified — stays in header bar at all breakpoints (v2 §3.4)
- Sitemap routes completed — all slash page routes added (v2 §4.1)
- Placeholder pages get `robots: { index: false }` in `generateMetadata()` (v2 §4.3)
- OG image specified as static 1200x630 PNG committed to repo; `next/og` deferred (v2 §4.4)
- Error boundaries explicitly deferred (v2 §5.1)
- CSS syntax errors acknowledged as silent failure category (v2 §5.2)
- `next/font/google` chosen as primary approach with `next/font/local` as documented fallback (v2 §5.4)
- Phase 3 sub-ordering specified (R9 → R14 → R5 → R4 → R10 → R13) (v2 §6.2)
- R12 (testing infrastructure) moved to phase 1 (v2 §6.3)
- Playground layout under spike outcome (c) now described (v2 §6.4)

### Partially Accepted
- Fallback plan for layer ordering failure (v1 §1.3): Design says "no intermediate CSS-only fallback" — playground defaults to iframe-only. Clear but minimal — outcome (c) playground layout now described in design (promoted from v1 partially accepted to effectively accepted via v2 §6.4 fix)

### Rejected
- None explicitly rejected across v1 or v2

### Unresolved
- `.velite/` output contract has no integration test (v2 §2.3): Low severity, TypeScript compiler provides reasonable coverage. No test added that imports from `#site/content` and validates shape.
- `output.clean: true` race condition in dev (v2 §2.4): Low severity, transient dev-time annoyance. Not addressed in design.

## Patterns & Themes
- Both v1 and v2 reviews were highly effective — nearly all findings were accepted and incorporated
- v2 drove significant architectural corrections: token import mechanism, VeliteWebpackPlugin removal, phase reordering
- The design shows strong responsiveness to adversarial feedback — issues are resolved thoroughly, not superficially
- CSS isolation spike section has been the most revised area across both reviews, reflecting its inherent complexity
- Implementation ordering has been substantially improved (R12 moved to phase 1, phase 3 sub-ordered)
- Two low-severity findings remain unresolved (Velite output contract test, clean:true race condition) — acceptable given their low impact

## Guidance for Next Review
- Focus areas for v3:
  - The design has been substantially tightened across two rounds. Look for interaction effects and edge cases in the newly specified details
  - Token synchronization enforcement: the Playwright regression test is the sole enforcement mechanism — stress-test its coverage and failure modes
  - The `concurrently` dev script approach: failure modes, process lifecycle, error propagation
  - Cross-section consistency: do all components/sections reference the same types, configs, and conventions?
  - Accessibility depth beyond ARIA attributes (keyboard flows, screen reader announcements, focus management)
  - Anything in the design that is stated as a fact but is actually an assumption that could be invalidated
  - The playground base stylesheet's manual token re-declaration: are all needed tokens enumerated? What happens when shadcn/ui adds new tokens?
- Areas well-covered (don't re-examine):
  - CSS layer ordering hypothesis framing
  - CI job structure and caching
  - Nav/footer/theme toggle design decisions (breakpoint, Sheet, placement, dropdown)
  - CSP regex, nonce rejection rationale
  - Radix portal acknowledgment
  - VeliteWebpackPlugin removal (resolved)
  - Phase ordering (thoroughly revised)
  - Token import mechanism (corrected to manual re-declaration)
  - Sitemap completeness, placeholder noindex, OG image approach
  - Error boundary deferral decision
