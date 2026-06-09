# Adversarial Analysis — steering/design-system (v1)

Principal-designer teardown. Directive framing. The job is to find where this document
fails to do what it claims — guarantee one coherent, accessible, fast presence — not to
validate it. Primary surface: consistency, accessibility, scalability.

---

## A. "Color" — the contrast gate is defined per *role*, but contrast is a property of *pairs*

The Color section says "every text/UI use of a role must clear its contrast gate in both
themes" and "Secondary text uses `muted-foreground`." That is not a verifiable rule.
Contrast does not exist for a role in isolation; it exists between a foreground and a
specific background.

- Challenge the claim that gating "every role" guarantees contrast. `muted-foreground` at
  4.5:1 on `background` will *not* be 4.5:1 on `card`, on `muted`, or on `accent`. The
  classic failure: meta text that passes on the page body, then gets placed inside a
  gallery `Card` (which sits on `muted`) and silently drops below 4.5:1. The doc has no
  rule naming which foreground roles are legal on which background roles.
- Stress-test the zero-chroma neutral palette against the AA target. A purely neutral grey
  ramp gives you very few lightness steps that clear 4.5:1 against *both* `background` and
  `card` in *both* themes. `muted-foreground` is the role most likely to be tuned to the
  ragged edge of 4.5:1 — meaning any future surface nesting (card-on-muted-on-background)
  breaks it. The "already tuned away from shadcn defaults to pass contrast" note confirms
  the margins are thin; thin margins do not scale to new surface combinations.
- Demand a legal-pairing matrix. As surfaces nest — `popover` over `card` over `muted` —
  no rule governs allowed depth or allowed foreground-on-surface combinations. Without it,
  "Roles, not one-offs" produces consistency in *naming* and inconsistency in *rendered
  contrast*.
- Challenge the omission of state contrast. `hover`, `active`, `disabled`, and the `ring`
  focus color are all color uses, but the gate names only "text." A hover background that
  shifts foreground contrast below 4.5:1 passes this document and fails WCAG.

## B. "Accessibility & Non-Negotiable Gates" — the gate is narrower than the standard it cites

The section invokes "WCAG 2.1 AA" and then collapses it to "≥4.5:1 normal text … enforced
by axe-core." That conflates a multi-part standard with one automatable check.

- Challenge the claim that axe-core "enforces" the gate (blocking). axe only evaluates the
  DOM states the E2E run actually renders. Hover, focus, active, disabled, loading, error,
  open-popover/dialog states, × both themes × three breakpoints are a large matrix; axe
  covers whatever the test happens to visit. Asserting a blocking *guarantee* on top of
  partial traversal is an overclaim — the failure mode is a green CI with an unvisited
  error state at 3.8:1.
- Stress-test the missing non-text contrast requirement (WCAG 1.4.11, part of 2.1 AA). The
  doc defines `border`, `input`, and `ring` roles and promises "visible focus," but the
  only numeric gate is 4.5:1 for text. UI-component and focus-indicator contrast (3:1
  against adjacent colors) is never stated. A focus `ring` that is visible to a designer
  but under 3:1 against the background fails AA and passes this document.
- Challenge the absence of the large-text threshold. The doc cites 4.5:1 for "normal text"
  and stops. Headings/display at large sizes are governed by 3:1; without stating it, the
  doc both under-specifies (no rule for large text) and risks over-rejecting (forcing
  display text to 4.5:1 it does not need, fighting the "restraint/minimal" principle).
- Stress-test the disabled-state contradiction. "disabled" is a required component state
  (Components) and the gate demands 4.5:1 on "every text/UI use." WCAG exempts disabled
  controls from contrast; this document does not. Taken literally it forbids the
  conventional low-contrast disabled look — an internal contradiction between the gate and
  the required-states list.
- Demand `forced-colors` / Windows High Contrast handling. A document that calls
  accessibility "a gate, not a polish pass" and "both themes first-class" addresses only
  `:root` and `.dark`. The `forced-colors` mode (where the OS overrides your tokens
  entirely) is a third theme that is unaddressed; tokenized borders/focus rings frequently
  vanish there.

## C. "Performance" gate — a single Lighthouse number is a flaky blocking bar

"static pages hold a 90+ Lighthouse score (blocking)."

- Challenge the unspecified category. Lighthouse reports four scores (Performance, A11y,
  Best Practices, SEO). "A 90+ Lighthouse score" names none. A blocking gate cannot be
  enforced on an ambiguous metric.
- Stress-test the run-to-run variance. Lab Lighthouse Performance scores swing ±5–10 points
  on identical builds (CPU contention, network jitter in CI). A hard 90 threshold will
  produce intermittent red builds on *unchanged* code — the gate fails the project, not the
  regression. Boring gates need stable signals.
