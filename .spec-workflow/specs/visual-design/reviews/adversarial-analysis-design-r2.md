# Adversarial Analysis — visual-design / design.md (v2), Round 2

Reviewed against the live repo (`tokens.css`, `globals.css`, `button.tsx`, `header.tsx`,
`profile/page.tsx`, `about|now|colophon/page.tsx`, `blog/[slug]/page.tsx`,
`projects/[slug]/page.tsx`, `projects.css`, `reading-progress.css`, the profile component tree
[`contact-form.tsx`, `social-links.tsx`, `avatar-placeholder.tsx`], the reading-progress e2e,
`site.ts`, and the Tailwind v4 `theme.css` namespace). OKLCH ratios recomputed via
OKLab→linear-sRGB→WCAG, with the `/10` tint composited the way browsers actually composite an alpha
layer (sRGB-gamma over the surface).

**Bottom line:** v2 correctly landed the four r1 MUST_FIX deltas (print token re-declaration exists,
prose markup-wrap is named, the `max-w-[75ch]` line is correct at 143, the header text-link→wordmark
correction is in). But the **status retune over-corrected one role and introduced the *same*
on-the-bar failure at a new role** (`success` light now composites to **4.50** — the exact coin-flip
v1 had at `warning`), the **print token re-declaration is still incomplete** for dark-mode printing
of the rust brand (kicker/links wash out), and the **dark-mode prose theming is unspecified and
inconsistent** between the four new routes and the existing blog/projects (`dark:prose-invert`).
Distinctiveness holds. Net: a short second iterate, not a rebuild.

---

## 1 — Status-value retune (Compounding → Recurring at a new cell)

Recomputed `text-<role>` over `<role>/10` composited (sRGB-gamma) on **both** `background` and
`card`, both themes, with v2's retuned values:

| Role | light over bg | light over card | dark over bg | dark over card |
|---|---|---|---|---|
| `success` `0.52 0.14 150` / `0.74 0.15 150` | **4.50** | **4.50** | 7.99 | 6.97 |
| `warning` `0.52 0.12 85` / `0.76 0.13 85` | 4.84 | 4.84 | 8.01 | 6.98 |
| `info` `0.52 0.14 240` / `0.74 0.13 240` | 4.61 | 4.61 | 7.68 | 6.71 |

(Light `card` == `background` == white, so the two light columns are identical — correct.)

- **`success` light = 4.5018** → rounds to **4.50**, sitting *exactly* on the bar with effectively
  zero margin. This is the **identical failure mode** v1 flagged at `warning` (4.50) — v2 darkened
  `warning` to 0.52 (now 4.84, fixed) but **left `success` light at 0.52/C0.14**, which lands on the
  line. The design's own claim (§1, line ~202) is that the values clear "≥4.5:1 … **with margin**" —
  `success` light has **no margin**. Because `color-mix`/OKLab compositing and sub-pixel
  antialiasing can each shift this a hair, this is a coin-flip against AA. **SHOULD_FIX (Recurring):**
  darken `--success` light a step (≈L0.50 or C0.15) to buy the same margin the warning fix bought.
- `info` light = 4.61 — thin but clears with a real (if small) margin. Acceptable.
- All **dark** cells clear with large margin (6.7–8.0); the v2 dark lifts over-shot comfortably, and
  the solid roles still read on their own fills. No dark miss. Good.
- **warning↔brand hue collision (light):** warning `0.52 0.12 85` = rgb(136,98,0) (olive/dark-gold)
  vs brand `0.50 0.13 42` = rgb(158,68,29) (rust). Visually distinct — different hue family, not a
  collision. Clean.

## 2 — Print token re-declaration completeness (Compounding — still partial)

I enumerated every token the **profile route's kept-on-paper** tree reads (`profile/page.tsx` minus
the hidden form, plus `avatar-placeholder.tsx`, `social-links.tsx`, the `/ kicker`, brand links):

