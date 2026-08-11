# Design Document — visual-design

## Overview

This design resolves the visual identity that `design-system.md` deferred and applies it across the
eight already-built `(site)` sections. It fixes the concrete values the requirements left to the
Design phase: the brand-accent OKLCH pair, the type scale and typographic voice, the one deliberate
signature treatment, the spacing rhythm and surface language, the status-role values, the print/PDF
profile styling, and the brand-identity artifacts (wordmark, favicon, OG image).

The chosen identity is **minimal + one warm accent, with an editorial-technical typographic voice.**
A near-neutral, flat "spec-sheet" foundation carries one restrained **rust** brand accent; headings
speak in a **serif display** face while UI/body stay **Geist Sans** and code/labels use **Geist
Mono**. The signature is **the path-mark**: a recurring brand-colored `/` expressed as the `mf/`
wordmark, as mono `/ kicker` labels above headings, and as a hairline brand rule — most fully on the
landing hero and the professional profile. The point of this pairing is to be **memorable without
being loud**: a recruiter should be able to recall the site (serif name, `mf/` mark, rust `/`
labels, flat hairline surfaces) yet never mistake it for a busy or amateur design.

The work is overwhelmingly **token + CSS**, plus three small new components, a font addition, one
`next-themes` prop, and the Next.js metadata files for the brand artifacts. No data layer, routing,
or content-pipeline change.

## Steering Document Alignment

### Technical Standards (tech.md)

- **Tailwind v4 + shadcn owned source.** All values live in `src/styles/tokens.css` (OKLCH, matched
  `:root`/`.dark` pairs) and the `@theme inline` mapping in `src/styles/globals.css`; components
  consume utilities. `tokens.css` is the design system's implementation — these edits are the
  authoritative way to change the identity (tech.md §Styling).
- **Self-hosted fonts under CSP.** The content-page CSP forbids external font origins
  (`font-src 'self'`). `next/font/google` **self-hosts at build** (downloads the woff2 and serves it
  from our origin), so adding a Google-hosted-but-self-served display face is CSP-compliant, exactly
  as the existing Geist setup is (`src/app/layout.tsx:2-15`). No external font request is added.
- **Performance gate.** No identity choice adds client JS to content pages: the accent, type,
  signature, and surfaces are CSS-only. The one added webfont is variable, latin-subset, `swap`, with
  `next/font`'s automatic size-adjust fallback metrics to bound CLS (perf rationale in
  §Error Handling → CLS).
- **CI / gate enforcement stays tech.md's domain** (R10.2). This spec produces the values the gates
  check; the LCP/CLS/INP + byte-weight assertions, full-route Lighthouse coverage, and the
  active-role↔token CI check remain deferred to `tech.md`/CI per the design system.

### Project Structure (structure.md)

- New components follow `kebab-case.tsx`, one PascalCase named export, placed in
  `src/components/layout/` (wordmark — site chrome) and `src/components/shared/` (section kicker,
  status callout — cross-page reusables). No barrel files; absolute `@/` imports.
- New CSS is added as token edits to `tokens.css`/`globals.css` and one print slice
  `src/styles/print.css` imported from `globals.css` (mirrors the existing `src/styles/blog/*.css`
  slice convention).
- Brand-artifact files use the Next.js App Router metadata convention in `src/app/`
  (`icon.svg`, `apple-icon.png`, `opengraph-image.tsx`) per structure.md's route-file conventions.
- No new arbitrary Tailwind values: every size/space/color resolves to a token or a named Tailwind
  step (R1.2), including a new `--container-measure` so the prose width stops using `max-w-[75ch]`.

## Code Reuse Analysis

### Existing Components to Leverage

- **`tokens.css` + `@theme inline` mapping** (`src/styles/tokens.css`, `src/styles/globals.css:47-83`):
  extended with the new `brand`, status, and measure tokens — the established way to add a role.
- **Header brand link** (`src/components/layout/header.tsx`): today the header renders the **text
  link** `siteConfig.name` ("Matthew Field"), not an avatar. The new `Wordmark` **replaces that text
  link**.
- **`AvatarPlaceholder`** (`src/components/shared/avatar-placeholder.tsx`): its default "MF" initials
  render only in the **landing hero** and as the **profile headshot fallback** — not in the header.
  The `Wordmark` **replaces the hero's `AvatarPlaceholder`**; the component is kept only as the
  neutral profile fallback for a missing headshot (no longer the brand mark).
- **shadcn `Button`** (`src/components/ui/button.tsx`, CVA variants): gains one `brand` variant for
  the single primary CTA per page; existing `default`/`secondary`/`ghost`/`link` variants are
  unchanged (the neutral `primary` role stays neutral).
- **`HeroCard`** *(superseded)*: at the time this spec shipped the landing page was a grid of
  navigational cards, and `HeroCard` had its hover treatment re-pointed from `bg-accent/40` to the
  tokenized hover convention. The landing page was later rebuilt around a lead paragraph, a derived
  "Recent work" stream, and a path index (see §6), and `HeroCard` was deleted with the card grid.
  The tokenized hover convention it established still governs card-like surfaces elsewhere.
- **`ThemeProvider`** (`src/components/layout/theme-provider.tsx`): gains the `disableTransitionOnChange`
  prop (R10.3 / R7.3 no-flash) — a one-line change, no new component.
- **Reading-progress bar** (`src/styles/blog/reading-progress.css:11-17`): its one-off blue fill
  (`oklch(0.55 0.2 240)` / `0.7 0.16 240`) is replaced by `var(--brand)`, folding the site's only
  pre-existing chroma into the new role rather than leaving a second accent.

### Integration Points

- **Root layout** (`src/app/layout.tsx`): registers the new `--font-display` variable alongside the
  existing Geist variables on `<html>`; updates `metadata` only if OG wiring requires it.
- **Site header / hero** (`src/components/layout/header.tsx`, `src/app/(site)/page.tsx`): consume
  `Wordmark` and `SectionKicker`.
- **Profile** (`src/app/(site)/profile/page.tsx`): consumes `SectionKicker`, the serif display, and
  the new print stylesheet.
- **All `(site)` long-form prose** (blog, projects, about/now/colophon): the prose type scale and
  `--container-measure` replace today's unstyled `.prose` + `max-w-[75ch]` (see §Architecture →
  Typography for the `@tailwindcss/typography` decision).

## Architecture

The identity is a **token layer** (values) consumed by a thin **component/utility layer** (three new
components + Tailwind utilities + one print slice). Nothing introduces a runtime; everything is
build-time CSS and server components.

```mermaid
graph TD
    T[tokens.css: brand + status + measure OKLCH pairs] --> M[@theme inline mapping in globals.css]
    F[next/font: Geist Sans + Geist Mono + Fraunces display] --> M
    M --> U[Tailwind utilities + .prose scale + print.css]
    U --> W[Wordmark]
    U --> K[SectionKicker]
    U --> S[StatusCallout / status roles]
    U --> B[Button: brand variant]
    W --> H[Header + Landing hero]
    K --> H
    K --> P[Profile + section headers]
    S --> CF[Contact feedback]
    B --> CTA[Primary CTAs]
    P --> PR[print.css → clean CV]
```

