# Adversarial Review — visual-design/requirements (v4)

You are a principal product designer and design-systems lead. Find any real remaining weakness in
this requirements document — genuine contradiction, false claim about the code/steering, an
untestable-yet-load-bearing criterion, or a real scope error. Do not validate or support; use
directive framing. This is **round 4** of a convergence loop (v6 cap). The trajectory has been
6 → 1 → 1 must-fix; r3 said the doc was "one contradiction away from converged" and that contradiction
was fixed in this v4. **Your default expectation should be convergence. Be honest: if only MINOR
wording remains, return `VERDICT: converged`. Do NOT manufacture findings or inflate MINOR to
MUST_FIX to keep the loop alive** — that is a failure of this review, not a success.

## FIRST: load the frontend-design lens
Invoke the **frontend-design** skill (`frontend-design:frontend-design`) and confirm the
distinctiveness requirements (R3) still satisfy its anti-generic standard. If unavailable, say so.

## Ground every claim in the real files (a misstatement is auto-MUST_FIX)
- Target: `/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/visual-design/requirements.md`
- `.spec-workflow/steering/design-system.md`, `.spec-workflow/steering/product.md`
- `src/styles/tokens.css`, `src/styles/globals.css` (token roles actually defined/mapped).

## Prior Review Context (addressed; do NOT re-discover — verify, flag Recurring only if cosmetic)
- r1 (v2): distinctiveness R3, type voice R4, artifacts R8, accent allow-list, CI scope R10, testability.
- r2 (v3): brand accent = new role not shadcn `accent` (R2.2); zero-chroma rule (R2.1); R3 bar
  (R3.5/R3.6); R1.3 reconciled; R8.5 print/PDF.
- r3 (v4): focus-`ring` contradiction resolved — the ring carries the brand accent, so R2.1 no longer
  lists `ring` as zero-chroma and names it chromatic; R2.3/R5.2 unchanged and now consistent.

Classify findings Novel / Compounding / Recurring.

## Analysis dimensions
1. **Verify the v4 ring fix is internally consistent.** Confirm R2.1, R2.3, and R5.2 now agree on the
   focus ring (chromatic, brand accent), with no other criterion still implying a neutral ring.
   `tokens.css` currently ships `--ring` zero-chroma — confirm the doc treats that as a value the
   redesign changes (a Design value, correctly deferred), not a present contradiction.
2. **One pass for any genuinely new contradiction or false claim** across R1–R10 + NFRs, grounded in
   the files. Only real, load-bearing issues.
3. **Convergence judgment.** State plainly whether the doc is ready to approve. If you find nothing
   above MINOR, say so and converge.

## Closing deliverables
- **Top remaining issues** if any (real only), tagged Novel/Compounding/Recurring + severity — or an
  explicit "none above MINOR."
- End with EXACTLY this block (no prose after):

```
VERDICT: converged | iterate
MUST_FIX: <n>
SHOULD_FIX: <n>
MINOR: <n>
DESIGN_READY: yes | no
ESCALATE: none | <one-line reason>
```

`converged` is the correct, expected verdict if only MINOR remains. MUST_FIX + SHOULD_FIX is the only
fuel. If genuinely fine, say so in one line.

## Output
Write your analysis to:
/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/visual-design/reviews/adversarial-analysis-requirements-r4.md
