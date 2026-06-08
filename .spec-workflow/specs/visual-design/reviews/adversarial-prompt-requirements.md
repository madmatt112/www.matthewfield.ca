# Adversarial Review — visual-design/requirements (v1)

You are a principal product designer and design-systems lead who has shipped distinctive,
high-craft marketing and portfolio sites. Tear apart this requirements document and find every real
weakness — ambiguity, untestable criteria, scope errors, contradictions with the steering docs, and
— above all — places where the requirements would produce a **generic, forgettable, "AI-default"
result** rather than a distinctive, credible identity. Do not validate or support. Use directive
framing ("Challenge…", "Stress-test…").

## FIRST: load the frontend-design lens
Before analyzing, invoke the **frontend-design** skill to load its design-quality framework:
call the Skill tool with skill `frontend-design:frontend-design` (args: a short note that you are
using it to critique a visual-design requirements doc for a developer's personal/portfolio site).
Apply its standards — distinctiveness, deliberate typography/color/space, avoiding generic AI
aesthetics — as the lens for dimensions 1 and 2 below. If the skill is unavailable, proceed using
the same principles from your own expertise and say so.

## Target document
/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/visual-design/requirements.md

## Context to read first (ground every attack in these — do not reason abstractly)
- `/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/design-system.md` — the design system this
  spec must conform to (token roles, gates, the "Deferred Decisions" this spec resolves).
- `/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/product.md` — audience (recruiters), tone
  ("professional but warm, a person's home, not a corporate template"), principles.
- The site is a Next.js 16 + Tailwind v4 + shadcn (OKLCH, near-neutral palette today) personal site;
  the chosen direction in this doc is **"minimal + one accent."** Deferring exact values
  (hue/scale numbers) to the Design phase is legitimate; do not fault that. Fault unfalsifiable
  rules, scope errors, missing requirements, and design timidity.

## Analysis dimensions (attack these — cite the actual Requirement numbers R1–R8 and NFRs)

1. **Generic-by-default risk (frontend-design lens).** "Minimal + one accent" is the single most
   common AI/template aesthetic. Challenge whether R1 ("one deliberate, professional product") and
   R2's heavy restraint ("accent only for interactive emphasis, never large surfaces, restraint by
   default") would yield a *distinctive* identity or a forgettable one. There is no requirement
   anywhere for distinctiveness, a point of view, a memorable signature element, or
   craft-signaling detail — for a site whose product goal is *builder credibility* to recruiters.
   Stress-test whether this doc optimizes for "inoffensive" over "memorable," and whether that
   undercuts the funnel it claims to serve.
2. **Typography & space as identity, not just legibility (frontend-design lens).** R4 fixes a type
   scale and ~75ch measure but treats type purely as legibility/consistency. Challenge the absence
   of any requirement on typographic *character* (display treatment, weight contrast, rhythm) — and
   that Geist (a default, ubiquitous developer font) is assumed without a requirement to evaluate
   whether it carries identity. Same for spacing: "wide & spacious" is asserted but no requirement
   makes spaciousness a deliberate, signature trait vs. generic whitespace.
3. **Untestable / unfalsifiable acceptance criteria.** Hunt R1–R8 for criteria a reviewer cannot
   rule pass/fail on: "near-neutral," "restrained," "calm," "restraint by default" (R2.3),
   "deliberate product" (R1.1), "visibly reflect the applied identity" (R1.2, measured how, against a
   baseline that is the thing being replaced?). Name each and demand an objective test or a named
   judgment mechanism.
4. **Scope errors vs. the steering boundary.** R8 pulls CI/tooling work — LCP/CLS/INP + byte-weight
   assertions, full-route Lighthouse coverage, the active-role↔token check, `disableTransitionOnChange`
   — into a *visual-design* spec, even though design-system.md explicitly routes "CI gate upgrades"
   to `tech.md`/CI. Challenge whether R8 is scope creep that bloats a design spec with build-tooling.
   Conversely, challenge whether R3.3 ("produce the legal pairing matrix") and "decide elevation"
   belong in requirements at all vs. the Design phase.
5. **Completeness — the missing visual-identity surface area.** A real visual identity for this site
   needs requirements this doc omits: the **brand mark / wordmark** (the current "MF" avatar is a
   placeholder), **favicon**, **OG/social-share images**, the **landing hero** and the
   **professional-profile** (the funnel centerpiece) as named priorities, **link/hover/visited**
   treatments, **empty/loading states**, **selection and scrollbar** detail, and **dark-mode-specific
   accent behavior** (an accent that works in light often dies in dark). Enumerate the gaps and rank
   which actually move the recruiter-funnel needle.
6. **Did the direction get decided too cheaply?** "Minimal + one accent" is recorded as settled with
   no requirement to explore or validate alternatives, no reference targets, and no stated rationale
   tying the single-accent choice to the audience. Challenge whether one accent is enough to
   differentiate a portfolio, and whether this boxes in the Design phase before any exploration.

## Closing deliverables
- **Top 5 risks/gaps**, each with a concrete failure scenario (e.g. "a recruiter remembers nothing
  about the site because…").
- **Top 3 conclusions to challenge or reverse**, with reasoning.
- **What's missing** — requirements that should exist before this doc is acted on; separate genuine
  requirements-level gaps from things correctly deferred to Design.
- **Explicit verdict:** is this requirements doc ready to approve, or does it need revision — and if
  so, the must-fix list only.

Be specific and concrete. Cite failure scenarios, not abstract risks. If something is genuinely
fine, say so in one line and move on.

## Output
Write your analysis to:
/home/mcf/repo/matthew-field.ca/.spec-workflow/specs/visual-design/reviews/adversarial-analysis-requirements.md
