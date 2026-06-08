# Adversarial Review Memory — design
Last updated: 2026-06-08 (after v3 review — CONVERGED)

## Status: CONVERGED (r3, 0 MUST / 0 SHOULD / 2 MINOR, DESIGN_READY)

v3 closed all three r2 SHOULD_FIX (U1 success-light retune, U2 print brand ink, U3 dark-prose
strategy) and both MINORs (U4 hero `<sm` step, U5 prose-lg drop), all independently re-verified
against the live repo and recomputed contrast. Only two non-blocking MINORs remain (see r3 below);
MINOR-only ⇒ converged. No further iterate needed.

## Cumulative Findings Summary

### Accepted (fixed)
- **r2 SHOULD_FIX all closed in v3 (verified r3):**
  - **U1 `--success` light** darkened `0.52 0.14`→`0.50 0.15 150`; recomputed composite = **4.797**
    (was the bar-sitting 4.50). Whole triplet re-verified — warning 4.842, info 4.609 — no new
    on-the-bar cell. Direct-on-bg (5.537/9.103) and solid-fill (5.537/8.239) paths all clear.
  - **U2 print brand ink** added `--brand 0.45 0.13 42` (=**7.88** on white) + `--brand-visited
    0.45 0.06 42` (=7.62) to the `@media print` block; the dark-mode wash-out it fixes was 2.30.
    Kicker/links now legible printed from both themes.
  - **U3 dark-prose** standardized all six routes to `prose dark:prose-invert max-w-measure` and
    themed BOTH `--tw-prose-*` and `--tw-prose-invert-*` to the same token vars → dark links resolve
    to `--brand`. `dark:prose-invert` is an intentional no-op (both sets = same theme-flipping vars),
    not a contradiction. `prose-lg` dropped from blog body (nothing else depends on it).

- **Print ships dark (r1 MUST → fixed in v2, verified r2):** print.css now re-declares the neutral
  token custom properties under `@media print { :root,.dark { … } }`. Confirmed the *neutral*
  surfaces that survive print (headshot, avatar, body text) now print light. (Residual brand-ink gap
  — see Unresolved.)
- **Prose theming missed 4 routes (r1 MUST → fixed in v2, verified r2):** v2 adds the explicit
  markup change wrapping profile/about/now/colophon in `prose max-w-measure`. The wrap collides with
  nothing (projects.css wide-media is scoped `.projects-article .prose`; the four routes are outside
  it; profile `<article>` is a sibling of the form). (Dark-prose path still unspecified — Unresolved.)
- **`max-w-[75ch]` misstated (r1 MUST → fixed in v2, verified r2):** correct at `blog/[slug]:143`,
  confirmed the **only** occurrence in `(site)`; reframed as introduce-where-absent + replace-the-one,
  atomic migration. (Live note: `projects/[slug]` uses `max-w-prose`, not `max-w-[75ch]` — separate.)
- **"Replaces MF avatar in header" false (r1 MUST → fixed in v2, verified r2):** header is a text
  link (`siteConfig.name`); corrected across Code Reuse/§3/§5. Verified against `header.tsx`.
- **Focus-ring alpha, `--brand-visited` enumeration, OG font-data, one-CTA rule, link-Button→brand
  (r1 SHOULDs → addressed in v2, verified r2):** `@theme` mapping is complete (brand-visited + status
  `-foreground` all mapped); `--ring`→`--brand` chain resolves; OG font-data load specified;
  `og-default.png` confirmed missing (dangling ref the spec fixes). Clean.
- **Serif down-weight + minors (r1 → addressed in v2):** distinctiveness rationale now rests on the
  mono-`/`-kicker + rust + hairline system; passes the frontend-design R3.6 lens. Clean.

### Partially Accepted
- **Status retune (r1 SHOULD):** v2 fixed `warning` light (0.55→0.52, now composites 4.84) and lifted
  the dark cells (all 6.7–8.0, large margin). BUT **`success` light (0.52/0.14/150) composites to
  4.50** — re-created the exact on-the-bar defect at a new role. Partially fixed.

### Rejected
- (none)

### Unresolved (carry forward — both MINOR, non-blocking)
- **M1 (r3, MINOR) — print omits `--brand-foreground`:** if a `bg-brand` CTA ever printed from dark
  mode, `--brand-foreground` stays near-black (0.205) on the rust print ink = 2.27:1. Moot today (the
  only brand fill is in the hidden contact form), but pre-empt by re-declaring `--brand-foreground:
  white` in `@media print`, or note brand fills never print. Implementation-safe.
- **M2 (r3, MINOR) — hero == h1 below `md`:** both `text-4xl sm:text-5xl`; diverge only at `md`
  (hero→`text-6xl`). Intended (composition carries the hero on mobile); one line stating the sub-`md`
  size parity is deliberate would stop a future editor "fixing" it. Not rework.

### Resolved this round (were U1–U5, now closed — see Accepted)
- U1/U2/U3/U4/U5 all landed in v3 and verified r3. `info` light (4.609) is the thinnest cell — clears
  AA, watch on implementation re-verify, no action.

## Patterns & Themes
- r1's wins were codebase-grounding + mechanism-vs-goal. **v2 fixed every one of those cleanly** —
  the four MUST_FIX deltas are correct and complete. No MUST_FIX remained in r2.
- **r2's pattern is "the fix introduced an adjacent gap":** the status retune fixed `warning` and
  broke `success` (U1); the print re-declaration fixed surfaces but missed the brand ink (U2); the
  prose-wrap fixed light theming but left dark unspecified (U3). The contrast math and codebase
  grounding are otherwise solid.
- **Contrast was independently recomputed twice** (sRGB-gamma compositing). Brand/ring/foreground
  remain vindicated; only the status `/10`-over-surface cells are tuned to the line — and one
  (`success` light) still sits on it.
- Distinctiveness has passed the frontend-design lens twice; do not re-litigate it.

## Guidance for Next Review (if any — design is CONVERGED)
- The design is **converged / DESIGN_READY**. No further adversarial round is warranted on design.md.
  If a v4 is forced, the *only* open items are M1/M2 above — both MINOR, both implementation-safe.
  Do **not** re-open U1–U5 (all closed and independently re-verified in r3) or re-litigate any
  Settled item below.
- **Do NOT re-run (verified clean across r1+r2+r3):** brand/ring/foreground contrast; status triplet
  (success 4.797 / warning 4.842 / info 4.609); print neutral+brand re-declaration (brand 7.88 on
  white); dark-prose both-sets-themed strategy (dark links = `--brand`; `dark:prose-invert` is an
  intentional no-op); the four r1 MUST_FIX deltas; `@theme inline` mapping; `--ring`→`--brand` chain;
  `max-w-measure` v4 utility; projects.css/prose-wrap collision; distinctiveness; Fraunces
  self-hosting/CSP; structure.md placement; hero `<sm` step + `prose-lg` drop; favicon set; OG
  dangling-ref fix; requirement-completeness (R6.1/R7.2/R8.1/R10.1 all decided).
