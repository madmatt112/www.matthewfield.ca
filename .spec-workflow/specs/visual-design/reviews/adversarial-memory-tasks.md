# Adversarial Review Memory — tasks
Last updated: 2026-06-08 (after v4 review — **CONVERGED**)

## r4 outcome — CONVERGED at v4
`VERDICT: converged` (0 MUST / 0 SHOULD / 1 MINOR; DESIGN_READY: yes; ESCALATE: none). r4
**compile-confirmed** the v4 prose mechanic against the project's own `@tailwindcss/postcss@4.2.2`
and the real `@tailwindcss/typography@0.5.20`: emitted `@layer theme, base, components, utilities;`
(utilities last) so bare `prose max-w-measure` beats the plugin's components-layer `.prose{65ch}` →
75ch; reproduced that `max-w-none` emits after `max-w-measure` (so v4 was right to drop it); and
compile-confirmed `--container-measure`/`--z-index-*` all generate. Every artifact reference verified
exact; the pinned grep returns zero in `(site)`. The sole MINOR is **not a tasks defect**: `design.md`
(`:423-424`, `:570`) still names the z-index tokens with the stale non-generating `--z-base/-*`
namespace while Task 3 correctly uses `--z-index-*`. Folded into v4 in spirit (the v4 revision history
already flags it for optional design-doc cleanup); no tasks.md change, no version bump, no re-review.
The prose-measure thread (3 formulations across r1→r4) closed by progressive correction, never a
rejection — not a standoff.

---
(below: record after v3)


## r3 outcomes (both accepted, fixed in v4)
- **[MUST, r3 — RECURRING on r2's prose-measure, mis-fixed in v3 not rejected]** r3 compiled
  `tailwindcss@4.2.2` and proved `max-w-none max-w-measure` on one element → `max-width: none` (no cap),
  because `.max-w-none` emits *after* `.max-w-measure`. **Independently re-verified by the orchestrator
  via the tailwind compile API** (max-w-measure at line 162, max-w-none at 165). v4 fix: canonical set
  is now **bare `prose dark:prose-invert max-w-measure`** (NO max-w-none); the utility beats the
  plugin's components-layer `.prose{65ch}` via v4 utilities-after-components layer order → 75ch. Added
  an unlayered-`.prose` fallback + kept Task 18's rendered-width measurement. **This is the 2nd
  consecutive round on the prose measure — but each round's finding was ACCEPTED (v2 fix incomplete,
  v3 fix wrong), never rejected, so it is NOT a standoff. r4 must confirm the v4 mechanic is finally
  correct; if it is, converge.**
- **[SHOULD, r3]** OG font source: no `geist` npm package exists. v4 named the source (download OFL-1.1
  Fraunces + Geist Mono binaries and commit).
- r3 **cleared as FINE**: `--z-index-*` namespace (verified), `z-base`/`z-0` no collision, Task
  19-after-18 ordering, OG route needs no CSP change. r3 also noted the **design doc** still uses the
  stale `--z-base/-*` namespace (design-doc inconsistency, recorded in v4 history; NOT a task defect).

---
(below: record after r2)


## r2 outcomes (all accepted, fixed in v3)
- **[MUST, r2] Typography plugin's `.prose { max-width: 65ch }` makes the 75ch measure unreachable**:
  bare `prose max-w-measure` leaves 65ch competing on the same property; a 65ch `.prose` child can't be
  widened by a 75ch parent. v3 fix: canonical `prose dark:prose-invert max-w-none max-w-measure` set
  (Task 5 + 18); measure on the `.prose` element for projects (outer `max-w-prose` removed).
- **[SHOULD, r2] Task 3 z-index wrong v4 namespace**: verified the v4 `z` utility reads
  `themeKeys: ["--z-index"]`; `--z-sticky` generates nothing. v3 fix: `--z-index-*` namespace; noted
  header `z-40` already works (cosmetic). Task 15 updated.
- **[SHOULD, r2] About/Now/Colophon `/ kicker` had no task**: v3 added the three files to Task 19.
- **[SHOULD, r2] Task 14 OG font path unstable** (`.next` hashed): v3 pinned to a committed binary
  under `public/fonts/`.
- **[MINOR, r2] Task 22 grep rationale inconsistent** (pinned pattern never matched `max-w-[75ch]`):
  v3 reworded. **[MINOR, r2] Task 18 `~810px` guess**: v3 sets `PROSE_MAX_WIDTH` by measuring (≈600px
  on sans).

---
(below: original record after r1)


## Cumulative Findings Summary

### Accepted (all r1 findings were accepted and fixed in v2)
- **[MUST, r1] Task 18 projects `[slug]` measure conflict**: the existing `mx-auto max-w-prose`
  wrapper (`projects/[slug]/page.tsx:86`, ~65ch) and the `projects-detail-layout.test.ts`
  `PROSE_MAX_WIDTH = 700` (line 49) assertion conflict with the 75ch target. v2 fix: Task 18 now
  replaces the wrapper with `max-w-measure` and updates the test constant to the 75ch width.
- **[SHOULD, r1] Undefined card-hover convention**: Task 16 consumed a "tokenized hover convention"
  no task/design defined. v2 fix: defined as `group-hover:bg-accent` (re-pointing `hero-card.tsx:17`'s
  `bg-accent/40`), pinned in Task 16 and referenced by Task 19.
