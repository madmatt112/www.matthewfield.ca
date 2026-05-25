# Design Document

## Overview

The project-showcase feature adds a Velite-driven `projects` collection plus two server-rendered routes — the gallery at `/projects` and per-project detail pages at `/projects/[slug]` — to the existing static-first Next.js site. The collection accepts colocated MDX files under `content/projects/`, validates frontmatter via Velite, and emits typed records that consumers reach through a single chokepoint module `src/lib/projects.ts`. The detail page renders the MDX body using a two-div narrow-text/escape-wide layout with a **`--outer-width` CSS-custom-property anchored escape** (v4 — fixing the v3 nested-container math bug). The gallery presents reverse-chronological cards, top-2 above-the-fold cards loading eagerly and below-the-fold cards lazy-loading. A shared date helper at `src/lib/format-date.ts` extracts the formatter currently inlined in `src/lib/blog.ts`; both `blog.ts` and `projects.ts` re-export with content-type-prefixed aliases for symmetry.

The design is entirely additive to site-foundation, blog-core, and professional-profile. `src/lib/blog-errors.ts` receives the `VERCEL_ENV=development` narrowing backport (no regression deferred). **v4 ALSO moves the `PROJECTS_INCLUDE_DRAFTS=1` build-log warning back into the Velite transform** — v3's module-scope memoization in `src/lib/projects.ts` was correct for single-process but produced N × workers warnings under Next.js's multi-worker build, and the dedup-state was a test-only export polluting the public surface. Velite runs once per build (single process by design), so the warning belongs there. The guard-ordering concern that originally motivated the move is now handled by the early-stderr exit in `next.config.ts` (which fires BEFORE velite runs in misconfigured production), so velite never emits the warning under a misconfigured prod build.

One fixture project (`fixture-placeholder.mdx` under `draft: true`) ships in the same PR. The empty-state ASSERTION runs against a Vitest `vi.mock("#site/content", () => ({ projects: [] }))` substitution — the synthetic JSON file from v3 is dropped in favour of a sibling `README.md` in `src/__fixtures__/projects-empty/` explaining the mock-based approach.

## v3 Adversarial Findings — Response Summary (r3)

This section records the v3 (r3) adversarial review's findings and how v4 addresses each. Full analysis at `.spec-workflow/specs/project-showcase/reviews/adversarial-analysis-design-r3.md`.

