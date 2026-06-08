# Requirements Document — visual-design

## Introduction

This spec resolves the visual identity that `design-system.md` deferred, and applies it across the
already-built site. The direction is **minimal + one accent**: a clean, near-neutral foundation with
a single restrained brand accent — *executed distinctively, not generically.* A restrained palette
suits the recruiter audience and the "professional but warm" tone, and one accent keeps maintenance
trivial for a solo dev; the risk of that direction is blandness, so this spec explicitly requires one
deliberate signature element and a typographic point of view so the result is memorable rather than
template-grade. Concrete values (the accent hue/OKLCH values, the type-scale numbers, the signature
treatment, spacing steps) are chosen in the **Design** phase with rationale and reference targets;
this document fixes *what* must be true. The `(playground)` route group is out of scope.

## Alignment with Product Vision

Realizes the visual system `product.md` points to in `design-system.md`. Serves the **professional
inbound funnel** (a coherent, *memorable*, credible presence for recruiters), the **"approachable and
human"** and **"wide and spacious"** principles, and the **responsive/accessible** mandates — inside
the design system's accessibility and performance gates and "no unnecessary JavaScript on content
pages." Builder credibility is undercut by a forgettable site, so distinctiveness (R3) is a
first-class requirement, not a nice-to-have.

## Requirements

### Requirement 1 — Coherent, token-driven identity across the site

**User Story:** As a recruiter browsing several pages, I want the whole site to feel like one
deliberate product, so that it reads as credible builder-evidence.

#### Acceptance Criteria

1. WHEN any `(site)` route is viewed THEN it SHALL render with the single shared, token-driven
   identity, in both light and dark themes.
2. The identity SHALL be expressed entirely through design-system token roles and named scale steps;
   no page or component SHALL use one-off colors, font sizes, or spacing values (grep-able: no
   arbitrary Tailwind values like `text-[..]`, `bg-[#..]`, `p-[..]` in `(site)`).
