# Adversarial Review Prompt: Spec Decomposition (Round 2)

You are a senior software architect with deep experience in project decomposition, incremental delivery, and static-site/Jamstack architectures. You have been handed a spec decomposition document for a personal website rebuild. Your job is to tear it apart. Find every gap, every hidden assumption, every place where the decomposition will cause pain during implementation. Do not validate. Do not praise. Attack.

The decomposition breaks a personal website (Next.js, MDX, Velite, Tailwind v4, Vercel) into 8 specs. Read the decomposition at `/home/mcf/repo/matthew-field.ca/.spec-workflow/spec-decomposition/decomposition.md`. Also read the steering documents for full project context:
- `/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/product.md`
- `/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/tech.md`
- `/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/structure.md`

Then produce a written analysis targeting the following dimensions.

---

## 1. Spec 1 Checkpoint Strategy — Does It Actually Mitigate?

Spec 1 now includes four sub-deliverable checkpoints: (a) scaffolding + CI/CD, (b) Velite pipeline + pages schema, (c) layouts + theme toggle + metadata convention, (d) landing page + hero cards + CSS isolation spike. The claim is that downstream specs can begin after checkpoint (a).

- Challenge whether checkpoint (a) is sufficient for downstream specs to start. Spec 2 needs layouts, theme toggle, and the metadata convention — those are checkpoint (c). Spec 3 needs Velite — that's checkpoint (b). Identify which downstream specs actually depend on which checkpoint and whether the "start after (a)" claim holds.
- Stress-test the checkpoint ordering. The CSS isolation spike is bundled with the landing page in checkpoint (d). If the spike fails and requires CSS architecture changes, those changes could invalidate work done in checkpoints (b) and (c). Evaluate whether the spike should be earlier.
- Examine whether checkpoints are enforceable in a single-spec context. There's no mechanism to "ship" checkpoint (a) independently — it's still one spec, one PR, one review cycle. Are these checkpoints just aspirational sequencing inside a monolith, or do they carry real implementation discipline?

## 2. Spec 3 (blog-core) Size and Failure Isolation

Spec 3 now contains 13+ features including RSS (moved from spec 4). It is the second-largest spec after spec 1 and significantly larger than spec 4 (which now has only search, series UI, related posts, social sharing, and reading progress bar).

- Identify which features in spec 3 are genuinely coupled (cannot ship without each other) versus bundled by convention. Specifically: are footnotes/sidenotes, copy-to-clipboard on code blocks, and auto-generated TOC required for a "core" blog, or are they polish that could move to spec 4?
- Examine the failure scenario where one rehype/remark plugin (footnotes, TOC, or Shiki integration) causes a multi-day debugging session. What features are blocked? Could a partial blog ship while the plugin issue is resolved?
- Challenge the blog split ratio. With RSS moved to spec 3, the split is now even more lopsided. Spec 3 has ~13 features; spec 4 has ~5. Evaluate whether features should be rebalanced, or whether the current split is defensible despite the size difference.

## 3. Dependency Graph Completeness After Restructuring

The v1 review identified several hidden dependencies that were partially addressed. Stress-test the updated graph.

- Examine whether the spec 1 checkpoint dependencies are reflected in the dependency graph. The Mermaid graph shows `S1 → S2`, `S1 → S3`, etc. — but if spec 2 actually depends on checkpoint (c) of spec 1, and spec 3 depends on checkpoint (b), the graph is imprecise. Determine whether this imprecision matters for a single developer or creates real sequencing risk.
- Evaluate the `velite.config.ts` concurrent modification problem. Specs 2, 3, 5, and 6 all add schemas to this file. The decomposition resolved `src/lib/content.ts` conflicts with per-type files but didn't address `velite.config.ts`. For a single developer working sequentially this is trivial — but the decomposition presents specs 2, 3, 5, and 6 as parallelizable. Challenge whether they truly are, given this shared file.
- Scrutinize the spec 4 CI modification. Spec 4 modifies the CI pipeline established in spec 1 (adding `next build && next start` + Pagefind crawl). If spec 4's CI changes break the existing pipeline, every subsequent deploy is affected. Is there a rollback or validation strategy?

## 4. Open Questions — Are They the Right Ones?

The decomposition now has three open questions: Velite empty collection behavior, incremental deployment comfort, and landing page behavior when sections are deferred.

- Challenge whether these are truly "open" or already implicitly decided. The decomposition already says hero cards should be "data-driven, not hardcoded" and "removable without breaking the page" — doesn't that answer open question 3?
- Identify questions that should be open but aren't listed. Specifically: What is the content migration strategy from the existing WordPress.com site? Is there existing content (blog posts, pages) that needs to be ported? The product steering doc doesn't mention migration, but the project "replaces an existing WordPress.com site" — replacement implies content continuity or a deliberate decision to start fresh. This is unaddressed.
- Evaluate whether open question 1 (Velite empty collections) is actually a question or a task. "Verify that Velite handles empty directories gracefully" is an implementation task, not a design question. It belongs in spec 1's scope, not in an open questions section.

