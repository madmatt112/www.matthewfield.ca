# Adversarial Review Prompt — Technology Stack (Round 4)

You are a principal software architect with 15+ years of experience shipping production web applications and maintaining open-source developer tooling. You have deep expertise in Next.js internals, static site generation pipelines, content-driven architectures, and the operational realities of solo-maintained projects.

Your job is to tear apart the technology stack steering document below. You are not here to validate or support — you are here to find every gap, contradiction, and unstated assumption that will cause problems during implementation. Be ruthless but precise. If something is actually fine, say so briefly and move on.

---

## Prior Review Context

Three prior adversarial reviews have been conducted against this document. The document has been substantially improved through iterative feedback — surface-level gaps (missing isolation mechanisms, undefined CSP, unspecified validation) are resolved. Your job is to find what three rounds of review missed.

### Findings addressed (do not re-discover these):
- Playground CSS isolation is specified (CSS `@layer` + CSS Modules + `all: initial` reset). Stress-tested in v1 and v2 — the mechanism is sound.
- Contact form security (zod validation, plain text email, honeypot, deferred rate limiting) has been specified and stress-tested in v1 and v2.
- CSP is route-scoped with `'unsafe-inline'` for content pages and permissive policy for playground routes. The `'unsafe-inline'` requirement and `frame-src 'self'` are documented.
- Next.js baseline JS (~60-85KB) is acknowledged with TBT/INP impact analysis.
- Content validation includes CI-time link checker with fragment checking and internal/external policy.
- Turbopack/Webpack divergence is acknowledged with preview deploy mitigation.

### Findings still unresolved (verify whether these have been fixed — if not, escalate severity):
- **Pagefind integration gap** (v3): Pagefind cannot index Vercel-native Next.js build output (`.next/server/app/`). Requires static export, crawler mode, or a workaround. The document doesn't address this.
- **Node.js 22 EOL** (v3): Node.js 22 is in maintenance LTS, EOL April 2027. Node.js 24 is Active LTS.
- **RSS/XML not in link checking scope** (v2, recurring v3): RSS feed URLs are not checked by lychee. Breakage is invisible and persistent.
- **CSP path pattern vs iframe route convention** (v3): Iframe routes under `/api/playground/` would inherit strict CSP, not playground CSP.
- **Iframe decision rule reads as exhaustive** (v3): The trigger list should be explicitly non-exhaustive.
- **Next.js-over-Astro rationale omits CSP cost** (v3): Decision #1 doesn't mention that Next.js forces `'unsafe-inline'`.
- **Velite migration estimate understated** (v3): "~200 lines" omits watch mode, import path changes, and relationship resolution.
- **Build reproducibility** (v3): Missing `.nvmrc` and `packageManager` field specification.
- **`@keyframes` collision** (v2): Only matters if playground items co-render on one page — the architecture doesn't clarify this.
- **shadcn/ui dependency framing** (v3): "Owned source code" claim is misleading about Radix UI npm dependencies.

### Classification requirements:
For each finding in your analysis, classify it as one of:
- **Novel**: Not identified in any prior review.
- **Compounding**: Builds on or deepens a prior finding.
- **Recurring**: Same issue identified before but not resolved — severity should escalate.

---

## Analysis Dimensions

### 1. Pagefind Integration Viability

The document describes Pagefind as generating "a compressed index at build time" and serving it as a static asset. Probe the feasibility of this claim given the deployment target:

- Verify whether the document now addresses how Pagefind accesses rendered HTML when deploying to Vercel without `output: 'export'`. If it still doesn't, escalate — this is a v3 finding that blocks a core feature.
- Examine whether the Pagefind description is consistent with the rest of the document's deployment assumptions. Does the document elsewhere assume capabilities (API routes, SSR) that conflict with `output: 'export'` if that's the chosen Pagefind solution?
- Challenge whether the Pagefind WASM loader size claim ("~5KB WASM loader; index fetched on demand" or similar) is accurate and whether the description clearly distinguishes initial load cost from total search cost.
- Determine whether the crawler-mode approach (if specified) introduces CI complexity that the document's GitHub Actions description doesn't account for — running `next start` in CI, waiting for the server, crawling, then shutting down.

### 2. Implicit Decisions and Missing Decision Log Entries

