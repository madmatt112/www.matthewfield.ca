# Adversarial Analysis — visual-design/requirements (v1)

Reviewer stance: principal product designer / design-systems lead. Lens for dimensions 1–2:
the **frontend-design** skill (distinctiveness, deliberate type/color/space, anti-generic-AI
aesthetic). The skill loaded; its core directive — "What makes this UNFORGETTABLE? What's the one
thing someone will remember?" — is the bar I am holding R1–R8 against. Verdict up front: **this
doc is not ready to approve as-is.** It is a competent *design-system-compliance* spec masquerading
as a *visual-identity* spec, and on the one job the steering doc handed it — "refine the current
neutral/minimal look vs. a distinct brand identity" — it quietly chose "refine" and never argued
for it. Must-fix list is at the end.

---

## Dimension 1 — Generic-by-default risk (frontend-design lens)

**The core failure.** R1.1 asks the site to "feel like one deliberate, professional product." R2
spends four criteria ensuring the accent is *barely used*: "limited to interactive emphasis"
(R2.2), "IF a UI need can be met by an existing neutral role THEN the accent SHALL NOT be used"
(R2.3), "SHALL NOT be used as a large background surface" (R2.2). Read R2 as a whole and the only
falsifiable thing it guarantees is **restraint** — there is not a single criterion anywhere in
R1–R8 that requires the result to be *distinctive*, *memorable*, or to have a *point of view*.

