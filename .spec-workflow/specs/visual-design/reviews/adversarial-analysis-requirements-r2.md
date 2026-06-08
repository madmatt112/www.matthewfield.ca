# Adversarial Analysis — visual-design/requirements (r2)

**Reviewer stance:** principal product designer / design-systems lead. Directive, not validating.
**Lens:** frontend-design skill loaded (distinctiveness / anti-generic-AI standard) and applied to dims 1–2.
**Grounding:** claims checked against `requirements.md`, `steering/design-system.md`, `steering/product.md`,
and the live `src/styles/tokens.css` / `globals.css`.

Round-1's six must-fixes were re-checked. All six hold and are non-cosmetic (see "Recurring" — none escalated).
Effort below is spent on **Novel** and **Compounding** findings, per the brief.

---

## Dimension 1 — Did the distinctiveness fix become testable, or just relocate the vagueness?

R3 trades "must be distinctive" for "ONE deliberate, memorable signature treatment … chosen in the Design
phase with a written rationale and at least two reference targets." That is a **real** improvement, not pure
relocation: the rationale + ≥2 reference targets are concrete, gradable artifacts a reviewer can demand and
inspect. The arbiter (R1.3: "Design approval + adversarial pass") is a legitimate process gate for subjective
craft — design quality is not numerically falsifiable and pretending otherwise would be worse.

But two things did relocate rather than resolve:

- "**Memorable**" is still the operative adjective in R3 and R3's user story, and nothing downstream defines
  what the adversarial pass tests it against. The arbiter is named but **un-instructed** — there is no
  rubric, no "fails if a neutral shadcn site could score identically" clause. A signature element can be
  *present, tokenized, and on the hero* (all checkable) yet still be forgettable. R3.1's own examples ("a
  distinctive heading/display treatment, a recurring visual motif, or a confident accent moment") include
  options that a generic build satisfies trivially — a slightly-bolder H1 is "a distinctive heading
  treatment." This is the **Dimension-2 loophole** restated: the *test* exists, the *bar* doesn't.

- **R2 vs R3 tension is real but survivable, not contradictory.** R3.2 explicitly subordinates the signature
  to R2 ("without violating the restraint rules"), and R3.4 subordinates it to the gates. So they can both be
  satisfied. The risk is not logical contradiction — it's that R2's rules are *enumerated and grep-able*
  while R3's bar is *vibes*, so under pressure an implementer optimizes for the testable constraint (restraint)
  and lets the untestable one (memorability) decay to the minimum. That asymmetry is the actual defect, and
  it's a SHOULD_FIX, not a MUST.

## Dimension 2 — Residual generic risk (frontend-design lens)

Applying the anti-generic standard: a fully R1–R10-compliant build **can still be a generic shadcn-neutral
site.** Walk the loophole:

1. R2 forces zero-chroma base + one accent confined to interactive emphasis. That is *exactly* the default
   shadcn-neutral posture.
