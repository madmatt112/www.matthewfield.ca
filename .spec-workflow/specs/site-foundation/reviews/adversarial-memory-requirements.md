# Adversarial Review Memory — Requirements
Last updated: 2026-03-31 (after v2 review)

## Cumulative Findings Summary

### Accepted
- R1 AC4 "without warnings" untestable: Reworded to "without errors or unresolved version conflicts" (v1)
- R3 AC3 deferred research question: Resolved — AC now specifies "either natively (empty array) or via placeholder content files" (v1)
- R3 AC4 "documented" vague: Now specifies "code comments in `velite.config.ts`" as specific deliverable (v1)
- R5 AC5 untestable without design: Restated with specific contrast ratios and "chosen during implementation" framing (v1)
- R9 design task masquerading as requirement: AC1 now explicitly states "shadcn/ui defaults as the initial baseline" (v1)
- R11 spike too shallow: AC1 now includes explicit overrides and playground base stylesheet requirement (v1)
- R11 AC6 "acceptably" undefined: Now includes concrete failure criteria (v1)
- R12 tautological with zero tests: AC4 now requires canary tests per runner (v1)
- URL paths implicit: R4 AC2 now has explicit section-to-path mapping table (v1)
- /contact not listed as placeholder: R7 AC3 now explicitly states "/contact SHALL be a placeholder page in this spec" (v1)
- R2 AC4 vs R3 AC5 dual mechanism: Both ACs now have clarifying notes about distinct purposes (v1)
- Font loading strategy missing: New R14 (Font Loading) requirement added (v1)
- Playwright config location: R12 AC2 now specifies path per the structure doc (v1)

### Partially Accepted
- R11 spike doesn't test real interactions (z-index, focus traps, scroll locking): AC1 strengthened with overrides and base stylesheet, but still no portal escape test or behavioral verification (v1, compounded in v2)
- 90+ Lighthouse unmeasured: NFR says "design target verified via manual Lighthouse audit after deployment" — reframed but still no owner or timing (v1, compounded in v2)
- WCAG 2.1 AA premature claim: Accessibility NFR now scopes structural vs downstream, but contrast verification has no specified timing (v1, compounded in v2)

### Rejected
- None explicitly rejected

### Unresolved
- **R11 AC1 missing CSS custom properties** (v2, novel): AC1 lists typographic properties but not the CSS custom property tokens (`--primary`, `--background`, `--foreground`, `--radius`, etc.) that shadcn/ui depends on. AC3 asserts shadcn/ui renders correctly using custom properties the base stylesheet doesn't include.
- **R11 portal escape untested** (v2, novel/compounding): Radix UI dialogs/dropdowns portal to `document.body`, escaping the playground container. Spike's go/no-go criteria are visual-only and don't catch this behavioral failure mode.
- **R11 @layer playground ordering undefined** (v2, novel): No explicit declaration order for `@layer playground` relative to Tailwind v4's internal layers. Tech doc says "sits below the site's layer" but this may be inverted from what's needed.
- **R6 AC4 hero card data source unspecified** (v2, novel): "Data-driven" without specifying location. Most likely `src/config/site.ts` but not stated. "Without code changes" justification is false if data lives in a TS config file.
- **R3 YAML pattern unvalidated** (v2, compounding): Code comments describe YAML collection pattern but no AC validates it works. Downstream specs depend on it.
- **Pagefind search pipeline has no owner** (v1, recurring in v2): Build pipeline differs from R2's CI and no spec claims it. R2 doesn't acknowledge extensibility.
- **R2 CI pipeline extensibility undocumented** (v2, compounding): Pipeline defined imperatively with no mention of downstream extension mechanism.
- **R13 AC2 playground CSP vague** (v2, novel): "Permissive" CSP not specified with actual directive values, unlike AC1's precise content page directives.
- **R10 AC2 OG image has no dimension/format spec** (v2, novel): No minimum dimensions or format specified.
- **R14 AC3 "minimize layout shift" untestable** (v2, novel): Either trivially met by `next/font` defaults or subjectively vague. No CLS threshold or specific mechanism required.
- **NFR image optimization overpromises** (v1, recurring in v2): "Images SHALL be optimized via Next.js Image" doesn't apply to MDX content images which render as standard `<img>` tags.
- **Product doc "all visible without scrolling" vs six hero cards on mobile** (v1): Product doc not updated.
- **next.config.ts vs .js inconsistency in tech doc** (v1, low severity)
- **R4 footer content unspecified** (v2, novel): Footer mentioned in R4 AC1 but no ACs define its content. Slash page discoverability path is implicit.
- **NFR "server components by default" unenforced** (v2, novel, low severity): Convention without mechanism.
- **NFR "single responsibility" is a code review heuristic** (v2, novel, low severity): Not testable, belongs in structure doc.
- **R5 AC5 contrast verification timing unspecified** (v2, compounding): When and who verifies shadcn/ui defaults meet AA?

## Patterns & Themes
- **R11 spike depth is the dominant risk**: Three rounds have consistently found gaps in the spike's coverage — first visual rendering, then behavioral (portals, focus), now CSS custom properties and layer ordering. The spike is the most complex requirement and keeps revealing new attack surfaces.
- **Document synchronization drift**: Steering docs and requirements continue to have small inconsistencies (CSP file extension, product doc hero cards, layer ordering semantics).
- **Testability gaps persist in NFRs**: Performance, accessibility, and image optimization NFRs make claims without measurement criteria or ownership.
- **Cross-spec boundary ambiguity**: Pagefind ownership and CI extensibility remain unresolved across two rounds. YAML pattern validation is a new instance of the same pattern.
- **Precision gap between functional and non-functional requirements**: Functional ACs (R1-R8, R12-R13) are generally tight after two rounds. NFRs and the spike (R11) still have the most unresolved findings.

## Guidance for Next Review
- **Focus areas**: (1) Whether unresolved v2 findings have been addressed — particularly R11 custom properties, portal testing, and layer ordering. (2) Any new inconsistencies introduced by v2 fixes. (3) The interaction between R6 hero card data, R3 content pipeline, and the structure doc's `src/config/site.ts`. (4) Whether R2 now acknowledges extensibility. (5) Whether R13 AC2 and R10 AC2 have been tightened.
- **Well-covered areas**: R1 scaffolding, R3 core MDX pipeline, R5 theme toggle mechanics, R7 placeholders, R8 404 page, R12 testing infrastructure, R4 navigation structure — all thoroughly tightened across two rounds. Don't re-examine unless new contradictions appear.
- **Emerging pattern to probe**: R11 has been the primary finding source for two rounds. A v3 review should assess whether the spike's scope is fundamentally right or whether it's trying to validate too many things in one spike. Consider whether splitting R11 into "CSS reset spike" and "component compatibility spike" would produce clearer go/no-go criteria.
- **Novel angles for v3**: (1) R6's relationship with the structure doc's `src/config/site.ts` — is the config file the right pattern or should hero cards be content-pipeline driven? (2) R4 footer as an unspecified surface area. (3) Whether R14's deferral creates any hidden dependencies on R1 or R9.