- Covered by v2's block (`--background/--foreground/--card/--popover/--muted/--border/
  --muted-foreground`): the headshot border, the `AvatarPlaceholder` (`bg-muted`/`text-foreground`),
  body text, meta. **Good** — these print light.
- `social-links.tsx` uses `bg-accent`/`text-accent-foreground` only on **`hover:`** and `ring-*`
  only on **`focus-visible:`** — so on paper (no hover/focus) they're plain text. **Not a print
  risk.** (The r1-era worry about `--accent`/`--secondary`/`--input`/`--primary` printing dark does
  **not** materialize for the *kept* profile regions, because the only consumers — the contact
  **form** with `border-input`/`secondary`, and any `bg-primary`/`bg-brand` button — are inside the
  hidden `<form>`/contact block. Verified: the form is hidden, social links are kept as text. So the
  partial token list is *adequate for the surfaces that survive print* — narrower than r1 feared.)
- **The real residual gap is `--brand`.** The design forces surfaces light under print but **does
  not re-declare `--brand`**. The `/ kicker` and prose/chrome links are `text-brand`. When the user
  prints **from dark mode**, `.dark` is still on `<html>`, so `--brand` stays
  `oklch(0.75 0.12 55)` — a *light amber*. Against the forced-white print background that is
  ≈1.8:1 — the rust kicker and brand links **wash out / become near-illegible on paper**. The design
  even raises this question ("does forcing `--brand`/kicker to a dark ink read on white") but its
  re-declaration block never answers it: `--brand` is absent from the print `:root,.dark` override.
  **SHOULD_FIX:** add `--brand` (and the visited link) to the print re-declaration at a dark,
  on-white-legible ink (e.g. the light-theme `0.50 0.13 42`, or just `--foreground`), so the kicker
  prints as readable ink regardless of on-screen theme. Without it, a CV printed from dark mode has
  pale, low-contrast section labels.

This is no longer the R8.5 "whole CV prints dark" failure (that's fixed) — it's a narrower
brand-ink-on-paper legibility miss. Severity SHOULD_FIX, not MUST_FIX.

## 3 — Wrapping four bodies in `.prose` (Novel)

- **`projects.css` collision: clean.** The wide-media escape is scoped `.projects-article .prose
  :is(img,…)` — it only fires for `.prose` **inside** `.projects-article`. The four new wrappers
  (profile/about/now/colophon) are not inside `.projects-article`, so adding `.prose` there cannot
  trigger the escape. No blog slice keys off `.prose` for layout either. Clean.
- **Profile layout: clean.** The `<article>` MDX body is a **sibling** of the headshot `<section>`
  and the contact `<section>` in `profile/page.tsx` (lines 25/48/52). Wrapping only the `<article>`
  in `prose max-w-measure` does not touch the headshot or contact-form layout. Clean.
- **`max-w-measure` is a real v4 utility: confirmed.** `node_modules/tailwindcss/theme.css` defines
  the `--container-*` namespace (`--container-3xs … --container-7xl`); v4 generates `max-w-*` from
  `--container-*`. So `--container-measure: 75ch` in `@theme` yields `max-w-measure`. The utility
  name is correct; the measure will apply. Clean.
- **Dark-mode prose is unspecified and inconsistent (SHOULD_FIX, Novel).** The design themes only
  the **light** `--tw-prose-*` set (§2, line ~298: "body → `foreground`, headings → `foreground`,
  links → `brand`") and **never mentions `--tw-prose-invert-*` or `dark:prose-invert`**. Two
  problems:
  1. The four new wrappers get `prose max-w-measure` with **no `dark:prose-invert`** (line ~466,
     ~467). They will inherit the themed light `--tw-prose-*`. That *happens* to work in dark mode
     **only if** the light set is themed with token vars (`var(--foreground)`, `var(--brand)`) that
     flip per theme — which is plausible but the design doesn't state the invert handling, so it's
     load-bearing-by-luck.
  2. The **existing** `blog/[slug]` and `projects/[slug]` keep `dark:prose-invert` (live:
     `blog/[slug]/page.tsx:143`, `projects/[slug]/page.tsx:87`). `dark:prose-invert` switches them
     to the plugin's `--tw-prose-invert-*` set — which the design **does not theme** — so in dark
     mode blog/project body, captions, and especially **links fall back to the plugin's default
     gray/blue, not `--brand`**. That contradicts "links → brand" and produces two different prose
     link colors across the site in dark mode. **SHOULD_FIX:** state the dark-prose strategy — either
     theme the `--tw-prose-invert-*` set too, or drop `dark:prose-invert` and theme the single
     `--tw-prose-*` set with token vars so one definition serves both themes (and add/omit
     `dark:prose-invert` consistently across all six routes).

## 4 — `@theme inline` wiring + token mechanics (Novel)

- **Mapping completeness: clean.** The Data Models block (lines 535–540) lists `--color-brand`,
  `--color-brand-foreground`, `--color-brand-visited`, and `--color-success(/-foreground)`,
  `--color-warning(/-foreground)`, `--color-info(/-foreground)`. Cross-checked against every utility
  the design uses (`bg-brand`, `text-brand`, `text-brand-visited`, `bg-<role>/10 text-<role>`,
  `ring-ring`, the `-foreground` fills): every one has a `@theme inline` entry. No unmapped role.
- **`--ring`→`--brand` chain: resolves.** `globals.css:65` already has `--color-ring: var(--ring)`;
  v2 sets `--ring: var(--brand)`. So `ring-ring` → `--color-ring` → `--ring` → `--brand`. Live grep
  for ring consumers shows `social-links.tsx`/`button.tsx` use `ring-ring`; nothing depends on the
  old zero-chroma ring as a *color value*. Chain is sound. Clean.
- **`--color-ring` is `var(--ring)`, not `var(--brand)` directly — fine**, and intentional (keeps
  the brand indirection in one place). No issue.

## 5 — Distinctiveness, responsive, scope (Novel + frontend-design lens)

- **Distinctiveness still committed.** After down-weighting the serif (v2), the identity rests on
  the mono-`/`-kicker system + rust + flat hairlines — three independent craft choices. Through the
  frontend-design lens this clears R3.6 ("cannot be told from stock shadcn-neutral → FAILS"): a
  recruiter sees serif name + `mf/` + rust `/ kicker` + hairline rule. The rationale did **not**
  hedge into "tasteful but generic" — it explicitly names the system, not the serif, as load-bearing
  (§2 candid note, §3.1). The rust+mono-`/`+hairline system is sufficient on its own. Clean.
- **Responsive hero: under-specified (MINOR, Novel).** The hero display step is `text-5xl
  (sm:text-6xl)` (3rem → 3.75rem) serif. The smallest phones (360px, < `sm`) get `text-5xl` = 48px.
  The live hero today is `text-3xl sm:text-4xl` on `siteConfig.name` "Matthew Field". At 48px
  Fraunces inside `max-w-6xl px-4` (~328px usable, next to the avatar/wordmark in a `flex-col`),
  "Matthew Field" wraps to two lines and "Matthew" alone is near the column edge. The design
  specifies only the desktop step and the `sm:` step; it does **not** state the < `sm` behavior (a
  `text-4xl` base, or that wrapping is acceptable). Not a break — but it's an unspecified mobile case
  for the single most prominent type on the site. **MINOR:** name the base (smallest) hero step and
  confirm wrap behavior.
- **Sequencing/atomicity: adequately specified.** §6 (lines ~471–475) names the prose-body
  markup-wraps + the `max-w-[75ch]`→`max-w-measure` swap as **one atomic prose-migration change** so
  the site is never mid-migration with a mixed measure (R1) or a surviving arbitrary value (R1.2).
  Scenario 6 covers the test-update-in-same-task. The Button CVA edits (brand variant + ring-alpha +
  link→brand) are independent and landable separately. The header→wordmark swap updates its own
  tests in-task. No broken intermediate is forced. Clean — though the design could state ordering
  between the eight sections explicitly; absent that, it's left to implementation (acceptable, MINOR
  at most).
- **One silently-deferred item to flag:** the live `blog/[slug]:143` carries **`prose-lg`** (not
  just `prose`); §6's blog row says "`.prose` themed to tokens" but never says whether `prose-lg`
  (the larger plugin size modifier) is kept or dropped under the new typed scale. With a themed
  `--tw-prose-*` + an explicit type scale, `prose-lg` may double-set sizing. **MINOR:** state whether
  `prose-lg` survives the migration.

---

## Top 5 risks/gaps

1. **`success` light composites to 4.50 — the retune moved the coin-flip, didn't remove it.**
   `text-success` on `bg-success/10` over white = 4.5018, zero margin; v2 fixed `warning` but left
   `success` on the bar. (§1; `tokens.css` new `--success`.) **SHOULD_FIX (Recurring).**
2. **Rust brand ink washes out on a CV printed from dark mode.** Print re-declares surfaces light but
   not `--brand`; printing from dark leaves `--brand` = light amber (`0.75 0.12 55`) ≈1.8:1 on white,
   so `/ kicker` labels and brand links are pale on paper. (§2; design.md print block lines ~434–442,
   does not list `--brand`.) **SHOULD_FIX (Compounding).**
3. **Dark-mode prose theming is unspecified/inconsistent.** Design themes only the light
   `--tw-prose-*`; existing blog/projects keep `dark:prose-invert` (live `blog/[slug]:143`,
   `projects/[slug]:87`) → unthemed plugin invert colors in dark, so dark-mode prose links are
   **not** brand, contradicting "links → brand." The four new wrappers omit `dark:prose-invert`
   entirely. (§3; design.md §2/§6.) **SHOULD_FIX (Novel).**
4. **Hero serif display step has no specified < `sm` behavior.** `text-5xl` (48px) Fraunces on a
   360px column wraps "Matthew Field"; design gives only the `sm:`/desktop steps. (§5; design.md type
   scale line ~274.) **MINOR (Novel).**
5. **`prose-lg` fate unstated in the blog migration.** Live `blog/[slug]:143` is `prose prose-lg`;
   §6 says theme `.prose` but doesn't address whether the size modifier is kept against the new typed
   scale. (§5; design.md §6 blog row.) **MINOR (Novel).**

## Top 3 conclusions to challenge or reverse

1. **"Status values were tuned to clear ≥4.5 *with margin*."** Reverse for `success` light: it lands
   at 4.50, no margin — the same on-the-bar condition v1 caught at `warning`. The retune fixed the
   named role and re-created the defect one role over. Darken `--success` light.
2. **"The print token re-declaration makes the CV print light regardless of on-screen theme."**
   Challenge: true for neutral surfaces, **false for the brand ink** — the rust `/ kicker`/links are
   not re-declared and wash out on paper from dark mode. Add `--brand` to the print override.
3. **"Theming `--tw-prose-*` themes prose in both themes."** Challenge: it themes only the *light*
   set; `dark:prose-invert` on the existing two routes pulls the *un*themed invert set in dark
   (links not brand). The dark-prose path is unspecified. Pick one strategy and apply it to all six
   prose routes.

## What's missing before build

- A **hair more margin on `--success` light** (the one cell still on the 4.50 line).
- **`--brand` (and `--brand-visited`) in the `@media print` re-declaration**, at an on-white-legible
  ink, so the rust signature prints readable from either theme.
- An explicit **dark-mode prose decision**: theme `--tw-prose-invert-*` too, or drop
  `dark:prose-invert` and theme one token-var-driven `--tw-prose-*` set — applied consistently across
  all six prose routes (blog, projects, profile, about, now, colophon).
- The **< `sm` hero display step** named (and wrap behavior confirmed) for the serif name on 360px.
- A one-line note on whether **`prose-lg`** survives the blog migration under the new typed scale.

The four r1 MUST_FIX deltas are correctly landed (print re-declaration exists; prose markup-wrap is
an explicit named change; `max-w-[75ch]` is correctly cited at line 143 as the only occurrence; the
header text-link→wordmark correction is consistent across Code Reuse/§3/§5). The `@theme` mapping is
complete, the `--ring`→`--brand` chain resolves, `max-w-measure` is the correct v4 utility, the
prose-wrap collides with nothing, and distinctiveness holds. No MUST_FIX this round — the residue is
margin/legibility/specification gaps, not contradictions or unbuildable mechanisms.

```
VERDICT: iterate
MUST_FIX: 0
SHOULD_FIX: 3
MINOR: 2
DESIGN_READY: no
ESCALATE: none
```
