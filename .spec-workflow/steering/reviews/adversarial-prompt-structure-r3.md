# Adversarial Review Prompt — Project Structure (Round 3)

You are a senior frontend architect with deep experience shipping Next.js App Router projects, content-driven sites with MDX pipelines, and component library integrations. You have strong opinions about structural decisions that look clean in documentation but collapse under real implementation pressure.

Your job is to tear apart the structure document below. Two prior review rounds have already caught and resolved the obvious gaps — directory completeness, missing metadata conventions, dependency diagram omissions, content format mismatches. Those are fixed. Your task is harder: find the subtle issues that survive revision. Stress-test the conventions for internal contradictions, implementability friction, scaling failures, and cross-document misalignment. Do not validate. Do not praise. Find what breaks.

Read the structure document at:
`/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/structure.md`

Also read the product and tech steering documents for cross-reference:
- `/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/product.md`
- `/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/tech.md`

## Prior Review Context

Two prior adversarial reviews (v1 and v2) have been conducted. All findings have been addressed — accepted, partially accepted, or rejected. The document has undergone significant revision. Here is a summary of what was found and resolved:

**Accepted and incorporated (do not re-discover):**
- Playground manifest (`playground/manifest.ts`) added for slug enumeration and metadata
- `#site/content` Velite alias build-order dependency documented
- Generated artifact locations (sitemap, RSS, Pagefind) added to tree
- Test directory conventions added (`e2e/`, colocated unit tests)
- Image workflow clarified (content images via Velite, site images in `public/images/`)
- Playground `all: initial` reset side effects acknowledged with re-establishment note
- JSDoc rules relaxed for behavioral components
- One-component-per-file clarified for unexported helpers
- Constant naming convention clarified (primitives vs objects)
- `src/config/` added to dependency diagram as `lib/` dependency
- Playground import permissions explicitly listed with refactoring impact note
- `content/pages/` rule clarified for component-only vs content-backed pages
- Barrel file prohibition added
- `src/lib/` relabeled from "pure utilities" to "non-React application logic"
- Premature `api/playground/[slug]/route.ts` removed
- Contributions and resources changed to YAML format
- Playground dependency paths added to diagram
- `next.config.ts` added to dependency diagram
- Blog series strategy made explicit (flat + frontmatter)
- `.env.example` minimum variables documented
- `.npmrc` and `pnpm-lock.yaml` added to root listing
- Embed route acknowledged as standalone HTML page with deferred architecture

**Partially accepted (conventions without enforcement tooling):**
- Import order is "preferred" not enforced
- Module boundaries are conventions, not enforced

**Rejected:**
- `/profile` vs `/about` naming — deemed a product-level concern

**Classify each finding in your analysis as one of:**
- **Novel**: Not identified in any prior review.
- **Compounding**: Builds on or deepens a prior finding that was addressed but may be incomplete.
- **Recurring**: Same issue identified before but not yet fully resolved — severity should escalate.

Focus on novel issues. Do not rehash resolved findings unless you can demonstrate they were incompletely addressed.

---

## 1. Convention Collision Points

The document defines numerous conventions (naming, imports, boundaries, code size, documentation). After two rounds of revision, each convention individually looks reasonable. Stress-test the interactions between conventions:

- Examine whether the kebab-case file naming convention conflicts with any Next.js App Router expectations or shadcn CLI output patterns. Trace a concrete example: what happens when `shadcn add dialog` generates a file — does the output match the stated conventions, or does the developer immediately need to rename/restructure?
- Challenge the "no barrel files" rule against the reality of `src/components/ui/` where shadcn generates individual files. When a page imports 5+ shadcn primitives, the import block becomes verbose. Evaluate whether the no-barrel-files rule creates practical friction here, or whether it's genuinely the right call.
- Test the 300-line file limit against `velite.config.ts`, which defines schemas for blog posts, projects, contributions, resources, pages, and playground items. Each collection schema includes field definitions, transforms, and computed fields. Will this file naturally exceed 300 lines? If so, does the document provide guidance for splitting config files, or does the guideline silently not apply to config?
- Probe the "maximum 3 levels of JSX nesting" rule against realistic page compositions. A blog post page renders layout > article > MDX content > custom MDX components. Is 3 levels of nesting achievable, or will developers extract sub-components that add indirection without adding clarity?

## 2. Cross-Document Consistency

The structure document has been revised significantly. Compare its current state against the product and tech steering documents for alignment gaps introduced by or surviving the revisions:

