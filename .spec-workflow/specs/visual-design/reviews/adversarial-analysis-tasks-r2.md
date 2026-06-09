# Adversarial Analysis — visual-design / Tasks (r2)

Reviewed `tasks.md` (v2) against `design.md` (v3, converged), `requirements.md` (v4), and the live
repo. Grounding spot-checks all pass — every file/line the v2 tasks cite is accurate (see §Grounding).
The r1 deltas (Task 18 projects wrapper, `group-hover:bg-accent`, pinned grep, spacing-rhythm fold,
Tasks 1/2 wording, Task 11 line cite) all landed and are correctly grounded. The failures below are
**fresh** and concern Tailwind-v4 / typography-plugin mechanics the v2 tasks assume but do not
specify — not artifact misstatements.

---

## Grounding re-spot-check (cheap, done first)

All verified against the real files — **no misstatement found**:

- `projects/[slug]/page.tsx:86` = `<div className="mx-auto max-w-prose mt-8">`; `:87` = inner
  `<div className="prose dark:prose-invert">`. ✓ (Task 18's structural description is exact.)
- `projects-detail-layout.test.ts:49` = `const PROSE_MAX_WIDTH = 700; // … ~ 65ch ≈ 700px`. ✓
- `hero-card.tsx:17` = `…group-hover:border-foreground/20 group-hover:bg-accent/40`. ✓
- `page.tsx:15` and `profile/page.tsx:24` = `…px-4 py-12 sm:py-16`. ✓ `page.tsx:17` = `AvatarPlaceholder`. ✓
- `blog/[slug]/page.tsx:143` = `prose prose-lg dark:prose-invert max-w-[75ch] mt-8` — the only
  `max-w-[75ch]` in `(site)`. ✓
- `globals.css:47` = `@theme inline {`. ✓
- about/now/colophon bodies = `<div className="mt-6 text-base leading-relaxed text-foreground">`. ✓
- `site.ts:42` = `ogImage: "/images/og-default.png"` (file does not exist under `public/`). ✓
- CSP in `next.config.ts`: `font-src 'self'` and `img-src 'self' data:`. ✓ — Task 4's "self-host via
  next/font, CSP-clean" and Task 14's "`img-src 'self' data:`" claims are both accurate.

So the v2 list is **well-grounded**. The problems are in unstated mechanics.

---

## Top risks / gaps

### 1. MUST_FIX — `@tailwindcss/typography` ships `max-width: 65ch` on `.prose`; the 75ch measure is never actually reached (Novel)

The plugin's base `.prose` rule sets `max-width: 65ch`. This is the documented default; the docs tell
you to add `max-w-none` to remove it. Today the plugin is **absent** (`package.json` has no
`@tailwindcss/typography`), so `.prose` has no `max-width` and the current projects test passes only
because the **outer** `max-w-prose` (~65ch ≈ 700px) constrains the `<p>` — that is the entire reason
`PROSE_MAX_WIDTH = 700` works.

Task 5 adds the plugin. From that point `.prose` itself caps at **65ch**. Two breakages follow, and
**neither Task 5 nor Task 18 mentions `max-w-none` or overriding the plugin's `max-width`:**

- **Projects `[slug]`:** Task 18 puts `max-w-measure` (75ch) on the **outer** wrapper (`:86`) while
  the inner `.prose` (`:87`) keeps the plugin's own `max-width: 65ch`. A parent `max-width` cannot
  *widen* a child that caps itself at 65ch — so the projects body renders at **65ch**, directly
  contradicting the task's stated goal ("projects holds the same 75ch as the other five"). The fix
  the task describes (move the measure to the outer wrapper) is structurally incapable of producing
  75ch.
- **Blog + the four MDX wrappers:** here `max-w-measure` is on the *same* element as `.prose`, so it
  is `.prose { max-width: 65ch }` (plugin) vs `.max-w-measure { max-width: 75ch }` (utility) — same
  property, both in Tailwind's utilities cascade. Which wins is source-order/specificity dependent
  and the task never pins it. If the plugin rule wins, every "75ch" route silently renders at 65ch
  — failing R4.3 and the design's "all six routes at 75ch" with no test catching it (the projects
  test is a `≤` ceiling, so a *narrower* result passes).

