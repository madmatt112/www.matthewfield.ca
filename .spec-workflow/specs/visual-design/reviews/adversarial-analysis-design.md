# Adversarial Analysis — visual-design / design.md (v1)

Reviewed against the live repo (`tokens.css`, `globals.css`, `layout.tsx`, `next.config.ts`,
`package.json`, the `(site)` pages, `header.tsx`, `avatar-placeholder.tsx`, `button.tsx`,
`reading-progress.css`, e2e suites) and the OKLCH values computed through sRGB relative luminance.
Distinctiveness judged through the `frontend-design` lens.

Bottom line: the **contrast math holds** (no hard a11y hole), and the **type/signature/color
identity is buildable**. But the design makes **two false codebase claims about where `.prose`
lives** that break its own "themes prose to tokens" mechanism on the routes it names, the
**print-CV mechanism is under-specified in exactly the way that ships a dark CV**, and several
status pairings pass by a hair (warning-light = 4.50). Distinctiveness is genuinely committed, not
stock-shadcn. Net: a short iterate, not a rebuild.

---

## 1 — Contrast math (R5, R10): computed, mostly clean

Ratios computed from the doc's OKLCH values via OKLab→linear-sRGB→WCAG, both themes:

| Pairing | Light | Dark | Bar | Result |
|---|---|---|---|---|
| `brand` link on `background` | 6.35 | 8.61 | 4.5 | pass |
| `brand` link on `card` | 6.35 | 7.79 | 4.5 | pass |
| `brand` link on `muted` | 5.82 | 6.58 | 4.5 | pass |
| `brand-visited` on `background` | 6.15 | 7.88 | 4.5 | pass |
| `brand-foreground` on `brand` fill (button) | 6.17 | 7.79 | 4.5 | pass |
| `brand` ring vs background/card/muted (non-text) | 5.82–6.35 | 6.58–8.61 | 3.0 | pass |
| `muted-foreground` on bg/card/muted | 5.50–6.00 | 6.55–8.58 | 4.5 | pass |

**The headline brand/ring/foreground numbers are real, not asserted — all clear with margin.** The
"retune at implementation" hedge is unnecessary for these; they're fine as stated. Good.

**Status roles — the compositing problem the prompt flagged is real but lands just on the pass
side, thinly.** Text-on-own-`/10`-tint, tint composited in linear sRGB:

| Role | own/10 over **background** L | over bg D | over **card** L | over card D |
|---|---|---|---|---|
| success | 4.75 | 4.85 | 4.75 | **4.60** |
| warning | **4.50** | 4.95 | **4.50** | 4.70 |
| info | 4.88 | 4.56 | 4.88 | **4.31** |

- **`warning` light composited on its own `/10` = 4.504** — i.e. it rounds to exactly 4.5. This is a
  coin-flip against the bar: browsers composite `bg-warning/10` in sRGB-gamma (not linear), `color-mix`
  default is OKLab, and any of those shifts it under. **SHOULD_FIX** — bump `--warning` light a hair
  darker (e.g. L 0.53) to buy margin.
- **`info` dark composited on `/10` over `card` = 4.31** — under 4.5. The matrix only validates status
  text against its tint *composited on background*; it never reasons about a callout sitting inside a
  `card` (the realistic place for the contact-form result). **SHOULD_FIX**: the matrix's status row
  (`<role>/10 tint`) is validated only for the background-composited case; nest a status callout in a
  card and `info`/`success` dark dip below 4.5.

**Legal-pairing matrix cells are correct** where stated: `muted-foreground` on `card` is the same as
on `background` (card == background in light, 6.00; in dark card 0.205 vs muted-fg 0.74 = 7.77) —
the matrix's `muted-foreground`✓`card` cell holds. No wrong cell found.

Verdict for dimension 1: **no hard contrast hole**, but status values are tuned to the line, not for
margin, and the matrix under-models nested status surfaces. SHOULD_FIX, not MUST_FIX.

---

## 2 — Distinctiveness (R3/R4, frontend-design lens): genuinely committed

Through the skill's anti-"AI-slop" lens this is **not** a tasteful reshuffle of stock shadcn-neutral:

- **Serif display (Fraunces) over Geist sans body + Geist Mono kicker** is a real three-voice
  system, and the editorial-technical pairing (mono `/`-kickers nodding to URL paths, on an
  infra/platform site that literally has `/slashes` pages) is *contextual*, not decorative — exactly
  the "designed for the context" the skill asks for. The `/` motif earns its place semantically.
