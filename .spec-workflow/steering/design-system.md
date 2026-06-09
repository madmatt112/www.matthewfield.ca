# Design System

> **Steering, not spec.** This captures the *durable direction and rules* of matthewfield.ca's
> visual system — principles, semantic roles, usage rules, governance, and non-negotiable gates,
> stated as **rules, not slogans**. The *concrete values that churn* (exact palette/token values,
> the precise type and spacing scales, per-component and per-surface decisions, and verification
> matrices) live in the design spec / implementation and in the token source of truth, not here.
> This is a **direction-light** system on purpose: the visual identity is deliberately left open
> and resolved in the design spec. Where a value or artifact is not yet decided, the doc says
> **`Deferred: …`** rather than committing prematurely — and names *where* it will be decided.

## Purpose

Be the contract for one coherent, accessible, fast presence across the site — consistent type,
color, spacing, surfaces, and interaction. With the identity deliberately deferred (below),
coherence is the target this document's *rules* plus the design spec deliver; it is not yet a
property of the live site (see Scope on the already-built sections).

## Scope: What Belongs Here vs. in a Spec

- **Here (steering):** principles, semantic token roles, usage rules, accessibility/performance/theme
  gates (as rules), surface and motion language, governance.
- **In a spec / in code:** exact palette and token values, the precise type and spacing scales,
  breakpoint-specific layouts, per-component and per-surface decisions, verification matrices, and
  the migration of the already-built sections. The token source of truth is `src/styles/tokens.css`
  plus the Tailwind v4 config (spacing scale + breakpoints).
- **Already-built sections:** the eight shipped site sections encode concrete type/color/spacing
  choices made *before* this document. Whether they constrain the deferred identity (and are
  codified) or are re-migrated to it is a design-spec decision; until then, "one coherent presence"
  is a target, not a current guarantee.
- **Applies to** the `(site)` route group. **Excludes** the `(playground)` route group, which is
  **cascade- and stacking-scoped** — `@layer playground` orders its CSS below the site layers,
  `isolation: isolate` gives it its own stacking context, and a base stylesheet re-establishes
  typography after `all: initial`. This is deliberate *scoping, not encapsulation*: CSS custom
  properties (`--font-*`, `--color-*`) and `@font-face` still inherit from `:root`. The playground
  is exempt from the visual gates because its items own their presentation — not because it is
  sealed. Floor: a playground item must not break keyboard access or focus for the embedding page.
- **Don't restate the other steering docs** — cross-reference them: `product.md` for vision/tone and
  experience principles, `tech.md` for the delivery mechanism (Tailwind v4, shadcn, `next-themes`,
  build/CSP) and exact CI budgets, `structure.md` for where CSS and components live.

## Design Principles

1. **Wide & spacious.** Generous, rhythmic whitespace on a named spacing scale; long-form prose
   held to a ~75-character measure ceiling (see Typography). Spaciousness is a choice of *steps*,
   not arbitrary values.
2. **Restraint over decoration.** Minimal and precise — signal infra/platform craft; feel like a
   person's home, not a corporate template.
3. **Accessible by default.** Semantic HTML, the full accessibility contract below, in both themes.
   Accessibility is a gate, not a polish pass.
4. **Both themes are first-class.** Light and dark are designed as a matched pair. For *chromatic*
   roles each theme's value is chosen deliberately, not auto-derived; the neutral grey ramp is
   necessarily lightness-related across themes — that is expected, not a violation.
5. **Fast is a feature.** Every visual choice lives within the performance gate; no unnecessary
   client JS on content pages.
6. **Roles, not one-offs.** Components consume semantic tokens (`bg-primary`,
   `text-muted-foreground`) and named scale steps — never literal colors or arbitrary sizes.

## Color

[Roles and rules here; concrete values live in the token source of truth.]

- **Active semantic roles** (those actually defined in `tokens.css` and mapped in `@theme`):
  `background`/`foreground`, `card`, `popover`, `primary`, `secondary`, `muted`, `accent`,
  `destructive`, `border`, `input`, `ring`. New roles are added only when an existing one cannot
  express a genuine need — and only once they exist in the token file.
- **Status feedback is under-served — do not reference roles that don't exist.** `destructive` is
  the only status role defined today. `success`/`warning`/`info` are **needed but not yet defined**;
  until they are added to `tokens.css` (`Deferred: design spec / tokens.css`), components must not
  emit `bg-success`/etc. (they resolve to nothing) and must not invent one-off feedback colors.
