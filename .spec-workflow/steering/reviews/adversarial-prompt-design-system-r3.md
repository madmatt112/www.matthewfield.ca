# Adversarial Review — steering/design-system (v3)

You are a principal product designer and design-systems architect. Your job is to tear apart this
document and find every weakness — gaps, ambiguities, contradictions, unstated assumptions, failure
modes not considered, and remedies that merely relabel a problem. Do not validate or support. Use
directive framing throughout ("Challenge the claim that…", "Stress-test the assumption that…").

## Target document
/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/design-system.md

Read it in full first. This is a **steering** document for a Next.js 16 + Tailwind v4 + shadcn/ui
(OKLCH tokens, `next-themes`) personal site. It is deliberately **direction-light**: the visual
identity is intentionally deferred to a later design spec, and `Deferred: <where>` is a legitimate
answer. Do **not** fault the document merely for deferring the *identity*. Do fault it where a
**rule or gate it asserts as binding is unverifiable, wrong, self-contradictory, or hollowed out by
what it defers.** Primary attack surface: consistency, accessibility, and scalability of the visual
system — and whether "state the rule, defer the artifact" leaves any blocking gate as a slogan.

## Prior Review Context

This is round 3. Rounds v1 and v2 already found and the author has **addressed** the following in
this v3 — do NOT re-discover them as new findings. VERIFY each fix actually holds; flag as
**Recurring (escalate)** only if a fix is cosmetic or reintroduces the problem:

- v1-A per-role→**pair-level** contrast (matrix deferred); v1-B expanded **a11y contract**
  (non-text 1.4.11, large-text 3:1, disabled exemption, forced-colors, axe-as-floor); v1-C
  **Lighthouse** category named + median-of-runs + LCP/CLS/INP; v1-D coherence stated as a target +
  concrete-value boundary; v1-E **status roles** + state conventions; v1-F **governance
  contradiction resolved** (tokens.css/globals.css headers corrected) + owner/drift + Radix
  upstream policy; v1-G **playground** restated as cascade/stacking scope (not encapsulation).
- v2-A **spacing** source-of-truth (Tailwind scale, no one-offs); v2-B **breakpoints** named
  (`sm`–`2xl`); v2-C **image/icon a11y** corrected; v2-D **chart/sidebar** marked reserved; v2-E
  **"surface"** disambiguated (audit unit = route / component-state); v2-F **measure** as a ceiling
  that shrinks on mobile.

Classify every finding you write as **Novel** (not seen before), **Compounding** (deepens a prior
finding the fix did not fully close), or **Recurring** (a prior issue the fix failed to resolve —
escalate severity). Spend your effort on Novel and Compounding.

## Analysis dimensions (tailored — attack these)

1. **Deferral density vs. gate enforceability.** The Deferred Decisions list is ~14 items
   (palette, type scale, pairing matrix, spacing rhythm, breakpoint layouts, motion, elevation,
   data-viz, status values, print, i18n/RTL, token versioning, z-index). Challenge whether the
   document's *blocking* gates can actually be enforced today when the artifacts they depend on are
   deferred — e.g. the contrast gate ("gated against the surface it sits on") with the legal pairing
   matrix and the palette both deferred. Stress-test whether "state the rule, defer the artifact"
   re-creates the v1/v2 "slogan-as-gate" pattern at one remove.
2. **New overclaims in the a11y / performance contract.** Attack the freshly added rules for the
   same disease they were meant to cure: "median of repeated runs" names no run count; "forced-colors
   … UI remains usable" names no mechanism or test; "axe is a floor, manual review covers the rest"
   names no owner or checklist for the manual pass; the disabled-exemption + non-text-contrast rules
   may collide on a disabled control's border. Find the gate that still cannot be failed objectively.
3. **Relabeled debt: reserved + status roles.** Challenge whether marking `chart`/`sidebar`
   "reserved/out of contract" actually removes the v2-D problem or just renames carried cruft.
   Stress-test the newly *added* `success`/`warning`/`info` roles with deferred values against v1-E:
   does the taxonomy again promise feedback states it has no values to render, and does adding three
   neutral-palette status roles that must also pass 1.4.1 (not color alone) create an unstated
   icon/text requirement nowhere specified?
4. **Governance "resolved in this pass" — claim vs. mechanism.** The doc asserts the contradiction
   is resolved and names an owner plus "divergence … is a review item on any PR that touches
   tokens." Challenge whether a "review item" with no automated check is a control or a hope; whether
   "design-system.md wins when they disagree" is detectable at all; and whether the Radix
   "track upstream and reconcile" policy is actionable without a named trigger when an owned primitive
   has been edited.
5. **Theming integrity under a zero-chroma OKLCH ramp.** Challenge "both themes a matched pair, never
   one derived from the other" against a fully neutral (zero-chroma) palette — a neutral ramp is
   near-inevitably a lightness mirror, i.e. a de-facto derivation, contradicting the principle.
   Stress-test motion's "theme toggles must not flash": `next-themes` with class-on-`<html>` still
   has a documented pre-hydration path — is the no-flash claim a gate with a mechanism or an assertion?
6. **Altitude and self-consistency.** Stress-test whether v3 has drifted from steering toward spec
   (it grew substantially), and whether any concrete value still leaks (radius dial, ~75ch) while
   peers defer — i.e. whether the concrete-value boundary the doc claims to hold is actually held.
   Surface any *new* internal contradiction introduced by the v3 edits.

## Closing deliverables

- **Top 5 risks/gaps** (this is a long doc), each tagged Novel / Compounding / Recurring.
- **Top 3 conclusions to challenge or reverse**, with specific reasoning.
- **What's missing** — work to do before acting on the document (keep steering vs. spec honest: if a
  missing artifact is genuinely spec-level, say so rather than demanding it be inlined here).

Be specific and concrete. Cite failure scenarios, not abstract risks. If something is actually fine,
say so in one line and move on. End with a short note on whether v3 is converging or still has
must-fix structural issues.

## Output
Write your analysis to:
/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/reviews/adversarial-analysis-design-system-r3.md
