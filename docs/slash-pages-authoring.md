# Slash pages authoring guide

Reference documentation for authoring the MDX content files that back `/about`,
`/now`, and `/colophon`. The build enforces these constraints; this doc explains
them so you learn them BEFORE breaking CI.

The canonical section headings below are checked mechanically by
`scripts/check-authoring-docs.mjs` (wired into CI before the first build). Each
heading must remain an exact single line — no commas, no colons. Do not rename
one without updating that check in the same PR.

The three MDX files live under `content/pages/` and are validated by the Velite
`pages` collection schema (`velite.config.ts`). Unlike `posts`, the `pages`
schema is NOT `.strict()`, so unknown frontmatter keys are ignored silently
rather than failing the build.

## Page frontmatter contract

Every MDX page under `content/pages/` must carry these two required fields:

- `title` (string) — rendered as the page `<h1>` and passed to
  `generateMetadata()`. Keep it short; it appears in the browser tab as
  `<title> | matthewfield.ca`.
- `description` (string) — passed to `generateMetadata()` only; not rendered
  visibly on the page.

One optional field is also defined:

- `updated` (ISO date, `YYYY-MM-DD`) — the last-meaningful-update date, rendered
  as a `<time>` element on `/now`. **Never include a time-of-day component.**

### Why `updated` must be date-only

`s.isodate()` (the Velite schema type used for `updated`) does NOT pin a bare
date to midnight locally — it calls `new Date(v).toISOString()`, which
re-serializes _whatever you wrote_. A date-only value like `2026-05-29` becomes
`2026-05-29T00:00:00.000Z` (UTC midnight). The `formatContentDate` formatter is
UTC-pinned, so it renders "May 29, 2026" consistently in every timezone.

If you instead paste an evening-local timestamp — for example,
`2026-05-29T20:30:00-04:00` — `s.isodate()` accepts it, re-serializes it to
`2026-05-30T00:30:00.000Z`, and the UTC-pinned formatter then displays **May
30**, not May 29. The displayed day shifts silently, with no build error.

CI catches this via a `!/T/.test(updated)` assertion in the Req 10.3 seed test,
which rejects any `updated` value that contains a time component. Write
`updated` as `YYYY-MM-DD` only and this gate is a no-op.

### Example frontmatter

```mdx
---
title: "Now"
description: "What I'm focused on at the moment."
updated: "2026-05-29"
---
```

## Which file renders which page

| MDX file                     | Route       | Notes                                     |
| ---------------------------- | ----------- | ----------------------------------------- |
| `content/pages/about.mdx`    | `/about`    | Indexable. No `updated` required.         |
| `content/pages/now.mdx`      | `/now`      | `updated` is required — see below.        |
| `content/pages/colophon.mdx` | `/colophon` | Indexable. External links: same-tab only. |

`/sitemap` and `/slashes` have no backing MDX file. They are component-only
pages that read `siteConfig.slashPages` and the content-library helpers
(`getVisiblePublishedPosts`, `getPublishedProjects`) directly. You cannot
customize their content by editing a file under `content/`; changes require
editing `src/app/(site)/{sitemap,slashes}/page.tsx` or `src/config/site.ts`.

### Colophon external links

External links in the **colophon body** open in the same tab with
`rel="noopener"` — no `target="_blank"`. This matches the `/contributions`
and `/resources` same-tab precedent. Do not add `target="_blank"` to colophon
body links; an E2E assertion checks that every external `http(s):` link on
`/colophon` carries `rel="noopener"` (the footer chrome's GitHub/LinkedIn links
already comply with `rel="noopener noreferrer"` and pass the same assertion).

If you need to reference an external tool or project from the colophon, write:

```mdx
[Next.js](https://nextjs.org)
```

Not:

```mdx
[Next.js](https://nextjs.org){target="\_blank"}
```

## Updating /now

`/now` is an IndieWeb convention: a short, dated note about what you are focused
on at the moment. The `updated` date tells readers how recently the page was
revised.

### Workflow

1. Edit `content/pages/now.mdx` — update the body prose.
2. Bump `updated` in the frontmatter to today's date (`YYYY-MM-DD`).
3. Commit and push. CI deploys the updated page.

Keep `updated` accurate. The page renders it as a visible `<time>` element;
a stale date misleads readers about how current the content is.

### Missing `updated` is a build error

`getNowPage()` evaluates at module load during `next build`. If `now.mdx` is
present but has no `updated` frontmatter key, the function throws:

```
content/pages/now.mdx is missing required frontmatter 'updated'
(a /now page needs a recency date)
```

This is intentional — a `/now` page with no date is meaningless. Add a
date-only `updated` to unblock the build.

### The stale-date tradeoff

There is no automated staleness check. If you update `now.mdx` prose without
bumping `updated`, CI passes and the displayed date is wrong. The convention
relies on author discipline: bump `updated` on every meaningful revision.
A minor typo fix does not warrant a bump; a content refresh does.

## Seed content expectation

The three MDX page bodies must contain real, non-placeholder content. CI runs a
seed-sentinel test (Req 10.2) that reads the raw `.mdx` files from disk, strips
frontmatter, and rejects any body that contains either of these literal strings:

- `Placeholder content.`
- `Replaced in a downstream spec.`

These are the sentinel strings written into the initial stubs. If your body
triggers either check, replace the placeholder prose with real content and
re-push. There is no word-count floor and no content-quality gate beyond the
two sentinel strings above — the test is a narrow guard against shipping an
obviously-unfinished page, not a prose reviewer.

### What counts as real content

The sentinels only guard against the two literal stub strings. Write whatever
accurately describes you, your current focus, or the site's technical stack.
A short paragraph is fine; there is no minimum length.

For `/colophon` specifically, the seed should document the actual stack: the
framework, styling library, component library, content pipeline, hosting
provider, and CI tooling. Link each item to its homepage using a standard
Markdown link (same-tab, `rel="noopener"` — see
[Which file renders which page](#which-file-renders-which-page)).