## 5. Cross-Spec Convention Sufficiency

The cross-spec conventions section was significantly expanded. Test whether the conventions are complete and internally consistent.

- Challenge the "UI primitives" convention. It says "Visual consistency across gallery cards (blog, projects, contributions, playground) is maintained by the single developer's judgment, not by a shared domain-specific card abstraction." This is honest but provides zero guidance. What happens when the developer makes spec 5's project cards with rounded corners and 16px padding, then three weeks later makes spec 6's contribution cards with sharp corners and 24px padding? There's no reference point to check against. Evaluate whether a minimal visual contract (even just "use shadcn Card with default props") would reduce drift without over-engineering.
- Examine the Velite schema ownership convention. Each spec owns its schema, but they all modify the same file (`velite.config.ts`). The convention says "Each downstream content spec adds its own schema directly" but doesn't specify where in the file, how to avoid import conflicts, or what the merge strategy is if schemas are developed on parallel branches. Is this a gap or acceptable given single-developer context?
- Test the contact component reuse convention. Spec 2 builds contact components in `src/components/shared/`. Spec 7 reuses them on /contact. The convention says spec 7 has a "soft dependency" on spec 2. But there's no component API contract — what props do the contact components accept? If spec 2's contact form is a self-contained component with internal state and submission handling, spec 7 just renders it. If it requires a parent-provided onSubmit callback or configuration props, spec 7 needs to know the API. Evaluate whether "soft dependency" is sufficient or whether a component contract is needed.

## 6. INVEST Violations and Spec Independence

Each spec should be Independently valuable, Negotiable, Valuable, Estimable, Small, and Testable. Stress-test these properties across all 8 specs.

- Challenge spec 8's (playground) independence. It depends on spec 1's CSS isolation spike succeeding. If the spike in spec 1 reveals that `all: initial` doesn't work with Tailwind v4, spec 8's entire architectural approach is invalidated. Is spec 8 truly independent, or is it coupled to a specific outcome from spec 1?
- Evaluate whether spec 4 (blog-enhanced) is independently valuable. After removing RSS to spec 3, spec 4 delivers: Pagefind search, series UI, related posts, social sharing, reading progress bar. These are five unrelated features. A user doesn't need all five — search alone is valuable, series UI alone is valuable. Is spec 4 a coherent deliverable or a grab-bag of "blog stuff that didn't fit in spec 3"?
- Test whether spec 6's two features (contributions + resources) are truly "not worth separating." The decomposition justifies bundling because "both are small, YAML-driven, single-page features." But they serve different audiences (recruiter vs. general visitor), have different schemas, and share no components. If contributions takes longer than expected (e.g., designing card layout for PR links), resources is blocked for no reason. Quantify the actual overhead of two separate specs versus the coupling cost.

---

## Prior Review Context

A previous adversarial review (v1) identified the following issues. Many were addressed in the current version of the decomposition:

**Addressed findings (do not re-discover these):**
- Velite schema stubs removed from spec 1 — each spec now owns its schema. Resolved.
- RSS moved from spec 4 to spec 3. Resolved.
- CSS isolation spike added to spec 1. Resolved.
- Metadata/SEO convention added to spec 1 scope. Resolved.
- Content query files split per content type (`src/lib/blog.ts`, etc.). Resolved.
- False open questions converted to decisions. Resolved.
- Spec 1 checkpoints added. Resolved (but effectiveness is now the question).
- Spec 7 soft dependency on spec 2 documented. Resolved.
- Hero card abstraction dropped. Resolved.
- Pagefind CI modification surfaced in spec 4 scope. Resolved.

**Partially addressed (dig deeper):**
- Spec 1 monolith: mitigated with checkpoints but not split. Evaluate whether checkpoints actually work.
- Spec 3 size: acknowledged but not reduced, and now larger with RSS added. Evaluate the blog split.

**Not addressed (may still be relevant):**
- Blog split lopsidedness (spec 3 is ~13 features, spec 4 is ~5).
- `velite.config.ts` concurrent modification across specs.

For each finding in your analysis, classify it as:
- **Novel**: Not identified in any prior review.
- **Compounding**: Builds on or deepens a prior finding — severity should increase.
- **Recurring**: Same issue identified before but not yet resolved — severity should escalate.

---

## Deliverables

Conclude your analysis with:

1. **Top 5 risks or gaps**, ordered by severity. For each, name the affected specs, describe a concrete failure scenario (not an abstract risk), and assess severity.

2. **Top 3 conclusions to challenge or reverse**, with specific reasoning for why the current decision is wrong or incomplete.

3. **What's missing** — work that should be done before implementation begins, that the decomposition doesn't cover.

Be specific and concrete. Cite failure scenarios, not abstract risks. If something is actually fine, say so briefly and move on.

Write your analysis to: `/home/mcf/repo/matthew-field.ca/.spec-workflow/spec-decomposition/reviews/adversarial-analysis-decomposition-r2.md`
