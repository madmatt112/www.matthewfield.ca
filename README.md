# matthew-field.ca

Personal website for Matthew Field — CV, project showcase, and blog. Built with Next.js, Velite, and Tailwind.

## Blog

Posts live in `content/posts/`. The blog index supports full-text search via Pagefind — press `Cmd/Ctrl+K` or `/` to open the search dialog.

## Development

```sh
pnpm install
pnpm dev          # http://localhost:3013
pnpm build        # production build
pnpm build:search # regenerate Pagefind index into public/pagefind/
pnpm test         # vitest
pnpm test:e2e     # playwright
```

See `.spec-workflow/specs/` for design and task documents; operator notes for deploys, search kill-switch, and repo variables live in `.spec-workflow/specs/blog-enhanced/design.md` under "Operator notes (Req 13)".
