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

| MDX file                     | Route       | Notes                                        |
| ---------------------------- | ----------- | -------------------------------------------- |
| `content/pages/about.mdx`    | `/about`    | Indexable. No `updated` required.            |
| `content/pages/now.mdx`      | `/now`      | `updated` is required — see below.           |
| `content/pages/colophon.mdx` | `/colophon` | Indexable. External links open in a new tab. |

`/sitemap` and `/slashes` have no backing MDX file. They are component-only
pages that read `siteConfig.slashPages` and the content-library helpers
(`getVisiblePublishedPosts`, `getPublishedProjects`) directly. You cannot
customize their content by editing a file under `content/`; changes require
editing `src/app/(site)/{sitemap,slashes}/page.tsx` or `src/config/site.ts`.

### Colophon external links

External links in the **colophon body** open in a new tab with
`target="_blank" rel="noopener"`. This matches the `/contributions` and
`/resources` new-tab behaviour. You do not write those attributes yourself —
`MDXContent` applies them to every prose link whose host differs from the site
host (see `src/lib/external-link.ts`), along with a visually-hidden
"(opens in a new tab)" suffix for screen readers (WCAG 3.2.5). A plain Markdown
link is all you need:

```mdx
[Next.js](https://nextjs.org)
```

`rel` omits `noreferrer` on purpose: `noopener` is what blocks tabnabbing, and
keeping the `Referer` header preserves click attribution on outbound links. An
E2E assertion checks that every external `http(s):` link on `/colophon` carries
`rel="noopener"` (the footer chrome's GitHub/LinkedIn links use
`rel="noopener noreferrer"` and pass the same assertion).

Relative links, in-page anchors, and `mailto:`/`tel:` links are left alone —
they navigate in place.

Write links as Markdown, not as raw `<a>` HTML. Literal HTML in MDX renders as
an intrinsic DOM element and never reaches the `components` map, so a
hand-written `<a href="…">` silently opts out of the new-tab behaviour:

```mdx
<!-- No: bypasses MDXContent, opens in the same tab -->

<a href="https://nextjs.org" rel="noopener">
  Next.js
</a>
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

### What `now.mdx` does and does not own

`now.mdx` is the prose only. Two things below it belong to the page component
(`src/app/(site)/now/page.tsx`) and render after the MDX body, in this order:
the Reading section, then the "This page follows the /now page convention"
postscript. The postscript lives there rather than at the end of the MDX so the
Reading section can sit in front of it — putting it back in `now.mdx` would push
it above Reading again.

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

## Reading list on /now

The **Reading** section on `/now` is rendered from `content/reading.yaml`, not
from `now.mdx`. It is a separate file so a future sync job can rewrite the whole
thing without touching your prose. The section renders as two columns,
**Currently Reading** and **Recently Read**, both fed by that one file.

```yaml
# Currently Reading — no finished date
- title: "Do I Stay Christian?: A Guide for the Doubters"
  author: Brian D. McLaren
  url: https://app.thestorygraph.com/books/e48c35d8-86e2-467e-b427-1faeb13f0923
  started: "2026-07-31"
  cover: ./reading/do-i-stay-christian.jpg

# Recently Read — finished date present
- title: Nine Goblins
  author: T. Kingfisher
  url: https://app.thestorygraph.com/books/de0cb3f4-f872-4d70-b03e-29cc90aab5f9
  started: "2026-07-04"
  finished: "2026-07-16"
  cover: ./reading/nine-goblins.jpg
```

`finished` is the only thing that decides which column an entry lands in. Add it
when you finish a book; nothing else moves. The Currently Reading column renders
in file order and shows the `started` date; the Recently Read column sorts by
`finished` newest-first, shows that date, and displays at most three books
(`RECENTLY_READ_LIMIT` in `src/lib/reading.ts`) — older finished entries can stay
in the file as history without appearing on the page. An empty list (`[]`) hides
the whole section.

Each card is a single link to `url`, the book's StoryGraph page, opened in a new
tab like every other outbound link on the site.

To update it: edit the entries, drop the cover image into `content/reading/`, and
commit. StoryGraph serves both halves of an entry — the cover URL is the `<img>`
`src` on your currently-reading or read list, and `url` is the `/books/<uuid>`
link on the same card. Covers download over plain `curl`; convert a PNG to JPEG
before committing (StoryGraph's PNGs run ~240KB against ~30KB for the same image
as JPEG).

Every field except `finished` is required and hard-failed at build time by the
same authoritative YAML loader that guards `contributions.yaml` and
`resources.yaml` — a malformed date, a future `started` or `finished`, a `url`
that is not `http:`/`https:`, or an unknown key fails the build with a named
error.

`cover` is a path relative to `content/`, processed by Velite into a hashed
asset with width, height, and a blur placeholder. Do NOT point it at a remote
URL: the CSP is `img-src 'self' data:`, so an off-site cover is blocked by the
browser. StoryGraph's cover CDN serves images to plain `curl` without auth, so
downloading one into `content/reading/` is a one-liner.

### Why this is not fetched automatically

StoryGraph cannot be read by a server. Every URL on the domain — including the
logged-out homepage — returns HTTP 403 with `cf-mitigated: challenge`, so a
build-time or request-time `fetch` gets a Cloudflare interstitial, not HTML. On
top of that, `/currently-reading/<user>` redirects to `/users/sign_in`, so the
list needs an authenticated session even past the challenge. There is no public
API. A client-side fetch fails for the additional reasons that StoryGraph sends
no CORS header for this origin and the visitor is not signed in as you.

The only workable automation is a scheduled job driving a real browser that logs
in and rewrites `content/reading.yaml`. The data shape above is deliberately
job-writable so that can be added later without touching any component.

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
Markdown link (opens in a new tab, `rel="noopener"` — see
[Which file renders which page](#which-file-renders-which-page)).
