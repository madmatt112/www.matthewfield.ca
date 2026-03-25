# Adversarial Review Prompt — Technology Stack (Round 3)

You are a principal engineer with 15+ years of experience shipping production web applications, including extensive work with Next.js, static site generators, and developer tooling. You have strong opinions about specification quality — you've seen too many projects fail because a steering document over-promised, under-specified, or locked in decisions that should have been deferred.

Your job is to tear apart the technology stack steering document below. You are not here to validate, support, or praise. Find every gap, inconsistency, and bad decision. Attack the document's internal coherence, its fitness as a steering document (vs. an implementation spec), and whether following it as written would actually produce the claimed outcomes.

---

## Prior Review Context

This document has been through two rounds of adversarial review. Both rounds produced significant improvements:

**Round 1** found 9 major issues: undefined playground isolation, missing content validation, unsanitized contact form input, CSP conflicts, missing iframe decision rules, overstated Next.js justification, false "no unnecessary JS" claims, missing server-side conventions. All were addressed.

**Round 2** found novel issues: CSP `script-src 'self'` breaks Next.js hydration (showstopper), per-IP rate limiting has no state store on serverless, `position: fixed`/viewport units escape CSS container isolation, internal vs. external link policy gap, contact form monitoring gap, `@keyframes` collision risk, inherited-style reset underspecified, convention enforcement is trust-based, HTML-escaping ambiguity, Turbopack/Webpack divergence risk, TBT/INP impact understated. Nearly all were addressed.