| # | Finding | Severity | Response | Where in v4 |
|---|---|---|---|---|
| Risk 1 | `translate-X(-50%)` math wrong — references narrow parent, `--outer-width` never declared, `max-width: min(100%, …)` falls back to ~700px | **Critical** | **Accepted.** `--outer-width: 64rem` declared on `.projects-article`. Wide-media `width: var(--outer-width); max-width: 100vw; left: 50%; transform: translateX(-50%); position: relative;` — using `position: relative` + `left: 50%` (not `margin-left`) which references the OUTER `.projects-article` containing block when the inner narrow div has no `position`. **Plus**: a fixture render is mandated as part of the implementation task. | Component 10 v4 CSS |
| Risk 2 | `pnpm-overrides` rationale factually wrong (pnpm doesn't hoist transitively to violate root pin) | **High** | **Accepted (reversal).** Dropped. Plain exact pin `"velite": "0.3.x"` (literal patch version resolved at PR time) in `dependencies` + `pnpm-lock.yaml` commit + `pnpm install --frozen-lockfile` IS the enforcement. | Component 17 v4 |
| Risk 3 | Module-scope `__warnedDraftSlugs` Set is per-worker, not per-build (4N × workers warnings) | **High** | **Accepted (reversal).** Warning moved back to Velite transform. Single process per build. Guard ordering preserved by the early-stderr exit in `next.config.ts` (runs before velite in misconfigured prod). | Component 1 v4 + Component 3 v4 |
| Risk 4 | `getProjectBySlug()` re-runs filter+sort per call (O(N×M)) | **Medium** | **Accepted.** Module-scope cache for `getPublishedProjects()` result. Cache key: the env-var tuple `(VERCEL, VERCEL_ENV, PROJECTS_INCLUDE_DRAFTS)`. Invalidates if any var differs from the cached snapshot — handles Vitest's per-test env mutations correctly. | Component 3 v4 |
| Risk 5 | `__resetWarnedDraftSlugs` test-only export pollutes production surface | **Medium** | **Resolved by Risk 3 reversal.** Warning emit moves to velite; no test-only reset needed in `projects.ts`. The cache from Risk 4 IS reset via env-var snapshot comparison, not a test-only export — no surface pollution. | Component 3 v4 |
| Rev 1 | Warning back to velite | — | **Accepted.** | Component 1 v4 |
| Rev 2 | Drop `pnpm-overrides` | — | **Accepted.** | Component 17 v4 |
| Rev 3 | Drop layout file, page-level CSS imports | — | **Accepted.** | Component 10 v4 + Component 16 deprecated |
| Attack 1 finding | Math fails on viewports below `lg` | — | **Documented as accepted trade-off.** Below `lg` (1024px), outer container is narrower than the wide-media's "wide" target, so the escape is a visual no-op. Acceptable: on mobile/tablet, narrow-prose + media-fills-container looks identical to media-fills-narrow. Documented in author doc §6. | Component 10 v4 + author doc §6 |
| Attack 1 finding | `<figure><figcaption>` double-escape | — | **Accepted partial.** `<figure>` REMOVED from the wide-media list. The inner `<img>` still escapes; the `<figure>` and its `<figcaption>` stay narrow. Result: image-with-caption renders as a narrow caption below a wide image. Documented in author doc §6. | Component 10 v4 wide-media list |
| Attack 1 finding | `position: sticky` / `position: relative` side effects of transform | — | **Documented.** Author doc §6 lists the side effects (transform creates a new containing block for `position: absolute` descendants; `position: sticky` on descendants is disabled). Realistic risk low; documentation suffices. | Author doc §6 |
| Attack 2 finding | Vitest VITEST env-var citation wrong (`.d.ts` is types only) | — | **Accepted.** Citation removed. Replaced with logical citation: "Vitest documents that `VITEST=true` is set in the runner process; this is the canonical detection mechanism per Vitest's globals API. The early-stderr guard tests verify the gate's effect, not the env-var setting." | Component 15 v4 |
| Attack 2 finding | `getProjectBySlug` throws in production-misconfig | — | **Documented.** Error scenario 7 explicitly notes that `getProjectBySlug` calls `getPublishedProjects` which throws on guard fail — `notFound()` is unreached because the build aborts. | Error Scenarios |
| Attack 3 finding | `next.config.ts` named-import contract drift | — | **Mitigated.** Vitest test `src/__tests__/next-config-imports.test.ts` (v4 — new) dynamically imports `next.config.ts` under `VITEST=true` and asserts (a) no process exit, (b) the expected guard message constants are importable from `blog-errors`/`project-errors`. Pins the contract. | Component 15 v4 + new test |
| Attack 3 finding | Audit step is doc, not enforcement | — | **Accepted.** Replaced with the contract test above. | Component 15 v4 |
| Attack 3 finding | `process.stderr.write + "\n"` vs `console.error` | — | **Accepted.** Switched to `console.error(...)`. Matches Node conventions; routes through same fd. Removes the manual-`\n` fragility. | Component 15 v4 |
| Attack 3 finding | Dual-guard wiring is repetitive (DRY) | — | **Accepted.** Helper `runDraftGuard(guard, msgProd, msgPreview, isUnderVitest)` added at the top of `next.config.ts`. | Component 15 v4 |
| Attack 4 finding | Version pin placeholder | — | **Accepted.** Pin operator is `"velite": "0.3.x"` (exact patch — the implementation task resolves the actual literal at PR time; the design contract is "exact-patch, no `^`/`~`"). | Component 17 v4 |
| Attack 4 finding | Upgrade-gate policy not stated | — | **Stated.** Author doc §9: "If the velite-output-shape regression test fails on a Velite upgrade PR, that is the signal the upgrade is breaking. Update the consumers (`projects.ts`, `<MDXContent />`, schema) AND the test in the same PR; do NOT silently update the test to match new output." | Author doc §9 v4 |
| Attack 4 finding | `pnpm` block merge concern | — | **Resolved by reversal.** No `pnpm` block needed. | Component 17 v4 |
| Attack 5 finding | Per-route layout file vs. page-level imports | — | **Accepted (reversal).** Layout file dropped. Each page (`page.tsx` for the gallery and `[slug]/page.tsx` for the detail) imports `src/styles/projects.css` directly. | Component 10 v4 + Component 16 deprecated |
| Attack 5 finding | CSS specificity is global | — | **Documented.** Even with page-level import, the `.projects-article` selector is global; if `.prose` is restyled elsewhere, `.projects-article .prose` has predictable specificity. Per-route load decision is acknowledged as load-time, not isolation. | Component 10 v4 comment |
| Attack 5 finding | Self-contradicting import line in page snippet | — | **Fixed.** Snippet updated (the import is now at the top of the snippet directly). | Component 10 v4 snippet |
| Attack 6 finding | JSON-with-comments doesn't exist | — | **Resolved.** `src/__fixtures__/projects-empty/` contains a `README.md` (NOT a `.json` file) explaining the `vi.mock` mechanism with a code example. No JSON file. | Component 9 v4 |
| Attack 6 finding | `vi.mock` returns only `projects` | — | **Documented.** The empty-state test ONLY imports the gallery page (`page.tsx`), which only consumes `projects` via `src/lib/projects.ts`. Transitive imports of `pages`/`profile`/`posts` do not occur. Verified by import-graph audit; documented in `README.md`. | Component 9 v4 |
| Attack 6 finding | E2E build-time content set mechanism unstated | — | **Specified.** The E2E reads `.velite/projects.json` after `pnpm build`, filters by `!p.draft` if `PROJECTS_INCLUDE_DRAFTS !== "1"`, counts length, asserts against rendered cards. Dual-build CI runs both flavors; the assertion is parameterized by `process.env.PROJECTS_INCLUDE_DRAFTS`. | Testing Strategy E2E v4 |
| Attack 6 finding | E2E flake from build-flavor coupling | — | **Resolved.** Parameterized by env-var as above. | Testing Strategy v4 |
| Attack 7 finding | Parity-triangle third assertion is transitively redundant | — | **Accepted.** Third assertion replaced with `expect(formatPostDate.toString()).toBe(formatProjectDate.toString())` — body-identity check that catches the specific bug class (`formatContentDate` mutated between imports) the v2 review identified. | Component 4 v4 parity tests |
| Attack 7 finding | Stale line-range citations | — | **Accepted.** Line-range citations replaced with logical citations ("the existing `formatPostDate` function in `src/lib/blog.ts`"). | Component 4 v4 |
| Attack 7 finding | Vitest `vi.resetModules()` would break identity tests | — | **Documented.** Parity tests explicitly do NOT call `vi.resetModules()`. Test file header comment states the isolation requirement. | Component 4 v4 |
| Attack 8 finding | Scanner matrix is a "menu" of bypasses | — | **Threat model stated.** The scanner defends against ACCIDENTAL import in a single-author repo (Matthew). Out-of-scope shapes are documented for transparency, NOT as recommended bypasses; the author doc explicitly says "do not use these shapes — they are not enforced, but reviewers will reject them." | Component 11 v4 threat model |
| Attack 8 finding | Sub-path Velite trigger invisible | — | **Resolved.** Velite upgrade checklist (author doc §9) includes a manual step: "verify `node_modules/velite/dist/index.d.ts` does not declare sub-path exports; if it does, file a follow-up to extend `runChokepointScan`." | Author doc §9 v4 |
| Attack 8 finding | Canary regex assertions create maintenance trap | — | **Documented.** Author doc §9 v4 states: "When extending the canary fixture, update the regex list AND expected-kinds set in `src/lib/projects.test.ts` together. The regex list catches accidental canary corruption; intentional extensions update both lists." | Author doc §9 v4 |
| Attack 8 finding | Doc-scanner false positives from in-doc examples | — | **Documented.** The chokepoint scanner walks `src/**/*.{ts,tsx}` only — `docs/**` is outside the walk. The doc-structural test reads `docs/projects-authoring.md` via `fs.readFileSync` and only checks `##` headings; it does not invoke `runChokepointScan` on doc contents. No false-positive risk. | Component 13 v4 |

## Steering Document Alignment

### Technical Standards (tech.md)

- **Markdown-driven content pipeline (tech.md §"Content Pipeline")**: the new `projects` collection follows the established Velite pattern.
- **Velite API verification (citations against `node_modules/velite/dist/index.d.ts`)**:
  - `s.image()` at line 6902 — returns `ZodEffects<ZodString, Image, string>`. `Image` at lines 6822–6847: `{ src, width, height, blurDataURL, blurWidth, blurHeight }`. Spec consumes `src`, `width`, `height`, `blurDataURL`.
  - `s.mdx()` and `s.markdown()` near line 6905.
  - VFile `DataMap` at lines 4982–4996: `content: string` field used by the heading-hygiene check.
  - `s.path()` near line 6897 — returns the velite-root-relative path.
  - **Version pin (v4 — simplified)**: `package.json` `dependencies` declares `"velite"` with an EXACT patch version (no `^` / `~`). `pnpm-lock.yaml` is committed. CI uses `pnpm install --frozen-lockfile`. The `pnpm-overrides` block from v3 is removed — pnpm does not hoist transitive demands to violate the root `dependencies` declaration, so the override added no enforcement.
- **TypeScript strict mode (tech.md §"Core Technologies")**: all new modules strict-typed. Chokepoint scanner uses `typescript` package's compiler API.
- **No client-side JavaScript libraries (tech.md §"Application Architecture")**: server components only.
- **shadcn/ui primitives (tech.md §"Styling")**: gallery cards reuse the shadcn `Card`, `CardHeader`, `CardContent`.
- **Tailwind Typography (tech.md §"Styling")**: detail-page body uses `prose` for typographic styling; width-constraint mechanism is independent of `prose` (the two-div pattern in Component 10).

### Project Structure (structure.md)

- **Content directory**: `content/projects/<slug>.mdx`.
- **Route layout**: `src/app/(site)/projects/page.tsx` (gallery), `src/app/(site)/projects/[slug]/page.tsx` (detail). **v4: NO new layout file** — the v3 `layout.tsx` is deprecated; CSS imported at the page level.
- **Library modules**: `src/lib/projects.ts`, `src/lib/projects.test.ts`, `src/lib/format-date.ts`, `src/lib/format-date.test.ts`, `src/lib/project-errors.ts`.
- **Modified library module**: `src/lib/blog-errors.ts` — looks-like-prod narrowing backported. Test extended.
- **Component modules**: `src/components/projects/project-card.tsx`, `link-rail.tsx`, `status-badge.tsx`, `updated-badge.tsx`.
- **Style module**: `src/styles/projects.css`.
- **Documentation**: `docs/projects-authoring.md` + structural test `src/__tests__/docs-projects-authoring.test.ts`.
- **Fixture canary**: `src/__fixtures__/chokepoint-canary.ts`.
- **Empty-state fixture (v4 — clarified)**: `src/__fixtures__/projects-empty/README.md` only. Documents the `vi.mock` mechanism; no `.json` file.
- **next.config.ts contract test (v4 — new)**: `src/__tests__/next-config-imports.test.ts`.

## Code Reuse Analysis

### Existing Components to Leverage

- **`src/components/shared/mdx-content.tsx`** (`<MDXContent />`): used unchanged.
- **`src/components/ui/card.tsx`**: used by `<ProjectCard />`.
- **`src/lib/blog.ts`**: the existing inline date formatter is extracted to `src/lib/format-date.ts`. `blog.ts` re-exports as `formatPostDate`. `projects.ts` re-exports as `formatProjectDate`.
- **`src/lib/blog-errors.ts`** (modified): looks-like-prod narrowing backported. Diff is +6/-2 lines.
- **`next.config.ts`** (v4 — extended): existing `__draftGuard` block extended to call the projects guard via a shared `runDraftGuard()` helper. Both guards gated on `process.env.VITEST !== "true"`.
- **`velite.config.ts`**: shared remark/rehype plugins reused. v4: `PROJECTS_INCLUDE_DRAFTS=1` warning emitted from the velite transform (single-process — see Component 1 v4).
- **`src/app/sitemap.ts`**: extended.
- **CI dual-build topology** (commit `7b8d11f`): reused.

### Integration Points

- **Velite output (`#site/content` alias)**: all access through `src/lib/projects.ts`. Chokepoint scanner enforces this.
- **Next.js Image**: gallery and detail covers use `next/image`.
- **Sitemap**: `src/app/sitemap.ts` consumes `getPublishedProjects()`.
- **CSP**: `frame-src 'self'` — external iframes blocked.
- **CI link checker**: picks up the project subtree.
- **Early-stderr draft-leak guard** in `next.config.ts`: extended for projects + VITEST gate.

## Architecture

Three-layer stack: Velite collection + transform at build time → chokepoint query module + draft-leak guard at server-render time → route components + presentational components.

```mermaid
graph TD
    A[content/projects/*.mdx] --> B[Velite projects collection<br/>+ frontmatter schema<br/>+ s.image cover/og<br/>+ remark heading-hygiene check<br/>+ v4 PROJECTS_INCLUDE_DRAFTS warn emit]
    B --> C[.velite/projects.json]
    C --> D[src/lib/projects.ts<br/>getPublishedProjects v4 cached<br/>getProjectBySlug<br/>shouldShowUpdatedBadge]
    D --> E[src/app/(site)/projects/page.tsx<br/>Gallery<br/>+ projects.css import v4]
    D --> F[src/app/(site)/projects/[slug]/page.tsx<br/>Detail two-div layout<br/>+ projects.css import v4]
    D --> G[src/app/sitemap.ts]
    E --> H[ProjectCard]
    E --> I[StatusBadge]
    F --> J[LinkRail]
    F --> K[StatusBadge]
    F --> L[MDXContent]
    F --> M[UpdatedBadge]
    N[src/lib/format-date.ts] --> D
    N --> O[src/lib/blog.ts]
    P[src/lib/project-errors.ts<br/>VITEST-gate, dev-aware] --> D
    P -.runDraftGuard helper.-> Q[next.config.ts]
    Z[src/lib/blog-errors.ts<br/>v3 dev-aware backport] --> O
    Z -.runDraftGuard helper.-> Q
    R[src/__fixtures__/chokepoint-canary.ts] -.canary test.-> S[runChokepointScan]
    S -.CI gate.-> D
    T[src/__fixtures__/projects-empty/README.md<br/>v4: docs the vi.mock] -.docs.-> E
    U[package.json exact-patch velite pin] --> B
    V[src/__tests__/next-config-imports.test.ts v4] -.contract.-> Q
```

### Modular Design Principles

- **Single File Responsibility**: each module has one job.
- **Component Isolation**: cards don't import rail; rail doesn't know about cards.
- **Service Layer Separation**: `src/lib/projects.ts` is the only consumer of `#site/content`'s `projects`.
- **Utility Modularity**: `formatContentDate` at `src/lib/format-date.ts`.

## Components and Interfaces

### Component 1: Velite `projects` collection (v4 — re-hosts the draft warning)

- **Purpose**: validate frontmatter, process cover/og images, compile MDX, enforce heading hygiene, **emit `PROJECTS_INCLUDE_DRAFTS=1` warning** (one per draft slug per build).
- **Location**: `velite.config.ts`.
- **Schema** (unchanged):
  ```ts
  s.object({
    title: s.string().min(1).max(120),
    description: s.string().min(50).max(160),
    summary: s.string().min(30).max(140),
    date: s.isodate(),
    cover: s.image(),
    coverAlt: s.string().min(1).max(250),
    tags: s.array(s.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)).max(8).default([]),
    status: s.enum(["active", "archived", "concept"]).default("active"),
    ogImage: s.image().optional(),
    updated: s.isodate().optional(),
    draft: s.boolean().default(false),
    slug: s.path(),
    featured: s.boolean().default(false),
    links: s.array(linkSchema).max(6).optional(),
    body: s.mdx(),
  }).strict()
  ```
- **Transform step**:
  1. Strip `projects/` prefix from `slug` (and trailing `/index.mdx` or `.mdx`).
  2. Validate cover dims/size (warn at 500 KB; fail at 1 MB; fail at &lt;1200×800).
  3. Validate `ogImage` dims/aspect; emit fallback INFO log when absent for non-draft project.
  4. Validate `links` entries.
  5. Run `checkProjectHeadings()` (Component 2).
  6. **v4 — Draft warning emit**: WHEN `data.draft === true` AND `process.env.PROJECTS_INCLUDE_DRAFTS === "1"` THEN `console.error(`[velite/projects] PROJECTS_INCLUDE_DRAFTS=1 — including draft project: ${slug}`)`. Velite runs once per build in a single process, so this fires once per draft per build regardless of how many Next.js workers later read `.velite/projects.json`. The guard-ordering concern is handled by `next.config.ts`'s early-stderr exit, which runs BEFORE velite when a misconfigured production build is detected — velite never emits the warning under misconfig because the build aborts before velite starts.
- **Reuses**: `velite.config.ts`'s existing structure; the `posts` collection's `.transform((data, { meta }) => …)` pattern.

### Component 2: MDX heading-hygiene check (unchanged from v3)

- **Purpose**: AST-only enforcement of Req 6.9.a / 6.9.b / 6.9.c.
- **Location**: helper inside `velite.config.ts`.
- **Logic**: `unified().use(remarkParse).use(remarkGfm).use(remarkMdx).parse(meta.content)` → walk via `unist-util-visit` → record heading depths, reject `mdxJsxFlowElement`/`mdxJsxTextElement` whose tag is `h1`/`H1`, enforce first-heading-is-h2 + no-level-skips. `PROJECTS_ALLOW_H4=1` unlocks depth but not sequence.
- **Reuses**: same plugin stack as `posts` collection.

### Component 3: `src/lib/projects.ts` (chokepoint module, v4 — cached + emit removed)

- **Public surface**:
  ```ts
  export type Project = (typeof projects)[number];
  export type ProjectLink = NonNullable<Project["links"]>[number];
  export function getPublishedProjects(): Project[];
  export function getProjectBySlug(slug: string): Project | null;
  export function shouldShowUpdatedBadge(project: Project): boolean;
  export const formatProjectDate: typeof formatContentDate;
  ```
- **v4 — Module-scope cache** (Risk 4 response):
  ```ts
  // Cache keyed on the env-var tuple. Invalidates if any var differs from the snapshot —
  // handles Vitest's per-test env mutations correctly without a test-only export.
  type EnvSnapshot = { vercel?: string; vercelEnv?: string; drafts?: string };
  let __cached: { snapshot: EnvSnapshot; result: Project[] } | null = null;

  function envSnapshot(): EnvSnapshot {
    return {
      vercel: process.env.VERCEL,
      vercelEnv: process.env.VERCEL_ENV,
      drafts: process.env.PROJECTS_INCLUDE_DRAFTS,
    };
  }
  function snapshotsEqual(a: EnvSnapshot, b: EnvSnapshot): boolean {
    return a.vercel === b.vercel && a.vercelEnv === b.vercelEnv && a.drafts === b.drafts;
  }
  ```
- **`getPublishedProjects()` body (v4)**:
  ```ts
  export function getPublishedProjects(): Project[] {
    const snapshot = envSnapshot();
    if (__cached !== null && snapshotsEqual(__cached.snapshot, snapshot)) {
      return __cached.result;
    }
    const guard = checkVercelDraftGuard();
    if (guard?.kind === "production") {
      throw new Error(PROJECTS_DRAFT_LEAK_GUARD_MSG_PRODUCTION);
    }
    if (guard?.kind === "preview") {
      throw new Error(PROJECTS_DRAFT_LEAK_GUARD_MSG_PREVIEW);
    }
    const includeDrafts = snapshot.drafts === "1";
    const filtered = includeDrafts ? projects : projects.filter((p) => !p.draft);
    const result = [...filtered].sort(byDateDescSlugAsc);
    __cached = { snapshot, result };
    return result;
  }
  ```
  - **Cache invalidation**: env-snapshot comparison invalidates on any of `VERCEL`/`VERCEL_ENV`/`PROJECTS_INCLUDE_DRAFTS` changing. Vitest tests that mutate `process.env` per-test naturally trigger re-computation; no test-only export needed.
  - **No warning emit in this function** (moved to velite — Risk 3).
  - **Multi-worker correctness**: each Next.js worker has its own cache instance, which is fine — the cache deduplicates filter+sort work within a worker, not across workers. There is no cross-worker dedup need because the warning emit (the only side effect that mattered for dedup) is now in velite, which is single-process.
- **`getProjectBySlug()` body**:
  ```ts
  export function getProjectBySlug(slug: string): Project | null {
    return getPublishedProjects().find((p) => p.slug === slug) ?? null;
  }
  ```
  With the cache, per-worker cost is one filter+sort per env-state, not per call. M detail pages × 2 calls each = 2M cache hits after the first miss. O(N + M) instead of O(N×M).
- **`shouldShowUpdatedBadge(project)`**: `project.updated != null && new Date(project.updated) > new Date(project.date)`.
- **`byDateDescSlugAsc`**: internal, top-of-file.
- **`formatProjectDate`**: `export const formatProjectDate = formatContentDate;`.

### Component 4: `src/lib/format-date.ts` (shared formatter)

- **Public surface**:
  ```ts
  const contentDateFormatter = new Intl.DateTimeFormat("en-CA", {
    year: "numeric", month: "long", day: "numeric",
  });
  export function formatContentDate(iso: string): { datetime: string; display: string } {
    return { datetime: iso, display: contentDateFormatter.format(new Date(iso)) };
  }
  ```
- **Migration**: the existing inline formatter in `src/lib/blog.ts` (`postDateFormatter` constant + `formatPostDate` function) is replaced with `import { formatContentDate } from "@/lib/format-date"; export const formatPostDate = formatContentDate;`. (Logical citation — no line range, per Attack 7 finding.)
- **Parity tests (v4)**:
  - Formatter output for known ISO dates.
  - `formatPostDate === formatContentDate` (reference identity, catches re-localization).
  - `formatProjectDate === formatContentDate` (reference identity).
  - **`formatPostDate.toString() === formatProjectDate.toString()`** — replaces the v3 transitive-redundant third reference assertion. The `toString()` body-identity check catches the specific bug class where `formatContentDate`'s function body is mutated between imports (per Attack 7's "drop or replace" recommendation).
