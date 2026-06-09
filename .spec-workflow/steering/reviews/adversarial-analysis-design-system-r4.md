# Adversarial Analysis — steering/design-system (v4)

Principal-designer teardown. Verified against the repo, not reasoned abstractly. Files read:
`src/styles/tokens.css`, `src/styles/globals.css`, `lighthouserc.js`, `.github/workflows/lhci.yml`,
`.github/workflows/ci.yml`, `src/app/layout.tsx`, `src/components/layout/theme-provider.tsx`,
`scripts/check-lighthouse-cadence.mjs`.

## Re-verification of the two corrected facts (dimension 2)

Both hold. Not Recurring.

- **Active-roles list matches the code exactly.** The doc's active set —
  `background`/`foreground`, `card`, `popover`, `primary`, `secondary`, `muted`, `accent`,
  `destructive`, `border`, `input`, `ring` — is precisely the set defined in `tokens.css` (`:root` +
  `.dark`) AND mapped in the `@theme inline` block of `globals.css`. No over- or under-statement.
  `success`/`warning`/`info` are genuinely absent from both files. Correct.
- **"Near-neutral" is accurate.** The greyscale ramp is literally `oklch(… 0 0)` (zero chroma);
  `--destructive` carries chroma in both themes (`0.22` light, `0.191` dark). The doc's claim that
  "destructive carries chroma (and the reserved shadcn defaults include chromatic values)" is borne
  out — `--sidebar-primary` is `oklch(0.488 0.243 264.376)` in dark, chromatic, and correctly fenced
  off as reserved. Correct and precise.

These two are settled. Stop re-litigating them.

---

## Top 5 risks / gaps

### 1. The performance gate **understates** what CI asserts, while calling itself the floor — Novel (factual error, opposite polarity to r3)