**Required:** Task 5 and/or Task 18 must add `prose max-w-none` (so the plugin's 65ch is dropped) and
let `max-w-measure` own the width — and for projects, the measure must sit on the `.prose` element (or
`.prose` must carry `max-w-none max-w-measure`), not only on the outer wrapper. As written, the design
intent (75ch) is unimplementable by the named steps.

### 2. SHOULD_FIX — Task 3 z-index tokens use the wrong Tailwind-v4 namespace; the `z-*` utilities won't generate (Novel)

Task 3 adds `--z-base: 0`, `--z-sticky: 40`, `--z-overlay: 50`, `--z-toast: 60` to `@theme` and claims
they are "mapped as usable utilities" with a restriction of "named-token only, no arbitrary values."
In Tailwind v4 the z-index utility namespace is **`--z-index-*`** (e.g. `--z-index-sticky: 40` →
`z-sticky`). `--z-sticky` is *not* in any utility-generating namespace, so it produces **no** `z-sticky`
utility — it would only be reachable via arbitrary `z-(--z-sticky)`, which the task's own restriction
forbids. The success criterion "the z utilities resolve" fails as written, and Task 15's "swap the
header `z-40` to the `--z-sticky` token" then has nothing to swap to.

(`--container-measure` is correct — the `--container-*` namespace does back `max-w-*` → `max-w-measure`.
Only the z-index names are wrong.) Note also the header's current `z-40` is a *named* step, not an
arbitrary value, so this tokenization is cosmetic, not a grep-gate fix.

### 3. SHOULD_FIX — design §6 mandates a `/ kicker` on About/Now/Colophon, but no task applies it (Novel, coverage residue)

design §6's apply table: **"About/Now/Colophon → Markup change + apply — wrap body … `/ kicker`."**
Task 18 wraps those three MDX bodies in `prose` but adds **no** kicker. Task 19's file list is
`projects, contributions, blog index, resources, sitemap, slashes` — it **excludes** about/now/colophon.
So the `/ kicker` (and brand links) for those three routes — explicitly named in the design — has no
task. R9.1 ("applied to all `(site)` sections") and the design §6 row are partially unmapped.

### 4. SHOULD_FIX — Task 14's OG font path is a genuine hand-wave; no stable source exists (Compounding on the design's own caveat)

Task 14 says read the Fraunces/Geist Mono binary "from the `.next`/node_modules asset or a copy under
`public/fonts/`." Verified: there is **no `public/fonts/`** dir, and `next/font/google` downloads
woff2 into `.next/` under content-hashed filenames that are not stable across builds — so "read from
`.next`" is not a reliable build-time path for `next/og`'s `fonts:[{data}]`. The realistic
implementation is to **commit a Fraunces/Geist-Mono `.ttf`/`.otf` under `public/fonts/` (or
`src/`) and read that** — which is a real sub-step the task lists only as one of two hand-waved
options. As written an implementer may chase the unstable `.next` path and the OG build fails. Pin it
to "commit the font binary and read it from a fixed path."

### 5. MINOR/SHOULD — Task 22's grep rationale is internally inconsistent (the pattern never caught `max-w-[75ch]`) (Compounding on r1's pinned-grep fix)

Task 22 says "After Task 18 the only in-scope offender (`max-w-[75ch]`) is gone, so the pinned grep
should return zero hits." But the pinned pattern `[pm][xytrbl]?-\[` does **not** match `max-w-[75ch]`
(verified: `echo 'max-w-[75ch]' | grep -E '[pm][xytrbl]?-\['` → no match; `max-w-` is `m`+`ax-`, and
`a` is not in `[xytrbl]`). The pattern also explicitly excludes `max-w-` as legitimate layout sizing.
So the grep returns zero **before and after** Task 18 — the "offender removed → zero hits" causal story
is false. The *gate outcome* (zero hits) is fine and the pattern is otherwise correct, but the design
(§2: replacing `max-w-[75ch]` "clears the R1.2 arbitrary-value grep") and Task 22 contradict each other
on whether the grep ever caught that value. Tidy the rationale; no functional break.

---

## Top conclusions to challenge

1. **"Replace the outer `max-w-prose` with `max-w-measure` so projects holds 75ch" (Task 18).**
   Reverse: this cannot work once the plugin lands. A parent wrapper's `max-width` does not override a
   child `.prose`'s own `max-width: 65ch`. The measure must live on the `.prose` element with
   `max-w-none` dropping the plugin cap. (Risk #1.)

2. **"max-w-measure and the z utilities resolve and build clean" (Task 3 success criterion).** Half
   wrong: `max-w-measure` resolves, the `z-*` utilities do **not** (wrong namespace). The success
   criterion as written would be marked green by an implementer who only checks `max-w-measure`,
   shipping a non-functional z scale. (Risk #2.)

3. **"~810px (75ch)" for `PROSE_MAX_WIDTH` (Task 18).** Challenge the arithmetic: `ch` resolves against
   the font of the element carrying `max-w-measure`. On a sans body face, 75ch ≈ 600px, not 810px.
   Because the test is a `≤` ceiling, an inflated 810 makes it *looser* (won't false-fail), so this is
   not a break — but the number is unverified and, combined with Risk #1 (the real rendered width may
   be 65ch), the test could pass while the measure is wrong. Verify the actual rendered `<p>` width
   against the chosen face rather than asserting "~810px."

---

## What's missing (design elements / ACs with no task)

- **`/ kicker` + brand links on About/Now/Colophon** — design §6 row; no task (Risk #3).
- **Overriding the typography plugin's built-in `.prose { max-width: 65ch }`** (`max-w-none`) — required
  for the 75ch measure on every prose route; named in no task (Risk #1).
- Everything else the prompt asked me to check is **covered**: the dangling `og-default.png` (Task 14),
  print `--radius`/surfaces and brand ink (Task 12 re-declares neutrals + `--brand`), the no-flash
  `disableTransitionOnChange` assertion (Tasks 10 + 22 — and `theme.test.ts` confirms no such
  assertion exists yet, so it is correctly net-new work), `twitter-image` (Task 14), `--muted-foreground`
  (already AA-tuned in `tokens.css`, print re-declares it). No AC R1–R10 is *wholly* unaddressed.

## Items the prompt flagged that are actually FINE (one line each)

- **Test-suite collateral:** no test asserts the header brand text, the hero `AvatarPlaceholder`, or the
  contact success/error markup that Task 9 changes (`landing.test.ts` asserts hero-card count/links;
  `contact-form.test.ts` asserts the success *heading text* + `[role=status]`, not the
  border/`text-destructive` classes; `contact-server-error.test.ts` selects `[role=status]`). The
  design §6 / Error-Handling §6 "no test asserts MF/avatar markup" claim holds. Task 9 must keep the
  success heading string and `role="status"`; the tasks already say "don't regress the contact tests."
- **`group-hover:bg-accent` reachability/legibility:** reachable (existing markup is a valid utility
  pair); `accent` is a near-white(light)/dark-gray(dark) neutral tint, legible as a hover surface in
  both themes; no test asserts `bg-accent/40`. Dropping `/40` makes the hover slightly more pronounced
  (a visible change, not a "logic" change) — acceptable, MINOR at most.
- **Reading-progress parity (Task 11):** `component-preview/reading-progress.test.ts:59` asserts
  light-fill ≠ dark-fill; `--brand` light `0.50 0.13 42` ≠ dark `0.75 0.12 55`, so parity holds. (Task
  11 says "parity E2E" without naming the file — minor.)
- **Global reduced-motion rule (Task 10):** does not conflict with `blog-reading-progress.test.ts`
  (reduce→0 reinforces; no-preference→0.1s still holds) or `contact-reduced-motion.test.ts`.
- **Pinned grep over/under-reach:** correctly excludes `min-h-[…]`/`max-w-[…]` layout sizing (verified
  the legit `min-h-[28rem]`/`min-h-[1.25rem]` in `contact-form.tsx`); `bg-\[#` is narrow but no
  `bg-[rgb()/var()/oklch()]` one-offs exist in `(site)` today, so it doesn't miss anything real.

---

```
VERDICT: iterate
MUST_FIX: 1       # Tasks 5/18 never override the typography plugin's .prose max-width:65ch, so the mandated 75ch measure is unreachable (projects renders 65ch; blog/MDX ambiguous)
SHOULD_FIX: 3     # (Task 3) z-index tokens use the wrong v4 namespace (--z-* not --z-index-*) so z utilities don't generate; (Task 19/18) About/Now/Colophon /-kicker has no task; (Task 14) OG font path is an unstable hand-wave
MINOR: 2          # Task 22 grep-rationale inconsistency (pattern never matched max-w-[75ch]); Task 18 "~810px" arithmetic unverified (test is a ≤ ceiling so won't false-fail)
DESIGN_READY: no  # the prose-measure mechanic (Risk #1) must be fixed before implementers can hit 75ch
ESCALATE: none
```