- **Test isolation**: parity tests explicitly do NOT call `vi.resetModules()`. Header comment in the test file states the requirement.
- **Reuses**: the existing `formatPostDate` function literal from `src/lib/blog.ts`.

### Component 5: `src/lib/project-errors.ts` (draft-leak guard)

- **Public surface**:
  ```ts
  export const PROJECTS_DRAFT_FLAG_VAR_NAME = "PROJECTS_INCLUDE_DRAFTS";
  export const PROJECTS_DRAFT_LEAK_GUARD_MSG_PRODUCTION: string;
  export const PROJECTS_DRAFT_LEAK_GUARD_MSG_PREVIEW: string;
  export function checkVercelDraftGuard(): { kind: "production" | "preview" } | null;
  ```
- **Message wording** (v3 carry-over — parameterized to surface actual env state):
  ```ts
  export const PROJECTS_DRAFT_LEAK_GUARD_MSG_PRODUCTION = `[project-showcase] Draft projects would be included in this build, but the build environment looks like production (or an unrecognized environment).
  VERCEL=1 + VERCEL_ENV=${process.env.VERCEL_ENV ?? "<unset>"} + PROJECTS_INCLUDE_DRAFTS=1 — production or unknown environments must not coexist with drafts.
  Fix on Vercel: remove PROJECTS_INCLUDE_DRAFTS from the Production scope.
  See Req 7.3 in .spec-workflow/specs/project-showcase/requirements.md.`;
  ```