- **Reserved (out of contract):** `chart-*` and `sidebar-*` exist in `tokens.css` as inherited
  shadcn defaults but are **not** part of the active set — no surface may rely on them until a real
  need promotes them. The site has no sidebar. Data visualization is out of scope: the active
  palette has no chroma *system* for distinguishing data series, charts must never encode meaning by
  color alone (WCAG 1.4.1), and any charts are a design-spec decision.
- **Contrast is a pair property, not a role property.** Any text or icon must clear its contrast
  gate against the **surface it actually sits on** — meta text inside a `Card` on `muted` is gated
  against `muted`, not against `background` — in both themes. Interactive state colors
  (hover/active/disabled/focus `ring`) are color uses and are gated too. The full legal
  foreground×surface pairing matrix and a maximum surface-nesting depth are `Deferred: design spec`.
- **Theming:** light (`:root`) and dark (`.dark`) are a matched pair toggled by `next-themes`
  (class on `<html>`, `@custom-variant dark`); parity is expected and reviewed. Under
  `forced-colors`, state must not be conveyed by token color alone.
- **Concrete values:** `Deferred: design spec; authored in src/styles/tokens.css (OKLCH).` The
  palette is currently **near-neutral** — the greyscale ramp is zero-chroma, but `destructive`
  carries chroma (and the reserved shadcn defaults include chromatic values). Whether a chromatic
  accent is introduced for the active palette is a design-spec decision.

## Typography

- **Type roles:** display/headings (`h1`–`h6`, mapped to semantic HTML in order), body,
  secondary/meta, code. Emphasis never substitutes for correct heading structure.
- **Font families:** Geist Sans (`--font-sans`, UI/headings/body) and Geist Mono (`--font-mono`,
  code), self-hosted via `next/font` (the content-page CSP forbids external font origins).
- **Usage rules:** components pick a named scale step; they never set ad-hoc sizes.
- **Measure:** ~75 characters is a **ceiling on wide viewports**, not a fixed width — on narrow
  viewports the measure is viewport-bound and shrinks below 75ch. The wide-profile layout widens
  *gutters/asides*, not the prose measure.
- **Exact scale & voice:** `Deferred: design spec` — the precise scale (ratio/steps/line-heights,
  and whether it is mobile- or desktop-first) and any face/weight personality beyond Geist.

## Spacing & Layout

- **Spacing source of truth:** Tailwind v4's spacing scale is the closed step set (per `tech.md`).
  Arbitrary one-off values (`p-[18px]`, `gap-[13px]`) are disallowed — the rule is *a named step,
  never an arbitrary value*. Which steps express "wide & spacious" (section rhythm, page gutters)
  is `Deferred: design spec`.
- **Breakpoints:** responsive layout uses Tailwind v4's named breakpoints (`sm`/`md`/`lg`/`xl`/`2xl`)
  as the source of truth; the Responsive gate is written against those named tiers, not device
  labels. Breakpoint-specific layouts are `Deferred: design spec`.
- **Containers & density:** content sits in constrained, centered measures; comfortable density by
  default. The professional profile widens its layout (not its prose measure); see the exceptions
  rule below.
- **Exceptions rule:** a surface may exceed the standard measure/density only with a rationale
  recorded in *its* spec — not by ad-hoc negotiation per page.
- **Motion (optional):** purposeful and restrained — clarifies state/relationship, never decorates.
  *Whether* motion is used, and its duration/easing tokens, is `Deferred: design spec`, within the
  performance bar. Reduced-motion is under Accessibility. Theme toggles must not flash (a no-FOUC
  requirement); the implementation mechanism lives in code/`tech.md`.

## Components

[Cross-cutting conventions, not a catalog — per-component specifics belong in specs.]

- **Naming & structure:** shadcn/ui primitives are owned source in `src/components/ui/`; other
  components compose them (composition over forking). File/exports per `structure.md`.
- **Required states & how they're expressed:** default; hover/active = tokenized surface/tint shift
  (values `Deferred`); **visible focus** = the `ring` role meeting non-text contrast (≥3:1);
  disabled = a reduced-emphasis convention, **exempt from text-contrast** per WCAG; loading = a
  shared skeleton/spinner convention (`Deferred`); error = `destructive` (the only defined status
  role today; `success`/`warning`/`info` deferred). Each interactive component handles the applicable
  subset.
- **Variant policy:** variants are an *enumerated set per primitive*. A net-new variant is added to
  that set in the primitive — and a net-new tone requires a new *role*, never a one-off color.
  Ad-hoc variants are disallowed.
- **Component library & upstream policy:** shadcn/ui on Radix is the source of truth for behavior
  and ARIA. We own the **markup and styling** of the primitives in `src/components/ui/` and continue
  to **track upstream Radix** for behavior/accessibility/security fixes, reconciling them into our
  owned copies. Owning the composition layer does not mean abandoning upstream correctness. `lucide`
  is the icon set (see Accessibility for icon rules).

