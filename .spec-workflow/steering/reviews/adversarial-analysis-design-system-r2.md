# Adversarial Analysis — steering/design-system (v2)

Principal-designer teardown, round 2. Directive framing. Primary surface: consistency,
accessibility, scalability. This pass deliberately avoids re-discovering v1's findings
(per-role vs pair-level contrast, WCAG-gate breadth, Lighthouse flakiness, deferred-values-
vs-coherence, missing state tokens, governance contradiction, playground isolation). Each
finding below is tagged **Novel** or **Compounding** relative to v1.

---

## A. "Spacing & Layout" — the named engine of coherence has no source of truth and no defer marker  *(Novel)*

Design Principles lead with "Wide & spacious" and Spacing & Layout asserts "a single
consistent spacing scale governs margin/padding/gap; whitespace … creates the 'wide &
spacious' feel." The Color and Radius sections each name a source of truth (`tokens.css`,
the `--radius` dial). The spacing scale names **none** — not `tokens.css`, not Tailwind's
default scale, and it is not even listed under Deferred Decisions.

- Challenge the claim that "a single consistent spacing scale governs" anything when the
  document never says *which* scale or *where it lives*. Color defers explicitly
  (`Deferred:`), radius commits explicitly (the dial), spacing does neither — it is
  asserted as durable while being undefined, undeferred, and unsourced. That is the exact
  premature-or-vague split the doc's preamble claims to avoid.
- Stress-test the silent dependency on Tailwind's default 4px spacing ramp. If the "single
  scale" is really just Tailwind's defaults, say so — otherwise the first contributor
  reaches for `gap-[18px]` or `p-7` and nothing in this document forbids it. "Whitespace,
  not one-off values" is unenforceable without a named, closed set of steps.
- Demand a rule for *which* steps express "wide & spacious." A scale existing does not make
  a layout spacious; spaciousness is a *choice of steps* (the section gaps, the page
  gutters). The doc gives a measure for prose (~75ch) but no minimum gutter, no section
  rhythm, nothing operational. Two contributors will read "spacious" as 32px and 96px and
  both pass review.
- Challenge the asymmetry against Radius. Radius — a low-stakes, almost-cosmetic property —
  gets a single tokenized dial; spacing — the property the entire first principle rests on —
  gets a sentence. The governance weight is inverted relative to design impact.

## B. "Responsive … mobile, tablet, and desktop" — the gate verifies three tiers the system never defines  *(Novel)*

Spacing & Layout says "responsive with mobile as a first-class target … nothing is
desktop-only." The Responsive gate says "every surface verified at mobile, tablet, and
desktop widths." Nowhere are breakpoints named, valued, or mapped.

- Challenge the three-tier verification against a five-tier toolchain. Tailwind v4 (named in
  `tech.md`, per Scope) ships `sm/md/lg/xl/2xl` — *five* breakpoints. The gate audits three
  ("mobile, tablet, desktop"). A regression that appears only between `lg` and `2xl` (e.g. a
  three-column gallery that breaks at exactly `xl`) is outside every named verification
  width and ships green. The gate's tiers and the build's tiers do not correspond.
- Stress-test "tablet" as a verification target with no width. A reviewer cannot reproduce a
  gate they cannot pin to a number. "Verified at tablet" is unfalsifiable — 768px and 1024px
  are both "tablet" and behave differently for a two-up card grid.
- Demand a breakpoint source of truth parallel to `tokens.css`. Breakpoints are tokens too;
  they are as load-bearing for consistency as color roles, and they are entirely absent from
  the "Design Tokens (source of truth)" section. The doc tokenizes color and radius and
  forgets the dimension its own Responsive gate is written against.
- Challenge "mobile as a first-class target" against the deferred type scale. A mobile-first
  type scale and a desktop-first type scale are different scales; deferring the scale (per
  Deferred Decisions) while gating mobile rendering means the gate fires against values the
  document refuses to fix. Compounds v1-D.

## C. Accessibility absolutes stated wrong — "alt text on all images" and the silent icon a11y gap  *(Novel)*

The Accessibility gate ends with "alt text on all images." Components names "lucide is the
icon set" with no a11y convention.

- Challenge "alt text on all images" as written — it is an accessibility *anti-pattern* for
  decorative images. WCAG requires decorative/presentational images to carry **empty**
  `alt=""` so screen readers skip them; a literal "alt text on all images" rule forces a
  describable string onto a decorative divider or background and *adds* screen-reader noise.
  A gate that mandates the wrong behavior is worse than a missing gate. Restate as
  "every image has an explicit `alt` (empty for decorative, descriptive for meaningful)."
