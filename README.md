# matthewfield.ca

This is my personal site: professional profile, project write-ups, and a blog.
It's live at [www.matthewfield.ca](https://www.matthewfield.ca).

I build infrastructure and developer platforms for a living, so when I rebuilt
this site I treated it like a small production service rather than a weekend
project. Mostly that means the build validates the content, scripts enforce the
rules I care about instead of me remembering them, and when something is wrong
it stops and tells me which file to look at.

## If you're poking around, start here

These are the bits I'm actually pleased with:

- **Bad content stops the build.** Velite parses every post, project, and YAML
  entry against a schema before Next.js runs at all. A malformed date, a
  frontmatter key I've typo'd, or a category that isn't in the enum fails the
  build with an error naming the file and the field. Nothing broken renders. See
  `velite.config.ts` and `src/lib/build/content-yaml-loader.ts`.

- **Drafts can't sneak into production.** Every list filters out anything marked
  `draft: true`, `generateStaticParams` leaves it out (so the URL 404s instead of
  quietly rendering), and the search index never sees it. A second guard in
  `src/lib/blog-errors.ts` fails the build outright if the drafts flag is ever
  set on a production deploy. Two guards for one problem, but I'd rather that
  than find a half-finished post live.

- **CI checks the architecture, not just the tests.** Eleven standalone gates run
  before the build. One stops list pages from calling the unfiltered post helper
  (`verify-getPublishedPosts-callers.mjs`), one refuses a commit that changes
  some but not all of a set of files that have to land together
  (`verify-paired-merge.mjs`), and one fails if the headings in an authoring doc
  drift away from the script that points at them (`check-authoring-docs.mjs`).

- **Search doesn't need a server.** Pagefind crawls the built HTML after the
  production build, so full-text search costs nothing at runtime and pulls in no
  client-side framework. See `scripts/run-pagefind-crawl.mjs`. Another verifier
  makes sure no draft ever lands in the index.

- **The specs are in the repo.** `.spec-workflow/` holds the steering docs plus
  the requirements, design, and tasks for each slice of the site. It's the
  thinking behind the code, kept next to the code.

## The stack

Next.js on the App Router (statically generated), TypeScript, Tailwind v4 and
shadcn/ui for the styling, [Velite](https://velite.js.org) to turn MDX into
typed content, Pagefind for search, Vitest and Playwright for tests, and Vercel
for hosting.

## Running it locally

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
`content/` re-validates it and hot-reloads the page.

## Where things live

| Path              | What's in it                                            |
| ----------------- | ------------------------------------------------------- |
| `content/`        | All the prose and data: MDX posts, projects, YAML lists |
| `src/`            | App Router routes, components, and the content helpers  |
| `scripts/`        | The build gates and verifiers that CI runs              |
| `docs/`           | Authoring guides for each kind of content               |
| `.spec-workflow/` | Steering docs and the per-feature specs                 |
| `e2e/`            | Playwright suites                                       |

Operator notes for deploys, the search kill-switch, and repo variables are in
`.spec-workflow/specs/blog-enhanced/design.md` under "Operator notes (Req 13)".

## This is my site, not a template

It's public because I think the engineering is worth showing, and because I link
to it from the site itself. It isn't built to be cloned, though. The content, the
copy, and a fair bit of the config are specific to me, and I'll change any of it
whenever I feel like it with no notice and no migration path. If you see an idea
or a file you want, take it. Just don't expect the whole thing to work as a
starter.

## Licence

I've split it, on purpose:

- **The code** is [MIT](LICENSE). Use it however you like.
- **The words and images** under `content/` are
  [CC BY-NC-SA 4.0](LICENSE-CONTENT): credit me, don't sell it, and share any
  derivative under the same terms.

Third-party assets keep their own licences. `LICENSE-CONTENT` carves out the
fonts in `public/fonts/` and the book covers in `content/reading/`.
