# Adversarial Analysis — visual-design/requirements (v4), Round 4

**Lens:** `frontend-design:frontend-design` loaded and applied. Its anti-generic standard
(distinctive type over Inter/Roboto/system defaults, a committed aesthetic with sharp accents,
memorable signature, no cookie-cutter shadcn-neutral output) is satisfied by R3 + R4: R3 mandates ONE
deliberate signature from ≥2 craft choices (not accent alone), with a written rationale, ≥2 reference
targets, and an explicit fail condition ("an outcome a reviewer cannot distinguish from a default
shadcn-neutral site FAILS"). R4 forces a deliberate Geist-vs-alternatives type evaluation with
character (weight contrast, display treatment). This is the correct requirements-level encoding of the
distinctiveness bar; nothing in R3 regressed.

## Dimension 1 — v4 ring fix internal consistency (verified)

The focus-ring contradiction r3 flagged is genuinely resolved and internally consistent:

- **R2.1** lists the zero-chroma neutral roles (`background`, `foreground`, `card`, `popover`,
  `secondary`, `muted`, `border`, `input`, shadcn `accent`) and then states "Only the brand accent,
  the status roles, and the focus `ring` (which carries the brand accent per R2.3) carry chroma." The
  ring is named chromatic and `ring` is **no longer** in the zero-chroma list.
- **R2.3** lists the focus `ring` among interactive-emphasis uses of the brand accent — consistent.
- **R5.2** gates the ring/accent for non-text contrast (≥3:1, WCAG 1.4.11) — consistent, and gates a
  chromatic ring without asserting neutrality.

No other criterion implies a neutral ring. R5.3/steering Focus ("the `ring` role meeting non-text
contrast") are colour-agnostic and do not conflict.

**Token-reality check:** `tokens.css` currently ships `--ring: oklch(0.708 0 0)` (light) /
`oklch(0.556 0 0)` (dark) — both zero-chroma. The requirements doc nowhere asserts the *current*
ring value; the Introduction fixes concrete OKLCH values as Design-phase outputs, and R2.1 states the
chromatic ring as a **target**. So the present zero-chroma `--ring` is correctly treated as a value the
redesign changes (a deferred Design value), NOT a present contradiction. This matches steering, which
explicitly defers "Whether a chromatic accent is introduced for the active palette" to the design
spec. The fix holds.

## Dimension 2 — new-contradiction / false-claim pass (R1–R10 + NFRs)

Grounded against `requirements.md`, both steering docs, `tokens.css`, and `globals.css`. No new
load-bearing contradiction or false claim found.

Two items examined and dismissed as below MUST_FIX:

1. **R2.1 omits `primary` from its neutral enumeration (MINOR, Novel).** R2.1 says "all neutral roles"
   then enumerates them but does not name `primary`/`primary-foreground`. In `tokens.css` `primary` is
   zero-chroma today; R2.3 lists "primary CTAs" as an accent-emphasis surface, which could read as the
   accent sitting on primary. This is an *unassigned role value*, which the doc consistently defers to
   Design (R2.2 forbids repurposing existing roles for the accent; the new `brand`/`link` role carries
   it). It is a gap to tidy in Design, not a requirements contradiction. Not fuel.

2. **R9.1 lists 7 labels for "eight `(site)` sections" (MINOR, Recurring/cosmetic).** The parenthetical
   names landing, profile, projects, contributions, blog, resources, slash pages (7), where the
   filesystem shows `about/now/colophon/sitemap/slashes` collapsing into one "slash pages" group — the
   same eight-section taxonomy product.md uses (playground excluded). Pre-existing framing from
   v2/v3, purely a counting/label nuance, not load-bearing. Not fuel.

## Dimension 3 — Convergence judgment

The doc is ready to approve. The single r3 must-fix (ring contradiction) is fixed and internally
consistent across R2.1/R2.3/R5.2, verified against `tokens.css`. The R3 distinctiveness bar still
satisfies the frontend-design anti-generic standard. Scope (playground excluded; CI enforcement routed
to `tech.md`; print/PDF owned here) is consistent with steering. Status roles (R6) match steering's
"needed-but-deferred `success`/`warning`/`info`" stance. Nothing above MINOR remains; the two MINOR
items are wording tidy-ups for the Design phase, not requirements defects.

Per the round-4 instruction, `converged` is the honest verdict — manufacturing a must-fix to keep the
loop alive would be the failure mode this review is told to avoid.

## Top remaining issues

None above MINOR. (Two MINOR wording items noted above; neither is fuel.)

```
VERDICT: converged
MUST_FIX: 0
SHOULD_FIX: 0
MINOR: 2
DESIGN_READY: yes
ESCALATE: none
```