2. R4 requires type be "evaluated" and "carry character" — but R4.1 permits keeping Geist ("evaluate the
   current Geist … and choose with a written rationale"). Geist + a written rationale = compliant + generic.
   "Deliberate character (weight contrast, display/heading treatment, rhythm)" is satisfiable with a heavier
   H1 weight. No characterful display face is *required*.
3. R3 is the only thing standing between this spec and template-grade output, and per Dimension 1 its bar is
   unspecified.

So the doc's anti-generic guarantee rests entirely on one requirement (R3) whose pass condition is delegated
to an arbiter with no rubric. That's a **Compounding** gap: R2+R4 actively pull toward neutral-default, and
the single counterweight is the softest-tested requirement in the doc. Tightening R3's bar (below) is the
highest-leverage fix in the review.

## Dimension 3 — Testability gaps that survived v2

- **R2.1 "at or near zero chroma."** r1-6 asked for a *numeric chroma ceiling as a rule.* v2 did not deliver
  one — "near zero chroma" is unfalsifiable at exactly the boundary that matters (is OKLCH chroma 0.02 a
  compliant "near-neutral grey" or a smuggled second tint?). Steering itself is more precise: design-system.md
  says "the greyscale ramp is **zero-chroma**" (flat statement) and only `destructive` carries chroma. The
  requirement is *looser* than its own steering. A one-line numeric ceiling (e.g. "base/grey roles ≤ 0.01
  chroma; only accent + status roles exceed it") makes R2.1 a rule instead of an adjective. **SHOULD_FIX.**

- **R3.1 "memorable" / "confident accent moment"** — covered above; unfalsifiable, load-bearing. The fix is a
  rubric for the arbiter, not deletion. **SHOULD_FIX.**

- **R1.3** "applies the finalized tokens and the signature treatment on its key surfaces" — "key surfaces" is
  undefined for six of the eight sections (only hero + profile are named, in R3.2/R8.3). For projects, blog,
  resources, contributions, slashes a reviewer cannot rule pass/fail on *where* the signature must land. This
  is tolerable if intentional (signature is hero+profile-first per R8.3, others get tokens only) — but R1.3's
  "every section … and the signature treatment" reads as requiring the signature *everywhere*, which then
  contradicts R8.3's "first and most fully" priority framing. See Dimension 4. **SHOULD_FIX (conflict, not
  just vagueness).**

- **R7.1** "spaciousness SHALL be a deliberate, consistent trait (named minimum gutters / section rhythm)" —
  the *named* values are correctly deferred to Design, and the rule "named step, never arbitrary" is testable.
  This one is fine. Not a gap.

## Dimension 4 — New contradictions / scope errors introduced by v2

- **NOVEL — R2.2 collides with an existing, occupied token role (`accent`).** This is the strongest finding.
  R2.2: "A SINGLE brand accent SHALL be introduced as a design-system role (defined in `tokens.css`, mapped
  in `@theme`)." But `--accent` **already exists** in `tokens.css` and is **already mapped** in `@theme` —
  and it is the inherited shadcn *neutral hover-surface tint*, zero-chroma:
  `--accent: oklch(0.97 0 0)` (light) / `oklch(0.269 0 0)` (dark), mapped at `globals.css:60`. design-system.md
  also lists `accent` in its **active** role set (line 64). So the requirement's literal text ("introduce …
  as a design-system role") is ambiguous-to-wrong: the brand accent is *not* a new role to introduce — either
  it repurposes the existing zero-chroma `accent` (a breaking semantic change to a role shadcn components
  consume for hover surfaces, which would violate R2.3's "SHALL NOT fill … surfaces" because `accent` *is* a
  surface fill today), or it needs a **differently-named** new role and R2.2 should say so. As written, an
  implementer who reads "introduce the brand accent as the `accent` role" produces a contradiction with R2.3
  and breaks every shadcn hover state. The requirement must name which: repurpose-and-rename, or new-role
  (e.g. `brand`/`link`), and acknowledge the existing `accent` occupant. **MUST_FIX** (false/ambiguous claim
  about the token reality + latent contradiction with R2.3).

- **R10 ownership — clean.** R10.2 routes LCP/CLS/INP + byte-weight, full-route Lighthouse, and the
  active-role↔token CI check to `tech.md`/CI, "depends on and coordinates with … but does not own." R10.3
  correctly keeps the *app-code* no-flash change in scope. This matches design-system.md's Deferred Decisions
  ("CI gate upgrades … `Deferred: tech.md / CI`"). r1-5 is genuinely fixed, non-cosmetic. No residual ownership.

- **R3.2 / R8.3 priority vs R1.3 "every section" — internal conflict.** R8.3 and R3.2 say the signature lands
  on hero + profile "first and most fully" (priority surfaces). R1.3 says "every `(site)` section SHALL apply
  … the signature treatment on its key surfaces." Either the signature is everywhere (R1.3) or it's
  hero/profile-prioritized with others lighter (R8.3). Reconcile: R1.3 should say *finalized tokens
  everywhere; signature on the priority surfaces per R8.3*. **SHOULD_FIX.**

- **"≥2 reference targets" (R3.1) smuggling Design execution?** No. Naming reference targets is a
  requirements-level obligation (it constrains *what must be true* of the Design output without choosing the
  treatment). This does **not** over-reach into Design altitude. Correctly placed.

## Dimension 5 — Completeness after v2

True requirements-level gaps (not Design values):

- **Print/PDF for the profile.** product.md frames the professional profile as a "visual resume/CV" and the
  whole site as a recruiter funnel; design-system.md explicitly carries "**Print / PDF styling** for the
  recruiter-facing profile (neutral+dark prints poorly) — `Deferred: design spec`." This *visual-design* spec
  is that design spec, yet **no requirement addresses print/PDF.** A recruiter printing the CV on a
  neutral+dark identity is a named funnel risk in steering that this spec inherits and drops. This is a
  genuine requirements-level obligation, not a Design value. **SHOULD_FIX** (completeness gap with a direct
  funnel cost).