- Demand the field metrics that actually matter. The gate omits LCP / CLS / INP budgets,
  which are the levers "Fast is a feature" is really about. A composite synthetic score can
  sit at 90 while CLS is bad from late-loading webfonts — exactly the risk a webfont-using
  design system should bound explicitly.

## D. "direction-light" + "Deferred Decisions" — the consistency guarantee rests on values that don't exist yet

Purpose promises "every page and component … reads as one coherent … presence — consistent
type, color, spacing." Deferred Decisions then defers direction, palette/chroma, type
scale, motion, *and* elevation.

- Challenge whether this document can deliver its own Purpose today. Type scale, palette
  values, motion, and elevation are all `Deferred:`. Coherence is produced by those values.
  As written, the doc guarantees coherence while deferring the means of coherence to a spec
  that does not yet exist — it is an IOU, not a guarantee.
- Stress-test the "eight already-built sections." Scope says their migration lives "in a
  spec," but those sections were built *before* this token-ownership model and *before* the
  values are decided. They are already shipping with concrete type/color/spacing choices.
  Either they constrain the deferred decisions (in which case the decisions are not really
  open) or they will be retro-fitted and churned (in which case "consistent presence" is
  currently false on the live site). The doc does not say which.
- Challenge the two concrete values that leaked into a "direction-light" doc. The "~75-char
  measure" (stated twice) and the single `--radius` dial are committed here, while the type
  scale and spacing scale they belong to are deferred. Pick a rule: either concrete values
  live in the spec/tokens, or they live here — the doc violates its own boundary in two
  named places.

## E. "Components / Required states" — required states reference visuals with no tokens to express them

Required states: "default / hover / visible focus / active / disabled / loading / error."
The token taxonomy is `background`, `card`, `popover`, `primary`, `secondary`, `muted`,
`accent`, `destructive`, `border`, `input`, `ring`, chart, sidebar.

- Challenge the missing status roles. "error" is a required state and forms need
  validation feedback, yet the only status role is `destructive`. There is no `success`,
  `warning`, or `info` role. A contact-form success confirmation has no token; a field
  warning has no token. The required-states list writes a cheque the taxonomy cannot cash.
- Stress-test "hover," "active," "disabled," and "loading." No token, ratio, or convention
  is given for any of them — no hover-elevation or hover-tint rule, no disabled-opacity
  value, no loading/skeleton/spinner convention. "Every interactive component handles
  hover" with no shared definition guarantees *divergent* hover treatments across
  components — the opposite of the stated goal.
- Challenge "introduce variants sparingly via the primitive's API." Without an enumerated
  variant set or an approval rule, "sparingly" is unenforceable. The first contributor who
  needs a new button tone will add it; the second will add a near-duplicate. This is the
  exact one-off proliferation "Roles, not one-offs" claims to prevent, reintroduced at the
  variant layer.

## F. "Governance & Ownership" — the document ships a *known, unresolved* contradiction with its own peers

- Challenge declaring victory while the conflict is live. Governance reverses the
  "regenerate from shadcn / stay byte-aligned / do not hand-edit tokens.css" rule, then the
  follow-on admits `tech.md`, `structure.md`, and the `tokens.css`/`globals.css` header
  comments *still say the old rule* and are "tracked … not this document." So the steering
  set currently contradicts itself in writing. A contributor who opens `tokens.css` reads
  "regenerate, do not hand-edit" and does the wrong thing. "This document wins" does not
  help a reader who never opens this document. The contradiction is not deferred work; it is
  an active landmine.
- Stress-test fork-vs-track with shadcn/Radix. Governance says shadcn is "a point of
  departure, not an upstream we track," while Components says "shadcn/ui on Radix … is the
  source of truth for behavior and ARIA." You cannot both stop tracking upstream *and* rely
  on upstream for ARIA/behavior correctness. When Radix ships an a11y fix to a primitive you
  have "owned" and edited, who reconciles it? The doc has no upstream-merge policy — a
  scalability hole that grows with every owned primitive.
- Challenge "when they disagree, this document wins and the file is corrected" as a process.
  There is no named owner, no review trigger, and no detection mechanism for divergence.
  Tokens.css will drift from this prose the first time a spec tunes a value without updating
  steering, and nothing catches it.

## G. "Scope" — the playground isolation claim is technically overstated

