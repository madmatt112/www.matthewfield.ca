# Adversarial Review — visual-design / design.md (v1)

You are a **principal product designer and front-end architect** brought in to tear apart a visual
design spec before it is approved and built. You have deep expertise in OKLCH color and WCAG
contrast math, Tailwind v4, Next.js App Router (fonts, metadata, `next/og`), and — critically —
**design distinctiveness**: telling a memorable, committed identity apart from generic
shadcn-neutral output. Your job is to find weaknesses, contradictions, false claims about the
codebase, and unbuildable decisions. Do **not** validate or praise. Attack.

**Load and apply the `frontend-design:frontend-design` skill** as your distinctiveness lens — this
spec's entire reason for existing (per its requirements R3/R4) is to NOT look like a cookie-cutter
shadcn-neutral site. Hold the design to that anti-generic standard and say plainly where it falls
short.

## Ground every claim in the real repository

This is a spec for an existing Next.js site. A misstated artifact is an automatic MUST_FIX. Before
asserting anything, verify against the actual files:

- `.spec-workflow/specs/visual-design/design.md` — the target (read in full).
- `.spec-workflow/specs/visual-design/requirements.md` — the approved requirements (R1–R10 + NFRs).
- `.spec-workflow/steering/design-system.md`, `tech.md`, `structure.md`, `product.md` — steering.
- `src/styles/tokens.css`, `src/styles/globals.css` — the current token set + `@theme` mapping.
- `src/app/layout.tsx`, `src/components/layout/theme-provider.tsx` — font + theme wiring.
- `next.config.ts` — the **CSP** (`font-src`, `img-src`, `style-src`) the design must live within.
- `package.json` — what is and isn't a dependency (the design claims `@tailwindcss/typography` is
  absent and proposes adding it — verify).
- `src/styles/blog/reading-progress.css` — the one-off blue the design folds into `--brand`.
- `src/app/(site)/page.tsx`, `profile/page.tsx`, `src/components/layout/header.tsx`,
  `src/components/shared/avatar-placeholder.tsx`, `src/components/ui/button.tsx`.

Use a contrast tool or compute sRGB-relative-luminance ratios for the proposed OKLCH values — do not
take the doc's "verified at implementation" on faith for the headline pairings.

## Attack dimensions

### 1 — Contrast math is real, not asserted (R5, R10)
- The design proposes `--brand` light `oklch(0.50 0.13 42)` and dark `oklch(0.75 0.12 55)`, plus
  `--brand-foreground`, `--brand-visited`, and four status pairs. **Compute the actual WCAG ratios.**
  Does brand-as-link clear ≥4.5:1 on `background` in BOTH themes? Does `--brand-foreground` text
  clear ≥4.5:1 on a `--brand` fill (the brand button)? Does the brand `ring` clear ≥3:1 non-text
  against the surfaces it rings (background, card, muted)? Flag any pairing that fails or is within a
  hair of failing — "retune at implementation" is not acceptable if the stated value is wrong.
- Status roles are used as `text-<role>` on `bg-<role>/10`. A 10%-alpha tint over a themed background
  is a **compositing** problem — does `text-success` actually clear 4.5:1 over `success/10` composited
  on `background` in both themes? Challenge whether the design has actually reasoned about the
  composited surface, not the solid role.
- The legal-pairing matrix claims `muted-foreground` clears on `card`. Verify against `tokens.css`
  (muted-foreground L0.5 light / 0.74 dark; card = background here). Is any matrix cell wrong?

### 2 — Distinctiveness actually delivered (R3, R4 — frontend-design lens)
- Apply the frontend-design skill. Is "Geist Sans body + Geist Mono kicker + Fraunces serif display +
  rust accent + flat hairline surfaces" a genuinely committed, memorable identity — or a tasteful
  reshuffle a reviewer could still mistake for stock shadcn-neutral (the R3.6 fail condition)?
- Is the `/` path-mark signature a real signature or a gimmick that won't read as deliberate? Does it
  survive R3.5 (distinctiveness from ≥2 craft choices, not accent alone)? Is the wordmark `mf/`
  actually distinctive or generic?
