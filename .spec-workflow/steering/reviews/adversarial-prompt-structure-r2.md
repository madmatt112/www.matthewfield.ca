# Adversarial Review: Project Structure Document (Round 2)

You are a senior frontend architect with deep experience in Next.js App Router, content-driven sites, and monorepo structure. You have seen dozens of projects where well-intentioned structural documents became shelfware because they didn't account for real build and runtime behavior.

Your job is to tear apart the structure document at `.spec-workflow/steering/structure.md`. Find every gap, contradiction, and unexamined assumption. Do not validate or support — attack. If something is actually solid, say so in one sentence and move on.

Before you begin, read all three steering documents to ground your analysis in the project's actual constraints:
- `.spec-workflow/steering/structure.md` (the target)
- `.spec-workflow/steering/product.md` (product requirements)
- `.spec-workflow/steering/tech.md` (technology decisions)

## Prior Review Context

A previous review identified the following categories of issues. Do not re-discover these — they are known. Instead, build on them or find novel problems.

**Known structural completeness gaps (do not re-report):**
- Playground item metadata has no defined home
- `#site/content` alias breaks before first Velite build
- Draft content handling is unspecified
- RSS/Atom feed, XML sitemap, and Pagefind index have no defined output locations
- Missing test directory conventions
- Image workflow (colocated vs. `public/images/`) undefined

**Known convention enforcement gaps (do not re-report):**
- Import order convention has no tooling enforcement
- Module boundary rules are honor-system only
- Filename conventions (kebab-case, one-component-per-file) are unenforced

**Known ambiguity issues (do not re-report):**
- UPPER_SNAKE_CASE vs. camelCase constant distinction is subjective
- One-component-per-file rule doesn't address unexported helpers
- `src/config/` import permissions not shown in dependency diagram
- "Self-contained" playground is misleading given permitted `src/` imports
- Barrel file convention missing

**Known implementation concerns (do not re-report):**
- Playground `all: initial` style reset has unintended side effects
- "Components do not need JSDoc" is too rigid for behavioral components

For each finding in your analysis, classify it as one of:
- **Novel**: Not identified in any prior review.
- **Compounding**: Builds on or deepens a prior finding — cite which one and explain what's worse than previously understood.
- **Recurring**: Same issue identified before but examined from a new angle that reveals additional severity.

---

## 1. Route Architecture Consistency and Scalability

Examine the App Router route structure for internal contradictions and scaling problems:

- Challenge whether the `(site)` / `(playground)` route group split is sufficient. The product doc describes distinct interaction patterns (reading content vs. interactive experiments). Probe whether two route groups are enough or whether a third group (e.g., API routes, or a future admin/preview section) should be anticipated in the structure.
- Stress-test the `api/playground/[slug]/route.ts` pattern. The structure shows one API route per playground item — but the product doc doesn't specify what playground items need server-side APIs for. Identify what happens when most items don't need an API route but the structure reserves the pattern. Is this premature architecture?
- Examine the `embed/page.tsx` route for playground items. The structure says items "needing full isolation" use iframe embedding — but doesn't define what triggers the need for isolation, how the parent page decides to use iframe vs. direct render, or how the embed route handles its own head/meta tags.
- Challenge whether `src/app/(site)/profile/page.tsx` vs. `src/app/(site)/about/page.tsx` creates a confusing IA. The product doc distinguishes between a professional profile (resume-like) and an about page (personal). Probe whether users (hiring managers, peers) will understand the distinction from URL paths alone.

## 2. Dependency Direction Diagram vs. Actual Data Flow

The dependency direction diagram is the structural backbone. Attack its completeness and accuracy:

- Trace the actual data flow for the playground gallery page. It needs item metadata → but metadata isn't in Velite content → so where does it enter the dependency graph? The diagram shows `content/ → .velite/ → src/app/` but playground items bypass this entirely. The diagram is incomplete for the playground data path.
- Challenge the claim that `src/lib/` contains "pure utilities — no React, no side effects." The product doc requires RSS feed generation, which likely lives in `src/lib/` and needs `siteConfig.url` from `src/config/`. RSS generation at build time is a side effect (file I/O). Does the diagram's purity constraint hold, or is `src/lib/` actually "utilities that may have build-time side effects"?
- Examine whether the diagram accounts for `next.config.ts` as a dependency. The Next.js config imports from the project (redirects, headers, webpack customization) and may reference paths or configuration that couples it to the structure. The diagram treats it as a standalone root file, but it's actually a consumer of project internals.
- Probe the interaction between `src/hooks/` ("imported by client components only") and `src/components/ui/` (shadcn primitives). shadcn components are frequently client components that use hooks internally. If a custom hook in `src/hooks/` wraps or extends a shadcn hook, the dependency direction between these two modules is unclear.

## 3. Playground Architecture Deep Dive

The playground is the most architecturally novel part of the project. Probe the implementation implications the structure document doesn't address:

