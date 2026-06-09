# Adversarial Analysis — visual-design / Tasks (v4)

Reviewer role: senior staff engineer / release lead. Mandate: find anything in tasks.md v4 that would
cause a botched, half-migrated, or untestable implementation. Every claim below is grounded in the
real repo (and, for the decisive prose-measure thread, in a real compile of the installed
`tailwindcss@4.2.2`). The decisive check is whether the v4 prose mechanic is finally correct.

## 1. The v4 prose mechanic — COMPILED AND CONFIRMED CORRECT (this thread is closed)

The live thread across r1→r3. v4's claim: a **bare `prose max-w-measure`** (no `max-w-none`) yields
75ch because the typography plugin emits `.prose { max-width: 65ch }` in `@layer components` and v4
declares `@layer utilities` **after** components, so the utility wins. I tested this for real against
the project's installed toolchain.

**Compile evidence (`tailwindcss@4.2.2`, the installed version):** I compiled, via the project's own
`@tailwindcss/postcss@4.2.2` + `postcss@8.5.9`, a stylesheet declaring `--container-measure: 75ch`
and a `@layer components { .prose { max-width: 65ch } }` against content using `max-w-measure`,
`max-w-none max-w-measure`, and `max-w-measure max-w-none`. The emitted CSS:

- **Layer declaration:** `@layer theme, base, components, utilities;` — **utilities is last**, so a
  `max-w-measure` utility (utilities layer) beats `.prose { max-width: 65ch }` (components layer)
  regardless of source order. **v4's core claim holds: bare `prose max-w-measure` → 75ch.** ✓
- **Within the utilities layer, `.max-w-measure` emits at line 163 and `.max-w-none` at line 166** —
  i.e. `.max-w-none` is emitted *after* `.max-w-measure` at equal specificity. So
  `max-w-none max-w-measure` on the same element resolves to `max-width: none` (no cap), **exactly
  reproducing r3's finding**. v4 correctly **removed `max-w-none`** from the canonical set. ✓