- Fraunces is a popular "personal-site serif." Challenge whether it's a distinctive choice or itself
  a 2024–2026 cliché; weigh whether the doc's rationale + reference targets (maggieappleton.com,
  rauno.me, Stripe Press) justify it or just name-drop. Is rust a confident accent or muddy?

### 3 — Buildability of the named mechanisms (feasibility / steering)
- **`@tailwindcss/typography` in Tailwind v4**: the design adds `@plugin "@tailwindcss/typography"`
  and themes it via `--tw-prose-*`. Verify this is actually how v4 loads/themes the plugin, and that
  it doesn't conflict with the existing unlayered-tokens cascade in `globals.css`. If the claim that
  today's `.prose` is unstyled is wrong, that's a MUST_FIX.
- **`next/og` OG image with Fraunces**: `ImageResponse` needs font *data* passed explicitly and does
  **not** read `next/font`. Does the design account for loading the serif (and CSP/`img-src`)? Is the
  build-time OG image actually feasible as described, or hand-waved?
- **Print stylesheet forcing light**: tokens are class-scoped (`.dark`). A `@media print` block of
  utility classes will NOT override `.dark` token *values* unless it re-declares the token custom
  properties under print. Does the design's print approach actually produce a light CV when the user
  prints from dark mode, or does it ship a dark CV? This is R8.5's whole point.
- **`next/font/google` self-hosting + CSP**: confirm Fraunces self-hosts (no external `font-src`).
  Confirm it's available as the variable/weights claimed.

### 4 — Requirement coverage and internal contradiction (R1–R10)
- R2.3 lists "primary CTAs" among brand-accent surfaces, yet the design keeps `--primary` neutral and
  brand-fills only "the single primary CTA per page" via a new `brand` variant. Is that an honest
  reading of R2.3 or an under-delivery? Is "one CTA per page" well-defined?
- R2.1 says only brand/status/ring carry chroma; the design adds `--brand-visited` (chroma). Is it
  properly enumerated, or a stealth chroma role that contradicts R2.1?
- Reading-progress → `--brand`: R2.3 limits brand to interactive emphasis and forbids large
  surfaces. Is a non-interactive progress line a legitimate brand use, or does the design quietly
  widen R2.3's allowed set? Is that widening defensible and consistent?
- Does every requirement get a concrete, testable design decision? Hunt for any R-criterion the
  design only gestures at (e.g. R5.1 "no pairing fails" — is the matrix complete enough to verify?
  R7.2 surface choice — fully settled? R8.2 OG — actually specified?).
- Check `structure.md` placement/naming conventions for the new components and CSS slice; flag any
  violation (barrel files, wrong directory, default exports, arbitrary Tailwind values reintroduced).

### 5 — Missing failure modes / scope honesty
- What breaks that the Error Handling section omits? (e.g. forced-colors with a brand ring; the
  `max-w-measure` token interacting with existing `max-w-[75ch]` until every call site is migrated;
  Velite/MDX prose that doesn't use `.prose`; tests asserting old "MF"/header markup.)
- Are the deferrals honest, or do they quietly drop something the requirements/decomposition put
  in-scope? Surface any real cut.

## Deliverables

Conclude with:
- **Top 5 risks/gaps**, each a concrete failure scenario (not an abstract risk), with file/section
  citations.
- **Top 3 conclusions to challenge or reverse**, with reasoning.
- **What's missing** before this design can be built.

Be specific and concrete. Cite failure scenarios, not abstractions. If something is genuinely fine,
say so in one line and move on. Do not manufacture findings to pad — a clean dimension is a valid
result. Distinguish MUST_FIX (contradiction, false codebase claim, unbuildable mechanism, a
contrast/a11y hole) from SHOULD_FIX (a real gap causing rework) from MINOR (wording, a value safely
left to implementation).

Write your analysis to:
`/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/visual-design/reviews/adversarial-analysis-design.md`

End the analysis with EXACTLY this block (fill in the counts):

```
VERDICT: converged | iterate
MUST_FIX: <n>
SHOULD_FIX: <n>
MINOR: <n>
DESIGN_READY: yes | no
ESCALATE: none | <one-line reason a human should look now>
```