- **Logic** (v3 carry-over — narrowed looks-like-prod):
  ```ts
  function checkVercelDraftGuard() {
    const vercel = process.env.VERCEL;
    const env = process.env.VERCEL_ENV;
    const drafts = process.env.PROJECTS_INCLUDE_DRAFTS;
    if (vercel !== "1") return null;
    if (env === "production" && drafts === "1") return { kind: "production" };
    if (env === "preview" && drafts !== "1") return { kind: "preview" };
    const isLooksLikeProd =
      drafts === "1" &&
      env !== "production" &&
      env !== "preview" &&
      env !== "development";
    if (isLooksLikeProd) return { kind: "production" };
    return null;
  }
  ```

### Component 6: `<ProjectCard />`

- **Location**: `src/components/projects/project-card.tsx`.
- **Props**: `{ project: Project; eager: boolean }`.
- **DOM** (per Req 2.3): cover image, title `<h3>`, time, status badge (if not active), featured badge (if featured), summary. Single `<a>` with `aria-labelledby="card-title-<slug>"`. `eager` controls Next.js Image `priority`/`loading`.

### Component 7: `<StatusBadge />`

- **Location**: `src/components/projects/status-badge.tsx`.
- **Props**: `{ status: "archived" | "concept" }`.
- **DOM**: plain `<span>` with status-specific class.

