# Adversarial Review: Project Structure Document

You are a senior software architect with 15+ years of experience building and maintaining Next.js applications, monorepo structures, and developer tooling. You have shipped multiple production sites using the App Router, Velite, and MDX pipelines. Your job is to tear apart the project structure document below and find every gap, inconsistency, unenforceable rule, and structural decision that will cause pain during implementation or maintenance. Do not validate. Do not compliment. Find weaknesses.

---

## 1. Directory Organization: Completeness and Coherence

The document defines a full directory tree. Stress-test it:

- Challenge whether the `playground/` directory at the project root (outside `src/`) creates an awkward split in the codebase. The tech steering doc says playground items can import from `src/lib/` and `src/components/ui/` — evaluate whether a root-level directory importing from `src/` violates the stated dependency direction or creates confusing import patterns.
- Examine the `public/static/` directory described as "Velite-copied content images (gitignored)". Determine whether gitignoring build output in `public/` creates deployment hazards — does Vercel's build pipeline regenerate this correctly, or could stale images persist across deploys?
- Identify any directories or files referenced in the product or tech steering documents that are missing from this structure. The product doc describes RSS/Atom feeds, a sitemap XML, and Pagefind search index output — where do these live? The structure is silent on generated artifacts beyond `.velite/`.
- Assess whether the `content/pages/` directory (about, now, colophon) conflicts with the App Router pages at `src/app/(site)/about/page.tsx` etc. — who owns the content? Is there a clear separation or a potential for confusion about where to edit?
- Challenge the absence of any testing directory or test file placement convention beyond the naming rule `[filename].test.ts`. Where do Playwright E2E tests live? Where do test fixtures and helpers go?

## 2. Naming Conventions: Enforceability and Edge Cases

The document prescribes kebab-case files, PascalCase exports, camelCase functions, etc. Attack the gaps:

- Identify naming rules that are convention-only with no enforcement mechanism. The tech steering doc mentions ESLint and Prettier but does not mention filename linting (e.g., `eslint-plugin-filenames` or `eslint-plugin-check-file`). Determine which conventions will silently drift without tooling enforcement.
- Challenge the "one component per file" rule against the reality of small helper components. A `BlogPostCard` might need a tiny `TagBadge` sub-component — does colocating it in the same file violate the rule? The document is silent on this common pattern.
- Examine the constant naming rule: `UPPER_SNAKE_CASE` for "true constants" vs `camelCase` for "config objects". This distinction is ambiguous — is `siteConfig` a constant? Is `MAX_POSTS_PER_PAGE` inside a config object still UPPER_SNAKE_CASE? Identify where this ambiguity will cause inconsistency across files.
- Evaluate whether the CSS Module naming convention (`[component-name].module.css` or `styles.module.css`) creates ambiguity when multiple components exist in the same directory.

## 3. Import Patterns: Practical Conflicts and Missing Rules

The import order and path alias rules are specific. Find where they break:

- Challenge the `#site/content` alias pointing to `./.velite`. This is a build-time generated directory — evaluate what happens during cold starts, CI cache misses, or when a developer runs TypeScript checks before building Velite output. Does the structure account for this bootstrapping dependency?
- Examine the "never use relative imports that go up more than one level" rule against the playground directory structure. Playground items at `playground/[item-name]/` importing from `src/lib/` must use absolute imports — but the `@/*` alias maps to `./src/*`. Does this alias resolve correctly from a root-level `playground/` directory, or does it require a separate tsconfig path?
- Identify what happens when the import order convention (React, external, internal, content, relative, styles) conflicts with auto-formatters. ESLint import sorting plugins and Prettier import plugins have their own ordering — is this convention backed by tooling config, or will it be destroyed on first auto-format?
- The document is silent on re-exports and barrel files (`index.ts`). Determine whether `src/components/ui/` (managed by shadcn CLI) uses barrel files, and whether the rest of the codebase should follow the same pattern or avoid them.

## 4. Module Boundaries: Enforcement and Playground Coupling

The dependency direction diagram and boundary rules are the structural backbone. Attack them:

- Challenge the enforcement mechanism for module boundaries. The rules say `src/lib/` must not import from `src/components/`, `src/components/` must not import from `src/app/`, etc. Without tooling (e.g., `eslint-plugin-boundaries`, `dependency-cruiser`), these are honor-system rules. Evaluate the risk of boundary violations accumulating silently.
- Examine the playground's stated permission to import from `src/lib/` and `src/components/ui/` while being "self-contained". This creates a one-way coupling that the module boundary diagram does not depict. If a playground item imports a shadcn component and that component's API changes, the playground item breaks. Assess whether "self-contained" is misleading.
- The `src/config/` directory is described as "imported by app/ and components/" — but the dependency diagram shows it as a standalone node. Determine whether `src/lib/` utilities are allowed to import from `src/config/`. If a utility needs `siteConfig.url` for URL construction, must it accept the value as a parameter instead?
- Challenge the route group separation claim that `(playground)/` has "minimal or no chrome" with its own layout reset (`all: initial`, `isolation: isolate`, `@layer playground`). The tech steering doc describes this reset in detail — but the structure document doesn't specify which file owns this reset or how it composes with the root layout's global providers (theme, fonts). Identify the gap.

## 5. Code Size Guidelines and Documentation Standards: Realism

The document sets numeric thresholds and documentation rules. Stress-test them:

- Challenge the 300-line file limit against the likely complexity of `velite.config.ts`. This file defines typed schemas for blog posts, projects, contributions, resources, and pages — each with frontmatter fields, computed fields, and transforms. Determine whether 300 lines is realistic for this file specifically.
- Examine the "components do not need JSDoc" stance. The product steering doc describes complex features (series/multi-part post grouping, related posts, reading progress bar) that will require components with non-obvious props and behavior. Evaluate whether "props types serve as documentation" is sufficient for components with complex conditional rendering or side effects.
- Challenge the "no README files per module" rule against onboarding. If a new contributor (or Matthew returning after months away) needs to understand the playground architecture, they must read this structure document end-to-end. Determine whether this scales or whether key directories need local documentation.
- The 8-prop limit for components will be tested by the blog post page — which needs title, date, content, tags, reading time, series info, previous/next post, and table of contents. Evaluate whether this guideline conflicts with the product requirements.

## 6. Content Pipeline: Structural Gaps

The content organization is central to the product. Find what's missing:

- Challenge the content file organization against the product steering doc's "draft/unpublished status" requirement. The structure shows `content/blog/my-post.mdx` but says nothing about how drafts are handled — is it a frontmatter field? A separate directory? A filename prefix? The Velite schema is the "single source of truth" per this document, but the structure should at least indicate the mechanism.
- Examine the `content/pages/` directory containing "about, now, colophon" against the product steering doc's full list of slash pages (about, contact, now, colophon, sitemap, slashes). Where is `contact` content? Is `/sitemap` purely generated with no content file? The structure is inconsistent with the product spec.
- Determine whether the playground items have any content/metadata story. The product doc describes a "listing/gallery of available items" for the playground section — where is the metadata (title, description, thumbnail) for each playground item stored? It's not in `content/` and not shown in the `playground/[item-name]/` structure.
- Challenge the absence of any image management convention for content. Blog posts and project writeups will have images — where do they go? How are they referenced in MDX? The structure shows `public/images/` and `public/static/` (Velite-copied) but doesn't explain the workflow or when to use which.

---

## Deliverables

Conclude your analysis with:

1. **Top 5 risks or gaps** — ranked by likelihood of causing real implementation pain. Be specific: name the file, the rule, or the scenario that breaks.
2. **Top 3 conclusions to challenge or reverse** — structural decisions in this document that should be reconsidered, with concrete reasoning for why.
3. **What's missing** — work that should be done before using this structure document to guide implementation.

Be specific and concrete. Cite failure scenarios, not abstract risks. If something is actually fine, say so briefly and move on.

---

## Target Document

Read the project structure document at: `/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/structure.md`

Also read the product steering document at `/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/product.md` and the tech steering document at `/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/tech.md` for cross-referencing.

Write your complete analysis to: `/home/mcf/repo/matthew-field.ca/.spec-workflow/steering/reviews/adversarial-analysis-structure.md`