3. WHEN the redesign is complete THEN every `(site)` section SHALL apply the finalized tokens; the
   signature treatment (R3) appears where appropriate and **most fully on the priority surfaces**
   (hero, profile per R3.2/R8.3) — not uniformly on every section. Verified by side-by-side review
   against the `design-baseline/` screenshots in both themes; the design-review checkpoint (the
   spec's Design approval + adversarial pass) is the arbiter of subjective quality.

### Requirement 2 — Minimal base with one restrained brand accent

**User Story:** As Matthew, I want a clean neutral base with one brand accent, so that the site has
identity without looking busy or amateur.

#### Acceptance Criteria

1. The base palette (all neutral roles — `background`, `foreground`, `card`, `popover`, `secondary`,
   `muted`, `border`, `input`, and the existing shadcn `accent` surface tint) SHALL be **zero-chroma**
   (OKLCH chroma = 0), matching the design system's neutral ramp. Only the brand accent, the status
   roles, and the focus `ring` (which carries the brand accent per R2.3) carry chroma.
2. A SINGLE brand accent SHALL be introduced as a **new, distinctly-named** design-system role (e.g.
   `brand` or `link`) defined in `tokens.css` and mapped in `@theme`. It SHALL NOT repurpose the
   existing shadcn `accent` role, which is a neutral hover/surface tint and SHALL stay neutral. The
   brand accent SHALL be a deliberate matched pair for BOTH themes (each value chosen for its theme,
   with stated dark-mode behavior — not a light value reused in dark).
3. WHEN the brand accent is applied THEN it SHALL be limited to interactive emphasis — links, primary
   CTAs, the focus `ring`, active/selected states — and SHALL NOT fill page or section backgrounds,
   cards, or other large surfaces.
4. The brand accent SHALL meet its contrast bars in both themes for every use (text or non-text per
   R5), with equivalent identity presence in dark mode (not merely passing 4.5:1).

### Requirement 3 — One deliberate signature element (distinctiveness)

**User Story:** As a recruiter, I want to remember this site after closing the tab, so that Matthew
stands out from the other candidates whose sites look identical.

#### Acceptance Criteria

1. The identity SHALL include ONE deliberate, memorable signature treatment (e.g. a distinctive
   heading/display treatment, a recurring visual motif, or a confident spatial gesture) — chosen in
   the Design phase with a written rationale and at least two reference targets.
2. WHEN the signature is defined THEN it SHALL appear most fully on the highest-value surfaces (the
   landing hero and the professional profile at minimum) without violating the restraint rules (R2).
3. The signature SHALL be tokenized/componentized so it is reused, not re-implemented per page, and
   SHALL respect all accessibility and performance gates.
4. IF the signature cannot meet the gates THEN it SHALL be revised or replaced — distinctiveness does
   not override accessibility or performance.
5. Distinctiveness SHALL come from at least TWO deliberate craft choices (e.g. a display/heading
   treatment, a spatial/structural gesture, a signature detail) — NOT from the brand accent color
   alone.
6. The Design rationale SHALL state what makes the identity distinct from a generic shadcn-neutral
   site and how each priority surface expresses it; the design-review arbiter SHALL test the result
   against that rationale — an outcome a reviewer cannot distinguish from a default shadcn-neutral
   site FAILS this requirement.

### Requirement 4 — Typographic voice (evaluated, not defaulted)

**User Story:** As Matthew, I want type that carries character, so that the site doesn't read as a
generic developer template.

#### Acceptance Criteria

1. The Design phase SHALL deliberately evaluate the current Geist sans/mono against alternatives and
   choose with a written rationale; headings MAY use a different face/treatment from body.
2. The chosen type SHALL carry deliberate character (weight contrast, display/heading treatment,
   rhythm) — type is identity here, not only legibility.
3. The spec SHALL fix the type scale (steps, ratio, line-heights). WHEN long-form prose is rendered
   THEN it SHALL hold the ~75-character measure on wide viewports and shrink on narrow ones; the
   professional-profile layout SHALL widen gutters, not the prose measure.
4. Any non-Geist face SHALL be self-hosted via `next/font` (CSP forbids external font origins) and
   SHALL stay within the performance gate (no webfont-driven CLS regression).

### Requirement 5 — Every used color pairing meets AA in both themes

**User Story:** As a visitor on assistive tech or a bright screen, I want sufficient contrast
everywhere, so that the site is legible and accessible.

#### Acceptance Criteria

1. WHEN any text or icon sits on a surface THEN it SHALL meet the design-system contrast bar against
   THAT surface (≥4.5:1 normal, ≥3:1 large) in both themes; NO foreground×surface pairing used by the
   built sections SHALL fail in either theme.
2. WHEN the accent or a status role is used for a stateful control boundary or the focus ring THEN it
   SHALL meet non-text contrast (≥3:1, WCAG 1.4.11).
3. WHEN color conveys state THEN that state SHALL ALSO be conveyed by a non-color signal (WCAG 1.4.1).

### Requirement 6 — Status feedback roles defined

**User Story:** As a visitor submitting the contact form, I want clear success/error feedback, so
that I know whether my message sent.

#### Acceptance Criteria

1. The spec SHALL define `success`, `warning`, and `info` token values (alongside `destructive`) in
   `tokens.css` and map them in `@theme`, in both themes.
2. WHEN a feedback state is shown THEN it SHALL use a status role (never a one-off color) and pair
   color with a text/icon signal.
3. Every role the design system lists as "active" SHALL exist in `tokens.css` and be mapped in
   `@theme` (no doc↔token divergence).

### Requirement 7 — Spacing, surfaces, and motion

**User Story:** As a visitor, I want a spacious, calm, fast interface, so that the site feels
polished and considered.

#### Acceptance Criteria

1. The spec SHALL fix the spacing rhythm using named Tailwind steps (no arbitrary values); WHEN
   sections and pages are laid out THEN spaciousness SHALL be a deliberate, consistent trait (named
   minimum gutters / section rhythm), not incidental whitespace.
2. The spec SHALL settle the surface-separation language (consistent, tokenized — flat/bordered or a
   small elevation set) and apply it uniformly; the specific choice is a Design deliverable.
3. Motion SHALL be minimal and purposeful, honor `prefers-reduced-motion`, and stay within the
   performance gate. WHEN the theme is toggled THEN the UI SHALL NOT flash (no-FOUC).

### Requirement 8 — Brand-identity artifacts

**User Story:** As a recruiter sharing or bookmarking the site, I want it to look intentional
everywhere it appears, so that it reads as a finished, owned product.

#### Acceptance Criteria

1. The spec SHALL deliver a brand mark / wordmark that replaces the placeholder "MF" avatar, and a
   matching favicon set.
2. The spec SHALL deliver default Open Graph / social-share image(s) consistent with the identity
   (per the site-foundation metadata convention).
3. The landing **hero** and the professional **profile** SHALL be treated as priority identity
   surfaces (they carry the signature treatment first and most fully).
4. Link states SHALL be defined and consistent: default, hover, focus-visible, and visited.
5. The professional profile SHALL have print/PDF styling that produces a clean, light, readable CV
   (the design system defers print/PDF to this spec; the site's neutral+dark theme prints poorly).

### Requirement 9 — Applied across all eight built sections

**User Story:** As a recruiter browsing widely, I want consistency across the whole site, so that the
experience holds up beyond the landing page.

#### Acceptance Criteria

1. WHEN the identity is finalized THEN it SHALL be applied to all eight `(site)` sections (landing,
   professional profile, projects, contributions, blog, resources, slash pages).
2. FOR EACH built section THEN the spec SHALL decide and record whether to codify its existing look
   or re-style it to the new identity.
3. The `(playground)` route group SHALL be left unchanged (out of scope).
4. WHEN the work is complete THEN the existing Vitest and Playwright suites SHALL remain green (no
   functional regressions).

### Requirement 10 — Design-system gates hold (enforcement owned by tech.md/CI)

**User Story:** As Matthew, I want the design-system gates to actually hold, so that the redesign
doesn't regress contrast, performance, or doc↔token consistency.

#### Acceptance Criteria

1. WHEN the redesign ships THEN all design-system gates SHALL hold (contrast both themes, 90+
   Lighthouse Performance, theme parity, responsive at the named breakpoints).
2. The deferred gate-enforcement upgrades — LCP/CLS/INP + byte-weight assertions, full-route
   Lighthouse coverage, and the active-role↔token CI check — are owned by `tech.md`/CI per the design
   system; this spec depends on and coordinates with that work but does not own it.
3. The no-flash theming fix (`disableTransitionOnChange`), being an app-code change, IS in scope for
   this spec (supports R7.3).

## Non-Functional Requirements

### Code Architecture and Modularity
- **Token-driven**: the identity lives entirely in `src/styles/tokens.css` + the `@theme` mapping and
  per-section CSS; components consume tokens. Future content/sections SHALL require no new one-off
  styling. The signature treatment SHALL be a reusable token/component.

### Performance
- Static `(site)` pages hold a 90+ Lighthouse Performance score; LCP/CLS/INP within budget; webfont
  CLS bounded. No identity choice (accent, type, signature, motion) may add unnecessary client JS to
  content pages.

### Accessibility
- The full design-system accessibility contract holds in both themes (AA text contrast, non-text
  1.4.11, visible focus, keyboard, reduced-motion, forced-colors usable, correct image/icon a11y).
  axe passes; keyboard/reduced-motion/forced-colors verified by manual review.

### Reliability
- No regression to existing functionality; existing Vitest and Playwright suites remain green. The
  playground is visually unaffected.

### Usability
- Correct and legible at all named Tailwind breakpoints (mobile first-class) and in both themes; the
  ~75-character prose measure is respected.

## Revision History

- **v4** — addressed adversarial r3 (1 must-fix). Resolved a focus-`ring` contradiction: the focus
  ring carries the brand accent (an interactive-emphasis use per R2.3), so R2.1 no longer lists
  `ring` among the zero-chroma neutral roles and names it as chromatic. (r3 confirmed all r1/r2 fixes
  hold against `tokens.css`.)
- **v3** — addressed adversarial r2 (1 must-fix, 4 should-fix; all verified against code/steering).
  Fixed the **token-reality contradiction**: R2.2 now introduces the brand accent as a **new,
  distinctly-named role** (`brand`/`link`), NOT the existing shadcn `accent` (a neutral surface tint
  that stays neutral). Set a numeric rule: base/neutral roles are **zero-chroma** (R2.1, matching
  steering); only brand-accent + status carry chroma. Gave **R3** a falsifiable bar (≥2 craft choices,
  not accent alone; "cannot be distinguished from a generic shadcn-neutral site → FAILS"). Reconciled
  **R1.3** (signature most-fully on priority surfaces, not every section) with R3.2/R8.3. Added
  **R8.5** print/PDF profile styling (deferred to this spec by the design system).
- **v2** — addressed the v1 adversarial review (frontend-design lens). Added **R3 distinctiveness**
  (one deliberate signature element, with rationale + reference targets — per the chosen direction)
  and **R8 brand-identity artifacts** (wordmark/favicon/OG, hero+profile priority, link states).
  Reworked **R4** into a typographic-voice requirement (evaluate Geist vs. alternatives, type as
  identity). Made vague criteria testable (zero-chroma base except accent/status; accent never fills
  backgrounds; outcome-based contrast in R5; a named design-review arbiter for subjective quality).
  Fixed scope: **R10** no longer owns CI work (routed to `tech.md`/CI per steering); elevation/pairing
  specifics are Design deliverables, not requirements artifacts. Recorded the minimal+one-accent
  rationale in the Introduction.
- **v1** — initial requirements (minimal + one accent direction).