### Component 8: `<LinkRail />`

- **Location**: `src/components/projects/link-rail.tsx`.
- **Props**: `{ links: ProjectLink[] }`.
- **DOM**: `<nav aria-label="Project links">` containing `<ul>` of `<li><a href={url} rel="noopener">{label}</a></li>` entries with optional kind-driven SVG icon.

### Component 9: Gallery page `src/app/(site)/projects/page.tsx` (v4 — page-level CSS import)

- **Server component**. `export const dynamic = "force-static";`.
- **v4 — Page-level CSS import**: `import "@/styles/projects.css";` at the top of the file. Per-route load decision; CSS not loaded on other routes.
- **Structure** (unchanged from v3): empty state → grid of `<ProjectCard />` with `eager={i < 2}`.
- **v4 — Empty-state mechanism**: `vi.mock("#site/content", () => ({ projects: [] }))` in the unit test. `src/__fixtures__/projects-empty/README.md` documents the approach with a code example:
  ```markdown
  # Empty-state test fixture
  This directory documents the empty-state test approach. There is NO data file —
  the test uses `vi.mock` to substitute `#site/content`:
  ```ts
  vi.mock("#site/content", () => ({ projects: [] }));
  ```
  Import-graph note: the gallery page only consumes `projects` via `src/lib/projects.ts`,
  not `pages`/`profile`/`posts`. A mock returning only `projects` is sufficient.
  ```
- **Sitemap integration**: extends `src/app/sitemap.ts`.

### Component 10: Detail page `src/app/(site)/projects/[slug]/page.tsx` (v4 — anchored-escape CSS)

- **Server component**. `export const dynamic = "force-static";`. No `dynamicParams = false`.
- **Page-level CSS import**: `import "@/styles/projects.css";` at the top of the file.
- **Structure**:
  ```tsx
  import "@/styles/projects.css";
  import { notFound } from "next/navigation";
  import Image from "next/image";
  // ...
  export const dynamic = "force-static";
  export function generateStaticParams() {
    return getPublishedProjects().map((p) => ({ slug: p.slug }));
  }
  export async function generateMetadata({ params }) {
    const { slug } = await params;
    const project = getProjectBySlug(slug);
    if (!project) return {};
    const metadata: Metadata = {
      title: project.title,
      description: project.description,
      alternates: { canonical: `/projects/${project.slug}` },
      openGraph: {
        type: "article",
        title: project.title,
        description: project.description,
        publishedTime: project.date,
        ...(project.updated ? { modifiedTime: project.updated } : {}),
        ...(project.ogImage
          ? { images: [{ url: project.ogImage.src, width: project.ogImage.width, height: project.ogImage.height }] }
          : {}),
      },
    };
    return metadata;
  }
  export default async function ProjectPage({ params }) {
    const { slug } = await params;
    const project = getProjectBySlug(slug);
    if (!project) notFound();
    const { datetime, display } = formatContentDate(project.date);
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:py-16 projects-article">
        <article>
          <header className="mb-8">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{project.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
              <time dateTime={datetime}>{display}</time>
              {shouldShowUpdatedBadge(project) ? <UpdatedBadge updated={project.updated!} /> : null}
              {project.status !== "active" ? <StatusBadge status={project.status} /> : null}
            </div>
          </header>
          <Image
            src={project.cover.src}
            width={project.cover.width}
            height={project.cover.height}
            alt={project.coverAlt}
            sizes="(max-width: 1023px) 100vw, 1024px"
            priority
            className="w-full h-auto"
          />
          {project.links && project.links.length > 0 ? <LinkRail links={project.links} /> : null}
          <div className="mx-auto max-w-prose mt-8">
            <div className="prose dark:prose-invert">
              <MDXContent code={project.body} />
            </div>
          </div>
          <a href="/projects" className="mt-12 inline-block">Back to all projects</a>
        </article>
      </div>
    );
  }
  ```

- **v4 — Container-width contract (Req 6.7) — anchored-escape CSS** (Risk 1 — math FIX):
  - `.projects-article` is on the OUTER container (`max-w-5xl`).
  - `--outer-width: 64rem;` is declared as a CSS custom property on `.projects-article` (64rem = 1024px at default base-16 font-size — matches `max-w-5xl`'s Tailwind value).
  - `.projects-article` ALSO declares `position: relative;` so it becomes the containing block for `position: absolute`/`left` references inside it. **The inner `.prose` div does NOT set `position`**, so wide-media descendants resolve `left: 50%` against `.projects-article` — the outer container — NOT against the narrow column.
  - Wide-media escape CSS:
    ```css
    .projects-article {
      --outer-width: 64rem;
      position: relative;
    }
    .projects-article .prose :is(img, picture, video, pre, table, iframe, svg) {
      /* Anchored to the outer container's centerline via position: relative + left: 50%
         + translateX(-50%). The outer container IS the nearest positioned ancestor. */
      position: relative;
      left: 50%;
      transform: translateX(-50%);
      width: min(var(--outer-width), 100vw - 2rem);
      max-width: none;
    }
    /* Iframes have no intrinsic height — default to 16/9. */
    .projects-article .prose iframe {
      aspect-ratio: 16 / 9;
      height: auto;
    }
    /* SVG requires viewBox to scale; documented in author doc §6. */
    .projects-article .prose svg {
      height: auto;
    }
    ```
  - **Why this is correct (showing the math — v4)**:
    - `position: relative` on the wide-media element makes its `left: 50%` reference its CONTAINING BLOCK, which by CSS spec is the nearest ancestor with `position: relative/absolute/fixed/sticky`. `.projects-article` is set to `position: relative`. The `.prose` div has no `position` set. So `left: 50%` resolves to `50% × .projects-article width = 50% × min(64rem, viewport - 2rem)`.
    - `transform: translateX(-50%)` shifts the element left by 50% of its OWN width.
    - `width: min(var(--outer-width), 100vw - 2rem)` sets the element's width to the smaller of 64rem and (viewport - 2rem). This gives the wide-media element the SAME width as the outer container at `lg`+ breakpoints AND a sensible width at narrower viewports.
    - Net: the wide-media element's center sits on the outer container's centerline, AND its width equals the outer container's content-box width.
    - Below `lg`: outer container = `viewport - 2rem` (from `px-4`), and wide-media width = `viewport - 2rem` — same width — visual escape is a no-op (acceptable; documented).
  - **Implementation gate (v4 — mandated)**: the implementation task MUST include a fixture render step. Build one MDX fixture with a wide `<img>`, a wide `<table>`, a wide `<pre>`, and a narrow `<p>` sibling. Render at `lg` viewport. Screenshot. **The screenshot is attached to the spec's implementation log.** This is the empirical verification step the r3 review (Missing #6) called for. The Lighthouse manual-verification step naturally co-locates this work.
  - **Wide-media tag list (v4 — `<figure>` removed)**: `img`, `picture`, `video`, `pre`, `table`, `iframe`, `svg`. **`<figure>` deliberately excluded** (r3 Attack 1 finding): a `<figure><img><figcaption>` triple should render with a wide `<img>` and narrow `<figcaption>`; keeping `<figure>` narrow gives that result.
  - **Iframe scope**: CSP is `frame-src 'self'` — external iframes blocked at launch.
- **Visual wireframe**:
  ```
  ┌─ .projects-article (max-w-5xl, position: relative, --outer-width: 64rem) ─┐
  │ # Page Title (h1)                  ← full container width                  │
  │ May 25, 2026 · Updated · Status                                            │
  │                                                                            │
  │ ┌── cover image (full container width via className) ──────────────────┐  │
  │ │                                                                      │  │
  │ └──────────────────────────────────────────────────────────────────────┘  │
  │                                                                            │
  │ Link rail                                                                  │
  │                                                                            │
  │           ┌─ .prose inside max-w-prose (~65ch, mx-auto) ──┐               │
  │           │ ## Body heading                               │               │
  │           │ Body paragraph at ~65ch                       │               │
  │           │                                               │               │
  │ ┌── <img> escaped to outer container width ────────────────────────────┐ │
  │ │   (left: 50% of .projects-article + translateX(-50%))                │ │
  │ └──────────────────────────────────────────────────────────────────────┘ │
  │           │ Back to narrow text after wide media          │               │
  │           └───────────────────────────────────────────────┘               │
  │                                                                            │
  │ [Back to all projects]                                                     │
  └────────────────────────────────────────────────────────────────────────────┘
  ```
- **CSS specificity note**: `.projects-article .prose :is(img, …)` has predictable specificity (one class, one class, one pseudo-class). Other `.prose` rules elsewhere on the site retain their styling; the projects-specific rule applies only inside `.projects-article`. The per-route page-level import is a LOAD-TIME decision; the rule itself is globally addressable if invoked. Documented.

### Component 11: Chokepoint enforcement test

- **Location**: scanner at `src/lib/build/check-projects-chokepoint.ts`; test at `src/lib/projects.test.ts`.
- **Threat model (v4 — stated per Attack 8)**: defends against ACCIDENTAL import of `projects` from `#site/content` outside the chokepoint module in a single-author repo. Out-of-scope shapes are listed in the coverage matrix for transparency, NOT as a bypass menu. Author doc §9 explicitly states: "Do not use the documented out-of-scope shapes — they are not mechanically enforced but reviewers will reject them."
- **Algorithm** (unchanged from v3): named, named-renamed, namespace+member, namespace+destructure, namespace+destructure-with-rename, barrel-star/-named/-renamed, dynamic-string/dynamic-template, type-only.
- **`isContentSpecifier` policy**: exact equality `=== "#site/content"`. Sub-path imports out of scope.
- **Coverage matrix** (carry-over from v3 — 17 rows).
- **Canary fixture** (`src/__fixtures__/chokepoint-canary.ts`) — unchanged from v3.
- **Canary test with regex-mutation safety** — unchanged from v3.
- **Allowlist**: `src/lib/projects.ts`, `src/lib/projects.test.ts`, `src/__fixtures__/chokepoint-canary.ts`.
- **CI invocation**: `pnpm test` walks `.ts`/`.tsx` files under `src/`.

