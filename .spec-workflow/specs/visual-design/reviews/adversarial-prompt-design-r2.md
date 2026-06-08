# Adversarial Review — visual-design / design.md (v2), Round 2

You are a **principal product designer and front-end architect** doing a second-pass teardown of a
visual design spec before approval. You have deep expertise in OKLCH/WCAG contrast math, Tailwind v4
(theme namespaces, `@plugin`, `@theme inline`, cascade layers), Next.js App Router (fonts, metadata,
`next/og`), and **design distinctiveness** (telling a committed identity from generic
shadcn-neutral). Find weaknesses, contradictions, false codebase claims, and unbuildable mechanisms.
Do **not** validate or praise. Attack.

**Load and apply the `frontend-design:frontend-design` skill** as the distinctiveness lens.

## Prior review context (read first, then attack the DELTAS)

Round 1 found 4 must-fix, 5 should-fix, 6 minor — **all accepted and revised into v2**. Before
attacking, read:

- The rolling memory: `.spec-workflow/specs/visual-design/reviews/adversarial-memory-design.md`
- The r1 analysis: `.spec-workflow/specs/visual-design/reviews/adversarial-analysis-design.md`

r1's resolved issues (do **not** re-litigate unless v2's fix is wrong): print-token-redeclaration,
prose `.prose` reach + markup wrap, `max-w-[75ch]` line/framing, the header-text-link-not-avatar
correction, status-tint retune, OG font-data, "one CTA per page", `--brand-visited` enumeration,
focus-ring full alpha, serif down-weight. **r1 already verified as clean (do not re-run):** the
brand/ring/foreground contrast figures, the distinctiveness verdict, structure.md placement, Fraunces
self-hosting/CSP.

Classify every finding you raise as **Novel** (new), **Compounding** (deepens a prior finding), or
**Recurring** (a prior issue v2 failed to actually fix — escalate severity). Your job this round is
to (a) verify v2's fixes are *correct, complete, and internally consistent* — a fix can introduce a
new error — and (b) bring **fresh lenses** r1 didn't apply.

## Ground every claim in the real repository

A misstated artifact is an automatic MUST_FIX. Verify against the live files before asserting:
`design.md` (target), `requirements.md`, `tokens.css`, `globals.css`, `layout.tsx`,
`theme-provider.tsx`, `button.tsx`, `next.config.ts`, `package.json`, the `(site)` pages
(`profile/page.tsx`, `about|now|colophon/page.tsx`, `blog/[slug]/page.tsx`, `projects/[slug]/page.tsx`),
`src/styles/projects.css` and `src/styles/blog/*.css`. Compute WCAG ratios yourself where v2 changed
numbers.

## Attack dimensions

### 1 — Did v2's status-value retune actually land? (recompute — Compounding)
- v2 changed `--success` dark→`0.74 0.15 150`, `--warning` light→`0.52 0.12 85` / dark→`0.76 0.13 85`,
  `--info` dark→`0.74 0.13 240`. **Recompute** `text-<role>` over `<role>/10` composited on **both
  `background` and `card`**, in **both** themes, with the tint composited the way browsers actually do
  it (sRGB-gamma over the surface). Does every cell now clear ≥4.5 with real margin, or did the retune
  miss a cell (or overshoot so the solid role no longer clears its own use)? Flag any that round under.
- Does warning at hue 85 (`0.52`/`0.76`) stay visually distinct from brand rust (hue 42/55) at the
  new lightnesses, or do they collide in light mode?

### 2 — Is the print token re-declaration COMPLETE? (Compounding — the r1 fix may be partial)
- v2 re-declares `--background/--foreground/--card/--popover/--muted/--border/--muted-foreground`
  under `@media print`. **Enumerate every token the profile route actually reads** (walk
  `profile/page.tsx` + the components it renders: any `bg-secondary`, `bg-accent`, `text-primary`,
  `border-input`, `ring`, brand link color, status colors, `--brand` on the kicker). Does the print
  override list miss any token that would still resolve **dark** on paper (e.g. `--secondary`,
  `--accent`, `--input`, `--primary`, `--ring`, `--brand`)? A partial list still prints dark patches —
  that's the same R8.5 failure, not fixed. Also: does forcing `--brand`/kicker to a dark ink read on
  white, or does the rust kicker vanish/clash in print?