## Accessibility & Non-Negotiable Gates

The **standards** every UI must meet — the durable bars, stated as requirements. *How* they are
enforced (which are automated, their coverage, PR-check vs. deploy) is owned by `tech.md`/CI and
changes there; this section deliberately does **not** track CI state. **The unit each bar applies to
is named:** *every route* (theme parity, responsive) and *every interactive component's states*
(contrast, focus, keyboard). ("Surface" elsewhere means a token-backed container — `card`/`popover`/
`muted` — a different use of the word.) Several bars below (keyboard, reduced-motion, forced-colors)
have no automated check today and rest on manual review — passing automated CI is a floor, not a
guarantee.

- **Text contrast:** ≥4.5:1 normal text, ≥3:1 large text (≥24px, or ≥18.66px bold), against the
  surface it sits on, in **both** themes.
- **Non-text contrast (WCAG 1.4.11):** UI-component boundaries that convey state, and focus
  indicators, ≥3:1 against adjacent colors.
- **Focus:** every interactive element has a visible focus indicator (the `ring`) meeting non-text
  contrast.
- **Keyboard:** full keyboard operability for every interactive element.
- **Disabled:** exempt from contrast (per WCAG) — the conventional low-contrast disabled look is
  allowed.
- **Reduced motion:** `prefers-reduced-motion` honored.
- **forced-colors / High Contrast:** UI remains usable; state is never conveyed by token color
  alone (WCAG 1.4.1 applies generally).
- **Images & icons:** every image carries an explicit `alt` — `alt=""` for decorative, descriptive
  for meaningful. Inline SVG / `lucide` icons use `aria-hidden="true"` (decorative) or an accessible
  name (meaningful); **icon-only controls must have an accessible name** (WCAG 4.1.2).
- **Performance:** pages should hold strong Lighthouse scores (a ≥90 target) and meet the field
  metrics that "Fast is a feature" really targets — LCP, CLS, INP — plus a byte-weight budget. The
  concrete assertions, thresholds, and whether they gate PRs or deploys live in `tech.md`/CI
  (`lighthouserc.js`), not here.
- **Theme parity / Responsive:** every route is correct in both themes and across the named Tailwind
  breakpoints. Automated coverage and the audited route list are owned by `tech.md`/CI.
- **Scope:** gates apply to `(site)`; the playground is exempt except the keyboard/focus floor.

## Design Tokens (source of truth)

- **Source of truth:** `src/styles/tokens.css` — OKLCH values in matched `:root` (light) + `.dark`
  pairs, plus the single `--radius` dial (with `sm/md/lg/xl` derived) for all corner rounding. The
  Tailwind v4 config is the source of truth for the **spacing scale** and **breakpoints**. Steering
  points here; it does not duplicate concrete values.
- **Consumption:** the `@theme inline` block in `src/styles/globals.css` maps each token to a
  Tailwind utility (`--color-<role>` → `bg-<role>`/`text-<role>`); components use the utilities.
- **Naming convention:** semantic role names (`<role>` / `<role>-foreground`) as CSS custom
  properties (`--<role>`); `chart-*`/`sidebar-*` reserved.
- **Layering:** stacking uses a small tokenized z-index scale; overlays (popover/dialog/tooltip) use
  Radix portals. Exact scale `Deferred: design spec`.

## Governance & Ownership

The design system owns the token **values**; `tokens.css` is the implementation of this document,
and `design-system.md` wins when they disagree. shadcn's neutral/new-york output was the *starting
point*, retained where it serves and overridden where the system requires (e.g. the contrast-tuned
`--muted-foreground`/`--destructive`); there is no obligation to keep it regenerable.

- **Resolved in this pass:** the stale "regenerate from shadcn / do not hand-edit / stay
  byte-aligned with upstream" comments in `tokens.css` and `globals.css` have been corrected to
  point here. (`tech.md` and `structure.md` carry no such rule.)
- **Owner & drift control:** the maintainer owns this document. A manual "review item" is *not* a
  reliable control — v3 declared `success`/`warning`/`info` "active" while they were absent from
  `tokens.css`, and no human review caught it. The real control is an automated check that every
  role this document calls **active** exists in `tokens.css` and is mapped in `@theme`, failing CI
  on divergence; adding that check is `Deferred: tech.md / CI`. Until it exists, prose↔token
  divergence is a known, unenforced risk — not a guaranteed-caught one.