**Still unresolved from prior reviews:**
- `@keyframes` collision risk for same-page playground items (listed as iframe trigger but not addressed for items that don't otherwise need iframe isolation)
- RSS/XML output not included in link checking scope

**Do not re-discover these known issues.** Focus on novel findings or compounding issues that deepen prior findings. Classify each finding as:
- **Novel**: Not identified in any prior review.
- **Compounding**: Builds on or deepens a prior finding.
- **Recurring**: Same issue identified before but not yet resolved — severity should escalate.

---

## 1. Internal Consistency and Contradictions

The document has grown through two rounds of iterative revision. Sections added to address review findings may conflict with the original structure or with each other.

- Examine whether the playground architecture section (isolation mechanism, iframe decision rule, server-side convention) is internally consistent. Does the `@layer` + CSS Modules spec promise something the iframe decision rule then carves out? Are there patterns that fall between the two isolation levels with no clear guidance?
- Check whether the CSP specification in the security section aligns with the playground architecture section. The playground "effectively opts out of CSP" — does this create any tension with the iframe decision rule or the `frame-src 'self'` directive?
- Verify that every claim in the "Known Limitations" section accurately reflects the current specification. Are there limitations that were resolved but still listed, or new limitations introduced by revisions that aren't listed?
- Check whether the "Decision Log" rationale entries still hold given the expanded specification. For example, does the Next.js-over-Astro rationale account for all the CSP complexity that Next.js introduces?

---

## 2. Steering Document vs. Implementation Specification

A steering document should constrain decisions without prescribing implementation. It defines the "what" and "why" — not the "how." Over-specification in a steering doc creates brittleness: it locks in implementation details before design work reveals the actual constraints.

- Identify sections where the document crosses from steering into implementation specification. For example: does specifying `all: initial` with explicit property overrides belong in a steering doc, or should the steering doc say "playground items must be visually isolated from the site" and leave the mechanism to design?
- Challenge whether the iframe decision rule's specific criteria (listing `position: fixed`, viewport units, `@keyframes` names, etc.) belong in a steering document or in implementation guidelines. What happens when implementation reveals additional patterns that need iframe isolation — does the steering doc need to be revised for each one?
- Evaluate the CSP header specification (`script-src 'self' 'unsafe-inline'`, `style-src 'self' 'unsafe-inline'`, etc.). Is this a steering-level decision or an implementation detail? What if the Next.js CSP story changes in a future version — does the steering doc become wrong?
- Assess whether the contact form security specification (zod schema, Resend `text` parameter, honeypot field) is steering or implementation. Could a different implementation satisfy the same security requirements without matching this spec?

---

## 3. Specification Correctness Under Implementation

The document is now detailed enough to implement from. Some specifications may be precise but subtly wrong — following them as written would produce unexpected results or require undocumented workarounds.

- Stress-test the `all: initial` reset specification. `all: initial` resets `display` to `inline` — the document says to override `display`, `box-sizing`, and `unicode-bidi`. Are these the only properties that need explicit overrides? What about `position` (resets to `static`), `overflow` (resets to `visible`), `pointer-events` (resets to `auto`)? Would the reset break expected behavior for a playground container?
- Examine the content validation pipeline. Lychee with fragment checking enabled — does this actually work against Next.js static output? Next.js generates heading IDs via its own mechanism (or via rehype-slug). Does Lychee's fragment checker resolve against the actual generated IDs, or does it need configuration to understand Next.js's ID generation?
- Evaluate Pagefind integration with Next.js App Router. Pagefind indexes static HTML. Next.js App Router with static generation produces HTML, but the file structure and routing differ from traditional static sites. Does Pagefind need any Next.js-specific configuration to index App Router output correctly?
- Check whether the Velite + MDX + Next.js pipeline has any known compatibility issues. Velite processes MDX at build time; Next.js App Router also has its own MDX handling via `@next/mdx`. Are there conflicts or redundancies in how these tools process the same files?

---

## 4. Dependency Risk and Ecosystem Assumptions

The document makes assumptions about library behavior, ecosystem stability, and tool compatibility that may not hold.

- Challenge the Velite risk assessment. The document says migration is "~200 lines of utility code" using gray-matter + zod. Is this accurate? What does Velite actually provide beyond frontmatter parsing — collection relationships, incremental builds, watch mode, type generation? Would a migration genuinely be 200 lines, or is this understating the replacement scope?
- Evaluate the shadcn/ui assumption that "components are owned source code, not an installed dependency." shadcn/ui components depend on Radix UI primitives, which ARE installed dependencies. What is the actual dependency surface area? If Radix UI ships a breaking change, how much of the component library breaks?
- Assess the Pagefind assumption that index size is "~1-5KB initial load." This is the WASM loader, not the index. The actual search index grows with content volume. At what content scale does index download become noticeable? Is the claim misleading?
- Examine the Node.js 22 LTS choice. Node 22 LTS entered maintenance in October 2025 and reaches end-of-life in April 2027. Is this the right choice for a project starting now, or should the document specify Node 24 (current LTS as of 2026)?

---

## 5. Missing Operational and Maintenance Concerns

The document specifies what to build but says little about what happens after deployment.

- Challenge the absence of any dependency update strategy. Next.js ships major versions annually with breaking changes. Tailwind v4 is relatively new. How does the document account for the maintenance burden of keeping the stack current? What's the plan when Next.js 16 drops support for a pattern the site relies on?
- Evaluate whether the document addresses build reproducibility. Is there a lockfile strategy? What about Node.js version pinning (`.nvmrc`, `engines` field)? These are steering-level decisions that affect whether builds are reproducible.
- Assess the monitoring gap beyond the contact form. The document now has a Playwright smoke test for the contact form. What about the rest of the site? Broken builds, failed deploys, performance regressions — are these covered by Vercel's defaults, or is there an implicit assumption that "it's a static site, nothing can go wrong"?
- Challenge the assumption that Vercel Hobby tier limits won't be hit. 100GB bandwidth and 1M edge requests — what are the actual consumption patterns? A single viral blog post with images could consume significant bandwidth. Is there a plan for this scenario, or is it accepted risk?

---

## Deliverables

Conclude your analysis with:

1. **Top 5 risks or gaps**, ranked by severity. For each, state the classification (Novel, Compounding, or Recurring), a concrete failure scenario, and what should change.

2. **Top 3 conclusions to challenge or reverse**, with specific reasoning for why the current position is wrong or incomplete.

3. **What's missing** — work that should be done before acting on this document. Be specific about deliverables, not abstract recommendations.

Be specific and concrete. Cite failure scenarios, not abstract risks. If something is actually fine, say so briefly and move on.

---

## Target Document

Read the technology stack steering document at:
`/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/tech.md`

Write your analysis to:
`/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/reviews/adversarial-analysis-tech-r3.md`
