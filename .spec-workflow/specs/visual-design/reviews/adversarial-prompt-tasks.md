# Adversarial Review — visual-design / Tasks (v1)

You are a senior staff engineer and release lead who has shipped many design-system retrofits onto
live Next.js + Tailwind v4 codebases. You are reviewing the **tasks breakdown** for the
`visual-design` spec. Your job is to **tear it apart**: find every place the task list will cause a
botched, half-migrated, or untestable implementation. You are not here to validate it. Praise nothing.
If a section is genuinely sound, say so in one line and move on — spend your effort on what breaks.

## What you are reviewing

- Target: `.spec-workflow/specs/visual-design/tasks.md` (the document under review)
- Ground truth you MUST read and check against:
  - `.spec-workflow/specs/visual-design/design.md` (the approved design these tasks must implement)
  - `.spec-workflow/specs/visual-design/requirements.md` (R1–R10 + ACs the tasks must cover)
  - `.spec-workflow/steering/structure.md` (file/naming/module conventions)
  - The **actual codebase** — open the real files the tasks name (`src/styles/tokens.css`,
    `src/styles/globals.css`, `src/components/ui/button.tsx`, `src/components/layout/header.tsx`,
    `src/components/layout/theme-provider.tsx`, `src/app/layout.tsx`, `src/app/(site)/**`,
    `src/styles/blog/reading-progress.css`, `src/config/site.ts`, `package.json`, the `e2e/` tests).

## Standing rules for this review (do not skip)

- **Ground every claim in the real repository.** Before asserting a task is wrong, missing, or
  misordered, open the file and confirm. If you assert the tasks misstate an artifact (a path,
  a line, an existing class, a dependency) you MUST cite the file/line — and if you misstate the
  artifact yourself, that invalidates the finding. A task that misstates a real artifact is an
  automatic MUST_FIX.
- **No nitpick-padding.** Wording, ordering-of-bullets, or "could add more detail" preferences are
  MINOR at most and must not inflate the MUST/SHOULD counts. Do not invent findings to look thorough.
  An empty MUST/SHOULD list is a legitimate outcome — if the tasks faithfully and completely
  implement the design with correct atomicity and ordering, return `VERDICT: converged`.
- **Attack coverage and ordering first** — that is where task lists actually fail. A "nice idea" that
  isn't in the design is scope creep, not a finding.

## Attack dimensions (tailored — pursue these concretely)

### 1. Design → task coverage (the highest-value attack)
Walk the design section by section and find anything with **no task that implements it**:
- The **spacing rhythm** (design §4: page gutter `px-4 sm:px-6 lg:px-8`, section `py-16 md:py-24`,
  hero `pt-20 md:pt-28`, intra-section `space-y-*`). Is there ANY task that applies the spacing
  system across sections, or does the task list silently drop R7.1?
- **Surfaces** (design §4: flat/hairline, `border-border` + tint, the `--radius` dial, the single
  Radix-overlay shadow exception). Which task applies this? Or is it assumed?
- The `--muted-foreground` tuning the design §1 matrix relies on (L0.5/0.74) — is it already in
  `tokens.css` (check), or does it need a task? If a matrix cell depends on a value no task sets,
  that's a gap.
- `AvatarPlaceholder` retained as the **profile headshot fallback** (design Code Reuse / §5) — does
  any task preserve/verify that, or does Task 16 just delete it from the hero and leave the profile
  fallback untracked?
- The **z-index consumers** (header `z-40`, mobile nav `z-40`) — Task 3 adds the scale and Task 15
  "if not done in Task 3" swaps the header; is the **mobile nav** consumer ever rewired, or orphaned?
- `forced-colors` behavior (design Error Handling Scenario 5) and the reduced-motion generalization —
  covered by a task or assumed?
- Map each requirement R1–R10 (and notable ACs) to at least one task. Name any AC with no task.

### 2. Atomicity and file-collision hazards
- Tasks 1, 2, 3 **all edit the same two files** (`tokens.css` + `globals.css`); Tasks 4 and 5 also
  edit `globals.css`. Is that a sequencing/merge hazard, or fine because they're ordered and additive?
  Decide and say which — don't hand-wave.
