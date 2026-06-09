# Adversarial Review — visual-design / Tasks (v1)

Reviewer: senior staff engineer / release lead. Target under review:
`.spec-workflow/specs/visual-design/tasks.md` (v1, 23 tasks / 6 phases). Checked against `design.md`
(v3 converged), `requirements.md` (v4, R1–R10), `structure.md`, and the live repo.

Bottom line up front: the task list is grounded well — every spot-checked artifact reference is
**accurate** — and the design→task coverage is largely complete. The failures are concentrated in
**two real ordering/atomicity gaps around the projects `[slug]` prose body** (an existing layout
test + an existing competing measure wrapper the tasks do not mention) and **one under-scoped grep
gate** that will false-fail as written. Everything else is sound or MINOR.

---

## 1. Grounding accuracy (dimension 5) — the tasks did NOT misstate the repo

Every artifact reference the prompt asked me to spot-check is **correct**:

- `header.tsx:12-14` is a text link rendering `siteConfig.name` — **true** (`header.tsx:12-14`,
  `<Link href="/" className="text-base font-semibold tracking-tight">{siteConfig.name}</Link>`).
- `button.tsx` has `focus-visible:ring-ring/50` (line 8, in the shared CVA base string) and a
  `link` variant `text-primary` (line 19) — **true**.
- `reading-progress.css` carries the blue `oklch(...240)` fill — **true** (`:root` fill
  `oklch(0.55 0.2 240)` at line 12; `.dark` `oklch(0.7 0.16 240)` at line 17). Task 11 cites
  "lines 11-17"; the actual declarations are 12 and 17 — a one-line-off label on the `:root`
  selector start, not a misstatement of the artifact. MINOR at most.
- `site.ts:42` has `ogImage: "/images/og-default.png"` and `public/images/og-default.png` is
  **absent** — **true** (line 42 confirmed; `ls public/images` shows no such file; `layout.tsx:25`
  also consumes it via `openGraph.images`, which Task 14 implicitly fixes by repointing).
- `blog/[slug]/page.tsx:143` carries the only `max-w-[75ch]` and `prose-lg` — **true** (line 143:
  `prose prose-lg dark:prose-invert max-w-[75ch] mt-8`; it is the only `max-w-[75ch]` in `(site)`).
- `@tailwindcss/typography` is absent from `package.json` — **true** (0 matches).
- `AvatarPlaceholder` renders in the **hero** (`page.tsx:17`) and as the **profile headshot
  fallback** (`profile/page.tsx:38`, in the `: (...)` branch when `profile.headshot` is falsy),
  **not** in the header — **true**, matching Task 16's "retained only as the profile fallback."
- `layout.tsx:2-15` Geist `next/font` setup, `theme-provider.tsx` spreads `{...props}`,
  `<html suppressHydrationWarning>` already present — all **true** (Tasks 4, 10).

No automatic-MUST_FIX grounding error found. This is a well-grounded task list.

---

## 2. Design → task coverage (dimension 1) — mostly complete, two soft spots

Walking the design section by section:

- **Brand/status/measure/z tokens** (design §1, §4 Data Models): Tasks 1, 2, 3 — covered, with the
  exact OKLCH values and the `--muted-foreground` already tuned (`tokens.css:25` L0.5 / `:66` L0.74)
  so the §1 matrix cell that depends on it needs no new task. Correct — no gap.
- **Spacing rhythm (R7.1)** (design §4: `px-4 sm:px-6 lg:px-8`, `py-16 md:py-24`, hero
  `pt-20 md:pt-28`, `space-y-*`): **partial gap.** No task adds a spacing-rhythm token or a single
  task that applies the gutter/section-rhythm system across sections. Tasks 16/17/19 re-style
  sections and *will* touch spacing, but none names the `px-4 sm:px-6 lg:px-8` / `py-16 md:py-24`
  rhythm as the thing to apply, and the current pages use `px-4 py-12 sm:py-16` (landing/profile) —
  i.e. the design's named rhythm is **not** what ships today. R7.1 is only implicitly covered. See
  SHOULD #2.