### Component 12: (deprecated)

The "build-log warning location" thread terminates here. v1: velite. v2/v3: `projects.ts`. v4: **velite** (Risk 3 reversal — single-process correctness wins). Final location: Component 1 v4.

### Component 13: `docs/projects-authoring.md` + structural test

- **Doc location**: `docs/projects-authoring.md`.
- **Section order** (Req 11.1): §1 Quick start → §2 Frontmatter → §3 Cover image → §4 Sharing previews → §5 MDX body → §6 Container width and wide media → §7 `updated` editorial → §8 Lifecycle → §9 Local dev env vars → §10 `featured` editorial.
- **v4 — Author doc additions**:
  - **§6**:
    - Inline SVG must have `viewBox`.
    - First-party iframes default to 16/9 aspect-ratio; authors override with inline `style="aspect-ratio: ..."`.
    - Wide-media escape applies at `lg`+ breakpoints; below `lg` it is a visual no-op (the outer container itself is narrow on small viewports).
    - `<figure>` stays narrow; image-with-caption renders as wide-image + narrow-caption.
    - Transform-related side effects: wide-media descendants with `position: absolute` use the escaped element as their containing block; `position: sticky` on descendants is disabled by the parent transform.
  - **§9**:
    - Scanner coverage matrix summary + threat model statement.
    - Documented bypasses (alias-through-local, computed-string destructure) — DO NOT USE.
    - Velite version pin: `package.json` `dependencies` declares exact patch. `pnpm install --frozen-lockfile` in CI. Upgrade workflow:
      1. Bump `package.json` to new exact-patch version.
      2. Run `pnpm install` to regenerate lockfile.
      3. **Manual checkpoint (Attack 8 sub-path concern)**: open `node_modules/velite/dist/index.d.ts`; confirm no sub-path exports were added. If yes, file a follow-up to extend `runChokepointScan`.
      4. Re-run `src/__tests__/velite-output-shape.test.ts`. **Upgrade-gate policy**: if it fails, the upgrade is breaking. Update the consumers AND the test in the same PR. Do not silently update the test alone.
    - Canary maintenance protocol: when extending the fixture, update both the regex sentinel list AND the expected-kinds set in `src/lib/projects.test.ts`.