- Stress-test lucide icons against the same omission. Icons are images. The doc gives no rule
  for decorative icons (`aria-hidden="true"`) vs. meaningful icons (accessible name), no icon
  sizing step, no stroke-weight convention. An icon-only button (a common shadcn pattern) with
  no accessible name is a guaranteed WCAG 4.1.2 failure that this document's gate does not
  name — and axe may not catch if the test never focuses it (compounds v1-B).
- Demand an SVG-vs-`<img>` distinction. lucide ships inline SVG; the "alt text on all images"
  rule does not even apply to inline SVG (which uses `role`/`aria-label`/`<title>`), so the
  one image-a11y rule the doc states does not cover the icon set the doc mandates. The rule
  and the toolkit miss each other.

## D. Zero-chroma neutral palette × `chart`/`sidebar` roles — taxonomy the surface cannot use  *(Novel, compounds v1-E)*

Color: "The palette is currently fully neutral (zero-chroma)." The role taxonomy "plus chart
and sidebar roles." Governance/Color: "new roles are added only when an existing one cannot
express a genuine need."

- Challenge multi-series data viz on a zero-chroma ramp. Chart roles exist, but with zero
  chroma the *only* axis of distinction between data series is lightness. Three or more
  series on one chart become mutually indistinguishable greys — and any pair that *is*
  distinguishable by lightness is, by construction, a contrast relationship you must also
  defend against the plot background. A neutral palette and legible multi-series charts are
  in direct tension; the doc carries the roles and ignores the conflict. Concrete failure: a
  contributions activity chart with 4 series renders as 4 indistinguishable greys, and
  color-only encoding additionally fails WCAG 1.4.1 (use of color).
- Stress-test `sidebar` roles against the actual surface inventory. Scope lists landing,
  profile, projects, contributions, blog, resources, slash pages — content pages. There is no
  sidebar. `sidebar` roles are inherited shadcn cruft carried into the taxonomy, which
  directly violates "new roles are added only when an existing one cannot express a need."
  The principle is breached *in the same sentence that states it* — the taxonomy already
  contains roles no surface needs.
- Demand a reconciliation of "the role taxonomy is durable" with "currently fully neutral."
  If chroma is later introduced (Deferred Decisions leaves it open), every chart and accent
  decision retro-changes — so the taxonomy is durable but its *rendered meaning* is not, and
  any chart built today against neutral roles is throwaway. The doc should either prune the
  unused roles now or state they are reserved and explicitly out of contract.

## E. "every surface" — the gates hinge on a word the document uses in two incompatible senses  *(Novel)*

The Gates section repeats "every surface": "every surface verified in both themes," "every
surface verified at mobile, tablet, and desktop." Color/Spacing also use "surface" to mean
token-backed containers — `card`, `popover`, `muted`, the "surface and motion language."

- Challenge the overloaded term. In Color, a "surface" is a token role (card/popover/muted).
  In Gates, a "surface" is a thing-to-verify (a page? a route? a component? a state?). These
  are different cardinalities. "Every surface verified in both themes" is unenforceable until
  someone decides whether that means every *route*, every *component*, or every *token-backed
  container × state*. The audit scope is undefined precisely where the doc calls the gate
  "blocking."
- Stress-test the combinatorics the ambiguity hides. If "surface" means route × theme ×
  breakpoint, that is one matrix; if it means component × state × theme × breakpoint, it is
  orders of magnitude larger and no human verifies it by hand. The doc asserts a blocking
  manual gate ("verified") without bounding what is verified — so it is either trivially
  satisfiable (a few routes) or impossibly large (every state), and the document does not say
  which. A blocking gate with undefined scope is not a gate.
- Demand a single defined noun. Pick "route," "page," or "component instance," define it
  once, and write the gates against it. Until then the three "every surface" gates
  (theme parity, responsive, and by extension contrast) are slogans, not bars.

## F. "~75-character measure" — committed twice, but undefined across mobile and the wide-profile exception  *(Compounding v1-D)*

The measure appears in Principle 1 and again in Typography ("Prose holds the ~75-character
measure"). Density names "the professional profile is the documented wide-layout exception."

- Challenge the measure on a 375px phone — the first-class target. ~75ch at a readable body
  size overflows a phone viewport; in practice measure must *shrink* on mobile. The doc
  commits a fixed ~75ch and a "mobile first-class" gate that contradict each other, with no
  rule for how measure adapts down. Either the number is wrong or the gate is.
- Stress-test the wide-profile exception against the measure. The profile gets "more viewport
  width than standard content pages." Does its prose still hold ~75ch (so the extra width is
  gutter/aside) or does prose widen too (breaking the measure)? The exception is named but its
  interaction with the one committed typographic value is unspecified — exactly the kind of
  per-surface negotiation v1 flagged, now concretely instantiated.