- **Upstream:** we track Radix for behavior/accessibility/security and reconcile fixes into the
  owned primitives (see Components).

## Deferred Decisions

The visual identity is intentionally **not** fixed here — it is chosen and adversarially
pressure-tested in the design spec's requirements phase. Each item names where it resolves:

- **Direction:** refine the current neutral/minimal look vs. a distinct brand identity —
  `Deferred: design spec (requirements)`.
- **Palette / chroma & exact OKLCH role values** (both themes) — `Deferred: design spec; tokens.css`.
- **Legal color-pair matrix + max surface-nesting depth** — `Deferred: design spec`.
- **Type scale** (ratio/steps/line-heights, mobile- vs desktop-first) **& typographic voice** —
  `Deferred: design spec`.
- **Spacing rhythm / gutters** (which steps express "spacious") — `Deferred: design spec`.
- **Breakpoint-specific layouts** — `Deferred: design spec` (breakpoint *values* are Tailwind's).
- **Motion presence + duration/easing tokens** — `Deferred: design spec`, within the perf bar. The
  theme-toggle no-flash mechanism is an implementation detail — `Deferred: code / tech.md`.
- **Elevation/shadow language** (system is currently flat/bordered) — `Deferred: design spec`.
- **Data-viz / chart palette** (requires the chroma decision; not-by-color-alone) —
  `Deferred: design spec`.
- **Status-role definitions** (`success`/`warning`/`info` — not yet in `tokens.css`) **and values** —
  `Deferred: design spec / tokens.css`.
- **CI gate upgrades** — LCP/CLS/INP + byte-weight assertions, full-route Lighthouse coverage, and
  the active-role↔token automated check — `Deferred: tech.md / CI` (enforcement is tech.md's domain).
- **Print / PDF styling** for the recruiter-facing profile (neutral+dark prints poorly) —
  `Deferred: design spec`.
- **Internationalization / RTL & logical-properties posture** — `Deferred: design spec`.
- **Token versioning / migration** of the already-built sections when deferred values land —
  `Deferred: design spec`.
- **Z-index scale values** — `Deferred: design spec`.

Steering constrains these (architecture, gates, budgets); it does not decide them.

## Voice & Tone

Professional but warm — "a person's home on the internet, not a corporate template" (see
`product.md` for the full tone). Interface microcopy stays concise and human; long-form copy gets a
plain-English pass. Detailed content conventions are out of scope here.

## Revision History

- **v5 (2026-06-06)** — addressed adversarial r4. Removed all description of *current CI state* from
  the gates (it churns, is `tech.md`/CI's domain, and v4 stated it wrong — `lighthouserc.js` actually
  asserts four categories and `lhci` runs on deploy, not as a PR check). The "Non-Negotiable Gates"
  section now states the **standards** the design must meet and points to `tech.md`/CI for
  enforcement/coverage, flagging which bars are manual-review-only today. Re-pointed the CI gate
  upgrades and the active-role↔token check to `tech.md`/CI (their real owner per Scope), not the
  design spec. Removed inlined CI trivia (`numberOfRuns`, `disableTransitionOnChange`). Fixed
  Components "error" to name `destructive` (the only defined status role).
- **v4 (2026-06-06)** — addressed adversarial r3 (verified against the codebase). Corrected two
  false claims: `success`/`warning`/`info` are not "active" roles (only `destructive` is defined in
  `tokens.css`; the rest are needed-but-deferred), and the palette is **near-neutral**, not
  zero-chroma (`destructive` carries chroma). Made the performance, route-coverage, and
  theme/no-flash gates honest about *current* CI enforcement (Performance ≥90 / median-of-3 is the
  only assertion today; LCP/CLS/INP, byte-weight, full-route coverage, and `disableTransitionOnChange`
  are deferred CI tasks). Downgraded the governance "review item" to a known-unenforced risk and
  named an automated active-role↔token check as the real control (deferred). Qualified the
  matched-pair principle (the neutral ramp is necessarily lightness-related across themes).
- **v3 (2026-06-05)** — addressed adversarial rounds v1 (A–G) and v2 (A–F): pair-level contrast,
  full a11y contract, Lighthouse category/median/CWV, status roles + state conventions, governance
  contradiction resolved in `tokens.css`/`globals.css` + upstream policy + owner/drift, playground
  restated as cascade/stacking scope, spacing/breakpoint sources of truth, image/icon a11y,
  chart/sidebar reserved, "surface" disambiguated, measure as a mobile-shrinking ceiling. Added
  deferrals for print/PDF, i18n/RTL, token versioning, z-index.
- **v2 / v1** — initial reconcile to the revised template and the original direction-light draft.