- **Structural test** at `src/__tests__/docs-projects-authoring.test.ts`. Reads `docs/projects-authoring.md`; asserts the ten section heading strings appear as `##` in order. Does NOT invoke `runChokepointScan` on doc contents.

### Component 14: `<UpdatedBadge />`

- **Location**: `src/components/projects/updated-badge.tsx`.
- **Props**: `{ updated: string }`.
- **DOM**: `<span><time dateTime={updated}>Updated on {display}</time></span>`.

### Component 15: `next.config.ts` early-stderr guard (v4 — DRY + contract test + console.error)

- **Top-level wiring**:
  ```ts
  // next.config.ts (v4 — DRY helper + VITEST gate + console.error)
  import {
    BLOG_DRAFT_LEAK_GUARD_MSG_PREVIEW,
    BLOG_DRAFT_LEAK_GUARD_MSG_PRODUCTION,
    checkVercelDraftGuard as checkBlogDraftGuard,
  } from "./src/lib/blog-errors";
  import {
    PROJECTS_DRAFT_LEAK_GUARD_MSG_PREVIEW,
    PROJECTS_DRAFT_LEAK_GUARD_MSG_PRODUCTION,
    checkVercelDraftGuard as checkProjectsDraftGuard,
  } from "./src/lib/project-errors";

  // Vitest sets process.env.VITEST="true" in the runner process. Under tests,
  // we log to stderr but DO NOT exit — exiting would kill the runner mid-suite.
  const __isUnderVitest = process.env.VITEST === "true";

  function runDraftGuard(
    guard: { kind: "production" | "preview" } | null,
    msgProd: string,
    msgPreview: string,
  ): void {
    if (!guard) return;
    const msg = guard.kind === "production" ? msgProd : msgPreview;
    console.error(msg);
    if (!__isUnderVitest) process.exit(1);
  }

  runDraftGuard(
    checkBlogDraftGuard(),
    BLOG_DRAFT_LEAK_GUARD_MSG_PRODUCTION,
    BLOG_DRAFT_LEAK_GUARD_MSG_PREVIEW,
  );
  runDraftGuard(
    checkProjectsDraftGuard(),
    PROJECTS_DRAFT_LEAK_GUARD_MSG_PRODUCTION,
    PROJECTS_DRAFT_LEAK_GUARD_MSG_PREVIEW,
  );
  ```
- **v4 changes vs. v3**:
  - **DRY helper** `runDraftGuard()` collapses the 4-branch repetition into one function (r3 Attack 3 finding).
  - **`console.error(...)`** replaces `process.stderr.write(... + "\n")` — automatic newline, conventional Node style, same stderr destination (r3 Attack 3 finding).
