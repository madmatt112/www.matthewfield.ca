# Requirements Document

## Introduction

The project-showcase spec delivers a `/projects` gallery and per-project detail pages at `/projects/[slug]`, driven by a new Velite `projects` collection of MDX files in `content/projects/`. Each project entry carries structured frontmatter (title, separate `description` and `summary` with disjoint SEO-vs-card purposes, date, cover image with required alt text, optional separate `ogImage`, status, optional author-curated `links` array, and a tag list for storage-only future use) plus an MDX body for the long-form writeup, screenshots, and embedded media. The gallery presents reverse-chronological visual cards keyed on the cover image; clicking through navigates to a per-project page with the rendered MDX body and a link rail.

After this spec ships, Matthew can add a project by dropping `content/projects/<slug>.mdx` plus colocated images, committing, and letting CI redeploy — the gallery card and detail page appear with no React changes.

**Explicitly in scope at launch**: gallery page; detail page; cover-image rendering via Next.js Image; an external-links rail with a closed `kind` enum and an open-label escape hatch (Req 5); status badges; draft-handling parity with blog-core; sitemap inclusion; author-facing MDX contract documentation at the pinned path `docs/projects-authoring.md` with an automated section-heading existence check (Req 11); a shared date-formatting module the blog also consumes; a heading-hygiene contract paralleling the blog's, with **build-time enforcement** for h2-first-heading and no-level-skips (Req 6.9). Lighthouse 90+ targets are verified MANUALLY at launch AND on a documented re-verification cadence (Req 12).

**Explicitly out of scope at launch (deferred to later specs or future enhancements)**:
- **Tag rendering / navigation**: tags are stored but NOT rendered at launch — see Req 2.5.
- **Cross-linking infrastructure from blog posts to projects**: no automated "post mentions project" mechanism. Author-curated outbound links from a project to a blog post via the `writeup` link kind ARE in scope.
- **A projects RSS/Atom feed**: out of scope.
- **Filtering, sorting, or search UI on the gallery**: out of scope.
- **Per-theme cover image variants**: out of scope.
- **Project comments, reactions, share buttons**: out of scope.
- **MDX image auto-optimization for in-body images** (i.e. wrapping `<img>` in `next/image`, generating WebP/AVIF variants, or lazy-loading per Next.js Image): out of scope; in-body images render as plain `<img>` (Req 3.7). They DO receive the wide-media-escape CSS treatment from Req 6.7 — these are distinct concerns.
- **A custom MDX component registry**: out of scope (Req 6.9.d). The `.mdx` extension is retained for forward extensibility; bodies are markdown-equivalent at launch, documented as such in the author doc.
- **Prev/next-project navigation on detail pages**: out of scope, with a "Back to all projects" link as the only off-page affordance (Req 6.10).
- **URL redirects when a project slug is renamed**: out of scope — Req 10 documents the lifecycle and the explicit no-redirect contract at launch.
- **Per-project `noindex` for published-but-not-indexed projects**: out of scope. If a future need arises, the planned shape is a `meta: { noindex: true }` frontmatter field that emits `<meta name="robots" content="noindex" />` — not implemented here, acknowledged for forward awareness only.
- **Automated Lighthouse CI checks**: out of scope; the 90+ target is manually verified at launch AND re-verified per Req 12's cadence.
- **A "publish queue" with preview-only intermediate state**: out of scope. The git-commit-equals-publish model from Req 7.5 is the launch contract; fix-forward / revert paths from Req 10.5 cover rollback.
- **Full-bleed prose elements** (paragraphs/blockquotes that escape the prose column): out of scope. Wide-media auto-escape covers only the media tags in Req 6.7; prose elements stay narrow. Documented in the author doc as a known constraint.

## Alignment with Product Vision