- Challenge the dynamic import pattern. `src/app/(playground)/playground/[slug]/page.tsx` dynamically imports `playground/[slug]/index.tsx`. How does Next.js handle this at build time? Does it statically analyze all possible slugs via `generateStaticParams`? If so, how does it discover which `playground/` subdirectories exist without a manifest or Velite collection? If it doesn't use static generation, every playground page is server-rendered on demand — is that the intent?
- Stress-test the CSS isolation claim. The structure says playground items use CSS Modules (`styles.module.css`). But the route layout applies `all: initial` and `@layer playground`. What happens when a playground item imports a shadcn `Button` that uses Tailwind classes? The `all: initial` reset will strip Tailwind's base styles. The `@layer playground` puts playground styles in a low-priority layer — but shadcn component styles live in the global Tailwind layer. Trace the actual CSS cascade for this scenario.
- Examine what "per-item playground API" means architecturally. The structure shows `api/playground/[slug]/route.ts` — is this a single file that routes to different handlers based on slug, or does it expect one file per item? If one file per item, how does the file exist for items that don't need an API? If it's a single dynamic route, what prevents it from becoming a dumping ground for unrelated endpoints?
- Challenge whether the iframe embed approach handles communication between the parent page and the embedded item. The product doc may require the parent to pass theme preferences, resize signals, or interaction events to the iframe. The `postMessage` API is the standard mechanism — but the structure document doesn't mention any communication protocol.

## 4. Content Model Structural Alignment

Examine whether the content directory structure actually supports the product's content model:

- Challenge the flat `content/blog/` directory for a site that supports series/multi-part posts, categories, and tags. At 50+ posts with series groupings, a flat directory becomes unwieldy. Should series posts be grouped in subdirectories (`content/blog/my-series/part-1.mdx`)? The Velite `s.path()` slug derivation depends on the directory structure — changing it later is a migration.
- Probe the `content/contributions/` collection against the product spec. The product doc describes open-source contributions with links to external repos, PR counts, and description. Is MDX the right format for what is essentially structured data with no markdown body? Would a `contributions.json` or a Velite YAML collection be more appropriate?
- Examine whether `content/resources/` (bookmarks/resources) scales. The product doc describes this as a curated list. If each resource is a separate MDX file with 3-4 lines of frontmatter and no body content, the overhead of one file per resource is high. Challenge whether a single `resources.yaml` or JSON file with an array of entries would be simpler.
- Stress-test the `content/pages/` convention. The structure says pages like "about" and "now" live here. But `/now` pages are updated frequently (weekly/monthly) with short status updates. If the now page has a long revision history, does the single-file approach work, or should it support an append-based format?

## 5. Build and Development Lifecycle Gaps

Look for structural decisions that will cause friction during development and CI:

- Challenge whether the structure accounts for environment-specific behavior. The product doc mentions features that behave differently in development vs. production (drafts visible locally, analytics only in production). The structure document defines no mechanism for environment-aware content filtering or feature toggling. Where does this logic live — in Velite config, in `src/lib/content.ts`, in environment variables, or in Next.js middleware?
- Examine the `components.json` (shadcn CLI config) interaction with the component directory structure. shadcn's CLI writes components to a configured path. If it's configured to write to `src/components/ui/`, every `npx shadcn add` command generates files that must conform to the document's naming conventions. Does the shadcn CLI output match the prescribed kebab-case filenames? (It does — shadcn uses kebab-case by default. But verify whether the generated component internals match the import patterns and export conventions.)
- Probe the `.env.local` / `.env.example` split. The structure shows these files but doesn't define which environment variables the project needs. The tech doc mentions Resend (email API key), and potentially analytics, Pagefind, and any third-party integrations. An `.env.example` that doesn't list all required variables is worse than no example — it gives false confidence that setup is complete.
- Challenge whether `pnpm` as the package manager (implied by the tech doc) is reflected in the structure. Is there a `.npmrc` for pnpm configuration? Is `packageManager` set in `package.json` to enforce pnpm via corepack? The structure shows `package.json` with a "packageManager field" comment — but doesn't specify that this is corepack enforcement vs. just a version note.

---

## Deliverables

Conclude your analysis with:

1. **Top 5 risks or gaps** — ranked by likelihood of causing implementation pain. Be specific: name the file, the decision, and the failure scenario. Do not repeat findings from the prior review context above.
2. **Top 3 conclusions to challenge or reverse** — specific decisions in the structure document that should be reconsidered, with concrete reasoning for why the current approach will cause problems.
3. **What's missing** — work that should be done before acting on this document. Focus on novel gaps not covered by the prior review.

Be specific and concrete. Cite failure scenarios, not abstract risks. If something is actually fine, say so briefly and move on.

Write your complete analysis to: `.spec-workflow/steering/reviews/adversarial-analysis-structure-r2.md`
