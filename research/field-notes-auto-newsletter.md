# Field Notes auto-newsletter — design note

Status: designed, not built. Captured 2026-08-25, decisions recorded same day.
Read `research/newsletter-buttondown-brief.md` first — its decisions apply here.

## The idea

Tag a blog post `field-notes`. Publish it. The post becomes a Field Notes issue
in Buttondown, as a draft, after the post is live on the site.

The first instinct was a GitHub Actions job that watches for such a post and
fires the newsletter. Buttondown sells this as a feature, so the job is not
necessary. Design A below uses the feature. Design B, the Actions job, is kept
as the fallback.

## Decisions

| Question | Decision |
| --- | --- |
| Mechanism | Buttondown RSS-to-email, pointed at a tag-filtered feed on this site |
| Buttondown plan | Add the RSS-to-email add-on, +$9/month. **Prerequisite.** |
| Trigger | The `field-notes` tag, and only that tag |
| Tag visibility | Public. `/blog/tags/field-notes` becomes the on-site archive |
| Cadence | One post, one issue, as soon as Buttondown sees the item |
| Subject line | `Field Notes: <post title>` |
| Email body | The full post |
| Retro-tagging an old post | Allowed to send. No date floor in the feed |
| Send or draft | **Draft.** Buttondown builds it, Matthew presses send |

The draft decision is the one to hold onto. Publishing a post is reversible —
edit it and redeploy. An email to subscribers is not. The brief also requires
`/human-prose` for any copy meant for humans, and a draft is where that happens.

## What already exists

Most of the machinery is built.

| Piece | Where | What it gives you |
| --- | --- | --- |
| Post HTML, syndication-grade | `velite.config.ts` → `post.bodyHtml` | MDX comments removed, `data-copy-source` stripped, CDATA-safe |
| Published-post selector | `getVisiblePublishedPosts()` in `src/lib/blog.ts` | Drafts, fixtures, and `hiddenFromLists` posts already excluded |
| Tag validation | `velite.config.ts:151` | Tags must match `^[a-z0-9]+(?:-[a-z0-9]+)*$`, so the tag is `field-notes` |
| RSS feed | `src/app/feed.xml/route.ts` | 38 lines. The new route is a small copy |
| Feed validator | `scripts/validate-feed.mjs` | Runs in CI. Its `FEED_GLOBS` array is hardcoded to `feed.xml` paths |

## Design A — the one to build

### 1. Add the route

`src/app/feed/field-notes.xml/route.ts`, serving `/feed/field-notes.xml`. It is
`src/app/feed.xml/route.ts` with three changes:

- Filter to `post.tags.includes("field-notes")`.
- Set each item title to `` `Field Notes: ${post.title}` ``. This is where the
  subject-line prefix comes from — Buttondown takes the subject from the feed
  item title.
- Retitle the feed itself and point `id`, `link`, and `feedLinks` at the new URL.

Keep `content: post.bodyHtml` and `export const dynamic = "force-static"`. Full
post body, served as a static file from the CDN.

### 2. Extend the feed validator

`scripts/validate-feed.mjs` globs `.next/server/app/feed.xml*` only. Add the new
route's emit paths to `FEED_GLOBS` so CI validates both feeds. Without this the
new feed has no check at all.

### 3. Connect the Buttondown automation

- Add the RSS-to-email add-on.
- Point an automation at `https://www.matthewfield.ca/feed/field-notes.xml`.
- Set the behaviour to **create a draft**, not to send.
- Set the cadence to immediate.
- "Skip old items" does not matter today — no post carries the tag yet, and
  retro-tagged posts are allowed to send by decision.

Buttondown polls every 30 minutes, so an issue appears as a draft within about
half an hour of the post going live.

## The formatting problem

Correction to the first draft of this note: it claimed `bodyHtml` carries
root-relative URLs that need rewriting to absolute. It does not. Across the
published posts there are 30 external links, 5 internal links already written as
absolute `https://www.matthewfield.ca/...` URLs, and zero relative references.
No rewrite step is needed, and `node-html-parser` is not required.

The habit is what makes that true, not the pipeline. If an internal link is ever
written as `/blog/...`, it will break in email. Worth a lint rule later, not now.

What does still need work, all of it from the brief rather than from this feature:

- **Code blocks.** `rehype-pretty-code` output depends on classes and CSS
  variables. With no stylesheet, code blocks render as unstyled `<pre>`. This is
  a DevOps blog sending full post bodies, so this is the real risk. Buttondown
  custom email CSS is the fix.
- **The `::lead[...]` directive.** Added in commit `0eddc3b`. Emits a custom
  class, same problem as code blocks.
- **Design tokens.** Convert the OKLCH tokens to hex. Email clients do not
  support `oklch`. Task 1 in the brief.

None of these block the route. They decide whether the first issue looks good.

## Design B — the fallback

A GitHub Actions job on push to `main`, using the Buttondown API. Build it only
if the RSS path fails on one of these:

- The subject line needs to differ from the post title by more than a prefix.
- The email body needs to differ from the post body — an intro, a sign-off.
- 30 minutes of latency is too slow.

If it gets built, two notes worth keeping:

- **Do not diff commits to find new posts.** A post usually lands as
  `draft: true` and is flipped later. Squash merges, force pushes, and re-runs
  all break diffing. Compare sets instead: currently published and tagged, minus
  already sent. Idempotent by construction.
- **`scripts/confirm-production-deployment.mjs` already exists** and polls the
  GitHub Deployments API for a successful production deploy of one SHA. It is
  the "wait until the post is live" half, already written and already tested.

Also note `src/lib/newsletter.ts` holds no API key by design — it uses the public
embed endpoint. Design B needs a key, so it belongs in a separate module.

## Next steps

1. Add the Buttondown RSS-to-email add-on. Blocks step 3, not steps 1 and 2.
2. Build the route and extend the feed validator. One small PR.
3. Connect the automation, set it to draft, immediate cadence.
4. Tag a low-stakes post `field-notes` and watch what the draft looks like.
5. Fix the email CSS based on what that draft shows, rather than in advance.
