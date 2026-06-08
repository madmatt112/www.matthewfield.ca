# Adversarial Review — visual-design/requirements (v3)

You are a principal product designer and design-systems lead. Tear apart this requirements document
for real weaknesses — ambiguity, untestable criteria, scope errors, contradictions with steering or
the codebase. Do not validate or support. Use directive framing. This is **round 3** of a
convergence loop with a v6 cap; the prior two rounds were substantive and addressed. **Be honest: if
the doc is converged, say so — do NOT manufacture findings or escalate MINOR wording to keep the loop
alive.** Reserve MUST_FIX/SHOULD_FIX for genuine contradictions, false claims about the
code/steering, untestable-yet-load-bearing criteria, or real scope errors.

## FIRST: load the frontend-design lens
Invoke the **frontend-design** skill (Skill tool, `frontend-design:frontend-design`) and apply its
distinctiveness / anti-generic standard to the distinctiveness-related requirements. If unavailable,
use the same principles and say so.

## Ground every claim in the real files (a misstatement is auto-MUST_FIX)
- Target: `/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/visual-design/requirements.md`
- `/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/design-system.md`
- `/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/product.md`
- `/home/mcf/repo/matthew-field.ca/src/styles/tokens.css` and `globals.css` (token roles actually
  defined/mapped — the prior round found a token-reality contradiction here).

## Prior Review Context (addressed; do NOT re-discover — verify, and flag Recurring only if cosmetic)
- r1 (in v2): distinctiveness R3, type voice R4, artifacts R8, accent allow-list R2/R8.4, CI scope
  R10 + outcome-based R5/R7.2, testability R2.1/R1.2/R1.1.
- r2 (in v3): **token-reality** — brand accent is now a NEW distinctly-named role (`brand`/`link`),
  not the existing shadcn `accent` (neutral tint, stays neutral) [R2.2]; **zero-chroma** numeric rule
  for neutral roles [R2.1]; **R3 distinctiveness bar** (R3.5 ≥2 craft choices not accent-alone; R3.6
  "cannot be distinguished from generic shadcn-neutral → FAILS"); **R1.3** reconciled with R3.2/R8.3
  (signature most-fully on priority surfaces); **R8.5** print/PDF profile styling.

Classify each finding **Novel** / **Compounding** / **Recurring**. Spend effort on Novel/Compounding.

## Analysis dimensions
1. **Verify the r2 fixes hold against code.** Confirm R2.1's zero-chroma rule matches `tokens.css`
   (the neutral ramp is C=0; `destructive` carries chroma — does R2.1's role list correctly exclude
   the chromatic roles?). Confirm R2.2's "new distinctly-named role, not shadcn `accent`" is
   unambiguous and that nothing else in the doc still says "introduce the accent role" in a way that
   collides. Flag Recurring only if a fix is cosmetic.
2. **Is R3's distinctiveness bar now genuinely testable** (R3.5/R3.6), or does "cannot be
   distinguished from a generic shadcn-neutral site" still collapse to arbiter opinion? Decide whether
   it is good-enough for a requirements-level obligation (Design produces the actual treatment) or a
   real gap.
3. **New contradictions / over-correction from v3.** The doc is now 10 requirements with many
   criteria. Hunt for internal conflicts among R2 (restraint), R3 (signature), R8 (priority surfaces,
   artifacts, print/PDF) — e.g. does R8.5 print/PDF belong here or is it Design/tech detail? Does the
   `brand`/`link` naming create any ambiguity about which role is the focus ring vs link color?
4. **Residual completeness or testability gaps** — only genuine requirements-level ones, not
   correctly-deferred Design values (accent OKLCH, type scale, signature treatment, spacing steps,
   exact print stylesheet are Design's).

## Closing deliverables
- **Top risks/gaps** (only real ones; fewer is better if close), each tagged Novel/Compounding/Recurring + severity.
- **Top conclusions to challenge/reverse**, if any.
- **What's missing** — true requirements-level gaps only.
- End with EXACTLY this block (no prose after):

```
VERDICT: converged | iterate
MUST_FIX: <n>
SHOULD_FIX: <n>
MINOR: <n>
DESIGN_READY: yes | no
ESCALATE: none | <one-line reason>
```

`converged` is the correct verdict if only MINOR remains. MUST_FIX + SHOULD_FIX is the only fuel; do
not nitpick-pad. If genuinely fine, say so in one line.

## Output
Write your analysis to:
/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/visual-design/reviews/adversarial-analysis-requirements-r3.md