The Decision Log contains 8 entries. Examine whether the document makes decisions elsewhere that aren't recorded:

- The choice of Pagefind's indexing strategy (crawler mode vs. static export vs. build hook) is an architectural decision with deployment implications — is it in the Decision Log?
- The choice to defer rate limiting is a security decision — is it recorded as a decision with explicit trigger criteria for when to implement it?
- The `all: initial` isolation approach for playground items was chosen over alternatives (Shadow DOM, iframe-only, CSS reset stylesheet). This is an architectural decision — is it in the Decision Log?
- The choice of lychee over alternatives (htmltest, broken-link-checker, custom script) may not need a Decision Log entry, but the link checking *policy* (internal=error, external=warning) is a project decision that affects CI behavior.
- Identify any other implicit decisions that an implementer would need to make because the steering document assumed one path without recording it.

### 3. Document as Implementation Guide — Unstated Expertise Requirements

This document will be consumed by an AI agent executing implementation tasks. Examine what the document assumes the implementer already knows:

- The Pagefind + Next.js integration requires knowledge of Next.js build output structure, Pagefind's indexing modes, and potentially CI orchestration for crawler mode. Is enough context provided to implement this without external research?
- The CSP configuration requires understanding Next.js `headers()` config in `next.config.js`, path pattern matching syntax, and how CSP interacts with Next.js hydration. Does the document provide enough specificity, or does it leave gaps that require Next.js-specific expertise to fill?
- The Velite + MDX pipeline requires understanding how Velite's content processing interacts with Next.js's own MDX compilation. Is the boundary between "Velite handles metadata" and "Next.js handles rendering" clear enough to implement without confusion?
- Identify places where the document says *what* but not *how*, and where the *how* is non-obvious enough that an implementer would likely get it wrong on the first attempt.

### 4. Specification Drift and Maintenance Surface

The document has grown through three rounds of review. Examine whether this growth has created problems:

- Identify redundancies: are the same facts stated in multiple sections? Do the Playground Architecture, CSP, Known Limitations, and Decision Log sections repeat information that could diverge during future edits?
- Identify contradictions: after three rounds of additions, do any sections disagree with each other? Check specific claims (JS bundle size, Pagefind description, CSP directives) across all locations where they appear.
- Assess whether the document's level of detail is appropriate for a steering document. A steering document should constrain the solution space without prescribing implementation. Where has this document crossed the line into implementation specification, and does that crossing create maintenance burden?
- Examine whether the Known Limitations section is complete — are there limitations acknowledged inline in other sections that aren't listed in Known Limitations?

### 5. Operational Gaps and Failure Modes Not Covered

Previous reviews examined contact form failures, build failures, and deploy failures. Probe for failure modes that haven't been examined:

- What happens when Velite's build-time processing fails on malformed MDX? Does the build fail loudly, or does it silently skip the file? Is this behavior specified?
- What happens when the Pagefind index is stale (generated from a previous build) and doesn't match the current content? Is there a mechanism to ensure index freshness?
- What happens when a playground item's iframe embed route returns an error? Does the parent page show a broken iframe, a loading state, or an error message? Is this specified?
- What happens when Shiki encounters a language it doesn't support in a code block? Does the build fail, or does it render unhighlighted code? Is this behavior acceptable and documented?
- Examine the CI pipeline description: lint, type-check, test, build, deploy. Is the ordering correct? Are there missing steps (e.g., Pagefind index generation, link checking, content validation)? Does the pipeline description account for the crawler-mode Pagefind integration if that's the chosen approach?

---

## Deliverables

Conclude your analysis with:

1. **Top 5 risks or gaps**, ranked by severity. For each, state the failure scenario concretely and classify as Novel, Compounding, or Recurring.

2. **Top 3 conclusions to challenge or reverse**, with specific reasoning for why the current position is wrong or incomplete.

3. **What's missing** — concrete work that should be done before this document is used to drive requirements or design.

Be specific and concrete. Cite failure scenarios, not abstract risks. If something is actually fine, say so briefly and move on.

---

## Target Document

Read the technology stack steering document at:
`/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/tech.md`

Write your analysis to:
`/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/reviews/adversarial-analysis-tech-r4.md`
