# Adversarial Review Memory — Structure
Last updated: 2026-03-27 (after v3 review response)

## Cumulative Findings Summary
### Accepted
- **Playground item metadata has no defined home**: Added `playground/manifest.ts` as item registry for slugs, titles, descriptions, tags, and iframeIsolated flag. Serves both `generateStaticParams` and gallery page. (v1, compounded v2)
- **`#site/content` alias breaks before first Velite build**: Added note to path alias section about build order dependency and need for postinstall/dev script. (v1)
- **Draft content handling is unspecified**: Deferred to implementation — frontmatter field approach implied by content organization patterns. (v1)
- **RSS/Atom feed, XML sitemap, and Pagefind index have no defined output locations**: Added `src/app/sitemap.ts`, `src/app/feed.xml/route.ts`, and `public/pagefind/` to directory tree. (v1)
- **Missing test directory conventions**: Added `e2e/` directory to tree. Unit tests colocated with source files, E2E tests in `e2e/tests/`. (v1)
- **Image workflow undefined**: Clarified: content images colocated with MDX (Velite copies to `public/static/`), site images in `public/images/`. (v1)
- **Playground `all: initial` style reset will have unintended side effects**: Added note that playground base stylesheet must re-establish `font-family`, `font-size`, `line-height`, `color`, and `box-sizing` for shared component compatibility. (v1, compounded v2)
- **"Components do not need JSDoc" too rigid for behavioral components**: Relaxed to allow brief behavioral comments for components with side effects, scroll listeners, or complex conditional logic. (v1)
- **One component per file ambiguity**: Clarified: rule applies to exported components. Small unexported helpers may share a file. (v1)
- **UPPER_SNAKE_CASE vs camelCase constant distinction is subjective**: Clarified: primitives/frozen enumerations → UPPER_SNAKE_CASE, structured objects → camelCase. (v1)
- **`src/config/` import permissions underspecified**: Added `lib/` to config import permissions in dependency diagram. (v1, compounded v2)
- **Playground "self-contained" is misleading**: Reworded to explicitly list allowed/disallowed import sources and note that refactoring shared code may affect playground items. (v1)
- **`content/pages/` inconsistent with product spec**: Added rule: pages with authored markdown body get content files; component-only pages don't. (v1)
- **Barrel file convention missing**: Added "No barrel files" rule. (v1)
- **`src/lib/` purity label inaccurate**: Changed from "pure utilities — no React, no side effects" to "non-React application logic." (v2)
- **`api/playground/[slug]/route.ts` is premature architecture**: Removed from directory tree. (v2)
- **`content/contributions/` and `content/resources/` use MDX for structured data with no prose**: Changed to `contributions.yaml` and `resources.yaml`. Updated content organization rule to "all content with prose bodies is MDX." (v2)
- **Playground data path missing from dependency diagram**: Added playground manifest and dynamic import paths to diagram. (v2)
- **`next.config.ts` invisible dependency consumer**: Added to dependency diagram as consumer of route structure, content pipeline, and redirect rules. (v2)
- **Flat blog directory needs explicit series strategy**: Added explicit statement: flat directory, frontmatter-based series grouping, stable URL slugs. (v2)
- **`.env.example` has no defined contents**: Added minimum required variables (RESEND_API_KEY, NEXT_PUBLIC_SITE_URL) to directory tree. (v2)
- **pnpm enforcement partially specified**: Added `.npmrc` and `pnpm-lock.yaml` to root file listing. (v2)
- **Embed route lacks specification**: Added note that embed routes are complete standalone HTML pages. Detailed embed architecture deferred to implementation. (v2)
- **`generateStaticParams` has no slug source**: Resolved by `playground/manifest.ts`. (v2)
- **MDX body rendering pattern undocumented**: Corrected `.velite/` annotation to "typed data + compiled MDX". Added sentence about Velite component renderer. (v3)
- **Playground dynamic import mechanism unspecified**: Manifest now exports lazy import functions alongside metadata. Route page uses manifest entries directly. (v3)
- **Pagefind build integration has no structural home**: Noted as post-export script in package.json in directory tree. (v3)
- **`src/components/mdx/` boundary should be explicitly permeable**: Added note that mdx/ components may be imported by non-MDX pages — subdirectory indicates design context, not usage restriction. (v3)
- **300-line limit vs `velite.config.ts`**: Added config file exception with guidance to extract transforms into `src/lib/` if unwieldy. (v3)
- **3-level JSX nesting scope implicit**: Clarified as "per component file." (v3)
- **Playground import rules implicitly scoped**: Added sentence about `@/` aliases and relative imports within item directories. (v3)
- **Content page access pattern unclear**: Specified: single-entry pages import from Velite directly, collections use `src/lib/content.ts`. (v3)
- **RSS feed content scope unspecified**: Added "blog posts only." (v3)
- **Playground `shared/` prohibition too strict for non-visual components**: Added guidance to move non-visual shared components to `src/lib/` for playground access. (v3)

### Partially Accepted
- **Import order convention has no tooling enforcement**: Downgraded to "Preferred Import Order." Tooling enforcement deferred to implementation. (v1)
- **Module boundary enforcement absent**: Acknowledged as conventions. Tooling may be added during implementation. (v1)

### Rejected
- **`/profile` vs `/about` naming confusion**: Product-level IA concern, not a structure doc issue. (v2)
- **Tags vs categories misalignment**: Product doc concern — structure doc implements `tags` as shown. Whether "categories" is a separate field is a product decision. (v3)
- **Blog frontmatter field inventory requires cross-document synthesis**: By design — `velite.config.ts` is the single source of truth, structure doc shows the pattern not the full schema. (v3)
- **`components.json` expected config unspecified**: Generated by `shadcn init` and self-documenting. (v3)

### Unresolved
(None — all findings from v1, v2, and v3 have been addressed.)

## Patterns & Themes
- **Structural completeness**: All identified gaps across three rounds have been addressed. Directory tree, dependency diagram, content pipeline, playground architecture, and build artifacts are fully specified.
- **Convention enforcement**: Import order and module boundaries acknowledged as conventions with optional tooling — accepted as reasonable for a solo-developer project.
- **Playground architecture**: Manifest with lazy imports, CSS reset implications, embed route nature, dependency paths, and import scoping all documented. Detailed embed architecture deferred to spec phase.
- **Content format flexibility**: MDX for prose content, YAML for structured data. Single-entry vs collection access patterns specified.
- **Cross-document boundaries**: Product-level concerns (route naming, tags vs categories, frontmatter inventory) correctly rejected as out of scope for the structure doc.
- **Document maturity**: Three rounds of review have refined the document from a directory tree into a comprehensive structural reference with clear conventions, explicit decision rules, and acknowledged scope boundaries.

## Guidance for Next Review
- **Well-covered (do not re-examine)**: All areas previously listed plus: MDX rendering pattern, playground dynamic imports, content access patterns, component subdirectory boundaries, code size exceptions, JSX nesting scope, RSS scope, Pagefind build integration.
- The document has been through three review cycles addressing all identified gaps. Further review should only be triggered by material changes to the product or tech steering documents that create new cross-document inconsistencies.
