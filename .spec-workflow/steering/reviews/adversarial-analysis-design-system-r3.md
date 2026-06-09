# Adversarial Analysis — steering/design-system (v3)

Role: principal product designer / design-systems architect. Mandate: tear it apart. I read the
target in full and verified its binding claims against the actual repo (`src/styles/tokens.css`,
`src/styles/globals.css`, `lighthouserc.js`, `.github/workflows/lhci.yml`, `src/app/layout.tsx`,
component usage). Findings are graded against the v1/v2 disposition list: **Novel**, **Compounding**,
**Recurring (escalate)**.

The headline: v3 is much better prose, but three of its *newly asserted binding facts* are false
against the code it points to. "State the rule, defer the artifact" has, in at least two places,
become "state a rule the implementation already contradicts." Those are not deferrals — they are
errors.

---

## Top 5 risks/gaps

### 1. The `success`/`warning`/`info` "active roles" do not exist — anywhere. (Recurring — escalate; this is v1-E reopened)

The doc, Color §, lists `success`/`warning`/`info` under **"Active semantic roles"** — same sentence,
same status, as `primary` and `destructive`. Governance § and Tokens § repeat them as live role names.
The v3 revision note claims disposition **E** added "status roles."

Verified against the repo:
- `src/styles/tokens.css` defines **no** `--success`, `--warning`, or `--info` — not in `:root`, not
  in `.dark`, not even as a placeholder. (The only status-ish role present is `--destructive`.)
- `src/styles/globals.css` `@theme inline` maps **every** declared role to a `--color-*` utility and
  explicitly does **not** map success/warning/info — so `bg-success` / `text-warning` / `border-info`
  **do not resolve to anything**. A component that obeys the doc's own mandate ("Status feedback uses
  the status roles … components must not invent one-off feedback colors") emits a class that
  produces no color.
- No component uses them (`grep` for `bg-success|text-warning|bg-info|border-success` across `src` →
  zero hits).

This is the *exact* v1-E disease — "a taxonomy that promises feedback states it has no values to
render" — but worse than v1, because v1 at least did not assert the roles were **active**. v3 took a
deferred-value problem and *promoted it to an active role* while the value, the utility, and the
usage are all absent. "Role *values* are `Deferred`" is the fig leaf; the doc does not merely defer
the value, it asserts the role is **in the active set** and **mapped to a utility** (Tokens §
"maps each token to a Tailwind utility"). Both of those are false.

Disposition: cosmetic fix. Either (a) demote success/warning/info to a *Deferred* roles line ("status
roles beyond `destructive` are deferred to the design spec; `destructive` is the only active feedback
role today"), or (b) actually add the three token pairs + `@theme inline` mappings before calling
them active. As written it is a slogan-as-gate at one remove — precisely the pattern the review warns
about.

### 2. "Palette is currently fully neutral (zero-chroma)" is false in the token file. (Novel)

Color § states: "The palette is currently fully neutral (zero-chroma)." The Deferred list and the
data-viz argument ("legible multi-series charts need chroma it does not provide") both lean on this.

`tokens.css` contradicts it:
- `:root` `--destructive: oklch(0.5 0.22 27.325)` — chroma **0.22**, hue red.
- `.dark` `--destructive: oklch(0.704 0.191 22.216)` — chroma **0.191**.
- `.dark` `--sidebar-primary: oklch(0.488 0.243 264.376)` — chroma **0.243**, hue **blue**.

So the live palette is **not** zero-chroma; it is "neutral except `destructive` (and an inherited
chromatic `sidebar-primary`)." This matters beyond pedantry:
- The data-viz deferral's stated *reason* ("the current neutral palette … needs chroma it does not
  provide") is built on a premise the file falsifies. The palette already carries two saturated hues.
- It undercuts dimension-5's defense: the author could have rebutted "zero-chroma forces a lightness
  mirror" by pointing at `destructive` as the one chromatic role — but the doc instead *doubles down*
  on the false "fully neutral" claim.

