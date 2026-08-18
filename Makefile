# Local spec-workflow MCP dashboard.
#
# The dashboard is a single shared instance on port 5000, run from the latest
# published npm package via npx.
SPEC_WORKFLOW_PKG := @madmatt112org/spec-workflow-mcp@latest
DASHBOARD_PORT := 5000

.PHONY: dashboard
# Free the port (kills ANY dashboard holding it — local dist, npx, or global
# install), then start the latest package's dashboard (foreground).
dashboard:
	-fuser -k $(DASHBOARD_PORT)/tcp 2>/dev/null
	sleep 1
	npx -y $(SPEC_WORKFLOW_PKG) --dashboard --port $(DASHBOARD_PORT)

.PHONY: dev
# Velite in watch mode alongside Next on port 3013. Content edits under
# content/ re-validate and hot-reload.
dev:
	pnpm dev

.PHONY: build
# Full build from local source. Velite FIRST and separately: `pnpm build` is
# `next build` alone and never runs Velite, so building without this step
# compiles the previous run's content. CI only avoids the trap because
# `pnpm install --frozen-lockfile` fires the postinstall Velite build.
build:
	pnpm exec velite build
	pnpm build

.PHONY: preview
# Production-shaped serve on port 3013. Depends on `build` so Velite can't be
# skipped; build:search regenerates public/pagefind/, without which site
# search silently returns nothing while every other page looks correct.
preview: build
	pnpm build:search
	pnpm start

.PHONY: check
# What CI runs before it will build. NOT a complete mirror: CI also runs the
# scripts/ suites through `node --test` and several verify-*.mjs guards, none
# of which `pnpm test` covers (vitest includes only src/**).
check:
	pnpm lint
	pnpm format:check
	pnpm typecheck
	pnpm test

.PHONY: drafts
# Same as `preview` but with drafts compiled in. Cannot reuse `build` because
# the env vars have to be set on next build itself.
#
# LEAVES A DRAFT-CONTAINING ARTIFACT BEHIND. `pnpm start` serves whatever was
# built last, so run `make preview` before trusting anything as production.
drafts:
	pnpm exec velite build
	BLOG_INCLUDE_DRAFTS=1 PROJECTS_INCLUDE_DRAFTS=1 pnpm build
	pnpm build:search
	pnpm start
