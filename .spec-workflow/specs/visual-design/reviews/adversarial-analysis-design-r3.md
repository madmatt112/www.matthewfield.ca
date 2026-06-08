# Adversarial Analysis — visual-design / design.md (v3), Round 3

Reviewed against the live repo (`tokens.css`, `globals.css`, `blog/[slug]/page.tsx`,
`projects/[slug]/page.tsx`, `profile/page.tsx`, `site.ts`, `src/app/favicon.ico`). Every ratio below
was recomputed independently via OKLab→linear-sRGB→WCAG, compositing each `/10` tint the way browsers
actually composite an alpha layer (sRGB-gamma over the surface). The frontend-design lens was applied
as the distinctiveness check; it passed twice prior and v3 did not regress it (see §5).

**Bottom line:** v3 lands all three r2 SHOULD_FIX items cleanly and both MINORs. `--success` light no
longer sits on 4.50 — it composites to **4.797** (and the whole status triplet was recomputed:
warning 4.842, info 4.609, all clearing the doc's own ≥4.6 target except info, which clears the bare
4.5 bar and matches its claimed 4.61). The print block now re-declares `--brand`/`--brand-visited` at
a dark rust ink that reads **7.88/7.62:1** on white. Dark-mode prose theming is now one coherent
strategy across all six routes, and the both-sets-themed approach correctly resolves dark links to
`--brand`. Hero `< sm` step and `prose-lg` drop are both specified. **No MUST_FIX, no SHOULD_FIX.**
The only residue is two MINOR wording/robustness notes that are safely left to implementation.
Per the methodology, MINOR-only ⇒ **converged**.

---

## 1 — U1: `--success` light retune (Recurring → dead)

Recomputed `text-<role>` over `<role>/10` composited on **both** `background` and `card`, both themes,
with v3's values (`--success 0.50 0.15 150` light / `0.74 0.15 150` dark):

| Role | light / bg | light / card | dark / bg | dark / card |
|---|---|---|---|---|
| `success` `0.50 0.15 150` | **4.797** | **4.797** | 7.986 | 6.970 |
| `warning` `0.52 0.12 85` | 4.842 | 4.842 | 8.006 | 6.981 |
| `info` `0.52 0.14 240` | 4.609 | 4.609 | 7.684 | 6.714 |

(Light card == background == white, so the two light columns match — correct.)

- **`success` light = 4.797**, up from the r2 bar-sitting 4.50. Real margin now; clears the doc's
  stated ≥4.6 target. The Recurring on-the-bar defect is **dead** — and it was not moved to a fourth
  cell: I recomputed the whole triplet. warning (4.842) and info (4.609) did **not** drift from r2.
  info is the thinnest at 4.609, but it clears the bare 4.5 bar with a real (small) margin and matches
  the doc's claimed 4.61. Acceptable. (The doc's "target ≥4.6" is aspirational; info at 4.609 rounds
  to its claim and is over the AA line — not a contradiction worth flagging.)
- **Darkening `--success` to L0.50 breaks nothing else.** `text-success` directly on `background`
  (no tint) = **5.537** light, **9.103** dark — both well clear. The solid-fill path
  (`bg-success` + `--success-foreground`) is also fine: near-white on light fill = **5.537**,
  near-black on dark fill = **8.239**. No regression at any other success use. **U1 closed.**

## 2 — U2: print brand-ink re-declaration (Compounding → complete)

v3 adds `--brand: oklch(0.45 0.13 42)` and `--brand-visited: oklch(0.45 0.06 42)` to the
`@media print { :root, .dark { … } }` block (design.md:462). Recomputed on white:

- print `--brand` = **7.881:1**, print `--brand-visited` = **7.623:1**. Both clear ≥4.5 comfortably
  as link/kicker ink on paper. The wash-out case it fixes — dark-mode `--brand` `0.75 0.12 55`
  printed on white — was **2.299:1** (verified), so the fix is real and necessary. The mono `/ kicker`
  (`text-brand`) is now legible printed from **both** light and dark mode. **U2 closed.**