Correctly-deferred Design values (do **not** add): exact OKLCH accent hue, type scale numbers, the signature
treatment itself, spacing steps, elevation/pairing language, motion duration/easing, legal-pair matrix,
z-index values. The doc draws this line well and mostly resists over-correcting.

One **over-correction check**: R8's artifact list (wordmark, favicon set, OG image, link/visited states) is
at the right altitude — these are *deliverable obligations*, not executions, and link/visited state existence
is a genuine requirements gap r1 correctly surfaced. Not over-reach.

---

## Top risks / gaps

1. **R2.2 brand-accent role collides with the existing zero-chroma `accent` token** (Novel, **MUST_FIX**).
   The "introduce … as a design-system role" text is wrong/ambiguous against `tokens.css` (`--accent` exists,
   is mapped, is a neutral surface fill) and latently contradicts R2.3's no-surface-fill rule. Must name
   repurpose-vs-new-role.
2. **The anti-generic guarantee rests on one under-specified requirement** (Compounding, SHOULD_FIX).
   R2 + R4 pull toward shadcn-neutral default; R3 is the only counterweight and its "memorable" bar has no
   rubric for the named arbiter. Give the adversarial pass a pass/fail rubric for R3.
3. **R2.1 "near zero chroma" is looser than its own steering** (Recurring-adjacent / SHOULD_FIX). r1-6 asked
   for a numeric ceiling; v2 still uses an adjective. design-system.md says the ramp is *zero-chroma*. Add a
   numeric chroma ceiling for base roles.
4. **R1.3 vs R8.3/R3.2 signature-coverage conflict** (Novel, SHOULD_FIX). "Every section … signature" vs
   "hero+profile first and most fully." Reconcile the scope of where the signature is mandatory.
5. **Print/PDF profile styling dropped** (Novel, SHOULD_FIX). Steering defers it *to this spec* and flags
   neutral+dark prints poorly; the recruiter CV funnel needs it. No requirement covers it.

## Conclusions to challenge / reverse

- Challenge the implicit claim (Introduction + R3) that adding R3/R4/R8 makes a generic outcome impossible.
  It does not — it makes one *detectable if the arbiter is strict*, but the doc never instructs the arbiter to
  be strict. Reverse the assumption that "named arbiter" == "enforced bar."
- Challenge R2.2's framing that the brand accent is a *new* role to "introduce." The role name it most wants
  (`accent`) is occupied by a conflicting use.

## What's missing — true gaps vs correctly-deferred values

- **True requirements gaps:** print/PDF profile obligation (#5); the R3 arbiter rubric (#2); the R2.2 role
  disambiguation (#1); the numeric chroma ceiling (#3); the signature-coverage reconciliation (#4).
- **Correctly deferred (leave alone):** accent OKLCH values, type scale, signature treatment, spacing steps,
  elevation language, motion tokens, legal-pair matrix, z-index. Do not pull these up to requirements altitude.

## Recurring (escalate) check — r1 fixes

- r1-1 → R3 exists, real artifacts (rationale + ≥2 refs). Not cosmetic. Hold (but bar under-specified — see #2).
- r1-2 → R4 evaluates Geist vs alts, type-as-character. Not cosmetic. Hold (Geist-keep loophole noted, #2).
- r1-3 → R8 delivers wordmark/favicon/OG, hero+profile priority. Hold.
- r1-4 → R2.3 enumerated allow-list + never-fills-backgrounds; R2.2 dark-mode pair; R8.4 link/visited. Hold.
- r1-5 → R10 routes CI to tech.md/CI, depend-not-own; elevation/pairing are Design deliverables. Clean. Hold.
- r1-6 → base zero-chroma except accent/status: **partially** held — "near zero chroma" reintroduced softness
  (see #3); R1.2 enumerable + named arbiter held; R1.1 reframed. No escalation (it's a SHOULD, not a
  reintroduced MUST), but it is the one r1 fix that decayed at the edges.

```
VERDICT: iterate
MUST_FIX: 1
SHOULD_FIX: 4
MINOR: 0
DESIGN_READY: no
ESCALATE: none
```