Fix: "The palette is **near-neutral**: chroma is reserved for `destructive` (and the reserved
`sidebar-primary`); whether an accent hue is introduced is a design-spec decision." One word
("fully") is doing false work.

### 3. The performance gate the doc points to does not assert what the doc says it asserts, and may not run. (Compounding on v1-C)

A11y/Perf § (disposition C): "Lighthouse **Performance** category ≥90 … median of repeated runs …
The field budgets … LCP, CLS, INP — are the real bars; CLS from late-loading webfonts is specifically
bounded. Exact numeric budgets and run count live in `tech.md`/CI."

Verified against CI:
- `lighthouserc.js` asserts `categories:performance ≥0.9`, `accessibility ≥0.9`, `best-practices`,
  `seo`. **There is no LCP, CLS, or INP assertion anywhere.** The doc's "the real bars … LCP, CLS,
  INP" point at budgets that **do not exist in the CI it cites**. "CLS from late-loading webfonts is
  specifically bounded" — there is no `cumulative-layout-shift` assertion at all.
- `numberOfRuns: 3` is set, and lhci's default `median-run` aggregation backs the "median" wording —
  this part is **fine**.
- But `total-byte-weight` is a `TODO_BYTE_WEIGHT_PLACEHOLDER` and the file's own header says
  **"STATUS: SCAFFOLD ONLY … Measurement is currently blocked by Task 19's Turbopack … failure
  (`pnpm build` does not complete)."** A perf gate whose build does not complete is not a blocking
  bar.
- `lhci.yml` triggers on **`deployment_status`** (preview deploy), not on `pull_request`. So
  Lighthouse does **not** "block the build" in the PR-merge sense for the perf category; it runs
  post-deploy. The doc's framing ("Every visual choice lives within the performance gate") implies a
  pre-merge bar that the workflow trigger does not provide.

This is the v1-C overclaim returning one layer down: v1-C named the category and the metrics to cure
"≥90 is a slogan," but the named metrics (LCP/CLS/INP) are not actually enforced, and the gate's
substrate is scaffold/blocked. Pointing to CI for the numbers is correct *steering hygiene*; asserting
specific metrics "are the real bars" when CI enforces none of them is a fresh overclaim.

### 4. "Every route verified" (theme parity, responsive, perf) is contradicted by what CI actually visits. (Novel)

A11y § names the audited unit emphatically: "**every route** (theme parity, responsive)" and Theme
parity/Responsive: "**every route** verified in both themes and at the named Tailwind breakpoints."

The `(site)` group has ~17 page routes (`/`, `/about`, `/now`, `/projects`, `/projects/[slug]`,
`/resources`, `/slashes`, `/sitemap`, `/colophon`, `/contributions`, `/contact`, `/profile`, `/blog`,
`/blog/[slug]`, blog tag/category/preview routes). `lighthouserc.js` audits **7 URLs**: `/profile`,
`/contact`, `/blog`, and four `/blog/fixture-*` routes. The homepage `/`, `/about`, `/now`,
`/projects`, `/resources`, `/slashes`, `/sitemap`, `/colophon`, `/contributions` are **not** audited
by Lighthouse at all.