- **[SHOULD, r1] Task 22 grep false-positives**: prose said "spacing values" but the repo has
  legitimate `min-h-[300vh]` / `min-h-[28rem]` / `min-h-[1.25rem]` in `(site)`. v2 fix: pinned the
  grep to `text-\[`, `bg-\[#`, `[pm][xytrbl]?-\[` and excluded layout sizing explicitly.
- **[SHOULD, r1] R7.1 named spacing rhythm had no task**: design §4's `px-4 sm:px-6 lg:px-8` /
  `py-16 md:py-24` / hero `pt-20 md:pt-28` was only implicitly covered. v2 fix: folded into Tasks
  16/17/19 (named, replacing today's `px-4 py-12 sm:py-16`).
- **[SHOULD, r1] Tasks 1/2 "contrast tooling" unnamed**: no token-level contrast tool exists. v2 fix:
  reworded to confirm against the design §1 pre-computed figures; rendered-DOM axe is Task 21.
- **[MINOR, r1] Task 11 line cite**: "lines 11-17" → fill declarations at lines 12 & 17. Fixed.

### Partially Accepted
- (none)

### Rejected
- (none rejected) — note: r1 raised that the design claims a "mobile-nav z-40" consumer that does
  **not** exist (only `header.tsx:10`); r1 concluded the *tasks* were already correct (header-only
  swap), so this required no task change. Confirmed against `grep -rn z-40 src/`.

### Unresolved
- (none)

## Patterns & Themes
- r1 confirmed the v1 task list was **well-grounded** — every artifact reference (paths, line
  numbers, existing classes, dependency presence) was accurate. The failures were **coverage and
  ordering gaps**, not factual errors.
- Recurring risk class: the **prose/measure migration** is the most fragile area (existing competing
  wrappers + existing layout tests). The brand/token additions are low-risk (additive).

## Guidance for Next Review (r4)
- The doc has been grounding-accurate for 3 straight rounds; the only live thread is the
  **prose-measure mechanic**, now on its 3rd formulation (v2 wrapper-only → v3 max-w-none combo → v4
  bare `prose max-w-measure`). r4's job: **confirm the v4 mechanic is correct** (bare
  `prose max-w-measure` → 75ch via layer order; no max-w-none anywhere on prose). If correct and no
  genuinely new concrete failure exists, **converge** — do not keep the loop alive on the same thread
  with re-phrasings or hypotheticals. A finding that merely says "verify it at implementation" is not
  MUST/SHOULD; Task 18 already measures the rendered width.
- Watch the standoff guard: if r4 re-raises the prose-measure as MUST with the *same* substance and it
  were rejected, that's a standoff → escalate. (It has not been rejected; it's been progressively
  corrected.)
- One last fresh lens worth a look: is the **bare `prose max-w-measure`** claim about layer order
  actually robust for THIS plugin (does `@tailwindcss/typography` v4 emit `.prose` in components or
  utilities?), or does the unlayered fallback need to be the *primary* instruction? If r4 can show by
  compiling the actual plugin that the utility does NOT win, that's a Novel concrete MUST; otherwise
  the v4 mechanic + measurement safety-net is sufficient.

## Guidance from Review (r3)
- Two consecutive rounds (r1, r2) found grounding-accurate but **mechanically/coverage-incomplete**
  tasks, and **all findings were accepted** — no standoff, no rejected finding. r2's findings were
  deeper (Tailwind-v4 internals) than r1's (coverage gaps). r3 should probe the **v3 deltas** and one
  genuinely fresh lens; if it can only produce MINOR/wording, it should converge.
- **Attack the v3 deltas**: (a) Is `max-w-none max-w-measure` on the same element actually
  deterministic in Tailwind v4 (utility source-order), or does it just move the ambiguity from
  plugin-vs-utility to none-vs-measure? (b) `--z-index-base: 0` — does a `z-base`/`z-0` collision or
  the `0` value cause any issue; is the namespace claim exactly right (it was verified once)? (c)
  Task 19 now edits about/now/colophon AFTER Task 18 — is the cross-task ordering on shared files
  expressible/safe given tasks are independent checkboxes? (d) committed-font-binary for OG: licensing
  / which weights / does Geist Mono ship a static binary in node_modules to copy?
- **Genuinely fresh lenses not yet run**: implementation-log/spec-status mechanics aside — look at
  whether the **task count/sequencing** is honest about parallelism, whether any **Success criterion is
  still unfalsifiable**, and whether the **deferred set** (per-page OG, charts, i18n, CI gates) is
  consistent with what the tasks actually ship. Also: does any task need a `next.config.ts` CSP edit
  that no task names (e.g. the OG route, or `data:` already covered)?
- **Well-covered — do NOT re-litigate**: all artifact-reference grounding (r1+r2 verified the full
  set); the phantom mobile-nav z-40; Tasks 18/19 atomicity; test-suite collateral for
  header/hero/contact (r2 confirmed no asserting tests); `group-hover:bg-accent` legibility;
  reading-progress parity; reduced-motion conflicts; the pinned-grep reach. Re-raising these without a
  NEW concrete failure = nitpick-padding.