"Coherent + accessible + restrained" is exactly the spec of every shadcn-default, near-neutral,
one-blue-accent developer site on the internet. That is the literal AI-default aesthetic the
frontend-design lens exists to reject ("predictable layouts and component patterns... cookie-cutter
design that lacks context-specific character"). R1 measures coherence; nothing measures character.

**Concrete failure scenario.** A recruiter screening DevOps candidates opens twelve portfolios in
tabs. Eleven are near-neutral with one accent link color and a Geist/Inter type stack. Matthew's
passes every criterion in this doc — AA contrast, named tokens, no FOUC, 75ch measure — and is
**indistinguishable from the other ten that also passed those same invisible bars.** The doc's own
stated product goal (R1 user story: "credible builder-evidence rather than a template") fails on its
own terms, because a forgettable site *is* the template outcome. The funnel this spec claims to
serve (Introduction; Alignment section) depends on being remembered long enough to get a reply — and
nothing here optimizes for recall.

**The deeper problem: there is no signature.** A builder-credibility site for an
infra/platform engineer has obvious places to *signal craft* — a deliberate detail that says "a
person who cares about systems made this." The doc requires none. No requirement for a memorable
signature element, no requirement that any single surface (the hero, the profile masthead) carry
identity, no requirement for a craft-signaling detail. R6 even pre-biases *away* from the cheapest
sources of distinctiveness: "Motion SHALL be minimal" (R6.2), "calm" (R6 story), elevation
optional. Restraint is asserted as a virtue six times; distinctiveness is asserted zero times. This
doc optimizes hard for **inoffensive** and never once for **memorable.**

To be fair: restraint *can* be distinctive — brutal minimalism, editorial typography, a confident
single gesture all qualify. But that requires the restraint to be *executed as a deliberate point of
view*, and the doc must require that point of view to exist. It requires only the absence of color.

---

## Dimension 2 — Typography & space as identity, not just legibility

**R4 treats type as plumbing, not voice.** Every R4 criterion is about consistency and legibility:
fix the scale (R4.1), hold 75ch (R4.2), no arbitrary values (R4.3). There is **no requirement on
typographic character** — no requirement for display-vs-body weight contrast, no requirement for a
display treatment with any personality, no requirement that headings do anything a recruiter would
notice. Steering explicitly deferred "typographic *voice*" and "any face/weight personality beyond
Geist" to *this* spec (design-system.md Typography, last bullet). This doc accepted the deferral and
then **dropped the voice half entirely** — it picked up "scale" and left "voice" on the floor.

**Geist is assumed, never interrogated.** Steering names Geist Sans/Mono as the *current* families
but the deferral explicitly opens "any face/weight personality beyond Geist" for this spec to
decide. Geist is the single most common "developer default" face of this era (it ships with the
Next.js starter Matthew is literally on). The frontend-design lens names this exact trap: "Avoid
generic fonts like... opt instead for distinctive choices." There is **no requirement to evaluate
whether Geist carries identity** or to make a deliberate keep/replace decision with a rationale. By
silence, the doc defaults to the most generic possible answer — and a default chosen by silence is
the opposite of "one deliberate product" (R1.1).

**"Wide & spacious" is asserted, never made a signature.** The Alignment section invokes "wide and
spacious"; R4.1 fixes spacing rhythm. But spaciousness here is just "generic whitespace selected to
be consistent." Nothing requires the spacing to be a *deliberate, characterful* trait — dramatic
gutters, an editorial column system, a confident rhythm someone would remember. The difference
between "spacious because we picked roomy steps" and "spacious as an identity gesture" is the whole
ballgame for a minimal site, and the doc lands on the first.

---

## Dimension 3 — Untestable / unfalsifiable acceptance criteria

A reviewer must be able to rule each criterion pass/fail. These cannot be:

- **R1.2 — "visibly reflect the applied identity, not the placeholder-neutral baseline."**
  Unfalsifiable two ways. (a) "Visibly reflect" has no test — reflect *how much*? A one-pixel accent
  link technically "reflects" it. (b) The baseline is `design-baseline/` screenshots which *are the
  near-neutral look this spec keeps*. If the chosen direction is "minimal + keep the near-neutral
  foundation" (Introduction), then "differs visibly from the near-neutral baseline" is close to
  self-contradictory — the spec is graded against the very thing it largely retains. **Demand:** a
  named, enumerable change set ("accent applied to X link/CTA/ring states; type scale changed from A
  to B; spacing rhythm changed from C to D") so "reflects the identity" becomes checkable.

- **R1.1 — "one deliberate, professional product."** "Deliberate" and "professional" are not
  testable properties of pixels. **Demand:** either drop this to a non-normative story, or name the
  judgment mechanism (e.g., "a documented identity rationale exists and each section's styling traces
  to it").

- **R2.1 / Introduction — "near-neutral."** No threshold. Is C=0.02 OKLCH chroma "near-neutral"? The
  steering already had to *correct itself* (v4) from "zero-chroma" to "near-neutral" because
  `destructive` carries chroma — proving the term is slippery even to the authors. **Demand:** a
  numeric chroma ceiling for the neutral ramp (deferring the *exact* value is fine; the *ceiling as a
  rule* is a requirements-level decision).

- **R2.3 — "restraint by default."** This is a slogan, not a criterion. "IF a UI need can be met by
  an existing neutral role THEN the accent SHALL NOT be used" reads testable but is unfalsifiable in
  practice — almost *any* accent use can be argued as "could've been neutral," so it can be wielded
  to reject any distinctive use of color while never being objectively violated. It's a veto dressed
  as a rule. **Demand:** an enumerated allow-list of accent uses (the matrix R2.2 already gestures
  at) — accent is legal *here, here, here*, full stop — which is both testable and stops R2.3 from
  being a permanent anti-distinctiveness ratchet.

- **R6 — "calm," "polished."** Story-level adjectives leaking the bias from dim. 1; not gradeable.

Genuinely fine and testable, for the record: R3.1/R3.2 (numeric contrast bars), R4.2 (75ch),
R4.3/R3 arbitrary-value bans, R5.1/R5.3 (role exists + mapped), R8.1 (active-role↔token check),
R7.4 (suites green). The accessibility NFRs are solid. The problem is not rigor — it's that the
rigor is aimed entirely at compliance and not at identity.

---

## Dimension 4 — Scope errors vs. the steering boundary

**R8 is scope creep, and it directly contradicts steering.** design-system.md routes CI work
explicitly and repeatedly:
- Deferred Decisions: "**CI gate upgrades** — LCP/CLS/INP + byte-weight assertions, full-route
  Lighthouse coverage, and the active-role↔token automated check — `Deferred: tech.md / CI`
  (enforcement is tech.md's domain)."
- Governance: the active-role↔token check is "`Deferred: tech.md / CI`."
- Gates section: "*How* they are enforced... is owned by `tech.md`/CI and changes there; this section
  deliberately does **not** track CI state."

R8 then pulls **all of it** into this visual-design spec: the active-role↔token CI check (R8.1),
LCP/CLS/INP + byte-weight Lighthouse assertions and full-route coverage (R8.2), and
`disableTransitionOnChange` in code (R8.3). R8.2 even self-narrates the contradiction — "(owned by
`tech.md`/CI)" — *inside a requirement that claims it for this spec.* That parenthetical is an
admission the requirement is misfiled. v5 of the steering doc (revision history) specifically
*removed* `disableTransitionOnChange` and the CI trivia from steering as churny tech.md detail; R8.3
drags it right back into a sibling design spec. **Challenge:** R8 bloats a design spec with
build-tooling that steering has three times assigned elsewhere. The *outcomes* R8 protects (no
doc↔token drift; perf budget; no FOUC) are legitimate and this spec can *depend on* them — but the
CI/tooling *work* belongs in a tech/CI spec. Cut R8 to a dependency reference, or this design spec
can't be "done" until unrelated CI plumbing lands, coupling design approval to pipeline work.

**The mirror-image error: too much design *implementation* pulled into requirements.** R3.3 requires
the spec to "**produce** the legal pairing matrix" and R6.1 to "**decide** the surface separation
language" / "decide elevation." Steering routes both to `Deferred: design spec` — but "design spec"
spans *requirements* and *Design*. Producing a full foreground×surface pairing matrix and *deciding*
the elevation system are **Design-phase artifacts** (they need concrete token values, which the doc
itself says are Design-phase — Introduction para 2). Requirements should say "*a* legal matrix SHALL
exist and cover every used pairing in both themes" (the obligation) and let Design produce the
table. As written, R3.3/R6.1 smuggle Design deliverables into the requirements doc — the inverse
scope error to R8. So this doc is simultaneously too broad (R8 reaches into CI) and too deep
(R3.3/R6.1 reach into Design execution).

---

## Dimension 5 — Completeness: the missing visual-identity surface area

This is where the doc is most exposed. A *visual identity* spec that never names the artifacts that
actually carry a brand is incomplete. Confirmed by search: requirements.md contains **zero**
occurrences of favicon, wordmark, brand mark, logo, OG/social-share image, or signature. The
landing page and professional profile appear **only** inside R7.1's flat list of "eight sections" —
neither is named as a priority, despite being the funnel's first impression and centerpiece.

Gaps, ranked by how much they move the recruiter-funnel needle:

1. **Brand mark / wordmark (HIGH).** product.md's "MF" avatar is a placeholder. A personal site's
   single strongest identity carrier is its wordmark/mark, and the doc requires nothing about it.
   *Failure scenario:* the nav keeps a default-looking "MF" monogram; the site has literally no
   brand at the one spot a brand belongs. This is a genuine **requirements-level gap** — "a wordmark
   treatment SHALL be decided" is an obligation, even if the glyph itself is Design-phase.

2. **Landing hero + professional-profile as named priorities (HIGH).** The hero is the funnel's
   first impression; the profile is its centerpiece (product.md Business Objectives). Burying both in
   "all eight sections SHALL be styled consistently" (R7.1) guarantees they get *consistent*
   treatment, not *distinctive* treatment. *Failure scenario:* the hero is styled to the same calm
   restraint as the resources bookmarks page and makes no impression. **Requirements-level gap:** at
   least one identity-carrying surface must be named as a priority with a higher bar than "consistent."

3. **OG / social-share images (HIGH for the funnel specifically).** The site's reach is "shared link
   / search result" (product.md Target Users §3). A link pasted into Slack/LinkedIn with a blank or
   default OG card is a dead first impression *before anyone even visits.* **Requirements-level gap**
   for a funnel-driven site — at minimum "an OG image system SHALL exist."

4. **Favicon (MED).** Cheap, ubiquitous, and currently presumably the Next.js default. Tab identity.
   Belongs as a one-line requirement.

5. **Dark-mode-specific accent behavior (MED–HIGH, and a real trap).** R2.4 requires the accent be a
   "matched pair... not auto-derived." Good — but it stops there. An accent that reads as a confident,
   saturated link in light mode frequently goes muddy, low-contrast, or garish on a dark surface; the
   *behavioral* requirement (the accent must carry equivalent presence/legibility/state-distinction
   in dark, not merely pass 4.5:1) is missing. R3 covers contrast numerically but not *identity
   parity*. *Failure scenario:* the accent is a crisp signature in light, a dull grey-blue smudge in
   dark, and half the recruiters (dark-mode users) never see the identity at all.

6. **Link / hover / visited treatments (MED).** R2.2 says accent applies to "links" but never
   specifies link *states*. Visited-link styling in particular is a classic omission that makes a
   content site (blog, resources, blogroll) feel unfinished. Steering defers hover/active token
   *values* but the *requirement that link states are designed* belongs here.

7. **Selection + scrollbar + empty/loading states (LOW–MED).** `::selection` color and custom
   scrollbar are exactly the "craft-signaling details" dim. 1 found missing — cheap distinctiveness.
   Empty/loading states: steering defers the skeleton convention; this spec styling eight sections
   should at least require loading/empty states be covered. These are polish, not funnel-movers, but
   they're the difference between "templated" and "cared-for."

**Correctly deferred (do not add as requirements):** exact OKLCH values, exact type ratio/steps,
exact spacing steps, the rendered pairing *table*, z-index values, print/PDF styling, i18n/RTL.
Steering already defers these and the doc rightly doesn't re-decide them. The gaps above are
*requirements-level obligations* (that an artifact must exist / be decided), distinct from the
*concrete values* legitimately left to Design.

---

## Dimension 6 — Did the direction get decided too cheaply?

**Yes.** This is arguably the doc's biggest process failure. Steering's headline deferral is:
"**Direction:** refine the current neutral/minimal look vs. a distinct brand identity —
`Deferred: design spec (requirements)`" — and the Deferred Decisions preamble says the identity is
"chosen and **adversarially pressure-tested** in the design spec's requirements phase."

This doc's Introduction records the answer in its **first sentence** — "The chosen direction is
**minimal + one accent**" — with:
- **no stated rationale** tying single-accent to the recruiter audience,
- **no alternatives considered** (no editorial/typographic-led direction, no two-tone, no
  texture/material direction, no "distinctive minimalism with a signature gesture"),
- **no reference targets** (the frontend-design lens and good practice both call for reference
  points), and
- **no requirement to validate** the choice against the audience.

The steering doc *commissioned an adversarial pressure-test of the direction itself* and the
requirements doc delivered a fait accompli instead. "Minimal + one accent" isn't wrong — but it was
**asserted, not earned**, and it happens to be the lowest-effort, highest-AI-default answer
available, which is precisely the answer an adversarial process is supposed to catch.

**Is one accent enough to differentiate a portfolio?** On its own, no — single-accent-on-neutral is
the modal developer site. One accent can work *only if* paired with a distinctive type voice, a
signature spatial gesture, or a memorable detail — none of which this doc requires (dims. 1–2,
5). So the direction as specified boxes the Design phase into the generic quadrant **before any
exploration happens**: Design inherits "restraint by default" (R2.3) as a near-veto on the very
moves that would rescue distinctiveness.

---

## Closing deliverables

### Top 5 risks/gaps (with concrete failure scenarios)

1. **No distinctiveness requirement → forgettable site (dim. 1).** *A recruiter closes 12 portfolio
   tabs and cannot recall a single thing about Matthew's, because it passed only invisible
   compliance bars and looked like the other 11.* The funnel depends on recall; nothing here
   produces it.

2. **Direction decided without the commissioned pressure-test (dim. 6).** *Six months on, "why
   minimal + one accent and not a typographic-led identity?" has no recorded answer — because the
   spec asserted the lowest-AI-default direction in sentence one and skipped the adversarial
   exploration steering explicitly ordered.*

3. **Missing identity artifacts: wordmark / OG / hero priority (dim. 5).** *Matthew's link pasted in
   a recruiter's LinkedIn DM shows a blank OG card; they don't click. If they do, the nav shows a
   placeholder "MF" monogram and the hero is as quiet as the bookmarks page. The site has no brand at
   the three spots a brand lives.*

4. **Type voice dropped; Geist assumed by silence (dim. 2).** *Headings render in the same Geist that
   ships with the Next.js starter at a default weight ramp; the typography signals "I used the
   template defaults," the exact opposite of builder craft.*

5. **R8 CI scope creep blocks design approval (dim. 4).** *The visual-design spec can't be marked
   done because LCP/CLS/INP Lighthouse assertions and a CI doc↔token check — work steering assigned
   to tech.md/CI three times — are bundled into it, coupling identity sign-off to unrelated pipeline
   work.* Plus the inverse: R3.3/R6.1 pull Design-phase artifacts into requirements.

### Top 3 conclusions to challenge or reverse

1. **Reverse: "restraint by default" (R2.3) as a top-level rule.** As written it's an unfalsifiable
   anti-distinctiveness ratchet — any color use "could've been neutral." Replace with a positive,
   enumerated accent allow-list *plus* an explicit requirement for at least one deliberate
   identity-carrying gesture. Restraint should be the *texture* of the design, not a veto on having a
   point of view.

2. **Challenge: "minimal + one accent" as a settled premise (Introduction).** Don't necessarily
   reverse the outcome — but require it to be *earned*: add a rationale tying the choice to the
   recruiter audience, name the alternatives weighed, and add reference targets. Steering asked for a
   pressure-tested direction; deliver one.

3. **Reverse the R8 scope decision (and trim R3.3/R6.1).** Move the CI/tooling *work* to its rightful
   tech.md/CI home and have this spec merely *depend on* those outcomes; reduce R3.3/R6.1 from
   "produce the matrix / decide elevation" (Design deliverables) to "a matrix SHALL exist covering
   used pairings" / "a surface-separation language SHALL be decided" (requirements obligations).

### What's missing — requirements-level gaps vs. correctly deferred

**Genuine requirements-level gaps (add before acting on this doc):**
- A **distinctiveness / point-of-view** requirement — the identity must have a stated, traceable
  rationale and at least one memorable signature element. (Currently absent entirely.)
- A **typographic voice** requirement (display treatment / weight contrast / rhythm) and an explicit
  **keep-or-replace Geist** decision with rationale.
- **Wordmark/brand-mark**, **favicon**, and **OG/social-share image** obligations.
- **Landing hero** and **professional-profile** named as identity priorities with a bar above mere
  consistency.
- **Dark-mode accent *identity parity*** (presence/state-distinction, beyond R3's numeric contrast).
- **Link states** including **visited**; loading/empty-state coverage for the eight sections.
- A **numeric "near-neutral" chroma ceiling** as a rule (the exact value stays Design-phase).

**Correctly deferred — do NOT add:** exact OKLCH values, exact type ratio/steps/line-heights, exact
spacing steps, the rendered pairing *table*, z-index values, print/PDF, i18n/RTL, motion
duration/easing tokens. Faulting these would be wrong; the doc is right to leave them to Design.

### Explicit verdict

**Needs revision — do not approve as-is.** The doc is rigorous on compliance and accessibility (R3,
R5, R7.4, the NFRs are genuinely good) but fails its primary charter: it neither produces a
*distinctive* identity nor honors steering's order to pressure-test the *direction*, and it omits the
artifacts that carry a brand. It would pass every gate and still ship a forgettable, template-shaped
result.

**Must-fix list (and only these):**
1. Add a **distinctiveness / point-of-view requirement** with at least one named signature element
   and a traceable identity rationale (fixes dims. 1, 6).
2. Add a **typographic-voice requirement** and an explicit **Geist keep/replace** decision (dim. 2).
3. Add **wordmark, favicon, and OG-image** requirements; **name the hero and profile as priorities**
   with a higher bar than "consistent" (dim. 5).
4. **Reframe R2.3** from "restraint by default" veto to a positive, enumerated accent allow-list;
   add **dark-mode accent identity parity** and **link/visited-state** requirements (dims. 1, 5).
5. **Move R8's CI/tooling work to tech.md/CI** (depend on it, don't own it); **demote R3.3/R6.1**
   from Design-deliverable to requirements-obligation (dim. 4).
6. **Make the unfalsifiable criteria testable:** define an enumerable change-set for R1.2, a numeric
   chroma ceiling for "near-neutral," and either drop or mechanize the judgment for R1.1 (dim. 3).