- **Surfaces — flat/hairline + `--radius` dial + single Radix shadow** (design §4): no dedicated
  task; assumed to already hold (the header `border-b` and HeroCard border are flat today). Since
  the design explicitly says this "matches the current near-flat" state and is "applied uniformly,"
  no migration is actually required — acceptable as an assumed-invariant, but the visual-review
  Task 23 is the only place it is checked. Acceptable (MINOR).
- **`AvatarPlaceholder` retained as profile fallback** (design Code Reuse / §5): Task 16's restriction
  says "AvatarPlaceholder is retained only as the profile headshot fallback elsewhere — remove it
  from the hero." Grounded and correct (`profile/page.tsx:38` keeps it). No orphaning. Good.
- **z-index consumers**: Task 3 adds the scale; Task 15 swaps the header `z-40`. The prompt (and
  design §4) claim a **mobile-nav `z-40` consumer** — **this does not exist.** `grep -rn z-40 src/`
  returns exactly one hit: `header.tsx:10`. `nav.tsx` has no z-index. So there is **no orphaned
  mobile-nav consumer**; Task 15 rewires the sole consumer. The *design* misstates the consumer
  count, but the *tasks* are correct (they only commit to the header swap). Not a task finding;
  noted so the reviewer does not raise a phantom gap.
- **`forced-colors` (Error Scenario 5) + reduced-motion generalization**: reduced-motion is covered
  by Task 10 (global `prefers-reduced-motion` rule). `forced-colors` is **assumed** (the design
  argues no rule suppresses the outline, so nothing to do) — no task, which is correct because the
  design's handling is "add no suppressing rule," i.e. a non-action. Acceptable.