### 3 — Does wrapping four bodies in `.prose` collide with anything? (Novel)
- v2 adds `prose max-w-measure` to profile/about/now/colophon and themes `@tailwindcss/typography`.
  Stress-test collisions: does `projects.css` (wide-media escape in `.prose`) or any `blog/*.css`
  slice assume `.prose` only on blog/projects? Does adding `.prose` to the **profile** change the
  contact-form/headshot layout (the form is inside the article today)? Does `dark:prose-invert`
  need adding to the four new wrappers, or will themed `--tw-prose-*` handle dark — and is the
  `--tw-prose-invert-*` set themed too, or only the light set (dark prose body could fall back to
  plugin defaults)?
- Is `max-w-measure` even a real Tailwind v4 utility? Verify that `--container-measure: 75ch` in
  `@theme` generates `max-w-measure` (the `--container-*` namespace), not something else. If the
  utility name is wrong, the measure silently doesn't apply.

### 4 — `@theme inline` wiring + token mechanics (Novel)
- The Data Models block lists new `--color-*` mappings. Cross-check that **every** new role the design
  uses as a utility (`bg-brand`, `text-brand`, `text-brand-visited`, `bg-success/10 text-success`,
  `ring-ring`, `bg-warning/10`, etc.) has a corresponding `@theme inline` `--color-*` entry — miss one
  and the utility resolves to nothing (the exact failure design-system.md warns about with
  unmapped roles). Is `--brand-visited` mapped? Are the status `-foreground` variants mapped?
- `--ring` → `var(--brand)`: `globals.css` maps `--color-ring: var(--ring)`. Confirm the indirection
  chain (`--color-ring`→`--ring`→`--brand`) actually resolves, and that nothing else depends on the
  old neutral ring.

### 5 — Distinctiveness, responsive, and scope honesty (Novel + frontend-design lens)
- Through the frontend-design lens: after down-weighting the serif, is the identity *still* committed,
  or did the rationale hedge itself into "tasteful but generic"? Is the rust+mono-`/`+hairline system
  actually load-bearing enough to pass R3.6 on its own?
- **Responsive:** the hero display step is `text-6xl` (3.75rem) serif. On a 360px phone does the serif
  display name / wordmark overflow or wrap badly? Does the design specify the hero's mobile behavior,
  or only the desktop step?
- **Scope/sequencing:** the v2 "atomic prose-migration" + "Button CVA edits" + "header→wordmark" —
  are these honestly landable without a broken intermediate, or does the design under-specify the
  ordering across the eight sections? Surface any in-scope item silently deferred.

## Deliverables

Conclude with:
- **Top 5 risks/gaps**, each a concrete failure scenario with file/section citations, each tagged
  Novel/Compounding/Recurring.
- **Top 3 conclusions to challenge or reverse**, with reasoning.
- **What's missing** before this design can be built.

Be specific and concrete. If a dimension is genuinely clean, say so in one line and move on — a clean
round is a valid result; do **not** manufacture findings to keep the loop alive. Distinguish MUST_FIX
(contradiction, false codebase claim, unbuildable/incomplete mechanism, a contrast/a11y hole) from
SHOULD_FIX (a real gap causing rework) from MINOR (wording, a value safely left to implementation).

After the analysis, **update the rolling memory file** at
`.spec-workflow/specs/visual-design/reviews/adversarial-memory-design.md` per the methodology format
(cumulative Accepted/Partially/Rejected/Unresolved, patterns, guidance for the next review).

Write your analysis to:
`/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/visual-design/reviews/adversarial-analysis-design-r2.md`

End the analysis with EXACTLY this block (fill in the counts):

```
VERDICT: converged | iterate
MUST_FIX: <n>
SHOULD_FIX: <n>
MINOR: <n>
DESIGN_READY: yes | no
ESCALATE: none | <one-line reason a human should look now>
```