- **No non-re-declared surface reads a dark value on paper.** Verified `profile/page.tsx`: the body is
  a plain `<article>` (line 48), the contact section (`SocialLinks`, `ObfuscatedEmail`, `ContactForm`,
  lines 52–58) is the only home of a brand CTA, and the design hides the contact **form** on print
  while keeping email/social links as **text**. So no `bg-brand` *fill* survives to paper — only
  `text-brand` ink, which uses the re-declared `--brand`. The design's claim that
  status/`--accent`/`--secondary`/`--input`/`--primary` consumers are "hidden or inert on paper" holds
  against the live profile tree. (Edge note → MINOR M1 below.)

## 3 — U3: dark-mode prose strategy (Novel → coherent)

v3 standardizes all six routes to `prose dark:prose-invert max-w-measure` and themes **both** the
`--tw-prose-*` and `--tw-prose-invert-*` sets to the *same* token vars (`var(--foreground)`,
`var(--brand)`, …). Stress-tested:

- **Which set wins, and is `dark:prose-invert` a no-op?** Yes — and that's correct, not a bug. In dark
  mode `dark:prose-invert` swaps the plugin to its `--tw-prose-invert-*` set; because v3 maps that set
  to the **same** theme-flipping token vars as the base set, both sets resolve to identical values in
  a given theme. `dark:prose-invert` thus becomes effectively inert — belt-and-suspenders, not a
  contradiction. The benefit: it is robust whether or not a future reader keeps `dark:prose-invert`,
  and it makes the class list uniform across all six routes (matching the existing live
  `blog/[slug]:143` and `projects/[slug]:87`, which both already carry `dark:prose-invert`).
- **Dark-mode prose link resolves to `--brand`, not the plugin default.** Confirmed: with the invert
  set themed to `var(--brand)` (and the base set also `var(--brand)`), the dark link is `--brand`
  either way. The r2 defect (existing routes' `dark:prose-invert` pulling the unthemed plugin
  gray/blue) is resolved. No "two different prose link colors across the site" anymore.
- **No redundancy/contradiction between "light set flips via tokens" and "also theme the invert
  set."** Both statements are true and consistent: theming both sets to the same token vars is the
  mechanism that makes `dark:prose-invert` harmless. Internally coherent.
- **`prose-lg` drop is clean.** Live `blog/[slug]:143` is `prose prose-lg dark:prose-invert
  max-w-[75ch]`; v3 drops `prose-lg`. Nothing else depends on `prose-lg` sizing: grep finds no
  font-size assertion on the blog body and no reading-time/TOC layout keyed to it (the TOC is a
  sibling component, line 142, not inside `.prose`). **U3/U5 closed.**

## 4 — U4 hero step + stale-text sweep (Novel)

- **Hero vs h1 below `md`.** v3 hero is `text-4xl sm:text-5xl md:text-6xl`; h1 is
  `text-4xl sm:text-5xl`. So below `md` the hero display and h1 are **identical in size** (both
  `text-4xl`, then `sm:text-5xl`); they diverge only at `md` (hero → `text-6xl`). This is the r3
  probe's exact concern. **Assessment: intended and acceptable, not a defect.** The hero still reads
  as the priority surface through *composition*, not raw size — it alone carries the wordmark `mf/`,
  the brand `/ kicker`, the hairline rule, and `text-balance` (design §3.2). On the viewport where a
  recruiter most assesses a hero (laptop/desktop, ≥`md`), it is a full step larger. The visual
  hierarchy on a 360px phone leans on the kicker/wordmark/rule rather than a size delta — a legitimate
  editorial-restraint call consistent with the "memorable without being loud" thesis. Worth one line
  (MINOR M2) but not rework.
- **Stale-text scan: clean.** No occurrence of "only the light set" as a *standing claim* (the one
  hit at design.md:311 is inside the explanatory "If only the light set were themed…" clause —
  correct context), no "MF avatar in header," no `0.52 0.14 150`/`0.52/0.14`, no surviving
  "≥4.5 with margin" (replaced by the ≥4.6 target language), no `max-w-[75ch]`-as-replacement-
  everywhere. The `prose-lg` hits are all the intended "drops `prose-lg`" decision. Revision history
  (v3 entry), the Data Models block, and §1/§2 numbers are mutually consistent.

## 5 — Requirement-completeness sweep + distinctiveness (Novel + frontend-design lens)

Walked R1–R10 at the decision level. No acceptance criterion is left merely gestured-at:

