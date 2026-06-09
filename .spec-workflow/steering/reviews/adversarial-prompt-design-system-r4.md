# Adversarial Review — steering/design-system (v4)

You are a principal product designer and design-systems architect. Tear apart this document and find
every weakness — gaps, ambiguities, contradictions, unstated assumptions, failure modes, and
remedies that merely relabel a problem. Do not validate or support. Use directive framing throughout.

**Verify against the actual repo — do not reason abstractly.** The strongest findings in the prior
round came from reading the real files. Before asserting a claim is true or false, check it:
- `/home/mcf/repo/matthew-field.ca/src/styles/tokens.css` (defined roles, chroma values, light/dark pairs)
- `/home/mcf/repo/matthew-field.ca/src/styles/globals.css` (`@theme inline` mappings)
- `/home/mcf/repo/matthew-field.ca/lighthouserc.js` and `.github/workflows/lhci.yml` (what is actually asserted, run count, trigger)
- the `next-themes` ThemeProvider usage (whether `disableTransitionOnChange` is set)

## Target document
/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/design-system.md

This is a **steering** doc for a Next.js 16 + Tailwind v4 + shadcn/ui (OKLCH, `next-themes`) site. It
is deliberately **direction-light**: deferring the *identity* is legitimate and not a fault. Fault it
where a rule/gate it asserts as binding is unverifiable, wrong, self-contradictory, or — the focus
this round — **so deferred that it binds nothing today while still being written as a "blocking gate."**

## Prior Review Context

Rounds v1, v2, and v3 found issues the author has since addressed across v3 and v4 — do NOT
re-discover them. VERIFY each holds; flag **Recurring (escalate)** only if a fix is cosmetic or
reintroduced:
- v1/v2 (addressed in v3): pair-level contrast (matrix deferred), expanded a11y contract, Lighthouse
  category/median/CWV, status roles + state conventions, governance contradiction resolved in
  `tokens.css`/`globals.css`, playground = cascade/stacking scope, spacing/breakpoint sources of
  truth, image/icon a11y, chart/sidebar reserved, "surface" disambiguated, measure as ceiling.
- r3 (addressed in v4, all r3-verified against code): r3-1 `success`/`warning`/`info` were "active"
  but undefined → now demoted to needed-but-deferred (only `destructive` defined); r3-2
  "zero-chroma" was false → now "near-neutral"; r3-3 perf gate overclaimed CI → now states
  Performance≥90/median-3 is the only current assertion, LCP/CLS/INP+byte-weight deferred; r3-4
  "every route" overclaimed → now "intent, partial coverage"; r3-5 matched-pair/no-flash → qualified
  + `disableTransitionOnChange` deferred; r3-meta manual review-item wasn't a control → downgraded,
  automated active-role↔token check deferred.

Classify each finding **Novel** / **Compounding** / **Recurring**. Spend effort on Novel/Compounding.

## Analysis dimensions (attack these)

1. **Honest-but-empty gates.** v4's move is "state the rule, admit it isn't enforced in CI yet,
   defer the enforcement." Challenge whether the "Non-Negotiable Gates" section still earns that
   title: count how many bars are actually enforceable *today* vs. deferred to CI/spec. Stress-test
   whether a "blocking gate" that the document itself says is "not yet asserted in CI" is a gate at
   all, or a roadmap item mislabeled as a bar. Name each gate as enforced-now vs. aspirational.
2. **Re-verify the two corrected facts.** Confirm against `tokens.css`/`globals.css` that
   `success`/`warning`/`info` are genuinely absent (and that the doc's "active roles" list now
   exactly matches the defined+mapped roles — no over- or under-statement), and that "near-neutral"
   is accurate (which roles carry chroma). If the active-roles list still mismatches the file in
   either direction, that is Recurring (escalate).
3. **New contradictions from the softening.** v4 added hedges ("intent", "not yet asserted",
   "Deferred: CI") across Performance, Theme parity/Responsive, governance, motion no-flash.
   Hunt for places where a hedge in one section now contradicts an absolute stated elsewhere (e.g.
   Principle 5 "Fast is a feature" / Principle 3 "Accessible by default … a gate" vs. the gates
   admitting they aren't enforced; "axe blocks the build" vs. coverage being partial).
3a. **The CI-upgrades deferral.** A new Deferred item bundles "LCP/CLS/INP + byte-weight, full-route
   coverage, and the active-role↔token check." Challenge whether bundling enforcement mechanisms into
   a *design-spec* deferral is the right home at all (these are CI/build tasks, arguably `tech.md`'s
   domain, not the design spec's) — i.e. is the deferral pointing at the wrong owner?
4. **Altitude / length creep.** v4 is the longest version yet. Challenge whether it is still steering
   or has become a spec/CI-backlog in disguise; identify any concrete value still asserted here that
   should live in code (e.g. `numberOfRuns: 3`, the `≥3:1`/`≥4.5:1` numbers, `disableTransitionOnChange`).
5. **Anything genuinely new** the prior rounds missed in Components, Typography, Design Tokens, or
   Voice & Tone — only if concrete.

## Closing deliverables
- **Top 5 risks/gaps**, each tagged Novel / Compounding / Recurring.
- **Top 3 conclusions to challenge or reverse**, with reasoning.
- **What's missing** — keep steering vs. spec/tech honest; if a missing artifact belongs in code or
  `tech.md`, say so rather than demanding it be inlined here.

Be specific; cite failure scenarios, not abstract risks. If something is fine, say so in one line.
**End with an explicit judgment: is v4 converged (no must-fix structural issues remain), or not — and
if not, list only the true must-fixes.**

## Output
Write your analysis to:
/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/reviews/adversarial-analysis-design-system-r4.md
