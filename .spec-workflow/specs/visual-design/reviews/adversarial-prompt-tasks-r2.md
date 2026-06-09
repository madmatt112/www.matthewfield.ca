# Adversarial Review — visual-design / Tasks (v2)

You are a senior staff engineer and release lead who ships design-system retrofits onto live
Next.js + Tailwind v4 codebases. You are reviewing **version 2** of the `visual-design` tasks
breakdown. Your job is to **tear it apart** — find every place it will cause a botched, half-migrated,
or untestable implementation. Do not validate. Praise nothing. If a section is sound, say so in one
line and move on; spend your effort on what breaks.

## What you are reviewing

- Target: `.spec-workflow/specs/visual-design/tasks.md` (v2 — the document under review)
- Ground truth you MUST read and check against:
  - `.spec-workflow/specs/visual-design/design.md` (approved design these tasks must implement)
  - `.spec-workflow/specs/visual-design/requirements.md` (R1–R10 + ACs)
  - `.spec-workflow/steering/structure.md` (conventions)
  - The **actual codebase** — open the real files: `src/styles/tokens.css`, `src/styles/globals.css`,
    `src/components/ui/button.tsx`, `src/components/shared/hero-card.tsx`,
    `src/components/layout/header.tsx`, `src/components/layout/theme-provider.tsx`,
    `src/app/layout.tsx`, `src/app/(site)/**` (esp. `projects/[slug]/page.tsx`, `page.tsx`,
    `profile/page.tsx`), `src/config/site.ts`, `package.json`, and the `e2e/tests/` suite (esp.
    `projects-detail-layout.test.ts`, `landing*.test.ts`, any contact/header test).

## Standing rules (do not skip)

- **Ground every claim in the real repository.** Before asserting a task is wrong/missing/misordered,
  open the file and confirm. If you assert the tasks misstate an artifact you MUST cite file/line —
  and if you misstate it yourself, the finding is invalid. A task that misstates a real artifact is an
  automatic MUST_FIX.
- **No nitpick-padding.** Wording / bullet-ordering / "could add detail" = MINOR at most and must not
  inflate MUST/SHOULD. An empty MUST/SHOULD list is a legitimate, expected outcome for a v2 that fixed
  its v1 gaps — if the tasks now faithfully and completely implement the design with correct
  atomicity and ordering, return `VERDICT: converged`. Do not invent findings to look thorough.

## Prior Review Context (r1 — read, then DON'T re-discover these)

r1 found the v1 task list **well-grounded** (every artifact reference accurate) with 1 MUST + 4 SHOULD
+ 1 MINOR, **all accepted and fixed in v2**:
1. Task 18 projects `[slug]` measure conflict (existing `max-w-prose` wrapper at `:86` + the
   `projects-detail-layout.test.ts` `PROSE_MAX_WIDTH=700` assertion vs 75ch) — v2 rewrote Task 18.
2. Undefined card-hover convention — v2 defined `group-hover:bg-accent` in Task 16.
3. Task 22 grep false-positives on `min-h-[…]` — v2 pinned the grep pattern.
4. R7.1 named spacing rhythm had no task — v2 folded it into Tasks 16/17/19.
5. Tasks 1/2 "contrast tooling" unnamed — v2 reworded to the design §1 figures.
6. Task 11 line cite (12 & 17) — fixed.

r1 also confirmed the design's "mobile-nav z-40 consumer" **does not exist** (`grep -rn z-40 src/` →
only `header.tsx:10`); the tasks are correct to swap only the header. **Do not raise this as a gap.**

**Classify every finding you raise** as one of:
- **Novel** — not identified in r1.
- **Compounding** — builds on/deepens an r1 finding.
- **Recurring** — an r1 issue the v2 fix did NOT actually resolve (escalate severity, and say exactly
  why the v2 fix is insufficient, citing the v2 text).

Do not re-litigate the six resolved findings unless the v2 fix is **wrong or incomplete** — in which
case it is Recurring and you must quote the deficient v2 text.

## Attack dimensions (tailored to v2 — pursue concretely)

### 1. Did the v2 fixes actually work? (verify each delta against the repo)
- **Task 18 projects fix**: v2 says replace the outer `max-w-prose` wrapper (`projects/[slug]:86`)
  with `max-w-measure` and bump `PROSE_MAX_WIDTH` from 700 to "~810px (75ch)". Open the file: the
  measure today is on the **outer** `<div class="mx-auto max-w-prose mt-8">` while `.prose` is on the
  **inner** div. Does moving `max-w-measure` to the outer wrapper actually constrain the prose, or
  must it sit on the `.prose` element? Is ~810px the correct 75ch pixel width given the prose
  font-size (the test measures the `<p>` box)? If the number is wrong the test will still fail — check
  the arithmetic the v2 task hand-waves.