### Modular Design Principles

- **Single source of truth for values:** every color/size/space is a token or named Tailwind step;
  components never hardcode literals (NFR Code Architecture, R1.2).
- **Signature is componentized, not copied:** the path-mark lives in `Wordmark` + `SectionKicker`
  (R3.3), reused across sections rather than re-implemented per page.
- **Surfaces are flat:** separation is by hairline `border` + `muted`/`card` tint, not elevation
  (see §Surfaces), keeping the "spec-sheet" restraint.

### 1 — Color: minimal base + one rust brand accent (R2, R5, R6)

**Base stays zero-chroma (R2.1).** All neutral roles — `background`, `foreground`, `card`,
`popover`, `primary`/`primary-foreground`, `secondary`, `muted`, the shadcn `accent` surface tint,
`border`, `input` — keep chroma = 0, matching today's `tokens.css`. **`primary` is explicitly named
here as zero-chroma neutral** (the near-black/near-white solid-button role): the brand accent does
**not** recolor it. The only chromatic roles are: **the brand accent family** (`--brand`,
`--brand-foreground`, and the prose-only `--brand-visited` — all of which are R2.1's single "brand
accent", sharing one hue), **the four status roles**, and **the focus `ring`** (which carries the
brand, R2.1/R2.3). `--brand-visited` is the brand at reduced chroma for the visited-link state, not a
new accent, so it sits inside R2.1's "brand accent" and the active-role↔token check treats it as
part of the brand role — not a seventh chromatic accent.

**The brand accent is a new role `--brand` / `--brand-foreground` (R2.2)** — a distinctly-named role,
not the shadcn `accent` (which stays a neutral hover tint). It is a deliberate matched pair, each
value chosen for its theme (R2.2/R2.4):

| Token | Light (`:root`) | Dark (`.dark`) | Rationale |
|---|---|---|---|
| `--brand` | `oklch(0.50 0.13 42)` | `oklch(0.75 0.12 55)` | Rust → warm amber-rust. The hue lifts 42→55 in dark so it reads as a confident warm accent on near-black instead of going muddy-brown; lightness inverts (dark accent on light, light accent on dark) so identity presence is equivalent in both themes (R2.4), not merely passing. |
| `--brand-foreground` | `oklch(0.99 0 0)` | `oklch(0.205 0 0)` | Text/icon color when placed **on** a brand fill (the `brand` button). Near-white on light-mode rust; near-black on dark-mode amber. |

