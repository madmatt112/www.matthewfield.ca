# Adversarial Review — visual-design / design.md (v3), Round 3

You are a **principal product designer and front-end architect** doing a third-pass teardown of a
visual design spec before approval. Deep expertise in OKLCH/WCAG contrast math, Tailwind v4
(`@plugin`, `@theme inline`, the `--tw-prose-*`/`--tw-prose-invert-*` typography variables, cascade
layers), Next.js App Router (`next/font`, metadata, `next/og`), and **design distinctiveness**. Find
weaknesses, contradictions, false codebase claims, unbuildable mechanisms. Do **not** validate or
praise. Attack — but do not manufacture findings to keep a loop alive: a clean round is the correct
result if the document is clean.

**Load and apply the `frontend-design:frontend-design` skill** as the distinctiveness lens (note: it
has passed twice — do not re-litigate the verdict unless v3 regressed it).

## Prior review context — this is round 3; verify the r2 fixes, don't re-litigate settled ground

Rounds 1–2 found 4+0 must-fix, all accepted. r2 closed with **0 MUST_FIX** and three SHOULD_FIX +
two MINOR (U1–U5), which v3 set out to fix. Read first:

- The rolling memory: `.spec-workflow/specs/visual-design/reviews/adversarial-memory-design.md`
  (its "Guidance for Next Review (v3)" tells you exactly what to verify and what is settled).
- The r2 analysis: `.spec-workflow/specs/visual-design/reviews/adversarial-analysis-design-r2.md`

**Settled — do NOT re-run (verified clean across r1+r2; re-flagging these without a new regression is
nitpick-padding):** the brand/ring/foreground contrast figures; the four r1 MUST_FIX deltas (print
neutral-surface re-declaration, prose markup-wrap, `max-w-[75ch]@143`, header text-link→wordmark);
`@theme inline` mapping completeness; the `--ring`→`--brand` indirection chain; `max-w-measure` as a
valid v4 utility; the projects.css/prose-wrap non-collision; distinctiveness; Fraunces
self-hosting/CSP; structure.md placement.

Classify each finding **Novel / Compounding / Recurring**. Your job: confirm the v3 fixes to U1–U5
are **correct, complete, and internally consistent**, and bring any genuinely fresh angle.

## Verify the v3 deltas (compute, don't trust the prose)

Ground every claim in the live repo (`tokens.css`, `globals.css`, `button.tsx`, the `(site)` prose
pages, `next.config.ts`, `package.json`). Recompute ratios yourself.

### 1 — U1: `--success` light retune (Recurring → must be dead)
- v3 set `--success` light to `oklch(0.50 0.15 150)` (was `0.52 0.14`, which composited to 4.50).
  **Recompute** `text-success` over `bg-success/10` composited (sRGB-gamma) on background **and** card,
  both themes. Does it now clear the stated **≥4.6 margin**? Re-check `--warning` and `--info` light
  did not drift. Confirm the on-the-bar condition is gone at *all three* — not moved to a fourth cell.
- Does darkening `--success` to L0.50 break any *other* success use (e.g. solid `bg-success` with
  `--success-foreground`, or `text-success` directly on `background` without the tint)? Verify.

### 2 — U2: print brand-ink re-declaration (Compounding → must be complete)
- v3 adds `--brand: oklch(0.45 0.13 42)` and `--brand-visited` to the `@media print` block. Compute
  that print-brand ink's contrast on white — does `0.45 0.13 42` clear ≥4.5 as link/kicker text on
  paper? Is the kicker (`text-brand` mono label) now legible printed from **both** light and dark
  mode? Confirm no profile-kept surface still reads a non-re-declared token to a dark value on paper
  (the design claims status/`--accent`/`--secondary`/`--input`/`--primary` consumers are all hidden
  or inert — verify that's actually true for the printed profile, e.g. is there a brand CTA button
  outside the hidden form that would print `bg-brand`?).

### 3 — U3: dark-mode prose strategy (Novel → must be coherent)
- v3 standardizes all six routes to `prose dark:prose-invert max-w-measure` and themes **both**
  `--tw-prose-*` and `--tw-prose-invert-*` to tokens. Stress-test: with `dark:prose-invert` active in
  dark mode, which set wins, and are the token vars (`var(--foreground)`, `var(--brand)`) that the
  design assigns to BOTH sets actually theme-flipping correctly — or does mapping *both* sets to the
  *same* `var(--foreground)` make `dark:prose-invert` a no-op (and is that fine)? Is there now a
  redundancy or contradiction between "themed light set already flips via tokens" and "also theme the
  invert set"? Confirm the dark-mode prose **link** truly resolves to `--brand` and not the plugin
  default.
- v3 drops `prose-lg` from the blog body. Confirm nothing else depended on `prose-lg` sizing (e.g. a
  test asserting font-size, or the reading-time/TOC layout).

### 4 — U4/U5 minors + any new inconsistency from the v3 edits (Novel)
- Hero step is now `text-4xl sm:text-5xl md:text-6xl` + `text-balance`. Does this contradict the h1
  row (`text-4xl sm:text-5xl`) — i.e. is the "hero display" now identical to h1 below `md`? Is that
  intended, and does the hero still read as the priority surface? Any other place the v3 number
  changes created an internal inconsistency (revision history vs body, Data Models vs §1/§2)?
- Scan for stale text left by the v3 edits: does any sentence still say "only the light set," "MF
  avatar in header," `max-w-[75ch]`-as-replacement-everywhere, `0.52 0.14 150`, or "≥4.5 with margin"
  that the edits should have removed?

### 5 — Fresh lens: requirement-completeness sweep (Novel)
- Walk R1–R10 once more at the *decision* level: is there any acceptance criterion the design still
  only gestures at rather than deciding (a concrete value, mechanism, or per-section call)? Examples to
  probe: R7.2 surface/elevation fully settled? R8.1 favicon set complete (the `.ico` regeneration)?
  R6.1 status `-foreground` values actually specified or hand-waved? R10.1 the responsive gate at each
  named breakpoint addressed beyond the hero?
- Is anything in-scope per the requirements/decomposition silently deferred in the "Deferred" section?

## Deliverables

Conclude with:
- **Top risks/gaps** (up to 5), each a concrete failure scenario with file/section citation, tagged
  Novel/Compounding/Recurring.
- **Top conclusions to challenge or reverse** (up to 3), with reasoning.
- **What's missing** before build — or, if nothing material remains, say so plainly.

Be specific and concrete. If a dimension is clean, say so in one line and move on. Distinguish
MUST_FIX (contradiction, false codebase claim, unbuildable/incomplete mechanism, contrast/a11y hole)
from SHOULD_FIX (real gap causing rework) from MINOR (wording, a value safely left to implementation).
**MINOR-only does not justify `iterate`** — if the only remaining items are MINOR/wording, the honest
verdict is `converged`.

After the analysis, **update the rolling memory file** at
`.spec-workflow/specs/visual-design/reviews/adversarial-memory-design.md` per the methodology format.

Write your analysis to:
`/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/visual-design/reviews/adversarial-analysis-design-r3.md`

End the analysis with EXACTLY this block (fill in the counts):

```
VERDICT: converged | iterate
MUST_FIX: <n>
SHOULD_FIX: <n>
MINOR: <n>
DESIGN_READY: yes | no
ESCALATE: none | <one-line reason a human should look now>
```
