# Adversarial Review — visual-design / Tasks (v3)

You are a senior staff engineer and release lead who ships design-system retrofits onto live
Next.js + Tailwind v4 codebases. You are reviewing **version 3** of the `visual-design` tasks
breakdown. Find every place it will cause a botched, half-migrated, or untestable implementation. Do
not validate. Praise nothing. If a section is sound, say so in one line and move on.

## What you are reviewing

- Target: `.spec-workflow/specs/visual-design/tasks.md` (v3 — the document under review)
- Ground truth you MUST read and check against:
  - `.spec-workflow/specs/visual-design/design.md` (approved design)
  - `.spec-workflow/specs/visual-design/requirements.md` (R1–R10)
  - `.spec-workflow/steering/structure.md`
  - The **actual codebase** — open the real files when you make a claim about them (`tokens.css`,
    `globals.css`, `button.tsx`, `hero-card.tsx`, `header.tsx`, `theme-provider.tsx`, `layout.tsx`,
    `next.config.ts`, `src/app/(site)/**`, `src/config/site.ts`, `package.json`, `node_modules`
    for any Tailwind-v4 / font-binary claim, and the `e2e/tests/` suite).

## Standing rules (do not skip)

- **Ground every claim in the real repository.** Open the file before asserting. Cite file/line. If
  you misstate an artifact, the finding is invalid. A task that misstates a real artifact is an
  automatic MUST_FIX.
- **No nitpick-padding.** Wording / bullet-ordering = MINOR at most and must not inflate MUST/SHOULD.
  **An empty MUST/SHOULD list is the expected, correct outcome for a v3 that has closed its v1+v2
  gaps** — if the tasks now faithfully and completely implement the design with correct atomicity and
  ordering, return `VERDICT: converged` and say so plainly. Do not invent findings to look thorough,
  and do not re-raise resolved findings to justify another round.

## Prior Review Context (r1 + r2 — read, then DON'T re-discover these)

Two prior rounds found the task list **grounding-accurate** but incomplete; **every finding was
accepted and fixed** (no rejections, no standoff). Resolved and verified:
- **r1 (coverage):** projects `[slug]` measure/test conflict; undefined card-hover (→
  `group-hover:bg-accent`); grep false-positives (→ pinned pattern); R7.1 spacing rhythm (→ folded into
  Tasks 16/17/19); contrast-tooling wording; Task 11 line cite.
- **r2 (Tailwind-v4 mechanics):** the typography plugin's `.prose { max-width: 65ch }` made 75ch
  unreachable (→ canonical `prose dark:prose-invert max-w-none max-w-measure`, measure on the `.prose`
  element for projects); Task 3 z-index namespace was `--z-*`, corrected to `--z-index-*` (the v4 `z`
  utility reads `themeKeys:["--z-index"]` — verified); About/Now/Colophon `/ kicker` added to Task 19;
  Task 14 OG font pinned to a committed binary under `public/fonts/`; two MINOR wording/arithmetic
  fixes (grep rationale; `PROSE_MAX_WIDTH` now measured ≈600px not guessed ~810px).

r2 also **cleared as FINE** (do not re-raise without a NEW concrete failure): test-suite collateral
for the header-wordmark / hero-avatar / contact-callout changes (no test asserts that markup);
`group-hover:bg-accent` legibility; reading-progress parity; reduced-motion test conflicts; the pinned
grep's reach; the phantom "mobile-nav z-40" (only `header.tsx:10` exists).

**Classify every finding** Novel / Compounding / Recurring. A **Recurring** finding (an r1/r2 issue the
v3 fix did NOT actually resolve) must quote the deficient v3 text and **escalate severity** — and note
that an issue recurring as MUST across two rounds is a standoff signal.

## Attack dimensions (tailored to v3 — pursue concretely)

### 1. Did the v3 fixes actually resolve, or just move, the problem?
- **`max-w-none max-w-measure` on the same element**: r2's fix put both utilities on the `.prose`
  element. `max-w-none` sets `max-width: none`; `max-w-measure` sets `max-width: 75ch` — **same
  property, both utilities**. In Tailwind v4 the winner is **CSS source order in the generated
  utilities layer**, not class-attribute order. Confirm whether `max-w-measure` reliably wins over
  `max-w-none` (or whether the v3 fix just swapped a plugin-vs-utility ambiguity for a
  none-vs-measure one). If it's order-dependent and unpinned, that's Compounding-Recurring on the r2
  MUST. (If it actually resolves deterministically, say so and move on.)
- **`--z-index-base: 0`**: does a `z-base` utility with value `0` collide with or duplicate the
  built-in `z-0`? Any harm? Is the `--z-index-*` namespace claim still exactly correct for the
  installed Tailwind version (it was verified once)?
- **Task 19 after Task 18 on about/now/colophon**: tasks are independent checkboxes with no enforced
  ordering. Is "apply Task 19 after Task 18 on these three files" actually safe/expressible, or does it
  hide a real merge hazard (both edit the same three files)?

### 2. Font-binary feasibility (fresh — r2 only flagged the unstable path, not the source)
- Task 4 self-hosts Fraunces via `next/font/google`; Task 14 says commit a Fraunces + Geist Mono
  binary under `public/fonts/`. Check `node_modules`: does `geist` ship a static `.ttf`/`.woff2` that
  can be copied, or only the `next/font` loader? Is Fraunces' license redistribution-OK to commit?
  Which weight(s) does the OG route need? If the task can't actually obtain a committable binary, it's
  a real gap; if it can, say where from.
- Does the OG route need any `next.config.ts` CSP change that no task names? (r2 said `img-src 'self'
  data:` already covers the rasterized PNG — re-confirm against the real CSP, and check `worker-src`/
  build-time concerns aren't in play.)

### 3. Coverage residue + Success-criteria falsifiability (final sweep)
- Re-walk the design once more for any element still unmapped after v3. Be specific or say "none."
- Are any `Success:` criteria still unfalsifiable (no observable pass/fail)? Name them.
- Is the **deferred set** (per-page OG, chart palette, i18n/RTL, CI gate upgrades) consistent with what
  the tasks actually ship — nothing silently cut, nothing double-claimed?

### 4. Grounding re-spot-check (cheap)
- Confirm v3's new/edited claims: the `--z-index-*` namespace, the `public/fonts/` non-existence, the
  `next.config.ts` CSP strings, and the projects `.prose`-element placement. Any misstatement = MUST.

## Deliverables (end with these, in order)

1. **Top risks/gaps** (as many as are real — could be zero), each a concrete failure scenario, each
   classified Novel/Compounding/Recurring.
2. **Top conclusions to challenge or reverse** (or "none").
3. **What's missing** (or "none").

Be specific and concrete. Cite file/line and design/requirement IDs. If something is fine, one line.

## Required final block (verbatim format, last lines of your file)

```
VERDICT: converged | iterate
MUST_FIX: <n>
SHOULD_FIX: <n>
MINOR: <n>
DESIGN_READY: yes | no
ESCALATE: none | <one-line reason a human should look now>
```

`MUST_FIX + SHOULD_FIX = 0` ⇒ `VERDICT: converged`. MINOR-only ⇒ still `converged`. A v3 that genuinely
closed its prior gaps SHOULD converge — say so if it did. Do not pad to justify `iterate`.

Write your complete analysis to:
`.spec-workflow/specs/visual-design/reviews/adversarial-analysis-tasks-r3.md`