**Plugin layer placement verified independently:** the current `@tailwindcss/typography@0.5.20` (what
Task 5's unpinned `@tailwindcss/typography` resolves to) registers `.prose` via `addComponents(...)`
(`package/src/index.js:118`), which lands in Tailwind v4's **components** layer — so the simulation is
faithful, not assumed.

`--container-measure` → `max-w-measure` generating: confirmed in the same compile
(`.max-w-measure { max-width: var(--container-measure) }`). The deterministic unlayered-`.prose`
fallback in Task 5 (tokens.css is unlayered and cascades above Tailwind's layers — `globals.css:8-11`)
is sound and same-valued, so it cannot conflict with the winning utility. Task 18's rendered-width
measurement is the safety net.

**`max-w-none` residue check:** Tasks 5 (line 62) and 18 (lines 190-194) specify
`prose dark:prose-invert max-w-measure` with explicit "do NOT add `max-w-none`" prohibitions. **No
`max-w-none` residue anywhere.** ✓

**Verdict on the decisive thread: converged.** The mechanic is correct on the installed toolchain,
the fallback de-risks the one edge case, and the measurement net catches a wrong outcome. This is the
3rd formulation arrived at by *progressive correction*, now compile-proven — not a standoff.

## 2. Grounding re-spot-check — every cited artifact verified

All file/line citations in v4 match the working tree exactly:

- `projects/[slug]/page.tsx:86` outer `mx-auto max-w-prose mt-8`, `:87` inner `prose dark:prose-invert`
  — Task 18's instruction (put `max-w-measure` on the inner element, remove the outer `max-w-prose`)
  is exact. ✓
- `blog/[slug]/page.tsx:143` = `prose prose-lg dark:prose-invert max-w-[75ch] mt-8` — Task 18's
  swap (`max-w-[75ch]`→`max-w-measure`, drop `prose-lg`) is exact. ✓
- `e2e/tests/projects-detail-layout.test.ts:49` = `PROSE_MAX_WIDTH = 700; // … max-w-prose ~ 65ch ≈
  700px` — exact. ✓
- `src/config/site.ts:42` = `ogImage: "/images/og-default.png"`; the file **does not exist** in
  `public/images/` — Task 14's dangling-ref claim is correct. ✓
- `header.tsx:10` `z-40`, `:12-14` `siteConfig.name` text link — Task 15 exact. ✓
- landing `page.tsx:15` `px-4 py-12 sm:py-16`, `:17` `AvatarPlaceholder`, `:19` h1 `text-3xl sm:text-4xl`
  — Task 16 exact. ✓
- `hero-card.tsx:17` `group-hover:bg-accent/40` — Task 16 exact. ✓
- `profile/page.tsx:24` `max-w-5xl px-4 py-12 sm:py-16`, `:48` `<article class="… text-base
  leading-relaxed text-foreground">` — Tasks 17/18 exact. ✓
- `reading-progress.css:12` `oklch(0.55 0.2 240)`, `:17` `oklch(0.7 0.16 240)` — Task 11 exact. ✓
- about/now/colophon bodies are `<div class="… text-base leading-relaxed text-foreground">` — Task 18
  exact. ✓
- `layout.tsx:2-15` Geist/Geist_Mono via `next/font/google` exposing `--font-sans`/`--font-mono` —
  Task 4 leverage cite exact. ✓

**Z-index namespace (Task 3) — compile-verified:** against real `tailwindcss@4.2.2`,
`--z-index-base/-sticky/-overlay/-toast` generate `z-base`/`z-sticky`/`z-overlay`/`z-toast`
respectively, and `z-40` still generates as a static step. The r2 namespace fix is correct. ✓

**Task 22 grep — verified:** the pinned color/font/padding pattern (`text-\[`, `bg-\[#`,
`[pm][xytrbl]?-\[`) returns **zero** hits in `src/app/(site)` today. The only `max-w-[` is the
layout-measure `max-w-[75ch]` at blog `:143` (outside the pinned pattern, as Task 22 states). The
claimed legitimate layout sizing exists: `min-h-[300vh]` (`blog/component-preview/.../reading-progress.tsx:16`),
`min-h-[28rem]`/`min-h-[1.25rem]` (`contact-form.tsx`). ✓

## 3. Fresh sweep for new defects (last look) — none material

Walked all 23 tasks for new atomicity/ordering/coverage defects:

- **Ordering:** Phase 1 (tokens/measure/z) → Phase 2 (typography, blocked by 1) → Phase 3/4
  (components/artifacts, blocked by 1-2) → Phase 5 (sections, blocked by 3-4) → Phase 6 (gates). Task
  19-after-18 on about/now/colophon is correctly called out (Task 19 line 204) as additive. The
  atomic prose-migration (Task 18) lands as one change. No new ordering hazard.
- **Atomicity:** Task 18 is the one large-but-correctly-atomic change (six bodies + the test constant)
  — splitting it would leave a mixed measure mid-migration, so single-change is right.
- **Coverage:** every requirement AC maps to a task (R1→16/18/22/23, R2→1/8, R3→6/7/16/23,
  R4→3/4/5/18, R5→1/2/8/9/21, R6→2/9/20, R7→10/16/17/19, R8→6/12/13/14/15/16/17, R9→15-19/22,
  R10→10/20/21/22/23). The four deferred items (per-page OG, chart palette, i18n/RTL, CI gate
  upgrades) are consistent between tasks.md (lines 245-252) and design.md (lines 650-661).
- **Falsifiability:** Success criteria are checkable — utilities resolving (compile/build), measured
  rendered width (Task 18), axe zero-violations (Task 21), pinned grep zero (Task 22). Task 23 is
  inherently subjective by design (the R3.6 distinctiveness arbiter) and is correctly labeled as such.

None.

## Top risks/gaps

None at MUST/SHOULD. One MINOR/informational item (not a tasks defect):

- **MINOR (informational, already recorded):** the **design doc** §4 (design.md:423-424) and
  Data-Models (design.md:570) still name the z-index tokens with the **non-generating** `--z-base/
  -sticky/-overlay/-toast` namespace, whereas **Task 3 correctly uses `--z-index-*`** (compile-proven
  above). This is a stale design-doc/tasks-doc divergence, not an implementation hazard — the task is
  right; an implementer follows Task 3. The v4 revision history (tasks.md:268-270) already flags it as
  a side note for later cleanup. Classification: **Recurring-adjacent but resolved in the task layer.**
  Optional doc hygiene only; does not block.

## Top conclusions to challenge or reverse

None. The prose-measure conclusion (bare `prose max-w-measure` → 75ch) was the one live claim and it
is now compile-confirmed against the installed `tailwindcss@4.2.2`, with a sound fallback and a
measurement net. The r1/r2/r3 fixes (projects measure-on-`.prose`, z-index namespace, OG committed
font source, both `--tw-prose-*` sets themed, pinned grep, test-constant-by-measurement) all hold
against the code.

## What's missing

Nothing. All ACs are mapped; deferrals are consistent; the canonical prose set carries no `max-w-none`
residue; the gates (Tasks 20-23) close the loop on contrast, token-presence, the arbitrary-value
grep, and the subjective distinctiveness arbiter.

This v4 closed its prior gap (the r3 prose-mechanic mis-fix) correctly and introduced no new defect.
Per the standing rule, an empty MUST/SHOULD list is the expected, correct outcome for a converged v4.

```
VERDICT: converged
MUST_FIX: 0
SHOULD_FIX: 0
MINOR: 1
DESIGN_READY: yes
ESCALATE: none
```