"intentionally style-isolated (`all: initial` + `isolation: isolate` + `@layer
playground`)."

- Challenge the word "isolated." `isolation: isolate` creates a *stacking context* (z-index
  scoping) — it does nothing for style inheritance. `@layer` orders the *cascade* — it does
  not encapsulate. `all: initial` resets standard inherited/non-inherited properties on the
  element it is set on, but it does **not** reset CSS custom properties (`--font-sans`,
  `--color-*` and friends defined on `:root` still inherit through), and self-hosted
  `@font-face` declarations are global. None of these three is style encapsulation; only
  shadow DOM or an iframe gives that. The doc's stated mechanism does not achieve the
  isolation the Scope section relies on to exempt the playground from the gates.
- Stress-test the consequence. If a global token or font leaks into the playground (it can,
  per the above), the "exempt from gates" carve-out is being applied to a surface that is
  not actually sealed — meaning an a11y/contrast regression there is both ungated *and*
  reachable from shared globals.

---

## Top 5 risks / gaps

1. **Per-role contrast gating cannot guarantee AA.** Contrast is a foreground-on-background
   pair property; the doc gates roles individually and never defines legal role-on-role
   pairings or nesting depth. Concrete failure: `muted-foreground` meta text passing on
   `background` and silently failing inside a `Card` on `muted`. (A)
2. **The accessibility gate is narrower than the WCAG 2.1 AA it cites** — no non-text/UI
   contrast (1.4.11), no large-text 3:1 threshold, no `forced-colors` mode, and a literal
   reading that forbids the conventional disabled look. axe-core enforcement is asserted as
   a guarantee but only covers states the E2E happens to render. (B)
3. **"90+ Lighthouse (blocking)" is an ambiguous, flaky gate** — category unnamed, lab
   variance guarantees intermittent false-red builds, and the field metrics that "Fast is a
   feature" actually depends on (LCP/CLS/INP) are absent. (C)
4. **The document ships a known, written contradiction with `tech.md`/`structure.md`/the
   `tokens.css` headers.** "This document wins" does not protect the contributor reading the
   stale "regenerate, do not hand-edit" comment in the file they are editing. (F)
5. **Required component states have no tokens to express them** — no `success`/`warning`/
   `info` roles for the mandated "error" state and form feedback; no hover/disabled/loading
   convention — guaranteeing divergent per-component treatments, the opposite of the
   coherence goal. (E)

## Top 3 conclusions to challenge or reverse

1. **Reverse "every text/UI use of a role must clear its contrast gate."** Replace
   role-level gating with **pair-level gating**: an explicit allowed foreground×background
   matrix plus a maximum surface-nesting depth, verified for every pair in both themes.
   *Reasoning:* the current rule is unverifiable and will pass combinations that fail AA the
   moment surfaces nest — which gallery `Card` layouts do by design.
2. **Reverse "the playground is style-isolated via `all: initial` + `isolation: isolate` +
   `@layer`."** Either state the mechanism honestly (cascade/stacking control, *not*
   encapsulation; globals and fonts still reach it) and keep a minimal a11y gate on it, or
   move it to a shadow-DOM/iframe boundary if true isolation is required. *Reasoning:* the
   exemption is being justified by an isolation property the stack does not provide.
3. **Reverse "shadcn is a point of departure, not an upstream we track" while simultaneously
   treating it as "the source of truth for behavior and ARIA."** Pick one and write the
   missing policy: if you own the primitives, define how upstream a11y/security fixes get
   merged; if you track upstream, constrain how far tokens may diverge. *Reasoning:* the two
   statements are mutually exclusive and leave no process for the case that matters most —
   an upstream accessibility fix to a primitive you have edited.

## What's missing — do this before acting on the document

- **A legal color-pair matrix** (foreground role × background role × theme) with computed
  ratios and a stated max nesting depth. This is the single highest-leverage gap; "Roles,
  not one-offs" is not safe without it.
- **A complete a11y gate definition**: 4.5:1 normal / 3:1 large / 3:1 non-text & focus
  indicator / disabled exemption / `forced-colors` behavior — and an honest statement of
  what axe-core does *not* catch, with the manual-review backstop named.
- **A measurable performance gate**: name the Lighthouse category *and* add LCP/CLS/INP
  budgets with a variance tolerance (e.g. median of N runs) so the gate is stable.
- **Status/state tokens**: add `success`/`warning`/`info` roles and a defined
  hover/active/disabled/loading convention, or explicitly scope the required-states list
  down to what the taxonomy can express today.
- **Resolve the governance contradiction now, not "as part of rollout"**: update or
  explicitly stamp the stale `tokens.css`/`globals.css`/`tech.md`/`structure.md` notes, and
  name an owner + a drift-detection trigger for steering-vs-tokens divergence.
- **A decision on the eight already-built sections**: do they constrain the deferred
  identity, or will they be re-churned? Until answered, "one coherent presence" is
  unverifiable on the live site.
- **An exceptions rule**: the professional-profile "wide-layout exception" needs a stated
  test for when a surface may deviate, or every new page will negotiate its own exception.

### Where the document is genuinely fine (noted briefly)

- The steering-vs-spec split and the `Deferred:` convention are a sound way to avoid
  premature commitment — the problem is execution (values leaking in, gates depending on
  deferred decisions), not the idea.
- "Both themes a matched pair, never one derived from the other" is the correct stance and
  rare to see stated.
- Self-hosting Geist via `next/font` under a font-forbidding CSP is consistent and correct,
  and tying it to the performance argument is right.