- **Builder credibility** (product.md business objective #2): The project gallery is the primary surface where visitors see what Matthew has built.
- **Markdown-first content** (product principle #2): Project entries live as `.mdx` files with frontmatter. The React layer renders structure; it never owns prose or screenshot lists.
- **Simple to maintain** (product principle #3): Adding a project is `content/projects/<slug>.mdx` + image assets + commit. Schema validation, slug derivation, sitemap inclusion, and image processing all happen at build time.
- **Wide and spacious** (product principle #1): Project detail pages use a wider outer container (Req 6.7) while constraining prose to the ~75-character measure; wide media (`<img>`, `<video>`, `<pre>`, `<figure>`, `<table>`, `<iframe>`, `<svg>`) automatically escape the prose column via the Tailwind Typography selective-element-width-constraint pattern (Req 6.7) — no per-element opt-in required.
- **Responsive** (product principle #6): Gallery cards reflow from a multi-column grid on desktop to a single column on mobile. Cover images use responsive `sizes` and Next.js Image optimization.
- **Accessible** (product principle #7): Cover images carry author-supplied alt text. Cards are keyboard-navigable as a single link target per card with the link's accessible name scoped to the project title via `aria-labelledby` (Req 2.6). The MDX body forbids `<h1>` and h4+ headings, enforces h2-first-heading and no-level-skips at build time (Req 6.9), keeping page heading structure compliant with WCAG 2.1 AA.
- **Performance** (product success metric #4): Static generation. WebP/AVIF cover image via Next.js Image. No client-side filtering, sorting, or hydration. File-size and dimension caps on covers (Req 3.1) plus lazy-loading on below-the-fold gallery cards prevent both per-image and cumulative-page-weight regressions.
- **Independence from platforms** (business objective #4): The gallery is on `matthewfield.ca`; external project links via the link rail.

## Requirements

### Requirement 1: `projects` Velite collection and content directory

**User Story:** As Matthew, I want to add a project by dropping an MDX file (plus images) into `content/projects/` and committing, so that I never edit React code to launch or update a project entry.

#### Acceptance Criteria

1. The Velite configuration (`velite.config.ts`) SHALL define a new top-level collection named `projects` with `pattern: "projects/*.mdx"` (flat — slugs are single-segment). The collection SHALL be registered alongside `pages`, `profile`, and `posts`. Existing collections SHALL remain unchanged.

2. The `projects` schema SHALL require the following frontmatter fields:
    - `title` (string, 1–120 characters).
    - `description` (string, **50–160 characters** — used as the meta description ONLY. NOT used as the gallery-card body. The 50-character minimum prevents "A"-as-description trivial passes; the 160-character maximum is a heuristic for the SERP-clip zone).
    - `summary` (string, **30–140 characters** — used as the gallery-card body copy ONLY. NOT used as the meta description. Always required, even when its value duplicates `description`'s. The 30-character minimum prevents trivial-passes; the 140 maximum targets a card-friendly upper bound that allows ~2-3 lines on desktop cards and 4-6 lines on mobile single-column cards).
    - `date` (ISO 8601 datetime — publication date).
    - `cover` (Velite `s.image()` — relative path to a colocated cover image; see Req 3).
    - `coverAlt` (string, 1–250 characters — REQUIRED alt text for the cover image on the detail page; the card image uses empty alt per Req 2.3).
    - `tags` (array of strings, 0–8 entries; each matching the kebab-slug regex `^[a-z0-9]+(?:-[a-z0-9]+)*$`. Stored but NOT rendered at launch — see Req 2.5).
    - `status` (string enum — `active` | `archived` | `concept`; default `active`. See Req 4).

3. The `projects` schema SHALL support the following optional frontmatter fields:
    - `ogImage` (Velite `s.image()` — optional separate share-card image. When present, the schema SHALL validate `ogImage` is at least 1200 px wide and within ±10% of the 1.91:1 aspect ratio (1.72–2.10). **When absent, the page emits no per-project OG image and the site's default OG image from site-foundation applies.** The cover is NEVER used as an OG fallback — the cover and OG serve different use cases (gallery rendering vs. share-card rendering) and conflating them caused the v2 band-mismatch problem. **Build-time info log**: WHEN `ogImage` is absent for a non-draft project THEN the Velite transform SHALL emit a single INFO-level log line per project naming the slug and stating that share previews will use the site default. This surfaces the "silent OG loss" failure mode at build time, not just in the author doc.).
    - `updated` (ISO 8601 datetime — author-controlled "meaningful content update" marker, parity with `posts`; never derived from git).
    - `draft` (boolean, default `false`).
    - `slug` (string override — must match the kebab-slug regex).
    - `featured` (boolean, default `false` — accent-only treatment per Req 2.7).
    - `links` (array of typed link objects — see Req 5).
    - `body` (transformed via `s.mdx()` — implicitly populated by Velite).

4. WHEN a project file is `content/projects/<filename>.mdx` AND no explicit `slug` frontmatter is set THEN the route segment SHALL equal `<filename>` (without the `.mdx` extension). The schema applies `s.path()` followed by a `.transform()` stripping the `projects/` prefix. The kebab-slug-only rule prevents case-sensitivity bugs by construction.

5. **Author-controlled `updated`**: The schema SHALL NOT derive `updated` from git history. Authors set it when meaningful. Editorial guidance lives in the author doc (Req 11).

6. WHEN the build runs AND a project file violates the schema THEN the Velite build SHALL fail with a named error. Failure cases include: missing required field; invalid datetime; string length out of bounds (including `description` outside 50–160, `summary` outside 30–140, `coverAlt > 250`); unknown frontmatter key under `.strict()`; invalid `status` enum; invalid tag slug; missing/unreadable cover; cover dimensions or file size out of bounds (Req 3.1); invalid `ogImage` dimensions/aspect when supplied; invalid `links[]` entry (Req 5); MDX-body violations (Req 6.9 — h1 present, h4+ without override, non-h2-first-heading, h2→h4 level-skip). No silent coercion, default-filling, or skipping.

7. The schema SHALL use `.strict()` mode — typos like `coverr:` are build errors.

8. WHEN `content/projects/` is empty THEN the Velite build SHALL succeed and emit `projects: []`. All downstream paths handle the empty array without erroring.

9. The Velite output type for a `projects` entry SHALL include both raw frontmatter fields AND computed fields. Direct `JSON.parse` of `.velite/projects.json` outside the chokepoint is prohibited (enforced by Req 7.4's test).

10. **Order-of-operations**: Schema, content directory (with at least one `placeholder.mdx` marked `draft: true`), and route files SHALL land in the SAME commit (or a sequence where every intermediate commit leaves CI green).

11. **Velite output-shape contract test**: A test SHALL verify Velite's `s.image()` emits `{ src, width, height, ... }` with numeric `width`/`height`. The Velite version is pinned in `package.json`; upgrades require an intentional spec-aware re-test.

### Requirement 2: Gallery page at `/projects`

**User Story:** As a visitor, I want to land on `/projects` and see a visual gallery of Matthew's projects.

#### Acceptance Criteria

1. WHEN a visitor navigates to `/projects` THEN the page SHALL render a reverse-chronological grid of project cards, sorted by `date` descending, with `slug` ascending as the tiebreak. The comparator `byDateDescSlugAsc` lives once in `src/lib/projects.ts`.

2. WHEN the gallery is rendered THEN it SHALL be a statically generated server component. Both `/projects/page.tsx` AND `/projects/[slug]/page.tsx` SHALL declare `export const dynamic = 'force-static'`.

3. WHEN the gallery is rendered THEN each project card SHALL include, in DOM order:
    - The cover image rendered via the Next.js `<Image>` component with `alt=""`. **Above-the-fold cards** (the first row at a given viewport) SHALL load eagerly; **below-the-fold cards** SHALL lazy-load (Next.js Image default). This bounds initial page weight even as the gallery grows — see Req 12 for the cumulative-weight discussion.
    - The project title in a heading element (`<h3>`) with stable `id="card-title-<slug>"`.
    - The card body copy: `project.summary` (always present per Req 1.2).
    - The publication date, formatted via `formatContentDate(iso)` from Req 9.1.
    - A status badge iff `status !== "active"` (Req 4).
    - A "Featured" textual badge iff `featured === true` (Req 2.7).
    - **No tag chips** (Req 2.5).
    - The card wrapped in a single anchor with `aria-labelledby="card-title-<slug>"` (Req 2.6).

4. The card body copy SHALL be `project.summary`. No fallback to `description` — the schema makes `summary` always required (Req 1.2). The disjoint-purpose rationale: `description` is rendered ONLY in `<meta name="description">`; `summary` is rendered ONLY in the card.

5. **Tags are stored but NOT rendered at launch.** No tag chips. Field exists for future tag-routing or related-project specs without a schema migration.

6. **Card link semantics**: SINGLE anchor element wrapping the card surface, with `aria-labelledby="card-title-<slug>"`. The link's accessible name is the project title only — body copy, date, badges, and image inside the link are visually presented but do NOT join the link's accessible name (per ARIA spec for `aria-labelledby`). No nested anchors. The card SHALL NOT render the `links` rail.

7. **Featured-card variant — accent-only**: WHEN `featured: true` THEN the card SHALL render with an accent treatment (e.g. accent border, subtle background tint, "Featured" textual badge) that does NOT change grid-cell span, card size, row order, or chronological position. Treatment is design-phase; this requirement guarantees data plumbing, chronological-sort preservation, unchanged link semantics, and no grid-layout property that shifts siblings.

8. WHEN the gallery page is rendered THEN its `<title>` SHALL be "Projects" composed through `%s | matthewfield.ca`. Meta description is a short author-curated string in the page component. OG image MAY be the site default.

9. **Empty gallery**: WHEN no projects are published THEN the gallery SHALL render "No projects published yet." with an optional "Check back later." line. No throw, no blank page, no 404. Detail-route static params SHALL be `[]`. The empty state is an acceptable initial production state.

10. **Responsive breakpoints**: WHEN viewed on a narrow viewport (&lt;640 px) THEN cards stack single-column. WHEN viewed at tablet widths (641–1023 px) THEN render a two-column grid. WHEN viewed at desktop widths (≥1024 px) THEN render at least a two-column grid; finer escalation is a design-phase concern.

### Requirement 3: Cover image handling

**User Story:** As Matthew, I want to drop a project's cover image next to its MDX file and have it processed, optimized, and rendered without me running an image pipeline by hand.

#### Acceptance Criteria

1. The `cover` frontmatter field SHALL be typed as Velite's `s.image()` primitive with a relative path value. Velite resolves the path, copies the asset to `public/static/`, and emits a transformed value containing the deployed URL plus image metadata (`width`, `height`, optional `blurDataURL`). **Dimension and file-size constraints (build-time enforced)**:
    - `width >= 1200 px` (minimum). Below 1200 px, the detail-page render at `max-w-5xl` (1024 px) cannot achieve 2x retina.
    - `height >= 800 px` (minimum, paired with the width).
    - **No aspect-ratio band is enforced** (v2's 1.4–2.4 band was reversed in v3 because it ruled out common 4:3 screenshots and didn't match the OG-image band; with cover/OG decoupled in v3, the cover's only job is "looks good in the gallery and on the detail page" — no share-shape concern).
    - **File-size soft warning at 500 KB**: build SHALL print a warning naming the file and its size. Does NOT fail.
    - **File-size hard cap at 1 MB**: build SHALL fail with a named error.

2. WHEN the cover-image file is missing or unreadable THEN the build SHALL fail with a named error.

3. Content images SHALL be colocated under `content/projects/` via either layout — flat-with-sibling-assets OR per-project subdirectory. The pipeline SHALL work for both without per-project configuration.

4. WHEN a project's cover image is rendered on the gallery card THEN it SHALL use Next.js `<Image>` with resolved URL, Velite-supplied `width`/`height` for layout stability, and a `sizes` attribute appropriate for Req 2.10 breakpoints. Card image uses empty `alt`. Lazy-loading for below-the-fold cards per Req 2.3.

5. WHEN a project's cover image is rendered on the detail page THEN it SHALL use Next.js `<Image>` with Velite-supplied dimensions. Author's `coverAlt` IS rendered here (Req 6.12).

6. Cover images SHALL be served from the same domain (`/static/...`), satisfying the existing CSP without modification.

7. **In-body images**: MDX/markdown image syntax in the body renders as plain `<img>` elements through the existing rehype pipeline. **Concretely, in-body images are NOT wrapped in `next/image`, NOT converted to WebP/AVIF, and NOT given the Next.js Image responsive `srcset`.** They DO receive the wide-media-escape CSS treatment from Req 6.7 (the `<img>` tag is in the wide-media list, so it escapes the prose column to span the outer container). The "no optimization" and the "yes-CSS-escape" are distinct concerns — Req 3.7 covers the optimization gap; Req 6.7 covers the layout treatment. Authors are responsible for providing reasonably sized in-body assets (no schema cap on in-body image dimensions or file size, only on the cover).

8. **No upper bound on cover-image dimensions** beyond the file-size cap. Trust + the cap.

### Requirement 4: Project status display

**User Story:** As a visitor, I want to see at a glance whether a project is still being worked on, archived, or just a concept.

#### Acceptance Criteria

1. The `status` field SHALL be one of `active`, `archived`, `concept`. Schema enforces the enum.

2. WHEN `status === "active"` (default) THEN no status badge is rendered. "Active" is unmarked.

3. WHEN `status === "archived"` THEN both card AND detail page render a textual "Archived" badge. Non-interactive.

4. WHEN `status === "concept"` THEN both surfaces render a textual "Concept" badge. Visually distinguishable from "Archived."

5. Status badges SHALL be plain rendered text in the static HTML (no JS). Screen-reader accessible. On the card, the badge appears within the single anchor but is NOT in the link's accessible name (scoped to title via `aria-labelledby`).

6. Status SHALL NOT change the gallery sort order or hide a project.

### Requirement 5: External links rail on the detail page

**User Story:** As a visitor reading a project detail page, I want to find the live demo, the source repository, and any other relevant external links in one predictable place.

#### Acceptance Criteria

1. **Array-of-objects schema with closed `kind` enum**: The `links` field, when present, SHALL be an array of objects of shape `{ kind?: "demo" | "repo" | "docs" | "package" | "writeup"; label: string; url: string }`.
    - `label` (required, 1–60 chars) — the visible link text.
    - `url` (required) — validated per Req 5.2.
    - `kind` (optional; CLOSED ENUM — only the five literal strings above. Any other string value is a build-time error). **Error message contract**: WHEN the schema rejects an invalid `kind` THEN the error message SHALL state: `"links[<i>].kind '<bad-value>' is not in {demo,repo,docs,package,writeup}; omit 'kind' for a label-only entry with no icon."` This guides the author to the correct escape hatch.
    - **Uniqueness per recognized kind**: at most one entry per `kind` value. Authors with two of one logical type (e.g. staging + production demos) SHALL disambiguate by labels and omit `kind` on the duplicates. Both rendering with the same icon is rejected as visual ambiguity; both rendering label-only with no icon is the explicit contract for paired duplicates.

2. Each entry's `url` SHALL be validated in two stages: (a) `new URL(url)` parse — invalid is a build error; (b) protocol check — only `http:` and `https:` accepted. All other schemes (`mailto:`, `tel:`, `javascript:`, `data:`, `file:`, etc.) are rejected with a named error citing file, array index, and URL.

3. WHEN `links` is absent OR empty (`[]`) THEN the rail SHALL NOT be rendered.

4. **Display order is array order**. Rail appears ABOVE the MDX body on the detail page. Each entry's visible text SHALL be its `label`. When `kind` is recognized AND the design phase provides an icon, the icon MAY accompany the label; the visible text label remains present (no icon-only).

5. **Link attributes**: same-tab (no `target="_blank"`); `rel="noopener"` for tabnabbing protection. **`noreferrer` intentionally omitted** (browser default Referrer-Policy gives origin-only Referer, preserving attribution). Same-tab default is policy — middle-click or Cmd/Ctrl-click for new tab. No per-link override.

6. The rail SHALL appear ONLY on the detail page, never on cards.

7. The rail SHALL be server-rendered. Each link is a plain `<a>`.

8. **Cap on rail entries**: schema SHALL limit `links` to a maximum of **6** entries.

### Requirement 6: Detail page at `/projects/[slug]`

**User Story:** As a visitor, I want to click a card and land on a page with the full project writeup.

#### Acceptance Criteria

1. WHEN a visitor navigates to `/projects/<slug>` for a published project THEN the page SHALL render, in DOM order: project title (`<h1>`), publication date, "Updated on …" badge when applicable (Req 6.3), status badge when applicable (Req 4), cover image, link rail when applicable (Req 5), MDX body, "Back to all projects" link (Req 6.10).

2. WHEN the slug doesn't correspond to a published project THEN the page SHALL return a 404 via `notFound()`.

3. WHEN `updated` is present AND strictly later than `date` THEN the detail page SHALL display an "Updated on &lt;date&gt;" badge using `formatContentDate(iso)` from Req 9.1. Predicate `shouldShowUpdatedBadge(project)` lives in `src/lib/projects.ts`.

4. **Metadata strategy**: `<title>` is `project.title` composed through `%s | matthewfield.ca`. Meta description is `project.description` (the meta-only field). OG image is `project.ogImage` when present; otherwise the page emits no per-project OG image and the site default applies (no cover fallback).

5. The detail page SHALL be a statically generated server component. `generateStaticParams()` returns published-project slugs. Declares `export const dynamic = 'force-static'`.

6. h2 and h3 headings in MDX bodies get anchor IDs via `rehype-slug`. No TOC at launch.

7. **Container-width contract — outer `max-w-5xl` + Tailwind Typography selective-element-width pattern**: The detail page outer container SHALL be Tailwind's `max-w-5xl` (1024 px / 64 rem), centered with `mx-auto`. The MDX body SHALL be rendered inside Tailwind Typography's `prose` class (or its dark-mode counterpart). **Wide-media auto-escape implementation (committed)**: the spec adopts Tailwind Typography's selective-element-width-constraint pattern — the `prose` class targets text-flow elements (`p`, `h2`, `h3`, `h4`, `ul`, `ol`, `li`, `blockquote`, `hr`) and constrains them to ~65ch via Tailwind's prose styling, while media elements (`img`, `video`, `pre`, `figure`, `table`, `iframe`, `svg`) are NOT width-constrained by the `prose` class and naturally fill the available width (up to the outer container's `max-w-5xl`). This pattern is RTL-safe, scrollbar-safe, and does not require `100vw` or negative-margin tricks. The seven wide-media tags expand v3's list (which omitted `<table>`, `<iframe>`, `<svg>`) to match what authors commonly need. **Full-bleed prose elements** (paragraphs/blockquotes/headings escaping the prose column) are out of scope — without a custom-component path, there is no author affordance for "this paragraph is full-width," and that is the accepted trade-off.

8. WHEN the build runs THEN it SHALL fail loudly on (a) frontmatter schema violations, (b) MDX compile errors, (c) references to undefined MDX components, (d) render-time exceptions during static generation. No silent degradation.

9. **MDX body constraints (enforced at build time via a single remark check that walks the MDX AST)**:
    - **9.a. No `<h1>` in MDX body**. The check rejects (i) MDX-AST `heading` nodes of `depth: 1` AND (ii) MDX-AST `mdxJsxFlowElement`/`mdxJsxTextElement` nodes whose tag name equals `h1` or `H1`. **The check is AST-only — it does NOT do a text scan of the raw source**, so `<h1>` mentioned inside a fenced code block (e.g. a tutorial showing HTML examples) is preserved as code-fence content and does NOT trip the check. This closes the v3 review's code-fence false-positive risk.
    - **9.b. No h4+ headings by default**. The check rejects MDX-AST `heading` nodes of `depth >= 4`. Setting `PROJECTS_ALLOW_H4=1` (parallel to the blog's `BLOG_ALLOW_H4`) downgrades h4+ from build-error to build-warning; h4+ headings render in the body but are not included in any future TOC. Default-reject keeps project pages at two heading levels (h2, h3).
    - **9.c. Heading-sequence enforced (h2-first, no level skips)** — newly ENFORCED in v4 (v3 made it best-effort, the r3 review correctly identified that "best-effort + no TOC + no schema check = bad heading flow ships silently"). The same remark check that handles 9.a and 9.b SHALL ALSO enforce:
        - The FIRST heading in the MDX body SHALL be h2. WHEN the first heading is h3 or deeper THEN the build SHALL fail with a named error pointing at the offending heading. (Bodies with NO headings are valid — the rule fires only when at least one heading exists.)
        - Headings SHALL NOT skip levels. WHEN an h3 is encountered before any h2, OR an h4 (when `PROJECTS_ALLOW_H4=1` is set) is encountered before any h3, the build SHALL fail with a named error. The rule applies in document order; the check is straightforward to implement against the linear sequence of `heading` nodes.
    - **9.d. No custom MDX component registry at launch**. The existing `<MDXContent />` renders MDX via `new Function(code)(runtime)` with no `components` argument; capitalized-tag references like `<Screenshot />` or `<Demo />` produce a `ReferenceError` at static-generation time, which Req 6.8(c)/(d) surfaces as a build failure. The author doc (Req 11) clearly states this constraint. The `.mdx` extension is retained for future spec extensibility (adding a component registry IS the natural future spec; the author doc explicitly states that "markdown-equivalent MDX with no custom component tags" is the launch contract). Renaming to `.md` was considered and rejected — the future registry is the rationale for keeping the extension.

10. **"Back to all projects"** link at the foot of every detail page. Only off-page nav affordance; no prev/next at launch.

11. No related-project suggestions, comments, or social-share buttons at launch.

12. The detail-page cover image SHALL render with the author-supplied `coverAlt`.

### Requirement 7: Draft handling and production exclusion

**User Story:** As Matthew, I want to write a project entry while still polishing it without it leaking into the public site.

#### Acceptance Criteria

1. `draft` defaults to `false`. WHEN `draft === true` AND build is production THEN the project SHALL be excluded from `getPublishedProjects()` and from gallery / `generateStaticParams()` / sitemap.

2. **Dev vs. production-equivalent local build**:
    - 2.a. `pnpm dev` (`NODE_ENV=development`, no VERCEL var): drafts visible by default.
    - 2.b. Local `pnpm build` (`NODE_ENV=production`, no VERCEL var): drafts excluded by default. Override via `PROJECTS_INCLUDE_DRAFTS=1`.
    - 2.c. `pnpm start` after `pnpm build` does NOT re-run env-var gating — drafts baked into the static output ARE served. **Build-time warning surfacing (added in v4)**: WHEN `PROJECTS_INCLUDE_DRAFTS=1` is set during a build THEN the Velite transform OR the build-step layer SHALL print a clearly visible warning to the build log naming each draft project included. This makes the env-var decision visible at build time, not buried in the author doc — closing the r3 "`pnpm start` footgun" concern by adding mechanical surfacing. CI builds never set the var, so production deploys are unaffected.
    - 2.d. Unit tests (Req 7.6) exercise all branches.

3. WHEN `draft === true` AND build is `VERCEL_ENV === "preview"` THEN the layered draft-leak-guard pattern from `src/lib/blog-errors.ts` is mirrored into `src/lib/project-errors.ts`. **Looks-like-production guard**: also fires when `VERCEL=1` is set but `VERCEL_ENV` is absent, empty, or holds an unrecognized value. Fail closed on ambiguity.

4. **`src/lib/projects.ts` is the single chokepoint — enforced via test using the TypeScript compiler API**: `getPublishedProjects()` lives here, applies the draft filter, returns a stable sorted list. All consumers call this helper. **The chokepoint enforcement test SHALL detect ALL of**:
    - **(a) named imports** — `import { projects } from '#site/content'`.
    - **(b) namespace imports** — `import * as content from '#site/content'` AND subsequent references to `content.projects`.
    - **(c) barrel re-exports** — `export * from '#site/content'`, `export { projects } from '#site/content'`, named-rename variants.
    - **(d) dynamic imports** — `import('#site/content')` or `require('#site/content')` with reference to the `projects` member.
    - **Implementation (committed)**: the scanner SHALL use the TypeScript compiler API (`ts.createSourceFile` from the `typescript` package, which is already a dev dependency for the type-checker — no new dependency required). The AST-based check correctly handles all four patterns including renamed imports (`import { projects as P } from '#site/content'`) and template-literal dynamic imports. Regex-only scanning was considered and rejected for false-negative risk on the namespace-then-member pattern.
    - **Allowlist (path-based)**: `src/lib/projects.ts`, `src/lib/projects.test.ts`, AND the canary fixture path from Req 7.6.h. **Allowlist-expansion contract**: WHEN a future file legitimately needs raw collection access THEN the allowlist in `src/lib/projects.test.ts` SHALL be updated in the same PR that introduces the new file. Adding a new file that needs the import WITHOUT an allowlist update will fail the chokepoint test in CI; this is the intended discoverable-failure path. The contract is documented in the author/maintenance doc.

5. Flipping `draft: false` and pushing IS the publish — gallery, detail page, sitemap entry on the next deploy.

6. **Tests for draft-leak, dev/build disambiguation, chokepoint, AND canary**: A unit test file at `src/lib/projects.test.ts` SHALL verify:
    - (a) `getPublishedProjects()` excludes drafts when `VERCEL_ENV=production`.
    - (b) Production leak-guard throws under its precondition.
    - (c) Preview leak-guard throws under its precondition.
    - (d) Looks-like-production guard fires when `VERCEL=1` and `VERCEL_ENV` is absent/empty/unrecognized.
    - (e) `pnpm dev`-equivalent shows drafts.
    - (f) Local `pnpm build`-equivalent hides drafts.
    - (g) `PROJECTS_INCLUDE_DRAFTS=1` includes drafts in case (f) AND the build-log warning fires.
    - (h) **Canary fixture for chokepoint test**: a fixture file at `src/__fixtures__/chokepoint-canary.ts` (note: `.ts` extension, NOT v3's `.ts.txt` — closing the r3 "fixture outside scanner's scan path" finding by putting the fixture INSIDE the scanner's scan path; the file is excluded from the TypeScript build via `tsconfig.json` `exclude` AND from the chokepoint test's allowlist, so it doesn't break type-checking and isn't scanned during the production check). The fixture contains all four forbidden patterns from Req 7.4 (named, namespace, barrel, dynamic). The canary test invokes the SAME `runChokepointScan(filePath)` function the production check uses — this is the explicit contract the canary verifies. If the scanner ever fails to detect one of the four shapes against the canary, the canary test fails. The test-of-the-test is real, not a no-op (closing the r3 review's "no-op risk" finding).

### Requirement 8: Sitemap and discoverability

**User Story:** As a visitor or search engine, I want every published project to appear in the XML sitemap.

#### Acceptance Criteria

1. The XML sitemap SHALL include one entry per published project: `url: <siteUrl>/projects/<slug>`, `lastModified: project.updated ?? project.date`.

2. `/projects` itself SHALL be in the sitemap regardless of whether any projects are published.

3. Drafts SHALL NEVER appear in the sitemap in any environment.

4. Sitemap implementation consumes `getPublishedProjects()` per Req 7.4.

5. No separate sub-sitemap.

### Requirement 9: Shared date-formatting module

**User Story:** As a maintainer, I want the gallery, the blog, and future content surfaces to format dates identically with no duplication.

#### Acceptance Criteria

1. A new shared module at `src/lib/format-date.ts` SHALL export `formatContentDate(iso: string): { datetime: string; display: string }` — the same `Intl.DateTimeFormat("en-CA", { year: "numeric", month: "long", day: "numeric" })`-based formatter currently inlined in `src/lib/blog.ts:86–94`. (Path is pinned at `src/lib/format-date.ts`; if a future spec needs non-content date formatting, it can have its own helper. The path commitment is closing the v3 "module path overhead" discussion.)

2. `src/lib/blog.ts` SHALL re-export the helper (`export const formatPostDate = formatContentDate;`). A unit test at `src/lib/format-date.test.ts` SHALL verify the formatter's output AND assert `formatPostDate === formatContentDate` (parity test catches refactor regressions at CI time).

3. `src/lib/projects.ts` SHALL consume `formatContentDate` from the shared module.

4. The shared module SHALL land in the same spec as the projects collection.

### Requirement 10: Lifecycle — editing, unpublishing, renaming, rollback

**User Story:** As Matthew, I want a clear contract for what happens when I edit a published project, take one down, rename a slug, or need to roll back a faulty publish.

#### Acceptance Criteria

1. **Editing**: Edit MDX, push, CI redeploys, surfaces reflect new state. Meaningful changes warrant updating `updated`; small fixes do not. Editorial guidance in the author doc.

2. **Unpublishing — delete-file path**: delete the MDX file, push. Gallery card gone, detail-page route 404s, sitemap entry removed, NO redirect.

3. **Unpublishing — draft-flip path**: set `draft: true`, push. Same outcome as (2); file still exists locally for later re-publication.

4. **Renaming a slug**: new URL works, old URL 404s. No automatic redirect — Matthew avoids renaming, or adds a manual `next.config.ts` redirect.

5. **Rollback**: fix-forward (preferred) or revert. **Expected fix-forward window is CI duration — 3–5 minutes on this codebase per existing CI history. CI duration contract (added v4)**: WHEN CI deploy duration exceeds 10 minutes consistently (e.g. for two consecutive deploys) THEN the rollback strategy in this requirement SHALL be revisited as part of a follow-up spec. The bound is a *contract*, not a descriptive citation — closing the r3 "empirical, not contractual" finding by making the threshold an explicit re-spec trigger.

6. No additional lifecycle machinery (no webhooks, no scheduled-publish, no notifications) beyond AC 1–5.

### Requirement 11: Author-facing MDX contract documentation

**User Story:** As an author, I want a single document that tells me what frontmatter the schema requires, what MDX I can use, and what conventions to follow.

#### Acceptance Criteria

1. The spec implementation SHALL ship a Markdown document at the pinned path `docs/projects-authoring.md`. The document SHALL contain the following sections, in this order (reordered in v4 to lead with quick-start material, addressing the r3 "tutorial vs reference ordering" finding). Each section's heading text is the exact string the automated check in Req 11.3 verifies:
    - **§1 Quick start — copy this MDX file** — a copy-paste-able example MDX file with valid frontmatter and a minimal body. The first thing an author encounters. (Was v3's §10.)
    - **§2 Frontmatter fields** — covers Req 1.2 (required) and Req 1.3 (optional). Includes the **escape hatch for new link types: omit `kind`** with a clear example (`{ label: "Figma file", url: "..." }` with NO `kind`) shown BEFORE the kind-enum reference list. This is the natural sequence: how to add a link with no icon, then which kinds get icons.
    - **§3 Cover image constraints** — Req 3.1 (1200×800 min, 500 KB warning, 1 MB cap), Req 3.3 (colocation layouts), Req 3.7 (in-body images are NOT optimized but DO escape to outer width). Includes rationale for no aspect-ratio band.
    - **§4 Sharing previews (`ogImage`)** — Req 1.3. Explains: cover is for gallery/detail-page; `ogImage` is for share cards (1.91:1, ≥1200 px wide); when omitted, the site default applies (visible build-log message per Req 1.3); cover and `ogImage` should be DIFFERENT files for different purposes (no schema check, but explicit guidance).
    - **§5 MDX body constraints** — Req 6.9.a (no `<h1>`, AST-only check, code-fenced `<h1>` is fine), Req 6.9.b (no h4+ by default, `PROJECTS_ALLOW_H4=1` opt-in), Req 6.9.c (h2-first heading enforced, no level skips enforced), Req 6.9.d (no custom component tags). Worked example of acceptable heading structure (h2 → h3 → paragraph → h2). Notes that full-bleed prose is not available (out of scope at launch).
    - **§6 Container width and wide media** — Req 6.7 (outer 1024 px, prose 65ch, the seven wide-media tags escape via Tailwind Typography's selective-element pattern). Worked example showing a wide screenshot in MDX and how it renders.
    - **§7 `updated` editorial guidance** — Req 1.5 and Req 10.1. Rules of thumb.
    - **§8 Lifecycle** — Req 10. No-redirect contract, fix-forward window, CI-duration contract.
    - **§9 Local development environment variables** — Req 7.2 (`PROJECTS_INCLUDE_DRAFTS=1`), the build-log warning, the `pnpm start` footgun. Notes the blog's parallel `BLOG_INCLUDE_DRAFTS=1` so authors don't confuse them.
    - **§10 `featured` editorial guidance** — when to set, when to unset, how many features at once.

2. **A user story for `featured`** SHALL be implicit in §10's content: "As Matthew, I want to highlight a particularly relevant project by setting `featured: true`; I unset it when the spotlight is no longer warranted (e.g. after the project has been live for ~3 months or after a newer project supplants it)."

3. **Launch-gate enforcement (automated + manual)**: A test at `docs/projects-authoring.test.ts` (or `tests/docs/projects-authoring.test.ts` per repo convention) SHALL parse `docs/projects-authoring.md` as markdown and assert that each of the ten section heading strings from Req 11.1 appears as a top-level (`##`) heading. **This is a mechanical check, run in CI** — closing the r3 "self-review of doc completeness" finding by making structural completeness automated. Substantive-content review remains a human/reviewer-eye step in the task list, but section-heading presence is no longer dependent on the author's self-review.

4. The doc SHALL be reviewed alongside any future spec that extends the projects collection.

### Requirement 12: Non-Functional Requirements

#### Code Architecture and Modularity
- **Single Responsibility Principle**: `src/lib/projects.ts` owns query helpers. The gallery card component owns card layout. The detail page owns detail layout. No business logic in page files beyond data wiring.
- **Modular Design**: The gallery card component is reusable from any future surface (e.g. a "recent projects" rail on the landing page).
- **Shared date module** (Req 9): `formatContentDate` lives once at `src/lib/format-date.ts`.
- **Pattern reuse over abstraction**: Project query helpers parallel blog query helpers. NO shared "content collection" base class — three collections too few to amortize. The date formatter is the one identifiable cross-spec shared helper.
- **Clear Interfaces**: `Project` type derived from the Velite collection. Public functions in `src/lib/projects.ts` return `Project` or simple primitive shapes.
- **No direct collection imports outside `src/lib/projects.ts`** — enforced by the TypeScript-compiler-API-based chokepoint test from Req 7.4 with the canary fixture from Req 7.6.h.

#### Performance
- **Static generation**: Both pages are statically generated. No per-request rendering.
- **Image optimization**: Cover images flow through Next.js Image (WebP/AVIF, responsive `sizes`, lazy-load below the fold). In-body MDX images render as plain `<img>` (Req 3.7).
- **Cover-image discipline**: Soft warning at 500 KB, hard cap at 1 MB (Req 3.1).
- **Cumulative gallery weight**: With N published projects, the cumulative cover-image weight is N × file-size. **Lazy-loading on below-the-fold cards (Req 2.3) is the launch mitigation** — only above-the-fold covers (typically 2–4 on desktop, 1 on mobile) load eagerly, so the initial paint downloads ~2–4 MB worst-case at the file-size cap, not the cumulative total. Per-image caps + lazy-loading together bound the perceived-performance failure mode. No total-cover-weight schema check at launch.
- **Lighthouse target (manual verification with cadence)**: Gallery and detail pages SHALL meet the site's 90+ Lighthouse performance score. **Verification at launch is MANUAL** — `pnpm lhci-once` or equivalent against a representative production build, with the result documented in the spec's implementation log. **Re-verification cadence (added v4)**: the Lighthouse check SHALL be re-run on every Nth project addition, with **N = 3** at launch (i.e. after the 3rd, 6th, 9th, … published project). If a re-verification falls below 90, a follow-up task is opened to investigate (likely candidate: cover-image file-size discipline drift, or a cumulative-weight effect). This makes the target a continuing contract rather than a launch-only check, closing the r3 review's "re-verification cadence" finding. Automated Lighthouse CI gates remain out of scope.
- **Bundle impact**: No new client-side JavaScript libraries. Both pages entirely server-rendered.

#### Security
- **CSP unchanged**: Cover images are first-party (`/static/...`); `img-src 'self' data:` suffices.
- **External link safety**: All rail links carry `rel="noopener"`; `noreferrer` intentionally omitted (Req 5.5). URL validation rejects non-`http`/`https` schemes (Req 5.2).
- **MDX content**: No per-spec security surface beyond what blog-core and professional-profile address. Author is trusted.
- **No user input on these pages**.

#### Reliability
- **Build-time validation everywhere**: Schema violations, missing/oversmall/oversize cover images, invalid URL schemes, MDX heading-hygiene violations (h1 present, h4+ without override, non-h2-first-heading, h2→h4 level-skip), oversize string fields, duplicate `kind` entries in `links[]` — ALL fail the build with named errors. Velite output-shape regressions are caught by the contract test (Req 1.11).
- **Empty-collection contract**: Site with zero projects builds, deploys, serves `/projects` with empty-state copy.
- **Internal-link integrity**: Project subtree internal links exercised by the existing CI link checker.
- **Draft-leak guard with looks-like-prod handling**: Layered guards including the explicit `VERCEL=1` + `VERCEL_ENV`-absent/unrecognized case.
- **Chokepoint enforcement via test + canary**: Four-pattern AST detection using the TypeScript compiler API; canary fixture exercises every shape against the same scan code path (Req 7.4, Req 7.6.h).
- **`PROJECTS_INCLUDE_DRAFTS=1` build-time warning**: Surfaces the env-var decision in the build log (Req 7.2.c).

#### Usability
- **Single-anchor cards with scoped accessible name** via `aria-labelledby` (Req 2.6).
- **Status communicated visually AND textually** (Req 4) — never icon-only.
- **Predictable navigation**: Gallery → card → detail → external link. "Back to all projects" link on every detail page (Req 6.10).
- **Theme parity**: Light AND dark mode.
- **Mobile rendering**: ≤640 px is single-column; 641–1023 px is two-column; ≥1024 px at least two-column (Req 2.10). No horizontal overflow.
- **Keyboard navigation**: Tab top-to-bottom, one stop per card. Detail page: link rail before MDX body. Focus indicators visible in both themes.
- **Author usability via the doc** (Req 11): authors learn constraints BEFORE breaking the build. Doc completeness check is mechanical (Req 11.3).
