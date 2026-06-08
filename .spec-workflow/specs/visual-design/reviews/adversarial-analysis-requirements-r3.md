# Adversarial Analysis — visual-design/requirements (round 3)

Principal product-designer / design-systems lens, with the **frontend-design** skill loaded and its
anti-generic ("would a reviewer remember this, or is it cookie-cutter shadcn-neutral?") standard
applied to the distinctiveness requirements (R3).

Every claim below was checked against the real files:
`requirements.md`, `steering/design-system.md`, `steering/product.md`, `src/styles/tokens.css`,
`src/styles/globals.css`.

## Verification of the r2 fixes (do-not-re-discover — these HOLD)

- **Token-reality / R2.2.** `tokens.css` confirms the existing shadcn `--accent` is zero-chroma in
  both themes (`oklch(0.97 0 0)` light, `oklch(0.269 0 0)` dark). R2.2's "new, distinctly-named
  role (`brand`/`link`), SHALL NOT repurpose the existing shadcn `accent`, which SHALL stay neutral"
  is accurate and unambiguous. A grep of the doc for "accent" shows every remaining mention
  distinguishes *brand accent* from *shadcn `accent`*; no line still says "introduce the accent
  role" in a colliding way. **Fix holds — not re-flagged.**
- **R2.1 zero-chroma rule.** Matches `tokens.css`: the listed neutral roles (`background`,
  `foreground`, `card`, `popover`, `secondary`, `muted`, `border`, `input`, `ring`, shadcn `accent`)
  are all C=0; `destructive` carries chroma (0.22 / 0.191) and is correctly excluded ("only the
  brand accent and the status roles carry chroma"). The reserved `chart-*`/`sidebar-*` are
  out-of-contract per steering, so their stray chroma (`sidebar-primary` in `.dark`) is correctly
  out of scope. **Numeric rule is correct.**
- **R3 distinctiveness bar (R3.5 / R3.6).** Through the frontend-design lens this is good-enough for
  a *requirements-level* obligation: it fixes what must be true (≥2 deliberate craft choices, not
  accent-alone; the result must beat a generic shadcn-neutral baseline; judged against a written
  rationale + reference targets by a *named* arbiter — Design approval + adversarial pass per R1.3).
  Design still produces the treatment. It rests on arbiter judgment, but that is appropriate and
  bounded, not an untestable gap. **Not a finding.**
- **R8.5 print/PDF placement.** Steering's Deferred Decisions explicitly hands "Print / PDF styling
  for the recruiter-facing profile" to the *design spec*. R8.5 lives where steering put it.
  **Correctly placed — not a finding.**
- **R6.3 vs steering.** R6.3 ("every active role exists in `tokens.css` + `@theme`") is consistent
  with steering (only `destructive` is active today; `success`/`warning`/`info` are needed-but-
  deferred) and with R6.1 (this spec defines them). **No divergence.**

## Top risks / gaps

### 1. R2.1 vs R2.3 — the focus `ring` is required to be BOTH zero-chroma AND the brand accent
**Novel · MUST_FIX**

The v3 token-reality fix introduced a real internal contradiction:

- **R2.1** lists **`ring`** among the roles that "SHALL be **zero-chroma** (OKLCH chroma = 0)."
- **R2.3** says the **brand accent** — which R2.1 declares is one of the *only* roles allowed to
  carry chroma — "SHALL be limited to interactive emphasis — links, primary CTAs, **the focus
  `ring`**, active/selected states."

A single `ring` token cannot simultaneously be zero-chroma (R2.1) and be the chromatic brand accent
(R2.3). `tokens.css` currently ships `--ring: oklch(0.708 0 0)` / `oklch(0.556 0 0)` — zero-chroma,
i.e. matching R2.1 and contradicting R2.3's "apply the brand accent to the focus ring."

This is load-bearing, not wording: it dictates a concrete token value and is reinforced by **R5.2**
("WHEN the **accent** or a status role is used for ... the focus ring"), which assumes the ring may
be accent-colored. The two criteria give Design contradictory instructions about whether the focus
ring is brand-tinted or neutral.

**Direction:** Decide one model and make the doc say it once.
- If the focus ring is **brand-tinted**: remove `ring` from R2.1's zero-chroma list (it becomes a
  chromatic role) and keep R2.3/R5.2.
- If the focus ring stays **neutral** (matching today's token and the shadcn default): drop "the
  focus `ring`" from R2.3's brand-accent list and reword R5.2 so the ring is gated as a neutral
  non-text boundary, with the brand accent reserved for links/CTAs/active states.

(Compounding note, not a separate finding: R2.2's example name `link` makes "apply the brand accent
to the focus `ring`" read oddly if Design picks that name — a link-named role driving a focus ring.
Resolving the contradiction above also clears this.)

## Conclusions to challenge / reverse
None. The r1/r2 conclusions hold against code. R3's "arbiter opinion" worry from the prompt does
*not* warrant reversal — R3.5/R3.6 plus the named arbiter make it an acceptable requirements-level
obligation.

## What's missing (true requirements-level gaps only)
Nothing new beyond finding #1. The correctly-deferred Design values (accent OKLCH, type scale,
signature treatment, spacing steps, exact print stylesheet, elevation language) are properly left to
the Design phase and should NOT be pulled into requirements.

## Convergence assessment
The document is one genuine contradiction away from converged. Finding #1 is a real, code-grounded
conflict the v3 edits introduced (the brand accent's allowed surfaces overlap a role R2.1 pins to
zero-chroma). Everything else — token reality, distinctiveness bar, status roles, print/PDF scope,
artifact requirements — is accurate and testable. No MINOR padding offered.

```
VERDICT: iterate
MUST_FIX: 1
SHOULD_FIX: 0
MINOR: 0
DESIGN_READY: no
ESCALATE: none
```
