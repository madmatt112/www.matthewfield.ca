# Adversarial Review Memory — requirements (visual-design)
Last updated: 2026-06-08 (v4 — CONVERGED at r4: 0 must / 0 should / 2 minor; awaiting approval)

## Cumulative Findings Summary

### Accepted — addressed in v2 (r1) / v3 (r2) — all verified holding in later rounds
- r1: distinctiveness R3, type voice R4, artifacts R8, accent allow-list R2/R8.4, CI scope R10 +
  outcome-based R5/R7.2, testability R2.1/R1.2/R1.1.
- r2: token-reality brand-accent-is-a-new-role (R2.2), zero-chroma numeric rule (R2.1), R3
  distinctiveness bar (R3.5/R3.6), R1.3 reconciled, R8.5 print/PDF. **r3 confirmed all hold against
  `tokens.css`** (shadcn `accent` is zero-chroma; no colliding "introduce the accent role" wording;
  R2.1 list correctly excludes chromatic `destructive`).

### Accepted — addressed in v4 (r3)
- **r3-MUST (Novel)** Focus-`ring` contradiction: R2.1 listed `ring` as zero-chroma while R2.3/R5.2
  put the chromatic brand accent on the focus ring (and `tokens.css` ships `--ring` zero-chroma). v4:
  the focus ring carries the brand accent → R2.1 drops `ring` from the zero-chroma list and names it
  chromatic. Single consistent resolution.

### Open for r4
- Verify the ring resolution is internally consistent (R2.1 ↔ R2.3 ↔ R5.2 now agree; `--ring` will
  become brand-tinted in the redesign — a Design value, correctly deferred).
- r3 stated the doc was "one contradiction away from converged." Expect r4 to converge unless a
  genuinely new issue surfaces. Do NOT manufacture findings.

## Patterns & Themes
- Trajectory: r1 = 6 must-fix (needs-revision) → r2 = 1 must/4 should → r3 = 1 must/0 should → v4.
  Converging fast; remaining issues are single, real, code-grounded contradictions, not theme-level
  gaps. The frontend-design lens (distinctiveness) is satisfied as of v3 (r2/r3 did not re-flag it).

## Guidance for Next Review (r4)
- **Do NOT re-discover** r1/r2/r3 findings — verify; Recurring(escalate) only if cosmetic.
- **Ground in repo + steering**; misstatement = auto-MUST_FIX. Require the VERDICT block.
- **License "converged"** — this doc is close; if only MINOR remains, converge. Forbid nitpick-pad.