- Demand the exception become a rule, not a named instance. "The professional profile is the
  exception" with no *test for when a surface may deviate* means the next wide page (a project
  case study, a resources index) re-opens the negotiation. Compounds v1's "exceptions rule"
  gap with a second concrete trigger.

---

## Top 5 risks / gaps (v2)

1. **The spacing scale — the engine of the first principle — is undefined, undeferred, and
   unsourced.** Radius (cosmetic) gets a tokenized dial; spacing (load-bearing) gets a
   sentence and no source of truth. "Whitespace, not one-off values" is unenforceable. (A)
2. **The Responsive gate verifies three tiers the system never defines, against a five-tier
   Tailwind toolchain.** Regressions between `lg`/`xl`/`2xl` fall outside every named
   verification width; "tablet" has no number so the gate is unfalsifiable; breakpoints are
   absent from the token source of truth. (B)
3. **"alt text on all images" mandates a documented a11y anti-pattern** (it forces non-empty
   alt onto decorative images) and does not even apply to the inline-SVG lucide icon set the
   doc mandates — leaving icon-only buttons (no accessible name) ungated. (C)
4. **The zero-chroma palette cannot render legible multi-series charts**, yet `chart` roles
   are carried; `sidebar` roles are carried with no sidebar surface — both violating "add
   roles only when an existing one cannot express a need," in the sentence that states it. (D)
5. **"every surface" is overloaded** (token role vs. verification target), leaving all three
   "every surface" gates with undefined scope — trivially satisfiable or impossibly large,
   and the document never says which. (E)

## Top 3 conclusions to challenge or reverse (v2)

1. **Reverse the asymmetry between Radius and Spacing.** Radius gets a tokenized dial;
   spacing gets prose. Either both are tokenized with a named source of truth and a closed
   step set, or both defer — but the property the entire "wide & spacious" principle depends
   on cannot be the *less* specified of the two. *Reasoning:* governance specificity is
   currently inversely proportional to design impact, so the highest-impact axis is the least
   governed.
2. **Reverse "alt text on all images."** Replace with "every image carries an explicit `alt`
   — empty (`alt=""`) for decorative, descriptive for meaningful — and inline SVG/icons use
   `aria-hidden` (decorative) or an accessible name (meaningful)." *Reasoning:* the current
   absolute is both an a11y anti-pattern and inapplicable to the mandated icon toolkit; a gate
   that prescribes wrong behavior is a net negative.
3. **Reverse carrying `chart`/`sidebar` roles as "durable taxonomy" under a zero-chroma
   palette.** Either prune them now (honoring "roles only when needed") or explicitly mark
   them reserved/out-of-contract and acknowledge that legible multi-series charts require the
   chroma the palette currently forbids. *Reasoning:* the taxonomy advertises capability the
   surface inventory and the palette cannot deliver, and any chart built today is throwaway.

## What's missing — do this before acting on the document

- **A spacing token source + closed step set**, named the way Color and Radius are, plus an
  operational definition of which steps express "wide & spacious" (minimum gutter, section
  rhythm). Without it Principle 1 is decorative.
- **A breakpoint source of truth** in the Design Tokens section, and a Responsive gate written
  against *named widths that match the toolchain's tiers* (all five, or an explicit statement
  that only three are supported and why the other two are unused).
- **A corrected image/icon a11y rule** covering decorative `alt=""`, meaningful descriptions,
  inline-SVG/icon naming, and icon-only-control accessible names — and an honest note that the
  blocking axe gate does not catch states it never visits (carry-over from v1-B).
- **A data-viz/chart contract** under the neutral palette: how series are distinguished
  without chroma (pattern/label/lightness with stated minimum separation), and a 1.4.1
  "not by color alone" rule — or a decision to introduce chroma before any chart ships.
- **A single defined noun for "surface"** in the gates, with the audit matrix (route ×
  theme × breakpoint, or component × state × …) bounded explicitly so "blocking" means
  something.
- **A measure-adaptation rule** for ~75ch across mobile and the wide-profile exception, and a
  *test* for when any surface may deviate from the measure/density defaults (closing the
  exceptions gap v1 also flagged).

### Where the document is genuinely fine (noted briefly)

- The `Deferred:` convention is still the right instinct; the v2 problems are values that
  should be governed (spacing, breakpoints) being neither committed nor deferred — a third,
  worse state than either.
- Mapping headings to semantic HTML "in order" and "emphasis never substitutes for heading
  structure" is correct and worth keeping verbatim.
- Owning shadcn primitives in `src/components/ui/` with "composition over forking" is a sound
  scalability stance — the gap is the unused inherited roles riding along with it (D), not the
  composition rule itself.