The doc's own "Enforcement is a floor" paragraph honestly concedes that axe "only evaluates the DOM
states the run renders … an unvisited state is not a passed check." Good — but that humility is
applied to *states/breakpoints/themes*, not to **whole routes that CI never visits**. "Every route
verified" is asserted in two places as a binding gate, while the perf/responsive tooling visits a
hand-picked subset. Either the audited-unit claim must be scoped honestly ("the routes enumerated in
`lighthouserc.js` / the axe E2E suite") or the route coverage must actually be every route. As
written it is the *audited-unit-as-slogan* failure the v2-E disambiguation was meant to retire.

### 5. The matched-pair principle is contradicted by a lightness-mirror token file; no-flash gate has no mechanism and `disableTransitionOnChange` is not set. (Compounding — dimension 5)

Two sub-findings, both verified:

(a) **Matched pair vs. lightness mirror.** Principle 4 and Color § assert light/dark are "a matched
pair, never one derived from the other." In `tokens.css` the neutral roles are near-perfect lightness
inversions (e.g. `--foreground` 0.145↔0.985, `--background` 1↔0.145, `--card` 1↔0.205), and
`--chart-1..5` are **byte-for-byte identical** across `:root` and `.dark`. A reviewer cannot
distinguish this from "dark = lightness-flip of light." The principle is aspirational language with
no test behind it; the doc even says "parity is verified" but the only verification in the tree is
axe contrast per theme, which a pure mirror would also pass. The principle as stated is **unfalsifiable**
against the current file — there is no artifact or check that would fail if dark *were* mechanically
derived. Recommend softening to a rule that can be tested (e.g. "each theme's values are authored and
contrast-tuned independently; identical cross-theme values are permitted only where intentional, e.g.
reserved `chart-*`") or dropping the "never derived" absolutism.

(b) **No-flash gate has no named mechanism.** Spacing/Motion § and Color §: "theme toggles must not
flash (handled by `next-themes`' class-on-`<html>`)." Verified: `layout.tsx` sets
`suppressHydrationWarning` and uses `ThemeProvider attribute="class" defaultTheme="system"
enableSystem` — but **`disableTransitionOnChange` is not set**, and there is no documented test for
the pre-hydration FOUC path. `next-themes` injects a blocking script to set the class before paint
(this prevents the *initial-load* theme flash), but that is a different thing from "toggle must not
flash," which is governed by CSS transitions on color tokens — exactly what `disableTransitionOnChange`
exists to suppress. The doc treats "class-on-`<html>`" as if it discharges both, and it discharges
neither as a *gate* (no test). It is an assertion, not a gate with a mechanism. If motion/transitions
on background-color are later added (Motion is deferred-but-allowed), the no-flash claim silently
breaks with nothing to catch it.

---

## Top 3 conclusions to challenge or reverse

1. **"Active semantic roles: … `success`/`warning`/`info`."** Reverse. These are not active by any
   operational definition: no token value, no `@theme` utility, no consumer. Calling them active while
   their values are `Deferred` is internally contradictory (a role mapped to a utility, per Tokens §,
   cannot also have no mapping). Demote to a deferred-roles note or implement them. This is the single
   most load-bearing falsehood in the doc because it sits inside the role taxonomy that every
   component is told to consume.

2. **"The palette is currently fully neutral (zero-chroma)."** Reverse to "near-neutral." Two
   chromatic roles exist in the live file (`destructive`, and the reserved blue `sidebar-primary`).
   The data-viz deferral's justification inherits the error and should be re-grounded ("no chromatic
   *categorical* ramp," not "no chroma at all").

3. **"LCP, CLS, INP … are the real bars" + "every route verified."** Challenge both. CI asserts only
   category min-scores on 7 enumerated URLs; it asserts no LCP/CLS/INP and visits a minority of routes,
   and its byte-weight substrate is a blocked TODO scaffold. The doc should either (a) state the gate
   as "Lighthouse category min-scores on the routes enumerated in CI" (honest, steering-appropriate)
   or (b) the metric/route claims need real assertions behind them. Asserting specific Core Web
   Vitals as "the real bars" while enforcing none of them is the v1-C overclaim recurring.

---

## What's missing (and what is legitimately spec-level)

- **A roles-table reconciliation between this doc and `tokens.css`.** Not the values — those are
  rightly deferred — but the *set membership*. The doc's "active roles" list and the file's actual
  defined roles disagree (success/warning/info present in doc, absent in file; `chart-*`/`sidebar-*`
  present in file, "reserved" in doc but `sidebar-primary` carries blue chroma the doc's neutrality
  claim denies). The "divergence … is a review item on any PR that touches tokens" control did **not**
  catch the live divergence that exists *right now* — which is the proof that a "review item" with no
  automated check is a hope, not a control (dimension 4 confirmed). A trivial CI assertion ("every
  role in design-system.md's active list resolves to a `--color-*` in globals.css, and vice-versa")
  would make the governance claim real. This belongs in steering's *gate list* as a rule; the script
  is spec/CI.

- **A no-flash test or an explicit `disableTransitionOnChange` decision.** Spec-level to *implement*,
  but the doc should not claim "must not flash" as a discharged gate while the toggle-transition path
  is uncovered. State it as a rule with a named owner of the check, or downgrade to "deferred (motion)."

- **Route coverage definition for the gates.** Either "every route" is the rule and CI must grow to
  match, or the rule is "the enumerated audited set + manual review for the rest." The current text
  asserts the strong version while CI implements the weak one. Resolving which is binding is
  steering-level; expanding the URL list is spec/CI.

- **Legitimately spec-level, do NOT inline:** the OKLCH role values, the legal pairing matrix +
  max nesting depth, the type/spacing scales, breakpoint layouts, motion tokens, elevation, the
  z-index values, print/i18n posture. The doc defers these correctly and naming *where* they resolve
  is the right move. No fault there.

- **Concrete-value boundary (dimension 6): mostly held, two intentional leaks.** `--radius` (the
  single dial) and the ~75ch measure ceiling are the only concrete values in the doc. The doc *claims*
  these as deliberate rules ("radius/measure are rules, the rest deferred"), and that is defensible —
  a single radius dial and a measure ceiling are architecture, not churn. This is fine; the boundary
  is consciously drawn, not leaking by accident. One nit: `--radius: 0.625rem` lives in `tokens.css`
  and the doc wisely does **not** restate the number — good discipline.

---

## New internal contradictions introduced by v3 (dimension 6)

- **Tokens § says the `@theme inline` block "maps each token to a Tailwind utility"** while Color §
  lists success/warning/info as active roles. The mapping block does **not** map them. The two
  statements cannot both be true. (Same root as Finding 1, but it is a *self*-contradiction within the
  doc, independent of the code.)
- **"Reserved (out of contract)" `sidebar-*` vs. "fully neutral (zero-chroma)."** The reserved
  `--sidebar-primary` is blue (`oklch(0.488 0.243 264.376)`). The doc reserves it *and* claims the
  palette is zero-chroma; the reserved set is chromatic. Internally these two v3 sentences fight.

---

## Things that are actually fine (one line each)

- v2-D `chart`/`sidebar` "reserved, unused": **holds** — zero component usage confirmed; this is a
  real fix, not a rename (the only wrinkle is the chroma-vs-neutrality contradiction above, not the
  reservation itself).
- v2-A spacing source-of-truth, v2-B named breakpoints, v2-C image/icon a11y, v2-F measure ceiling:
  **hold** — coherent, testable rules, no code contradiction found.
- v1-G playground "cascade/stacking scope, not encapsulation" + keyboard/focus floor: **holds** —
  matches `@layer playground` in `globals.css`; honest about inheritance.
- Lighthouse "median of repeated runs": **backed** — `numberOfRuns: 3` + lhci default median-run.
- The disabled-exemption vs. non-text-contrast collision (dimension 2): the doc threads it correctly
  — disabled is exempt from **text** contrast, while 1.4.11 governs **boundaries that convey state**;
  a *disabled* control by definition is the not-actionable state, so its border is not conveying an
  actionable affordance. The two rules do not actually collide as written. Fine.

---

## Convergence verdict

**Still has must-fix structural issues — but they are narrow and mechanical, not architectural.**

v3's *structure* (rules-not-slogans, deferral discipline, audited-unit naming) is sound and converging.
What is not converged is **truthfulness against the implementation**: three asserted-as-binding facts
(success/warning/info active; zero-chroma palette; LCP/CLS/INP + every-route enforcement) are false or
unbacked against `tokens.css`, `globals.css`, and `lighthouserc.js`. Critically, the governance
control v3 introduced ("divergence is a review item") **failed to catch divergence that exists in the
tree today**, which is the strongest possible evidence that a manual review-item is not a control.

Must-fix before acting: Findings 1, 2, and the metric/route half of 3–4 — all are 1–2 line edits
(demote the roles, change "fully" to "near-", scope the perf/route claims to what CI enforces) plus
one cheap CI assertion to make the role-set governance real. Do those and v3 converges; ship the rest.
