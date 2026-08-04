# matthewfield.ca

My personal site — professional profile, project write-ups, and a blog.
Live at **[www.matthewfield.ca](https://www.matthewfield.ca)**.

I build infrastructure and developer platforms, so I built the site the way I'd
build a service: content is validated at build time, invariants are enforced by
CI rather than by remembering, and nothing ships that a script can't check.

## What's actually interesting here

If you're poking around, these are the parts worth reading:

- **Content fails the build, not the page.** Every post, project, and YAML entry
  is parsed against a schema before Next.js ever runs. A malformed date, an
  unknown frontmatter key, or a category that isn't in the enum stops the build
  with a named error pointing at the file — see `velite.config.ts` and
  `src/lib/build/content-yaml-loader.ts`.

- **Drafts can't leak to production.** `draft: true` posts are filtered from
  every list, omitted from `generateStaticParams` (so the route 404s rather than
  renders), and kept out of the search index. A second guard fails the build
  outright if the drafts flag is ever set in a production deploy —
  `src/lib/blog-errors.ts`.

- **CI enforces architecture, not just tests.** Eleven standalone gates run
  before the build: one keeps list surfaces from calling the unfiltered post
  helper (`verify-getPublishedPosts-callers.mjs`), one refuses a commit that
  changes some but not all of a set of files that must land together
  (`verify-paired-merge.mjs`), one fails if authoring-doc headings drift from
  the script that references them (`check-authoring-docs.mjs`).

- **Search is static.** Pagefind indexes the built HTML after the production
  build, so full-text search costs no server and no client framework —
  `scripts/run-pagefind-crawl.mjs`. A verifier asserts no draft ever lands in
  the index.

- **Specs are in the repo.** `.spec-workflow/` holds the steering docs and the
  requirements/design/tasks for each slice of the site. It's the reasoning
  behind the code, kept where the code is.

## Stack

Next.js (App Router, static) · TypeScript · Tailwind v4 · shadcn/ui ·
[Velite](https://velite.js.org) for typed MDX content · Pagefind for search ·
Vitest and Playwright · Vercel.

## Running locally

```sh
pnpm install
pnpm dev            # http://localhost:3013
pnpm build          # production build
pnpm build:search   # regenerate the Pagefind index into public/pagefind/
pnpm test           # vitest
pnpm test:e2e       # playwright
pnpm typecheck      # tsc --noEmit
```

`pnpm dev` runs Velite in watch mode alongside Next, so editing anything under
`content/` re-validates and hot-reloads.

## Layout

| Path              | What's in it                                         |
| ----------------- | ---------------------------------------------------- |
| `content/`        | All prose and data — MDX posts, projects, YAML lists |
| `src/`            | App Router routes, components, and content helpers   |
| `scripts/`        | Build gates and verifiers wired into CI              |
| `docs/`           | Authoring guides for each content type               |
| `.spec-workflow/` | Steering docs and per-feature specs                  |
| `e2e/`            | Playwright suites                                    |

Operator notes — deploys, the search kill-switch, repo variables — live in
`.spec-workflow/specs/blog-enhanced/design.md` under "Operator notes (Req 13)".

## This is a personal site, not a template

It's public because the engineering is worth showing, and because I link to it
from the site itself. It isn't built to be cloned: the content, copy, and config
are specific to me, and I'll change any of it without notice or a migration
path. Borrow an idea or a file freely — just don't expect it to work as a
starter.

## Licence

Split, deliberately:

- **Code** — [MIT](LICENSE). Take it, use it.
- **Words and images** under `content/` — [CC BY-NC-SA 4.0](LICENSE-CONTENT).
  Attribution, non-commercial, share-alike.

Third-party assets keep their own licences; the fonts in `public/fonts/` and the
book covers in `content/reading/` are covered in `LICENSE-CONTENT`.
