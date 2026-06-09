# Adversarial Review — steering/design-system (v5)

You are a principal product designer and design-systems architect. Tear apart this document and find
every real weakness — gaps, contradictions, unstated assumptions, failure modes, remedies that
relabel rather than fix. Do not validate or support. Use directive framing.

**Verify against the actual repo — do not reason abstractly.** Check claims before asserting them:
`/home/mcf/repo/matthew-field.ca/src/styles/tokens.css`, `.../globals.css`, `.../lighthouserc.js`,
`.github/workflows/lhci.yml`, the `next-themes` ThemeProvider in `src/app/layout.tsx`.

## Target document
/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/design-system.md

A **steering** doc for a Next.js 16 + Tailwind v4 + shadcn/ui (OKLCH, `next-themes`) site. It is
deliberately **direction-light** (deferring the identity is legitimate). This is the 5th review of a
doc with a v6 cap — the prior 4 rounds were substantive and have been addressed. **Be honest: if it
is converged, say so. Do not manufacture findings or escalate MINOR wording to keep the loop alive —
MINOR-only is not a must-fix.** Reserve must-fix for: a false claim about the codebase, an internal
contradiction, an unverifiable/wrong rule, or a real accessibility/scalability hole.

## Prior Review Context (addressed — do NOT re-discover; verify and only flag Recurring if a fix is cosmetic)

- v1/v2 (fixed in v3): pair-level contrast (matrix deferred), a11y contract, status roles, governance
  contradiction resolved in `tokens.css`/`globals.css`, playground = cascade/stacking scope,
  spacing/breakpoint sources of truth, image/icon a11y, chart/sidebar reserved, "surface"
  disambiguated, measure-as-ceiling.
- r3 (fixed in v4, r4 confirmed holding): status roles demoted to deferred (only `destructive`
  defined; active-roles list matches `tokens.css`/`@theme`), "near-neutral" palette.
- r4 (fixed in v5): v4 had over-corrected into an *underclaim* about CI and oversold "non-negotiable
  gates." **v5's structural fix:** the gates section now states the **standards** the design must meet
  and explicitly delegates *enforcement/coverage* to `tech.md`/CI (it no longer describes current CI
  state at all); CI-upgrade deferrals re-pointed to `tech.md`/CI; inlined CI trivia removed;
  Components "error" now names `destructive`.

Classify each finding **Novel** / **Compounding** / **Recurring**. Spend effort on Novel/Compounding.

## Analysis dimensions

1. **Standards vs. aspiration (the core v5 bet).** v5 removed CI-state description and made the gates
   "standards + a pointer to tech.md/CI." Challenge whether this is the right steering altitude or an
   evasion that leaves bars with no teeth. Is each bar still an objective, testable *standard* (a
   reviewer could rule pass/fail on a given screen), or has any become unfalfisiable now that
   enforcement is delegated away? Distinguish "durable standard, enforcement elsewhere" (legitimate)
   from "vague aspiration" (a finding).
2. **Residual self-contradiction from the v5 edits.** The doc still says things like "passing
   automated CI is a floor, not a guarantee" and points at `tech.md`/CI in several places. Hunt for
   any remaining place where the doc still asserts or implies a CI fact (e.g. the `lighthouserc.js`
   parenthetical under Performance) that could be wrong or that re-introduces the altitude problem v5
   set out to remove. Verify the one file reference it kept is not making an implicit false claim.
3. **Correctness of what remains asserted.** Re-verify against code: active-roles list still matches
   `tokens.css` + `@theme`; "near-neutral" still accurate; the WCAG ratio numbers (≥4.5:1 / ≥3:1)
   are correctly stated standards (these are durable WCAG values, NOT CI trivia — do not flag their
   presence as altitude creep). Flag only genuine mismatches.
4. **Anything genuinely unaddressed across the whole doc** (Components, Typography, Spacing, Design
   Tokens, Governance, Deferred Decisions, Voice & Tone) that all five rounds have missed — only if
   concrete and must-fix-worthy.

## Closing deliverables
- **Top risks/gaps** (3–5; fewer is fine if the doc is close), each tagged Novel / Compounding / Recurring and severity (must-fix / should-fix / minor).
- **Top conclusions to challenge or reverse**, if any, with reasoning.
- **What's missing** — keep steering vs. spec/tech honest; route code/CI items to `tech.md`/CI, not here.
- **Explicit convergence judgment:** state plainly whether v5 is **converged** (no must-fix structural
  issues) or not. If not, list ONLY the true must-fixes.

Be specific; cite failure scenarios, not abstract risks. If something is fine, say so in one line.

## Output
Write your analysis to:
/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/reviews/adversarial-analysis-design-system-r5.md