- **Rust** over the default developer-blue is a confident, warm, uncommon accent. At
  `oklch(0.50 0.13 42)` it is a true rust, not muddy brown; the dark hue-lift to 55 is a real
  matched-pair decision, not a reuse. This clears R2.4's "equivalent presence, not merely passing."
- It survives R3.5 (≥2 craft choices, not accent alone): serif voice + mono-kicker system + flat
  hairline surfaces are three independent choices beyond the rust.

Honest pushback to record (not blocking):

- **Fraunces *is* a 2024–2026 personal-site cliché.** It is the default "give my dev site
  personality" serif; maggieappleton/rauno/Stripe-Press-adjacent sites reach for it constantly. The
  doc name-drops three references but doesn't argue why Fraunces specifically (vs. e.g. a less-worn
  display serif) beyond "warm/editorial." The distinctiveness here rests on the *system* (mono `/`
  kickers + rust + hairlines), not the serif — which is fine, but the doc over-credits the serif as
  signature pillar #1. **MINOR**: down-weight Fraunces' load-bearing role in the rationale, or argue
  the specific face.
- **`mf/` wordmark** is the weakest signature element: lowercase-mono initials + slash is closer to
  generic-dev-mark than the kicker system. It reads as deliberate only *because* the `/` motif is
  established elsewhere; alone it's forgettable. Acceptable, but it's carrying less than the doc
  implies. **MINOR.**

Verdict: passes the R3.6 "cannot be told from stock shadcn-neutral → FAILS" bar. Clean dimension.

---

## 3 — Buildability of named mechanisms

### 3a — `.prose` is in only TWO routes, not the routes the design themes (MUST_FIX)

The design repeatedly says the prose scale + measure apply to "all `(site)` long-form prose (blog,
projects, **about/now/colophon**)" and to the **profile**, realized by theming
`@tailwindcss/typography`'s `.prose` via `--tw-prose-*`. Grep of the live tree:

- `.prose` is used in exactly **two** files: `src/app/(site)/blog/[slug]/page.tsx:143` and
  `src/app/(site)/projects/[slug]/page.tsx`.
- **profile, about, now, colophon all render MDX inside `text-base leading-relaxed text-foreground`
  divs** (e.g. `profile/page.tsx` `<article className="mt-10 text-base leading-relaxed
  text-foreground">`; about/now/colophon `<div className="mt-6 text-base leading-relaxed
  text-foreground">`), **not `.prose`.**