- **Requirement → task map (R1–R10):** R1→3,18,22,23; R2→1,8,11; R3→6,7,16,23; R4→3,4,5,18;
  R5→1,2,8,21; R6→2,9,20; R7→3,10 (+§4 spacing soft, see SHOULD #2); R8→6,12,13,14,15,16,17;
  R9→15,16,17,18,19,22; R10→10,20,21,22,23. Every requirement has ≥1 task. No AC is wholly
  unaddressed; the only thin coverage is **R7.1 spacing rhythm** (no task names the rhythm).

---

## 3. Atomicity & file-collision (dimension 2)

- **Tasks 1/2/3 + 4/5 all editing `tokens.css`/`globals.css`:** fine. They are ordered and purely
  **additive** (new token roles, new `@theme` mappings, new `@plugin`/font registration). Tasks 1
  and 2 append matched pairs; Task 3/4/5 append `@theme` entries / a `@plugin` line. The
  `@theme inline` block (`globals.css:47-83`) and `tokens.css` `:root`/`.dark` blocks have no
  overlapping edited lines across these tasks. Sequenced single-stream execution = no merge hazard.
  Not a finding.
- **Task 18 (6 files + tests) atomic:** the argument ("site never mid-migration with a mixed
  measure / a surviving arbitrary value") is **valid** — R1.2's grep gate and R1's coherence both
  fail under a partial migration, so the six prose bodies + the `max-w-[75ch]` swap genuinely must
  land together. Correctly grouped. (But it hides a dependency bug — see MUST #1.)
- **Task 19 (6 page files):** correctly grouped as "codify + apply the same kicker/links/serif
  recipe" — one homogeneous change repeated per file, not 6 unrelated concerns. Splitting per-section
  would add ceremony without reducing risk. Fine as one task.
- **Bundled-concerns check:** Task 14 bundles "add OG route" + "remove dangling `site.ts:42` ref" —
  related (the ref *is* the OG default), correctly paired. No task bundles unrelated concerns.

---

## 4. Ordering / dependency edges (dimension 3)

- Task 16 hero needs Wordmark (T6 ✓ Phase 3), SectionKicker (T7 ✓), brand tokens (T1 ✓ Phase 1) —
  ordered correctly. **But the "tokenized card-hover convention"** that Task 16 tells the
  implementer to re-point HeroCard's `bg-accent/40` to is **never defined by any task.** The design
  (Code Reuse) says "re-pointed from `bg-accent/40` to the tokenized hover convention (no logic
  change)" but neither the design nor any task says *what* that convention resolves to (a token? a
  utility? `bg-muted`?). Task 16 consumes a convention that does not exist. See SHOULD #1.
- Task 9 (StatusCallout) needs status roles (T2 Phase 1) — ordered ✓.
- Task 18 needs themed `.prose` (T5 Phase 2) + `max-w-measure` (T3 Phase 1) — both prior ✓.
- Task 17 (profile brand CTA) needs Button brand variant (T8 Phase 3); T17 is Phase 5 — ✓.
- Task 16 removing `AvatarPlaceholder` from the hero does not touch the profile import (separate
  file) — no cross-file orphaning. ✓.
- **Forward-reference scan:** none found — every consumed artifact is created in an equal-or-earlier
  phase, *except* the undefined card-hover convention (SHOULD #1) which is consumed by nobody-defines.

---

## 5. Completion criteria — testable & honest? (dimension 4)

- Most `Success:` lines are concrete and verifiable (utilities resolve / build clean / E2E green /
  specific ratio). Good.
- **Contrast tooling (Tasks 1, 2, 21):** the repo has `@axe-core/playwright` (`package.json:37`,
  used in `e2e/tests/blog-axe.test.ts`) — that is the runtime axe gate Task 21 leans on, and it is
  real. **But** Tasks 1 and 2 ask the implementer to "verify ... against the contrast tooling" for
  raw OKLCH token pairs (link ≥4.5, ring ≥3, status ≥4.6 over a composited `/10` tint) **before any
  DOM exists** — axe only runs against rendered pages. There is **no standalone OKLCH/contrast
  calculator named or present** in the repo. The criterion is satisfiable (the design already did
  the math and lists the figures), but "the contrast tooling" is unnamed and not a thing that exists
  for token-level pre-verification. SHOULD #3 (downgradeable to MINOR — the figures are in the
  design, so the implementer can copy them; it is the *wording* that overpromises a tool).
- **Task 22 R1.2 grep gate:** as written it says "no arbitrary color/font-size/spacing values
  (`text-[..]`, `bg-[#..]`, `p-[..]`) in `(site)`." The **parenthetical pattern is safe**, but the
  **prose claim ("…spacing values") is broader than the pattern** and the repo contains arbitrary
  *spacing* values inside `(site)` and in shared components rendered by `(site)`:
  - `src/app/(site)/blog/component-preview/registry/reading-progress.tsx:5,16` → `min-h-[300vh]`
    (this **is** a real `(site)` route — `component-preview/[name]/page.tsx` exists);
  - `src/components/shared/contact-form.tsx:233` → `min-h-[28rem]`; `:299,:322,:345` →
    `min-h-[1.25rem]` (rendered on `/profile` and `/contact`).
  If the implementer writes the grep to its prose intent ("arbitrary spacing"), it **false-fails** on
  five legitimate layout values the spec never scoped for removal. The task does say "the grep
  targets one-off color/font-size/spacing (not Radix sizing tokens in ui/)" — but these five are
  **not in `ui/`** and are not color/font; the exclusion the task names does not cover them. The
  grep must be pinned to the exact narrow triple (and ideally `bg-[#`, `text-[`, `p[xytrbl]?-[`),
  not "spacing" generally. SHOULD #4.
- **Task 23 distinctiveness bar:** the pass/fail condition is stated concretely enough to act on
  ("cannot be told apart from stock shadcn-neutral = FAIL; must show serif name + `mf/` mark + rust
  `/` kicker + hairline surfaces") plus Lighthouse ≥90 and theme parity. Subjective but bounded —
  acceptable.

---

## TOP 5 RISKS / GAPS (concrete failure scenarios)

1. **[MUST] Task 18 will break `projects-detail-layout.test.ts` and/or fight an existing measure
   wrapper — and the task does not name either.** Today `projects/[slug]/page.tsx:86-88` is
   `<div class="mx-auto max-w-prose mt-8"><div class="prose dark:prose-invert">…`. The existing E2E
   `e2e/tests/projects-detail-layout.test.ts:49` asserts the prose `<p>` width is
   `≤ 700 + 20 = 720px`, with the comment *"Tailwind `max-w-prose` ~ 65ch ≈ 700px."* Task 18 says
   "Projects `[slug]`: confirm `prose dark:prose-invert` + add `max-w-measure`" — but
   `max-w-measure` is **75ch (≈810px)**. *If implemented as written:* (a) the implementer adds
   `max-w-measure` to the inner `.prose` while the outer `max-w-prose` (65ch) survives → the narrower
   65ch wins and the design's "all six routes at 75ch" silently fails on projects; **or** (b) the
   implementer replaces `max-w-prose` with `max-w-measure` (75ch) → the `<p>` renders ~810px and the
   `≤720px` assertion **fails the suite** (a hard R9.4 regression). Task 18 names "affected tests"
   generically but never cites this test or its `PROSE_MAX_WIDTH = 700` constant, and never
   acknowledges the pre-existing `max-w-prose` wrapper at all. This is a missing-dependency-edge +
   misstated-current-state combination that guarantees rework or a broken gate.

2. **[SHOULD] The "tokenized card-hover convention" Task 16 consumes is defined nowhere.** Task 16
   (and design Code Reuse) tells the implementer to re-point HeroCard's `bg-accent/40` hover to "the
   tokenized hover convention," but no task or design section says what that convention *is*
   (`bg-accent`? `bg-muted`? a new token?). *If implemented as written:* each implementer invents a
   different value, defeating the single-source-of-truth goal, and there is no `Success:` criterion
   to check it against. Needs a named target before hand-off.

3. **[SHOULD] Task 22's grep gate false-fails as written.** (Detailed in §5.) The prose says
   "spacing values" but `min-h-[300vh]` (a `(site)` route), `min-h-[28rem]`, and 3× `min-h-[1.25rem]`
   (contact-form, rendered on `/profile` + `/contact`) are legitimate and out of the spec's removal
   scope. *If implemented as written* to its prose intent, the release gate fails on five values the
   redesign was never meant to touch. Must pin the grep to the exact narrow color/font/`p-[` triple.

4. **[SHOULD] R7.1 spacing rhythm has no implementing task.** The design §4 fixes a named rhythm
   (`px-4 sm:px-6 lg:px-8`, `py-16 md:py-24`, hero `pt-20 md:pt-28`) that differs from what ships
   today (landing/profile use `px-4 py-12 sm:py-16`). No task applies this rhythm; Tasks 16/17/19
   re-style but never name the gutter/section-rhythm change. *If implemented as written:* the
   spacing rhythm R7.1 fixes never lands, and Task 23's subjective review is the only thing that
   might catch it — too late and too vague.

5. **[SHOULD] Tasks 1/2 lean on a token-level "contrast tooling" that does not exist.** (Detailed in
   §5.) axe (`@axe-core/playwright`) is real but only verifies rendered DOM (Task 21's job). For the
   pre-DOM OKLCH pair verification in Tasks 1/2 there is no named/available calculator; the criterion
   is met only because the design already lists the figures. The wording overpromises a tool — at
   minimum say "confirm against the design §1 pre-computed figures; the rendered-DOM axe check is
   Task 21."

---

## TOP 3 CONCLUSIONS TO CHALLENGE / REVERSE

1. **"Task 18 just needs `max-w-measure` added to projects `[slug]`."** Reverse: it must first
   **resolve the existing `max-w-prose` wrapper** (`projects/[slug]/page.tsx:86`) and **update
   `projects-detail-layout.test.ts`'s `PROSE_MAX_WIDTH = 700` constant** to the 75ch target (or
   explicitly justify keeping 65ch on projects, which then contradicts the design's "all six at
   75ch"). Pick one and name it in the task.

2. **"The mobile-nav `z-40` is an orphaned z-index consumer the tasks must rewire" (per the design
   §4 / the review prompt).** Reverse: there **is no mobile-nav `z-40`** in the repo (`grep -rn z-40
   src/` → only `header.tsx:10`). The tasks are correct to swap only the header. The *design*
   over-claims the consumer set; the tasks should not be made to chase a phantom. (No task change
   needed — flagged so a reviewer doesn't add a spurious task.)

3. **"Task 22's existing scoping note ('not Radix sizing tokens in ui/') already handles the grep
   false-positives."** Reverse: the live false-positives (`min-h-[300vh]` in a `(site)` route;
   `min-h-[28rem]`/`min-h-[1.25rem]` in `contact-form`) are **not in `ui/`** and are spacing, so the
   `ui/`-exclusion the task relies on does not cover them. The note creates false confidence; the
   grep pattern itself must be narrowed.

---

## WHAT'S MISSING (design elements / ACs with no — or under-specified — task)

- **R7.1 named spacing rhythm** — no task applies `px-4 sm:px-6 lg:px-8` / `py-16 md:py-24` / hero
  `pt-20 md:pt-28` (Risk #4).
- **The tokenized card-hover value** — consumed by Task 16, defined by no task/design line (Risk #2).
- **The existing `max-w-prose` wrapper on projects `[slug]`** — not acknowledged by Task 18; its
  interaction with `max-w-measure` and the layout test is unhandled (Risk #1).
- **A named token-level contrast verification path** for Tasks 1/2 (Risk #5).

Everything else in the design (brand/status/measure/z tokens, Fraunces, themed `.prose` incl. both
`--tw-prose-*` sets, Wordmark/SectionKicker/StatusCallout/Button-brand, reduced-motion + no-flash,
reading-progress→brand, print.css token re-declaration, favicon set, build-time OG with explicit
font loading, header/hero/profile re-style, prose migration, remaining sections, token-presence test,
axe both themes, full-suite + grep, visual review) **has a corresponding task with correct
ordering.** The deferred set (per-page OG, chart palette, i18n/RTL, CI gate upgrades) is carried
forward unchanged — not silently cut.

---

## Severity-classified findings (all Novel — first tasks review)

| # | Severity | Finding | Novelty |
|---|----------|---------|---------|
| 1 | MUST_FIX | Task 18 ignores existing `max-w-prose` wrapper (`projects/[slug]:86`) + breaks `projects-detail-layout.test.ts` `PROSE_MAX_WIDTH=700` when measure → 75ch | Novel |
| 2 | SHOULD_FIX | "tokenized card-hover convention" consumed by Task 16 is undefined anywhere | Novel |
| 3 | SHOULD_FIX | Task 22 grep gate false-fails on `min-h-[300vh]`/`min-h-[28rem]`/`min-h-[1.25rem]` in `(site)` — must pin to the narrow color/font/`p-[` pattern | Novel |
| 4 | SHOULD_FIX | R7.1 named spacing rhythm has no implementing task | Novel |
| 5 | SHOULD_FIX | Tasks 1/2 "contrast tooling" unnamed/unavailable for token-level pre-verification | Novel |
| 6 | MINOR | Task 11 cites "lines 11-17"; fill declarations are 12 & 17 | Novel |

---

```
VERDICT: iterate
MUST_FIX: 1
SHOULD_FIX: 4
MINOR: 1
DESIGN_READY: no
ESCALATE: none
```