- **`next.config.ts` contract test** at `src/__tests__/next-config-imports.test.ts` (v4 — new):
  ```ts
  // Locks the named-import contract from blog-errors and project-errors to next.config.ts.
  // Also locks the VITEST gate: importing next.config under VITEST=true must NOT exit the process.
  import { describe, it, expect } from "vitest";
  describe("next.config.ts imports + VITEST gate", () => {
    it("imports successfully under VITEST=true without process.exit", async () => {
      expect(process.env.VITEST).toBe("true");
      const mod = await import("../../next.config");
      expect(mod.default).toBeDefined();
    });
    it("blog-errors exports the expected names", async () => {
      const blog = await import("../lib/blog-errors");
      expect(typeof blog.checkVercelDraftGuard).toBe("function");
      expect(typeof blog.BLOG_DRAFT_LEAK_GUARD_MSG_PRODUCTION).toBe("string");
      expect(typeof blog.BLOG_DRAFT_LEAK_GUARD_MSG_PREVIEW).toBe("string");
    });
    it("project-errors exports the expected names", async () => {
      const proj = await import("../lib/project-errors");
      expect(typeof proj.checkVercelDraftGuard).toBe("function");
      expect(typeof proj.PROJECTS_DRAFT_LEAK_GUARD_MSG_PRODUCTION).toBe("string");
      expect(typeof proj.PROJECTS_DRAFT_LEAK_GUARD_MSG_PREVIEW).toBe("string");
    });
  });
  ```
  This pins the `next.config.ts` ↔ `*-errors.ts` import contract (Attack 3 finding) AND verifies the VITEST gate prevents test-runner kill (Attack 3 + Missing #7).
- **Vitest VITEST citation (v4 — logical)**: Vitest's globals API documents that the runner sets `VITEST=true` in `process.env` for the test process. The v3 `.d.ts` citation is dropped (`.d.ts` is types, not runtime behaviour). The new contract test verifies behaviourally — `expect(process.env.VITEST).toBe("true")` runs as part of the suite.

### Component 16: (deprecated v4)

The per-route layout `src/app/(site)/projects/layout.tsx` is dropped (r3 Reversal 3). CSS imported per-page (Component 9 + Component 10).

### Component 17: Velite version pin enforcement (v4 — simplified)

- **Mechanism**:
  - `package.json` `dependencies` declares `"velite"` with the EXACT patch version (no `^` / `~`). The literal version string is resolved during the implementation task — design contract is "exact-patch operator."
  - `pnpm-lock.yaml` is committed (already standard).
  - CI install: `pnpm install --frozen-lockfile` (already standard).
- **No `pnpm-overrides`**: r3 Risk 2 identified that pnpm does not hoist transitive demands to violate the root `dependencies` declaration. The override added maintenance cost without enforcement.
- **Upgrade gate**: documented in author doc §9 (workflow + breaking-test policy + sub-path manual checkpoint).

## Data Models

### Model 1: `Project`

```
Project (derived from Velite collection output)
- title: string                              // 1–120 chars
- description: string                        // 50–160 chars, meta-only
- summary: string                            // 30–140 chars, card-only
- date: string (ISO 8601 date)
- cover: Image                               // see Velite Image (Steering §Velite API)
- coverAlt: string                           // 1–250 chars
- tags: string[]                             // 0–8 kebab-slug strings, stored not rendered
- status: "active" | "archived" | "concept"
- ogImage?: Image
- updated?: string (ISO 8601 date)
- draft: boolean (default false)
- slug: string
- featured: boolean (default false)
- links?: ProjectLink[]                      // max 6 entries
- body: string                               // MDX-compiled function body
```

### Model 2: `ProjectLink`

```
ProjectLink
- kind?: "demo" | "repo" | "docs" | "package" | "writeup"
- label: string                              // 1–60 chars
- url: string                                // http:/https: only
```

### Model 3: `ScanFinding` (test-only)

```
ScanFinding
- kind: "named" | "namespace-member" | "namespace-destructure" | "barrel-star" | "barrel-named" | "dynamic" | "type-only"
- node: ts.Node
```

## Error Handling

1. **Schema violation in frontmatter (Req 1.6)** — Velite `.strict()` parse + `.transform()` throws.
2. **Cover image dimensions or file size out of bounds (Req 3.1)** — soft warning at 500 KB; hard fail at 1 MB; dim fail at &lt;1200×800.
3. **`ogImage` aspect or dimension violation (Req 1.3)** — `.transform()` throws.
4. **Invalid `links` entry (Req 5.1, 5.2)** — schema + URL validation rejects.
5. **MDX heading-hygiene violation (Req 6.9)** — `checkProjectHeadings()` throws.
6. **MDX compile error / reference to undefined component (Req 6.8)** — `s.mdx()` error or runtime `ReferenceError`.
7. **Draft leakage to production (Req 7.3)** — early-stderr guard at `next.config.ts` exits non-zero BEFORE velite runs (gated on `VITEST !== "true"`). `vercel dev` with `PROJECTS_INCLUDE_DRAFTS=1` is allowed. Note: `getProjectBySlug` in a misconfigured production environment calls `getPublishedProjects()`, which throws on the guard — the `notFound()` 404 path is unreached because the build aborts.
8. **Slug not found at runtime (Req 6.2)** — `getProjectBySlug()` returns null → `notFound()` → 404.
9. **Empty `content/projects/` directory (Req 1.8, 2.9)** — `getPublishedProjects()` returns `[]`; gallery renders empty state.
10. **Chokepoint violation (Req 7.4)** — CI test fails.
11. **Doc structural-test failure (Req 11.3)** — `src/__tests__/docs-projects-authoring.test.ts` fails.
12. **Lighthouse re-verification miss (Req 12)** — cadence after the 3rd, 6th, 9th, … published project.

## Testing Strategy

### Unit Testing

- **`src/lib/format-date.test.ts`** — formatter output; three parity assertions:
  - `formatPostDate === formatContentDate`
  - `formatProjectDate === formatContentDate`
  - `formatPostDate.toString() === formatProjectDate.toString()` (function-body identity, v4 — replaces the v3 transitively-redundant assertion).
  - Test file header comment: "Do not call `vi.resetModules()` in this file — parity assertions depend on shared module instances."
- **`src/lib/projects.test.ts`**:
  - Sort, draft filter, `shouldShowUpdatedBadge` truth table, `getProjectBySlug` returns null for missing slug.
  - Draft-leak guard branches (production, preview, looks-like-prod, `VERCEL_ENV=development` NOT firing).
  - **v4 — Cache invalidation**: mutate `process.env`, call `getPublishedProjects()`, assert the result reflects the new env-state.
  - **v4 — Cache memoization**: with stable env, call `getPublishedProjects()` twice; assert the second call returns the SAME array reference (cache hit).
  - Chokepoint scanner cases; canary fixture-mutation regex assertions.
  - Empty collection via `vi.mock("#site/content", () => ({ projects: [] }))`.
- **`src/lib/blog-errors.test.ts`** (extended): `VERCEL_ENV=development + BLOG_INCLUDE_DRAFTS=1` does NOT throw (v3 backport).
- **`src/__tests__/velite-output-shape.test.ts`** — regression test for current Velite `Image` shape and `meta.content` shape.
- **`src/__tests__/docs-projects-authoring.test.ts`** — section heading existence + order.
- **`src/__tests__/next-config-imports.test.ts`** (v4 — new): `next.config.ts` contract test (Component 15).

### Integration Testing

- **Velite build smoke test** against `content/projects/` fixtures. **v4 — draft-warning emit assertion**: when `PROJECTS_INCLUDE_DRAFTS=1` and the fixture set contains drafts, `velite build`'s stderr contains exactly N lines matching `[velite/projects] PROJECTS_INCLUDE_DRAFTS=1 — including draft project: …`, where N is the count of draft fixtures.
- **MDX heading-hygiene fixtures** — all cases listed in v2/v3.
- **Chokepoint canary** — coverage matrix asserted.
- **`/projects` static-gen smoke** via existing dual-build CI.

### End-to-End Testing

- **Gallery page**: Playwright loads `/projects`. Asserts reverse-chronological order; top-2 cards have `loading="eager"`; subsequent cards have `loading="lazy"`; link accessible name is the project title.
- **Detail page**: Playwright loads `/projects/<slug>`. Asserts h1 = title; cover `alt` = `coverAlt`; link rail renders only when present.
- **v4 — Detail-page layout measurement** (r3 Missing #1):
  - Set viewport to 1280×720 (above `lg` breakpoint).
  - Measure rendered `<p>` width inside the prose body. Assert width ≤ ~700px (the `max-w-prose` cap; tolerance ±20px for font-metric variation).
  - Measure rendered `<img>` width inside the prose body. Assert width is within ±10px of `min(1024px, viewport - 32px)` — the outer container's content width.
  - Measure rendered page-`<h1>` width. Assert width is within ±10px of the outer container's content width.
  - For a first-party iframe fixture: assert rendered height > 0 (aspect-ratio rule working).
- **Draft handling**: dual-build CI matrix.
  - **v4 — E2E content-coupling mechanism (r3 Attack 6)**: the gallery E2E reads `.velite/projects.json` after `pnpm build` completes, filters by `!p.draft` if `process.env.PROJECTS_INCLUDE_DRAFTS !== "1"`, counts the array length, and asserts the rendered card count equals that length. The build-flavor branch is parameterized on the CI matrix's env-var setting.
- **Sitemap**: per-project URL once when published, never when draft; `lastModified` is parseable.
- **Lighthouse (manual)**: at launch + every 3rd published project. The fixture-render screenshot mandated by Component 10 v4 is filed in the same implementation log as the Lighthouse result.

## Deferrals

1. **Unifying `src/lib/blog-errors.ts` and `src/lib/project-errors.ts`** — both files now have the same guard surface after the v3 backport. Trigger: third content type.
2. **TOC component** — Req 6.6.
3. **Tag rendering and tag-route infrastructure** — Req 2.5.
4. **Custom MDX component registry** — Req 6.9.d.
5. **Automated Lighthouse CI** — Req 12.
6. **OG image generation pipeline**.
7. **URL-rename redirects** — Req 10.4.
8. **External-iframe CSP support**.
9. **Scanner module-graph resolution** for alias-through-local-variable and indirect-re-export.
10. **Sitemap last-modified per-project precision** beyond UTC midnight.
11. **Non-Vercel deploy guard.** Guards return null when `VERCEL !== "1"`. Trigger: non-Vercel CI/deploy migration.
12. **Computed-string destructure scanner coverage** (`const {["projects"]: p} = c`). Trigger: discovered in practice.
13. **v4 NEW**: **Below-`lg`-breakpoint wide-media escape**. At narrow viewports the escape is a visual no-op (the outer container is itself narrow). Acceptable at launch; trigger for a follow-up: a design request for a distinct mobile-wide treatment.
14. **v4 NEW**: **`<figure>` escape mechanism.** v4 keeps `<figure>` narrow so the `<figcaption>` doesn't render wide. Trigger: an author requesting wide figures with captions; the follow-up would split `<figure>` from `<figcaption>` or introduce a custom MDX component pair.