- **`group-hover:bg-accent`**: is shadcn `accent` a legible hover tint in BOTH themes (it is a neutral
  surface role)? Does dropping the `/40` alpha materially change the intended look (design said "no
  logic change")? Is `bg-accent` even reachable on the HeroCard given its current
  `border-foreground/20 group-hover:bg-accent/40` (hero-card.tsx:17) markup?
- **Pinned grep**: does the v2 pattern (`text-\[`, `bg-\[#`, `[pm][xytrbl]?-\[`) miss any real
  color/font one-offs the design's R1.2 actually wants caught (e.g. `font-[`, `text-[#` color vs
  `text-[1.2rem]` size, `gap-[`), or over-exclude? Is `bg-\[#` too narrow (misses `bg-[rgb(...)]` /
  `bg-[var(...)]` / `bg-[oklch(...)]`)?
- **Spacing rhythm fold**: Tasks 16/17/19 now name `px-4 sm:px-6 lg:px-8` + `py-16 md:py-24`. Does
  this collide with Task 18 (which also edits `profile/page.tsx`)? Two tasks editing the same file in
  the same phase ordering — is that a sequencing hazard now, where r1 said the token tasks were safe
  because additive?

### 2. Test-suite collateral (fresh lens — r1 only caught the projects test)
- Open the e2e suite and Vitest tests. Beyond `projects-detail-layout.test.ts`, which **other** tests
  assert markup the tasks change? Specifically: does any test assert the header brand **text**
  (`siteConfig.name`) that Task 15 replaces with `<Wordmark/>`? Does `landing*.test.ts` assert the
  hero `AvatarPlaceholder`/avatar that Task 16 removes? Does a contact test assert the current
  feedback markup that Task 9 (StatusCallout) changes? Name each test file + assertion that a task
  must update but currently does not call out. (The design Error-Handling §6 claims "no test asserts
  the literal MF / hero avatar markup" — verify that claim against the actual test files; if it's
  wrong, that's a Novel MUST/SHOULD.)

### 3. Build-stays-green-between-phases + runtime feasibility (fresh lens)
- Do any tasks reference brand/status utilities (`text-brand`, `bg-success/10`) **before** Task 1/2
  land? Walk the phase order: can the repo build and the suite stay green at each phase boundary, or
  is there a window where a component references a utility that isn't mapped yet?
- **Task 14 OG font loading**: it says read the Fraunces/Geist Mono binary "from the `.next`/
  node_modules asset or a copy under `public/fonts/`". Is that path real and stable for `next/og`
  `ImageResponse` at build, or is it a hand-wave that will fail (next/font hashes filenames; the
  binary may not be at a predictable path)? Is the `img-src 'self' data:` CSP claim consistent with
  the repo's actual CSP in `next.config.ts`?
- **Task 4 Fraunces**: is `next/font/google` self-hosting actually CSP-clean given the repo's real
  `font-src` policy? Open `next.config.ts` and check.

### 4. Coverage residue (anything still unmapped after v2)
- Re-walk the design for any element still with no task (the print.css `--radius`/surfaces, the
  `disableTransitionOnChange` test assertion, the OG `twitter-image`, the `--muted-foreground`
  dependency). Name any AC R1–R10 still wholly unaddressed in v2.

### 5. Grounding re-spot-check (cheap, do it)
- Confirm the v2-edited references: `hero-card.tsx:17` hover, `projects/[slug]/page.tsx:86`+`:87`
  wrapper structure, `projects-detail-layout.test.ts:49` `PROSE_MAX_WIDTH`, landing/profile `:15`/`:24`
  `px-4 py-12 sm:py-16`. Any misstatement = automatic MUST_FIX (cite file/line).

## Deliverables (end your analysis with these, in order)

1. **Top 5 risks/gaps** (fewer if that's honest), each a concrete failure scenario ("if implemented
   as written, X breaks because Y") — not abstract risk. Classify each Novel/Compounding/Recurring.
2. **Top 3 conclusions to challenge or reverse**, with specific reasoning.
3. **What's missing** — design elements / ACs with no task, listed explicitly (or "none").

Be specific and concrete. Cite file/line and design-section/requirement IDs. If something is fine,
say so in one line.

## Required final block (verbatim format, last lines of your file)

```
VERDICT: converged | iterate
MUST_FIX: <n>     # misstates the codebase, contradicts the design, unimplementable, or a required design element/AC with no task
SHOULD_FIX: <n>   # real gap causing rework or a wrong implementation (bad atomicity, missing dependency edge, untestable success criterion)
MINOR: <n>        # wording, bullet-ordering, nice-to-have
DESIGN_READY: yes | no   # are these tasks ready to hand to implementers?
ESCALATE: none | <one-line reason a human should look now>
```

`MUST_FIX + SHOULD_FIX = 0` ⇒ `VERDICT: converged`. MINOR-only ⇒ still `converged`. Do not pad to
justify `iterate`. A v2 that genuinely closed its v1 gaps SHOULD converge — say so if it did.

Write your complete analysis to:
`.spec-workflow/specs/visual-design/reviews/adversarial-analysis-tasks-r2.md`
