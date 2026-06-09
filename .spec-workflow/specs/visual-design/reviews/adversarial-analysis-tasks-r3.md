# Adversarial Analysis — visual-design / Tasks (r3)

Reviewed `tasks.md` (v3) against `design.md`, `requirements.md`, `structure.md`, and the live
repository (`tokens.css`, `globals.css`, `button.tsx`, `hero-card.tsx`, `header.tsx`,
`layout.tsx`, `next.config.ts`, the `(site)` page files, `e2e/tests/projects-detail-layout.test.ts`,
`node_modules/tailwindcss@4.2.2`). Where a Tailwind-v4 mechanic was load-bearing I compiled it with
the installed compiler rather than reasoning about it.

## Grounding spot-check (all v3 claims verified TRUE)

- `globals.css:47` is `@theme inline` (Task 1 cite correct). I confirmed `z-sticky` and
  `max-w-measure` both generate under `@theme inline` (the repo's actual block, not a bare `@theme`).
- `button.tsx:8` carries the shared `focus-visible:ring-ring/50`; `:19` `link: "text-primary …"`
  (Task 8 correct).
- `hero-card.tsx:17` `group-hover:bg-accent/40` (Task 16 correct).
- `header.tsx:10` `sticky … z-40`; `:12-14` text link `{siteConfig.name}` (Tasks 3/15 correct).
- `reading-progress.css:12` `--reading-progress-fill: oklch(0.55 0.2 240)`; `:17` `.dark` fill
  (Task 11 correct — the fill is via a CSS var, and Task 11 swaps the var values, which is right).
- `blog/[slug]/page.tsx:143` `prose prose-lg dark:prose-invert max-w-[75ch]` — only `max-w-[75ch]`
  in `(site)` (Task 18 "drop prose-lg + swap" correct).
- `projects/[slug]/page.tsx:86` outer `mx-auto max-w-prose mt-8`, `:87` inner `prose dark:prose-invert`
  (Task 18 correct).
- `profile:48` / `about:33` / `now:42` / `colophon:33` MDX bodies in `text-base leading-relaxed
  text-foreground` containers (Task 18 correct).
- `site.ts:42` `"/images/og-default.png"`; the file does **not** exist in the repo (Task 14 correct).
- `next.config.ts:71` `img-src 'self' data:`, `:72` `font-src 'self'` (Tasks 4/14 CSP claims correct);
  there is no `worker-src` directive — it falls back to `script-src 'self' 'unsafe-inline'
  'wasm-unsafe-eval'` / `default-src 'self'`, which does not block build-time `next/og` (Satori runs
  at build, no runtime worker). The OG PNG is embedded/served under `img-src` — no CSP task needed.
- `--z-index-*` namespace: compiled against tailwindcss@4.2.2 — `z-base`/`z-sticky`/`z-overlay`/
  `z-toast` all generate (`z-index: var(--z-index-*)`). Task 3's namespace claim is exactly correct.
- `e2e/tests/projects-detail-layout.test.ts:49` `PROSE_MAX_WIDTH = 700` with the cited comment
  (Task 18 correct).

No misstated artifact anywhere in v3. The grounding is clean.

---

## 1. Top risks / gaps

### MUST_FIX — `max-w-none max-w-measure` produces `max-width: none`, not 75ch (Recurring + Compounding on the r2 MUST)

The r2 MUST fixed "plugin's 65ch beats the measure" by mandating the canonical class set
`prose dark:prose-invert max-w-none max-w-measure` in **Task 5** (`tasks.md:62`, `:67`) and **Task 18**
(`tasks.md:189`, `:193`, `:198`), with the stated rationale that "`max-w-none` drops the plugin's 65ch
cap and `max-w-measure` (75ch) governs."

That rationale is wrong in this Tailwind version. `max-w-none` and `max-w-measure` set the **same
property** (`max-width`) at the **same specificity**, both in `@layer utilities`. The winner is CSS
source order in the generated utilities, not class-attribute order. Compiled against the installed
tailwindcss@4.2.2:

```
.max-w-measure { max-width: var(--container-measure); }   /* emitted first  */
.max-w-none    { max-width: none; }                       /* emitted later  */
```

`.max-w-none` is emitted **after** `.max-w-measure` regardless of the order the classes appear in the
`class` attribute (verified by compiling both `["max-w-none","max-w-measure"]` and
`["max-w-measure","max-w-none"]` — identical source positions: `measure`=4488, `none`=4552). Later
source wins, so the computed value is `max-width: none`.

Failure scenario: all six prose bodies ship with **no measure cap at all** — strictly worse than the
v2 state (65ch). Profile, about, now, colophon, blog, and projects all run prose to the full container
width on wide viewports. R4.3 (75ch measure) is violated on every long-form route, and Task 18's own
Success criterion ("all six routes render … at the 75ch measure (verified, not assumed)") cannot pass.
The projects layout test would also measure a wide `<p>` (≫600px), so the "measure the rendered width
and set the constant" instruction would silently bake in the *broken* width and pass anyway — masking
the regression.

This is **Recurring**: the r2 issue (measure unreachable on prose) is not resolved; the fix moved it
from "65ch wins" to "none wins." It is **Compounding** because the new state is worse than before the
fix (no cap vs 65ch cap). Per the standing rules an r2 MUST recurring in r3 is a standoff signal.

**The actual mechanic the tasks should rely on:** the typography plugin emits `.prose { max-width:
65ch }` in `@layer components` (the design states this at `design.md:333`). `@layer utilities` is
declared **after** `@layer components` (confirmed: the generated cascade is
`@layer theme, base, components, utilities`). So a bare `prose max-w-measure` — utility in `utilities`,
plugin rule in `components` — already wins on layer order, with **no need for `max-w-none`**. The
`max-w-none` is not just unnecessary; it actively defeats the measure. The fix is to drop `max-w-none`
from the canonical set in Tasks 5 and 18 and use `prose dark:prose-invert max-w-measure`, OR (if the
implementer wants belt-and-suspenders against an unknown plugin layer) override `.prose`'s
`max-width` via an unlayered rule keyed to `--container-measure` — but NOT a second competing
`max-w-*` utility. (The plugin is not installed yet, so its exact layer is asserted by the design, not
verified by me; the load-bearing fact that does not depend on the plugin is that `max-w-none` beats
`max-w-measure` and so must not be paired with it.)

### Note on z-base / z-0 (cleared — no issue)

`--z-index-base: 0` generates `.z-base { z-index: var(--z-index-base) }` (= 0); the built-in `.z-0`
(`z-index: 0`) is a distinct selector. They coexist with no collision, duplication harm, or override
ambiguity. Task 3 is fine. One line, move on.

### Note on Task 19-after-Task-18 ordering (cleared — no real hazard)

Tasks are independent checkboxes, but Task 19 (`tasks.md:203`) edits about/now/colophon to **add**
a kicker + brand links, while Task 18 **wraps** their bodies in `.prose`. These are additive, non-
overlapping edits to the same three files; "apply 19 after 18" is a sequencing note, not a structural
ordering guarantee, and the worst case is a trivial merge, not a clobber. Acceptable as written.

---

## 2. Conclusions to challenge or reverse

- **Reverse the `max-w-none` premise** in Tasks 5 and 18 and in the v3 Revision History note
  (`tasks.md:259-263`), which states the fix as settled fact. The premise is empirically false on
  tailwindcss@4.2.2. This is the one load-bearing reversal.

- The design's §4 Data-Models block (`design.md:570`) still names the z-index tokens
  `--z-base/-sticky/-overlay/-toast` (the non-generating namespace), and §4 prose (`design.md:423-425`)
  likewise. Task 3 correctly uses `--z-index-*`. This is a **design**-doc inconsistency, not a task
  defect — the tasks are right and the design is stale here. Flagging for the record; it does not block
  the tasks, but the design's converged-v3 claim rests partly on a token name that would generate
  nothing if implemented literally. Out of scope for a tasks verdict; worth a one-line design footnote.

---

## 3. What's missing

- **Font-binary source for Task 14 (feasibility — fresh):** `geist` is **not** an installed package
  (it is not in `package.json`; node_modules has no `geist/`). The repo loads Geist via
  `next/font/google` (`Geist`, `Geist_Mono` in `layout.tsx:2`), which exposes only the `next/font`
  loader, **not** a copyable static `.ttf`/`.woff2`. So Task 14's "commit a Fraunces + Geist Mono font
  binary under `public/fonts/`" cannot be satisfied by copying from node_modules — the binaries must
  be **downloaded and committed** (Geist Mono from vercel/geist-font or fontsource; Fraunces from
  Google Fonts / fontsource). Both are OFL-1.1, so redistribution-by-commit is licensed and fine.
  Task 14 already says to commit a binary "under `public/fonts/` (create the dir)" and explicitly does
  NOT claim node_modules has them, so the task is **not broken** — but it never names a source and the
  obvious "copy from the geist package" shortcut does not exist here. SHOULD-strength clarification:
  name the source (download OFL binaries; do not expect a `geist` package). The OG route needs only
  the weights actually composed — one Fraunces display weight + one Geist Mono weight for the `/`.
  This is a wording gap, not a coverage hole; logging as SHOULD_FIX.

- **Coverage residue:** I re-walked the design §1-§6 against the 23 tasks. Every element maps:
  brand/status/measure/z tokens (T1-3), Fraunces + typography plugin (T4-5), Wordmark/SectionKicker/
  Button-brand/StatusCallout (T6-9), reduced-motion + no-flash (T10), reading-progress→brand (T11),
  print (T12), favicon (T13), OG (T14), header (T15), hero/profile priority + conventions (T16-17),
  atomic prose migration (T18), remaining sections incl. about/now/colophon kicker (T19), gates
  (T20-23). The deferred set (per-page OG, chart palette, i18n/RTL, CI-gate upgrades) is consistent
  between `tasks.md:248-251` and `design.md:650-661` — nothing silently cut, nothing double-claimed.
  No unmapped element. **None.**

- **Falsifiability of Success criteria:** all are observable except where they depend on the broken
  measure. Task 18's "render at the 75ch measure (verified)" and Task 23's distinctiveness arbiter are
  the two subjective/observational ones; both are appropriately framed. The only Success criterion that
  is currently **unsatisfiable** is Task 18's measure claim — but that is a consequence of the MUST
  above, not an independent finding.

---

## Verdict rationale

v3 closed the r1/r2 coverage and grounding gaps cleanly — the grounding is flawless and coverage is
complete. But the central r2 MUST fix (`max-w-none max-w-measure`) does not resolve the measure
problem; compiled against the installed Tailwind it produces `max-width: none`, defeating the 75ch
measure on all six prose routes. That recurs the r2 MUST and compounds it (no cap is worse than 65ch),
so this cannot converge. The font-source wording gap is a SHOULD. The z-base and ordering concerns are
clear.

```
VERDICT: iterate
MUST_FIX: 1
SHOULD_FIX: 1
MINOR: 0
DESIGN_READY: no
ESCALATE: max-w-none beats max-w-measure in tailwindcss@4.2.2 (verified by compiling) — the r2 "measure" fix recurs and worsens; Tasks 5/18 must drop max-w-none and rely on layer order (utilities > plugin components) for a bare max-w-measure
```