So theming the typography plugin styles blog + project bodies only. The profile/about/now/colophon
bodies the design names in §2 ("about/now/colophon") and §6 (per-section table: "About/Now/Colophon
→ Prose scale + measure") **get nothing** from the plugin — they'd need either a `.prose` wrapper
added per page (a markup change the design doesn't list) or hand-authored CSS. The design asserts a
mechanism that doesn't reach four of the routes it claims it covers. **MUST_FIX**: either (a) add
`.prose` to those four bodies as an explicit task, or (b) state the typed scale is applied via the
existing `text-base` wrappers and drop the "themes `.prose`" framing for them.

### 3b — `max-w-[75ch]` is ONE call site, not "all prose bodies" (MUST_FIX — false artifact)

The design says it replaces "the arbitrary `max-w-[75ch]` at `blog/[slug]/page.tsx:**100**`" and
applies `max-w-measure` to "all prose bodies." Reality:

- `max-w-[75ch]` appears at `blog/[slug]/page.tsx:**143**` — **wrong line number** (a misstated
  artifact = auto-MUST_FIX per the prompt's ground rule).
- It is the **only** `max-w-[75ch]` in `(site)`. The projects `[slug]` body, profile, about, now,
  colophon currently have **no measure ceiling at all** (profile/about/etc. are full-column
  `text-base`). So "replaces the arbitrary value … applying to all prose bodies" overstates: it's one
  removal plus *adding* a measure where none exists — a different, larger change than "replace." The
  professional-profile "widen gutters not measure" (R4.3) requires *introducing* `--container-measure`
  on a body that today has no measure, on a page using `max-w-5xl` — buildable, but it's net-new
  constraint, not a swap. **MUST_FIX**: correct the line number and reframe as "introduce measure on
  bodies that lack it + replace the one `max-w-[75ch]`."

### 3c — `@tailwindcss/typography` absent + current `.prose` inert: claim is TRUE

Confirmed: `package.json` has no `@tailwindcss/typography`; `globals.css` has no `@plugin`. So
today's `prose prose-lg dark:prose-invert` on blog/project pages **is** effectively inert (only the
Shiki code-span cascade in `globals.css` styles those subtrees). The design's current-state finding
is **correct**. Adding `@plugin "@tailwindcss/typography";` is the supported v4 load path. One caveat
the design half-addresses: the plugin emits its CSS in Tailwind's `components`/`utilities` layers,
while `tokens.css` is *intentionally unlayered* (cascades above Tailwind layers — see `globals.css`
comment). `--tw-prose-*` overrides set on `.prose` are fine (variables, not layered rules), but any
attempt to override prose *element* rules via unlayered selectors must out-specify the plugin —
workable, but the design should note the layer interaction it currently waves at ("themes it via
`--tw-prose-*`"). **MINOR.**

### 3d — Print stylesheet forcing light: mechanism under-specified, ships a dark CV if taken literally (MUST_FIX)

Tokens are class-scoped: `.dark { --background: …; --foreground: … }` in `tokens.css`. A `@media
print` block of **utility classes** (`bg-white text-black`, hiding chrome) will NOT override the
`.dark` token *values* — when the user prints from dark mode, `.dark` is still on `<html>`, so any
element still reading `var(--background)`/`var(--foreground)` (the body background set in
`globals.css` `body { background-color: var(--background) }`, all `bg-card`/`text-muted-foreground`
surfaces on the profile) renders **dark on paper**. The design says "force a light palette (white
background, near-black text) regardless of the screen theme" but specifies the *what*, not the
*how* — it lists chrome-hiding utilities but does **not** state that print.css must **re-declare the
token custom properties** under print, e.g.:

```css
@media print { :root, .dark { --background: white; --foreground: black; --card: white;
  --muted: …; --border: …; --muted-foreground: … } }
```

Without that re-declaration the print profile is a dark CV — which is the *exact* failure R8.5
exists to prevent. **MUST_FIX**: the design must state the token-re-declaration mechanism, not just
the visual goal. (This is the one genuinely unbuildable-as-written mechanism.)

### 3e — `next/og` + Fraunces: feasible but the doc hand-waves the font-data load

`ImageResponse` does **not** read `next/font`; it needs explicit font *data* (an `ArrayBuffer`
fetched/read at build). The design says the OG image "composes the identity (serif name …)" but never
says how Fraunces glyph data reaches `ImageResponse`. It's feasible (read the woff2/ttf at build and
pass via `fonts: [{ data, name }]`), and `next/og` rasterizes server-side so the runtime CSP
`font-src 'self'` is irrelevant to it (the PNG is served under `img-src 'self' data:` — fine). But as
written it's gestured at. **SHOULD_FIX**: specify the explicit font-data load for the OG route.
Also note: `public/images/og-default.png` (the file `siteConfig.ogImage` points at) **does not exist
in the repo today** — so the current OG reference is already dangling; the design's replacement fixes
a latent bug, worth stating.

### 3f — Fraunces self-hosting / CSP: clean

`next/font/google` downloads woff2 at build and serves from origin (same mechanism as the existing
Geist setup in `layout.tsx`), so `font-src 'self'` holds — no external font origin added. Fraunces is
a variable Google font with latin subset and an optical-size axis as claimed. Clean.

---

## 4 — Requirement coverage / internal contradiction

- **R2.3 "primary CTAs" vs. one brand button.** The design brand-fills "the single primary CTA per
  page" and keeps `--primary` neutral. R2.3's text is "primary CTAs" (plural-agnostic) — limiting to
  one-per-page is a *defensible* reading and consistent with restraint (R2). But **"one CTA per page"
  is not defined** anywhere (what counts as "the" primary CTA on the profile, which has SocialLinks +
  email + contact form?). **SHOULD_FIX**: define the rule or the per-page designation.
- **`--primary` "stays neutral" vs. the Button.** The design says "the neutral `primary` role stays
  neutral" and "neutral `primary` stays neutral" — but `button.tsx` has **no `primary` variant**; the
  neutral solid button is `variant: "default"` (`bg-primary`), and the existing `link` variant is
  `text-primary`. Minor mismatch in naming (there's a `--primary` token, not a `primary` Button
  variant). The `link` Button variant is `text-primary` today and the design wants links → brand;
  the design never says it touches the `link` *Button* variant (only prose/chrome link *text*). If
  any built CTA uses `variant="link"`, it stays neutral-primary, contradicting "links carry brand."
  **MINOR**, but the link/Button-variant boundary should be named.
- **R2.1 vs. `--brand-visited` (stealth chroma role).** R2.1 (v4) enumerates the chromatic roles as
  "brand accent, status roles, focus ring." `--brand-visited` carries chroma (0.06/0.05) and is a
  *seventh* chromatic token. The design calls it "optional 7th token" — so it's disclosed, not stealth,
  **but it is not in R2.1's enumerated chromatic set**, creating a doc-vs-requirement gap. It's the
  same hue family as brand, so arguably "the brand accent," but the design should say so explicitly to
  avoid the active-role↔token check (R6.3) flagging an unlisted chromatic role. **SHOULD_FIX.**
- **Reading-progress → `--brand` widens R2.3's allowed set.** R2.3 limits brand to "interactive
  emphasis … SHALL NOT fill … large surfaces." A 3px non-interactive progress line is neither
  interactive nor a large surface — the design adds "thin non-interactive brand indicators" to the
  allowed list. This is a *widening* of R2.3, disclosed and defensible (it's a hairline, folds the
  site's only other chroma into one role), but it is a design-introduced category R2.3 doesn't list.
  Defensible; record it as an intentional R2.3 read. **MINOR.**
- **R6.3 active-role↔token / `--ring` → brand.** Design sets `--ring: var(--brand)`. Today `--ring` is
  zero-chroma (0.708 light / 0.556 dark) and `button.tsx` uses `focus-visible:ring-ring/50`. Fine, and
  R2.1 v4 already names ring as chromatic. But note `ring-ring/50` at 50% alpha — the design's "ring
  ≥3:1 non-text" math above is for the *solid* brand; at `/50` over the surface the effective ring
  contrast is lower. **SHOULD_FIX**: the design's ring-contrast claim uses solid brand, but the actual
  Button focus ring is `ring/50` — verify 3:1 at the real alpha, or drop the alpha for the ring.

- **structure.md placement:** new components → `wordmark.tsx` in `layout/`, `section-kicker.tsx` /
  `status-callout.tsx` in `shared/`, kebab-case, named PascalCase exports, no barrel, `print.css` as a
  slice imported from `globals.css` mirroring `blog/*.css`. All consistent with structure.md. Clean.

---

## 5 — Missing failure modes / scope honesty

- **The "replaces the MF avatar in the header" claim is false.** `header.tsx` renders
  `<Link href="/" …>{siteConfig.name}</Link>` — i.e. the **full text "Matthew Field"**, *not* an "MF"
  avatar. The "MF" only exists as `AvatarPlaceholder`'s default `initials` (rendered in the landing
  **hero** and as profile fallback). So "Wordmark … replaces the `AvatarPlaceholder` in `header.tsx`"
  (Code Reuse + §5) is wrong: the header has **no avatar to replace** — it has a text link. The
  Wordmark replaces (a) the hero's `AvatarPlaceholder` and (b) the header's *text link*. **MUST_FIX**:
  correct the artifact — the header swap is text-link→wordmark, not avatar→wordmark.
- **Error Handling omits forced-colors + brand ring.** Scenario 3 covers status-color-alone, but the
  brand focus ring under `forced-colors` (where custom ring colors are replaced by system colors)
  isn't addressed; the design-system gate requires forced-colors usability. **MINOR** (system colors
  generally satisfy it, but it's an unlisted mode).
- **`--max-w-measure` migration window.** Until every prose body is migrated, the site mixes
  `max-w-[75ch]` (blog), `max-w-measure` (new), and *no measure* (profile/about/now/colophon today).
  The design doesn't sequence this; mid-migration the "coherent measure" claim (R1) is false. The
  arbitrary-value grep gate (R1.2) will also flag the surviving `max-w-[75ch]` until line 143 is
  changed. **SHOULD_FIX**: name the migration as one atomic task per the R9.4 "update in same task"
  pattern.
- **Tests: low regression risk, two to watch.** The reading-progress parity e2e
  (`component-preview/reading-progress.test.ts:60` `lightColor !== darkColor`) still passes — brand
  light `0.50 0.13 42` ≠ dark `0.75 0.12 55` compute to different RGB, so the fill→brand swap keeps the
  assertion green (design's "stays green" claim holds *here*). `landing.test.ts` asserts hero-card
  count/links, not the avatar/name markup, so the Wordmark swap doesn't break it. No test asserts the
  literal "MF"/header text, so Scenario 5's premise (a test asserts old "MF" markup) is **hypothetical**
  — there is no such test to update. **MINOR**: Scenario 5 guards a regression that doesn't exist.
- **Deferrals are honest.** Per-page OG, chart palette, i18n/RTL, CI gate upgrades — all match the
  requirements/steering deferral set; nothing in-scope is silently cut. Clean.

---

## Top 5 risks/gaps (concrete failure scenarios)

1. **Dark-mode CV prints dark.** User on the profile in dark mode hits Cmd-P. print.css hides chrome
   via utilities but never re-declares `--background`/`--foreground` under `@media print`; `.dark` is
   still on `<html>`, `body { background: var(--background) }` stays near-black → a dark, ink-heavy CV.
   R8.5 fails. (§3d; `tokens.css` `.dark`, `globals.css` `body`.) **MUST_FIX.**
2. **Prose theming misses four routes.** Profile/about/now/colophon render MDX in
   `text-base leading-relaxed text-foreground`, not `.prose` — theming `@tailwindcss/typography` does
   nothing for them, so the "typed prose scale on About/Now/Colophon/profile" (§6 table, §2) silently
   doesn't ship. (§3a; `profile/page.tsx`, `about|now|colophon/page.tsx`.) **MUST_FIX.**
3. **`max-w-[75ch]` artifact misstated + measure absent elsewhere.** Cited at line 100 (actually 143),
   called "the" arbitrary value across "all prose bodies" — it's the *only* one, and four bodies have
   *no* measure today, so this is an add, not a replace; the R1.2 arbitrary-value grep keeps flagging
   line 143 until migrated. (§3b.) **MUST_FIX (misstated artifact).**
4. **"Replaces the MF avatar in the header" is false.** Header is a full-name text link, not an avatar;
   the avatar lives in the hero. The component-reuse plan targets a component that isn't in the header.
   (§5; `header.tsx`, `avatar-placeholder.tsx`.) **MUST_FIX (false artifact).**
5. **Status `/10` tints pass by a hair / fail when nested in a card.** warning-light = 4.50 (rounds to
   the bar), info-dark on `/10` over `card` = 4.31 (<4.5). The matrix validates status tint only over
   `background`; the realistic contact-result-in-a-card case is unmodeled. (§1.) **SHOULD_FIX.**

## Top 3 conclusions to challenge or reverse

1. **"Theme `@tailwindcss/typography` and prose is solved everywhere."** Reverse: `.prose` is in 2 of
   the named routes; the rest need an explicit `.prose` wrapper or hand-authored CSS. Pick one and say
   it.
2. **"Print is a `@media print` slice of utilities."** Reverse: it must re-declare token *custom
   properties* under print, or it ships a dark CV. Mechanism, not goal.
3. **"Fraunces is the distinctive signature pillar."** Challenge: Fraunces is the *cliché* personal-site
   serif; the real distinctiveness is the mono-`/`-kicker system + rust + hairlines. Down-weight the
   serif's load-bearing role (or justify the specific face) — the identity holds on the other three.

## What's missing before build

- The **token-re-declaration print mechanism** (the actual `@media print { :root,.dark { --… } }`).
- A decision on **how profile/about/now/colophon prose gets the scale** (add `.prose`, or style the
  `text-base` wrappers) — and the **measure-migration sequencing** as one atomic change.
- **Explicit OG font-data loading** for the `next/og` route (and note `og-default.png` is currently
  missing, so this fixes a dangling reference).
- **Enumerate `--brand-visited` in R2.1's chromatic set** (or fold it explicitly into "the brand
  accent") so the active-role↔token check won't flag an unlisted chromatic role.
- **Correct the header artifact** (text-link→wordmark, not avatar→wordmark) and the `max-w-[75ch]`
  line number.
- **Verify the focus ring at its real alpha** (`ring/50`) clears 3:1, or drop the alpha.
- A **hair more margin on `--warning` light** and on the dark status-in-card case.

Distinctiveness, the core OKLCH contrast math, font self-hosting/CSP, and structure.md placement are
all clean and need no change.

```
VERDICT: iterate
MUST_FIX: 4
SHOULD_FIX: 5
MINOR: 6
DESIGN_READY: no
ESCALATE: none
```
