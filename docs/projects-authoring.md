# Projects authoring guide

Reference documentation for authoring entries in the `projects` content collection. The build enforces these constraints; this doc explains them so you learn them BEFORE breaking CI.

The ten section headings below are checked mechanically by `src/__tests__/docs-projects-authoring.test.ts`. Do not rename them without updating that test in the same PR.

## §1 Quick start — copy this MDX file

Create `content/projects/my-slug.mdx` and a colocated cover image. Use this as a starting template:

```mdx
---
title: "My project title"
description: "A 50–160 character description used in the gallery card and meta tags."
summary: "A 30–140 character summary used on the detail page hero."
date: "2026-05-27"
cover: "./my-slug-cover.png"
coverAlt: "Concise alt text describing the cover image (1–250 chars)."
tags: ["platform", "infra"]
status: "active"
draft: false
---

## Overview

Body prose goes here. Start with an `h2`. Do not use `h1` in the body — the
title comes from frontmatter.

## A section with a wide screenshot

<img src="./my-slug-screenshot.png" alt="Wide screenshot example" />

The image above escapes to the outer container width on `lg`+ breakpoints; the
paragraph stays at 65ch prose width.
```

Push to `main`; CI builds and deploys. The slug is the filename without `.mdx`.

## §2 Frontmatter fields

### Required (Req 1.2)

- `title` (string, 1–120 chars)
- `description` (string, 50–160 chars) — gallery card subtitle and `<meta name="description">`
- `summary` (string, 30–140 chars) — detail page hero subtitle
- `date` (ISO date string, `YYYY-MM-DD`) — original publication date; drives reverse-chronological gallery sort
- `cover` (relative path to a colocated image, e.g. `./my-slug-cover.png`) — see §3
- `coverAlt` (string, 1–250 chars) — required alt text; never decorative
- `tags` (array of strings; may be empty `[]`)
- `status` (one of `active`, `archived`, `experiment`) — see Req 4
- `draft` (boolean) — `true` hides from production builds

### Optional (Req 1.3)