- Task 18 (atomic prose-migration) touches **6 files + tests**; Task 19 touches **6 page files**. Are
  these too large to be atomic, or correctly grouped (Task 18 explicitly argues it must be atomic —
  is that argument valid)? If Task 19 should be split per-section, say why concretely.
- Any task that bundles unrelated concerns under one checkbox?

### 3. Ordering / dependency edges
- The phase headers claim "blocked by Phase N", but check **per-task** edges the phase grouping hides:
  - Task 16 (landing hero) needs Wordmark (T6), SectionKicker (T7), brand tokens (T1) and the
    tokenized card-hover convention — is that convention defined anywhere a task can consume?
  - Task 9 (StatusCallout) needs status roles (T2) — same phase ordering, ok?
  - Task 18 needs the themed `.prose` (T5) and `max-w-measure` (T3) — both prior phases, ok?
  - Task 17 (profile CTA) needs the Button brand variant (T8) — T8 is Phase 3, T17 is Phase 5, ok.
  - Does Task 16 remove `AvatarPlaceholder` from the hero before/while the profile still imports it?
- Is there any forward reference (a task consuming something a later task creates)?

### 4. Completion criteria — testable and honest?
- Are the `Success:` criteria concrete and machine- or eye-verifiable, or vague ("looks good")?
- The contrast tasks (1, 2, 21) lean on "verify against the contrast tooling" — is that tool actually
  available/named, or is the criterion unverifiable as written?
- Task 22's R1.2 grep gate: the design scopes the gate to one-off **color/font-size/spacing**
  (`text-[..]`, `bg-[#..]`, `p-[..]`). The repo contains other arbitrary values (`min-h-[300vh]`,
  `min-h-[28rem]`, Radix `min-w-[8rem]` in `ui/`). Will the grep as a task would naturally write it
  produce false failures, and does the task scope the grep correctly to avoid that?
- Task 23 (visual review) is subjective — is its pass/fail bar (R3.6 distinctiveness) stated
  concretely enough to act on?

### 5. Grounding accuracy (verify the tasks didn't misstate the repo)
Spot-check the task file references against the actual code:
- `header.tsx:12-14` is a text link to `siteConfig.name` (Task 15) — true?
- `button.tsx` has `focus-visible:ring-ring/50` and a `link` variant `text-primary` (Task 8) — true?
- `reading-progress.css` lines 11-17 carry the blue `oklch(...240)` fill (Task 11) — true?
- `site.ts:42` has `ogImage: "/images/og-default.png"` and the file is absent (Task 14) — true?
- `blog/[slug]/page.tsx:143` has the only `max-w-[75ch]` and `prose-lg` (Task 18) — true?
- `@tailwindcss/typography` is genuinely absent from `package.json` (Task 5) — true?
Any misstatement here is an automatic MUST_FIX (cite the file/line).

## Deliverables (end your analysis with these, in this order)

1. **Top 5 risks/gaps**, each with a concrete failure scenario ("if implemented as written, X breaks
   because Y") — not abstract risk.
2. **Top 3 conclusions to challenge or reverse**, with specific reasoning.
3. **What's missing** — design elements or requirement ACs with no task, listed explicitly.
4. For each finding, classify severity; since this is the first tasks review, mark novelty "Novel".

Be specific and concrete. Cite file/line and design-section/requirement IDs. If something is fine,
say so in one line.

## Required final block (verbatim format, last lines of your file)

```
VERDICT: converged | iterate
MUST_FIX: <n>     # a task that misstates the codebase, contradicts the design, is unimplementable, or leaves a required design element/AC with no task
SHOULD_FIX: <n>   # a real gap causing rework or a wrong implementation (bad atomicity, missing dependency edge, untestable success criterion)
MINOR: <n>        # wording, ordering-of-bullets, nice-to-have
DESIGN_READY: yes | no   # (for tasks: are these tasks ready to hand to implementers?)
ESCALATE: none | <one-line reason a human should look now>
```

`MUST_FIX + SHOULD_FIX = 0` with the coverage and grounding checks passed ⇒ `VERDICT: converged`.
MINOR-only ⇒ still `converged`. Do not pad to justify `iterate`.

Write your complete analysis to:
`.spec-workflow/specs/visual-design/reviews/adversarial-analysis-tasks.md`
