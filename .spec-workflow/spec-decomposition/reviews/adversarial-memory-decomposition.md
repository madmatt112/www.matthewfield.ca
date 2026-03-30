# Adversarial Review Memory — Decomposition
Last updated: 2026-03-30 (after v2 review)

## Cumulative Findings Summary
### Accepted
- [Velite schema stubs removed from spec 1]: Spec 1 configures Velite with `pages` schema only; downstream specs own their own schemas. (v1)
- [RSS moved to spec 3]: RSS/Atom feed generation in blog-core where it belongs. (v1)
- [CSS isolation spike added to spec 1]: Time-boxed spike validates `all: initial` + `@layer playground`. (v1)
- [Metadata/SEO convention added to spec 1]: Title template, default OG image, `generateMetadata()` pattern in spec 1 scope. (v1)
- [Content query file organization resolved]: Per-type query helper files (`src/lib/blog.ts`, etc.) documented in cross-spec conventions. (v1)
- [Open questions converted to decisions]: Original four items moved to Decisions section. (v1)
- [Spec 1 sub-deliverable checkpoints]: Checkpoints (a)-(d) added with honest framing as suggested sequence, not hard gates. (v1, refined v2)
- [Spec 7 soft dependency on spec 2 documented]: Dependencies section notes soft dependency for /slashes completeness. (v1)
- [Hero card abstraction dropped]: No shared card abstraction; visual consistency via shadcn Card primitive with default props. (v1, strengthened v2)
- [Pagefind CI modification surfaced in spec 4]: Scope explicitly includes CI pipeline modification with non-blocking initial rollout. (v1, failure containment added v2)
- [Spec 6 bundling rationale corrected]: Justification now based on trivial complexity/risk, not spec overhead. (v2)
- [Playground sample items CSS requirement]: Sample items must exercise isolation with conflicting styles. (v1)
- [/slashes must include /contact]: Spec 2 design considerations document this cross-spec link. (v1)
- [CSS isolation spike reordered to checkpoint (b)]: Spike now runs before CSS architecture is finalized at checkpoint (c). (v2)
- [Spike failure path documented]: Spec 1 and spec 8 both document iframe-only fallback if spike fails. (v2)
- [Content migration added as open question]: Open question 2 addresses WordPress replacement, redirects, and clean break decision. (v2)
- [Blog split rebalanced to 10:8]: Footnotes, TOC, copy-to-clipboard moved from spec 3 to spec 4. Core blog ships without plugin risk. (v2)
- [Open question 3 removed (already decided)]: Hero card behavior is documented as a decision, not an open question. (v2)
- [Velite empty dirs moved to spec 1 scope]: Verification task, not a design question. (v2)
- [velite.config.ts concurrent modification acknowledged]: Cross-spec conventions note trivial additive merge conflicts expected. (v2)
- [Spec 4 bundling acknowledged with split guidance]: Design considerations note that complex features can be split out. (v2)
- [Contact component self-contained convention added]: Convention specifies components handle own state, validation, submission. (v2)
- [UI primitives convention strengthened]: All gallery cards use shadcn Card with default container props; content layout varies inside. (v2)
- [Checkpoint parallelism claims corrected]: Now described as "suggested sequence, not hard gates — spec 1 is one deliverable." (v2)

### Partially Accepted
- [Spec 1 is a monolith]: Addressed via checkpoints (honestly described) rather than splitting. CI/CD still bundled. Acceptable given single-developer context. (v1)
- [Spec 3 size]: Originally 12-13 features. Now rebalanced to ~10 by moving plugin-heavy features to spec 4. Still the second-largest spec after spec 1 but risk profile significantly reduced. (v1, addressed v2)

### Rejected
- None explicitly rejected.

### Unresolved
- None remaining from v1/v2 — all findings received responses.

## Patterns & Themes
- The decomposition author is highly responsive to adversarial review findings. Every v2 finding was addressed, including the three top conclusions and all four missing items.
- Size/scope concerns are addressed through mitigation (checkpoints, rebalancing) rather than fundamental restructuring (splitting specs). This is consistent and appropriate for a single-developer project.
- The cross-spec conventions section has strengthened significantly across two review rounds — it now contains genuine constraints rather than non-answers.
- The v2 review's most impactful contribution was the blog rebalancing (10:8 split), which reduced the highest-risk spec and made spec 4 coherent.
- Open questions have been significantly refined — the remaining two are genuinely unresolved design decisions.

## Guidance for Next Review
- **Well-covered areas (don't re-examine)**: Velite schema ownership, RSS placement, metadata convention, content query file organization, hero card abstraction, CSS isolation spike ordering, spike failure path, content migration as open question, blog split balance, velite.config.ts acknowledgment, Pagefind CI containment, contact component reuse, UI primitives convention, checkpoint framing.
- **Focus areas for v3**: Since most structural and convention issues have been addressed, v3 should shift focus to:
  - Risk transfer from spec 3 to spec 4 — the plugin work moved but the risk didn't disappear. Spec 4 now contains the highest-risk implementation items.
  - Testing strategy across specs — no spec explicitly owns accessibility audit, performance budget verification, or cross-spec integration testing.
  - The two remaining open questions — are they well-framed and actionable?
  - Gaps in what the decomposition assumes but doesn't state — implicit decisions that could cause problems.
  - Whether the end-to-end verification criteria for each spec are actually sufficient to catch the failure modes described in prior reviews.
  - Cross-spec integration points that could break silently (theme toggle + playground, Pagefind + dynamically rendered content, sitemap completeness).