- `updated` (ISO date string) — see §7
- `ogImage` (relative path) — see §4
- `cardImage` (relative path) — the image the index uses instead of `cover` (the featured spread, or a row's thumbnail); the detail-page hero always uses `cover`. Must be ≥1200 px wide. Omit to use `cover` on the index too.
- `featured` (boolean, default `false`) — see §10
- `links` (array of `{ kind, label, url }` objects)

### Links: the escape hatch — omit `kind`

Links normally take a `kind` that maps to an icon. To add a link type with no icon (the escape hatch for new providers), simply omit `kind`:

```yaml
links:
  - label: "Figma file"
    url: "https://figma.com/file/..."
```

The link renders with `label` and no icon. Add this BEFORE asking for a new icon.

### `kind` reference (link types with icons)

`github`, `live`, `demo`, `docs`, `blog`, `paper`, `video`. Anything else: omit `kind` (see above).

## §3 Cover image constraints

- **Minimum dimensions**: 1200×800. The build fails below this (Req 3.1).
- **File-size soft warning**: 500 KB. Logged at build time; not fatal.
- **File-size hard cap**: 1 MB. The build fails above this.
- **Colocation**: cover images live next to the MDX file as `./<slug>-cover.<ext>` (Req 3.3). The schema resolves the relative path.
- **No aspect-ratio band enforced.** The featured spread and the detail-page hero show the image at its own ratio. Row thumbnails on the index crop it to 3:2 from the top-left with `object-cover`, so keep the subject in the upper-left of a wide image.
- **Rows show a thumbnail only when the project has at least one `links` entry.** A project with no links is a write-up: the index labels it "write-up only" and shows no image for it, so a title-card cover only ever appears on its own detail page.
- **In-body images** (`<img>` inside the MDX body) are NOT optimized through `next/image` — they render as plain `<img>` and DO escape to the outer container width via the wide-media pattern (Req 3.7, see §6).

The dimension floor exists so the featured spread and detail-page hero have enough pixels for HiDPI rendering; the file-size cap bounds first-paint weight given lazy-loading of the row thumbnails.

## §4 Sharing previews (`ogImage`)

`ogImage` is the image used by social-media share cards (Open Graph / Twitter). It is OPTIONAL.

- Cover image and `ogImage` serve different purposes: cover is for the gallery/detail page; `ogImage` is for share cards. They should be DIFFERENT files (no schema check, but explicit guidance).
- Recommended `ogImage` shape: 1.91:1 aspect ratio, ≥1200 px wide.
- When `ogImage` is omitted, the site default applies. A visible build-log message records this (Req 1.3) — not a warning, just a heads-up.

## §5 MDX body constraints

The body is parsed by `remark`/`rehype` with strict heading hygiene. Violations fail the build with a named error.

- **No `<h1>`** (Req 6.9.a) — title comes from frontmatter. AST-only check: an `<h1>` inside a fenced code block is fine.
- **No `<h4>` and deeper by default** (Req 6.9.b). Opt in per-build with `PROJECTS_ALLOW_H4=1` if you genuinely need an h4 (rare).
- **First heading must be `<h2>`** (Req 6.9.c). No level skips (h2 → h4 fails).
- **No custom MDX component tags** (Req 6.9.d) — there is no custom component registry at launch. Use plain HTML/Markdown.

### Acceptable heading structure

```mdx
## Overview

A paragraph.

### A subsection

More prose.

## Another top-level section

Closing paragraph.
```

Full-bleed prose (text edge-to-edge) is NOT available at launch — out of scope.

## §6 Container width and wide media

The outer container is 1024 px wide; prose is constrained to 65ch (~65 characters per line) for readability. Seven specific tags escape the prose constraint and fill the outer container via Tailwind Typography's selective-element pattern (Req 6.7).

### Wide-media tags

`<img>`, `<pre>`, `<table>`, `<svg>`, `<video>`, `<iframe>`, and `<figure>` children.

### Worked example

```mdx
## A wide screenshot

The paragraph above stays at 65ch.

<img src="./screenshot.png" alt="Wide screenshot" />

The image renders edge-to-edge at the outer container width on `lg`+ breakpoints.
```

### v4 additions

- **Inline SVG must declare `viewBox`**. Without `viewBox` the SVG cannot scale under the wide-media CSS. Example: `<svg viewBox="0 0 800 400">…</svg>`.
- **First-party iframes default to 16/9 aspect-ratio**. Override with an inline style if the embed is a different ratio: `<iframe style="aspect-ratio: 4 / 3" src="..." />`.
- **Wide-media escape applies at `lg`+ breakpoints**. Below `lg` (i.e. mobile and tablet) it is a visual no-op — narrow prose with media-fills-container already looks identical.
- **`<figure>` stays narrow; image-with-caption renders as wide-image + narrow-caption.** The `<img>` inside the figure escapes, but the surrounding `<figcaption>` stays at prose width.
- **Transform side-effects**: the wide-media escape uses a CSS transform. Two consequences for descendants:
  - Descendants with `position: absolute` use the escaped element as their containing block (not the page).
  - Descendants with `position: sticky` are disabled — the parent transform suppresses sticky positioning.

  If you need either behavior, do not nest it inside a wide-media element.

## §7 `updated` editorial guidance

`updated` is set by the author; the schema does NOT derive it from git history (Req 1.5).

- **Set `updated`** when a meaningful revision changes the project's substance — significantly new content, a status change with explanation, or a corrected factual claim.
- **Do NOT set `updated`** for typo fixes, formatting tweaks, or whitespace.
- The detail-page hero renders `updated` only when it is at least a few days later than `date`; otherwise an "Updated" badge is suppressed by the caller-side gate `shouldShowUpdatedBadge(project)`.
- When unsetting `updated` (after a revert of a substance-changing edit), remove the field entirely rather than setting it back to `date`.

## §8 Lifecycle

Six routine lifecycle operations (Req 10):

1. **Editing**: edit MDX, push, CI redeploys, gallery card and detail page reflect the new content. Update `updated` only for meaningful changes (see §7).
2. **Unpublishing — delete-file path**: delete the MDX file and its colocated cover, push. The gallery card disappears, the detail-page route 404s, the sitemap entry is removed. **No automatic redirect** — this is the contract.
3. **Unpublishing — draft-flip path**: set `draft: true`, push. Same outcome as (2), but the file persists locally for later re-publication.
4. **Renaming a slug**: the new URL works, the old URL 404s. No automatic redirect. Either avoid renaming, or add a manual `next.config.ts` redirect for the old slug.
5. **Rollback**: prefer fix-forward (push a corrective commit). Expected fix-forward window is CI duration — currently 3–5 minutes on this codebase. **Contract**: if CI deploy duration exceeds 10 minutes for two consecutive deploys, the rollback strategy is revisited in a follow-up spec.
6. No additional lifecycle machinery — no webhooks, no scheduled-publish, no notifications.

## §9 Local development environment variables

### `PROJECTS_INCLUDE_DRAFTS=1`

When set, the build includes projects with `draft: true`. Use locally to preview draft content. The build logs a visible warning (Req 7.2.c) when this is set — so you cannot accidentally ship a "drafts included" production build without seeing it.

### The `pnpm start` footgun

`pnpm start` serves the most recent build artifact. If you previously ran `PROJECTS_INCLUDE_DRAFTS=1 pnpm build` and then `pnpm start` without rebuilding, the served bundle still contains drafts. Always rebuild without the env var before serving production-shaped output: `pnpm build && pnpm start`.

### Blog parallel

The blog collection has a parallel `BLOG_INCLUDE_DRAFTS=1` env var. Do not confuse the two — each gates only its own collection.

### Chokepoint scanner — threat model and coverage

The chokepoint test (`src/lib/projects.test.ts` invoking `runChokepointScan`) defends against ACCIDENTAL import of the `projects` collection from `#site/content` outside `src/lib/projects.ts`. **Threat-model statement**: the scanner defends against ACCIDENTAL import in a single-author repo. Out-of-scope shapes are listed below for transparency — **DO NOT USE; reviewers will reject them.**

#### Coverage matrix summary

The four-pattern AST detector (TypeScript compiler API) catches:

1. Named import: `import { projects } from "#site/content"`.
2. Namespace import: `import * as content from "#site/content"; content.projects`.
3. Default-renamed import (best-effort).
4. Dynamic `await import("#site/content")` with property access.

#### Documented bypasses — DO NOT USE

These shapes circumvent the scanner. They are documented so reviewers know to reject them:

- **Alias-through-local**: importing into a local binding that the scanner cannot statically resolve.
- **Computed-string destructure**: `const { ["pro" + "jects"]: p } = await import("#site/content")`.

Both pass the scanner. Both are rejected at review. If you need broader collection access, extend `src/lib/projects.ts` and import the helper.

### Velite version pin

`package.json` `dependencies` declares an EXACT patch version for `velite` (no `^`, no `~`). CI uses `pnpm install --frozen-lockfile`.

#### Upgrade workflow

1. Bump `package.json` to the new exact-patch version.
2. Run `pnpm install` to regenerate `pnpm-lock.yaml`.
3. **Manual checkpoint**: open `node_modules/velite/dist/index.d.ts`. Confirm no NEW sub-path exports have been added. If new sub-path exports exist, file a follow-up to extend `runChokepointScan` to cover them.
4. Re-run `src/__tests__/velite-output-shape.test.ts` (Task 9).

**Upgrade-gate policy**: if the output-shape test fails, the upgrade is breaking. Update consumers AND the test in the SAME PR. **Do NOT silently update the test alone** — that erases the regression signal.

### Canary fixture maintenance

The chokepoint canary fixture (`src/__tests__/fixtures/chokepoint-canary.ts`) exercises every import shape the scanner detects. When you extend the canary fixture with a new shape, update BOTH the canary file AND the per-shape regex list in `src/lib/projects.test.ts` IN THE SAME PR (Task 14 case 9 contract). Skipping either side breaks the contract.

## §10 `featured` editorial guidance

> _As Matthew, I want to highlight a particularly relevant project by setting `featured: true`; I unset it when the spotlight is no longer warranted (e.g. after the project has been live for ~3 months or after a newer project supplants it)._

`featured` is a boolean (default `false`) that puts a project in the lead spread at the top of `/projects`: the one large image on the page, above the ledger of remaining rows. With no featured project the newest one leads. If several are flagged, the newest of them leads and the others fall back into the rows.

### When to set `featured: true`

- The project is current, polished, and the one you most want a visitor to read.
- It demonstrates capability relevant to your current job-hunting focus.
- It is launch-fresh OR has been substantively updated recently.

### When to unset `featured: true`

- The project has been live for ~3 months and the spotlight is no longer warranted.
- A newer project supplants it for the same "first thing a visitor should see" slot.
- The project's status changed to `archived` or it no longer reflects current direction.

### How many features at once

**One.** Only a single project can lead, so flag exactly one. There is no schema check; this is editorial discipline.