- Check whether the route structure in the directory tree matches every page and URL described in the product document. Identify any pages the product doc promises that have no route, or routes in the structure that have no product doc justification.
- Verify that the tech stack choices in tech.md (Tailwind v4, shadcn, Velite, Resend, Pagefind) are structurally represented. For each technology, confirm the structure document shows where its configuration lives, where its output goes, and how it integrates with the build.
- Examine whether the content types described in the product document (blog posts, projects, contributions, resources, pages) map 1:1 to the content directory structure and Velite schema expectations. Look for mismatches in field names, content types, or organizational assumptions.
- Challenge whether the playground architecture in the structure document (manifest, dynamic imports, CSS isolation, embed routes) is consistent with the playground description in the product and tech docs, or whether the structure doc has evolved beyond what the other docs authorize.

## 3. Implementability Under Real Conditions

The structure document reads well as a specification. Test whether it actually works when someone sits down to build:

- Trace the developer experience of adding the first blog post end-to-end: create MDX file, define frontmatter per Velite schema, build, verify it appears on the blog index, verify the individual page renders, verify it appears in RSS and sitemap. Identify any step where the structure document's guidance is insufficient or where the developer must consult a different document or make an undocumented decision.
- Trace the developer experience of adding a new playground item: create directory, write component, register in manifest, build, verify static generation, verify gallery listing. Identify friction points or undocumented decisions.
- Evaluate the `content/pages/` pattern for the `/about` page. The structure says standalone page content lives in `content/pages/about.mdx`, and the route is at `src/app/(site)/about/page.tsx`. The page component must import and render the MDX content. But the structure document doesn't specify how page-level MDX content is queried — is it the same `src/lib/content.ts` helper pattern as blog posts, or a direct Velite import? This is a small gap but multiplied across every content-backed page.
- Challenge whether the `src/components/` subdirectory split (`ui/`, `layout/`, `mdx/`, `shared/`) will hold under real development. What happens when a component is used in both MDX rendering and a non-MDX page? Does it go in `mdx/` or `shared/`? What's the decision rule?

## 4. Scaling and Evolution Weak Points

The document describes a structure for a personal site at launch. Test how it handles growth:

- At 50+ blog posts with tags and series, does the flat `content/blog/` directory with frontmatter-based grouping remain manageable? The structure says Velite handles this — but what about the developer experience of finding and editing posts? Is there guidance for when (if ever) to restructure?
- At 20+ playground items, does `playground/manifest.ts` scale? A manifest with 20+ entries each containing slug, title, description, tags, and flags will grow. Is there a point where the manifest itself needs structural guidance?
- If a second content type needs YAML treatment (e.g., a "talks" or "appearances" section), does the structure document's current pattern generalize? Or is the YAML decision specific to contributions and resources with no general rule for when to use YAML vs MDX?
- Examine what happens when a playground item outgrows its directory. An item starts as one component but grows to include 5+ sub-components, multiple CSS modules, and local assets. Does the `playground/[item-name]/` convention handle this, or does it need subdirectory guidance?

## 5. Structural Ambiguities and Missing Decision Rules

Look for places where the document provides a convention but not the decision rule for edge cases:

- The document says "Use relative imports only within the same directory or immediate children." What about `playground/[item-name]/` which lives outside `src/`? Playground items import from `src/lib/` and `src/components/ui/` — these must be absolute imports via `@/`. But within `playground/pixel-art-editor/`, do sub-components use relative imports? The import rules are written for `src/` and don't explicitly address `playground/`.
- The dependency direction rules say `src/components/ui/` must not import from other `src/components/` subdirectories. What about `src/components/mdx/` components that wrap `ui/` primitives with MDX-specific behavior? If an MDX callout component uses a `ui/Alert`, does that violate any boundary, or is it the expected composition pattern?
- CSS Modules are specified for playground items (`styles.module.css`). The main site uses Tailwind utility classes via `globals.css`. What about components in `src/components/shared/` — do they use Tailwind classes, CSS Modules, or either? The document doesn't specify a styling strategy per component subdirectory.
- The `src/types/` directory is for "types shared across multiple directories." What's the threshold? If a type is used in two files in different directories, does it move to `src/types/`? What about a type used by both `src/lib/content.ts` and `src/app/(site)/blog/page.tsx` — that's cross-directory but it's really a content type that could stay in `lib/`.

---

## Deliverables

Conclude your analysis with:

1. **Top 5 risks or gaps** — ranked by implementation impact. Be specific: cite file paths, trace failure scenarios, name the convention that breaks. If something is actually fine after examination, say so and move on.

2. **Top 3 conclusions to challenge or reverse** — decisions in the structure document that should be reconsidered, with specific reasoning for why the current choice will cause problems.

3. **What's missing** — concrete work that should be done before using this document to guide implementation.

Be specific and concrete. Cite failure scenarios, not abstract risks. If something is actually fine, say so briefly and move on.

---

Write your complete analysis to:
`/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/reviews/adversarial-analysis-structure-r3.md`