- **R7.2 surface/elevation — settled.** §4: flat/bordered, no elevation set, single small shadow only
  on Radix overlays; corner rounding via existing `--radius`. A concrete, applied decision.
- **R8.1 favicon set — complete.** §5 names `icon.svg` + `apple-icon.png` (180×180) + regenerated
  `favicon.ico`. Live `src/app/favicon.ico` exists (will be regenerated); the SVG/apple-icon are
  net-new via the metadata-file convention. No hand-wave.
- **R6.1 status `-foreground` — specified, not hand-waved.** §1: "near-white (light) / near-black
  (dark), as brand," i.e. `--brand-foreground`'s `oklch(0.99 0 0)` / `oklch(0.205 0 0)`. Verified
  legible on the solid fills (5.537 light, 8.239 dark, §1).
- **R10.1 responsive — addressed beyond hero.** §4 gutters `px-4 sm:px-6 lg:px-8`, section rhythm
  `py-16 md:py-24`, and the type scale carry named breakpoint steps; the hero `<sm`/`sm`/`md` ladder
  is explicit. Responsive intent is decided at each named gate, not just the hero.
- **OG dangling ref — confirmed.** `site.ts:42` still points at `/images/og-default.png`, which does
  **not** exist in the repo. The design's `opengraph-image.tsx` route replaces it. Accurate.
- **Deferred section — honest.** Per-page OG, chart palette, i18n/RTL, and CI gate upgrades are the
  only deferrals; each is consistent with the requirements/steering, none is in-scope-but-cut.
- **Distinctiveness (frontend-design lens) — holds, no v3 regression.** v3 touched contrast/print/
  prose numbers, not the identity. The mono-`/`-kicker + rust + hairline + serif system is intact; a
  recruiter viewing the hero still sees serif name + `mf/` + rust `/ kicker` + hairline rule — not
  stock shadcn-neutral. Passes R3.6. Not re-litigated.

---

## Top risks/gaps

1. **(MINOR M1, Novel) Print block omits `--brand-foreground`.** If a `bg-brand` CTA ever *did* print
   from dark mode, `--brand-foreground` stays near-black (`0.205`) on the re-declared rust ink
   `0.45 0.13 42` = **2.27:1** (verified). This is currently *moot* — the only brand-fill button is
   in the hidden contact form, so no brand fill reaches paper. But it's a one-line robustness gap: if
   a future brand CTA is ever placed outside the hidden form, dark-mode printing fails its label
   contrast. Cheap to pre-empt by re-declaring `--brand-foreground: white` in the print block (or
   noting brand fills are never printed). **Implementation-safe MINOR.**
2. **(MINOR M2, Novel) Hero display == h1 below `md`.** `text-4xl sm:text-5xl` for both; they only
   diverge at `md`. Intended (composition carries the hero on mobile), but the design could state in
   one line that the sub-`md` size parity is deliberate so a future editor doesn't "fix" it by
   bumping the mobile hero into a wrap. (design.md type-scale rows ~276–277.)
3. **(watch, not a finding) `info` light = 4.609** is the thinnest status cell — it clears AA and
   matches the doc's claim, but it has the least headroom of the three. No action; flagged only so the
   implementation contrast re-verify keeps an eye on it.

## Top conclusions to challenge or reverse

None. The three r2 SHOULD_FIX conclusions are now correctly closed and independently re-verified:
`--success` light has real margin (4.797), the print brand ink reads on white (7.88), and dark-mode
prose links resolve to `--brand` via the both-sets-themed approach. The `dark:prose-invert`-as-no-op
question resolves to "correct and intentional," not a contradiction.

## What's missing before build

Nothing material. The design decides every acceptance criterion at the value/mechanism level. The two
MINORs (re-declare `--brand-foreground` for print robustness; one line that the sub-`md` hero/h1 size
parity is deliberate) are wording/defensive notes safely left to implementation — they do not block
build and do not justify another iterate. The status triplet, print brand ink, and dark-prose
strategy are all internally consistent and match the live codebase. **DESIGN_READY.**

```
VERDICT: converged
MUST_FIX: 0
SHOULD_FIX: 0
MINOR: 2
DESIGN_READY: yes
ESCALATE: none
```