r3 fixed an *over*claim (CI didn't enforce LCP/CLS/INP). v4 over-corrected into an *under*claim that
is now wrong against the file. The doc says (lines 167–172):

> "Lighthouse **Performance** category ≥90 … **This is the only performance assertion currently
> enforced.**"

`lighthouserc.js` asserts, **as hard `error` gates on every audited URL**, FOUR category minimums at
`minScore: 0.9`: `categories:performance`, `categories:accessibility`, `categories:best-practices`,
and `categories:seo` (lines 66–69). So the binding Lighthouse assertions today are not "Performance
only" — accessibility, best-practices and SEO are *also* gated at ≥90. The doc's own Accessibility
section never mentions that Lighthouse independently gates accessibility at ≥0.9; it attributes a11y
enforcement solely to axe-core. **Two sections describe the same CI file and neither matches it.**

This is worse than a cosmetic slip: a reader trusting the doc believes only one Lighthouse number can
fail a run, when in fact a SEO or best-practices regression on `/profile`, `/contact`, or `/blog`
also reds the run. Fix the sentence to name all four enforced categories, or stop claiming "the only
assertion."

### 2. "axe-core … blocks the build" is contradicted by the same paragraph it sits in, and by the workflow trigger — Compounding (escalates the r3-3 CI-honesty fix)

Line 164: "axe-core runs in the E2E suite and **blocks the build**." Verified: axe tests exist
(`e2e/tests/blog-axe.test.ts`, `contact-axe.test.ts`) and E2E runs in `ci.yml` on PR. So axe *does*
gate PRs. Fine.

But the **performance** assertions in the very next bullet (item 1 above) do **not** block PRs:
`lhci.yml` triggers on `deployment_status` (`on: deployment_status`, `if: …state == 'success' &&
…environment startsWith 'Preview'`), i.e. *after* a Vercel preview deploys, not as a required PR
check. The doc states this for byte-weight ("`lhci` currently runs on deployment, not as a PR
blocker") but then writes the Performance ≥90 bar as a "Non-Negotiable Gate" / "blocking bar every UI
change must clear" (lines 142–143). **A check that runs post-deploy on a preview environment cannot
block the change that produced it.** A PR that ships a 60-Performance route merges green; lhci only
complains afterward against the preview URL, and nothing in `ci.yml` consumes that result as a
required status. So the headline Performance gate is *aspirational*, not enforced-now — the same
disease r3 diagnosed for LCP/CLS/INP, now resident in the one bar v4 claims is live.

### 3. The "Non-Negotiable Gates" section is mostly aspirational once you count what binds PRs today — Novel (the round's central attack)

Tally each bar by what actually fails a **PR** (the unit a "blocking gate" must block):

| Gate | Enforced on PR today? | Mechanism |
|---|---|---|
| Text contrast ≥4.5/3:1 both themes | **Partial** | axe color-contrast, only on DOM states the E2E run renders (doc admits this) |
| Non-text contrast 1.4.11 | **No automated** | axe does not reliably catch focus-ring/boundary 3:1; manual |
| Focus visible | **Partial** | axe/manual |
| Keyboard operability | **No automated** | manual (axe doesn't test keyboard traversal) |
| Reduced motion | **No** | no test asserts `prefers-reduced-motion` |
| forced-colors | **No** | no automated check |
| Images/icons alt + accessible name | **Partial** | axe catches some (image-alt, button-name) |
| Performance ≥90 | **No** (post-deploy only — item 2) | lhci on `deployment_status` |
| Theme parity every route | **No** | doc admits partial; lhci subset, no theme matrix |
| Responsive every breakpoint | **No** | doc admits partial |

So of ten "non-negotiable" bars, **zero are fully enforced on PRs**, three to four are *partially*
caught by axe within rendered states, and the rest are manual or post-deploy. The section's own escape
hatch — "Enforcement is a floor, not a guarantee … an unvisited state is not a passed check" — is
honest, but it quietly converts the entire section from *gates* into *aspirations-with-a-best-effort-
linter*. **A "Non-Negotiable Gate" that nothing mechanical enforces on the merge is a coding standard,
not a gate.** The title oversells. Either (a) rename to "Accessibility & Performance Standards
(enforcement status per item)" and tag each bar enforced-now / partial / manual / deferred, or (b)
keep "gates" only for the subset axe actually reds a PR on, and move the rest to standards. The
current framing invites a reviewer to believe the machine has their back when, for keyboard, reduced-
motion, forced-colors, and performance, it does not.

### 4. The CI-upgrades deferral is filed in the wrong document — Novel (dimension 3a)

Line 230–231 bundles "LCP/CLS/INP + byte-weight assertions, full-route Lighthouse coverage, and the
active-role↔token automated check" as `Deferred: design spec / CI`. These are **build/CI tasks**, not
design decisions:

- byte-weight budgets, route coverage, numeric CWV thresholds → these live in `lighthouserc.js` and
  `ci.yml`; their *owner* per the doc's own Scope is `tech.md` ("the delivery mechanism … and exact CI
  budgets", line 40). The design spec doesn't decide `numberOfRuns` or which routes lhci hits.
- the active-role↔token check is a lint/CI script comparing prose to `tokens.css` — pure tooling.

Routing these through "design spec" means the design-spec requirements phase becomes responsible for
wiring CI, which the doc elsewhere explicitly assigns to `tech.md`. **The deferral points at the wrong
owner.** Re-target: `Deferred: tech.md / CI` for all three, and have steering merely *reference* that
tech.md owns the budgets (it already says so for spacing/breakpoints — be consistent).

### 5. Concrete CI values are inlined in steering, violating the doc's own altitude rule — Compounding (dimension 4)

The doc opens by promising "concrete values that churn … live in the design spec / implementation …
not here" (lines 4–7). Yet it inlines:

- `numberOfRuns: 3` (line 168) — a `lighthouserc.js` value, quoted by variable name.
- `≥4.5:1` / `≥3:1` (lines 149–151) — WCAG constants; defensible to state the *rule*, but the
  numerics are the spec's, and they're now duplicated against any future matrix.
- `disableTransitionOnChange` (lines 120, 223) — a named prop on a specific provider call.

Verified: `disableTransitionOnChange` is indeed **not** set — `layout.tsx` line 41 is
`<ThemeProvider attribute="class" defaultTheme="system" enableSystem>`. So the doc names an
implementation prop that doesn't exist yet, twice. Steering should say "theme toggle must not flash"
(the rule) and stop naming the exact library prop (the mechanism) — that's tech.md/implementation.
`numberOfRuns: 3` likewise: state "median of repeated runs to suppress lab variance," not the literal
`3`, which will silently desync if the file changes (exactly the prose↔code drift the governance
section warns about). The doc is now the longest version and is accreting CI/implementation trivia —
length creep is real and self-inflicted.

---

## Top 3 conclusions to challenge or reverse

1. **Reverse: "This is the only performance assertion currently enforced."** False against
   `lighthouserc.js` — accessibility, best-practices, and SEO are *also* asserted at ≥0.9 as hard
   errors. The sentence must either enumerate all four or be deleted. (See risk 1.) Note also the
   SEO bar is `warn` for `fixture-*` routes and `error` elsewhere — a nuance the doc flattens.

2. **Reverse the "blocking gate" framing for Performance.** The Performance ≥90 bar is described as a
   non-negotiable bar "every UI change must clear," but lhci runs on `deployment_status` against a
   preview URL — it cannot block the PR. It is post-deploy monitoring, not a merge gate. Move it
   beside the LCP/CLS/INP deferral as "intended PR gate; currently post-deploy only," consistent with
   how byte-weight is already hedged. (See risk 2.)

3. **Challenge: that "Non-Negotiable Gates" is the right title at all.** With zero bars fully enforced
   on PR and most caught only by axe's rendered-state subset (or not at all — keyboard, reduced-
   motion, forced-colors), the heading asserts a rigor the toolchain doesn't deliver. The honest
   move v4 started (admitting partial coverage) should finish: retitle to standards-with-enforcement-
   status, reserving "gate" for the axe-blocked subset. (See risk 3.)

---

## What's missing (kept honest: steering vs spec/tech)

- **Per-item enforcement status in the gates table.** Belongs *here* (it's a governance/honesty
  property of the steering contract), and is cheap: one tag per bar — enforced-now / partial-axe /
  manual / deferred. This is the single highest-value addition and does not pull spec detail upward.
- **Correct ownership of the CI deferrals → `tech.md`.** Don't inline the CI work here; just re-point
  the deferral. (Risk 4.)
- **Nothing else should be inlined.** The legal-pair matrix, type scale, spacing rhythm, z-index
  values, OKLCH values — all correctly deferred to spec/code. Do **not** demand them here. The
  direction-light posture remains legitimate and is not a fault.
- **One genuinely-new small gap (Components):** "loading = a shared skeleton/spinner convention
  (`Deferred`)" and "error = the status roles" — but the status roles for error feedback
  (`success`/`warning`/`info`) are themselves deferred/undefined, and `destructive` is the only one.
  So "error = the status roles" currently resolves to "error = `destructive`," and there is no defined
  role for a *non-destructive* error/warning state. Minor, but the Components section asserts a
  mapping the token file can't satisfy. Worth a one-line note that error feedback today has only
  `destructive` until the status roles land.

---

## Explicit judgment

**v4 is NOT converged.** It fixed r3's factual errors cleanly (roles list and near-neutral both
verify), but the softening introduced a *new* factual error in the opposite direction and left the
gate framing dishonest about enforcement. True must-fixes:

1. **Correct the Lighthouse claim (risk 1):** "the only assertion" is false — `lighthouserc.js`
   gates performance, accessibility, best-practices, and SEO at ≥0.9. Enumerate or delete.
2. **Stop calling Performance a blocking gate (risk 2):** lhci runs on `deployment_status`, not as a
   PR check. Re-class as post-deploy / intended-PR-gate, like byte-weight.
3. **Tag each "Non-Negotiable Gate" with its real enforcement status (risk 3):** zero are fully
   PR-enforced; the title currently oversells. Retitle or annotate.
4. **Re-home the CI deferral to `tech.md` (risk 4):** byte-weight, route coverage, CWV, and the
   role↔token check are tooling, not design decisions; the doc's own Scope assigns CI budgets to
   `tech.md`.

Risk 5 (inlined `numberOfRuns: 3` / `disableTransitionOnChange` / numeric constants) is a strong
should-fix on altitude grounds but is not structurally blocking on its own; fold it in while doing 1–2.