Rust is chosen deliberately over the default developer-blue (which the latent reading-progress bar
currently uses): it is **warm** (serves product.md's "approachable and human" tone), uncommon in the
shadcn-neutral crowd (distinctiveness, R3.6), and quietly systems-flavored. It is one hue, used
sparingly.

**Brand is limited to interactive emphasis and thin brand indicators (R2.3).** Enumerated allowed
uses — and **only** these:

- link text (default/hover/visited/focus, R8.4), in prose and chrome — this includes the shadcn
  `link` **Button variant** (`text-primary` today → `text-brand`); the neutral `default` solid
  button (`bg-primary`) stays neutral;
- the focus `ring` (R2.1/R2.3) — `--ring` becomes `var(--brand)` in both themes;
- **one** primary CTA per page (the `brand` Button variant). "The primary CTA" is the single most
  important action on that page, designated in its section: on the **profile** it is the contact
  CTA (the email/"Get in touch" action), and on the **landing** it is the same contact action in
  the closing contact strip. (This clause originally said the landing had none, because the landing
  was then a grid of navigational cards with no action to designate. The rebuilt landing page ends
  in a contact strip — the inbound funnel is the homepage's stated job per `product.md` — so it now
  designates one.) A page has at most one brand-filled button; everything else uses
  neutral/`ghost`/`link`;
- active/selected affordances (active nav marker, active TOC item);
- the `/` glyph in the wordmark and section kickers (the signature mark);
- thin non-interactive brand indicators that are not surfaces: the reading-progress line and a
  hairline section rule;
- **non-text data marks in a single-hue sequential ramp** — brand at varying alpha, used to encode
  one ordered magnitude, under the steering carve-out in `design-system.md` (§Color). Added for the
  `github-activity` contribution heatmap. A data mark is a small non-interactive shape carrying no
  foreground; the ramp orders marks by luminance and is always paired with a non-color channel.

**Forbidden:** the brand SHALL NOT fill page/section backgrounds, cards, or any large surface
(R2.3). The `brand` Button is a small control, not a surface. **A field of data marks is not a
surface** — individual marks are small, carry no content, and sit *on* a surface; but the field as a
whole SHALL NOT be given a brand-tinted background, which would be the forbidden case.

**Link states (R8.4), tokenized:**

| State | Treatment |
|---|---|
| default | `text-brand`, no underline in chrome; underlined in prose body for scannability |
| hover | add/strengthen underline (`underline underline-offset-4`); color unchanged |
| focus-visible | `ring` = `--ring` (brand) at **full alpha**, ≥3:1 non-text (R5.2) — see ring-alpha note |
| visited | `text-brand-visited` (brand at reduced chroma) in prose long-form only; chrome links are not visited-styled |

`--brand-visited` light `oklch(0.50 0.06 42)` / dark `oklch(0.72 0.05 55)` — same hue as brand, lower
chroma, still ≥4.5:1 (computed ~6.1/7.9); used only where a visited distinction aids reading (prose
link lists). It is part of the brand accent family (above), not a separate accent.

**Focus-ring alpha (R5.2, WCAG 1.4.11).** shadcn's `Button` focus uses `focus-visible:ring-ring/50`
(`button.tsx`). At 50% alpha the ring composites toward the surface and the effective non-text
contrast drops below the solid-brand figures (≈3:1 → under the bar). So this design specifies the
focus ring is drawn at **full alpha** (`ring-ring`, i.e. solid `--brand`), which clears ≥3:1 against
background/card/muted in both themes (computed 5.8–8.6:1 solid). The `Button` focus-visible utility
is changed from `ring-ring/50` to `ring-ring` (full alpha) so every interactive element's focus
indicator meets non-text contrast — a small CVA edit, applied uniformly.

**Status roles (R6).** Add `success`, `warning`, `info` alongside the existing `destructive`, each a
matched pair, mapped in `@theme`. Usage rule (unchanged from `destructive` today): the role color is
used for **text + icon on a `/10` tint of the same role** (e.g. `bg-success/10 text-success`); state
is **always** paired with a text/icon signal, never color alone (R5.3, R6.2).

**Contrast is gated on the composited tint, on the deepest legal surface.** A `/10` tint is an
alpha layer composited over whatever surface it sits on, so the gate is `text-<role>` over
`<role>/10` **composited on both `background` and `card`** (the deepest surface a status callout may
nest into — max nesting depth 2; a callout SHALL NOT nest deeper than a card). The values below are
tuned so text clears the AA bar over the tint on **both** background and card in **both** themes (not
just over the solid role), **with a stated margin (target ≥4.6, not merely ≥4.5)** — because a value
landing on 4.50 is a coin-flip once the browser composites the alpha in sRGB-gamma. All three light
values were recomputed **together** (the lesson from the v2 retune, which fixed one role and left
another on the bar); implementation re-verifies against the contrast tool:

| Role | Light | Dark | Hue note |
|---|---|---|---|
| `--success` | `oklch(0.50 0.15 150)` | `oklch(0.74 0.15 150)` | green 150 — light **darkened to L0.50 / C0.15** (was 0.52/0.14, which composited to exactly 4.50 — zero margin); now ≈4.8 over its `/10` tint, with margin |
| `--warning` | `oklch(0.52 0.12 85)` | `oklch(0.76 0.13 85)` | amber 85 — light darkened (was 0.55, composited to exactly 4.50; now 4.84) and dark lifted for card-nesting margin; held away from brand's 42–55 so warning ≠ brand; always icon-paired |
| `--info` | `oklch(0.52 0.14 240)` | `oklch(0.74 0.13 240)` | blue 240 — dark lifted (was 0.70, which dipped to 4.31 over a card tint); light 4.61 |
| `--destructive` | `oklch(0.5 0.22 27.325)` *(kept)* | `oklch(0.704 0.191 22.216)` *(kept)* | unchanged |

`-foreground` for filled status (rare): near-white (light) / near-black (dark), as brand. Every role
the design system calls "active" will exist in `tokens.css` and be mapped in `@theme` (R6.3) — this
design moves `success`/`warning`/`info` from "deferred" to "active" by defining them.

**Legal foreground×surface pairing matrix + max nesting (R5.1, resolves a design-system deferral).**
Surfaces are `background`, `card`, `popover`, `muted`, and the status `/10` tints. **Max surface
nesting depth = 2** (e.g. `muted` card on `background`, then meta text inside it — gated against
`muted`; no third nested token surface). Each cell is the legal foreground for that surface and the
target ratio; exact ratios verified against the contrast tooling at implementation:

| Foreground ↓ / Surface → | background | card | muted | `<role>/10` tint |
|---|---|---|---|---|
| `foreground` | ✓ ≥4.5 | ✓ ≥4.5 | ✓ ≥4.5 | — |
| `muted-foreground` | ✓ ≥4.5 (tuned: L0.5/0.74) | ✓ | ✓ ≥4.5 (the reason `--muted-foreground` was tuned) | — |
| `brand` (link) | ✓ ≥4.5 | ✓ ≥4.5 | ✓ ≥4.5 | — |
| `brand` ring / boundary | ✓ ≥3 (non-text) | ✓ ≥3 | ✓ ≥3 | — |
| `<role>` text (status) | ✓ ≥4.5 | ✓ ≥4.5 (own tint over card) | — | ✓ ≥4.5 on own tint over bg |
| `brand` data mark (non-text) | ✓ see below | ✓ see below | — | — |

**Non-text data marks (added for `github-activity`).** A data mark has **no foreground**, so the
foreground×surface matrix above cannot gate it; it is gated mark-versus-surface instead. For a
single-hue sequential ramp of `brand` at alpha over **`background` or `card`** — both are legal, and
the gates below are evaluated against whichever surface the marks actually sit on:

| Gate | Target |
|---|---|
| Darkest step vs its surface | ≥3:1 (non-text, WCAG 1.4.11) |
| Each step vs its immediate neighbour | ≥1.3:1 |
| "No value" step vs its surface | ≥1.5:1 — must stay visible where `card` and `background` are both white |

Both themes, composited, measured and recorded per-step in the consuming spec's design document.
**Nesting carve-out:** data marks placed on `card` on `background` would be depth 3, one deeper than
the max above. Permitted for this class only, because the marks carry no text and therefore trigger no
text-contrast gate at any depth. The carve-out does not extend to any surface carrying content, and is
not needed when the marks sit directly on `background` at depth 2 — which is the shipped arrangement
for `github-activity`.

Status text is gated on its `/10` tint **composited over both `background` and `card`** (the deepest
legal nest) — see the status-roles compositing note above; the values were tuned for that, not just
the solid role. No built-section pairing may fall outside this matrix in either theme (R5.1).

### 2 — Typography: editorial-technical three-voice system (R4)

**Evaluation and choice (R4.1).** Geist Sans is **retained** for UI/body and Geist Mono for code —
both are already self-hosted, highly legible, performant, and zero-migration-risk; replacing the body
face would be churn for little gain. But all-Geist is precisely the generic developer look R3/R4
warn against, so **headings adopt a serif display face, `Fraunces`** (variable, optical-size axis,
high stroke contrast, a warm/editorial character). This is the deliberate "evaluate Geist vs.
alternatives and choose with rationale; headings MAY use a different face" the requirement asks for.

A candid note on the serif: Fraunces is a *popular* personal-site display serif, so the serif **by
itself** is not what makes the identity distinctive — the load-bearing distinctiveness is the
**system** (the mono `/`-kicker labels + the rust accent + the flat hairline surfaces; see §3). The
serif is the warm voice that lets that system read as editorial rather than terminal; it is one of
four choices, not the signature pillar. (Alternatives weighed: keeping all-Geist with a heavy/tight
display weight — rejected as too close to the stock look; a less-worn display serif such as
Newsreader or a slab — viable, but Fraunces' optical-size axis gives stronger large-display
character at the hero step.) The result is a three-voice system:

- **Display (serif, `Fraunces`, `--font-display`)** — `h1`/`h2`, hero, the profile headline. Tight
  tracking, optical sizing up at large steps; carries the character (R4.2).
- **Body/UI (sans, `Geist Sans`, `--font-sans`)** — paragraphs, `h3`–`h6`, controls, nav.
- **Mono (`Geist Mono`, `--font-mono`)** — code **and** the signature `/ kicker` labels (uppercase,
  tracked) — the editorial-technical tie to infra/paths.

`Fraunces` is added via `next/font/google` (self-hosted, CSP-safe), latin subset, `display: "swap"`,
variable weight, exposed as `--font-display` on `<html>` next to the Geist variables; mapped in
`@theme` as `--font-display`. Non-Geist face self-hosting requirement (R4.4) is met.

**Type scale (R4.3) — named Tailwind steps only, no arbitrary sizes.** Major-third-ish, anchored at
`1rem` body:

| Role | Step (utility) | rem | line-height | face |
|---|---|---|---|---|
| kicker | `text-xs` | 0.75 | 1.4, `tracking-widest`, uppercase | mono |
| meta/caption | `text-sm` | 0.875 | 1.5 | sans |
| body | `text-base` | 1.0 | 1.65 prose / 1.5 UI | sans |
| lead | `text-lg` | 1.125 | 1.6 | sans |
| h4–h6 | `text-base`–`text-xl` | 1.0–1.25 | 1.3 | sans |
| h3 | `text-2xl` | 1.5 | 1.25 | sans (or serif on long-form) |
| h2 | `text-3xl` | 1.875 | 1.15 | serif |
| h1 | `text-4xl` (`sm:text-5xl`) | 2.25→3.0 | 1.1 | serif |
| hero display | `text-4xl` `sm:text-5xl` `md:text-6xl` | 2.25→3.0→3.75 | 1.05 | serif |

All steps are Tailwind defaults already in the codebase (`page.tsx`/`profile/page.tsx` use
`text-3xl sm:text-4xl`), so the scale is named, not arbitrary. **Mobile (< `sm`) hero step is
explicit:** the hero display starts at `text-4xl` (2.25rem) — not `text-5xl` — so the serif name
fits a 360px column, and carries `text-balance` so "Matthew Field" wraps evenly rather than
orphaning a word. It scales up to `text-6xl` only at `md`. Below `md` the hero display equals the h1
step by intent: on small screens the hero is distinguished from a section h1 by its wordmark, `/`
kicker, hairline rule, and position — not by size alone — so it need not be larger there.

**Measure (R4.3).** Long-form prose holds a **75ch ceiling** on wide viewports and is viewport-bound
(shrinks) on narrow ones. Implemented as a token: add `--container-measure: 75ch` to `@theme`,
yielding the named utility `max-w-measure`. Current state and the change it implies:

- The **only** `max-w-[75ch]` in `(site)` today is at `blog/[slug]/page.tsx:143` — that one arbitrary
  value is **replaced** by `max-w-measure` (clearing the R1.2 arbitrary-value grep).
- The other prose bodies (`projects/[slug]`, profile, about, now, colophon) currently have **no
  measure ceiling at all** — so `max-w-measure` is **introduced** on them, not swapped. This is a
  net-new constraint, applied as part of the same prose-migration task (see §6 / Error Handling).
- The professional-profile layout **widens its gutters/asides, not the prose measure** (R4.3): the
  profile body column is constrained to `--container-measure` while the page container stays wider
  (today `max-w-5xl`), so the gutters widen and the measure holds.

**Prose styling decision (current-state fix).** `@tailwindcss/typography` is **not** a dependency and
no `@plugin` directive exists, so today's `.prose`/`prose-lg`/`dark:prose-invert` classes on the blog
and project pages are effectively inert (only the Shiki code-span cascade in `globals.css` styles
those subtrees). This design **adds `@tailwindcss/typography`** (v4 `@plugin
"@tailwindcss/typography";` in `globals.css`) and themes it via the prose CSS variables (body →
`foreground`, headings → `foreground` in the display face, links → `brand`, captions/borders →
`muted`/`border`).

**Dark-mode prose strategy (one rule, all six routes).** All six prose bodies use
`prose dark:prose-invert max-w-measure` — `dark:prose-invert` is **added** to the four new wrappers
and **kept** on blog/projects so the set is uniform. Theming **both** variable sets is required: the
base `--tw-prose-*` set **and** the `--tw-prose-invert-*` set that `dark:prose-invert` activates are
both mapped to token roles (`--tw-prose-body: var(--foreground)`, `--tw-prose-links: var(--brand)`,
… plus the matching `--tw-prose-invert-*`). If only the light set were themed, dark-mode prose links
would fall back to the plugin's default gray/blue — contradicting "links → brand" and giving two
different prose link colors across the site. With both sets themed to the same token vars, dark-mode
prose body and **links resolve to `--brand`** on every route.

**Which routes actually carry `.prose` — and the markup change that makes the theming reach them.**
`.prose` exists in exactly two files today: `blog/[slug]/page.tsx:143` and `projects/[slug]/page.tsx`.
The other long-form bodies do **not** use `.prose` — they render MDX inside plain
`text-base leading-relaxed text-foreground` containers: `profile/page.tsx` (`<article>`), and
`about`/`now`/`colophon` (`<div>`). So theming the plugin alone would style only blog + project
bodies, **not** the four routes §6 also names. The decision: **wrap those four MDX bodies in
`prose dark:prose-invert max-w-measure` as an explicit markup change** (listed per-section in §6), so
a single themed prose definition styles every long-form body uniformly in both themes. This is a real
markup edit, not just a CSS add, and is scoped into the prose-migration task. The existing blog body
drops its `prose-lg` size modifier (the typed scale + themed `--tw-prose-*` now own sizing; keeping
`prose-lg` would double-set it), standardizing all six routes to the same `prose dark:prose-invert
max-w-measure`. (If implementation finds `@tailwindcss/typography`
already resolved via another path, it substitutes hand-authored prose CSS to the same spec; either
way every named prose body is themed to tokens.)

**Cascade/layer interaction.** The plugin emits its rules in Tailwind's `components`/`utilities`
layers, while `tokens.css` is intentionally **unlayered** (it cascades above Tailwind's layers — see
the `globals.css` comment). Theming via `--tw-prose-*` custom properties set on `.prose` is safe
(they are variables consumed by the plugin's own rules, not competing layered rules). If any prose
**element** rule ever needs overriding via an unlayered selector, it must out-specify the plugin —
noted so implementation does not fight the cascade.

### 3 — Signature: the path-mark (R3)

**One signature, expressed through three craft choices (R3.1, R3.5 — not the accent alone).** The
signature is carried primarily by the **`/`-path-mark system**, with the serif as its warm voice —
not the other way round:

1. **Mono `/ kicker` labels (the load-bearing element)** — a small uppercase mono label led by a
   brand `/` sits above section and page headings (`/ profile`, `/ now`, `/ writing`). The `/` nods
   to URLs/paths/routes (the site literally has "slash pages") and to the terminal/infra idiom; it is
   the recurring, ownable mark.
2. **The hairline brand rule + `mf/` wordmark** — a thin brand-colored rule anchors the hero and
   section starts; the wordmark `mf/` (lowercase mono, brand `/`). The wordmark reads as deliberate
   *because* the `/` kicker motif is established across the site — it is the motif applied to the
   initials, not a standalone logo carrying the identity alone.
3. **Serif display voice** (Fraunces) — the headline character that makes the system read editorial
   rather than purely terminal. Supporting, not the pillar (see §2's candid note on the serif).

**Where it appears (R3.2, R8.3).** Most fully on the **landing hero** (wordmark `mf/`, serif display
name, brand `/ kicker`, hairline rule) and the **professional profile** (same kicker + rule + serif
headline). Other sections get the `/ kicker` over their heading and brand links, but not the full
hero treatment — the signature is concentrated on the priority surfaces, not uniform (R1.3).

**Componentized (R3.3):**

- `Wordmark` (`src/components/layout/wordmark.tsx`) — renders `mf/` with the `/` in `text-brand`,
  mono, as a `Link` to `/`. Replaces the header's **text link** (`siteConfig.name` in `header.tsx`)
  and the **hero's `AvatarPlaceholder`** (the "MF" mark lives in the hero, not the header).
- `SectionKicker` (`src/components/shared/section-kicker.tsx`) — props `{ label, as? }`; renders
  `<p class="font-mono text-xs uppercase tracking-widest text-brand">/ {label}</p>` above a heading.

**Accessibility & performance (R3.4).** The signature is type + a glyph + a 1px rule — no a11y or
perf risk: the `/` is decorative text within the mark (the wordmark's accessible name is "Matthew
Field, home"); kicker labels are plain text in reading order; the rule is a bordered element with no
contrast dependency for meaning. Nothing here gates behind motion or JS. If any signature element
ever failed a gate it would be revised, not the gate (R3.4) — but none do.

**Distinctiveness rationale + reference targets (R3.1, R3.6).** What makes this distinct from a
default shadcn-neutral site: (a) a **serif** display voice where generic dev sites use all-sans
Inter/Geist; (b) the **mono `/`-kicker** editorial labeling system; (c) a **warm rust** accent
instead of default blue; (d) **flat hairline "spec-sheet" surfaces**. A reviewer viewing the hero
sees serif name + `mf/` mark + rust `/` kicker + hairline rule — not mistakable for stock
shadcn-neutral (the R3.6 fail condition). **Reference targets:**

- **maggieappleton.com** — mono labels + editorial warmth on a personal site; we take the mono-label
  system and the "notebook, not corporate" feel.
- **rauno.me (Rauno Freiberg)** — extreme restraint with precise mono detailing; we take the
  hairline/flat discipline and sparse accent.
- **Stripe Press (press.stripe.com)** — serif display against clean technical type; we take the
  serif-display-over-sans-body pairing as a warm, credible, non-generic voice.

The design-review arbiter (the Design approval + adversarial pass) tests the built result against
this rationale (R3.6).

### 4 — Spacing, surfaces, motion (R7)

**Spacing rhythm (R7.1) — named steps, deliberate spaciousness:**

- **Page gutter:** `px-4 sm:px-6 lg:px-8` (matches header's current `px-4`, extended responsively).
- **Content container:** centered, `max-w-5xl`/`max-w-6xl` for chrome and grids; prose column
  `max-w-measure` (75ch).
- **Section vertical rhythm:** `py-16 md:py-24` between major sections; hero `pt-20 md:pt-28`.
- **Intra-section stack:** `space-y-6` default, `space-y-4` tight, `gap-6` grids. Spaciousness is
  the consistent **large section rhythm**, named, not incidental.

**Surfaces (R7.2) — flat + hairline.** The system is **flat/bordered, no elevation set**, except
Radix overlays (popover/dialog/tooltip) which keep a single small shadow for layering. Separation
language: `border-border` hairlines + `card`/`muted` tint; corner rounding via the existing
`--radius` dial (`sm/md/lg/xl` derived). Applied uniformly across sections. This matches the
near-flat header (`border-b`) and the hairline-divided landing sections, and reinforces the
spec-sheet restraint.

**Known deviation:** the shadcn `Card` primitive (`src/components/ui/card.tsx`) still carries
`shadow-sm`, which contradicts "no elevation set". Surfaces authored since (the landing sections)
use `border-border` directly rather than `Card`. Reconciling `Card` — dropping its shadow or
recording an exception — is outstanding.

**Motion (R7.3) — minimal, purposeful, reduced-motion-honoring:**

- Allowed: `transition-colors` on interactive state (links, nav, cards — already present, ~150ms),
  the theme-toggle icon transition, and Radix enter/leave on overlays. No decorative/scroll motion.
- **Reduced motion:** a global `@media (prefers-reduced-motion: reduce)` rule in `globals.css`
  reduces transition/animation durations to ~0 site-wide (generalizing today's per-file handling in
  `reading-progress.css`); the contact-form scroll already branches on the query.
- **No-flash theme toggle (R7.3, R10.3):** add `disableTransitionOnChange` to `ThemeProvider`
  (`theme-provider.tsx`) so toggling theme does not animate token changes (no FOUC). This is the
  app-code change R10.3 puts in scope.

**Z-index (resolves a design-system deferral).** Small tokenized scale to replace ad-hoc values
(header is currently `z-40`, mobile nav `z-40`): `--z-base: 0`, `--z-sticky: 40` (header),
`--z-overlay: 50` (Radix portals/dialogs), `--z-toast: 60`. Mapped as utilities; Radix portals
manage their own stacking above these.

### 5 — Brand-identity artifacts (R8)

- **Wordmark (R8.1):** `Wordmark` component (above) becomes the identity mark — replacing the
  header's text link and the hero's "MF" `AvatarPlaceholder`. `AvatarPlaceholder` is retained only as
  the neutral fallback for a missing profile headshot.
- **Favicon set (R8.1):** `src/app/icon.svg` (the `/` path-mark in a rounded square, brand on
  neutral) + `src/app/apple-icon.png` (180×180) via Next.js metadata-file convention; the existing
  `favicon.ico` is regenerated to match. Brand-on-neutral so it reads in both light and dark browser
  chrome.
- **Open Graph image (R8.2):** replace the static `/images/og-default.png` reference
  (`src/config/site.ts:42`) — which **does not exist in the repo today** (a currently dangling OG
  reference this fixes) — with a Next.js `src/app/opengraph-image.tsx` rendered at build via
  `next/og` `ImageResponse`, composing the identity (serif name, `mf/` mark, rust `/`, neutral
  field). **Font loading:** `ImageResponse` does **not** read `next/font`; it needs explicit glyph
  data. The route reads the Fraunces (and Geist Mono, for the `/`) font binary at build time — from
  the `.next`/node_modules font asset or a copy under `public/fonts/` — and passes it via
  `ImageResponse`'s `fonts: [{ name, data, style, weight }]` option. The PNG is rasterized
  server-side and served under `img-src 'self' data:` (the runtime `font-src` CSP does not apply to
  it). A default `twitter-image` is derived from the same route. No per-page custom OG in this spec
  (deferred, below).
- **Priority surfaces (R8.3):** hero + profile carry the signature first and most fully (see §3).
- **Link states (R8.4):** defined and tokenized (see §1 link table).
- **Print/PDF profile (R8.5):** a print slice `src/styles/print.css` (imported from `globals.css`)
  under `@media print`. The **mechanism** (not just the goal), because tokens are class-scoped:
  - **Force light by re-declaring the token custom properties under print**, overriding `.dark`.
    Utility classes alone do **not** work: when a user prints from dark mode the `.dark` class is
    still on `<html>` and `globals.css`'s `body { background-color: var(--background) }` keeps the
    page near-black. So print.css must re-declare the values:
    ```css
    @media print {
      :root, .dark {
        --background: white;  --foreground: black;
        --card: white;  --popover: white;  --muted: white;
        --border: #ccc;  --muted-foreground: #444;
        /* Brand ink must also be re-declared: printing from dark mode would otherwise
           leave --brand at the light-amber dark value (~1.8:1 on white), washing out the
           rust "/ kicker" labels and links. Force a dark, on-white-legible rust ink. */
        --brand: oklch(0.45 0.13 42);  --brand-visited: oklch(0.45 0.06 42);
        --brand-foreground: white;  /* defensive: legible if a brand fill ever prints */
      }
    }
    ```
    This makes every `var(--background)`/`var(--foreground)`/`bg-card`/`text-muted-foreground` surface
    **and the brand `/ kicker` / links** on the profile resolve to readable ink on paper — regardless
    of the on-screen theme. (The neutral surfaces were the v1→v2 fix; the brand-ink re-declaration is
    the v3 completion — without it a CV printed from dark mode has pale, low-contrast section labels.)
    The status/`--accent`/`--secondary`/`--input`/`--primary` tokens need no print override: their
    only consumers on the profile (the contact **form**, hover/focus states) are hidden or inert on
    paper.
  - hide chrome: header/nav, footer, theme toggle, search, and the contact **form** (keep the email
    + social links as text);
  - black-on-white prose at the 75ch measure, page margins, avoid breaking inside headings/list
    items; expand link `href`s after link text for paper (`a[href]::after { content: " (" attr(href) ")" }`)
    on external links only;
  - result: a clean, light, readable one-/two-column CV. (The token re-declaration is global to
    `@media print`; the chrome-hiding/measure rules are scoped to the profile route.)

### 6 — Application across the eight built sections (R9)

Each `(site)` section's "codify existing look vs. re-style" decision (R9.2):

| Section | Decision | What changes |
|---|---|---|
| Landing (`/`) | **Re-style (priority)**, later **rebuilt** | Serif display name, `/ kicker`, hairline rule, brand links. The card grid this spec re-styled has since been replaced (see below); the identity treatment carried over unchanged |
| Professional profile (`/profile`) | **Re-style (priority)** | Serif headline, `/ kicker`, brand links/CTA, print stylesheet |
| Projects (`/projects`, `[slug]`) | **Codify + apply** | Keep gallery/layout; `[slug]` body already `prose dark:prose-invert` → themed + `max-w-measure`; brand links; serif `h1`/`h2` |
| Contributions (`/contributions`) | **Codify + apply** | Keep layout; brand links, `/ kicker`, status roles where used |
| Blog (`/blog`, `[slug]`) | **Codify + apply** | `[slug]` prose themed to tokens, **drop `prose-lg`**; `max-w-[75ch]`@143 → `max-w-measure`; reading-progress → brand; brand links; serif headings |
| Resources (`/resources`) | **Codify + apply** | Keep layout; brand links, `/ kicker` |
| About/Now/Colophon | **Markup change + apply** | Today render MDX in `text-base … text-foreground` divs → **wrap body in `prose dark:prose-invert max-w-measure`** so the themed scale + measure reach them in both themes; `/ kicker` |
| Profile body | **Markup change + apply** | Today `<article class="text-base …">` → **wrap in `prose dark:prose-invert max-w-measure`** inside the wider page container (gutters widen, measure holds) |
| Sitemap/Slashes (slash pages) | **Codify + apply** | Brand links; the `/` motif is natively at home here |

**Landing page, current structure.** The card grid described above was a table of contents — it named
the five sections and showed nothing behind them. It has been replaced by four components in
`src/components/home/`, all inside the identity this spec fixed:

1. `HomeHero` — `/ kicker`, serif display name, hairline brand rule, the lead paragraph
   (`siteConfig.intro`), and the availability line.
2. `RecentWork` — three items mixing writing, projects, and open-source contributions, newest first,
   derived by `getHomeStream()` (`src/lib/home-stream.ts`) so the page stays current without edits.
3. `HomeIndex` — the five sections as `/route` rows with real counts, carrying the `/` path-mark.
4. `ContactStrip` — the landing's single brand CTA (see §1).

`siteConfig.heroCards` became `siteConfig.homeIndex` (`{ href, label, description }`), and
`siteConfig.intro` was added. `HeroCard` was deleted.

**Link states, addendum to §1.** Brand links sitting *inline within a sentence* carry a permanent
underline, not a hover-only one: against surrounding `muted-foreground` text the brand colour alone
is a ~1.05:1 difference, which fails WCAG 1.4.1 (axe `link-in-text-block`). §1's link table describes
the standalone case; this is the inline-in-prose-chrome case.

`(playground)` is left unchanged (R9.3) — it is cascade/stacking-scoped and exempt. Existing Vitest
and Playwright suites must remain green (R9.4); any selector/text assertions touching changed markup
(e.g. the header brand text-link → wordmark) are updated in the same task. The prose-body markup
changes (profile/about/now/colophon → `.prose`) and the `max-w-[75ch]`→`max-w-measure` swap land
together as **one atomic prose-migration change** so the site is never mid-migration with a mixed
measure (a coherence requirement of R1) or a surviving arbitrary value (R1.2 grep gate).

### 7 — Gates hold (R10)

All design-system gates hold at ship (R10.1): contrast in both themes (the §1 matrix), 90+
Lighthouse Performance (CSS-only identity + one bounded webfont), theme parity (matched OKLCH pairs),
responsive at the named Tailwind breakpoints. The deferred **CI gate upgrades** (LCP/CLS/INP +
byte-weight, full-route Lighthouse, active-role↔token check) remain owned by `tech.md`/CI (R10.2) —
this spec coordinates with but does not own them. The `disableTransitionOnChange` no-flash fix is in
scope here (R10.3).

## Components and Interfaces

### Wordmark
- **Purpose:** the brand identity mark `mf/`, replacing the header's text link and the hero's "MF"
  avatar (R8.1).
- **Interface:** `Wordmark({ className?, asLink? }: { className?: string; asLink?: boolean })` →
  renders mono `mf` + brand `/`; when `asLink` (default true) wraps in `Link href="/"` with an
  accessible name "Matthew Field — home".
- **Dependencies:** `next/link`, `cn`. **Reuses:** `--font-mono`, `--brand`.

### SectionKicker
- **Purpose:** the mono `/ label` signature above headings (R3).
- **Interface:** `SectionKicker({ label, className? })` → `<p>` mono/xs/uppercase/tracked, brand `/`.
- **Dependencies:** `cn`. **Reuses:** `--font-mono`, `--brand`.

### StatusCallout (optional thin wrapper)
- **Purpose:** consistent status feedback (success/warning/info/error) pairing color **and** icon
  (R6.2, R5.3) — used by the contact form result and any feedback surface.
- **Interface:** `StatusCallout({ tone: "success"|"warning"|"info"|"error", icon, children })` →
  `bg-<tone>/10 text-<tone>` with a `lucide` icon (accessible-named) + text.
- **Dependencies:** `lucide-react`, `cn`. **Reuses:** the status roles. (If the contact form's
  existing feedback markup is sufficient, this is realized as utility classes rather than a new
  component — decided at implementation; either way color is never the sole signal.)

### Button — `brand` variant + two edits to existing variants
- **Purpose:** the single primary CTA per page (R2.3 "primary CTAs").
- **Interface:** add CVA `variant: "brand"` → `bg-brand text-brand-foreground hover:bg-brand/90`.
  Two edits to existing variants in `button.tsx`: (1) the shared `focus-visible:ring-ring/50` →
  `focus-visible:ring-ring` (full-alpha brand ring meeting non-text 1.4.11, see §1 ring-alpha note);
  (2) the `link` variant `text-primary` → `text-brand` (links carry brand). The neutral `default`
  solid button (`bg-primary`) and `--primary` itself stay neutral.
- **Reuses:** `src/components/ui/button.tsx` CVA, `--brand`/`--brand-foreground`/`--ring`.

## Data Models

The "data" here is the token set. New/changed entries in `src/styles/tokens.css` (`:root` + `.dark`)
and the `@theme inline` map in `globals.css`:

```
New color roles (matched :root / .dark pairs):
- --brand / --brand-foreground         (rust → amber-rust; see §1 table)
- --brand-visited                      (lower-chroma brand, prose visited links)
- --success / --success-foreground
- --warning / --warning-foreground
- --info / --info-foreground
Changed:
- --ring                               → var(--brand)   (both themes; was zero-chroma)
Reading-progress fill                  → var(--brand)   (was one-off blue)

New @theme mappings:
- --color-brand, --color-brand-foreground, --color-brand-visited
- --color-success(/-foreground), --color-warning(/-foreground), --color-info(/-foreground)
- --font-display                       (Fraunces variable)
- --container-measure: 75ch            (→ max-w-measure)
- --z-base/-sticky/-overlay/-toast     (z-index scale)

Prose theming (both sets → tokens, so dark-mode links are brand):
- --tw-prose-body/-headings/-links/-captions/-borders → foreground/foreground/brand/muted/border
- --tw-prose-invert-body/-headings/-links/-captions/-borders → the same token roles (dark)

Print overrides (@media print { :root,.dark { … } }):
- neutral surfaces forced light + --brand/--brand-visited forced to a dark on-white rust ink

Unchanged neutral roles (explicitly zero-chroma): background, foreground, card, popover,
primary(/-foreground), secondary, muted, accent, border, input. chart-*/sidebar-* stay reserved
(out of contract).
```

## Error Handling

### Scenario 1 — A used pairing fails AA in a built section
- **Handling:** the §1 legal-pairing matrix is verified against the contrast tooling during
  implementation; any failing pair is retuned (lightness first, then chroma) before the section is
  marked done. `--muted-foreground` precedent (already tuned to 0.5/0.74 for AA) is the model.
- **User impact:** none at ship — contrast holds in both themes (R5.1).

### Scenario 2 — Webfont CLS from the added serif (perf gate)
- **Handling:** `Fraunces` via `next/font` is self-hosted, `display: "swap"`, variable, latin-subset,
  with `next/font`'s automatic `size-adjust`/fallback-metric matching to a serif fallback; used only
  for headings (small glyph coverage). Byte weight stays within the perf budget; no layout shift
  beyond the bounded swap.
- **User impact:** headings paint immediately in the metric-matched fallback, then swap with no
  reflow; 90+ Lighthouse Performance holds (R10.1, NFR Performance).

### Scenario 3 — Status/brand color conveys state alone (a11y)
- **Handling:** every status use pairs an icon/text signal (StatusCallout / utility convention);
  under `forced-colors`, state is not color-dependent (R5.3, design-system forced-colors gate).
- **User impact:** state is perceivable without color (WCAG 1.4.1).

### Scenario 4 — Theme toggle flashes (FOUC)
- **Handling:** `disableTransitionOnChange` on `ThemeProvider` (R7.3/R10.3); `suppressHydrationWarning`
  is already on `<html>`.
- **User impact:** instant, flash-free theme switch.

### Scenario 5 — `forced-colors` (Windows High Contrast) with a brand focus ring
- **Handling:** under `forced-colors: active` the browser replaces author colors with system colors,
  so the brand `ring` is drawn in the system highlight color — which preserves focus visibility
  (the gate is *usable*, not *brand-colored*). The design adds no rule that suppresses the focus
  outline; status/state remain icon+text paired (Scenario 3), so nothing relies on the brand hue
  surviving forced-colors.
- **User impact:** focus and state stay perceivable in High Contrast mode (design-system
  forced-colors gate).

### Scenario 6 — A test asserts changed markup (header text-link → wordmark, prose wrappers)
- **Handling:** the header swap (text link → `Wordmark`) and the prose-body wraps change DOM the
  tests may select; any affected Vitest/Playwright assertion is updated in the same task. (Audited:
  no current test asserts the literal "MF" string, and `landing.test.ts` asserts landing-section
  count/links rather than the avatar/name markup, and the reading-progress parity e2e stays green
  because brand light ≠ dark — so the known regression surface is small, but the changed-markup tests
  are updated alongside the change.)
- **User impact:** suites stay green (R9.4).

## Testing Strategy

### Unit Testing (Vitest)
- `Wordmark` and `SectionKicker` render their text/structure and accessible names; `Wordmark` links
  to `/`.
- Token presence: a test asserts every role the design system calls "active" (incl. the new
  `brand`/`success`/`warning`/`info`) exists in `tokens.css` and is mapped in `@theme` (R6.3) — a
  lightweight stand-in until the deferred CI active-role↔token check lands.

### Integration / Accessibility
- **axe** on landing, profile, blog post, and a status-feedback state in both themes — zero
  color-contrast violations (R5.1), verifying the §1 matrix.
- Focus-visible ring (brand) meets non-text contrast; keyboard, reduced-motion, and forced-colors
  checked by manual review per the design-system contract.

### End-to-End (Playwright)
- Existing interactive flows (contact form submit, theme toggle, search, playground load) stay green
  (R9.4); the theme-toggle test additionally asserts no-flash behavior is wired (provider prop).
- **Visual review (the R1.3/R3.6 arbiter):** side-by-side against `design-baseline/` screenshots in
  both themes; the Design approval + adversarial pass is the arbiter of subjective quality and the
  R3.6 distinctiveness test ("cannot be told apart from stock shadcn-neutral → FAILS").

## Deferred (recorded; surfaced at the phase boundary)

Out of this spec's scope, consistent with the requirements and steering — not silently cut:

- **Per-page custom OG images** — this spec ships one templated default OG/twitter image; per-page
  variants are deferred.
- **Data-viz / chart palette** — out of scope (no charts on the built site); `chart-*` stays
  reserved (design-system deferral retained).
- **Internationalization / RTL & logical-properties posture** — deferred (design-system deferral
  retained); the site is single-locale LTR.
- **CI gate upgrades** (LCP/CLS/INP + byte-weight, full-route Lighthouse, active-role↔token check) —
  owned by `tech.md`/CI, not this spec (R10.2).

## Revision History

- **v4 (post-ship reconcile, 2026-08-05)** — updated to match the shipped site after the landing page
  was rebuilt (PR #45). The identity this spec fixed is unchanged; what changed is the landing page's
  *content structure* and one clause that depended on it. **(1)** §1's "one primary CTA per page"
  no longer says the landing has none — the rebuilt landing ends in a contact strip, and that is its
  designated CTA. **(2)** §6 gains the landing page's current structure (`HomeHero` / `RecentWork` /
  `HomeIndex` / `ContactStrip`, `siteConfig.heroCards` → `homeIndex` + `intro`) and records that
  `HeroCard` was deleted with the card grid; the Code Reuse entry for `HeroCard` is marked
  superseded. **(3)** §6 gains a link-states addendum: inline-in-sentence brand links need a
  permanent underline (colour alone is ~1.05:1 against `muted-foreground` — WCAG 1.4.1). **(4)** §4
  records the outstanding `Card` `shadow-sm` deviation from "no elevation set" rather than leaving
  the doc claiming a uniformity the code does not have. `tasks.md` is left as-authored: it is the
  execution record of what was done at the time, not a description of the current system.
- **v3 (converged)** — adversarial r3 returned `VERDICT: converged` (0 must / 0 should / 2 minor;
  DESIGN_READY: yes). r3 independently recomputed the contrast and verified all three r2 fixes landed
  (`success` light 4.80, print brand ink 7.88:1 on white, dark-prose links → `--brand`). The two r3
  MINORs were folded into v3 in place: added `--brand-foreground` to the print block (defensive, if a
  brand fill ever prints) and a one-line note that the hero display equals the h1 step below `md` by
  intent (distinguished by wordmark/kicker/rule/position, not size). No new adversarial round — MINOR
  polish only.
- **v3** — addressed adversarial r2 (0 must-fix, 3 should-fix, 2 minor; all accepted — r2 confirmed
  every v2 MUST_FIX delta landed cleanly, and the residue was "the fix opened an adjacent gap").
  Fixes: **(SHOULD, recurring)** `--success` light darkened to `0.50 0.15 150` — at `0.52 0.14` it
  composited to exactly 4.50 (the same zero-margin condition v1 caught at `warning`); all three light
  status values were recomputed together and the doc now targets a **≥4.6 margin**, not bare ≥4.5.
  **(SHOULD)** the `@media print` block now also re-declares **`--brand`/`--brand-visited`** to a
  dark on-white rust ink — without it a CV printed from dark mode left the rust `/ kicker`/links at
  the light-amber value (~1.8:1 on white); noted the other tokens need no print override (their
  consumers are hidden/inert on paper). **(SHOULD)** specified the **dark-mode prose strategy**: all
  six routes use `prose dark:prose-invert max-w-measure` and **both** the `--tw-prose-*` and
  `--tw-prose-invert-*` sets are themed to tokens, so dark-mode prose links resolve to `--brand`
  everywhere (was: only the light set themed; existing blog/projects' `dark:prose-invert` pulled
  unthemed plugin colors). **(MINOR)** named the **< `sm` hero step** (`text-4xl`, `text-balance`,
  scaling to `text-6xl` at `md`) so the serif name fits a 360px column; **(MINOR)** the blog body
  **drops `prose-lg`** (the typed scale owns sizing), standardizing all six prose routes. No finding
  rejected.
- **v2** — addressed adversarial r1 (4 must-fix, 5 should-fix, 6 minor; all accepted — the review
  independently computed the OKLCH contrast and vindicated the brand/ring/foreground values). Fixes:
  **(MUST)** the **print mechanism** now re-declares the token custom properties under `@media print`
  (`:root, .dark { --background: white; … }`) so a CV printed from dark mode is actually light — the
  v1 draft stated only the goal, which would ship a dark CV; **(MUST)** the **prose theming** now
  names that `.prose` lives in only 2 routes today and adds an explicit **markup change** wrapping
  profile/about/now/colophon bodies in `prose max-w-measure` so the themed scale reaches the four
  routes §6 claims; **(MUST)** corrected the **`max-w-[75ch]` artifact** (line 143, not 100; it is the
  only one — reframed as "introduce measure where absent + replace the one value", as an atomic
  migration); **(MUST)** corrected the false **"replaces the MF avatar in the header"** claim (header
  is a text link; the avatar is in the hero) across Code Reuse / §3 / §5. **(SHOULD)** retuned status
  values for margin (`--warning` light 0.55→0.52 which was composited to exactly 4.50; `--info`/
  `--success` dark lifted so text clears ≥4.5 over a `/10` tint composited on a **card**, not just on
  background) and modeled the nested-status case in the matrix; specified **OG font-data loading**
  for `next/og` (it does not read `next/font`) and noted `og-default.png` is a currently-dangling
  reference; defined the **"one primary CTA per page"** designation rule; folded **`--brand-visited`**
  explicitly into R2.1's "brand accent" family (not a 7th chromatic role); fixed the **focus ring
  alpha** (Button `ring-ring/50` → `ring-ring` full alpha, so the ring meets 3:1) and named the
  `link`-Button-variant → brand change. **(MINOR)** down-weighted Fraunces from "signature pillar #1"
  to a supporting voice (distinctiveness rests on the mono-`/`-kicker system + rust + hairlines);
  added the typography-plugin layer-interaction note; added a `forced-colors`+brand-ring error
  scenario; corrected Scenario 5/6 (no test asserts literal "MF"). No finding was rejected; none was
  recurring.
- **v1** — initial design. Resolves the deferred identity: rust `--brand` matched pair + status
  roles + brand `ring`; three-voice type system (Geist Sans body / Geist Mono code+kicker / Fraunces
  serif display) with a named Tailwind-step scale and a `--container-measure` (75ch) replacing
  `max-w-[75ch]`; the path-mark signature (`mf/` wordmark, mono `/ kicker`, hairline brand rule) on
  priority surfaces with reference targets (maggieappleton.com, rauno.me, Stripe Press); flat
  hairline surfaces; minimal motion + `disableTransitionOnChange` no-flash; brand artifacts
  (wordmark, favicon set, build-time OG); profile print/PDF stylesheet; per-section codify/re-style
  table; legal-pairing matrix + max nesting depth = 2; z-index scale. Notes the current-state finding
  that `@tailwindcss/typography` is absent (today's `.prose` is unstyled) and adds+themes it.
